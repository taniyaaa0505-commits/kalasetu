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

export function useIdle(ms = 4500): boolean {
  const [idle, setIdle] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const restart = () => {
      setIdle(false)
      clearTimeout(timer)
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
