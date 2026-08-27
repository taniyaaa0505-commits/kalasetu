/**
 * The offline queue — the thing that makes the airplane-mode demo work.
 *
 * STUB. Today it just reports whether we are online.
 *
 * Next step: when a job is added while offline, park it in IndexedDB and
 * replay it on the `online` event. Jobs are things that need the network:
 * generating a listing, uploading an image, publishing.
 */

export type JobKind = 'generate-listing' | 'upload-image' | 'publish'

export interface Job { id: string; kind: JobKind; productId: string; createdAt: number }

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

/** Subscribe to connectivity changes. Returns an unsubscribe function. */
export function onConnectivityChange(cb: (online: boolean) => void): () => void {
  const up = () => cb(true), down = () => cb(false)
  window.addEventListener('online', up)
  window.addEventListener('offline', down)
  return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down) }
}

export async function enqueue(_job: Omit<Job, 'id' | 'createdAt'>): Promise<void> {
  console.warn('[queue] not implemented yet — job dropped')
}

export async function pending(): Promise<Job[]> { return [] }
