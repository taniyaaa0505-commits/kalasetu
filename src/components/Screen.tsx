/**
 * The phone frame. Every screen uses this.
 *
 * Rule from the brief: this must look like an app, not a website. So we
 * lock the width to a phone, pin the action to the bottom where a thumb
 * reaches, and never let the page scroll sideways.
 */
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Screen({
  title, step, onBack, action, children,
}: {
  title?: string
  step?: number                 // 1..6, shows the progress dots
  onBack?: () => void | false   // omit for no back button
  action?: ReactNode            // the one big button at the bottom
  children: ReactNode
}) {
  const nav = useNavigate()

  return (
    <div className="mx-auto flex h-full max-w-[480px] flex-col bg-paper">
      {(title || onBack) && (
        <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
          {onBack && (
            <button
              onClick={() => { if (onBack() !== false) nav(-1) }}
              aria-label="Go back"
              className="-ml-2 flex h-11 w-11 min-h-0 items-center justify-center rounded-full text-2xl text-ink-2 active:bg-wash"
            >←</button>
          )}
          {title && <h1 className="text-lg font-semibold tracking-tight">{title}</h1>}
        </header>
      )}

      {step && <StepDots step={step} />}

      <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-5">{children}</main>

      {action && (
        <footer className="border-t border-line bg-surface px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          {action}
        </footer>
      )}
    </div>
  )
}

/** Six dots, one per step of the golden path. Position, not text — she cannot read. */
function StepDots({ step }: { step: number }) {
  return (
    <div className="flex justify-center gap-2 bg-surface pb-3" aria-label={`Step ${step} of 6`}>
      {[1, 2, 3, 4, 5, 6].map(n => (
        <span
          key={n}
          className={
            'h-2 rounded-full transition-all ' +
            (n === step ? 'w-7 bg-indigo' : n < step ? 'w-2 bg-indigo-2' : 'w-2 bg-line')
          }
        />
      ))}
    </div>
  )
}
