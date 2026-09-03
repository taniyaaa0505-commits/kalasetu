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
}): Promise<Message> {
  const { productId, from, text, localLang } = opts
  const sourceLang = from === 'buyer' ? 'en-IN' : localLang

  const base: Message = {
    id: newId(), productId, from, createdAt: Date.now(),
    source: text, sourceLang,
    english: from === 'buyer' ? text : '',
    local:   from === 'buyer' ? '' : text,
    localLang,
  }

  if (!isOnline()) {
    return put({ ...base, untranslated: true,
      english: base.english || text, local: base.local || text })
  }

  try {
    const other = from === 'buyer'
      ? await translate(text, 'English', languageName(localLang))
      : await translate(text, languageName(localLang), 'English')
    return put(from === 'buyer' ? { ...base, local: other } : { ...base, english: other })
  } catch {
    // A failed translation must never swallow the message.
    return put({ ...base, untranslated: true,
      english: base.english || text, local: base.local || text })
  }
}

/** Retry anything that was stored without a translation. */
export async function translatePending(productId: string): Promise<number> {
  if (!isOnline()) return 0
  const pending = (await listMessages(productId)).filter(m => m.untranslated)
  let done = 0
  for (const m of pending) {
    try {
      const other = m.from === 'buyer'
        ? await translate(m.source, 'English', languageName(m.localLang))
        : await translate(m.source, languageName(m.localLang), 'English')
      await put(m.from === 'buyer'
        ? { ...m, local: other, untranslated: false }
        : { ...m, english: other, untranslated: false })
      done++
    } catch { /* leave it pending, try again later */ }
  }
  return done
}

function languageName(code: LangCode): string {
  const map: Record<string, string> = {
    'hi-IN': 'Hindi', 'en-IN': 'English', 'mai-IN': 'Maithili',
    'bn-IN': 'Bengali', 'mr-IN': 'Marathi', 'ta-IN': 'Tamil',
  }
  return map[code] ?? 'Hindi'
}
