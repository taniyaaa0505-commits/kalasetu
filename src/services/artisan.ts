/**
 * Who made this. One line of identity, and no screen for it.
 *
 * The impact dashboard could not answer the Ministry's first question — how
 * many artisans — because a product had no owner. Nothing in the data model
 * said whose work it was, so one device was one artisan and the figure could
 * not be aggregated at all.
 *
 * The obvious fix is a sign-in, and the obvious fix is wrong. This app is for
 * someone who cannot read the word "email", has never typed on a phone, and
 * may be holding a handset that belongs to her son. A login screen would stop
 * her at the door — and it would stop her at the door for OUR benefit, to
 * populate a metric on a dashboard she will never open.
 *
 * So: anonymous auth. Firebase hands the device a stable, server-issued uid
 * with no interface at all — nothing to read, nothing to type, nothing to
 * remember. She never learns it exists.
 *
 * WHAT THIS HONESTLY COUNTS: devices, not people. Clearing app storage or
 * reinstalling produces a new artisan; two women sharing one phone are one.
 * That is a real limit and the dashboard prints it rather than hiding behind
 * the word "users". Upgrading to a phone-number sign-in later would fix both,
 * and would cost her a keyboard — which is a trade to make in a pilot with
 * field staff present, not in a product she opens alone.
 */
import { cloudEnabled } from './firebase'

const KEY = 'kalasetu.artisan'

/** Same shape as an auth uid, for the no-cloud path. */
function localId(): string {
  try {
    const existing = localStorage.getItem(KEY)
    if (existing) return existing
    const made = 'local_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem(KEY, made)
    return made
  } catch {
    // Private mode, or storage blocked. A per-session id is still better than
    // none: her products stay attributed to each other while the app is open.
    return 'local_session'
  }
}

let pending: Promise<string> | null = null

/**
 * The current artisan's id. Cached, so the second call is free.
 *
 * Never throws and never blocks the golden path. If auth fails — offline on
 * first run, a blocked popup, a misconfigured project — we fall back to the
 * device-local id rather than refusing to let her photograph a pot.
 */
export function artisanId(): Promise<string> {
  if (!pending) {
    pending = (async () => {
      if (!cloudEnabled()) return localId()
      try {
        const { initializeApp, getApps, getApp } = await import('firebase/app')
        const { getAuth, signInAnonymously, onAuthStateChanged } = await import('firebase/auth')
        const app = getApps().length ? getApp() : initializeApp({
          apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
          authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
          storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
          appId: import.meta.env.VITE_FIREBASE_APP_ID,
        })
        const auth = getAuth(app)

        // An existing session restores itself; only a first run signs in.
        const already = await new Promise<string | null>(resolve => {
          const off = onAuthStateChanged(auth, u => { off(); resolve(u?.uid ?? null) })
        })
        if (already) return already

        const cred = await signInAnonymously(auth)
        return cred.user.uid
      } catch (err) {
        console.warn('[artisan] anonymous sign-in unavailable; using a device id:', err)
        return localId()
      }
    })()
  }
  return pending
}
