/**
 * Products.
 *
 * This file is domain logic only — it does not know or care whether the data
 * lives on the phone or in Firestore. `services/store` decides that once, at
 * startup, from whether Firebase is configured.
 *
 * The exported API has not changed since the localStorage days, which is why
 * moving to IndexedDB and then to the cloud has never touched a screen.
 */
import { collection, STORE } from './store'
import type { Product } from '../types'

/** Which fields, when they change, mean the screen should redraw. */
const products = collection<Product>(STORE, p =>
  `${p.id}:${p.status}:${p.price?.suggested ?? 0}:${p.listing ? 1 : 0}:${p.cleanPhoto ? 1 : 0}`,
)

export async function listProducts(): Promise<Product[]> {
  return (await products.list()).sort((a, b) => b.createdAt - a.createdAt)
}

export async function getProduct(id: string): Promise<Product | undefined> {
  return products.get(id)
}

export async function saveProduct(p: Product): Promise<void> {
  await products.put(p)
}

/** Merge a few fields into an existing product without rewriting the whole thing. */
export async function patchProduct(id: string, patch: Partial<Product>): Promise<Product | undefined> {
  const p = await getProduct(id)
  if (!p) return undefined
  const next = { ...p, ...patch }
  await saveProduct(next)
  return next
}

export async function deleteProduct(id: string): Promise<void> {
  await products.remove(id)
}

/**
 * Watch every product. Returns an unsubscribe.
 *
 * Screens use this instead of running their own timer, so they get realtime
 * updates the moment Firebase is configured without changing a line.
 */
export function subscribeProducts(cb: (items: Product[]) => void): () => void {
  return products.subscribe(items => cb([...items].sort((a, b) => b.createdAt - a.createdAt)))
}

export function newId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

/** How much room is left on the device. Useful when a photo refuses to save. */
export async function storageEstimate(): Promise<{ usedMB: number; quotaMB: number } | null> {
  if (!navigator.storage?.estimate) return null
  const { usage = 0, quota = 0 } = await navigator.storage.estimate()
  return { usedMB: +(usage / 1e6).toFixed(1), quotaMB: +(quota / 1e6).toFixed(0) }
}

// The storage-error banner and the two other domain files still reach for
// these, so keep them reachable from here.
export { resetConnection, run, MSG_STORE, ORDER_STORE, type DbFault } from './idb'
export { usingCloud } from './store'
