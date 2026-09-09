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

/**
 * An identity this phone was TOLD to use, rather than the one it was issued.
 *
 * Set by services/pairing.ts when she joins her own shop from a second device.
 * It outranks the anonymous uid below, and it survives a reinstall of the web
 * app because it is hers now, not the install's.
 */
const ADOPTED = 'kalasetu.artisan.adopted'

function adopted(): string | null {
  try { return localStorage.getItem(ADOPTED) } catch { return null }
}

/**
 * Use somebody else's id from now on — hers, from her other phone.
 *
 * The reload is deliberate and it is not laziness. Three separate effects on
 * the home screen open live subscriptions keyed on the id, each on mount, and
 * every list and count in the app hangs off them. Re-plumbing all of that to
 * an observable identity, for an action taken once in the life of a phone
 * with a person standing next to her, would be a large change to the busiest
 * screen in the app to save a second she is expecting anyway.
 */
export function adoptArtisanId(id: string) {
  try { localStorage.setItem(ADOPTED, id) } catch { /* nothing we can do */ }
  pending = Promise.resolve(id)
  try { location.reload() } catch { /* not a browser; the cache above is enough */ }
}

/** Undo a pairing: go back to whatever this install was issued. */
export function forgetAdoptedId() {
  try { localStorage.removeItem(ADOPTED) } catch { /* nothing we can do */ }
  pending = null
}

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
 * How long identity may hold up the app: not long.
 *
 * Offline, `signInAnonymously` does not fail — it waits, for as long as the
 * network might come back, which is forever. That is fine for a background
 * concern and fatal for this one, because the id is needed at the exact moment
 * she takes her first photograph. Reported from a real phone with the network
 * off: the camera returns, and the app never reaches the cleaning screen.
 *
 * Nothing about a metric may ever stand between her and the next screen. So
 * there is a ceiling, and then the device id.
 *
 * Six seconds, not two. A cold sign-in has to load the auth module and make a
 * round trip, and two seconds cut it off on a perfectly good connection —
 * every product came out owned by `local_…` instead of a real uid. The wait
 * costs her nothing because `warmArtisanId()` runs at startup: by the time she
 * has framed a photograph it is long since cached, and offline the six seconds
 * elapse in the background with nobody waiting on them.
 */
const AUTH_TIMEOUT_MS = 6000

function within<T>(work: Promise<T>, ms: number, fallback: () => T): Promise<T> {
  return Promise.race([
    work,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback()), ms)),
  ])
}

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
      // An id she paired to wins over the one this install was handed. It is
      // the only way the same woman on two devices is one artisan.
      const chosen = adopted()
      if (chosen) return chosen
      if (!cloudEnabled()) return localId()
      return within(signIn(), AUTH_TIMEOUT_MS, localId)
    })()
  }
  return pending
}

/** True when this phone is running somebody else's — her own — identity. */
export function isPaired(): boolean {
  return adopted() !== null
}

async function signIn(): Promise<string> {
  {
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
  }
}

/**
 * Ask for the id early, so it is already cached when it is needed.
 *
 * Called once at startup. Nothing waits on it — the timeout above is what
 * guarantees the golden path, and this only makes the common case instant.
 */
export function warmArtisanId() { void artisanId() }
