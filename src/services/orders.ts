/**
 * Orders — the step that turns a listing into income.
 *
 * Deliberately simple: no payments, no escrow. A buyer places an order, she
 * says yes or no out loud, she marks it sent, he marks it received. That is
 * enough to close the loop and to start building the sales history that the
 * credit story depends on.
 */
import { run, ORDER_STORE } from './db'
import { translate } from './gemini'
import { isOnline } from './queue'
import type { Order, OrderStatus, LangCode } from '../types'

export async function listOrders(productId?: string): Promise<Order[]> {
  const all = await run<Order[]>('readonly', s => s.getAll(), ORDER_STORE)
  return all
    .filter(o => !productId || o.productId === productId)
    .sort((a, b) => b.createdAt - a.createdAt)
}

/** Orders still waiting for her to say yes or no. */
export async function pendingOrders(): Promise<Order[]> {
  return (await listOrders()).filter(o => o.status === 'placed')
}

export async function getOrder(id: string): Promise<Order | undefined> {
  return run<Order | undefined>('readonly', s => s.get(id), ORDER_STORE)
}

async function put(o: Order): Promise<Order> {
  await run('readwrite', s => s.put(o), ORDER_STORE)
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

  // Translate the buyer's note so she hears it in her own language, the same
  // way chat works. A failed translation must never block the order.
  let noteLocal: string | undefined
  if (note && isOnline()) {
    try { noteLocal = await translate(note, 'English', languageName(localLang)) } catch { /* keep it undefined */ }
  }

  const now = Date.now()
  return put({
    id: `o_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    productId, createdAt: now, updatedAt: now, status: 'placed',
    quantity, unitPrice, total: quantity * unitPrice,
    buyerName, buyerOrg, note, noteLocal, needBy,
  })
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
