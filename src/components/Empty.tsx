/**
 * What an empty screen looks like.
 *
 * Three screens in this app can legitimately have nothing on them — no orders
 * yet, no messages yet, no listings yet — and all three used to say so with a
 * grey glyph at 40% opacity above a line of grey text. That is the visual
 * language of a page that failed, and she has no way to tell the two apart.
 *
 * So an empty screen gets a drawing instead: her thing, sitting in a lit
 * jharokha niche, waiting. The niche is the same cusped arch used everywhere
 * else in the app, which is what stops these reading as three unrelated
 * spot illustrations.
 *
 * Tokens only, so they follow the palette, and no request, so they are there
 * in airplane mode.
 */

export type EmptyKind = 'orders' | 'chat' | 'shop'

/* The niche: a cusped arch on a plinth. Drawn once and shared, so the three
   scenes are unmistakably the same window with different things inside it. */
/* Six lobes, springing at y=66 and meeting at an apex. Drawn as arcs rather
   than as curves fitted by eye: a cusped arch is only convincing when every
   foil is the same radius, and the cusps between them land on a line. */
const NICHE =
  'M16 112V66' +
  'A13 13 0 0 0 25 45A13 13 0 0 0 41 27A13 13 0 0 0 60 18' +
  'A13 13 0 0 0 79 27A13 13 0 0 0 95 45A13 13 0 0 0 104 66' +
  'V112'

const SUBJECTS: Record<EmptyKind, React.ReactNode> = {
  /* A parcel, waiting to be asked for. */
  orders: (
    <g>
      <path d="M60 46 84 57v25L60 93 36 82V57z" />
      <path d="M36 57 60 68l24-11" />
      <path d="M60 68v25" />
    </g>
  ),
  /* Two bubbles, hers and his, with nothing said yet. */
  chat: (
    <g>
      <path d="M33 50h34a5 5 0 0 1 5 5v16a5 5 0 0 1-5 5H47l-9 8v-8h-5a5 5 0 0 1-5-5V55a5 5 0 0 1 5-5z" />
      <path d="M79 63h9a4 4 0 0 1 4 4v13a4 4 0 0 1-4 4h-2v7l-7-7h-6" opacity=".55" />
    </g>
  ),
  /* A diya. The lamp is lit before the guest arrives, not after. */
  shop: (
    <g>
      <path d="M60 52c6 6 9 11 9 16a9 9 0 0 1-18 0c0-5 3-10 9-16z" />
      <path d="M37 84h46c0 9-10 14-23 14s-23-5-23-14z" />
      <path d="M31 84h58" />
    </g>
  ),
}

export default function Empty({
  kind, message, className = '',
}: { kind: EmptyKind; message: string; className?: string }) {
  return (
    <div className={'flex flex-col items-center gap-4 py-14 text-center ' + className}>
      <svg viewBox="0 0 120 120" width="132" height="132" aria-hidden focusable="false" className="block">
        {/* The lit interior. Warm, so the niche reads as occupied rather than
            as a hole. */}
        <path d={NICHE + 'z'} fill="var(--color-gold-wash)" />
        <path d={NICHE} fill="none" stroke="var(--color-gold-leaf)" strokeWidth="2.4"
          strokeLinecap="round" strokeLinejoin="round" />
        {/* The plinth it stands on. */}
        <path d="M10 112h100" stroke="var(--color-gold-leaf)" strokeWidth="2.4" strokeLinecap="round" />
        <g fill="none" stroke="var(--color-clay)" strokeWidth="2.4"
          strokeLinecap="round" strokeLinejoin="round">
          {SUBJECTS[kind]}
        </g>
      </svg>
      <p className="max-w-[16rem] text-ink-2">{message}</p>
    </div>
  )
}
