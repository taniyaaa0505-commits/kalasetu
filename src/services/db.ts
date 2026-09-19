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

/** Every product, from everyone. Outward-facing screens only. */
export async function listProducts(): Promise<Product[]> {
  return (await products.list()).sort((a, b) => b.createdAt - a.createdAt)
}

/**
 * Hers.
 *
 * Filtered on the server, not after the fact. It used to read the WHOLE
 * products collection and drop the ones that were not hers — and the orders
 * and messages screens call it from inside a live subscription, so every time
 * a buyer typed a word the phone re-downloaded every artisan's photographs to
 * rebuild a lookup for a row of 64px thumbnails.
 */
export async function listMyProducts(artisan: string): Promise<Product[]> {
  const mine = await products.list({ field: 'artisanId', equals: artisan })
  return mine.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getProduct(id: string): Promise<Product | undefined> {
  return products.get(id)
}

export async function saveProduct(p: Product): Promise<void> {
  await products.put(p)
}

/** Merge a few fields into an existing product without rewriting the whole thing. */
export async function patchProduct(id: string, patch: Partial<Product>): Promise<Product | undefined> {
  // From the cache: this is her own product, on the phone that wrote it, and
  // she is waiting on a button. See Collection.get in store/types.ts.
  const p = await products.get(id, 'cache')
  if (!p) return undefined
  const next = { ...p, ...patch }
  await saveProduct(next)
  return next
}

export async function deleteProduct(id: string): Promise<void> {
  await products.remove(id)
}

const byNewest = (items: Product[]) => [...items].sort((a, b) => b.createdAt - a.createdAt)

/**
 * Watch EVERY product, from every artisan.
 *
 * Only two screens may use this and both are outward-facing: the buyer
 * marketplace, whose whole job is to show many makers' work, and the impact
 * dashboard, which aggregates across all of them. Her own app must not — see
 * below.
 */
export function subscribeProducts(cb: (items: Product[]) => void): () => void {
  return products.subscribe(items => cb(byNewest(items)))
}

/**
 * The marketplace feed: published only, and never more than a page of it.
 *
 * screens/Buyer.tsx used `subscribeProducts` and threw most of it away in the
 * browser — drafts, practice pieces, everything unpublished — after paying to
 * download every one of them. Each product document carries two base64
 * photographs, so that was six megabytes on a phone before a single card
 * appeared, and it grew with every listing anyone made.
 *
 * `status` is filtered in Firestore and the rest (a maker, not a practice
 * piece, not held back by the handmade check) stays in the browser, because
 * Firestore cannot express "field absent or not false" and a composite index
 * for three of them is not worth minting for a page that shows twenty-four
 * cards.
 */
export function subscribePublished(
  cb: (items: Product[]) => void, max = 24,
): () => void {
  return products.subscribe(
    items => cb(byNewest(items)), { field: 'status', equals: 'published', max },
  )
}

/**
 * Watch HER products.
 *
 * The artisan's app used this collection unfiltered, which meant every phone
 * that installed the APK opened onto every other artisan's shop — someone
 * else's work, presented as hers, with her own name on the header. It also
 * meant downloading their photographs to do it, about half a megabyte each.
 *
 * Filtered on the server by `artisanId` (services/artisan.ts). Products made
 * before that field existed match nobody and simply do not appear in anyone's
 * shop; they are still counted on the impact dashboard, which reports them as
 * unattributed rather than pretending they belong to whoever is looking.
 */
export function subscribeMyProducts(
  artisan: string, cb: (items: Product[]) => void,
): () => void {
  return products.subscribe(items => cb(byNewest(items)), { field: 'artisanId', equals: artisan })
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
