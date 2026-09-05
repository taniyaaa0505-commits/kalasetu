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
import Icon from './Icon'

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
    <div ref={boxRef} data-guide="lang" className="relative">
      <button
        onClick={() => { setOpen(o => !o); if (!open) speak(current.sample, asrCode(lang)) }}
        aria-expanded={open}
        aria-label={current.english}
        /* Sits on the night header on every screen but the tour, whose header
           is cream. Inherit the colour rather than naming one: hardcoded
           text-surface made this invisible on the one light header, and it
           went unnoticed for as long as the icon was an emoji — emoji ignore
           the text colour, so the glyph showed and only the label vanished. */
        className="press flex h-11 min-h-0 items-center gap-1.5 rounded-full border border-gold-leaf/60
                   bg-current/5 px-3 text-sm font-semibold text-current active:bg-current/15"
      >
        <Icon name="language" />
        <span>{current.label}</span>
      </button>

      {open && (
        /* text-ink is not optional. The panel hangs off a button that sits in
           the night header, so it INHERITS that header's cream text — and the
           panel's own background is cream. Every row but the selected one
           (which sets text-white for itself) was cream on cream, i.e. blank.
           A popover has to state its ink, never borrow the chrome's. */
        <div className="absolute right-0 top-[3.25rem] z-40 w-[14.5rem] rounded-panel border border-line-2
                        bg-surface p-2 text-ink shadow-xl">
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
              {l.code === lang && <span aria-hidden className="text-gold-leaf">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
