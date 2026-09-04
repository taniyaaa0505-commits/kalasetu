/**
 * What she sees while the app is doing something for her.
 *
 * One component for every wait in the app, so "the app is thinking" always
 * looks the same and she learns it once. Three rules came out of watching this
 * screen behave badly:
 *
 *  1. Say what is happening, in words, in her language. A spinner is a shape;
 *     "आपकी फोटो साफ़ हो रही है" is a promise. Every caller passes a real
 *     sentence, never "Loading".
 *  2. If we know how far along we are, show it. The first cut-out downloads
 *     44 MB and used to sit on one frozen line for half a minute, which reads
 *     as broken rather than busy.
 *  3. Keep her own work on screen behind it. She just took that photo; hiding
 *     it to show a spinner is the app talking about itself.
 */
import Icon from './Icon'
import Speakable from './Speakable'

export default function Working({
  title, note, percent, behind,
}: {
  /** A whole sentence, in her language. */
  title: string
  /** Optional reassurance under the bar — why this wait is worth it. */
  note?: string
  /** 0-100 when known. Omitted for work of unknown length. */
  percent?: number
  /** Her photo, kept visible and dimmed underneath. */
  behind?: string
}) {
  return (
    <div className="fade relative overflow-hidden rounded-panel border border-line bg-surface shadow-card">
      {behind
        ? <img src={behind} alt="" className="block w-full opacity-25" />
        : <div className="aspect-[4/3] w-full bg-surface-2" />}

      {/* A single pass of light across the panel: enough to say "running",
          not enough to watch. */}
      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="sheen absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/55 to-transparent" />
      </span>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-paper/80 px-6 text-center">
        <span className="breathe text-indigo" aria-hidden>
          <Icon name="ai" className="text-4xl" />
        </span>

        <Speakable text={title} className="text-lg font-semibold leading-snug text-indigo" />

        {percent !== undefined && (
          <div className="w-full max-w-[16.25rem]">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-indigo transition-all duration-300"
                style={{ width: `${Math.max(2, percent)}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-semibold tabular-nums text-ink-2">{percent}%</p>
          </div>
        )}

        {note && <p className="max-w-[17.5rem] text-xs leading-snug text-ink-3">{note}</p>}
      </div>
    </div>
  )
}
