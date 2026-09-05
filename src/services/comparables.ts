/**
 * What these things actually sell for.
 *
 * This file replaces a four-line stub that returned `floor × 1.8 … 2.6` — a
 * constant, so the app suggested roughly 2.2× her cost for a clay lamp, a
 * phulkari dupatta and a ceiling fan alike. It knew nothing about any craft.
 *
 * Every number below was READ OFF A REAL LISTING PAGE in September 2026, and
 * every row names where. Nothing here is estimated, interpolated or rounded
 * from a guess. That matters more than the size of the table: this app's whole
 * argument is that it refuses to invent facts about her product, and inventing
 * price data to fix a stub about price data would have been the same sin with
 * a spreadsheet. Where the sample is thin, `n` says so.
 *
 * TWO KINDS OF PRICE, and they are not interchangeable:
 *
 *   retail     what a craft boutique charges the public. This is the right
 *              anchor for the app's premise — she is reaching the buyer
 *              directly, so this is the money that is on the table.
 *   wholesale  what a bulk buyer pays per piece. This is what our own Orders
 *              flow models, and for the low-value high-volume crafts it is
 *              the only price that exists in public.
 *
 * The band is the 25th–75th percentile of the observed prices, not the full
 * range. Nobody is helped by "kantha work costs between ₹490 and ₹22,990" —
 * that spans a bangle box and a Bangalore silk saree. The interquartile range
 * describes the ordinary item, which is what she is holding.
 *
 * TO EXTEND THIS: add rows, re-derive p25/p75, and cite the page. Do not add a
 * category you have not actually looked up.
 */

export type Market = 'retail' | 'wholesale'

export interface Comparable {
  /** Lower-case words that identify this craft in the AI's `craft` field. */
  match: string[]
  /** 25th and 75th percentile of the observed prices, in rupees. */
  low: number
  high: number
  /** How many real listings this came from. Small numbers are honest, not hidden. */
  n: number
  market: Market
  source: string
  /** Per piece unless this says otherwise. */
  unit?: string
}

export const COMPARABLES: Comparable[] = [
  {
    match: ['madhubani', 'mithila'],
    low: 2700, high: 5200, n: 22, market: 'retail',
    source: 'itokri.com/collections/madhubani-mithila-painting-online (Sep 2026)',
  },
  {
    match: ['gond'],
    low: 3800, high: 5300, n: 9, market: 'retail',
    source: 'itokri.com/collections/gond-paintings (Sep 2026)',
  },
  {
    match: ['phulkari'],
    low: 5100, high: 12950, n: 15, market: 'retail',
    source: 'itokri.com/collections/phulkari (Sep 2026)',
  },
  {
    match: ['kantha'],
    low: 990, high: 2450, n: 34, market: 'retail',
    source: 'itokri.com/collections/bengal-kantha-work (Sep 2026)',
  },
  {
    match: ['sanganeri', 'block print', 'block-print', 'bagru', 'ajrakh'],
    low: 1600, high: 4300, n: 29, market: 'retail',
    source: 'itokri.com/collections/sanganeri-block-printing (Sep 2026)',
  },
  {
    // The craft this app was designed around, and the one where the gap is
    // widest: a hand-thrown water pot wholesales for less than three hundred
    // rupees. Four hours of her labour at a dignified wage is already more
    // than that, which is the entire argument the price floor exists to make.
    match: ['matka', 'water pot', 'clay pot', 'ghada', 'surahi'],
    low: 220, high: 300, n: 3, market: 'wholesale',
    source: 'indiamart.com clay-water-pot / terracotta-pots listings (Sep 2026)',
  },
  {
    match: ['diya', 'oil lamp', 'earthen lamp'],
    low: 40, high: 110, n: 6, market: 'wholesale',
    source: 'indiamart.com clay-diya / terracota-diya listings (Sep 2026)',
  },
  {
    match: ['jute'],
    low: 25, high: 50, n: 6, market: 'wholesale',
    source: 'indiamart.com jute-shopping-bags / custom-jute-bags (Sep 2026)',
  },
  {
    match: ['bamboo', 'cane', 'basket', 'wicker'],
    low: 40, high: 425, n: 6, market: 'wholesale',
    source: 'indiamart.com bamboo-basket / cane-baskets (Sep 2026)',
  },
]

/**
 * Find the comparables for a craft, or nothing.
 *
 * Longest match wins, so "terracotta diya" picks the diya row rather than
 * whichever generic term happened to be listed first. Returning `undefined`
 * is a real answer — see `marketBand` for what the app does with it, which is
 * to say plainly that it is estimating.
 */
export function comparablesFor(craft?: string, material?: string): Comparable | undefined {
  const hay = `${craft ?? ''} ${material ?? ''}`.toLowerCase()
  if (!hay.trim()) return undefined

  let best: Comparable | undefined
  let bestLen = 0
  for (const row of COMPARABLES) {
    for (const word of row.match) {
      if (hay.includes(word) && word.length > bestLen) { best = row; bestLen = word.length }
    }
  }
  return best
}
