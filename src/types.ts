/**
 * The languages we support.
 *
 * `asr` is what we hand the browser's speech recogniser, and it is NOT always
 * the same as `code`. It is not always: a language the interface exists in may
 * be one no browser can hear, and then something honest has to happen — see
 * the note on Gujarati in lib/locales/gu.ts for why there is no longer such a
 * language on this list. Kept because the next one added may well be.
 *
 * (Historically: Chrome's speech API has no Maithili model, so Maithili
 * speech goes in as Hindi — the two are close enough that the transcript comes
 * out usable, and Gemini cleans up the rest. Be honest about this if asked:
 * proper Maithili ASR needs Bhashini or Whisper, which is a later task.)
 *
 * `sample` is spoken aloud when she taps the language, so she can confirm by
 * ear that she picked the right one. She cannot read the label.
 */
export const LANGS = [
  { code: 'hi-IN',  asr: 'hi-IN', label: 'हिंदी',   english: 'Hindi',    sample: 'नमस्ते, यह हिंदी है' },
  { code: 'en-IN',  asr: 'en-IN', label: 'English', english: 'English',  sample: 'Hello, this is English' },
  { code: 'gu-IN', asr: 'gu-IN', label: 'ગુજરાતી', english: 'Gujarati', sample: 'નમસ્તે, આ ગુજરાતી છે' },
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
  /**
   * Does the photo plausibly show handmade work? The model's call, not hers.
   *
   * Phone OTP proves the shop is hers; it says nothing about THIS product.
   * The live database had a MacBook, an iPhone case and a lipstick on the buyer page, each
   * titled "Handmade" by a model that had been told everything is. This is
   * the cheapest check there is: the same call that writes the listing looks
   * at the same photo and answers one more question.
   *
   * `false` keeps it off the buyer page, exactly like a practice piece. The
   * way out is the question loop she already uses — the model asks how she
   * made it, and her spoken answer can change its mind. Optional because
   * every listing written before this has no opinion, and no opinion means
   * for sale.
   */
  handmade?: boolean
  /** One short English line on why, for the coordinator and the judges. */
  handmadeWhy?: string
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
  /** True when we had no comparables for this craft and the band is arithmetic
   *  on her own costs. The screen must say so — see services/comparables.ts. */
  estimated?: boolean
  /** Where the band came from, when it came from anywhere. */
  basis?: { n: number; market: 'retail' | 'wholesale'; source: string }
}

/** Raw numbers the artisan gives us (by voice or by tapping +/-) to compute the floor. */
export interface CostInput {
  materialCost: number     // rupees spent on raw material
  hours: number            // hours of work
}

export interface Product {
  id: string
  createdAt: number
  /**
   * Which artisan made it. An anonymous-auth uid, or a device id when there is
   * no cloud — see services/artisan.ts, which explains why this is not a login.
   *
   * Optional because products created before this existed do not have one, and
   * the impact dashboard counts those honestly as unattributed rather than
   * folding them into somebody.
   */
  artisanId?: string
  status: 'draft' | 'published'
  /**
   * Made during the guided first run, so it never reaches a buyer.
   *
   * lib/guide.ts is proud that the guide runs on the REAL app and that she
   * ends it holding a real published listing, not a simulation — and that is
   * still right about everything except the last inch. The marketplace is a
   * projector surface at a demo and a shared shop in a pilot, and the first
   * thing anybody makes while being talked through the app is a practice pot.
   * Twenty judges each publishing one fills the buyer page with junk, and the
   * Ministry dashboard counts every one of them as a catalogued product.
   *
   * So it stays on her phone: her shop shows it, the buyer page does not, and
   * screens/Impact.tsx leaves it out of every metric and says how many it
   * left out. She can put it on sale for real from the publish screen, which
   * is the one place she is already looking at what a buyer would see.
   *
   * Only the FIRST run stamps this. Replaying the guide from "learn how to
   * sell" must not quietly hide a real pot she is trying to sell.
   */
  demo?: boolean
  lang: LangCode

  photo?: string           // original, as a data URL
  cleanPhoto?: string      // background removed, white bg
  transcript?: string      // what she said, as text
  answers?: Answer[]       // what she added after reading back the first draft
  cost?: CostInput
  /**
   * What she used to be paid for one of these — by a middleman, or at a fair.
   *
   * The single number this whole project is judged on. The problem statement
   * is owned by the Ministry of Social Justice, and what they are buying is
   * income change, not an app. Undefined until she tells us: a default here
   * would be us inventing the result.
   */
  usualPrice?: number
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
  /**
   * Who has to read this — the maker of the product it is about.
   *
   * Carried for the same reason an order carries it: without it, telling her a
   * buyer has written means reading every message in the shop and looking up
   * each product to find out whose it was. Stamped from the product when the
   * message is sent, so it is right on both sides of the conversation.
   */
  artisanId?: string
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

  /** Whose work this is, copied from the product when the order is placed.
   *  An order that does not know its artisan cannot be routed to her. */
  artisanId?: string

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
