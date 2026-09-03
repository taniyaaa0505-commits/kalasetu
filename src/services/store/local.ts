/**
 * The on-device backend: IndexedDB.
 *
 * This is what runs when Firebase is not configured — which is the default,
 * so a teammate who clones the repo gets a working app with no setup.
 */
import type { Collection, Signature, Stored } from './types'
import { run, openStore } from '../idb'

const POLL_MS = 1500

export function localCollection<T extends Stored>(
  storeName: string,
  sig: Signature<T>,
): Collection<T> {
  return {
    list: () => run<T[]>('readonly', s => s.getAll(), storeName),
    get: (id) => run<T | undefined>('readonly', s => s.get(id), storeName),
    put: async (item) => { await run('readwrite', s => s.put(item), storeName) },
    remove: async (id) => { await run('readwrite', s => s.delete(id), storeName) },

    subscribe(cb) {
      let alive = true
      // Null, not '': an EMPTY collection has an empty signature, so starting
      // at '' meant the first callback never fired for an empty store and any
      // screen loading data inside it silently never ran.
      let last: string | null = null
      const tick = async () => {
        try {
          const items = await run<T[]>('readonly', s => s.getAll(), storeName)
          if (!alive) return
          const now = items.map(sig).join('|')
          if (now !== last) { last = now; cb(items) }
        } catch { /* the storage banner already reports this */ }
      }
      tick()
      const timer = setInterval(tick, POLL_MS)
      return () => { alive = false; clearInterval(timer) }
    },
  }
}

export { openStore }
