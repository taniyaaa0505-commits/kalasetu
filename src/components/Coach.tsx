/**
 * One step of the guide: a ring around a real control, and a voice.
 *
 * The whole thing is deliberately NOT a modal. The dim is drawn with a huge
 * outward box-shadow on a box that has no pointer events, so the control
 * underneath the ring stays live and every other control stays live too. She
 * is being shown where to press, not locked out of the app — an artisan who
 * takes a wrong turn in a trapped overlay has no way back, and the one thing
 * this app must never do is strand her.
 *
 * Advancing follows the same rule. A `tap` step is finished by the real
 * control's own handler calling `advanceGuide`, never by this component: the
 * guide moves on because she actually took a photograph, not because she
 * pressed "next" on a picture of taking a photograph.
 */
import { useEffect, useRef, useState } from 'react'
import { advanceGuide, endGuide, enteredQuietly, skipGuide, useGuideStep, type GuideStep } from '../lib/guide'
import { speak, stopSpeaking } from '../lib/speak'
import { t, useLang } from '../lib/i18n'
import { asrCode } from '../types'
import Icon from './Icon'

/** How long to wait for a target that may legitimately never appear — the
 *  questions block when the model asked nothing, the rewrite button before she
 *  has answered. Rather than stall the guide, skip the step. */
const GIVE_UP_MS = 1600

export default function Coach({
  step, target, title, body, mode = 'next',
}: {
  step: GuideStep
  /** Matches `data-guide="…"` on the real element. */
  target: string
  title: string
  body?: string
  /** `tap`: she must use the control, and its handler advances the guide.
   *  `next`: nothing to do here but understand it, so we offer a button. */
  mode?: 'tap' | 'next'
}) {
  const active = useGuideStep() === step
  const lang = useLang()
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [cardH, setCardH] = useState(180)      // replaced by the real height on first paint
  const said = useRef('')

  // Find and follow the target. It moves: the page scrolls under it, the
  // keyboard opens, an image finishes loading and pushes it down.
  useEffect(() => {
    if (!active) { setRect(null); return }
    let raf = 0, gaveUp = false
    const el = () => document.querySelector<HTMLElement>(`[data-guide="${target}"]`)

    // Poll on a frame, but only re-render when it has actually MOVED.
    // Setting state with a fresh DOMRect every frame re-rendered the whole
    // screen at 60fps behind the overlay.
    let last = ''
    const measure = () => {
      const e = el()
      const r = e?.getBoundingClientRect()
      const key = r ? `${r.x | 0}:${r.y | 0}:${r.width | 0}:${r.height | 0}` : ''
      if (key !== last) { last = key; setRect(r ?? null) }
      raf = requestAnimationFrame(measure)
    }
    raf = requestAnimationFrame(measure)

    // Bring it into view once, then let the loop above track it.
    const t0 = setTimeout(() => el()?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
    const t1 = setTimeout(() => { if (!el()) { gaveUp = true; skipGuide(step) } }, GIVE_UP_MS)

    return () => { cancelAnimationFrame(raf); clearTimeout(t0); clearTimeout(t1); void gaveUp }
  }, [active, target, step])

  // Say it — but only once the ring is actually up.
  //
  // Gating on `rect` is the whole fix for an app that talked to itself. A step
  // whose target is not on this screen (no questions were asked; the rewrite
  // button does not exist until she has answered) gives up after GIVE_UP_MS
  // and advances — and it used to announce itself on the way past. Three of
  // those in a row is the app describing controls that are not there, out
  // loud, while she sits still and touches nothing.
  //
  // stopSpeaking first, so a step that advances quickly does not leave the
  // previous sentence queued up behind the new one.
  useEffect(() => {
    if (!active || !rect) return
    const line = body ? `${title}. ${body}` : title
    if (said.current === line) return
    said.current = line
    if (enteredQuietly()) return    // she pressed nothing; do not talk at her
    stopSpeaking()
    speak(line, asrCode(lang))
  }, [active, rect, title, body, lang])

  if (!active || !rect) return null


  const PAD = 8
  const box = {
    left: Math.max(4, rect.left - PAD),
    top: Math.max(4, rect.top - PAD),
    width: Math.min(window.innerWidth - 8, rect.width + PAD * 2),
    height: rect.height + PAD * 2,
  }

  /*
   * Where the caption goes.
   *
   * "Below if it fits, otherwise above" put the card straight on top of the
   * "type instead" button on the speak screen — on every phone, every time.
   * That button is the fallback for a device whose browser cannot hear, which
   * is exactly the device on which the microphone step is going to fail, so
   * the guide was covering the only way out of the hole it had put her in.
   *
   * So: count what each placement would bury, and take the quieter side.
   */
  const H = cardH
  /*
   * How much a placement would cost, in controls covered.
   *
   * Not a plain count: a language chip and the "type instead" button are not
   * worth the same. `data-guide-keep` marks the ways OUT of a step — the
   * fallback she needs precisely when the thing being rung does not work for
   * her — and burying one of those costs more than burying every ordinary
   * control on the screen put together.
   */
  const buried = (a: number, z: number) => {
    if (a < 4 || z > window.innerHeight - 4) return 999     // does not fit at all
    let cost = 0
    for (const e of document.querySelectorAll('button, a[href], textarea, input:not([type=file])')) {
      if (e.closest('[data-coach-card]')) continue
      const r = e.getBoundingClientRect()
      if (r.width && r.bottom > a && r.top < z) cost += e.closest('[data-guide-keep]') ? 50 : 1
    }
    return cost
  }
  const underTop = box.top + box.height + 12
  const aboveTop = box.top - 12 - H
  // Anchored by its BOTTOM when it goes above, so the gap to the ring is exact
  // whatever the caption's real height turns out to be. Deriving a `top` from
  // an estimated height let a taller-than-expected card grow down over the
  // very control it was pointing at.
  const cardStyle = buried(underTop, underTop + H) <= buried(aboveTop, box.top - 12)
    ? { top: underTop }
    : { bottom: window.innerHeight - box.top + 12 }

  return (
    <div className="fixed inset-0 z-50" style={{ pointerEvents: 'none' }} aria-live="polite">
      {/* The dim IS this element's shadow, so the hole is exact and needs no
          second element, no SVG mask and no four-rect arithmetic. */}
      <div
        className="absolute rounded-2xl ring-[3px] ring-gold-leaf"
        style={{ ...box, boxShadow: '0 0 0 9999px rgba(16, 26, 46, .74)', transition: 'all .18s ease-out' }}
      />

      <div
        ref={el => { if (el && Math.abs(el.offsetHeight - cardH) > 2) setCardH(el.offsetHeight) }}
        data-coach-card
        className="fade absolute inset-x-3 rounded-panel border border-gold-leaf/40 bg-surface p-4 shadow-lift"
        style={{ ...cardStyle, pointerEvents: 'auto' }}
      >
        <button
          onClick={() => { stopSpeaking(); speak(body ? `${title}. ${body}` : title, asrCode(lang)) }}
          className="press flex w-full min-h-0 items-start gap-2 text-left"
        >
          <Icon name="speak" className="mt-1 shrink-0 text-indigo" />
          <span>
            <span className="block font-display text-lg font-bold leading-tight">{title}</span>
            {body && <span className="mt-1 block text-[15px] leading-snug text-ink-2">{body}</span>}
          </span>
        </button>

        <div className="mt-3 flex items-center gap-3">
          {mode === 'tap' ? (
            /* No button. The only way on is the real control, which is the
               one lit up behind this card. */
            <span className="flex flex-1 items-center gap-2 font-semibold text-clay">
              <Icon name="next" className="text-lg" />
              {t('tapHere')}
            </span>
          ) : (
            <button
              data-coach="next"
              onClick={() => { stopSpeaking(); advanceGuide(step) }}
              className="press flex min-h-[3rem] flex-1 items-center justify-center gap-2
                         rounded-card bg-indigo px-4 font-display font-semibold text-white"
            >
              <Icon name="next" />{t('tourNext')}
            </button>
          )}

          <button
            data-coach="skip"
            onClick={() => { stopSpeaking(); endGuide() }}
            className="press min-h-0 px-2 py-2 text-sm text-ink-3 underline"
          >{t('tourSkip')}</button>
        </div>
      </div>
    </div>
  )
}
