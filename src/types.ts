/** The languages we support in round 1. Five done well, not 22 claimed badly. */
export const LANGS = [
  { code: 'hi-IN', label: 'हिंदी',    english: 'Hindi'   },
  { code: 'mai-IN', label: 'मैथिली',   english: 'Maithili' },
  { code: 'bn-IN', label: 'বাংলা',    english: 'Bengali' },
  { code: 'mr-IN', label: 'मराठी',    english: 'Marathi' },
  { code: 'ta-IN', label: 'தமிழ்',    english: 'Tamil'   },
] as const

export type LangCode = typeof LANGS[number]['code']

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
