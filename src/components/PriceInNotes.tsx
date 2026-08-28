/**
 * A price drawn as the actual notes and coins she would receive.
 *
 * She can count money even if she cannot read numerals, so this turns an
 * abstract figure into something familiar. Tapping it says the breakdown
 * out loud.
 */
import { toStacks, describeStacks, type Stack } from '../lib/money'
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

function StackChip({ stack, size }: { stack: Stack; size: 'sm' | 'md' }) {
  const many = stack.count > 3
  const shown = many ? 1 : stack.count
  const noteW = size === 'sm' ? 'w-11 h-7 text-[10px]' : 'w-14 h-9 text-xs'
  const coinW = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs'

  return (
    <span className="flex items-center gap-1">
      {/* A little fan of notes, so a stack reads as a stack. */}
      <span className="flex">
        {Array.from({ length: shown }).map((_, i) => (
          <span
            key={i}
            style={{
              background: stack.bg, color: stack.fg,
              marginLeft: i === 0 ? 0 : size === 'sm' ? -22 : -28,
              zIndex: i,
            }}
            className={
              (stack.kind === 'coin' ? coinW + ' rounded-full' : noteW + ' rounded-[3px]') +
              ' relative flex items-center justify-center font-bold tabular-nums ' +
              'border border-black/15 shadow-sm'
            }
          >
            {stack.value}
          </span>
        ))}
      </span>
      {many && (
        <span className="text-sm font-semibold text-ink-2 tabular-nums">×{stack.count}</span>
      )}
    </span>
  )
}
