/**
 * Text-to-speech using the phone's own voice. Free, offline, no setup.
 * This is the single most important file in the app: it is what makes
 * KalaSetu usable by someone who cannot read.
 */

import { getLang, t } from './i18n'
import { asrCode } from '../types'

let enabled = true

export function setSpeechEnabled(v: boolean) { enabled = v }
export function isSpeechEnabled() { return enabled }

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** Say something out loud. Cancels whatever was being said before. */
/** `lang` defaults to whatever language the artisan chose. */
/**
 * `onDone` fires when the phone has finished talking — the only safe moment to
 * open the microphone, since its own voice would otherwise be recognised as
 * hers. It ALSO fires when speech is off, unsupported or fails, so a caller
 * that waits on it never hangs; the mic still opens on a silent phone.
 */
export function speak(text: string, lang?: string, onDone?: () => void) {
  if (!enabled || !speechSupported() || !text) { onDone?.(); return }
  window.speechSynthesis.cancel()

  let done = false
  const finish = () => { if (!done) { done = true; onDone?.() } }

  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang ?? asrCode(getLang())
  u.rate = 0.88          // slower than default — clarity beats speed here
  u.pitch = 1
  u.onend = finish
  u.onerror = finish
  window.speechSynthesis.speak(u)

  if (!onDone) return

  /**
   * A phone with no voice installed for the chosen language fires NEITHER
   * `end` nor `error` — the utterance simply never starts. A caller waiting on
   * `onDone` would then wait forever and its button would look dead, which is
   * a real risk here: most of our languages have no guaranteed voice on a
   * budget Android.
   *
   * So watch `speaking` as well. Once it is false past a grace period, or the
   * text has had far longer than it could possibly need, we call it finished.
   * We never cut in while the phone is genuinely still talking.
   */
  const GRACE = 1000                       // it can take a moment to start
  const CEILING = 3000 + text.length * 120 // far beyond real speech at rate 0.88
  const startedAt = Date.now()

  const poll = setInterval(() => {
    if (done) { clearInterval(poll); return }
    const waited = Date.now() - startedAt
    if ((waited > GRACE && !window.speechSynthesis.speaking) || waited > CEILING) {
      clearInterval(poll)
      finish()
    }
  }, 200)
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel()
}

/** Rupees, in whichever language she chose. */
export function speakRupees(amount: number, lang?: string) {
  speak(`${Math.round(amount)} ${t('rupees')}`, lang)
}
