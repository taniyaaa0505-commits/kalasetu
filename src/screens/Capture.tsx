import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Screen from '../components/Screen'
import Icon from '../components/Icon'
import BigButton from '../components/BigButton'
import Speakable from '../components/Speakable'
import BeforeAfter from '../components/BeforeAfter'
import { getProduct, saveProduct, patchProduct } from '../services/db'
import { removeBackground, preloadModel, shrink, type Progress } from '../services/bgRemove'
import { t, getLang } from '../lib/i18n'

export default function Capture() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [photo, setPhoto] = useState<string>()
  const [clean, setClean] = useState<string>()
  const [progress, setProgress] = useState<Progress>()
  const [usedAI, setUsedAI] = useState<boolean>()

  useEffect(() => {
    let alive = true
    getProduct(id).then(p => {
      // Only ever FILL IN what is not there yet. With Firestore configured
      // this read is a network round trip, and it used to land after she had
      // already taken a photo and overwrite it with nothing — the screen
      // snapping back to "take a photo" while the model was still working.
      if (!alive || !p) return
      setPhoto(prev => prev ?? p.photo)
      setClean(prev => prev ?? p.cleanPhoto)
    })
    // Start fetching the model while she is still framing the shot, so the
    // wait happens during something she is already doing.
    preloadModel()
    return () => { alive = false }
  }, [id])

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Home only picked an id; this is where the product starts existing. Done
    // before the long wait below so the patch at the end has something to
    // patch even if she leaves the screen and comes back.
    if (!(await getProduct(id))) {
      await saveProduct({ id, createdAt: Date.now(), status: 'draft', lang: getLang() })
    }

    const original = await fileToDataUrl(file)
    setPhoto(original); setClean(undefined); setUsedAI(undefined)
    setProgress({ phase: 'thinking' })

    // Cut out from the FULL-resolution photo — quality matters here.
    const result = await removeBackground(original, setProgress)

    // But store only a small copy of the original; it is just a thumbnail.
    const thumb = await shrink(original)

    setClean(result.dataUrl); setUsedAI(result.usedAI); setProgress(undefined)
    await patchProduct(id, { photo: thumb, cleanPhoto: result.dataUrl })
  }

  const busy = progress !== undefined

  return (
    <Screen
      title={t('screenPhoto')} step={photo ? 2 : 1} onBack={() => {}}
      action={
        photo
          ? <div className="flex flex-col gap-2">
              <BigButton icon={<Icon name="next" />} label={t('next')} onClick={() => nav(`/p/${id}/speak`)} disabled={busy} />
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
          <Speakable text={t('photoPrompt')} className="text-xl font-medium" />
          <p className="text-sm text-ink-3">{t('photoTip')}</p>
        </div>
      )}

      {photo && (
        <div className="flex flex-col gap-4">
          {busy ? (
            <Working progress={progress!} photo={photo} />
          ) : clean ? (
            <>
              {/* One frame, dragged across. Far more convincing than two
                  images stacked, and it demos beautifully. */}
              <BeforeAfter
                before={photo} after={clean}
                beforeLabel={t('before')} afterLabel={t('after')}
              />
              {usedAI === false && (
                <p className="rounded-lg bg-gold-wash p-3 text-sm text-gold">
                  Background not removed this time — showing the squared photo instead.
                  Check the console; usually it means the model could not download.
                </p>
              )}
            </>
          ) : null}
        </div>
      )}
    </Screen>
  )
}

/** What she sees while the model works.
 *  Laid OVER the photo, not below it — she used to have to scroll down to
 *  discover that anything was happening at all. */
function Working({ progress, photo }: { progress: Progress; photo: string }) {
  const text =
    progress.phase === 'downloading' ? t('firstTimeSetup')
    : progress.phase === 'thinking'  ? t('cleaning')
    : t('composingPhoto')

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-indigo">
      <img src={photo} alt="" className="block w-full opacity-45" />

      {/* a sweep across the photo, so it reads as being worked on */}
      <span aria-hidden className="pointer-events-none absolute inset-0 animate-pulse bg-indigo/10" />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-paper/75 px-6 text-center">
        <span aria-hidden className="text-4xl">✨</span>
        <p className="text-lg font-semibold text-indigo">{text}</p>

        {progress.phase === 'downloading' && (
          <div className="w-full max-w-[240px]">
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
              <div className="h-full bg-indigo transition-all" style={{ width: `${progress.percent}%` }} />
            </div>
            <p className="mt-2 text-xs text-ink-2">
              {progress.percent}% · {t('onlyFirstTime')}
            </p>
          </div>
        )}
      </div>
    </div>
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
