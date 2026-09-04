/**
 * The phone frame. Every screen uses this.
 *
 * Rule from the brief: this must look like an app, not a website. So we
 * lock the width to a phone, pin the action to the bottom where a thumb
 * reaches, and never let the page scroll sideways.
 */
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import Thread from './Thread'
import LangButton from './LangButton'

export default function Screen({
  title, step, onBack, action, brand, children,
}: {
  title?: string
  step?: number                 // 1..6, shows the progress dots
  onBack?: () => void | false   // omit for no back button
  action?: ReactNode            // the one big button at the bottom
  /** Show the logo beside the title. Home only — every other screen is
   *  titled by the step she is on, and a logo there is just noise. */
  brand?: boolean
  children: ReactNode
}) {
  const nav = useNavigate()

  return (
    <div className="mx-auto flex h-full max-w-[480px] flex-col bg-paper">
      {(title || onBack || step) && (
        <header className="weave flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
          {onBack && (
            <button
              onClick={() => { if (onBack() !== false) nav(-1) }}
              aria-label="Go back"
              className="press -ml-2 flex h-11 w-11 min-h-0 items-center justify-center rounded-full text-2xl text-ink-2 active:bg-wash"
            >←</button>
          )}
          {brand && (
            <img
              src="./icons/mark-96.png" alt="" aria-hidden
              width={36} height={36}
              className="-my-1 shrink-0 rounded-lg border border-line"
            />
          )}
          {title && <h1 className="text-lg font-semibold tracking-tight">{title}</h1>}
          {/* Always reachable, on every screen, without scrolling. */}
          <div className="ml-auto"><LangButton /></div>
        </header>
      )}

      {step && <StepDots step={step} />}

      <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-5">{children}</main>

      {action && (
        <footer className="border-t border-line bg-surface/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur">
          {action}
        </footer>
      )}
    </div>
  )
}

/** Six beads on a thread, one per step of the golden path.
 *  Position, not text — she cannot read a step count. */
function StepDots({ step }: { step: number }) {
  return (
    <div className="bg-surface pb-3">
      <Thread
        ariaLabel={`Step ${step} of 6`}
        beads={[1, 2, 3, 4, 5, 6].map(n => ({ done: n < step, current: n === step }))}
      />
    </div>
  )
}
