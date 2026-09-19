/**
 * The on-device backend: IndexedDB.
 *
 * This is what runs when Firebase is not configured — which is the default,
 * so a teammate who clones the repo gets a working app with no setup.
 */
import type { Collection, Signature, Stored } from './types'
import { run, openStore } from '../idb'

/* Every tick reads the WHOLE store back — photographs included — and three of
   these run at once on the home screen. 1.5s was a main-thread stall two or
   three times a second on the phone this app is for, forever, whether or not
   anything had changed. */
const POLL_MS = 3000

export function localCollection<T extends Stored>(
  storeName: string,
  sig: Signature<T>,
): Collection<T> {
  return {
    async list(only) {
      const all = await run<T[]>('readonly', s => s.getAll(), storeName)
      if (!only) return all
      const hit = all.filter(x => (x as Record<string, unknown>)[only.field] === only.equals)
      return only.max ? [...hit].sort((a, b) => (a.id < b.id ? 1 : -1)).slice(0, only.max) : hit
    },
    get: (id) => run<T | undefined>('readonly', s => s.get(id), storeName),
    put: async (item) => { await run('readwrite', s => s.put(item), storeName) },
    remove: async (id) => { await run('readwrite', s => s.delete(id), storeName) },

    subscribe(cb, only) {
      let alive = true
      // Null, not '': an EMPTY collection has an empty signature, so starting
      // at '' meant the first callback never fired for an empty store and any
      // screen loading data inside it silently never ran.
      let last: string | null = null
      const tick = async () => {
        // Nothing has changed that she can see, and nobody is looking.
        if (typeof document !== 'undefined' && document.hidden) return
        try {
          const all = await run<T[]>('readonly', s => s.getAll(), storeName)
          if (!alive) return
          let items = only
            ? all.filter(x => (x as Record<string, unknown>)[only.field] === only.equals)
            : all
          // The same ceiling the cloud applies server-side, and the same
          // order — newest first by id, which for `p_<base36 time>_…` is
          // chronological. See the note in store/cloud.ts.
          if (only?.max) items = [...items].sort((a, b) => (a.id < b.id ? 1 : -1)).slice(0, only.max)
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
