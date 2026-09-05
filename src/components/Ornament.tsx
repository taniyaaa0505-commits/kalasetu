/**
 * The three ornaments the whole app is built from.
 *
 * Rajasthani decoration is architectural — it is the shape of the window and
 * the trim on the hem, not a pattern printed on top. So these are structural
 * pieces used in a handful of fixed places, and nowhere else. Scatter them and
 * they stop meaning anything.
 *
 * All CSS and inline SVG: no image, no request, works offline, and every
 * colour comes from the tokens so the whole system moves together.
 */

/**
 * The scalloped hem under dark chrome.
 *
 * A jharokha canopy ends in a row of half-domes. This is the header's bottom
 * edge — the single thing that makes the app read as Indian in the first
 * second, before a word has been read.
 */
export function Scallop({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 8" preserveAspectRatio="none" aria-hidden focusable="false"
      className={'block h-2.5 w-full ' + className}
    >
      {/* Ten half-domes across, drawn as one path so the fill is continuous. */}
      <path d="M0 0h40v1.5c-2 0-2 6.5-4 6.5s-2-6.5-4-6.5-2 6.5-4 6.5-2-6.5-4-6.5-2 6.5-4 6.5-2-6.5-4-6.5-2 6.5-4 6.5-2-6.5-4-6.5-2 6.5-4 6.5-2-6.5-4-6.5z"
        fill="currentColor" />
    </svg>
  )
}

/**
 * Gota trim — the gold border stitched onto a hem.
 *
 * Two hairlines with a lozenge between them. Used to separate one thing from
 * another where a plain grey rule would be too plain and a heading too loud.
 */
export function Gota({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={'flex items-center gap-2 ' + className}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold-leaf/60" />
      <svg viewBox="0 0 24 12" className="h-3 w-6 text-gold-leaf" fill="currentColor">
        <path d="M12 0l3.2 6L12 12 8.8 6z" />
        <circle cx="2.5" cy="6" r="1.6" />
        <circle cx="21.5" cy="6" r="1.6" />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold-leaf/60" />
    </div>
  )
}

/**
 * A corner flourish, for the four corners of a hero panel.
 *
 * The carved bracket where an arch meets its pillar. Two strokes; anything
 * more and it competes with what it is framing.
 */
export function Corner({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden focusable="false"
      className={'h-6 w-6 text-gold-leaf ' + className}
      fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M1 27V9A8 8 0 0 1 9 1h18" />
      <path d="M7 27V12a5 5 0 0 1 5-5h15" opacity=".5" />
    </svg>
  )
}
