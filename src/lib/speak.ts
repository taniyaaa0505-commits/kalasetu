/**
 * Text-to-speech using the phone's own voice. Free, offline, no setup.
 * This is the single most important file in the app: it is what makes
 * KalaSetu usable by someone who cannot read.
 */

let enabled = true

export function setSpeechEnabled(v: boolean) { enabled = v }
export function isSpeechEnabled() { return enabled }

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** Say something out loud. Cancels whatever was being said before. */
export function speak(text: string, lang = 'hi-IN') {
  if (!enabled || !speechSupported() || !text) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  u.rate = 0.88          // slower than default — clarity beats speed here
  u.pitch = 1
  window.speechSynthesis.speak(u)
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel()
}

/** Rupees, spoken the way a person would say them: "दो हज़ार चार सौ रुपये" is ideal,
 *  but the browser voice handles "2400 रुपये" fine. Keep it simple for now. */
export function speakRupees(amount: number, lang = 'hi-IN') {
  speak(`${Math.round(amount)} रुपये`, lang)
}
