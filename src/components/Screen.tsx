/**
 * The phone frame. Every screen uses this.
 *
 * Rule from the brief: this must look like an app, not a website. So we
 * lock the width to a phone, pin the action to the bottom where a thumb
 * reaches, and never let the page scroll sideways.
 */
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { stopSpeaking } from '../lib/speak'
import { useSay } from '../lib/arrival'
import Speakable from './Speakable'
import Thread from './Thread'
import { Scallop } from './Ornament'
import LangButton from './LangButton'

export default function Screen({
  title, say, step, onBack, action, brand, children,
}: {
  title?: string
  /**
   * The one sentence this screen is about — spoken when she arrives, and
   * printed at the top of it with a speaker on it so she can hear it again.
   *
   * It lives here rather than in each screen because it kept being left out.
   * Half the app announced itself and half of it opened in silence, and the
   * silent half included the two screens a buyer's message and a buyer's
   * order land on. A screen whose text only exists in the voice is a screen
   * she cannot re-read; a screen whose text only exists on the page is one
   * she cannot read at all. It has to be both, and the way to make it both
   * everywhere is to make it one prop of the frame every screen already uses.
   *
   * `useSay` stays quiet while the guide is running — the ring is already
   * saying something about this screen — and says it again if she changes
   * language. See lib/arrival.ts.
   */
  say?: string
  step?: number                 // 1..6, shows the progress dots
  onBack?: () => void | false   // omit for no back button
  action?: ReactNode            // the one big button at the bottom
  /** Show the logo beside the title. Home only — every other screen is
   *  titled by the step she is on, and a logo there is just noise. */
  brand?: boolean
  children: ReactNode
}) {
  const nav = useNavigate()

  /*
   * Stop talking on the way out.
   *
   * `speak` cancels whatever came before it, so a screen that says something
   * on arrival already replaces the last one. This is for the screens that
   * say nothing: without it, the sentence from the page she just left runs on
   * underneath the page she is now looking at — the app talking about
   * somewhere she has already gone.
   *
   * Safe against the incoming screen, because React runs an unmount cleanup
   * before the next screen's effects.
   */
  useEffect(() => () => stopSpeaking(), [])

  useSay(say)

  return (
    <div className="mx-auto flex h-full max-w-[480px] flex-col bg-paper">
      {(title || onBack || step) && (
        <header className="jaali relative flex items-center gap-3 bg-night px-4 pb-4
                           pt-[max(0.75rem,env(safe-area-inset-top))] text-surface">
          {onBack && (
            <button
              onClick={() => { if (onBack() !== false) nav(-1) }}
              aria-label="Go back"
              className="press -ml-2 flex h-11 w-11 min-h-0 items-center justify-center rounded-full text-2xl text-surface/80 active:bg-white/10"
            >←</button>
          )}
          {brand && (
            <img
              src="./icons/mark-96.png" alt="" aria-hidden
              width={36} height={36}
              className="-my-1 shrink-0 rounded-lg ring-1 ring-gold-leaf/50"
            />
          )}
          {title && <h1 className="text-lg font-semibold tracking-tight text-surface">{title}</h1>}
          {/* Always reachable, on every screen, without scrolling. */}
          <div className="ml-auto"><LangButton /></div>
          {/* The canopy. A jharokha ends in half-domes, and this is the one
              stroke that makes the app read as Indian before a word of it has
              been read. */}
          <Scallop className="absolute inset-x-0 -bottom-2 text-night" />
        </header>
      )}

      {step && <StepDots step={step} />}

      <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-5">
        {say && <Speakable text={say} className="mb-4 text-base leading-relaxed text-ink-2" />}
        {children}
      </main>

      {/* data-guide: every screen's primary action lives in this one footer,
          so the guide can ring "the button you press next" without knowing
          which screen it is on. See lib/guide.ts. */}
      {action && (
        <footer data-guide="action"
          className="relative bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          {/* The header's canopy, upside down. The action bar is the other
              fixed edge of every screen, and a plain grey rule between the two
              was the one place the room stopped being a room. */}
          <Scallop className="absolute inset-x-0 -top-2 -scale-y-100 text-surface" />
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
    <div className="bg-paper pb-3 pt-4">
      <Thread
        ariaLabel={`Step ${step} of 6`}
        beads={[1, 2, 3, 4, 5, 6].map(n => ({ done: n < step, current: n === step }))}
      />
    </div>
  )
}
