/**
 * One banknote, drawn.
 *
 * She counts cash fluently and may not read numerals, so a price is shown as
 * the notes she would be handed. A flat coloured rectangle with "500" on it
 * did the job at a glance; this does it at a glance AND looks like money,
 * which is what the screen is for — the moment a woman sees four grey notes
 * and two orange ones is the moment the number stops being abstract.
 *
 * DRAWN, not photographed, for three reasons and all of them practical:
 *
 *  1. These render at 44 to 56 pixels wide. A photograph of a banknote at
 *     that size is a smudge; the things that identify a note to a human —
 *     its colour, the portrait, the big numeral — survive only if drawn.
 *  2. Photographs of currency found online carry stock-library watermarks.
 *     A demo projected in front of judges with "alamy" across the rupees is
 *     worse than no rupees.
 *  3. Nothing to download, nothing to precache on a metered phone, sharp at
 *     any size, and it works offline like everything else here.
 *
 * If real photographs are wanted anyway, drop them in `public/notes/` as
 * `500.jpg`, `200.jpg` and so on: `PriceInNotes` prefers a file that exists
 * and falls back to this. Use clean scans — RBI publishes its own images at
 * paisaboltahai.rbi.org.in — not watermarked stock.
 *
 * The colours are the real base colours from RBI's descriptions of the
 * Mahatma Gandhi (New) series, because colour is how a note is recognised
 * across a room. The layout is a deliberate likeness and not a reproduction:
 * no serial number, no signature, no security thread, no promise to pay.
 */

export interface NoteStyle {
  /** The base colour RBI lists for the denomination. */
  bg: string
  /** Ink: the numeral, the portrait line work and the lettering. */
  ink: string
  /** The paler wash the portrait panel sits on. */
  wash: string
  /** The denomination as she reads it, in Devanagari. */
  words: string
}

export const NOTES: Record<number, NoteStyle> = {
  500: { bg: '#9A998C', ink: '#2F2E24', wash: '#B7B6A9', words: 'पाँच सौ' },
  200: { bg: '#E9A23B', ink: '#5A3405', wash: '#F2C173', words: 'दो सौ' },
  100: { bg: '#9C8FC4', ink: '#2E2352', wash: '#B7ADD6', words: 'एक सौ' },
  50:  { bg: '#5EB4D6', ink: '#0B3B4D', wash: '#8ECCE5', words: 'पचास' },
  20:  { bg: '#BCC64A', ink: '#33390A', wash: '#D3DA85', words: 'बीस' },
  10:  { bg: '#A98B69', ink: '#3D2A14', wash: '#C4AA8C', words: 'दस' },
}

export default function RupeeNote({ value, className = '' }: { value: number; className?: string }) {
  const s = NOTES[value] ?? NOTES[10]

  return (
    <svg viewBox="0 0 128 64" className={className} role="img" aria-label={`₹${value}`}>
      <rect width="128" height="64" rx="3" fill={s.bg} />

      {/* The guilloche — the fine wavy engine-turning that makes paper money
          look like paper money rather than a coloured card. Two lines is
          enough at this size; more is mud. */}
      <g stroke={s.ink} strokeWidth="0.6" opacity="0.28" fill="none">
        <path d="M0 14 Q 32 6 64 14 T 128 14" />
        <path d="M0 52 Q 32 60 64 52 T 128 52" />
      </g>

      {/* "भारतीय रिज़र्व बैंक" across the top, as a rule rather than as text:
          at 56px wide, real lettering is illegible and renders as grey fuzz,
          and a line reads as the band of print it stands for. */}
      <rect x="8" y="7" width="64" height="2" rx="1" fill={s.ink} opacity="0.5" />

      {/* Gandhi, in the centre panel — the one thing every Indian banknote
          has and the fastest way a glance says "money". An oval, a profile
          and the round glasses; at this size, that IS the portrait. */}
      <g transform="translate(64 34)">
        <ellipse rx="17" ry="21" fill={s.wash} stroke={s.ink} strokeWidth="0.7" opacity="0.95" />
        <g fill={s.ink} opacity="0.85">
          {/* head and shoulders */}
          <path d="M-1 -13c5 0 8 4 8 9 0 3-1 6-3 8l3 2c5 2 8 5 9 9h-32c1-4 4-7 9-9l3-2c-2-2-3-5-3-8 0-5 3-9 6-9z" />
          {/* the glasses, which are the whole silhouette */}
          <g fill="none" stroke={s.bg} strokeWidth="1.1" opacity="0.9">
            <circle cx="-4" cy="-5" r="2.6" /><circle cx="4" cy="-5" r="2.6" />
            <path d="M-1.4 -5h2.8" />
          </g>
        </g>
      </g>

      {/* The number, twice: large on the right the way a note carries it, and
          small top-left. This is the part she actually reads. */}
      <text x="118" y="46" textAnchor="end" fill={s.ink}
        fontSize="22" fontWeight="700" fontFamily="system-ui, sans-serif">₹{value}</text>
      <text x="9" y="26" fill={s.ink} fontSize="11" fontWeight="700"
        fontFamily="system-ui, sans-serif" opacity="0.9">{value}</text>

      {/* And in words, in Devanagari, because a numeral is exactly the thing
          some of our users cannot read. */}
      <text x="9" y="57" fill={s.ink} fontSize="8" fontWeight="600"
        fontFamily="system-ui, sans-serif" opacity="0.8">{s.words}</text>
    </svg>
  )
}
