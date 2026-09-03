/**
 * Product lifecycle, above raw storage.
 *
 * `db.ts` knows how to delete a row. This file knows what deleting a product
 * MEANS — which orders and conversations hang off it, and when removal should
 * be refused outright.
 *
 * It lives here rather than in `db.ts` because it needs orders and messages,
 * and `db.ts` is the layer those two are built on.
 */
import { deleteProduct, getProduct } from './db'
import { listOrders } from './orders'
import { deleteMessagesFor } from './messages'
import type { Order } from '../types'

export type RemoveResult =
  | { ok: true; messagesRemoved: number }
  /** She has promised a buyer something. That is not hers to quietly erase. */
  | { ok: false; reason: 'has-orders'; orders: Order[] }
  | { ok: false; reason: 'not-found' }

/**
 * Can this product be removed?
 *
 * Kept separate from `removeProduct` so the UI can ask before it offers, and
 * so the rule can be tested without a browser.
 */
export function blockingOrders(orders: Order[]): Order[] {
  // A declined order is finished business — it should not trap the product.
  return orders.filter(o => o.status !== 'declined')
}

export interface RemovalCheck { ok: boolean; orders: Order[] }

export async function canRemove(id: string): Promise<RemovalCheck> {
  const orders = blockingOrders(await listOrders(id))
  return { ok: orders.length === 0, orders }
}

/**
 * Remove a product and everything that only existed because of it.
 *
 * Orders are never orphaned: either they block the removal, or there are none.
 * Messages go with the product, because a conversation about a listing that no
 * longer exists is unreadable on both sides.
 */
export async function removeProduct(id: string): Promise<RemoveResult> {
  const product = await getProduct(id)
  if (!product) return { ok: false, reason: 'not-found' }

  const orders = blockingOrders(await listOrders(id))
  if (orders.length > 0) return { ok: false, reason: 'has-orders', orders }

  const messagesRemoved = await deleteMessagesFor(id)
  await deleteProduct(id)
  return { ok: true, messagesRemoved }
}
