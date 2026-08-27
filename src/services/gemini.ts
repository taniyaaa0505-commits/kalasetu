/**
 * The brain. One call: photo + what she said -> the whole listing.
 *
 * Without a key in .env this returns a mock so the UI is still buildable.
 * Add VITE_GEMINI_API_KEY and the same code path goes live.
 *
 * !! VERIFY the model id at https://aistudio.google.com before the demo —
 *    Google renames these. If the call 404s, that is why.
 */
import type { Listing } from '../types'

const MODEL = 'gemini-2.0-flash'
const ENDPOINT = (m: string, k: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${k}`

/** The rule that keeps the AI honest. This paragraph is a slide in the deck. */
const SYSTEM_RULES = `
You are helping an Indian artisan who cannot read English list a handmade product.

HARD RULES:
- State ONLY what you can see in the photo or hear in the transcript.
- Never invent a material, size, dye, technique, or origin claim.
- If something important is missing or unclear, do NOT guess. Put it in "questions"
  as a short question in simple Hindi that we will ask her out loud.
- Descriptions must be warm and specific, not marketing fluff.
- Hindi output must be simple, spoken Hindi. No Sanskritised vocabulary.
`.trim()

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

export async function generateListing(photoDataUrl: string, transcript: string): Promise<Listing> {
  const key = import.meta.env.VITE_GEMINI_API_KEY
  if (!key) return mockListing(transcript)

  const img = splitDataUrl(photoDataUrl)

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_RULES }] },
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType: img.mimeType, data: img.data } },
        { text: `The artisan said, in her own language:\n"""${transcript}"""\n\nWrite the listing.` },
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
function mockListing(transcript: string): Listing {
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
    questions: transcript ? [] : ['इसका नाप क्या है?', 'यह किस चीज़ पर बना है?'],
  }
}
