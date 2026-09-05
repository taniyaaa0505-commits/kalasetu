/**
 * The language control, in the header of every screen.
 *
 * It used to live at the bottom of the home page, below the product list — so
 * the more she sold, the further she had to scroll to change language. A
 * setting should not get harder to reach the more you use the app.
 *
 * Collapsed it shows the current language in its own script, which doubles as
 * a label she can recognise without reading.
 */
import { useEffect, useRef, useState } from 'react'
import { LANGS, asrCode, type LangCode } from '../types'
import { setLang, useLang } from '../lib/i18n'
import { speak } from '../lib/speak'

export default function LangButton() {
  const lang = useLang()
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const current = LANGS.find(l => l.code === lang) ?? LANGS[0]

  // Tapping anywhere else closes it.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  function choose(code: LangCode) {
    setLang(code)
    setOpen(false)
    const l = LANGS.find(x => x.code === code)
    if (l) speak(l.sample, l.asr)     // she confirms by ear, not by reading
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => { setOpen(o => !o); if (!open) speak(current.sample, asrCode(lang)) }}
        aria-expanded={open}
        aria-label={current.english}
        className="press flex h-11 min-h-0 items-center gap-1.5 rounded-full border border-gold-leaf/60
                   bg-white/10 px-3 text-sm font-semibold text-surface active:bg-white/20"
      >
        <span aria-hidden>🗣</span>
        <span>{current.label}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-[3.25rem] z-40 w-[14.5rem] rounded-panel border border-line-2
                        bg-surface p-2 shadow-xl">
          {LANGS.map(l => (
            <button
              key={l.code}
              onClick={() => choose(l.code)}
              aria-pressed={l.code === lang}
              className={
                'flex w-full min-h-[3.25rem] items-center justify-between rounded-lg px-3 text-left ' +
                'text-lg font-semibold ' +
                (l.code === lang ? 'bg-indigo text-white' : 'active:bg-wash')
              }
            >
              <span>{l.label}</span>
              {l.code === lang && <span aria-hidden>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
