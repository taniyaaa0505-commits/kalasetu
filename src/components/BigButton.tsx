/**
 * The only button style in the app.
 *
 * Rules it enforces so nobody has to remember them:
 *  - at least 64px tall (the brief says 56 minimum; the primary action gets more)
 *  - an icon AND a word, never a word alone
 *  - says its own label out loud when tapped, so a non-reader knows what it does
 */
import { speak } from '../lib/speak'

type Variant = 'primary' | 'quiet' | 'good'

const STYLES: Record<Variant, string> = {
  primary: 'bg-indigo text-white active:bg-indigo-2',
  quiet:   'bg-surface text-ink border-2 border-line active:bg-wash',
  good:    'bg-good text-white active:opacity-90',
}

export default function BigButton({
  icon, label, onClick, variant = 'primary', disabled, lang = 'hi-IN', speakOnTap = true,
}: {
  icon: string
  label: string
  onClick?: () => void
  variant?: Variant
  disabled?: boolean
  lang?: string
  speakOnTap?: boolean
}) {
  return (
    <button
      disabled={disabled}
      onClick={() => { if (speakOnTap) speak(label, lang); onClick?.() }}
      className={
        'flex w-full items-center justify-center gap-3 rounded-2xl px-5 text-xl font-semibold ' +
        'min-h-[64px] transition-colors disabled:opacity-40 ' + STYLES[variant]
      }
    >
      <span aria-hidden className="text-2xl">{icon}</span>
      <span>{label}</span>
    </button>
  )
}
