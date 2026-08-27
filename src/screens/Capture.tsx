import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Screen from '../components/Screen'
import BigButton from '../components/BigButton'
import Speakable from '../components/Speakable'
import { getProduct, patchProduct } from '../services/db'
import { removeBackground, preloadModel, type Progress } from '../services/bgRemove'
import { t } from '../lib/i18n'

export default function Capture() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [photo, setPhoto] = useState<string>()
  const [clean, setClean] = useState<string>()
  const [progress, setProgress] = useState<Progress>()
  const [usedAI, setUsedAI] = useState<boolean>()

  useEffect(() => {
    getProduct(id).then(p => { setPhoto(p?.photo); setClean(p?.cleanPhoto) })
    // Start fetching the model while she is still framing the shot, so the
    // wait happens during something she is already doing.
    preloadModel()
  }, [id])

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const original = await fileToDataUrl(file)
    setPhoto(original); setClean(undefined); setUsedAI(undefined)
    setProgress({ phase: 'thinking' })

    const result = await removeBackground(original, setProgress)

    setClean(result.dataUrl); setUsedAI(result.usedAI); setProgress(undefined)
    await patchProduct(id, { photo: original, cleanPhoto: result.dataUrl })
  }

  const busy = progress !== undefined

  return (
    <Screen
      title="फोटो" step={photo ? 2 : 1} onBack={() => {}}
      action={
        photo
          ? <div className="flex flex-col gap-2">
              <BigButton icon="👉" label={t('next')} onClick={() => nav(`/p/${id}/speak`)} disabled={busy} />
              <BigButton icon="🔄" label={t('retakePhoto')} variant="quiet" onClick={() => fileRef.current?.click()} />
            </div>
          : <BigButton icon="📷" label={t('takePhoto')} onClick={() => fileRef.current?.click()} />
      }
    >
      {/* capture="environment" opens the phone's real camera app — better photos
          than getUserMedia, and zero code. */}
      <input
        ref={fileRef} type="file" accept="image/*" capture="environment"
        onChange={onPick} className="hidden"
      />

      {!photo && (
        <div className="flex flex-col items-center gap-5 py-10 text-center">
          <span className="text-7xl" aria-hidden>📷</span>
          <Speakable text="अपने सामान की फोटो लीजिए" className="text-xl font-medium" />
          <p className="text-sm text-ink-3">सादे रंग की जगह पर रखिए तो और अच्छा आएगा</p>
        </div>
      )}

      {photo && (
        <div className="flex flex-col gap-4">
          <Panel label="पहले" src={photo} />
          {busy ? <Working progress={progress!} /> : clean && (
            <>
              <Panel label="बाद में" src={clean} highlight />
              {usedAI === false && (
                <p className="rounded-lg bg-gold-wash p-3 text-sm text-gold">
                  Background not removed this time — showing the squared photo instead.
                  Check the console; usually it means the model could not download.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </Screen>
  )
}

/** What she sees while the model works. The first run downloads ~25 MB once. */
function Working({ progress }: { progress: Progress }) {
  const text =
    progress.phase === 'downloading' ? 'पहली बार तैयार हो रहा है…'
    : progress.phase === 'thinking'  ? t('cleaning')
    : 'सफ़ेद पर लगाया जा रहा है…'

  return (
    <div className="rounded-xl bg-wash p-6 text-center">
      <p className="mb-3 text-indigo">{text}</p>
      {progress.phase === 'downloading' && (
        <>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white">
            <div className="h-full bg-indigo transition-all" style={{ width: `${progress.percent}%` }} />
          </div>
          <p className="mt-2 text-xs text-ink-3">
            {progress.percent}% · सिर्फ़ पहली बार, फिर हमेशा के लिए तैयार
          </p>
        </>
      )}
    </div>
  )
}

function Panel({ label, src, highlight }: { label: string; src: string; highlight?: boolean }) {
  return (
    <figure className="m-0">
      <figcaption className={'mb-1 text-xs font-semibold uppercase tracking-widest ' +
        (highlight ? 'text-indigo' : 'text-ink-3')}>{label}</figcaption>
      <img
        src={src} alt=""
        className={'w-full rounded-xl border-2 object-cover ' +
          (highlight ? 'border-indigo' : 'border-line')}
      />
    </figure>
  )
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}
