/**
 * The Uchit Mulya (fair price) engine.
 *
 * The floor is the part that matters and it needs zero data and zero AI —
 * it works on day one. It is also the ethical core of the pitch: the app
 * will not let her price below what her own labour is worth.
 *
 * The market band is the part that needs data. It is stubbed for now.
 */
import type { CostInput, PriceSuggestion } from '../types'

/** Configurable so we can defend the number if a judge asks where it came from.
 *  TODO: source a real figure (state minimum wage for skilled artisan work)
 *  and cite it on the slide. */
export const DIGNIFIED_DAY_WAGE = 450   // rupees for an 8-hour day
export const HOURS_PER_DAY = 8
export const OVERHEAD_RATE = 0.15       // packaging, transport, wastage

export function fairWageFloor(cost: CostInput): number {
  const labour = (cost.hours / HOURS_PER_DAY) * DIGNIFIED_DAY_WAGE
  const subtotal = cost.materialCost + labour
  return Math.round(subtotal * (1 + OVERHEAD_RATE))
}

/**
 * STUB — replace when the comparables dataset exists.
 *
 * Real version: look up similar products by craft + material + size in the
 * comparables table, return the 25th and 75th percentile.
 * For now we derive a plausible band from the floor so the UI is buildable.
 */
export function marketBand(floor: number, _craft?: string): { low: number; high: number } {
  return { low: Math.round(floor * 1.8), high: Math.round(floor * 2.6) }
}

/** Festival demand. Crude on purpose — a real calendar is a later task. */
function seasonBoost(month = new Date().getMonth()): { factor: number; reason: string } {
  if (month === 9 || month === 10) return { factor: 1.12, reason: 'दिवाली नज़दीक है'   } // Oct-Nov
  if (month === 7)                 return { factor: 1.06, reason: 'राखी का मौसम है'    } // Aug
  if (month === 1 || month === 2)  return { factor: 1.08, reason: 'शादी का मौसम है'    } // Feb-Mar
  return { factor: 1, reason: '' }
}

export function suggestPrice(cost: CostInput, craft?: string): PriceSuggestion {
  const floor = fairWageFloor(cost)
  const band = marketBand(floor, craft)
  const season = seasonBoost()

  const mid = (band.low + band.high) / 2
  const suggested = Math.round((mid * season.factor) / 10) * 10   // round to ₹10

  const reasons: string[] = []
  if (craft) reasons.push(`${craft} हाथ से बना है`)
  if (season.reason) reasons.push(season.reason)

  return {
    floor,
    marketLow: band.low,
    marketHigh: band.high,
    suggested: Math.max(suggested, floor),
    reason: reasons.join(', ') || 'बाज़ार के दाम के हिसाब से',
  }
}
