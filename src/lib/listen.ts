/**
 * Speech-to-text using the Web Speech API — built into Chrome on Android.
 * Free, nothing to install. Needs a network connection (Chrome sends the
 * audio to Google), which is why offline recordings go through the queue
 * instead. See services/queue.ts.
 *
 * TypeScript has no built-in types for this API, so we reach for `any` in
 * exactly one place and keep the rest typed.
 */

type SpeechEvents = {
  onPartial?: (text: string) => void   // live text while she is still talking
  onFinal?: (text: string) => void     // the finished transcript
  onError?: (message: string) => void
  onEnd?: () => void

  /**
   * Whether the recogniser can currently hear speech.
   *
   * These come free from the recogniser itself. We used to measure loudness by
   * opening a SECOND microphone stream, which fought with recognition for the
   * device and popped a second permission prompt in the middle of recording.
   * Never do that again — the API already tells us what we need.
   */
  onSpeaking?: (speaking: boolean) => void
}

export interface Recogniser { stop: () => void }

function getCtor(): any {
  const w = window as any
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export function listenSupported(): boolean {
  return typeof window !== 'undefined' && getCtor() !== null
}

/** Start listening. Returns a handle you must call .stop() on. */
export function listen(lang: string, ev: SpeechEvents): Recogniser | null {
  const Ctor = getCtor()
  if (!Ctor) { ev.onError?.('This browser cannot hear. Use Chrome on Android.'); return null }

  const rec = new Ctor()
  rec.lang = lang
  rec.continuous = true          // she may pause mid-sentence; don't cut her off
  rec.interimResults = true      // show words as she speaks — proves it is working

  let finalText = ''

  // Real signal from the recogniser, no extra microphone access.
  rec.onspeechstart = () => ev.onSpeaking?.(true)
  rec.onspeechend   = () => ev.onSpeaking?.(false)
  rec.onsoundstart  = () => ev.onSpeaking?.(true)
  rec.onsoundend    = () => ev.onSpeaking?.(false)

  rec.onresult = (e: any) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const chunk = e.results[i][0].transcript
      if (e.results[i].isFinal) finalText += chunk + ' '
      else interim += chunk
    }
    ev.onPartial?.((finalText + interim).trim())
  }
  rec.onerror = (e: any) => { ev.onSpeaking?.(false); ev.onError?.(String(e.error ?? 'unknown error')) }
  rec.onend = () => { ev.onSpeaking?.(false); ev.onFinal?.(finalText.trim()); ev.onEnd?.() }

  rec.start()
  return { stop: () => rec.stop() }
}
