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
import { speak } from './speak'
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
    said.current = text
    speak(text, asrCode(lang))
  }, [text, ready, lang])
}
