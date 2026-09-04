/**
 * Speech-to-text using the Web Speech API — built into Chrome on Android.
 * Free, nothing to install. Needs a network connection (Chrome sends the
 * audio to Google), which is why offline recordings go through the queue
 * instead. See services/queue.ts.
 *
 * TypeScript has no built-in types for this API, so we reach for `any` in
 * exactly one place and keep the rest typed.
 *
 * And in the APK there IS no such API — the Web Speech API is Chrome, and the
 * Android System WebView is not Chrome. So there is a second implementation
 * below, over the native Android recogniser via a Capacitor plugin. Both wear
 * the same `listen(lang, events) -> { stop }` shape, so no screen knows which
 * one it got. See lib/speak.ts, which had to do the same for the voice.
 */
import { Capacitor } from '@capacitor/core'
import { SpeechRecognition } from '@capacitor-community/speech-recognition'

/** Decided once. Inside the APK this is true; in any browser it is false. */
const NATIVE = Capacitor.isNativePlatform()

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
  if (NATIVE) return true
  return typeof window !== 'undefined' && getCtor() !== null
}

/** Start listening. Returns a handle you must call .stop() on. */
export function listen(lang: string, ev: SpeechEvents): Recogniser | null {
  if (NATIVE) return listenNative(lang, ev)

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

/**
 * The same thing, over Android's own recogniser.
 *
 * Shaped to match the web one exactly, including the order the callbacks fire
 * in — onFinal before onEnd — because Review.tsx relies on that to save an
 * answer before it clears the question.
 *
 * `popup: false` matters: with the system dialog up, Android sends no partial
 * results, and the live text is the only proof she has that the phone is
 * hearing her. It also puts a screen full of English in front of someone who
 * cannot read it.
 */
function listenNative(lang: string, ev: SpeechEvents): Recogniser {
  let finalText = ''
  let stopped = false
  let partials: { remove: () => Promise<void> } | undefined

  ;(async () => {
    try {
      const perm = await SpeechRecognition.requestPermissions()
      if (perm.speechRecognition !== 'granted') {
        ev.onError?.('microphone permission denied')
        return
      }

      partials = await SpeechRecognition.addListener('partialResults', (data: { matches?: string[] }) => {
        const heard = data?.matches?.[0]
        if (!heard) return
        finalText = heard
        ev.onSpeaking?.(true)
        ev.onPartial?.(heard)
      })

      // Resolves when recognition ends, whether she stopped it or fell silent.
      const result = await SpeechRecognition.start({
        language: lang, partialResults: true, popup: false, maxResults: 1,
      })
      const best = result?.matches?.[0]
      if (best) finalText = best
    } catch (err) {
      ev.onError?.(err instanceof Error ? err.message : String(err))
    } finally {
      await partials?.remove().catch(() => { /* already gone */ })
      ev.onSpeaking?.(false)
      ev.onFinal?.(finalText.trim())
      ev.onEnd?.()
    }
  })()

  return {
    stop: () => {
      if (stopped) return
      stopped = true
      void SpeechRecognition.stop().catch(() => { /* it had already finished */ })
    },
  }
}
