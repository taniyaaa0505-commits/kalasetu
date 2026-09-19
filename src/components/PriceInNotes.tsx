/**
 * A price drawn as the actual notes and coins she would receive.
 *
 * She can count money even if she cannot read numerals, so this turns an
 * abstract figure into something familiar. Tapping it says the breakdown
 * out loud.
 */
import { toStacks, describeStacks, type Stack } from '../lib/money'
import RupeeNote from './RupeeNote'
import { useLang } from '../lib/i18n'
import { asrCode } from '../types'
import { speak } from '../lib/speak'

export default function PriceInNotes({ amount, size = 'md' }: { amount: number; size?: 'sm' | 'md' }) {
  const lang = useLang()
  const stacks = toStacks(amount)
  const spoken = describeStacks(stacks, asrCode(lang))

  return (
    <button
      onClick={() => speak(spoken, asrCode(lang))}
      aria-label={spoken}
      className="flex w-full flex-wrap items-center gap-x-2 gap-y-2 text-left active:opacity-70"
    >
      {stacks.map(s => <StackChip key={s.value} stack={s} size={size} />)}
    </button>
  )
}

/**
 * A photograph if the repository has one, and the drawn note otherwise.
 *
 * Put `500.jpg`, `200.jpg`, `100.jpg`, `50.jpg`, `20.jpg`, `10.jpg` in
 * `src/assets/notes/` and they are used automatically: Vite finds them at
 * build time, hashes them, and the service worker precaches them with
 * everything else. Nothing to configure, and — because this is resolved
 * during the build rather than by asking the network — no 404 per note on
 * every screen for the ones that are not there.
 *
 * Nothing is in that folder today, deliberately. At 44 to 56 pixels wide a
 * photograph of a banknote is a smudge, and the ones that are easy to find
 * online carry stock-library watermarks — "alamy" across the rupees, on a
 * projector, in front of judges. See components/RupeeNote.tsx.
 */
const PHOTOS = import.meta.glob('../assets/notes/*.{jpg,jpeg,png,webp}', {
  eager: true, query: '?url', import: 'default',
}) as Record<string, string>

function photoFor(value: number): string | undefined {
  const hit = Object.entries(PHOTOS).find(([path]) => path.match(/(\d+)\.\w+$/)?.[1] === String(value))
  return hit?.[1]
}

function Note({ value }: { value: number }) {
  const photo = photoFor(value)
  return photo
    ? <img src={photo} alt="" aria-hidden className="h-full w-full object-cover" />
    : <RupeeNote value={value} className="h-full w-full" />
}

function StackChip({ stack, size }: { stack: Stack; size: 'sm' | 'md' }) {
  const many = stack.count > 3
  const shown = many ? 1 : stack.count
  // Two to one, like the real thing (a ₹500 note is 150mm by 66mm). The chip
  // used to be 56 by 36, which is the shape of a credit card and reads as a
  // coloured tag; a note is long and thin and that shape is half of how it is
  // recognised before anything on it is read.
  const noteW = size === 'sm' ? 'w-12 h-6 text-[10px]' : 'w-16 h-8 text-xs'
  const coinW = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs'

  return (
    <span className="flex items-center gap-1">
      {/* A little fan of notes, so a stack reads as a stack. */}
      <span className="flex">
        {Array.from({ length: shown }).map((_, i) => (
          <span
            key={i}
            style={{
              ...(stack.kind === 'coin' ? { background: stack.bg, color: stack.fg } : null),
              marginLeft: i === 0 ? 0 : size === 'sm' ? -26 : -34,
              zIndex: i,
            }}
            className={
              (stack.kind === 'coin' ? coinW + ' rounded-full' : noteW + ' rounded-[3px] overflow-hidden') +
              ' relative flex items-center justify-center font-bold tabular-nums ' +
              'border border-black/15 shadow-sm'
            }
          >
            {stack.kind === 'coin' ? stack.value : <Note value={stack.value} />}
          </span>
        ))}
      </span>
      {many && (
        <span className="text-sm font-semibold text-ink-2 tabular-nums">×{stack.count}</span>
      )}
    </span>
  )
}
