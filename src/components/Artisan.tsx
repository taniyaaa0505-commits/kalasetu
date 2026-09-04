/**
 * A woman at her weaving, for the two moments where the app is empty:
 * the first screen of the tour, and a home screen with nothing on it yet.
 *
 * Drawn rather than photographed, for the same reasons the tour's demo shots
 * are: it costs nothing, it adds no download to a metered connection, and it
 * cannot show the wrong craft to someone who does something else.
 *
 * Deliberately geometric. A half-realistic figure at 240px reads as a badly
 * drawn person; a clearly stylised one reads as a decision. She sits inside an
 * arch because that is the threshold a kolam is drawn at — the same gesture we
 * already use when she publishes.
 *
 * Her head is built as three circles, back to front: hair, bun, then the face
 * offset down and right over the top of them. Drawn the other way round — a
 * face with a bun stuck beside it — the bun lands ON her cheek and reads as a
 * phone held to her ear, which is the last thing this picture should say.
 *
 * Everything except skin is a palette variable, so it follows the theme.
 */

const SKIN = '#C98B60'
const SKIN_SHADE = '#AE7049'

export default function Artisan({ width = 240 }: { width?: number }) {
  return (
    <svg
      viewBox="0 0 260 180" width={width} height={width * (180 / 260)}
      role="img" aria-label="A woman weaving at her loom"
      className="block max-w-full"
    >
      {/* the threshold she works in */}
      <path d="M45 168 L45 100 A85 85 0 0 1 215 100 L215 168 Z" fill="var(--color-wash)" />
      <line x1="18" y1="168" x2="242" y2="168"
        stroke="var(--color-line-2)" strokeWidth="2" strokeLinecap="round" />

      {/* her yarn, on the floor beside her */}
      <circle cx="58" cy="156" r="11" fill="var(--color-gold)" />
      <path d="M50 152 Q58 158 66 152 M51 160 Q58 154 65 160"
        stroke="var(--color-gold-wash)" strokeWidth="1.6" fill="none" opacity=".85" />
      <circle cx="41" cy="161" r="7" fill="var(--color-indigo-2)" />

      {/* seated, in a sari, with the pallu over her shoulder */}
      <path d="M70 168 C70 140 82 120 98 112 L122 112 C138 120 150 142 150 168 Z"
        fill="var(--color-indigo)" />
      <path d="M96 112 L97 92 Q110 82 123 92 L124 112 Z" fill="var(--color-indigo-2)" />
      <path d="M100 90 C92 110 84 138 80 166"
        stroke="var(--color-gold)" strokeWidth="8" fill="none" strokeLinecap="round" />

      {/* head: hair, then bun, then the face over both */}
      <circle cx="104" cy="58" r="18" fill="var(--color-ink)" />
      <circle cx="88" cy="64" r="8" fill="var(--color-ink)" />
      <circle cx="110" cy="64" r="14" fill={SKIN} />
      <circle cx="114" cy="56" r="1.8" fill="var(--color-gold)" />

      {/* both hands at the cloth — the whole point of the picture */}
      <path d="M118 106 C134 112 146 120 154 130"
        stroke={SKIN_SHADE} strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M120 98 C136 102 148 110 156 120"
        stroke={SKIN} strokeWidth="8" fill="none" strokeLinecap="round" />

      {/* the cloth, half woven */}
      <path d="M152 112 L214 104 L217 132 L155 140 Z"
        fill="var(--color-gold-wash)" stroke="var(--color-line-2)"
        strokeWidth="1.5" strokeLinejoin="round" />
      <g strokeLinecap="round" fill="none">
        <g stroke="var(--color-indigo)" strokeWidth="2.5" opacity=".55">
          <path d="M164 110.5 L167 138.5" />
          <path d="M180 108.4 L183 136.4" />
          <path d="M196 106.3 L199 134.3" />
        </g>
        <g stroke="var(--color-gold)" strokeWidth="2">
          <path d="M172 109.4 L175 137.4" />
          <path d="M188 107.4 L191 135.4" />
          <path d="M204 105.3 L207 133.3" />
        </g>
        {/* loose warp threads at the far edge, still on the loom */}
        <g stroke="var(--color-gold)" strokeWidth="1.8" opacity=".75">
          <path d="M214.5 109 l9 -1.2" />
          <path d="M215 116 l9 -1.2" />
          <path d="M215.5 123 l9 -1.2" />
          <path d="M216 130 l9 -1.2" />
        </g>
      </g>
    </svg>
  )
}
