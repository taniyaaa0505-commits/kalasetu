/**
 * Raw IndexedDB plumbing — opening the database, running a transaction, and
 * surfacing the failures a browser database can produce.
 *
 * Nothing domain-specific lives here. Products, orders and messages are all
 * built on top of this through services/store.
 *
 * IndexedDB rather than localStorage is not tidiness but a hard limit:
 * localStorage caps at about 5 MB and one product with its photos is roughly
 * 3.7 MB, so the SECOND product used to fail to save, silently.
 */
import type { Product } from '../types'

// Deliberately still 'kalasetu' after the rename to Pehchaan: this names the
// IndexedDB database on her phone, and renaming it would orphan every product
// she has already made. The name is invisible to her; her work is not.
const DB_NAME = 'kalasetu'
const DB_VERSION = 4
export const STORE = 'products'
export const MSG_STORE = 'messages'
export const ORDER_STORE = 'orders'
export const JOB_STORE = 'jobs'      // work that needs a network, parked until there is one
const LEGACY_KEY = 'kalasetu.products'      // the old localStorage home

let dbPromise: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = (async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)

      req.onupgradeneeded = () => {
        const upgraded = req.result
        if (!upgraded.objectStoreNames.contains(STORE)) {
          const store = upgraded.createObjectStore(STORE, { keyPath: 'id' })
          store.createIndex('createdAt', 'createdAt')
        }
        if (!upgraded.objectStoreNames.contains(MSG_STORE)) {
          const msgs = upgraded.createObjectStore(MSG_STORE, { keyPath: 'id' })
          msgs.createIndex('productId', 'productId')
        }
        if (!upgraded.objectStoreNames.contains(ORDER_STORE)) {
          const orders = upgraded.createObjectStore(ORDER_STORE, { keyPath: 'id' })
          orders.createIndex('productId', 'productId')
          orders.createIndex('status', 'status')
        }
        if (!upgraded.objectStoreNames.contains(JOB_STORE)) {
          const jobs = upgraded.createObjectStore(JOB_STORE, { keyPath: 'id' })
          jobs.createIndex('productId', 'productId')
        }
      }

      /**
       * Another tab is holding an OLDER version of this database open, so the
       * upgrade cannot run. Without this handler the request fires `blocked`
       * and then never resolves and never rejects — every call hangs forever
       * and the app just sits there empty. That is exactly what happened when
       * the orders release bumped the version while people had two tabs open
       * for the buyer demo.
       */
      req.onblocked = () => reject(new DbError('blocked'))

      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(new DbError('failed', req.error?.message))

      // Last resort. A database call must never hang silently.
      setTimeout(() => reject(new DbError('timeout')), 8000)
    })

    /**
     * If a NEWER version of the app opens in another tab, step aside instead
     * of blocking it — the mirror image of the bug above.
     */
    db.onversionchange = () => {
      db.close()
      dbPromise = null
      report(new DbError('superseded'))
    }

    await migrateFromLocalStorage(db)
    return db
  })().catch(err => {
    dbPromise = null            // let the next call retry
    report(err)
    throw err
  })
  return dbPromise
}

export type DbFault = 'blocked' | 'timeout' | 'failed' | 'superseded'

export class DbError extends Error {
  constructor(public fault: DbFault, detail?: string) {
    super(detail ? `${fault}: ${detail}` : fault)
    this.name = 'DbError'
  }
}

/** Surface storage failures to the UI instead of failing silently. */
function report(err: unknown) {
  const fault: DbFault = err instanceof DbError ? err.fault : 'failed'
  console.error('[db]', err)
  window.dispatchEvent(new CustomEvent('kalasetu:db-error', { detail: fault }))
}

/** Drop the cached connection so the next call reopens. Used by "try again". */
export function resetConnection() {
  dbPromise = null
}

/** Small promise wrapper so the rest of the file reads like normal code. */
export function run<T>(
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
  storeName: string = STORE,
): Promise<T> {
  return open().then(db => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const req = fn(tx.objectStore(storeName))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }))
}

/** Anyone who tested before this change keeps their products. Runs once. */
async function migrateFromLocalStorage(db: IDBDatabase) {
  let old: Product[] = []
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return
    old = JSON.parse(raw) as Product[]
  } catch { return }
  if (!old.length) { localStorage.removeItem(LEGACY_KEY); return }

  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    old.forEach(p => store.put(p))
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()          // a failed migration must not block the app
  })
  try { localStorage.removeItem(LEGACY_KEY) } catch { /* fine */ }
  console.info(`[db] migrated ${old.length} product(s) out of localStorage`)
}

/* ------------------------------------------------------------------ */


/** Opening the database is enough to run the migration and create stores. */
export async function openStore(): Promise<void> { await open() }
