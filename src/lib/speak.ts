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
export function speak(text: string, lang?: string) {
  if (!enabled || !speechSupported() || !text) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang ?? asrCode(getLang())
  u.rate = 0.88          // slower than default — clarity beats speed here
  u.pitch = 1
  window.speechSynthesis.speak(u)
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel()
}

/** Rupees, in whichever language she chose. */
export function speakRupees(amount: number, lang?: string) {
  speak(`${Math.round(amount)} ${t('rupees')}`, lang)
}
