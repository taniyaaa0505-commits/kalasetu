/**
 * A small bell, for the moment the app starts pointing at something.
 *
 * The ring around a control is easy to miss if she is not looking at the
 * screen — and a woman who has stalled for three seconds very often is not
 * looking at the screen. A sound brings her eyes back; the ring then tells her
 * where.
 *
 * Synthesised, not a file. Two sine partials a fifth apart with a fast decay
 * is a bell, and it costs no download, no cache entry and nothing at all in
 * airplane mode. An mp3 would be none of those things for a worse sound.
 *
 * Deliberately quiet and deliberately rare: it plays once when the beacon
 * appears, never on the pulses that follow, and never over the app's own
 * voice — two sounds at once is how an app starts to feel like an alarm.
 */
import { isSpeaking, isSpeechEnabled } from './speak'

let ctx: AudioContext | null = null

export function chime() {
  // The same gesture rule that governs speech governs sound: before the page
  // has been touched the context stays suspended and nothing is heard. That
  // is fine — she has to have touched something to have stalled.
  if (!isSpeechEnabled() || isSpeaking()) return

  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ctx ??= new AC()
    if (ctx.state === 'suspended') void ctx.resume()

    const now = ctx.currentTime
    // A fifth: the interval a struck bell actually rings at.
    for (const [freq, gain, delay] of [[880, 0.055, 0], [1320, 0.032, 0.02]] as const) {
      const osc = ctx.createOscillator()
      const vol = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      vol.gain.setValueAtTime(0, now + delay)
      vol.gain.linearRampToValueAtTime(gain, now + delay + 0.012)
      vol.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.9)
      osc.connect(vol).connect(ctx.destination)
      osc.start(now + delay)
      osc.stop(now + delay + 0.95)
    }
  } catch {
    // No audio on this device, or the context was refused. The ring is still
    // there; the sound was only ever the thing that draws the eye to it.
  }
}
