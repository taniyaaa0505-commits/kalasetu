/**
 * The microphone button, with a ring that moves to her actual voice.
 *
 * This is the one piece of decoration in the app that is doing real work: a
 * person who cannot read the transcript has no other way to tell whether the
 * phone is hearing her. The ring answers that question without a word.
 *
 * If the meter is unavailable it falls back to a slow breathing pulse, so the
 * button never looks dead.
 */
import { useEffect, useRef, useState } from 'react'
import { meterMic, type MicMeter } from '../lib/micLevel'

export default function MicRing({
  recording, icon, label, onClick,
}: {
  recording: boolean
  icon: string
  label: string
  onClick: () => void
}) {
  const [level, setLevel] = useState(0)
  const [metered, setMetered] = useState(false)
  const meterRef = useRef<MicMeter | null>(null)

  useEffect(() => {
    let cancelled = false
    if (recording) {
      meterMic(l => { if (!cancelled) setLevel(l) }).then(m => {
        if (cancelled) { m?.stop(); return }
        meterRef.current = m
        setMetered(m !== null)
      })
    }
    return () => {
      cancelled = true
      meterRef.current?.stop()
      meterRef.current = null
      setLevel(0); setMetered(false)
    }
  }, [recording])

  const R = 78                                   // button radius in px
  const rings = [0, 1, 2]                        // three rings, staggered outward

  return (
    <div className="relative mx-auto mb-5 flex h-[196px] w-[196px] items-center justify-center">
      {recording && rings.map(i => {
        // Each ring sits a little further out and reacts a little less.
        const reach = 10 + i * 13
        const scale = 1 + (level * reach * (1 - i * 0.18)) / R
        return (
          <span
            key={i}
            aria-hidden
            className={
              'pointer-events-none absolute rounded-full border-2 border-danger ' +
              (metered ? '' : 'animate-ping')
            }
            style={{
              width: R * 2, height: R * 2,
              transform: metered ? `scale(${scale})` : undefined,
              opacity: metered ? Math.max(0, 0.5 - i * 0.14) * (0.35 + level) : 0.25 - i * 0.07,
              transition: metered ? 'transform 90ms linear, opacity 90ms linear' : undefined,
              animationDelay: metered ? undefined : `${i * 400}ms`,
            }}
          />
        )
      })}

      <button
        onClick={onClick}
        className={
          'relative flex h-[156px] w-[156px] min-h-0 flex-col items-center justify-center gap-1 ' +
          'rounded-full text-white transition-transform active:scale-95 ' +
          (recording ? 'bg-danger' : 'bg-indigo')
        }
      >
        <span aria-hidden className="text-5xl">{icon}</span>
        <span className="text-base font-semibold">{label}</span>
      </button>
    </div>
  )
}
