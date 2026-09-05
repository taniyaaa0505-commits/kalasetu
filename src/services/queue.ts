/**
 * Work that needs a network, parked until there is one.
 *
 * Most of this app already works with no signal: the app shell is precached,
 * the cut-out model lives in the browser's own cache after the first run, the
 * price is arithmetic, and Firestore writes land locally and sync themselves.
 *
 * Two things genuinely cannot happen offline, because they happen on somebody
 * else's computer: turning her voice into text, and writing the listing. The
 * honest answer is not to pretend, and not to fail either — it is to take what
 * she gave us, tell her plainly that it will finish when the signal comes
 * back, and then actually finish it.
 *
 * A job is therefore a promise to her, so it is stored in IndexedDB and
 * survives the app being closed. It is not a queue of network requests held in
 * memory that a swipe-away would lose.
 */
import { JOB_STORE, run } from './idb'

export type JobKind = 'generate-listing'

export interface Job {
  id: string
  kind: JobKind
  productId: string
  createdAt: number
  /** How many times we have tried and failed. Kept so a job that can never
   *  succeed does not retry forever every time she regains signal. */
  attempts: number
}

const MAX_ATTEMPTS = 5

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

/**
 * Park a job. One per product per kind — if she reopens a product with no
 * signal we must not stack up a second promise to do the same work.
 */
export async function enqueue(job: Pick<Job, 'kind' | 'productId'>): Promise<void> {
  const already = (await pending()).some(j => j.kind === job.kind && j.productId === job.productId)
  if (already) return
  const entry: Job = {
    id: `j_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    kind: job.kind, productId: job.productId, createdAt: Date.now(), attempts: 0,
  }
  await run('readwrite', s => s.put(entry), JOB_STORE)
}

export async function pending(): Promise<Job[]> {
  try {
    const all = await run<Job[]>('readonly', s => s.getAll(), JOB_STORE)
    return all.sort((a, b) => a.createdAt - b.createdAt)
  } catch {
    return []                       // storage is broken; the banner already says so
  }
}

export async function forget(id: string): Promise<void> {
  await run('readwrite', s => s.delete(id), JOB_STORE)
}

async function bumpAttempts(job: Job): Promise<void> {
  const next = { ...job, attempts: job.attempts + 1 }
  if (next.attempts >= MAX_ATTEMPTS) await forget(job.id)
  else await run('readwrite', s => s.put(next), JOB_STORE)
}

/**
 * Run everything we can. Safe to call as often as you like — it does nothing
 * when there is no signal and nothing when the queue is empty.
 *
 * `runner` is passed in rather than imported so this file stays free of
 * Gemini, Firestore and the product store; that also makes it testable.
 */
export async function drain(
  runner: (job: Job) => Promise<void>,
  onDone?: (job: Job) => void,
): Promise<number> {
  if (!isOnline()) return 0
  let done = 0
  for (const job of await pending()) {
    try {
      await runner(job)
      await forget(job.id)
      onDone?.(job)
      done++
    } catch {
      // Leave it parked. A failure here is usually the signal dropping again
      // mid-flight, and she should not lose the promise because of that.
      await bumpAttempts(job)
    }
  }
  return done
}
