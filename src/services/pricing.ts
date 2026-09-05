/**
 * The Uchit Mulya (fair price) engine.
 *
 * The floor is the part that matters and it needs zero data and zero AI —
 * it works on day one. It is also the ethical core of the pitch: the app
 * will not let her price below what her own labour is worth.
 *
 * The market band needed data, and now has some. See ./comparables.ts —
 * roughly 130 real listing prices across nine crafts, each row citing the page
 * it was read from. Where a craft is not in that table the app says it is
 * estimating rather than pretending otherwise.
 */
import type { CostInput, PriceSuggestion } from '../types'
import { comparablesFor, type Comparable } from './comparables'
import { t, tf } from '../lib/i18n'

/**
 * A dignified day's pay, and where the number comes from.
 *
 * Rajasthan's notified minimum wage for SKILLED work is ₹316 a day (Labour
 * Department, revised 1 Jan 2025; unskilled ₹300, semi-skilled ₹308). We pay
 * above it on purpose — a legal floor for construction labour is not a fair
 * price for a craft that took a decade to learn — but it anchors the figure to
 * something a judge can look up rather than to a number we liked.
 *
 * If you change this, change the citation with it.
 */
export const DIGNIFIED_DAY_WAGE = 450   // rupees for an 8-hour day; 1.42× the
                                        // Rajasthan skilled-work minimum
export const HOURS_PER_DAY = 8
export const OVERHEAD_RATE = 0.15       // packaging, transport, wastage

export function fairWageFloor(cost: CostInput): number {
  const labour = (cost.hours / HOURS_PER_DAY) * DIGNIFIED_DAY_WAGE
  const subtotal = cost.materialCost + labour
  return Math.round(subtotal * (1 + OVERHEAD_RATE))
}

/**
 * What this kind of thing sells for.
 *
 * Real comparables when we have them for the craft, and an honest admission
 * when we do not. `estimated` is not decoration — it is what stops the app
 * claiming knowledge it does not have, and it is carried all the way out to
 * `PriceSuggestion` so the screen can say so.
 *
 * The band is NOT clamped to her floor. For a hand-thrown water pot the real
 * wholesale band is ₹220–300 and her floor is nearer ₹500, so the band sits
 * BELOW the floor — and that is the most important thing this screen can ever
 * show her. Hiding it would turn the one honest measurement in the app into
 * decoration.
 */
export function marketBand(
  floor: number, craft?: string, material?: string,
): { low: number; high: number; from?: Comparable } {
  const from = comparablesFor(craft, material)
  if (from) return { low: from.low, high: from.high, from }

  // No comparables for this craft. Fall back to the old multiplier, which is
  // arithmetic on her own costs and knows nothing about any market — so
  // whatever uses this must say "estimated".
  return { low: Math.round(floor * 1.8), high: Math.round(floor * 2.6) }
}

/** Festival demand. Crude on purpose — a real calendar is a later task.
 *  Returns a translation KEY, never a sentence, so the reason comes out in
 *  whichever language she chose. */
function seasonBoost(month = new Date().getMonth()): { factor: number; key?: SeasonKey } {
  if (month === 9 || month === 10) return { factor: 1.12, key: 'reasonDiwali'  } // Oct-Nov
  if (month === 7)                 return { factor: 1.06, key: 'reasonRakhi'   } // Aug
  if (month === 1 || month === 2)  return { factor: 1.08, key: 'reasonWedding' } // Feb-Mar
  return { factor: 1 }
}

type SeasonKey = 'reasonDiwali' | 'reasonRakhi' | 'reasonWedding'

export function suggestPrice(cost: CostInput, craft?: string, material?: string): PriceSuggestion {
  const floor = fairWageFloor(cost)
  const band = marketBand(floor, craft, material)
  const season = seasonBoost()

  const mid = (band.low + band.high) / 2
  const suggested = Math.round((mid * season.factor) / 10) * 10   // round to ₹10

  const parts: string[] = []
  if (craft) parts.push(tf('reasonHandmade', { craft }))
  if (season.key) parts.push(t(season.key))

  return {
    floor,
    marketLow: band.low,
    marketHigh: band.high,
    // Never below the floor. The band may legitimately sit under it — see
    // marketBand — but what we ASK her to charge never does.
    suggested: Math.max(suggested, floor),
    reason: parts.join(', ') || t('reasonMarket'),
    estimated: !band.from,
    basis: band.from
      ? { n: band.from.n, market: band.from.market, source: band.from.source }
      : undefined,
  }
}
