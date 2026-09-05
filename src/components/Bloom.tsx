/**
 * The moment her work goes out into the world.
 *
 * This was a kolam — a good motif, but not OURS. The app has a mark now: a
 * letterform wrapped in a ring of the things she makes, in terracotta,
 * mustard, sage and navy. So the celebration is that ring, drawing itself
 * segment by segment and settling around the mark.
 *
 * Four segments because there are four in the logo, in the logo's own order
 * and colours. Nothing here is decorative invention — if the mark changes,
 * change this to match, and if you cannot tell which came first, it is right.
 *
 * Honours prefers-reduced-motion: the ring simply appears already closed.
 */

const SEGMENTS = [
  { colour: '#B04A24', from: -96,  to: -6   },   // terracotta — the pot
  { colour: '#C08A2A', from: -6,   to: 84   },   // mustard — the textile
  { colour: '#5E7247', from: 84,   to: 174  },   // sage — the leaf
  { colour: '#1B2740', from: 174,  to: 264  },   // navy — the letterform
]

const R = 74
const DUR = 1.5

/** A ring segment as an arc path, drawn clockwise from `from` to `to`. */
function arc(from: number, to: number) {
  const rad = (d: number) => (d * Math.PI) / 180
  const x1 = 100 + R * Math.cos(rad(from)), y1 = 100 + R * Math.sin(rad(from))
  const x2 = 100 + R * Math.cos(rad(to)),   y2 = 100 + R * Math.sin(rad(to))
  const large = to - from > 180 ? 1 : 0
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

export default function Bloom({ size = 190 }: { size?: number }) {
  const len = (2 * Math.PI * R) / 4          // each segment is a quarter turn

  return (
    <svg
      viewBox="0 0 200 200" width={size} height={size}
      role="img" aria-label="Your work is out in the world"
      className="bloom block"
    >
      <style>{`
        .bloom .seg {
          stroke-dasharray: ${len.toFixed(1)};
          stroke-dashoffset: ${len.toFixed(1)};
          animation: bloom-draw ${DUR}s cubic-bezier(.3,.7,.3,1) forwards;
        }
        .bloom .mark { opacity: 0; transform-origin: 100px 100px;
          animation: bloom-mark .5s cubic-bezier(.2,1.4,.4,1) forwards; }
        @keyframes bloom-draw { to { stroke-dashoffset: 0 } }
        @keyframes bloom-mark { from { opacity: 0; transform: scale(.7) } to { opacity: 1; transform: none } }
        @media (prefers-reduced-motion: reduce) {
          .bloom .seg { animation: none; stroke-dashoffset: 0 }
          .bloom .mark { animation: none; opacity: 1; transform: none }
        }
      `}</style>

      <g fill="none" strokeWidth="9" strokeLinecap="round">
        {SEGMENTS.map((s, i) => (
          <path
            key={s.colour} className="seg" d={arc(s.from, s.to)} stroke={s.colour}
            style={{ animationDelay: `${i * (DUR / 6)}s` }}
          />
        ))}
      </g>

      {/* The letterform at the centre, arriving once the ring has closed. */}
      <g className="mark" style={{ animationDelay: `${DUR * 0.72}s` }}>
        <circle cx="100" cy="100" r="52" fill="var(--color-surface)" />
        <text
          x="100" y="101" textAnchor="middle" dominantBaseline="central"
          fill="#1B2740" fontSize="66" fontWeight="700"
          fontFamily="Georgia, 'Times New Roman', serif"
        >P</text>
      </g>
    </svg>
  )
}
