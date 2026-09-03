/**
 * Firebase, if it has been configured.
 *
 * The whole app must keep working without it. A teammate who clones the repo
 * and runs `npm run dev` with no `.env` gets the on-device store and every
 * screen still works — they simply cannot see anyone else's products.
 *
 * So nothing here throws when config is absent. `cloudEnabled()` answers the
 * question, and the storage services branch on it.
 */
import type { FirebaseApp } from 'firebase/app'
import type { Firestore } from 'firebase/firestore'

const CONFIG = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

/** Only projectId and apiKey are load-bearing for Firestore. */
export function cloudEnabled(): boolean {
  return Boolean(CONFIG.apiKey && CONFIG.projectId)
}

let dbPromise: Promise<Firestore> | null = null

/**
 * Loads the SDK lazily, so the ~200 KB of Firestore never reaches a phone
 * that is running without cloud config.
 */
export function firestore(): Promise<Firestore> {
  if (!cloudEnabled()) return Promise.reject(new Error('Firebase is not configured'))
  if (!dbPromise) {
    dbPromise = (async () => {
      const { initializeApp, getApps, getApp } = await import('firebase/app')
      const {
        initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
      } = await import('firebase/firestore')

      const app: FirebaseApp = getApps().length ? getApp() : initializeApp(CONFIG)

      // Firestore's own offline cache replaces what IndexedDB was doing for us:
      // writes land locally first and sync when the signal returns, which is
      // the whole offline story. The multi-tab manager matters because the
      // demo runs her app and the buyer page side by side.
      return initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      })
    })().catch(err => { dbPromise = null; throw err })
  }
  return dbPromise
}
