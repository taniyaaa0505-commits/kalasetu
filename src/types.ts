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
  cost?: CostInput
  listing?: Listing
  price?: PriceSuggestion
}
