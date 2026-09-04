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
  recording, speaking, pulse, icon, label, onClick, size = 'md',
}: {
  recording: boolean
  /** The recogniser can currently hear speech. */
  speaking: boolean
  /** Increments each time new words arrive — each bump is a visible ripple. */
  pulse: number
  icon: string
  label: string
  onClick: () => void
  /** 'sm' on the Speak screen, which has to fit the picker, the transcript,
   *  the replay controls and the typed fallback on one screen with this. */
  size?: 'md' | 'sm'
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

  const small = size === 'sm'
  // The ripple's radius, in rem so it tracks the button it comes off — the
  // button is sized in rem too, and a ring frozen in px drifts away from its
  // own edge the moment the app scales for a bigger or smaller phone.
  const R = small ? 3.625 : 4.875
  const rings = [0, 1, 2]

  return (
    <div className={'relative mx-auto flex items-center justify-center ' +
      (small ? 'mb-3 h-[9.25rem] w-[9.25rem]' : 'mb-5 h-[12.25rem] w-[12.25rem]')}>
      {recording && rings.map(i => {
        // `reach` is in rem as well, so the ratio below stays a pure number.
        const reach = 0.625 + i * 0.8125
        const scale = 1 + (level * reach * (1 - i * 0.18)) / R
        return (
          <span
            key={i}
            aria-hidden
            className="pointer-events-none absolute rounded-full border-2 border-danger"
            style={{
              width: `${R * 2}rem`, height: `${R * 2}rem`,
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
          'press relative flex min-h-0 flex-col items-center justify-center gap-1 ' +
          'rounded-full text-white shadow-card ' +
          (small ? 'h-[7.375rem] w-[7.375rem]' : 'h-[9.75rem] w-[9.75rem]') + ' ' +
          (recording ? 'bg-danger' : 'bg-indigo')
        }
      >
        <span aria-hidden className={small ? 'text-4xl' : 'text-5xl'}>{icon}</span>
        <span className={small ? 'text-sm font-semibold' : 'text-base font-semibold'}>{label}</span>
      </button>
    </div>
  )
}
