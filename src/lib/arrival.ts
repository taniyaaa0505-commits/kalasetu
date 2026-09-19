/**
 * What a screen says when she lands on it.
 *
 * The guide talks her through the first run and then goes quiet forever, and
 * every screen after that opened in silence. For a reader that is fine — the
 * instruction is written at the top. She is not a reader. So each step of the
 * golden path now says what it is for as she arrives, the same sentence that
 * is printed on it, in the language she chose.
 *
 * Three rules, all of them learned the hard way:
 *
 *  1. ONCE. Not on every re-render, not when the transcript updates, not when
 *     she taps a stepper. Keyed on the text, so a language change re-says it
 *     and nothing else does.
 *
 *  2. NEVER OVER THE GUIDE. While the guide is running, the ring on this
 *     screen is already saying something about this screen. Two voices with
 *     the same job is worse than one.
 *
 *  3. NOTHING FOLLOWS HER OFF THE PAGE. `speak` cancels whatever came before,
 *     which covers most of it, but a screen with nothing to say would let the
 *     previous screen's sentence run on underneath it — the app talking about
 *     a page she has already left. Screen.tsx stops the voice on the way out.
 */
import { useEffect, useRef } from 'react'
import { isSpeaking, speak } from './speak'
import { getGuideStep } from './guide'
import { useLang } from './i18n'
import { asrCode } from '../types'

/**
 * Say `text` once, when `ready` first becomes true.
 *
 * `ready` is what makes this usable for "it is done" as well as "here is what
 * to do": pass the condition that means the step has finished and she hears it
 * the moment it does, not before.
 */
export function useSay(text: string | undefined, ready = true) {
  const lang = useLang()
  const said = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!ready || !text || said.current === text) return
    if (getGuideStep() !== 'done') return   // the ring is already talking

    /*
     * A fourth rule, from giving the orders and messages screens a voice:
     *
     *  4. NEVER OVER SOMETHING MORE IMPORTANT. Those screens announce the
     *     thing that just happened — "an order has come" — from a live
     *     subscription, and React runs a child's effects before its parent's,
     *     so this line would land a moment later and cut it off. `speak`
     *     cancels whatever came before it, which is right for a new screen and
     *     wrong here. The one-line answer: if the app is already saying
     *     something, it is saying something better than "this is the orders
     *     screen".
     *
     * The wait is for the same reason in the other direction — a subscription
     * that answers from cache lands within a frame or two of mount, and
     * without it this would win that race by being first rather than by being
     * more useful.
     */
    said.current = text
    const timer = setTimeout(() => {
      if (!isSpeaking()) speak(text, asrCode(lang))
    }, 200)
    return () => clearTimeout(timer)
  }, [text, ready, lang])
}
