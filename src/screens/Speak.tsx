import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Screen from '../components/Screen'
import BigButton from '../components/BigButton'
import Speakable from '../components/Speakable'
import { getProduct, patchProduct } from '../services/db'
import { listen, listenSupported, type Recogniser } from '../lib/listen'
import { t } from '../lib/i18n'
import type { LangCode } from '../types'

export default function SpeakScreen() {
  const { id = '' } = useParams()
  const nav = useNavigate()

  const [lang, setLang] = useState<LangCode>('hi-IN')
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState<string>()
  const recRef = useRef<Recogniser | null>(null)

  useEffect(() => {
    getProduct(id).then(p => { if (p?.transcript) setText(p.transcript); if (p?.lang) setLang(p.lang) })
  }, [id])

  function start() {
    setError(undefined); setRecording(true)
    recRef.current = listen(lang, {
      onPartial: setText,
      onFinal: t => { if (t) setText(t) },
      onError: e => { setError(e); setRecording(false) },
      onEnd: () => setRecording(false),
    })
  }

  function stop() { recRef.current?.stop(); setRecording(false) }

  async function next() {
    await patchProduct(id, { transcript: text, lang })
    nav(`/p/${id}/review`)
  }

  return (
    <Screen
      title="बोलिए" step={3} onBack={() => {}}
      action={<BigButton icon="👉" label={t('next')} onClick={next} disabled={!text.trim()} />}
    >
      <Speakable text={t('speakHint')} className="mb-5 text-lg" />

      {!listenSupported() && (
        <p className="mb-4 rounded-lg bg-gold-wash p-3 text-sm text-gold">
          This browser cannot hear. Open it in Chrome on Android.
        </p>
      )}

      <button
        onClick={recording ? stop : start}
        className={
          'mx-auto mb-6 flex h-40 w-40 min-h-0 flex-col items-center justify-center gap-1 rounded-full ' +
          'text-white transition-transform active:scale-95 ' +
          (recording ? 'animate-pulse bg-danger' : 'bg-indigo')
        }
      >
        <span aria-hidden className="text-5xl">{recording ? '⏹' : '🎤'}</span>
        <span className="text-base font-semibold">
          {recording ? t('stopSpeaking') : t('speakNow')}
        </span>
      </button>

      {error && <p className="mb-3 text-center text-sm text-danger">{error}</p>}

      {/* Her words, shown as they arrive. She cannot read them — but seeing
          text appear proves the app is listening, which builds trust. */}
      <div className="min-h-[110px] rounded-xl border border-line bg-surface p-4 text-lg leading-relaxed">
        {text || <span className="text-ink-3">…</span>}
      </div>
    </Screen>
  )
}
