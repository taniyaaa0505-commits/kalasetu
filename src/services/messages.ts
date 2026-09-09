/**
 * The conversation between an artisan and a buyer.
 *
 * The whole point of this feature: she speaks Maithili, he reads English,
 * and neither of them needs a middleman to sit between them. So every
 * message is stored in both languages and each side is only ever shown
 * the one it can understand.
 */
import { collection, MSG_STORE } from './store'
import { translate } from './gemini'
import { isOnline } from './queue'
import { getProduct } from './db'
import type { Message, LangCode } from '../types'

/** A message redraws when it arrives, or when its translation lands. */
const messages = collection<Message>(MSG_STORE, m => `${m.id}:${m.untranslated ? 0 : 1}`)

export async function listMessages(productId: string): Promise<Message[]> {
  const all = await messages.list()
  return all
    .filter(m => m.productId === productId)
    .sort((a, b) => a.createdAt - b.createdAt)
}

export async function countMessages(productId: string): Promise<number> {
  return (await listMessages(productId)).length
}

async function put(m: Message): Promise<Message> {
  await messages.put(m)
  return m
}

/** Watch one product's conversation. Returns an unsubscribe. */
export function subscribeMessages(productId: string, cb: (items: Message[]) => void): () => void {
  return messages.subscribe(all => cb(
    all.filter(m => m.productId === productId).sort((a, b) => a.createdAt - b.createdAt),
  ))
}

/**
 * Watch every message on work SHE made, across all her products.
 *
 * The home screen had no subscription to messages at all. It counted them once,
 * inside the products subscription, so a count only ever refreshed when the
 * PRODUCTS collection changed — which a new message does not do. A buyer could
 * write and she would be told nothing until something else redrew the screen,
 * and the thing that usually did was the same buyer giving up and placing an
 * order. Orders have had their own live subscription all along; this is the
 * matching one.
 */
export function subscribeMyMessages(
  artisan: string, cb: (items: Message[]) => void,
): () => void {
  return messages.subscribe(
    all => cb([...all].sort((a, b) => a.createdAt - b.createdAt)),
    { field: 'artisanId', equals: artisan },
  )
}

/** Every message on a product. Used when the product itself is removed —
 *  a conversation about something that no longer exists is just litter. */
export async function deleteMessagesFor(productId: string): Promise<number> {
  const msgs = await listMessages(productId)
  for (const m of msgs) await messages.remove(m.id)
  return msgs.length
}

function newId() {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Send a message. `text` is in the sender's own language; we fill in the
 * other side's rendering by translating.
 *
 * If we are offline the message still sends — it is stored with the
 * translation missing and marked, rather than being lost or blocked.
 */
export async function sendMessage(opts: {
  productId: string
  from: 'artisan' | 'buyer'
  text: string
  localLang: LangCode          // the artisan's language for this conversation
  /** Whose work it is. Pass it if the caller already has the product. */
  artisanId?: string
}): Promise<Message> {
  const { productId, from, text, localLang } = opts
  const sourceLang = from === 'buyer' ? 'en-IN' : localLang

  // Whose work this is about. Stamped from the product exactly as an order
  // stamps it, so the message can be routed to her phone without reading the
  // whole shop. Undefined on products made before sign-in existed; the store
  // drops the key rather than writing an undefined Firestore refuses.
  //
  // Not re-read when the caller already has it — see placeOrder for why a
  // one-string lookup is worth avoiding when the document carries photographs.
  const artisan = opts.artisanId ?? (await getProduct(productId))?.artisanId

  const base: Message = {
    id: newId(), productId, artisanId: artisan, from, createdAt: Date.now(),
    source: text, sourceLang,
    english: from === 'buyer' ? text : '',
    local:   from === 'buyer' ? '' : text,
    localLang,
  }

  /*
   * Stored FIRST, in one language, marked — and the translation happens after.
   *
   * This used to await Gemini and only then write the message, so pressing
   * Send did nothing visible until a round trip came back. Measured against
   * our own key: 4 seconds warm, 23 seconds cold. Twenty-three seconds of a
   * disabled button and an empty thread, for a message the app already had in
   * its hand — which is indistinguishable from a chat that does not work, and
   * is exactly what was reported.
   *
   * It is the same mistake orders.ts made with the buyer's note and fixed for
   * the same reason: the translation is the part that can be slow, and it is
   * the part nobody is waiting on. She reads the message when she opens her
   * phone; he has just typed his and knows what it says. Both of them get the
   * message on screen now, and the other language lands underneath it a few
   * seconds later, live, through the subscription that is already open.
   */
  const saved = await put({ ...base, untranslated: true,
    english: base.english || text, local: base.local || text })

  if (isOnline()) void translateOne(saved)
  return saved
}

/** How long a translation gets before the message stays in one language. */
const TRANSLATE_MS = 10000

/**
 * How long an untranslated message is still fairly described as "translating".
 *
 * The screens draw a message the moment it is sent, before its other language
 * exists, so for a few seconds "could not translate" would be a lie about work
 * that is still in the air. Past this, it is the truth.
 */
export const TRANSLATING_WINDOW_MS = TRANSLATE_MS + 2000

/** How long to leave a message alone after a translation attempt failed. */
const RETRY_AFTER_MS = 30000

/** Translations running right now, and ones that just failed. Both exist to
 *  stop the screens — which call translatePending on every redraw that
 *  contains an untranslated message — from stacking requests on the same
 *  message or hammering a key that is already refusing. */
const inFlight = new Set<string>()
const failedAt = new Map<string, number>()

/**
 * Fill in the other language for one message. Never throws: a message with a
 * translation missing is a state the UI already draws, not an error.
 */
async function translateOne(m: Message): Promise<boolean> {
  if (inFlight.has(m.id)) return false
  const failed = failedAt.get(m.id)
  if (failed && Date.now() - failed < RETRY_AFTER_MS) return false

  inFlight.add(m.id)
  try {
    const other = await Promise.race([
      m.from === 'buyer'
        ? translate(m.source, 'English', languageName(m.localLang))
        : translate(m.source, languageName(m.localLang), 'English'),
      new Promise<never>((_, no) =>
        setTimeout(() => no(new Error('translate timed out')), TRANSLATE_MS)),
    ])
    // Re-read rather than writing the object we captured: the same message may
    // have been rewritten while this was in the air.
    const latest = (await messages.get(m.id)) ?? m
    await put(latest.from === 'buyer'
      ? { ...latest, local: other, untranslated: false }
      : { ...latest, english: other, untranslated: false })
    failedAt.delete(m.id)
    return true
  } catch (err) {
    console.warn('[messages] left untranslated:', err)
    failedAt.set(m.id, Date.now())
    return false
  } finally { inFlight.delete(m.id) }
}

/** Retry anything that was stored without a translation. */
export async function translatePending(productId: string): Promise<number> {
  if (!isOnline()) return 0
  const pending = (await listMessages(productId)).filter(m => m.untranslated)
  let done = 0
  for (const m of pending) if (await translateOne(m)) done++
  return done
}

function languageName(code: LangCode): string {
  const map: Record<string, string> = {
    'hi-IN': 'Hindi', 'en-IN': 'English', 'mai-IN': 'Maithili',
    'bn-IN': 'Bengali', 'mr-IN': 'Marathi', 'ta-IN': 'Tamil',
  }
  return map[code] ?? 'Hindi'
}
