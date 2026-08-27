/**
 * Where products live.
 *
 * Right now: localStorage. Later: Firestore.
 * Every function here is `async` even though localStorage is not, so that
 * swapping in Firestore later changes ONLY this file and nothing else.
 * That is the whole point of putting it behind a service.
 */
import type { Product } from '../types'

const KEY = 'kalasetu.products'

function readAll(): Product[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Product[] }
  catch { return [] }
}

function writeAll(list: Product[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) }
  catch (e) { console.warn('Could not save. Storage may be full.', e) }
}

export async function listProducts(): Promise<Product[]> {
  return readAll().sort((a, b) => b.createdAt - a.createdAt)
}

export async function getProduct(id: string): Promise<Product | undefined> {
  return readAll().find(p => p.id === id)
}

export async function saveProduct(p: Product): Promise<void> {
  const list = readAll()
  const i = list.findIndex(x => x.id === p.id)
  if (i >= 0) list[i] = p; else list.push(p)
  writeAll(list)
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
  writeAll(readAll().filter(p => p.id !== id))
}

export function newId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}
