/**
 * Beads on a thread — our one progress motif, used in two places.
 *
 * Craft is thread, and "setu" is a bridge, so progress in this app is drawn as
 * beads strung along a line rather than as bars or numbers. She cannot read a
 * step count; a filled bead in a row of empty ones needs no reading at all.
 *
 * Used by the six-step selling flow (Screen.tsx) and by order status
 * (Orders.tsx). One idea, two jobs.
 */

export interface Bead {
  /** Optional short caption under the bead. Omitted in the compact flow. */
  label?: string
  done: boolean
  current: boolean
}

export default function Thread({
  beads, ariaLabel, size = 'sm', broken = false,
}: {
  beads: Bead[]
  ariaLabel: string
  size?: 'sm' | 'lg'
  /** A declined order: the thread stops rather than continuing. */
  broken?: boolean
}) {
  const r = size === 'lg' ? 9 : 5.5
  // A long run needs a tighter gap, or the whole SVG scales down to fit its
  // box and the beads shrink with it — which is what "congested" looks like.
  // The tour has ten of these; the selling flow has six.
  const gap = size === 'lg' ? 78 : beads.length > 7 ? 30 : 42
  const padX = r + 6
  const w = padX * 2 + gap * (beads.length - 1)
  const cy = r + 3
  const h = size === 'lg' ? cy + 26 : cy + r + 3

  const cx = (i: number) => padX + i * gap
  const lastDone = beads.reduce((acc, b, i) => (b.done || b.current ? i : acc), 0)

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={ariaLabel}
      className="mx-auto block h-auto"
      style={{ width: `${w}px`, maxWidth: '100%' }}
    >
      {/* the thread: a dim full run, with the travelled part drawn over it */}
      <line x1={cx(0)} y1={cy} x2={cx(beads.length - 1)} y2={cy}
        stroke="var(--color-line)" strokeWidth="2" strokeLinecap="round" />
      {lastDone > 0 && (
        <line x1={cx(0)} y1={cy} x2={cx(lastDone)} y2={cy}
          stroke={broken ? 'var(--color-line-2)' : 'var(--color-indigo)'}
          strokeWidth="2" strokeLinecap="round"
          strokeDasharray={broken ? '4 4' : undefined} />
      )}

      {beads.map((b, i) => {
        const filled = b.done || b.current
        return (
          <g key={i}>
            {/* a soft halo marks where she is now */}
            {b.current && !broken && (
              <circle cx={cx(i)} cy={cy} r={r + 4.5} fill="var(--color-wash)"
                stroke="var(--color-indigo)" strokeWidth="1.5" />
            )}
            <circle
              cx={cx(i)} cy={cy} r={b.current ? r : r - 1}
              fill={filled ? (broken ? 'var(--color-ink-3)' : 'var(--color-indigo)') : 'var(--color-surface)'}
              stroke={filled ? (broken ? 'var(--color-ink-3)' : 'var(--color-indigo)') : 'var(--color-line-2)'}
              strokeWidth="2"
            />
            {b.label && (
              <text
                x={cx(i)} y={cy + r + 16} textAnchor="middle" fontSize="9.5"
                fill={filled ? 'var(--color-ink)' : 'var(--color-ink-3)'}
                fontWeight={b.current ? 700 : 500}
                fontFamily="system-ui, sans-serif"
              >{b.label}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
