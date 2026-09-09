/**
 * Two phones, one shop.
 *
 * services/artisan.ts issues an identity per INSTALL — an anonymous uid with
 * no screen, which is the right trade for someone who cannot read the word
 * "email". The cost of that trade is this file. An install is not a person:
 *
 *   - the PWA in her browser and the APK on the same handset are two artisans,
 *     so work listed in one is invisible in the other, and an order placed
 *     against a product made in one will never reach the other;
 *   - clearing app data or reinstalling orphans everything she has listed;
 *   - a demo on two devices — her phone and a buyer's laptop — cannot be set
 *     up at all without one of them being the wrong artisan.
 *
 * A sign-in fixes all three and costs her a keyboard. This is the cheaper
 * trade: her phone shows six digits, the other phone types them, and from then
 * on both are the same artisan. Nothing to remember, nothing to store, nothing
 * to lose — the code is dead half an hour later.
 *
 * WHAT THIS IS NOT: security. Six digits guessed correctly inside the window
 * would join a stranger's shop, and the database is open to begin with. It is
 * a pairing mechanism for a pilot with people in the room, and the honest fix
 * for both problems is the same one — a real sign-in — when there is a reason
 * to ask her to type.
 */
import { firestore, cloudEnabled } from './firebase'
import { artisanId, adoptArtisanId } from './artisan'

const COLL = 'pairs'

/** How long a code is worth typing. Short on purpose — see the note above. */
export const PAIR_TTL_MS = 30 * 60 * 1000

/** Six digits: sayable out loud across a room, and typable on a number pad. */
function sixDigits(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function pairingAvailable(): boolean {
  return cloudEnabled()
}

/**
 * Make a code for THIS phone's shop.
 *
 * Retries on a collision rather than trusting one in a million, because a
 * collision here does not look like an error — it looks like her shop opening
 * on a stranger's phone.
 */
export async function createPairingCode(): Promise<string> {
  if (!cloudEnabled()) throw new Error('pairing needs a connection')
  const me = await artisanId()
  const db = await firestore()
  const { doc, getDoc, setDoc } = await import('firebase/firestore')

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = sixDigits()
    const ref = doc(db, COLL, code)
    const existing = await getDoc(ref)
    if (existing.exists() && !expired(existing.data() as Pair)) continue

    // Awaited, unlike every other write in the app: she is about to read this
    // code aloud to someone, so it had better be on the server before she
    // does. The offline-first rule that governs her listings does not apply to
    // a handshake between two devices, which is worthless offline anyway.
    await setDoc(ref, { artisanId: me, createdAt: Date.now() } satisfies Pair)
    return code
  }
  throw new Error('could not make a code — try again')
}

/**
 * Join the shop a code belongs to.
 *
 * Returns false for a code that is wrong or stale, which the screen says in
 * words rather than throwing — a mistyped digit is not an exceptional event.
 */
export async function redeemPairingCode(raw: string): Promise<boolean> {
  const code = raw.replace(/\D/g, '')
  if (code.length !== 6 || !cloudEnabled()) return false

  const db = await firestore()
  const { doc, getDoc, deleteDoc } = await import('firebase/firestore')
  const ref = doc(db, COLL, code)
  const snap = await getDoc(ref)
  if (!snap.exists()) return false

  const pair = snap.data() as Pair
  if (expired(pair) || !pair.artisanId) return false

  /*
   * Spent on use, and spent BEFORE we adopt.
   *
   * Six digits is a small space to guess in, and a code that stays valid for
   * half an hour after it has already done its job is thirty minutes of open
   * door for no benefit — pairing a third phone costs one tap on a new code.
   * Before, not after, because adopting reloads the page and would take any
   * pending delete down with it. Awaited but not required: if the delete
   * fails she still gets her shop, and the code still expires on its own.
   */
  await deleteDoc(ref).catch(err => console.warn('[pairing] code not cleared', err))

  adoptArtisanId(pair.artisanId)
  return true
}

interface Pair { artisanId: string; createdAt: number }

function expired(p: Pair): boolean {
  return Date.now() - (p.createdAt ?? 0) > PAIR_TTL_MS
}
