/**
 * Her shop, drawn: three lit niches in a jharokha wall, with a pot, a lamp
 * and a stack of cloth in them.
 *
 * What was here before was a stock illustration of a woman knitting, lifted
 * out of a mockup screenshot at 280x206 and doubled. It was soft on a phone,
 * it was 34 KB precached onto a metered device, and — the real problem — it
 * showed HER. An empty shop screen that shows the artisan is a picture of the
 * person looking at it; a picture of the shop is a picture of the thing that
 * is missing. The second one is an invitation, and it is also the only one
 * that keeps working when she has filled it.
 *
 * Drawn in the same cusped arch as the empty states, in tokens, so it moves
 * with the palette. No request, nothing to precache, sharp at any size, and
 * about 2 KB of markup instead of 34 KB of JPEG.
 */

/* One niche, in its own 84x120 box. Six lobes, the same construction as
   Empty.tsx — see the note there about why these are arcs and not curves. */
const ARCH =
  'M2 120V44A11 11 0 0 0 10 26A11 11 0 0 0 26 12A11 11 0 0 0 42 6' +
  'A11 11 0 0 0 58 12A11 11 0 0 0 74 26A11 11 0 0 0 82 44V120'

/** A matka. The first thing anyone pictures when they hear "handmade": a
    short neck over a wide belly, not a sphere with a lid on it. */
const POT = (
  <>
    <path d="M32 66l4 6C22 78 14 86 14 96c0 11 12 20 28 20s28-9 28-20c0-10-8-18-22-24l4-6z" />
    <path d="M17 103q25 7 50 0" />
  </>
)

/** A diya, lit. The one thing in the composition that moves — and it is
    filled, not stroked: an outlined flame is a raindrop. */
const LAMP = (
  <>
    <path className="flame" fill="var(--color-clay)" stroke="none"
      d="M42 56c8 9 12 16 12 22a12 12 0 0 1-24 0c0-6 4-13 12-22z" />
    <path className="flame" fill="var(--color-gold-leaf)" stroke="none"
      d="M42 74c3 4 5 7 5 9a5 5 0 0 1-10 0c0-2 2-5 5-9z" />
    <path d="M17 94h50c0 11-11 18-25 18s-25-7-25-18z" />
    <path d="M11 94h62" />
  </>
)

/** Two folded cloths, offset and creased. Stacked square and centred they
    came out as a tiered cake. */
const CLOTH = (
  <>
    <rect x="15" y="96" width="52" height="17" rx="3.5" />
    <path d="M23 96v17" />
    <rect x="21" y="79" width="46" height="17" rx="3.5" />
    <path d="M29 79v17" />
    <path d="M38 87h.01M47 87h.01M56 87h.01" />
  </>
)

const NICHES = [
  { x: 16,  y: 58.4, s: 0.78, art: POT },
  { x: 106, y: 26,   s: 1.05, art: LAMP },
  { x: 218, y: 58.4, s: 0.78, art: CLOTH },
]

export default function Shopfront({ width = 300 }: { width?: number }) {
  return (
    <svg
      viewBox="0 0 300 176" width={width} height={Math.round(width * (176 / 300))}
      role="img" aria-label="An empty shop: three lit niches waiting for her work"
      className="block h-auto max-w-full"
    >
      {/* The warmth behind the middle arch, so the wall reads as lit from
          within rather than as three holes cut in a page. */}
      <defs>
        <radialGradient id="sf-glow" cx="50%" cy="62%" r="62%">
          <stop offset="0%"   stopColor="var(--color-gold-leaf)" stopOpacity=".26" />
          <stop offset="100%" stopColor="var(--color-gold-leaf)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="300" height="176" fill="url(#sf-glow)" />

      {NICHES.map(({ x, y, s, art }, i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <path d={ARCH + 'z'} fill="var(--color-gold-wash)" />
          <path d={ARCH} fill="none" stroke="var(--color-gold-leaf)" strokeWidth={2.4 / s}
            strokeLinecap="round" strokeLinejoin="round" />
          <g fill="none" stroke="var(--color-clay)" strokeWidth={2.4 / s}
            strokeLinecap="round" strokeLinejoin="round">
            {art}
          </g>
        </g>
      ))}

      {/* The sill they all stand on, and the gold trim under it. */}
      <g stroke="var(--color-gold-leaf)" strokeLinecap="round" fill="none">
        <path d="M8 152h284" strokeWidth="2.8" />
        <path d="M20 160h260" strokeWidth="1.4" opacity=".55" />
      </g>
      <g fill="var(--color-gold-leaf)" opacity=".8">
        {[60, 110, 150, 190, 240].map(x => (
          <path key={x} d={`M${x} 165l3.6 5.5L${x} 176l-3.6-5.5z`} />
        ))}
      </g>
    </svg>
  )
}
