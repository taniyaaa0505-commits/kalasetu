/**
 * The microphone button, with rings that move while she is talking.
 *
 * Driven ENTIRELY by the recogniser's own speech events. An earlier version
 * opened a second microphone stream to measure loudness — it fought with
 * recognition for the device and popped a second permission prompt in the
 * middle of recording. Never reintroduce that.
 *
 * Reacting to recognised speech is also the more honest signal: a passing
 * truck moved the old meter, which told her nothing about whether the phone
 * had understood her.
 */
import { useEffect, useRef, useState } from 'react'

export default function MicRing({
  recording, speaking, pulse, icon, label, onClick,
}: {
  recording: boolean
  /** The recogniser can currently hear speech. */
  speaking: boolean
  /** Increments each time new words arrive — each bump is a visible ripple. */
  pulse: number
  icon: string
  label: string
  onClick: () => void
}) {
  const [level, setLevel] = useState(0)
  const lastPulse = useRef(pulse)

  // A ripple on every new chunk of recognised speech.
  useEffect(() => {
    if (pulse !== lastPulse.current) { lastPulse.current = pulse; setLevel(1) }
  }, [pulse])

  // Settle back toward a resting level: raised while she speaks, flat if not.
  useEffect(() => {
    if (!recording) { setLevel(0); return }
    const floor = speaking ? 0.5 : 0.12
    const id = setInterval(() => {
      setLevel(l => (l > floor ? Math.max(floor, l - 0.14) : floor))
    }, 110)
    return () => clearInterval(id)
  }, [recording, speaking])

  const R = 78
  const rings = [0, 1, 2]

  return (
    <div className="relative mx-auto mb-5 flex h-[196px] w-[196px] items-center justify-center">
      {recording && rings.map(i => {
        const reach = 10 + i * 13
        const scale = 1 + (level * reach * (1 - i * 0.18)) / R
        return (
          <span
            key={i}
            aria-hidden
            className="pointer-events-none absolute rounded-full border-2 border-danger"
            style={{
              width: R * 2, height: R * 2,
              transform: `scale(${scale})`,
              opacity: Math.max(0, 0.5 - i * 0.14) * (0.35 + level),
              transition: 'transform 160ms ease-out, opacity 160ms ease-out',
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
