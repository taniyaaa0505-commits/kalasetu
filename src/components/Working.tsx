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
        : <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-2">
            {/* Only when there is no photograph of hers to keep on screen —
                which is exactly the wait while her listing is being written.
                Her own work always outranks our decoration. */}
            <Dye />
          </div>}

      {/* A single pass of light across the panel: enough to say "running",
          not enough to watch. */}
      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="sheen absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/55 to-transparent" />
      </span>

      {/* The veil over her photograph has to be heavy enough to read against.
          Over the dye it must not be, or the colour it exists to show is
          washed out to nothing — so the text gets its own small plate
          instead of covering the whole panel. */}
      <div className={'absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center ' +
        (behind ? 'bg-paper/80' : 'bg-paper/10')}>
        <span className={'breathe text-indigo ' + (behind ? '' : 'drop-shadow-sm')} aria-hidden>
          <Icon name="ai" className="text-4xl" />
        </span>

        <span className={behind ? '' : 'rounded-full bg-paper/85 px-4 py-1.5 shadow-rest backdrop-blur-sm'}>
          <Speakable text={title} className="text-lg font-semibold leading-snug text-indigo" />
        </span>

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

/**
 * Dye spreading in water, in the four colours of the mark.
 *
 * Deliberately slow — nine to fourteen seconds a cycle — so it reads as
 * something steeping rather than something loading. Anything faster becomes a
 * progress animation, and this is not progress: we do not know how long Gemini
 * will take, and pretending we do is a lie told in motion.
 */
function Dye() {
  const blobs = [
    { c: '#D98A5F', s: '58%', top: '-12%', left: '-8%',  a: 'dye-a 12s',   d: '0s'   },  // terracotta
    { c: '#E8B44C', s: '52%', top: '18%',  left: '46%',  a: 'dye-b 14s',   d: '-3s'  },  // saffron
    { c: '#8FA97A', s: '46%', top: '44%',  left: '4%',   a: 'dye-c 11s',   d: '-6s'  },  // sage
    { c: '#6E82B8', s: '50%', top: '-6%',  left: '30%',  a: 'dye-d 13s',   d: '-9s'  },  // indigo
  ]
  return (
    <span aria-hidden className="dye pointer-events-none absolute inset-0 block">
      {blobs.map(b => (
        <span key={b.c} style={{
          background: b.c, width: b.s, aspectRatio: '1', top: b.top, left: b.left,
          animation: `${b.a} ease-in-out infinite`, animationDelay: b.d,
        }} />
      ))}
    </span>
  )
}
