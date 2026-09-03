/**
 * The three prices, plotted on one line instead of stacked as three numbers.
 *
 * Three separate figures make her hold three facts in her head and work out
 * how they relate. One line shows the relationship directly: here is the floor
 * you must not go below, here is what the market pays, here is where we put you.
 *
 * The floor is drawn as a hard edge with everything below it hatched out —
 * that region is not a suggestion, it is a refusal.
 */
import type { PriceSuggestion } from '../types'

export default function PriceScale({ price, labels }: {
  price: PriceSuggestion
  labels: { floor: string; market: string; suggested: string }
}) {
  const { floor, marketLow, marketHigh, suggested } = price

  // Give the scale a little air on each side so nothing sits on the edge.
  const lo = Math.min(floor, marketLow, suggested)
  const hi = Math.max(floor, marketHigh, suggested)
  const span = Math.max(1, hi - lo)
  const pad = span * 0.14
  const min = Math.max(0, lo - pad)
  const max = hi + pad
  const at = (v: number) => ((v - min) / (max - min)) * 100

  const W = 320, H = 96
  const track = { y: 46, h: 12 }
  const x = (v: number) => (at(v) / 100) * W

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`${labels.floor} ₹${floor}. ${labels.market} ₹${marketLow} to ₹${marketHigh}. ${labels.suggested} ₹${suggested}.`}
      className="block w-full">
      <defs>
        <pattern id="ps-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-gold)" strokeWidth="2" opacity=".38" />
        </pattern>
      </defs>

      {/* the whole range, dim */}
      <rect x="0" y={track.y} width={W} height={track.h} rx={track.h / 2} fill="var(--color-line)" />

      {/* below the floor: hatched, because this is forbidden, not merely low */}
      <rect x="0" y={track.y} width={Math.max(0, x(floor))} height={track.h} rx={track.h / 2}
        fill="url(#ps-hatch)" />

      {/* what the market actually pays */}
      <rect x={x(marketLow)} y={track.y} width={Math.max(2, x(marketHigh) - x(marketLow))}
        height={track.h} rx={track.h / 2} fill="var(--color-wash)" stroke="var(--color-indigo-2)" strokeWidth="1.5" />

      {/* the floor line — a wall, not a marker */}
      <line x1={x(floor)} y1={track.y - 9} x2={x(floor)} y2={track.y + track.h + 9}
        stroke="var(--color-gold)" strokeWidth="2.5" strokeLinecap="round" />
      <text x={Math.min(x(floor), W - 4)} y={track.y + track.h + 26} fontSize="10.5" textAnchor={x(floor) > W * 0.7 ? 'end' : 'start'}
        fill="var(--color-gold)" fontWeight="700" fontFamily="system-ui, sans-serif">
        ₹{floor}
      </text>
      <text x={Math.min(x(floor), W - 4)} y={track.y + track.h + 38} fontSize="9" textAnchor={x(floor) > W * 0.7 ? 'end' : 'start'}
        fill="var(--color-ink-3)" fontFamily="system-ui, sans-serif">
        {labels.floor}
      </text>

      {/* the market band's own label */}
      <text x={(x(marketLow) + x(marketHigh)) / 2} y={track.y - 12} fontSize="9" textAnchor="middle"
        fill="var(--color-ink-3)" fontFamily="system-ui, sans-serif">
        {labels.market}
      </text>

      {/* where we put her: a pin, the only filled shape on the line */}
      <g>
        <circle cx={x(suggested)} cy={track.y + track.h / 2} r="11" fill="var(--color-indigo)" />
        <circle cx={x(suggested)} cy={track.y + track.h / 2} r="4" fill="var(--color-surface)" />
        <text x={x(suggested)} y="20" fontSize="15" textAnchor="middle" fill="var(--color-indigo)"
          fontWeight="800" fontFamily="system-ui, sans-serif">
          ₹{suggested}
        </text>
        <line x1={x(suggested)} y1="26" x2={x(suggested)} y2={track.y - 2}
          stroke="var(--color-indigo)" strokeWidth="1.5" />
      </g>
    </svg>
  )
}
