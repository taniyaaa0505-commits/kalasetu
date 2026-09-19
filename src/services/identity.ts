/**
 * A name for the thing itself.
 *
 * Everything else in this app identifies a PERSON — her phone number, her
 * anonymous uid, the coordinator who vouches for her. None of it identifies
 * the pot. So when a second seller photographs the same pot and lists it, the
 * app has nothing to say: two listings, two accounts, both sincere-looking,
 * and the woman who actually made it has no way to point at it and say that
 * one is mine.
 *
 * This gives the object a permanent name and writes down who first claimed
 * it. Two ideas, kept apart on purpose:
 *
 *   ORIGINAL MAKER  — who registered it first. Never changes. Not ever.
 *   CURRENT OWNER   — who holds it now. A cooperative, a shop, a reseller.
 *
 * A reseller is not a criminal. Most of the handicraft trade is people buying
 * finished work and selling it on, and that is allowed here: the second
 * seller becomes the owner and the maker's name stays on the card. What is no
 * longer possible is doing it SILENTLY.
 *
 * WHAT THIS IS NOT, and the card says so out loud: proof. A perceptual hash
 * recognises the same photograph of the same object, not the object. Two pots
 * off the same wheel look alike; a different photograph of the same pot may
 * not match. It is a flag for a human to look at, and it never blocks a sale.
 */
import { collection } from './store'
import { REGISTRY_STORE } from './idb'

/**
 * One registered product.
 *
 * Deliberately small: no full photograph, no transcript, no price. Every
 * device that checks for a conflict reads this whole collection, and the
 * product documents it points at carry two base64 images each — reading those
 * to compare hashes would be megabytes for sixty-four bits.
 */
export interface Registration {
  /** 'ART-A72F9'. The code on the card, and the document id. */
  id: string
  /** The product it names, in this app's own ids. */
  productId: string
  /** Who first registered it. IMMUTABLE — enforced in firestore.rules. */
  makerId: string
  /** Who holds it now. Starts as the maker; changes on a declared transfer. */
  ownerId: string
  ownerSince?: number
  registeredAt: number
  /** 64-bit difference hash of the product photograph, as 16 hex characters. */
  phash: string
  /** A small photograph for the public card — about 12 KB, not the 200 KB one. */
  thumb?: string
  title?: string
  craft?: string
  material?: string
  /** Was there work-in-progress evidence on file when this was registered? */
  evidence: boolean
  /** Registered anyway, over a conflict. Recorded rather than hidden. */
  conflictWith?: string
  /** False when the conflict check could not run — offline, usually. */
  checked: boolean
}

const registry = collection<Registration>(REGISTRY_STORE, r => `${r.id}:${r.ownerId}`)

/* ---------------- the code ---------------- */

/**
 * No I, O, 0, 1 — the four characters that ruin a code read aloud across a
 * room or copied off a cracked screen. Same alphabet as the coordinator
 * vouchers, for the same reason.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function productCode(): string {
  const bytes = new Uint8Array(5)
  crypto.getRandomValues(bytes)
  return 'ART-' + Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('')
}

/**
 * A public name for a maker that is not her name.
 *
 * The card is a public page. Her phone number, her uid and her address are
 * not going on it — but "someone made this" is not an attribution either. So:
 * four stable characters derived from her id, which identify the same maker
 * across every product she registers and identify her to nobody.
 */
export function makerLabel(uid: string | undefined): string {
  if (!uid) return 'Unknown maker'
  let h = 0
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0
  let out = ''
  for (let i = 0; i < 4; i++) { out += ALPHABET[h % ALPHABET.length]; h = Math.floor(h / ALPHABET.length) }
  return `Artisan ${out}`
}

/* ---------------- the hash ---------------- */

/**
 * A difference hash of the photograph: 64 bits, as 16 hex characters.
 *
 * Shrink to 9x8 grey, then ask of each pixel "is it brighter than the one to
 * its right?". That question survives what a phone camera does to a photograph
 * — exposure, white balance, scale, mild rotation — and changes completely for
 * a different object. It is eight lines of arithmetic, it runs on the device,
 * it needs no model and no network, and it is the whole reason this feature
 * can exist inside a free tier.
 *
 * Computed on the cut-out where we have one: the background is already gone
 * and the frame already square, so two photographs of the same pot on
 * different floors hash alike.
 */
export async function perceptualHash(dataUrl: string): Promise<string> {
  const img = new Image()
  img.src = dataUrl
  await img.decode()

  const W = 9, H = 8
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, W, H)
  const { data } = ctx.getImageData(0, 0, W, H)

  const grey = (i: number) => 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]

  let bits = ''
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W - 1; x++) {
      bits += grey(y * W + x) > grey(y * W + x + 1) ? '1' : '0'
    }
  }
  // 64 bits -> 16 hex characters, in nibbles.
  let hex = ''
  for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16)
  return hex
}

/** How many of the 64 bits differ. 0 is the same photograph. */
export function distance(a: string, b: string): number {
  if (a.length !== b.length) return 64
  let n = 0
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16)
    while (x) { n += x & 1; x >>= 1 }
  }
  return n
}

/**
 * Where "this might be the same product" begins.
 *
 * Ten bits of sixty-four. Tuned to be generous about the same object
 * photographed twice and still clear of two different pots — and it errs
 * towards asking, because the answer to a flag here is a human looking at two
 * photographs, not a refusal.
 */
export const LIKELY_MATCH = 10

/* ---------------- registering ---------------- */

export interface RegisterResult {
  registration: Registration
  /** Everything that looked like the same product. Shown, never acted on. */
  conflicts: Registration[]
}

export async function listRegistry(): Promise<Registration[]> {
  try { return await registry.list() } catch { return [] }
}

export async function getRegistration(code: string): Promise<Registration | undefined> {
  try { return await registry.get(code.toUpperCase()) } catch { return undefined }
}

export async function registrationFor(productId: string): Promise<Registration | undefined> {
  return (await listRegistry()).find(r => r.productId === productId)
}

/**
 * Give a product its name.
 *
 * Nothing here can fail in a way that stops her selling: the conflict check is
 * a read that is allowed to come back empty (offline is the ordinary case),
 * and the registration is written local-first like everything else. If the
 * check could not run, `checked` says so on the card rather than the card
 * implying a clean result it never got.
 */
export async function registerProduct(input: {
  productId: string
  photo: string
  makerId: string
  title?: string
  craft?: string
  material?: string
  thumb?: string
  evidence?: boolean
}): Promise<RegisterResult> {
  const existing = await registrationFor(input.productId)
  if (existing) return { registration: existing, conflicts: [] }

  const phash = await perceptualHash(input.photo)

  let conflicts: Registration[] = []
  let checked = false
  try {
    const all = await registry.list()
    checked = true
    conflicts = all
      .filter(r => r.productId !== input.productId && distance(r.phash, phash) <= LIKELY_MATCH)
      .sort((a, b) => distance(a.phash, phash) - distance(b.phash, phash))
  } catch {
    // Offline, or the registry could not be read. She registers anyway.
  }

  const registration: Registration = {
    id: productCode(),
    productId: input.productId,
    makerId: input.makerId,
    ownerId: input.makerId,
    registeredAt: Date.now(),
    phash,
    thumb: input.thumb,
    title: input.title,
    craft: input.craft,
    material: input.material,
    evidence: Boolean(input.evidence),
    checked,
    ...(conflicts.length ? { conflictWith: conflicts[0].id } : {}),
  }
  await registry.put(registration)
  return { registration, conflicts }
}

/**
 * Say out loud that this piece changed hands.
 *
 * The honest path out of a conflict, and the reason a conflict is not an
 * accusation: a shop or a cooperative that bought the piece records itself as
 * the owner, and the maker's name stays where it is, permanently. Only these
 * two fields may move — firestore.rules enforces that, so an owner cannot
 * quietly become the maker.
 */
export async function transferTo(code: string, newOwner: string): Promise<Registration | undefined> {
  const r = await getRegistration(code)
  if (!r) return undefined
  const next: Registration = { ...r, ownerId: newOwner, ownerSince: Date.now() }
  await registry.put(next)
  return next
}

/** The link a QR code carries. Public, and safe to print on a tag. */
export function cardUrl(code: string): string {
  const base = location.href.split('#')[0]
  return `${base}#/card/${code}`
}
