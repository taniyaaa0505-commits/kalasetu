/**
 * Cut the product out of its background and put it on clean white.
 *
 * Runs ENTIRELY IN THE BROWSER — no server, no API, no cost, and it keeps
 * working in airplane mode once the model is cached.
 *
 * Model: briaai/RMBG-1.4, the standard for product cut-outs.
 *
 * Two things we learned the hard way, so nobody repeats them:
 *
 *  1. Do NOT use `pipeline('background-removal', ...)` with this model.
 *     transformers.js v4 reads RMBG's config, sees model_type
 *     "SegformerForSemanticSegmentation", and refuses to load it. The manual
 *     AutoModel path below with `model_type: 'custom'` is the way.
 *
 *  2. Do NOT use Xenova/modnet (the pipeline's default). It is a PORTRAIT
 *     matting model — on a photo of a pot it hunts for a person and slices
 *     the object in half. Measured on our test image: it kept 7% of a
 *     fringed edge. RMBG-1.4 kept 100%.
 *
 * Benchmarked on a synthetic pot with a handle hole and loose threads
 * (see bench2.mjs): 512px + q8 gives IoU 99.9%, ~1s inference, and the
 * quantised weights are roughly a quarter the download of fp32.
 */

export interface CleanResult {
  dataUrl: string
  usedAI: boolean          // false when the model failed and we fell back
  ms: number
}

export type Progress =
  | { phase: 'downloading'; percent: number }   // first run only
  | { phase: 'thinking' }
  | { phase: 'composing' }

const MODEL_ID = 'briaai/RMBG-1.4'
const INFER_SIZE = 512       // what the model sees. 512 scored the same as 1024, faster.
const WORK_MAX = 1400        // cap the photo before we touch it — phone photos are huge
const OUT_SIZE = 1200        // final square
const FILL = 0.82            // product fills 82% of the frame — the e-commerce norm

let loadPromise: Promise<{ model: any; processor: any; RawImage: any }> | null = null

function load(onProgress?: (p: Progress) => void) {
  if (!loadPromise) {
    loadPromise = (async () => {
      // Lazy so the library is not in the app's first load.
      const { AutoModel, AutoProcessor, RawImage } = await import('@huggingface/transformers')

      const progress_callback = (e: any) => {
        if (e?.status === 'progress' && typeof e.progress === 'number') {
          onProgress?.({ phase: 'downloading', percent: Math.round(e.progress) })
        }
      }

      const model = await AutoModel.from_pretrained(MODEL_ID, {
        // `as any`: transformers.js types demand a full PretrainedConfig, but the
        // whole point here is to hand it a minimal one it would not otherwise accept.
        config: { model_type: 'custom' } as any,
        dtype: 'q8',
        progress_callback,
      })

      // RMBG ships no preprocessor_config, so we supply one.
      const processor = await AutoProcessor.from_pretrained(MODEL_ID, {
        config: {
          do_normalize: true, do_pad: false, do_rescale: true, do_resize: true,
          image_mean: [0.5, 0.5, 0.5], image_std: [1, 1, 1],
          feature_extractor_type: 'ImageFeatureExtractor',
          resample: 2, rescale_factor: 1 / 255,
          size: { width: INFER_SIZE, height: INFER_SIZE },
        } as any,
      })

      return { model, processor, RawImage }
    })().catch(err => { loadPromise = null; throw err })   // allow a retry next time
  }
  return loadPromise
}

/** Warm the model up while she is still framing the shot. */
export function preloadModel() {
  load().catch(() => { /* offline on first run — we fall back gracefully */ })
}

export async function removeBackground(
  photoDataUrl: string,
  onProgress?: (p: Progress) => void,
): Promise<CleanResult> {
  const started = performance.now()
  try {
    const { model, processor, RawImage } = await load(onProgress)
    onProgress?.({ phase: 'thinking' })

    // Shrink first — a 12 MP phone photo would cost us seconds for no gain.
    const { canvas, width, height } = await drawScaled(photoDataUrl, WORK_MAX)
    const image = await RawImage.fromURL(canvas.toDataURL('image/jpeg', 0.95))

    const { pixel_values } = await processor(image)
    const { output } = await model({ input: pixel_values })

    // The model returns a greyscale mask: white = product, black = background.
    const mask = await RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(width, height)

    onProgress?.({ phase: 'composing' })
    const dataUrl = compositeOnWhite(canvas, mask, width, height)
    return { dataUrl, usedAI: true, ms: Math.round(performance.now() - started) }
  } catch (err) {
    // Never block her from selling because a model failed to load.
    console.warn('[bgRemove] falling back to the plain squared photo:', err)
    const dataUrl = await toSquareOnWhite(photoDataUrl)
    return { dataUrl, usedAI: false, ms: Math.round(performance.now() - started) }
  }
}

/* ------------------------------------------------------------------ */

/** Load a data URL into a canvas, scaled so the long edge is at most `max`. */
async function drawScaled(dataUrl: string, max: number) {
  const img = new Image()
  img.src = dataUrl
  await img.decode()

  const scale = Math.min(1, max / Math.max(img.width, img.height))
  const width = Math.round(img.width * scale)
  const height = Math.round(img.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
  return { canvas, width, height }
}

/** Apply the mask as transparency, crop to the product, put it on white. */
function compositeOnWhite(
  src: HTMLCanvasElement,
  mask: { data: Uint8ClampedArray | Uint8Array; channels: number },
  width: number,
  height: number,
): string {
  const sctx = src.getContext('2d')!
  const frame = sctx.getImageData(0, 0, width, height)
  const px = frame.data

  const mc = mask.channels
  let minX = width, minY = height, maxX = 0, maxY = 0, found = false

  for (let i = 0; i < width * height; i++) {
    const a = mask.data[i * mc]
    px[i * 4 + 3] = a
    if (a > 12) {                                  // 12 ignores the faint halo
      const x = i % width, y = (i / width) | 0
      found = true
      if (x < minX) minX = x; if (x > maxX) maxX = x
      if (y < minY) minY = y; if (y > maxY) maxY = y
    }
  }
  sctx.putImageData(frame, 0, 0)

  const box = found
    ? { x: Math.max(0, minX - 2), y: Math.max(0, minY - 2),
        w: Math.min(width, maxX + 3) - Math.max(0, minX - 2),
        h: Math.min(height, maxY + 3) - Math.max(0, minY - 2) }
    : { x: 0, y: 0, w: width, h: height }

  const out = document.createElement('canvas')
  out.width = out.height = OUT_SIZE
  const ctx = out.getContext('2d')!
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, OUT_SIZE, OUT_SIZE)

  const scale = Math.min((OUT_SIZE * FILL) / box.w, (OUT_SIZE * FILL) / box.h)
  const w = box.w * scale, h = box.h * scale
  const x = (OUT_SIZE - w) / 2, y = (OUT_SIZE - h) / 2

  // Soft contact shadow. Without it the product looks like a pasted sticker.
  ctx.save()
  ctx.filter = 'blur(22px)'
  ctx.fillStyle = 'rgba(0,0,0,0.20)'
  ctx.beginPath()
  ctx.ellipse(OUT_SIZE / 2, y + h + 12, w * 0.36, h * 0.03 + 8, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.drawImage(src, box.x, box.y, box.w, box.h, x, y, w, h)
  return out.toDataURL('image/jpeg', 0.92)
}

/** Fallback: no cut-out, just square it on white. Still better than raw. */
export async function toSquareOnWhite(dataUrl: string, size = OUT_SIZE): Promise<string> {
  const img = new Image()
  img.src = dataUrl
  await img.decode()

  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, size, size)

  const pad = size * (1 - FILL) / 2
  const scale = Math.min((size - pad * 2) / img.width, (size - pad * 2) / img.height)
  const w = img.width * scale, h = img.height * scale
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)

  return c.toDataURL('image/jpeg', 0.92)
}
