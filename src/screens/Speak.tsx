import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Screen from '../components/Screen'
import Icon from '../components/Icon'
import BigButton from '../components/BigButton'
import Speakable from '../components/Speakable'
import MicRing from '../components/MicRing'
import Coach from '../components/Coach'
import { advanceGuide } from '../lib/guide'
import { getProduct, patchProduct } from '../services/db'
import { listen, listenSupported, type Recogniser } from '../lib/listen'
import { speak, stopSpeaking, useSpeaking } from '../lib/speak'
import { t, useLang } from '../lib/i18n'
import LanguagePicker from '../components/LanguagePicker'
import { asrCode } from '../types'
import type { ReactNode } from 'react'

export default function SpeakScreen() {
  const { id = '' } = useParams()
  const nav = useNavigate()

  const lang = useLang()          // app-wide, so it survives across screens
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [pulse, setPulse] = useState(0)   // bumps on each new chunk of speech
  const [error, setError] = useState<string>()
  const [typing, setTyping] = useState(false)
  const talking = useSpeaking()
  const recRef = useRef<Recogniser | null>(null)

  useEffect(() => {
    getProduct(id).then(p => { if (p?.transcript) setText(p.transcript) })
    return () => { recRef.current?.stop(); stopSpeaking() }
  }, [id])

  function start() {
    advanceGuide('speakMic')
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
      action={<BigButton icon={<Icon name="next" />} label={t('next')} onClick={next} disabled={!hasText || recording} />}
    >
      {/* Everything on this screen has to be visible at once — the picker, the
          microphone, her words, the two ways to check them and the way out to
          typing. She should never have to scroll to find out whether the phone
          heard her. Sizes here are chosen against that, not by taste. */}
      <p className="mb-1.5 text-xs font-semibold label uppercase text-ink-3">
        {t('chooseLanguage')}
      </p>
      <div className="mb-3"><LanguagePicker compact /></div>

      <Speakable text={t('speakHint')} className="mb-3 text-base leading-snug" lang={asrCode(lang)} />

      {!listenSupported() && (
        <p className="mb-4 rounded-card border border-gold/30 bg-gold-wash p-3 text-sm text-gold">
          {t('cannotHear')}
        </p>
      )}

      {/* The ring moves with her actual voice. She cannot read the
          transcript, so this is her only proof the phone is hearing her. */}
      {/* Ring the microphone — unless this browser has no recogniser, in which
          case ring the typing fallback instead. Pointing an artisan at a
          microphone that cannot work, with the caption card sitting over the
          one control that would have got her out of it, is the worst thing
          this guide could do. Android's WebView is exactly that browser, so
          this is the APK, not a hypothetical. */}
      <Coach step="speakCheck" target="playback"
             title={t('hearItBack')} body={t('sayAgain')} />
      <Coach step="speakMic"
             target={listenSupported() ? 'mic' : 'type'}
             title={listenSupported() ? t('tourSpeakStep') : t('typeInstead')}
             body={listenSupported() ? t('tourSpeakSub') : t('cannotHear')} mode="tap" />

      {!typing && <MicRing
        size="sm"
        recording={recording}
        speaking={speaking}
        pulse={pulse}
        icon={<Icon name={recording ? 'stop' : hasText ? 'redo' : 'mic'} />}
        label={recording ? t('stopSpeaking') : hasText ? t('sayAgain') : t('speakNow')}
        disabled={talking && !recording}
        onClick={() => (recording ? stop() : start())}
      />}

      {error && <p className="mb-3 text-center text-sm text-danger">{error}</p>}

      {/* Her words, shown as they arrive. She cannot read them — but seeing
          text appear proves the app is listening, which builds trust. */}
      {typing ? (
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={3}
          placeholder={t('speakHint')}
          className="w-full rounded-card border-2 border-indigo bg-surface p-4 text-lg leading-relaxed
                     shadow-rest outline-none placeholder:text-ink-3"
        />
      ) : (
        <div className="min-h-[5.25rem] rounded-card border border-line-2/70 bg-surface p-3.5 text-lg leading-relaxed shadow-rest">
          {text || <span className="text-ink-3">…</span>}
        </div>
      )}

      {/* The way through when the microphone is not an option — a phone that
          cannot hear, a noisy hall, or a helper doing it for her. Secondary on
          purpose: speaking is the point of this app, typing is the escape. */}
      <button
        data-guide="type" data-guide-keep
        onClick={() => { stop(); advanceGuide('speakMic'); setTyping(v => !v) }}
        className="press mx-auto mt-2.5 flex h-11 min-h-0 items-center gap-2 rounded-full border border-line
                   bg-surface px-4 text-sm font-medium text-ink-2 shadow-rest active:bg-surface-2"
      >
        <Icon name={typing ? 'mic' : 'keyboard'} />
        <span>{typing ? t('speakNow') : t('typeInstead')}</span>
      </button>

      {/* The check-and-fix pair. Hearing it back is what makes "say it again"
          useful — otherwise she has no way to know it came out wrong. */}
      {hasText && !recording && !typing && (
        <div data-guide="playback" className="mt-2.5 grid grid-cols-2 gap-3">
          {/* Both disabled while the phone is talking. Pressing "hear it back"
              mid-sentence used to cut off the sentence it was already reading,
              and "say it again" opened the microphone into the app's own
              voice — the recogniser's first word was ours, not hers. */}
          <SmallButton icon={<Icon name="speak" />} label={t('hearItBack')} onClick={playBack} disabled={talking} />
          <SmallButton icon={<Icon name="redo" />} label={t('sayAgain')} onClick={start} disabled={talking} />
        </div>
      )}
    </Screen>
  )
}

function SmallButton({ icon, label, onClick, disabled }: {
  icon: ReactNode; label: string; onClick: () => void; disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="press flex min-h-[3.5rem] items-center justify-center gap-2 rounded-card border-2 border-line
                 bg-surface px-3 text-[0.9375rem] font-medium shadow-rest active:bg-surface-2
                 disabled:opacity-40 disabled:shadow-none"
    >
      <span aria-hidden className="text-xl">{icon}</span>
      <span>{label}</span>
    </button>
  )
}
