/**
 * One product, exactly as a buyer meets it.
 *
 * There are two places this has to look identical and they used to be written
 * out twice: the marketplace grid, and the preview on the publish screen. The
 * publish screen showed her own photograph with her own title above her own
 * price — which is what SHE had just made, in HER language, in a layout no
 * buyer will ever see. She was approving one thing and sending another, and
 * the last screen before "send it" is the worst possible place for that gap.
 *
 * So both render this. If the marketplace card changes, the thing she approves
 * changes with it, because there is only one of them.
 *
 * In English on purpose. The buyer reads English — showing it to her in Hindi
 * would be a nicer preview of a screen that does not exist.
 */
import type { Product } from '../types'

export default function BuyerCard({ product: p }: { product: Product }) {
  return (
    <div className="overflow-hidden rounded-b-panel border border-line-2/70 bg-surface
                    text-left shadow-card ring-1 ring-gold-leaf/25">
      {/* A thumbnail, not the full cut-out: this card is about 220px wide and
          `cleanPhoto` is a 1000px square — up to 200 KB — so a page of
          twenty-four was several megabytes for a phone to decode into cards
          the size of a matchbox. That reasoning was right and the field was
          wrong. It read `photo`, which is the thumb of the ORIGINAL, so this
          card — the marketplace grid AND the publish preview — showed the
          background the app had just removed, while the product page showed
          the cut-out. The whole point of this file is that she approves the
          thing she sends, and the photograph is the first thing she looks at.
          `cleanThumb` is the same 420px copy, made from the cut-out instead.
          Falling back to `cleanPhoto` and never to `photo`: a product saved
          before cleanThumb existed costs bytes, which is the cheap mistake,
          not the wrong picture, which is the expensive one. */}
      {(p.cleanThumb ?? p.cleanPhoto) && (
        <img src={p.cleanThumb ?? p.cleanPhoto} alt="" loading="lazy" decoding="async"
          className="arch aspect-square w-full bg-surface-2 object-cover" />
      )}
      <div className="p-4">
        <p className="font-semibold leading-snug">{p.listing?.titleEn}</p>
        <p className="mt-1 line-clamp-2 text-sm text-ink-3">{p.listing?.descriptionEn}</p>
        <p className="mt-3 font-display text-xl font-bold tabular-nums text-indigo">
          ₹{p.price?.suggested}
        </p>
        <p className="mt-2 flex items-center gap-1 text-sm font-medium text-clay">
          Message the artisan <span aria-hidden>→</span>
        </p>
      </div>
    </div>
  )
}
