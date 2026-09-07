/**
 * Orders — the step that turns a listing into income.
 *
 * Deliberately simple: no payments, no escrow. A buyer places an order, she
 * says yes or no out loud, she marks it sent, he marks it received. That is
 * enough to close the loop and to start building the sales history that the
 * credit story depends on.
 */
import { collection, ORDER_STORE } from './store'
import { translate } from './gemini'
import { isOnline } from './queue'
import type { Order, OrderStatus, LangCode } from '../types'
import { getProduct } from './db'

/** Status is the only field a screen redraws for. */
const orders = collection<Order>(ORDER_STORE, o => `${o.id}:${o.status}`)

export async function listOrders(productId?: string): Promise<Order[]> {
  const all = await orders.list()
  return all
    .filter(o => !productId || o.productId === productId)
    .sort((a, b) => b.createdAt - a.createdAt)
}

/** Orders still waiting for her to say yes or no. */
export async function pendingOrders(): Promise<Order[]> {
  return (await listOrders()).filter(o => o.status === 'placed')
}

export async function getOrder(id: string): Promise<Order | undefined> {
  return orders.get(id)
}

/** Watch every order. Returns an unsubscribe. */
export function subscribeOrders(cb: (items: Order[]) => void): () => void {
  return orders.subscribe(items => cb([...items].sort((a, b) => b.createdAt - a.createdAt)))
}

async function put(o: Order): Promise<Order> {
  await orders.put(o)
  return o
}

export async function placeOrder(opts: {
  productId: string
  quantity: number
  unitPrice: number
  buyerName: string
  buyerOrg?: string
  note?: string
  needBy?: number
  localLang: LangCode
}): Promise<Order> {
  const { productId, quantity, unitPrice, buyerName, buyerOrg, note, needBy, localLang } = opts

  // Carry the maker's id onto the order. Without it, routing an order to the
  // right phone means fetching every product first just to look up an owner —
  // and it means an order can be orphaned by a product being deleted.
  const owner = (await getProduct(productId))?.artisanId

  const now = Date.now()
  const order = await put({
    id: `o_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    productId, artisanId: owner, createdAt: now, updatedAt: now, status: 'placed',
    quantity, unitPrice, total: quantity * unitPrice,
    buyerName, buyerOrg, note, needBy,
  })

  /*
   * The note is translated AFTER the order exists, never before it.
   *
   * This used to be the first thing placeOrder did, and it was awaited. The
   * translate call is an HTTP request to Gemini with no timeout of its own, so
   * a stalled connection or a throttled key did not fail — it simply never
   * came back, and neither did this function. The buyer's button sat on
   * "Placing…" for ever with no error to show, because nothing had thrown, and
   * no order was written at all: the one part that had to happen was waiting
   * on the one part that did not matter.
   *
   * So the order is committed first and the translation is a best-effort patch
   * on top, with a clock on it. Worst case she hears the note in English,
   * which is what happens offline anyway and is already handled.
   */
  void translateNote(order, note, localLang)
  return order
}

/** How long the note translation gets before we give up and leave it English. */
const TRANSLATE_MS = 8000

async function translateNote(order: Order, note: string | undefined, localLang: LangCode) {
  if (!note || !isOnline()) return
  try {
    const noteLocal = await Promise.race([
      translate(note, 'English', languageName(localLang)),
      new Promise<never>((_, no) => setTimeout(() => no(new Error('translate timed out')), TRANSLATE_MS)),
    ])
    // Re-read rather than reusing the object we wrote: she may have accepted
    // or declined in the seconds this took, and that must not be overwritten.
    const latest = await getOrder(order.id)
    if (latest) await put({ ...latest, noteLocal })
  } catch (err) {
    console.warn('[orders] note left untranslated:', err)
  }
}

/**
 * Watch HER orders — the ones on work she made.
 *
 * Filtered server-side on `artisanId`. Orders placed before that field
 * existed match nobody, which is the truth about them: there is no phone they
 * could have been delivered to.
 */
export function subscribeMyOrders(
  artisan: string, cb: (items: Order[]) => void,
): () => void {
  return orders.subscribe(cb, { field: 'artisanId', equals: artisan })
}

/** Move an order along. Only the transitions we actually allow. */
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  placed:    ['accepted', 'declined'],
  accepted:  ['shipped'],
  declined:  [],
  shipped:   ['delivered'],
  delivered: [],
}

export async function setStatus(
  id: string,
  status: OrderStatus,
  extra?: { leadTimeDays?: number },
): Promise<Order | undefined> {
  const o = await getOrder(id)
  if (!o) return undefined
  if (!NEXT[o.status].includes(status)) {
    console.warn(`[orders] refusing ${o.status} -> ${status}`)
    return o
  }
  return put({ ...o, ...extra, status, updatedAt: Date.now() })
}

export function canGo(from: OrderStatus, to: OrderStatus): boolean {
  return NEXT[from].includes(to)
}

function languageName(code: LangCode): string {
  const map: Record<string, string> = {
    'hi-IN': 'Hindi', 'en-IN': 'English', 'mai-IN': 'Maithili',
    'bn-IN': 'Bengali', 'mr-IN': 'Marathi', 'ta-IN': 'Tamil',
  }
  return map[code] ?? 'Hindi'
}
