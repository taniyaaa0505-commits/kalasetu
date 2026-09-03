/**
 * A kolam that draws itself when she publishes.
 *
 * Not confetti. A kolam is what you draw at the threshold of a house on a good
 * morning, so it is the right gesture for "your work is now out in the world".
 *
 * One petal is defined once and repeated with rotation, so the whole figure is
 * a few hundred bytes of SVG and no library. Honours prefers-reduced-motion:
 * the drawing simply appears already complete.
 */

const PETALS = 8
const DUR = 2.2   // seconds for the full figure

export default function Kolam({ size = 190 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 200 200" width={size} height={size}
      role="img" aria-label="A kolam, drawn to mark the moment"
      className="kolam block"
    >
      <style>{`
        .kolam .stroke {
          stroke-dasharray: var(--len);
          stroke-dashoffset: var(--len);
          animation: kolam-draw ${DUR}s ease-out forwards;
        }
        .kolam .dot { opacity: 0; animation: kolam-dot .5s ease-out forwards; }
        @keyframes kolam-draw { to { stroke-dashoffset: 0; } }
        @keyframes kolam-dot  { to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .kolam .stroke { animation: none; stroke-dashoffset: 0; }
          .kolam .dot { animation: none; opacity: 1; }
        }
      `}</style>

      <defs>
        {/* one loop of the figure; everything else is this, rotated */}
        <path id="kolam-petal"
          d="M100 100 C 100 66, 122 44, 148 44 C 168 44, 178 62, 166 78 C 154 94, 126 100, 100 100 Z" />
        <path id="kolam-arc" d="M100 22 A 78 78 0 0 1 155 45" />
      </defs>

      <g fill="none" stroke="var(--color-indigo)" strokeWidth="2.4"
         strokeLinecap="round" strokeLinejoin="round">
        {Array.from({ length: PETALS }).map((_, i) => (
          <use
            key={`p${i}`} href="#kolam-petal" className="stroke"
            transform={`rotate(${(360 / PETALS) * i} 100 100)`}
            style={{ ['--len' as string]: 300, animationDelay: `${i * (DUR / PETALS) * 0.55}s` }}
          />
        ))}

        {/* an outer ring, drawn last, that closes the figure */}
        {Array.from({ length: PETALS }).map((_, i) => (
          <use
            key={`a${i}`} href="#kolam-arc" className="stroke"
            transform={`rotate(${(360 / PETALS) * i} 100 100)`}
            style={{
              ['--len' as string]: 90,
              animationDelay: `${DUR * 0.5 + i * 0.06}s`,
              stroke: 'var(--color-gold)', strokeWidth: 2,
            }}
          />
        ))}
      </g>

      {/* the pulli — the dots a kolam is built around */}
      <g fill="var(--color-gold)">
        {Array.from({ length: PETALS }).map((_, i) => {
          const a = ((360 / PETALS) * i * Math.PI) / 180
          return (
            <circle
              key={`d${i}`} className="dot"
              cx={100 + Math.cos(a) * 52} cy={100 + Math.sin(a) * 52} r="3"
              style={{ animationDelay: `${DUR * 0.85 + i * 0.04}s` }}
            />
          )
        })}
        <circle className="dot" cx="100" cy="100" r="4.5"
          style={{ animationDelay: `${DUR * 1.05}s` }} />
      </g>
    </svg>
  )
}
