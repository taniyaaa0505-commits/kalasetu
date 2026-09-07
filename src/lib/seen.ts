/**
 * Which buyer messages she has already looked at.
 *
 * The home screen's message banner has to clear, the way the order banner
 * clears when she answers. Without this it would count every message a buyer
 * ever sent and sit there for ever — a notification that never goes away is
 * one she stops seeing, and then the one that mattered arrives underneath it.
 *
 * Kept per product, not one flag for the whole shop: opening a conversation
 * about a pot should not silence a different buyer asking about a shawl.
 *
 * A timestamp rather than a set of ids, because it is one number per
 * conversation however long the conversation gets, and "everything before
 * this" is exactly what opening the chat means.
 *
 * Local to the device on purpose. What she has read is not a fact about the
 * shop that a buyer or another phone has any business knowing.
 */
const KEY = 'kalasetu.seenMessages'

type Seen = Record<string, number>

function read(): Seen {
  try {
    const raw = localStorage.getItem(KEY)
    const v = raw ? JSON.parse(raw) : {}
    return v && typeof v === 'object' ? v as Seen : {}
  } catch {
    return {}          // private mode, or somebody put junk in there
  }
}

/** Everything in this conversation up to `at` has been seen. */
export function markSeen(productId: string, at: number) {
  if (!at) return
  try {
    const all = read()
    // Never move it backwards: she may be re-reading an old message.
    if ((all[productId] ?? 0) >= at) return
    all[productId] = at
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch { /* no storage: the banner stays, which is the safe direction */ }
}

/** When she last looked at this conversation. 0 if never. */
export function lastSeen(productId: string): number {
  return read()[productId] ?? 0
}
