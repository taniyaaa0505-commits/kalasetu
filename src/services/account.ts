/**
 * Getting her shop back.
 *
 * services/artisan.ts issues an identity per INSTALL and explains, at length
 * and correctly, why there is no sign-in screen on the golden path. Nothing
 * here argues with that. This is the other half of the trade it names:
 *
 *   - a reinstall, a cleared cache or a new handset orphans everything she has
 *     listed, and services/pairing.ts only rescues her while the OLD phone is
 *     still in her hand and still working;
 *   - the shop she has spent three months filling is the collateral behind the
 *     credit-history claim, and collateral that a factory reset destroys is not
 *     collateral.
 *
 * So there IS a sign-in now, and the whole design is about WHEN it is offered.
 * It is never the door. She photographs, speaks, prices and publishes exactly
 * as before, as an anonymous uid, and only once she has something worth
 * keeping does the home screen quietly offer to keep it. Asking a woman who
 * has never typed on a phone for ten digits before she has seen the app do
 * anything is how you lose her on the first screen; asking after her first
 * listing is live is asking someone who now has a reason to say yes.
 *
 * THE ONE PIECE OF LOGIC THAT MATTERS is `settle()` below. Linking a phone
 * number to the anonymous account keeps her uid, so every product already
 * stamped with it stays hers and nothing migrates. But on a REINSTALL the
 * anonymous uid is new and the number is already spoken for, and Firebase
 * answers `auth/credential-already-in-use` — which is not an error, it is the
 * recovery case, and it is the entire reason this file exists. Get that branch
 * wrong and the feature silently does the opposite of its job.
 */
import { firebaseAuth, cloudEnabled } from './firebase'
import { adoptArtisanId, forgetAdoptedId } from './artisan'

/** What we remember locally so the UI can render before auth has woken up. */
export interface Account {
  uid: string
  /** Shown back to her as proof of which shop this is. A masked number. */
  label: string
  kind: 'phone' | 'google'
}

const KEY = 'kalasetu.account'

export function accountAvailable(): boolean { return cloudEnabled() }

/** Who is signed in, synchronously, from the local mirror. */
export function currentAccount(): Account | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) as Account : null
  } catch { return null }
}

function remember(a: Account) {
  try { localStorage.setItem(KEY, JSON.stringify(a)) } catch { /* private mode */ }
}

/**
 * +91, unless she said otherwise.
 *
 * She will type the ten digits she recites to everyone else. Firebase will not
 * take them without a country code, and a field that rejects her own phone
 * number with a red message she cannot read is a dead end.
 */
export function toE164(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed.startsWith('+')) {
    const digits = '+' + trimmed.slice(1).replace(/\D/g, '')
    return digits.length >= 11 ? digits : null
  }
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 10) return '+91' + digits
  // 0-prefixed, or already carrying 91.
  if (digits.length === 11 && digits.startsWith('0')) return '+91' + digits.slice(1)
  if (digits.length === 12 && digits.startsWith('91')) return '+' + digits
  return null
}

/** Last four only, ever. The rest is not ours to print on a shared handset. */
function mask(phone: string): string {
  return '•••••• ' + phone.slice(-4)
}

/** What happened, so the screen can say the right sentence out loud. */
export type Outcome =
  /** The shop on this phone is now saved under her number. Nothing moved. */
  | 'kept'
  /** She had a shop already; this phone just became it. The app reloads. */
  | 'restored'

/**
 * Link if we can, sign in if we must.
 *
 * See the header. `linkWithCredential` is the happy path and keeps the uid —
 * but it throws the moment the credential belongs to an existing account, and
 * that throw IS the reinstall. Falling through to `signInWithCredential` hands
 * her back the old uid, and `adoptArtisanId` makes every screen use it.
 *
 * `adoptArtisanId` reloads the page, which is why it is called last and why
 * nothing here runs after it. That reload is not laziness either — the home
 * screen opens three live subscriptions keyed on the id, and re-plumbing them
 * to an observable identity for something that happens once in the life of a
 * phone is a big change to the busiest screen in the app.
 */
async function settle(
  auth: import('firebase/auth').Auth,
  cred: import('firebase/auth').AuthCredential,
  label: string,
  kind: Account['kind'],
): Promise<Outcome> {
  const { linkWithCredential, signInWithCredential } = await import('firebase/auth')
  const user = auth.currentUser

  if (user?.isAnonymous) {
    try {
      const out = await linkWithCredential(user, cred)
      remember({ uid: out.user.uid, label, kind })
      // Same uid as a second ago. Nothing to adopt and nothing to reload: her
      // products are already hers and every subscription is already right.
      return 'kept'
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code !== 'auth/credential-already-in-use' &&
          code !== 'auth/account-exists-with-different-credential') throw err
      // Not a failure. She has done this before, on a phone she no longer has.
    }
  }

  const out = await signInWithCredential(auth, cred)
  remember({ uid: out.user.uid, label, kind })
  adoptArtisanId(out.user.uid)   // reloads; nothing below this line runs
  return 'restored'
}

/* ---------------- phone ---------------- */

/**
 * The invisible reCAPTCHA Firebase insists on before it will send an SMS.
 *
 * It needs a real element in the document, so we make one and leave it there.
 * Recreated per attempt because a verifier that has already been solved once
 * cannot be reused, and reusing it fails the SECOND time she asks for a code —
 * which is exactly when she has mistyped her number and is least patient.
 */
async function verifier() {
  const { RecaptchaVerifier } = await import('firebase/auth')
  const auth = await firebaseAuth()
  let host = document.getElementById('recaptcha')
  if (!host) {
    host = document.createElement('div')
    host.id = 'recaptcha'
    host.style.display = 'none'
    document.body.appendChild(host)
  }
  return new RecaptchaVerifier(auth, host, { size: 'invisible' })
}

/** Opaque to the screen: hand it back to `confirmCode` with what she typed. */
export interface Pending { verificationId: string; phone: string }

/**
 * Send her a code. Throws with a Firebase code the screen turns into a
 * sentence — an unconfigured project and a wrong number must not look alike.
 */
export async function sendCode(rawPhone: string): Promise<Pending> {
  const phone = toE164(rawPhone)
  if (!phone) throw new Error('bad-number')
  const auth = await firebaseAuth()
  const { PhoneAuthProvider } = await import('firebase/auth')
  const v = await verifier()
  try {
    const verificationId = await new PhoneAuthProvider(auth).verifyPhoneNumber(phone, v)
    return { verificationId, phone }
  } finally {
    // Whether it worked or not, this one is spent.
    try { v.clear() } catch { /* already gone */ }
  }
}

export async function confirmCode(pending: Pending, code: string): Promise<Outcome> {
  const auth = await firebaseAuth()
  const { PhoneAuthProvider } = await import('firebase/auth')
  const cred = PhoneAuthProvider.credential(pending.verificationId, code.replace(/\D/g, ''))
  return settle(auth, cred, mask(pending.phone), 'phone')
}

/* ---------------- google ---------------- */

/**
 * The no-SMS door, and on a handset that was set up with a Google account it
 * is genuinely one tap and no keyboard — which for this user is better than
 * any number of digits, however few.
 *
 * It is also the insurance policy. Firebase's free tier meters phone sign-in
 * and has moved other products behind a card; this one does not cost anything
 * per use, so if the SMS quota is the thing that fails on demo day there is a
 * second button on the same screen that does not depend on it.
 */
export async function signInWithGoogle(): Promise<Outcome> {
  const auth = await firebaseAuth()
  const { GoogleAuthProvider, linkWithPopup, signInWithPopup } = await import('firebase/auth')
  const provider = new GoogleAuthProvider()
  const user = auth.currentUser

  if (user?.isAnonymous) {
    try {
      const out = await linkWithPopup(user, provider)
      remember({ uid: out.user.uid, label: out.user.email ?? 'Google', kind: 'google' })
      return 'kept'
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code !== 'auth/credential-already-in-use' &&
          code !== 'auth/account-exists-with-different-credential') throw err
      // She has a shop under this Google account already. Same reinstall case
      // as the phone path, and the same answer.
      const cred = GoogleAuthProvider.credentialFromError(err as never)
      if (cred) return settle(auth, cred, 'Google', 'google')
    }
  }

  const out = await signInWithPopup(auth, provider)
  remember({ uid: out.user.uid, label: out.user.email ?? 'Google', kind: 'google' })
  adoptArtisanId(out.user.uid)   // reloads
  return 'restored'
}

/* ---------------- leaving ---------------- */

/**
 * Sign out, and be honest about what it does.
 *
 * It does NOT delete her shop — the products are on the server under a uid she
 * can sign back into. But this handset goes back to being anonymous, so the
 * screen that offers this has to say "you will not see your work on this phone
 * until you sign in again" and not "sign out", which means nothing to her.
 */
export async function signOutAccount(): Promise<void> {
  try { localStorage.removeItem(KEY) } catch { /* nothing we can do */ }
  forgetAdoptedId()
  const auth = await firebaseAuth()
  const { signOut } = await import('firebase/auth')
  await signOut(auth)
  try { location.reload() } catch { /* not a browser */ }
}
