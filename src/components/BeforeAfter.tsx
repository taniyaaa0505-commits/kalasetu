/**
 * The cluttered photo and the cleaned one, in the same frame, with a handle
 * she drags across.
 *
 * Two stacked images make you compare from memory. One image with a wipe makes
 * the difference impossible to miss — and dragging it back and forth is the
 * most convincing thirty seconds of any demo.
 *
 * The handle is a real <input type="range">, which gets us touch, mouse and
 * keyboard support for free.
 */
import { useId, useState } from 'react'

export default function BeforeAfter({
  before, after, beforeLabel, afterLabel,
}: {
  before: string
  after: string
  beforeLabel: string
  afterLabel: string
}) {
  const [pos, setPos] = useState(50)
  const id = useId()

  return (
    <figure className="m-0">
      <div className="relative select-none overflow-hidden rounded-xl border-2 border-indigo">
        {/* the cleaned photo sits underneath, full width */}
        <img src={after} alt={afterLabel} className="block w-full" draggable={false} />

        {/* the original is laid over it and clipped to the handle position */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
          aria-hidden
        >
          <img src={before} alt="" className="block w-full" draggable={false} />
        </div>

        <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/55 px-2.5 py-1
                         text-[11px] font-semibold uppercase tracking-widest text-white">
          {beforeLabel}
        </span>
        <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-indigo px-2.5 py-1
                         text-[11px] font-semibold uppercase tracking-widest text-white">
          {afterLabel}
        </span>

        {/* the seam and its grip */}
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_6px_rgba(0,0,0,.5)]"
             style={{ left: `${pos}%` }} aria-hidden />
        <div className="pointer-events-none absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2
                        items-center justify-center rounded-full border-2 border-white bg-indigo
                        text-white shadow-lg"
             style={{ left: `${pos}%`, top: '50%' }} aria-hidden>
          <span className="text-sm leading-none">◀▶</span>
        </div>

        {/* invisible, but it is what you are actually dragging */}
        <label htmlFor={id} className="sr-only">{`${beforeLabel} / ${afterLabel}`}</label>
        <input
          id={id}
          type="range" min={0} max={100} step={0.5} value={pos}
          onChange={e => setPos(+e.target.value)}
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
          style={{ WebkitAppearance: 'none', appearance: 'none' }}
        />
      </div>
    </figure>
  )
}
