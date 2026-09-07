/**
 * Has she stopped? Used to decide when the app should point at something.
 *
 * The alternative — a permanent glow on the main button of every screen — was
 * the obvious version and it is worse. A thing that always moves stops being
 * seen within a day; it becomes wallpaper, and then the one moment you truly
 * needed her eye has nothing left to grab it with. It also means an artisan
 * who knows exactly what she is doing is nagged on every screen forever.
 *
 * So the beacon is for someone who is STUCK. If she has taken any action in
 * the last few seconds she never sees it at all.
 *
 * Only real actions count — pointerdown and keydown, not pointermove. Reading
 * the screen is not being stuck, and on a laptop a moving cursor would reset
 * this forever and the beacon would never appear in a demo.
 */
import { useEffect, useState } from 'react'

/**
 * Three seconds, not four and a half.
 *
 * Long enough that someone moving through the app never sees a ring, short
 * enough that someone who has stopped because she does not know what to do
 * is not left alone with the question.
 */
export function useIdle(ms = 3000): boolean {
  const [idle, setIdle] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const restart = () => {
      setIdle(false)
      clearTimeout(timer)
      // Being still is NOT the same as there being something to point at, so
      // nothing is heard here. The bell belongs to the beacon and rings from
      // `useBeaconChime` in lib/chime.ts, gated on the same condition that
      // draws the ring.
      timer = setTimeout(() => setIdle(true), ms)
    }
    restart()
    const events = ['pointerdown', 'keydown'] as const
    for (const e of events) window.addEventListener(e, restart, { passive: true })
    return () => {
      clearTimeout(timer)
      for (const e of events) window.removeEventListener(e, restart)
    }
  }, [ms])

  return idle
}
