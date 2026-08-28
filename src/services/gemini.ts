/**
 * The brain. One call: photo + what she said -> the whole listing.
 *
 * Without a key in .env this returns a mock so the UI is still buildable.
 * Add VITE_GEMINI_API_KEY and the same code path goes live.
 *
 * !! VERIFY the model id at https://aistudio.google.com before the demo —
 *    Google renames these. If the call 404s, that is why.
 */
import { LANGS, type Listing, type LangCode } from '../types'

const MODEL = 'gemini-2.0-flash'
const ENDPOINT = (m: string, k: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${k}`

/** The rule that keeps the AI honest. This paragraph is a slide in the deck. */
function systemRules(langName: string, asrNote: string) {
  return `
You are helping an Indian artisan list a handmade product for sale online.
She spoke to us in ${langName}.${asrNote}

HARD RULES:
- State ONLY what you can see in the photo or hear in the transcript.
- Never invent a material, size, dye, technique, or origin claim.
- If something important is missing or unclear, do NOT guess. Put it in "questions"
  as a short, simple question in ${langName} that we will read out loud to her.
- Descriptions must be warm and specific, not marketing fluff.
- Hindi output must be simple, spoken Hindi. No Sanskritised vocabulary.
- Always fill in BOTH the English and the Hindi fields, whatever she spoke.
`.trim()
}

const SCHEMA = {
  type: 'object',
  properties: {
    craft:         { type: 'string' },
    material:      { type: 'string' },
    titleEn:       { type: 'string' },
    titleHi:       { type: 'string' },
    descriptionEn: { type: 'string' },
    descriptionHi: { type: 'string' },
    keywords:      { type: 'array', items: { type: 'string' } },
    questions:     { type: 'array', items: { type: 'string' } },
  },
  required: ['craft','material','titleEn','titleHi','descriptionEn','descriptionHi','keywords','questions'],
}

/** data:image/jpeg;base64,XXXX  ->  { mimeType, data } */
function splitDataUrl(dataUrl: string) {
  const [head, data] = dataUrl.split(',')
  const mimeType = head.match(/data:(.*?);/)?.[1] ?? 'image/jpeg'
  return { mimeType, data: data ?? '' }
}

export function geminiConfigured(): boolean {
  return Boolean(import.meta.env.VITE_GEMINI_API_KEY)
}

export async function generateListing(
  photoDataUrl: string,
  transcript: string,
  lang: LangCode = 'hi-IN',
): Promise<Listing> {
  const key = import.meta.env.VITE_GEMINI_API_KEY
  if (!key) return mockListing(transcript, lang)

  const meta = LANGS.find(l => l.code === lang)
  const langName = meta?.english ?? 'Hindi'

  // When we had to run her speech through a different language's recogniser,
  // say so — the transcript will be phonetically mangled and the model needs
  // to read it generously rather than take it literally.
  const asrNote = meta && meta.asr !== meta.code
    ? ` The transcript below was produced by a ${LANGS.find(l => l.asr === meta.asr && l.code === meta.asr)?.english ?? 'Hindi'} speech recogniser listening to ${langName}, so words may be garbled or spelled oddly. Interpret the intent generously.`
    : ''

  const img = splitDataUrl(photoDataUrl)

  const body = {
    systemInstruction: { parts: [{ text: systemRules(langName, asrNote) }] },
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType: img.mimeType, data: img.data } },
        { text: `The artisan said, in ${langName}:\n"""${transcript}"""\n\nWrite the listing.` },
      ],
    }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: SCHEMA,
      temperature: 0.4,
    },
  }

  const res = await fetch(ENDPOINT(MODEL, key), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`Gemini failed (${res.status}): ${await res.text()}`)

  const json = await res.json()
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini returned nothing usable.')
  return JSON.parse(text) as Listing
}

/** Used until the key is added — keeps the whole flow clickable. */
function mockListing(transcript: string, lang: LangCode = 'hi-IN'): Listing {
  const askIn = lang === 'en-IN'
    ? ['What size is it?', 'What is it made of?']
    : ['इसका नाप क्या है?', 'यह किस चीज़ पर बना है?']
  return {
    craft: 'Madhubani painting',
    material: 'handmade paper, natural dye',
    titleEn: 'Handmade Madhubani Painting — Fish Motif, Natural Dyes',
    titleHi: 'हाथ से बनी मधुबनी पेंटिंग — मछली का डिज़ाइन',
    descriptionEn:
      'A hand-painted Madhubani artwork on handmade paper, made with natural dyes in the ' +
      'Mithila tradition of Bihar. Every line is drawn by hand, so no two pieces are alike.',
    descriptionHi:
      'बिहार की मिथिला परंपरा में हाथ से बनी मधुबनी पेंटिंग। प्राकृतिक रंगों से हस्तनिर्मित कागज़ पर बनाई गई। ' +
      'हर पेंटिंग हाथ से बनती है, इसलिए हर एक अलग होती है।',
    keywords: ['madhubani', 'mithila art', 'handmade painting', 'natural dye', 'bihar handicraft'],
    questions: transcript ? [] : askIn,
  }
}

/* ------------------------------------------------------------------ */
/* Translation — for the artisan <-> buyer conversation                */
/* ------------------------------------------------------------------ */

/**
 * Translate one chat message.
 *
 * Kept deliberately narrow: short, conversational, no explanations, no
 * transliteration. A buyer asking "can you make 50 of these by Diwali?"
 * must come out as that question and nothing else.
 */
export async function translate(text: string, from: string, to: string): Promise<string> {
  const key = import.meta.env.VITE_GEMINI_API_KEY
  if (!key) return mockTranslate(text, to)

  const body = {
    systemInstruction: {
      parts: [{ text:
        `Translate the user's message from ${from} to ${to}.\n` +
        `Rules: reply with ONLY the translation. No quotes, no notes, no ` +
        `transliteration, no explanation. Keep it short and conversational, ` +
        `the way a person actually speaks. Keep numbers, prices and dates exactly as given.`
      }],
    },
    contents: [{ role: 'user', parts: [{ text }] }],
    generationConfig: { temperature: 0.2 },
  }

  const res = await fetch(ENDPOINT(MODEL, key), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Translate failed (${res.status})`)

  const json = await res.json()
  const out = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!out) throw new Error('Translate returned nothing')
  return out
}

/**
 * DEMO ONLY. Until the Gemini key is set, a tiny phrasebook so the chat is
 * still demonstrable. Anything not in here comes back unchanged and the UI
 * marks it as untranslated — we never pretend a translation happened.
 */
const PHRASEBOOK: Record<string, string> = {
  'is this available?': 'क्या यह उपलब्ध है?',
  'can you make 50 of these?': 'क्या आप इसके 50 बना सकती हैं?',
  'what is your best price?': 'आपका सबसे कम दाम क्या है?',
  'how long will it take?': 'कितना समय लगेगा?',
  'i will take it': 'मैं इसे ले लूँगा',
  'हाँ, है': 'Yes, it is available',
  'दो हफ़्ते लगेंगे': 'It will take two weeks',
  'ठीक है': 'That is fine',
}

function mockTranslate(text: string, to: string): string {
  const hit = PHRASEBOOK[text.trim().toLowerCase()]
  if (hit) return hit
  // No pretending. The caller marks this untranslated and the UI says so.
  throw new Error(`No Gemini key — cannot translate to ${to}`)
}
