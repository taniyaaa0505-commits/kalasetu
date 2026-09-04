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
  // A failed session must not also report an empty transcript: `onend` always
  // follows `onerror`, and an empty final makes the screen say "nothing heard"
  // on top of the real reason, which is the one thing she needed to know.
  let failed = false
  rec.onerror = (e: any) => {
    failed = true
    ev.onSpeaking?.(false)
    ev.onError?.(String(e.error ?? 'unknown error'))
  }
  rec.onend = () => {
    ev.onSpeaking?.(false)
    if (!failed) ev.onFinal?.(finalText.trim())
    ev.onEnd?.()
  }

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
 * The plugin's contract in partialResults mode is not the obvious one, and
 * getting it wrong is why the first APK reported "कुछ सुनाई नहीं दिया" a tenth
 * of a second after she tapped the microphone. Read from its Android source:
 *
 *   - `start()` resolves IMMEDIATELY, as soon as it is listening. It is not
 *     the end of the utterance. Treating it as the end ends the session before
 *     she has said a word.
 *   - Every transcript, interim AND final, arrives on the `partialResults`
 *     event. `start()` never carries one.
 *   - `listeningState` gives 'started' when she begins speaking and 'stopped'
 *     when she stops.
 *   - If she says NOTHING, the recogniser errors internally and calls
 *     stopListening(), which emits no event at all — and the error cannot
 *     reach us either, because the promise was already resolved. Without a
 *     timer of our own the microphone stays open forever.
 *
 * Hence: the events drive the session, and a watchdog closes it when Android
 * goes quiet on us.
 */

/** How long we wait with nothing at all before giving up, and how long we
 *  linger after she stops so the final, better transcript can land. */
const SILENCE_MS = 15000
const AFTER_SPEECH_MS = 1200

function listenNative(lang: string, ev: SpeechEvents): Recogniser {
  let text = ''
  let done = false
  let watchdog: ReturnType<typeof setTimeout> | undefined
  const handles: { remove: () => Promise<void> }[] = []

  async function close() {
    clearTimeout(watchdog)
    for (const h of handles) await h.remove().catch(() => { /* already gone */ })
    handles.length = 0
    void SpeechRecognition.stop().catch(() => { /* it had already finished */ })
    ev.onSpeaking?.(false)
  }

  /** A completed session, whether or not she said anything. */
  async function finish() {
    if (done) return
    done = true
    await close()
    ev.onFinal?.(text.trim())
    ev.onEnd?.()
  }

  /** Something actually went wrong. Deliberately NOT onFinal: an empty final
   *  makes the screen say "nothing heard", which would bury the real reason. */
  async function fail(message: string) {
    if (done) return
    done = true
    await close()
    ev.onError?.(message)
    ev.onEnd?.()
  }

  function armWatchdog(ms: number) {
    clearTimeout(watchdog)
    watchdog = setTimeout(() => { void finish() }, ms)
  }

  void (async () => {
    try {
      const { available } = await SpeechRecognition.available()
      if (!available) return void fail('This phone has no speech recogniser.')

      const perm = await SpeechRecognition.requestPermissions()
      if (perm.speechRecognition !== 'granted') return void fail('Microphone permission denied.')

      handles.push(await SpeechRecognition.addListener('partialResults', (data: { matches?: string[] }) => {
        const heard = data?.matches?.[0]
        if (!heard || done) return
        text = heard
        ev.onSpeaking?.(true)
        ev.onPartial?.(heard)
        armWatchdog(SILENCE_MS)
      }))

      handles.push(await SpeechRecognition.addListener('listeningState', (s: { status?: string }) => {
        if (done) return
        if (s?.status === 'started') { ev.onSpeaking?.(true); armWatchdog(SILENCE_MS); return }
        // She has stopped. Wait a moment for the final transcript, which the
        // recogniser sends just after this, then close on whatever we hold.
        ev.onSpeaking?.(false)
        armWatchdog(AFTER_SPEECH_MS)
      }))

      // Resolves as soon as it is listening — see the note above.
      await SpeechRecognition.start({
        language: lang, partialResults: true, popup: false, maxResults: 1,
      })
      armWatchdog(SILENCE_MS)
    } catch (err) {
      void fail(err instanceof Error ? err.message : String(err))
    }
  })()

  return {
    stop: () => {
      if (done) return
      void SpeechRecognition.stop().catch(() => { /* already stopped */ })
      // Same grace as a natural end: her last words may still be in flight.
      armWatchdog(AFTER_SPEECH_MS)
    },
  }
}
