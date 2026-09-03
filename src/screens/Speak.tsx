import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Screen from '../components/Screen'
import BigButton from '../components/BigButton'
import Speakable from '../components/Speakable'
import MicRing from '../components/MicRing'
import { getProduct, patchProduct } from '../services/db'
import { listen, listenSupported, type Recogniser } from '../lib/listen'
import { speak, stopSpeaking } from '../lib/speak'
import { t, useLang } from '../lib/i18n'
import LanguagePicker from '../components/LanguagePicker'
import { asrCode } from '../types'

export default function SpeakScreen() {
  const { id = '' } = useParams()
  const nav = useNavigate()

  const lang = useLang()          // app-wide, so it survives across screens
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [pulse, setPulse] = useState(0)   // bumps on each new chunk of speech
  const [error, setError] = useState<string>()
  const recRef = useRef<Recogniser | null>(null)

  useEffect(() => {
    getProduct(id).then(p => { if (p?.transcript) setText(p.transcript) })
    return () => { recRef.current?.stop(); stopSpeaking() }
  }, [id])

  function start() {
    // Never let the phone's own voice bleed into the microphone.
    stopSpeaking()
    // Clear first. Without this, a failed attempt leaves the old words on
    // screen and she cannot tell whether the new attempt registered at all.
    setText('')
    setError(undefined)
    setRecording(true)
    setSpeaking(false)

    recRef.current = listen(asrCode(lang), {
      onPartial: t => { setText(t); setPulse(p => p + 1) },
      onSpeaking: setSpeaking,
      onFinal: final => {
        if (final) setText(final)
        else { setError(t('nothingHeard')); speak(t('nothingHeard'), asrCode(lang)) }
      },
      onError: e => { setError(e); setRecording(false); setSpeaking(false) },
      onEnd: () => { setRecording(false); setSpeaking(false) },
    })
  }

  function stop() { recRef.current?.stop(); setRecording(false); setSpeaking(false) }

  /** She cannot read the transcript, so this is the only way she can check it. */
  function playBack() { speak(text, asrCode(lang)) }

  async function next() {
    stopSpeaking()
    await patchProduct(id, { transcript: text, lang })
    nav(`/p/${id}/review`)
  }

  const hasText = text.trim().length > 0

  return (
    <Screen
      title={t('screenSpeak')} step={3} onBack={() => { recRef.current?.stop(); stopSpeaking() }}
      action={<BigButton icon="👉" label={t('next')} onClick={next} disabled={!hasText || recording} />}
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-3">
        {t('chooseLanguage')}
      </p>
      <div className="mb-5"><LanguagePicker compact /></div>

      <Speakable text={t('speakHint')} className="mb-5 text-lg" lang={asrCode(lang)} />

      {!listenSupported() && (
        <p className="mb-4 rounded-lg bg-gold-wash p-3 text-sm text-gold">
          This browser cannot hear. Open it in Chrome on Android.
        </p>
      )}

      {/* The ring moves with her actual voice. She cannot read the
          transcript, so this is her only proof the phone is hearing her. */}
      <MicRing
        recording={recording}
        speaking={speaking}
        pulse={pulse}
        icon={recording ? '⏹' : hasText ? '🔄' : '🎤'}
        label={recording ? t('stopSpeaking') : hasText ? t('sayAgain') : t('speakNow')}
        onClick={() => (recording ? stop() : start())}
      />

      {error && <p className="mb-3 text-center text-sm text-danger">{error}</p>}

      {/* Her words, shown as they arrive. She cannot read them — but seeing
          text appear proves the app is listening, which builds trust. */}
      <div className="min-h-[110px] rounded-xl border border-line bg-surface p-4 text-lg leading-relaxed">
        {text || <span className="text-ink-3">…</span>}
      </div>

      {/* The check-and-fix pair. Hearing it back is what makes "say it again"
          useful — otherwise she has no way to know it came out wrong. */}
      {hasText && !recording && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <SmallButton icon="🔊" label={t('hearItBack')} onClick={playBack} />
          <SmallButton icon="🔄" label={t('sayAgain')} onClick={start} />
        </div>
      )}
    </Screen>
  )
}

function SmallButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-[60px] items-center justify-center gap-2 rounded-xl border-2 border-line
                 bg-surface px-3 text-base font-medium active:bg-wash"
    >
      <span aria-hidden className="text-xl">{icon}</span>
      <span>{label}</span>
    </button>
  )
}
