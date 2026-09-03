/**
 * Picks a storage backend, once, at startup.
 *
 * With Firebase configured every device sees the same shop. Without it the app
 * runs entirely on the phone and still works — you just cannot see anyone
 * else's products. Domain code never asks which one it got.
 */
import type { Collection, Signature, Stored } from './types'
import { cloudEnabled } from '../firebase'
import { localCollection } from './local'
import { cloudCollection } from './cloud'
import { STORE, MSG_STORE, ORDER_STORE } from '../idb'

export type { Collection } from './types'

export function collection<T extends Stored>(
  storeName: string,
  sig: Signature<T>,
): Collection<T> {
  return cloudEnabled() ? cloudCollection<T>(storeName) : localCollection<T>(storeName, sig)
}

export function usingCloud(): boolean { return cloudEnabled() }

export { STORE, MSG_STORE, ORDER_STORE }
