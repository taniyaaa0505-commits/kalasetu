/**
 * The first run, as a state machine.
 *
 * The app used to open on a *simulation*: ten screens of a pretend clay pot,
 * with fake buttons that did nothing, and then it said "now you try" and
 * dropped her on an empty home screen. She had watched a film about an app,
 * not used one. Everything she had just been shown was in a place she was no
 * longer looking at.
 *
 * So there is no simulation any more. The guide runs ON the real app: it
 * darkens the screen, puts a ring around the actual control, says what it does
 * out loud, and waits for her to press that actual control. By the end of it
 * she has not seen a demo — she has a real listing, published, from her own
 * photograph and her own voice.
 *
 * The order below is the order of the golden path, and it is the only place
 * that order is written down.
 */
import { useSyncExternalStore } from 'react'

export const GUIDE_STEPS = [
  /* Before anything else. She cannot read the app until it is in her
     language, so nothing is shown until this is answered. */
  'language',

  /* The empty home, one control at a time. */
  'homeWhat',      // the three things the app will do for her
  'homeOrders',    // where a buyer's order will appear
  'homeLang',      // how to change language back
  'homeAdd',       // and now add your first thing — for real

  'capturePhoto',  // press this, take a photograph

  /* And no ring on the photo screen's "next" either, for the same reason as
     the speak screen below — but this one was worse. Both steps pointed at
     the SAME action bar, one after the other, so from her side the photo step
     simply happened twice: a ring, a photograph, and then a ring in exactly
     the same place again. Its caption repeated the line the before/after
     figure on that screen was already showing her, and `Working` narrates the
     cleanup out loud while it runs. Three tellings of one thing. */

  'speakMic',      // press this and talk about it
  'speakCheck',    // and these two are how you check it came out right

  /* There is deliberately no ring on the speak screen's "next".
     The mic ring is 134px tall and the action bar is pinned to the bottom, so
     a caption there has nowhere to sit except on top of "type instead" — the
     one control she needs precisely when the microphone has failed her. And
     it earns nothing: by this point she has pressed that same button twice.
     A guide is worth more for the steps it leaves out. */

  /* The listing has been written. These three are the whole reason the
     review screen exists, and they are the ones she would never find. */
  'reviewQuestions', // there are questions further down — go and see
  'reviewRewrite',   // now have it written again with your answers in
  'reviewListen',    // and hear it back before you accept it
  'reviewNext',

  'priceNext',
  'publishSend',

  'done',
] as const

export type GuideStep = typeof GUIDE_STEPS[number]

const KEY = 'kalasetu.guide'
/** The flag the old simulated tour used. Anyone who finished that has already
 *  been taught; dropping them into onboarding again would be a punishment for
 *  updating. */
const OLD_KEY = 'kalasetu.tourSeen'

function read(): GuideStep {
  try {
    const v = localStorage.getItem(KEY)
    if (v && (GUIDE_STEPS as readonly string[]).includes(v)) return v as GuideStep
    if (localStorage.getItem(OLD_KEY) === '1') return 'done'
  } catch { return 'done' }   // storage blocked: never trap her in a guide
  return 'language'
}

let current: GuideStep = read()
const listeners = new Set<() => void>()

function write(step: GuideStep) {
  current = step
  try { localStorage.setItem(KEY, step) } catch { /* private mode */ }
  listeners.forEach(fn => fn())
}

export function getGuideStep(): GuideStep { return current }

/** True while the guide is still running. */
export function guiding(): boolean { return current !== 'done' }

export function useGuideStep(): GuideStep {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => { listeners.delete(cb) } },
    () => current, () => current,
  )
}

/**
 * Move on from `from` — and ONLY from `from`.
 *
 * Every advance is called from the real control's own handler, and those fire
 * more than once: React's StrictMode double-invokes, a double tap sends two,
 * and a screen that re-mounts on navigation sends another. Naming the step you
 * are leaving makes all of those idempotent, so a stray call cannot skip a
 * step she has not been shown.
 */
export function advanceGuide(from: GuideStep) {
  quiet = false
  const i = GUIDE_STEPS.indexOf(from)
  const now = GUIDE_STEPS.indexOf(current)
  // Already past it — a double tap, a StrictMode double-invoke, a screen
  // re-mounting on navigation. Do nothing.
  if (now > i) return
  // Behind it, which means the guide has fallen behind HER. This happens for
  // real: the ring on the promises panel is waiting for a panel that only
  // exists on an empty shop, she taps "add" before it gives up, and the guide
  // is left pointing at the home screen while she is three screens into
  // photographing a pot. Whatever she has just finished is the truth about
  // where she is, so jump to it rather than stranding the guide behind her.
  write(GUIDE_STEPS[Math.min(i + 1, GUIDE_STEPS.length - 1)])
}

/**
 * True when the step we are on was reached by the guide skipping itself
 * forward, not by her pressing anything.
 *
 * The app is voice-first, so every step says itself out loud — and that turned
 * into the app talking to nobody. Restarting the guide from "learn how to
 * sell" puts it back on `homeWhat`, whose target is the promises panel, which
 * only exists while the shop is EMPTY. On a shop with anything in it that
 * target is gone, the step skips, and the next one announced itself: two
 * sentences, unprompted, at someone who had touched nothing.
 *
 * So a skip is silent. The caption is still on screen with a speaker on it,
 * and the moment she presses anything the guide talks again.
 */
let quiet = false
export function enteredQuietly() { return quiet }

/** A step giving up on a target that is not on this screen. */
export function skipGuide(from: GuideStep) {
  if (current !== from) return
  quiet = true
  const i = GUIDE_STEPS.indexOf(from)
  write(GUIDE_STEPS[Math.min(i + 1, GUIDE_STEPS.length - 1)])
}

/** She pressed "skip", or she has finished. */
export function endGuide() { write('done') }

/** From the "learn how to sell" tile. Not back to the language screen — she
 *  has a language, and asking again would read as the app forgetting her. */
export function restartGuide() { write('homeWhat') }
