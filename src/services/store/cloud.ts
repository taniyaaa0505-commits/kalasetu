/**
 * The Firestore backend — what makes her phone and his laptop the same shop.
 *
 * `subscribe` here is a real live listener, so the moment she taps the green
 * tick the buyer page updates. That second is the demo.
 *
 * Note on images: a product carries its photos inline as data URLs, roughly
 * half a megabyte. Firestore's document limit is 1 MB, so this fits — but not
 * comfortably, and every read pulls the whole photo down again. Moving images
 * to Cloudinary and storing URLs is the proper fix and is noted in SPEC.md.
 */
import type { Collection, Stored } from './types'
import { firestore } from '../firebase'

/** Firestore rejects any document over 1 MB; warn well before that. */
const WARN_BYTES = 800_000

/**
 * Drop keys whose value is `undefined`, all the way down.
 *
 * Firestore refuses a document containing one — "Unsupported field value:
 * undefined" — and refuses the WHOLE write, not just that field. Our types are
 * full of optional properties (`note?`, `needBy?`, `cleanPhoto?`) and building
 * an object with `{ note, needBy }` puts the keys there with undefined values
 * even when nobody filled them in.
 *
 * That is not theoretical. Every order placed from the buyer page was being
 * rejected, because the form never sets `needBy`: the button sat on "Placing…"
 * for ever and no order was ever created. Sanitising here rather than at each
 * call site means no future optional field can do it again.
 */
function withoutUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withoutUndefined) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = withoutUndefined(v)
    }
    return out as T
  }
  return value
}

export function cloudCollection<T extends Stored>(name: string): Collection<T> {
  async function coll() {
    const db = await firestore()
    const { collection } = await import('firebase/firestore')
    return { db, ref: collection(db, name) }
  }

  return {
    async list() {
      const { ref } = await coll()
      const { getDocs } = await import('firebase/firestore')
      return (await getDocs(ref)).docs.map(d => d.data() as T)
    },

    async get(id) {
      const { db } = await coll()
      const { doc, getDoc } = await import('firebase/firestore')
      const snap = await getDoc(doc(db, name, id))
      return snap.exists() ? (snap.data() as T) : undefined
    },

    async put(item) {
      const clean = withoutUndefined(item)
      const size = new Blob([JSON.stringify(clean)]).size
      if (size > WARN_BYTES) {
        console.warn(
          `[store] ${name}/${item.id} is ${(size / 1000).toFixed(0)} KB. ` +
          `Firestore rejects documents over 1 MB — the photos need to move to ` +
          `object storage before this bites.`,
        )
      }
      const { db } = await coll()
      const { doc, setDoc } = await import('firebase/firestore')
      await setDoc(doc(db, name, clean.id), clean as Record<string, unknown>)
    },

    async remove(id) {
      const { db } = await coll()
      const { doc, deleteDoc } = await import('firebase/firestore')
      await deleteDoc(doc(db, name, id))
    },

    subscribe(cb) {
      let stop: (() => void) | null = null
      let cancelled = false

      ;(async () => {
        try {
          const { ref } = await coll()
          const { onSnapshot } = await import('firebase/firestore')
          if (cancelled) return
          stop = onSnapshot(
            ref,
            snap => cb(snap.docs.map(d => d.data() as T)),
            err => console.error(`[store] ${name} listener failed`, err),
          )
        } catch (err) {
          console.error(`[store] could not watch ${name}`, err)
        }
      })()

      return () => { cancelled = true; stop?.() }
    },
  }
}
