/**
 * The cleaned photo, with the original tucked into the corner.
 *
 * An earlier version was a draggable wipe. It looked wrong, and the reason is
 * worth remembering: a wipe assumes both images line up pixel-for-pixel. Ours
 * never can — the original is whatever shape her camera gave us, and the
 * cleaned one is a square, auto-cropped to the product's bounding box and
 * re-centred. The subject jumps between the two, so the wipe read as a glitch.
 *
 * So: the good photo is the hero, the original is a small inset labelled
 * "before", and tapping swaps which one is large. No alignment needed, and the
 * comparison is obvious at a glance without any dragging.
 */
import { useState } from 'react'

export default function BeforeAfter({
  before, after, beforeLabel, afterLabel,
}: {
  before: string
  after: string
  beforeLabel: string
  afterLabel: string
}) {
  const [swapped, setSwapped] = useState(false)
  const hero = swapped ? before : after
  const inset = swapped ? after : before
  const heroLabel = swapped ? beforeLabel : afterLabel
  const insetLabel = swapped ? afterLabel : beforeLabel

  return (
    <button
      onClick={() => setSwapped(s => !s)}
      aria-label={`${heroLabel} — ${insetLabel}`}
      className="relative block w-full select-none overflow-hidden rounded-card border-2 border-indigo
                 text-left active:opacity-95"
    >
      <img src={hero} alt="" className="block w-full" draggable={false} />

      <span className={
        'pointer-events-none absolute left-2 top-2 rounded-full px-2.5 py-1 text-[11px] ' +
        'font-semibold label uppercase text-white ' +
        (swapped ? 'bg-black/55' : 'bg-indigo')
      }>
        {heroLabel}
      </span>

      {/* the other version, small, in the corner — tap to bring it forward */}
      <span className="absolute bottom-2 right-2 w-[34%] max-w-[8.125rem] overflow-hidden rounded-lg
                       border-2 border-white shadow-lg">
        <img src={inset} alt="" className="block w-full" draggable={false} />
        <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[10px]
                         font-semibold label uppercase text-white">
          {insetLabel}
        </span>
      </span>
    </button>
  )
}
