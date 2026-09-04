/**
 * The languages we support.
 *
 * `asr` is what we hand the browser's speech recogniser, and it is NOT always
 * the same as `code`. Chrome's speech API has no Maithili model, so Maithili
 * speech goes in as Hindi — the two are close enough that the transcript comes
 * out usable, and Gemini cleans up the rest. Be honest about this if asked:
 * proper Maithili ASR needs Bhashini or Whisper, which is a later task.
 *
 * `sample` is spoken aloud when she taps the language, so she can confirm by
 * ear that she picked the right one. She cannot read the label.
 */
export const LANGS = [
  { code: 'hi-IN',  asr: 'hi-IN', label: 'हिंदी',   english: 'Hindi',    sample: 'नमस्ते, यह हिंदी है' },
  { code: 'en-IN',  asr: 'en-IN', label: 'English', english: 'English',  sample: 'Hello, this is English' },
  { code: 'mai-IN', asr: 'hi-IN', label: 'मैथिली',  english: 'Maithili', sample: 'प्रणाम, ई मैथिली थिक' },
  { code: 'bn-IN',  asr: 'bn-IN', label: 'বাংলা',   english: 'Bengali',  sample: 'নমস্কার, এটি বাংলা' },
  { code: 'mr-IN',  asr: 'mr-IN', label: 'मराठी',   english: 'Marathi',  sample: 'नमस्कार, ही मराठी आहे' },
  { code: 'ta-IN',  asr: 'ta-IN', label: 'தமிழ்',   english: 'Tamil',    sample: 'வணக்கம், இது தமிழ்' },
] as const

export type LangCode = typeof LANGS[number]['code']

/** What to hand the speech recogniser for a given language. */
export function asrCode(code: LangCode): string {
  return LANGS.find(l => l.code === code)?.asr ?? 'hi-IN'
}

/** What the AI gives us back after seeing the photo + hearing the voice note. */
export interface Listing {
  craft: string            // e.g. "Madhubani painting"
  material: string         // e.g. "handmade paper, natural dye"
  titleEn: string
  titleHi: string
  descriptionEn: string
  descriptionHi: string
  keywords: string[]
  /** Anything the AI was NOT sure about becomes a spoken question to the artisan. */
  questions: string[]
}

/**
 * One thing she told us after seeing the first draft — either an answer to a
 * question the AI asked, or something it never thought to ask.
 *
 * This is the other half of the anti-hallucination rule: the model is told to
 * ask instead of guessing, so there has to be a way to answer. Her answers go
 * back into the next `generateListing` call as heard speech, which is the only
 * kind of fact the model is allowed to use.
 */
export interface Answer {
  /** The question exactly as the AI asked it. Empty for a free-form addition. */
  question: string
  /** What she said, in her own language. */
  answer: string
}

/** Three numbers, always. The floor is the point — she never prices below her own labour. */
export interface PriceSuggestion {
  floor: number            // material + labour at a dignified wage
  marketLow: number
  marketHigh: number
  suggested: number
  /** Plain-language reason, read aloud. e.g. "higher because Diwali is near" */
  reason: string
}

/** Raw numbers the artisan gives us (by voice or by tapping +/-) to compute the floor. */
export interface CostInput {
  materialCost: number     // rupees spent on raw material
  hours: number            // hours of work
}

export interface Product {
  id: string
  createdAt: number
  status: 'draft' | 'published'
  lang: LangCode

  photo?: string           // original, as a data URL
  cleanPhoto?: string      // background removed, white bg
  transcript?: string      // what she said, as text
  answers?: Answer[]       // what she added after reading back the first draft
  cost?: CostInput
  listing?: Listing
  price?: PriceSuggestion
}

/**
 * One turn of a conversation between an artisan and a buyer.
 *
 * We keep BOTH renderings of every message rather than translating on the
 * fly, so each side always has something to show even when the network is
 * gone, and so a translation is never recomputed twice.
 */
export interface Message {
  id: string
  productId: string
  from: 'artisan' | 'buyer'
  createdAt: number
  /** Exactly what they said or typed, untouched. */
  source: string
  sourceLang: string
  /** The same message in each side's language. */
  english: string
  local: string
  localLang: LangCode
  /** True while we are still offline and have not translated it yet. */
  untranslated?: boolean
}

/**
 * A bulk order from a B2B buyer.
 *
 * The problem statement asks us to "connect directly with larger B2B buyers",
 * so orders carry a quantity and a lead time — a corporate gifting company
 * ordering 200 diyas is the case we design for, not one person buying one.
 */
export type OrderStatus = 'placed' | 'accepted' | 'declined' | 'shipped' | 'delivered'

export interface Order {
  id: string
  productId: string
  createdAt: number
  updatedAt: number
  status: OrderStatus

  quantity: number
  unitPrice: number
  total: number

  buyerName: string
  buyerOrg?: string
  /** The buyer's note, kept in both languages like a chat message. */
  note?: string
  noteLocal?: string
  /** When the buyer needs it, as a timestamp. */
  needBy?: number

  /** How many days she says it will take, once she accepts. */
  leadTimeDays?: number
}
