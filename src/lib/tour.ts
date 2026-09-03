/**
 * Whether she has been shown the tour.
 *
 * Kept in localStorage rather than IndexedDB on purpose: it is one boolean,
 * it must be readable synchronously before the first render, and losing it is
 * harmless — she simply gets shown how the app works again.
 */
const KEY = 'kalasetu.tourSeen'

export function tourSeen(): boolean {
  try { return localStorage.getItem(KEY) === '1' } catch { return true }
}

export function markTourSeen() {
  try { localStorage.setItem(KEY, '1') } catch { /* private mode — no harm */ }
}
