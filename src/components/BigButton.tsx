/**
 * The only button style in the app.
 *
 * Rules it enforces so nobody has to remember them:
 *  - at least 64px tall (the brief says 56 minimum; the primary action gets more)
 *  - an icon AND a word, never a word alone
 *  - says its own label out loud when tapped, so a non-reader knows what it does
 */
import type { ReactNode } from 'react'
import { speak } from '../lib/speak'
import { useLang } from '../lib/i18n'
import { asrCode } from '../types'

type Variant = 'primary' | 'quiet' | 'good' | 'danger'

const STYLES: Record<Variant, string> = {
  primary: 'bg-indigo text-white shadow-card active:bg-indigo-2',
  quiet:   'bg-surface text-ink border-2 border-line active:bg-surface-2',
  good:    'bg-good text-white shadow-card active:opacity-90',
  // The only irreversible thing in the app. It was indigo, the same as "next",
  // which meant the button that deletes her work looked like the button she
  // presses on every other screen to continue.
  danger:  'bg-danger text-white shadow-card active:opacity-90',
}

export default function BigButton({
  icon, label, onClick, variant = 'primary', disabled, lang, speakOnTap = true, size = 'md',
}: {
  /** An emoji when the symbol IS the thing (a camera, a bin), an <Icon/> when
   *  it stands for an idea. See components/Icon.tsx. */
  icon: ReactNode
  label: string
  onClick?: () => void
  variant?: Variant
  disabled?: boolean
  lang?: string
  speakOnTap?: boolean
  /** 'lg' for the one action a screen exists for — the home screen's "add a
   *  product". Everywhere else the step's own button is the only thing in the
   *  footer anyway, so it does not need the extra weight. */
  size?: 'md' | 'lg'
}) {
  const current = useLang()
  return (
    <button
      disabled={disabled}
      onClick={() => { if (speakOnTap) speak(label, lang ?? asrCode(current)); onClick?.() }}
      className={
        'press flex w-full items-center justify-center rounded-2xl px-5 font-display font-semibold ' +
        'disabled:opacity-40 disabled:shadow-none ' +
        (size === 'lg' ? 'min-h-[5.375rem] gap-4 text-2xl ' : 'min-h-[4rem] gap-3 text-xl ') +
        STYLES[variant]
      }
    >
      <span aria-hidden className={size === 'lg' ? 'text-4xl' : 'text-2xl'}>{icon}</span>
      <span>{label}</span>
    </button>
  )
}
