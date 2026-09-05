/**
 * Text-to-speech using the phone's own voice. Free, offline, no setup.
 * This is the single most important file in the app: it is what makes
 * Pehchaan usable by someone who cannot read.
 *
 * TWO implementations, because there have to be.
 *
 * On the web we use `speechSynthesis`. In the APK we cannot: the Web Speech
 * API is a Chrome feature and the Android System WebView is not Chrome, so
 * `window.speechSynthesis` is missing there and every screen in this app went
 * silent — which for a non-reader is the app not working at all. Confirmed on
 * a real phone, not guessed. Native Android has a perfectly good TextToSpeech
 * engine and the Capacitor plugin hands it to us.
 *
 * The split lives here and in lib/listen.ts and nowhere else. No screen knows
 * which one it is talking to.
 */

import { useSyncExternalStore } from 'react'
import { Capacitor } from '@capacitor/core'
import { TextToSpeech } from '@capacitor-community/text-to-speech'
import { getLang, t } from './i18n'
import { asrCode } from '../types'

/** Decided once. Inside the APK this is true; in any browser it is false. */
const NATIVE = Capacitor.isNativePlatform()

let enabled = true

export function setSpeechEnabled(v: boolean) { enabled = v }
export function isSpeechEnabled() { return enabled }

/* ---------------- is the phone talking right now? ----------------
 *
 * Every screen needed to know and none of them could, so nothing could stop
 * her walking into the app's own voice. Two things went wrong because of it:
 * a tap on "hear it back" cut off the sentence that was still playing, and —
 * worse — the microphone could open while the phone was mid-word, so the
 * first thing the recogniser heard was the app.
 *
 * Anything that would start a second voice, or listen while this one is
 * running, disables itself off this flag. Navigation never does: she is never
 * locked into a screen because it is talking.
 */
let talking = false
const listeners = new Set<() => void>()

function setTalking(v: boolean) {
  if (talking === v) return
  talking = v
  listeners.forEach(fn => fn())
}

export function isSpeaking() { return talking }

export function useSpeaking(): boolean {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => { listeners.delete(cb) } },
    () => talking, () => talking,
  )
}

export function speechSupported(): boolean {
  if (NATIVE) return true
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
  const voice = lang ?? asrCode(getLang())
  setTalking(true)

  if (NATIVE) {
    // The plugin resolves when the utterance actually finishes, which is what
    // the microphone handoff in Review.tsx waits on. A rejection still calls
    // back — a caller must never be left waiting on a voice that failed.
    let done = false
    const finish = () => { if (!done) { done = true; setTalking(false); onDone?.() } }
    TextToSpeech.stop()
      .catch(() => { /* nothing was speaking */ })
      .then(() => TextToSpeech.speak({ text, lang: voice, rate: 0.9, pitch: 1, volume: 1 }))
      .then(finish)
      .catch(err => { console.warn('[speak] native TTS failed:', err); finish() })
    return
  }

  window.speechSynthesis.cancel()

  let done = false
  const finish = () => { if (!done) { done = true; setTalking(false); onDone?.() } }

  const u = new SpeechSynthesisUtterance(text)
  u.lang = voice
  u.rate = 0.88          // slower than default — clarity beats speed here
  u.pitch = 1
  u.onend = finish
  u.onerror = finish
  window.speechSynthesis.speak(u)

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
   *
   * This runs for EVERY utterance now, not just the ones with an `onDone`.
   * It used to return early without one, which left the talking flag stuck on
   * and every speak button in the app disabled until the next utterance.
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
  setTalking(false)
  if (NATIVE) { void TextToSpeech.stop().catch(() => { /* nothing to stop */ }); return }
  if (speechSupported()) window.speechSynthesis.cancel()
}

/** Rupees, in whichever language she chose. */
export function speakRupees(amount: number, lang?: string) {
  speak(`${Math.round(amount)} ${t('rupees')}`, lang)
}
