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
 *  3. The input size is NOT ours to choose. This ONNX export has static
 *     dimensions — feeding it 512 raises "Got invalid dimensions for input:
 *     Got: 512 Expected: 1024" and nothing runs. An earlier version of this
 *     file carried an INFER_SIZE of 512 and a benchmark claiming ~1s
 *     inference; both were fiction, because the config was silently ignored
 *     and every run was always 1024. Do not add it back without checking
 *     `pixel_values.dims` in a browser.
 *
 * The q8 weights are roughly a quarter the download of fp32, which is the one
 * part of that old note that held up.
 *
 * Measured in Chromium on a laptop, on our test photo:
 *   first run   ~37s   50 MB downloaded (44 MB weights + 4.7 MB ort-wasm)
 *   after that  ~10s   0 bytes — transformers.js keeps both in a Cache Storage
 *                      bucket called "transformers-cache", so this genuinely
 *                      does work in aeroplane mode from the second run on.
 *                      Do NOT also cache them in the service worker: that
 *                      stores the same 49 MB twice on her phone.
 *
 * A phone will be slower than that. The first run is a long wait no matter
 * what, which is why it has to SHOW the download rather than say "cleaning…"
 * and appear to hang.
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
const WORK_MAX = 1400        // cap the photo before we touch it — phone photos are huge
/**
 * The finished square, and what it costs to keep.
 *
 * Measured on a realistic 12 MP phone photo: 1200px at q0.92 came to 446 KB as
 * a data URL, and the product document — which carries this AND the original
 * thumbnail — reached 529 KB. Firestore refuses anything over 1 MB, warns us
 * at 800 KB, and every one of those kilobytes is written over her mobile data
 * while she waits to move to the next screen.
 *
 * 1000px at q0.85 is 140 KB and is still more than any phone or laptop shows.
 */
const OUT_SIZE = 1000        // final square
const OUT_QUALITY = 0.85
const FILL = 0.82            // product fills 82% of the frame — the e-commerce norm

let loadPromise: Promise<{ model: any; processor: any; RawImage: any }> | null = null

/**
 * Everyone currently waiting on the model.
 *
 * The load is memoised, which is the whole point — but it also meant the FIRST
 * caller's progress callback was the only one that ever ran. The screen warms
 * the model up on mount with no callback, so by the time she took a photo and
 * passed one in, it was dropped on the floor and she watched "cleaning…" for
 * 37 seconds with no bar. Callbacks live here instead of in that closure so a
 * caller who arrives mid-download still hears about it.
 */
const watching = new Set<(p: Progress) => void>()

function load(onProgress?: (p: Progress) => void) {
  if (!loadPromise) {
    loadPromise = (async () => {
      // Lazy so the library is not in the app's first load.
      const { AutoModel, AutoProcessor, RawImage } = await import('@huggingface/transformers')

      const progress_callback = (e: any) => {
        if (e?.status === 'progress' && typeof e.progress === 'number') {
          const percent = Math.round(e.progress)
          for (const fn of watching) fn({ phase: 'downloading', percent })
        }
      }

      const model = await AutoModel.from_pretrained(MODEL_ID, {
        // `as any`: transformers.js types demand a full PretrainedConfig, but the
        // whole point here is to hand it a minimal one it would not otherwise accept.
        config: { model_type: 'custom' } as any,
        dtype: 'q8',
        progress_callback,
      })

      // RMBG shipped no preprocessor_config when this was written; it does now,
      // and the hub's copy wins over anything we pass. Kept as a fallback.
      const processor = await AutoProcessor.from_pretrained(MODEL_ID, {
        // No `size` here: the model dictates it, and passing one only ever
        // made this file look like it had a choice. See note 3 above.
        config: {
          do_normalize: true, do_pad: false, do_rescale: true, do_resize: true,
          image_mean: [0.5, 0.5, 0.5], image_std: [1, 1, 1],
          feature_extractor_type: 'ImageFeatureExtractor',
          resample: 2, rescale_factor: 1 / 255,
        } as any,
      })

      return { model, processor, RawImage }
    })().catch(err => { loadPromise = null; throw err })   // allow a retry next time
  }

  if (!onProgress) return loadPromise
  watching.add(onProgress)
  // `finally` returns a new promise; the memoised one is untouched.
  return loadPromise.finally(() => { watching.delete(onProgress) })
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

/** Shrink a photo before we store it. A phone camera JPEG is 2-8 MB and the
 *  original is only ever shown as a small "before" inset, so 420px is already
 *  more than that inset can display — 83 KB down to 7 KB, measured. */
export async function shrink(dataUrl: string, max = 420, quality = 0.8): Promise<string> {
  const { canvas } = await drawScaled(dataUrl, max)
  return canvas.toDataURL('image/jpeg', quality)
}

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
  return out.toDataURL('image/jpeg', OUT_QUALITY)
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

  return c.toDataURL('image/jpeg', OUT_QUALITY)
}
