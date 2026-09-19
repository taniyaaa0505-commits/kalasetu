/**
 * Proving she is an artisan — once, and by the route the scheme already uses.
 *
 * The question a judge asks about any marketplace is "what stops a reseller in
 * Delhi listing factory goods as handmade". The obvious answer is an identity
 * document and it is the wrong one twice over. Aadhaar authentication needs an
 * AUA/KUA licence, which costs money this project does not have; and even a
 * perfect Aadhaar check proves WHO SHE IS and says nothing whatever about what
 * she made. A reseller has an Aadhaar too.
 *
 * What the scheme itself trusts is a person: an SHG leader, a cluster
 * coordinator, a CSC operator, the DRDA field staff who already know every
 * artisan in the block by name. So that is what this is. A coordinator holds a
 * code; she types it once; her shop carries "verified by <cluster>" from then
 * on, and every buyer sees it on the listing.
 *
 * WHAT THIS IS NOT: proof of identity, and not something a determined person
 * cannot forge. A code is a shared secret, so anyone who learns one can claim
 * the cluster it belongs to. What makes it worth having anyway is that the
 * code belongs to a named human being who answers for it, which is a great
 * deal more accountability than a number typed into a box.
 *
 * It is enforced in firestore.rules rather than trusted from the client: the
 * rule does a `get()` on the voucher and refuses any badge whose cluster does
 * not match a real one. That matters because Cloud Functions need a billing
 * card and we do not have one — rules are the only server-side check we get,
 * and this is the most that can be done with them.
 */
import { firestore, cloudEnabled } from './firebase'

const ARTISANS = 'artisans'
const VOUCHERS = 'vouchers'

/** The public half of an artisan: what a buyer is allowed to be told. */
export interface Verification {
  /** The cluster or organisation that vouched. Printed on the listing. */
  verifiedBy?: string
  verifiedAt?: number
  /** Which code did it. Kept because firestore.rules checks it on every write. */
  voucher?: string

  /*
   * Her hands at work, photographed with the app's own camera.
   *
   * The other half of "how do you know she made it", and the half a reseller
   * cannot produce. A warehouse in Delhi can photograph a factory pot on a
   * white sheet; it cannot photograph the pot being made, and it certainly
   * cannot do it on demand, on the spot, in the app.
   *
   * ONCE PER ARTISAN, not per product, and skippable. It is the maker being
   * evidenced, not each pot — and a woman who is alone and cannot hold a
   * phone while she works must not be locked out of her own shop over it.
   * Asked at her first listing, offered again on any later one until she
   * either gives it or stops being asked.
   *
   * Small on purpose: this rides in one Firestore document, and it is shown
   * at about 200px next to the listing.
   */
  craftPhoto?: string
  craftPhotoAt?: number
  /** What the model made of it — see checkCraftPhoto in services/gemini.ts. */
  craftAtWork?: boolean
  craftWhy?: string
}

export function verifyAvailable(): boolean { return cloudEnabled() }

/** Read one artisan's badge. Undefined when there is none — the common case. */
export async function getVerification(artisan: string): Promise<Verification | undefined> {
  if (!cloudEnabled() || !artisan) return undefined
  try {
    const db = await firestore()
    const { doc, getDoc } = await import('firebase/firestore')
    const snap = await getDoc(doc(db, ARTISANS, artisan))
    return snap.exists() ? snap.data() as Verification : undefined
  } catch (err) {
    // A badge is decoration on every screen that shows it. It may never be the
    // reason a listing fails to render.
    console.warn('[verify] could not read a badge', err)
    return undefined
  }
}

/**
 * Store her proof-of-making photograph.
 *
 * Merged like the vouch is, for the same reason: this document is her public
 * record and other things land on it. Written by her own device under her own
 * uid, which is all firestore.rules allows.
 */
export async function saveCraftProof(
  artisan: string, photo: string, verdict?: { atWork: boolean; why: string },
): Promise<void> {
  if (!cloudEnabled() || !artisan) return
  const db = await firestore()
  const { doc, setDoc } = await import('firebase/firestore')
  const proof: Verification = {
    craftPhoto: photo,
    craftPhotoAt: Date.now(),
    ...(verdict ? { craftAtWork: verdict.atWork, craftWhy: verdict.why } : {}),
  }
  await setDoc(doc(db, ARTISANS, artisan), proof, { merge: true })
}

/**
 * Redeem a coordinator's code.
 *
 * Returns the cluster name on success and null for a code that does not exist,
 * which the screen says in words — a mistyped digit is not an exceptional
 * event and must not throw.
 *
 * Deliberately NOT spent on use. One coordinator
 * verifies a room full of women from the same code in an afternoon, and a code
 * that died on the first of them would mean nineteen more trips to whoever
 * mints them.
 */
export async function redeemVoucher(artisan: string, raw: string): Promise<string | null> {
  const code = raw.trim().toUpperCase()
  if (!code || !cloudEnabled()) return null

  const db = await firestore()
  const { doc, getDoc, setDoc } = await import('firebase/firestore')

  const snap = await getDoc(doc(db, VOUCHERS, code))
  if (!snap.exists()) return null
  const cluster = (snap.data() as { cluster?: string }).cluster
  if (!cluster) return null

  /*
   * Merged, not replaced. This document is the artisan's public record and
   * other things will land on it later — the craft she works in, a Pehchan
   * card number when that arrives. A verification must not be the write that
   * erases them.
   *
   * Awaited, because someone is standing
   * next to her waiting to see the badge appear.
   */
  await setDoc(
    doc(db, ARTISANS, artisan),
    { verifiedBy: cluster, verifiedAt: Date.now(), voucher: code } satisfies Verification,
    { merge: true },
  )
  return cluster
}
