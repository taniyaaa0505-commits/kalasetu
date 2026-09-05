/**
 * The brain. One call: photo + what she said -> the whole listing.
 *
 * Without a key in .env this returns a mock so the UI is still buildable.
 * Add VITE_GEMINI_API_KEY and the same code path goes live.
 *
 * !! VERIFY the model id at https://aistudio.google.com before the demo —
 *    Google renames these. If the call 404s, that is why.
 */
import { LANGS, type Answer, type Listing, type LangCode } from '../types'

/**
 * Two models, on purpose — measured, not guessed. See tools/bench-gemini.mjs
 * and tools/bench-listing.mjs.
 *
 *   listing     once per product, needs the photo and structured JSON   2.9s
 *   translate   every chat message, must feel instant                   0.7s
 *
 * gemini-3.7-flash was tried and rejected: 17 SECONDS for one short
 * translation. Do not "upgrade" to it without re-running the benchmark.
 *
 * These models also "think" by default, which we turn off everywhere —
 * it added seconds and changed nothing we care about.
 */
/**
 * Each job names a chain, not a model.
 *
 * The free tier's daily allowance is PER MODEL PER PROJECT, and for the
 * listing model it is TWENTY REQUESTS A DAY. That is not a demo budget, it is
 * barely a rehearsal — and a team testing all afternoon will hit it before
 * anyone stands up to present. Measured, not guessed: the API answers a spent
 * model with `GenerateRequestsPerDayPerProjectPerModel-FreeTier, limit: 20`.
 *
 * But the bucket is per model, and every other model still had its own full
 * allowance while this one was empty. So a model that is out for the day is
 * not a failure any more — it is a reason to use the next one. Four chained
 * models is four times the day's headroom, for free, with no key juggling.
 *
 * The FIRST entry of each chain is the benchmarked choice and the only one
 * the happy path ever touches; see tools/bench-gemini.mjs. The rest exist so
 * that "we ran out" degrades into "slightly different words" instead of into
 * a screen that cannot write her listing.
 */
const LISTING_MODELS = [
  'gemini-3.5-flash',        // benchmarked: 2.9s, the one we actually want
  'gemini-3.6-flash',
  'gemini-3-flash-preview',
  'gemini-3.5-flash-lite',   // last resort: weaker, but it can still see
] as const

const TRANSLATE_MODELS = [
  'gemini-3.1-flash-lite',   // benchmarked: 0.7s
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
] as const

/** Thinking costs latency and buys us nothing on these two tasks. */
const NO_THINKING = { thinkingConfig: { thinkingBudget: 0 } }

const ENDPOINT = (m: string, k: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${k}`

/**
 * Statuses that mean "not now" rather than "not ever".
 *
 * 503 is the one we actually keep seeing: Gemini's free tier is shared and it
 * sheds load. Nothing about the request is wrong, so failing her over it — and
 * asking her to press a button again — is the app blaming her for somebody
 * else's capacity.
 */
const RETRYABLE = new Set([408, 500, 502, 503, 504])

export class GeminiError extends Error {
  readonly status: number
  /** From the API's own RetryInfo, in ms. 0 when it did not say. */
  readonly retryAfterMs: number
  constructor(status: number, message: string, retryAfterMs = 0) {
    super(`Gemini ${status}: ${message}`)
    this.name = 'GeminiError'
    this.status = status
    this.retryAfterMs = retryAfterMs
  }

  /**
   * Worth trying THE SAME MODEL again in a moment.
   *
   * 429 is deliberately not in the set above. It used to be, and on a per-day
   * quota that was actively harmful: each attempt spent another request from
   * the bucket that was already empty, so one listing burned three of the
   * twenty and still failed. A 429 that says "come back in under eight
   * seconds" is a per-minute limit and worth waiting out; anything longer is
   * the day's allowance, and the answer to that is a different model.
   */
  get retryable(): boolean {
    if (this.status === 429) return this.retryAfterMs > 0 && this.retryAfterMs <= 8_000
    return RETRYABLE.has(this.status)
  }

  /** This model is finished for today. Someone else's turn. */
  get exhausted(): boolean {
    return this.status === 429 && !this.retryable
  }
}

/** Google reports it as `RetryInfo.retryDelay`, e.g. "57.02s". */
function retryDelayOf(raw: string): number {
  try {
    const d = JSON.parse(raw)?.error?.details ?? []
    const info = d.find((x: any) => String(x['@type']).includes('RetryInfo'))
    const m = /^([\d.]+)s$/.exec(info?.retryDelay ?? '')
    return m ? Math.round(parseFloat(m[1]) * 1000) : 0
  } catch { return 0 }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/**
 * POST to Gemini, retrying the transient failures.
 *
 * Three attempts with widening gaps and a little jitter, so a hall full of
 * phones on the same overloaded model does not retry in lockstep. Roughly six
 * seconds of extra patience in the worst case — she is already watching a
 * screen that says what it is doing, and six quiet seconds beats an error.
 *
 * A 400 is ours and is thrown at once: retrying a bad request just wastes her
 * battery and her time.
 */
async function post(url: string, body: unknown, attempts = 3): Promise<Response> {
  let last: GeminiError | undefined

  for (let attempt = 0; attempt < attempts; attempt++) {
    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch (err) {
      // The request never left the phone. Treat it as transient — it usually
      // is — but let the caller see it is a network problem, not a refusal.
      last = new GeminiError(0, err instanceof Error ? err.message : String(err))
      if (attempt === attempts - 1) throw last
      await sleep(700 * 2 ** attempt + Math.random() * 400)
      continue
    }

    if (res.ok) return res

    // The body is a page of JSON; keep the one sentence a human can read.
    const raw = await res.text()
    let why = raw.slice(0, 160)
    try { why = JSON.parse(raw)?.error?.message ?? why } catch { /* not JSON */ }

    last = new GeminiError(res.status, why, retryDelayOf(raw))
    if (!last.retryable || attempt === attempts - 1) throw last
    await sleep(700 * 2 ** attempt + Math.random() * 400)
  }

  throw last ?? new GeminiError(0, 'unknown failure')
}

/**
 * Walk a chain of models until one of them is willing.
 *
 * Only a model that is OUT FOR THE DAY moves us along — a 503, a timeout or a
 * dropped connection is Gemini shedding load, and `post` has already been
 * patient about those on the model we actually wanted. Falling through to a
 * weaker model over a blip would quietly downgrade every listing in the app.
 *
 * A 404 also moves us along: Google retires model ids, and the whole point of
 * a chain is that the demo does not die the morning one of them disappears.
 */
const fussy = new Set<string>()      // models that will not take a thinking budget

/**
 * `thinkingBudget: 0` is not portable, and the way it fails is a trap.
 *
 * Every model in these chains accepts it on a plain text request. Ask for
 * structured JSON at the same time and most of them answer `400 Request
 * contains an invalid argument` — with no hint as to which argument. Measured
 * across the chain: only the primary and gemini-3-flash-preview take both.
 *
 * We want it where it works, because turning thinking off is worth seconds.
 * So: send it, and if a model rejects the request, send the same request again
 * without it and remember that this one is fussy. One wasted call per model
 * per session, and it keeps working when Google changes its mind again.
 */
function withoutThinking(body: unknown): unknown | null {
  const b = body as { generationConfig?: Record<string, unknown> }
  if (!b?.generationConfig?.thinkingConfig) return null
  const { thinkingConfig: _drop, ...rest } = b.generationConfig
  return { ...b, generationConfig: rest }
}

async function postToChain(
  models: readonly string[], key: string, body: unknown, attempts = 3,
): Promise<Response> {
  let last: unknown
  for (let i = 0; i < models.length; i++) {
    const id = models[i]
    const url = ENDPOINT(id, key)
    const plain = withoutThinking(body)
    try {
      const res = await post(url, fussy.has(id) && plain ? plain : body, attempts)
      if (i > 0) console.warn(`[gemini] fell back to ${id} — ${models[0]} was unavailable`)
      return res
    } catch (err) {
      last = err
      // Maybe it was only the thinking budget it objected to.
      if (err instanceof GeminiError && err.status === 400 && plain && !fussy.has(id)) {
        try {
          const res = await post(url, plain, attempts)
          fussy.add(id)
          console.warn(`[gemini] ${id} rejects thinkingBudget with JSON output; dropped it`)
          if (i > 0) console.warn(`[gemini] fell back to ${id}`)
          return res
        } catch (again) { last = again }
      }
      const done = last instanceof GeminiError && (last.exhausted || last.status === 404)
      if (!done || i === models.length - 1) throw last
      console.warn(`[gemini] ${id} spent for today; trying ${models[i + 1]}`)
    }
  }
  throw last
}

/** Newer models can return several parts. Join every text part, not just the first. */
function textOf(json: any): string {
  const parts = json?.candidates?.[0]?.content?.parts ?? []
  return parts.map((p: any) => p?.text).filter(Boolean).join('').trim()
}

/** The rule that keeps the AI honest. This paragraph is a slide in the deck. */
function systemRules(langName: string, asrNote: string) {
  return `
You are helping an Indian artisan list a handmade product for sale online.
She spoke to us in ${langName}.${asrNote}

HARD RULES:
- State ONLY what you can see in the photo, hear in the transcript, or hear in
  her answers. Her answers are her own spoken words and count exactly as the
  transcript does — use them freely.
- Never invent a material, size, dye, technique, or origin claim.
- If something important is missing or unclear, do NOT guess. Put it in "questions"
  as a short, simple question in ${langName} that we will read out loud to her.
- NEVER re-ask something she has already answered below. She hears every question
  read aloud, and being asked the same thing twice reads as the app not listening.
- Descriptions must be warm and specific, not marketing fluff.
- Hindi output must be simple, spoken Hindi. No Sanskritised vocabulary.
- Always fill in BOTH the English and the Hindi fields, whatever she spoke.
`.trim()
}

/**
 * Her answers, as a block the model reads as more speech.
 *
 * Free-form additions carry no question, so they are listed separately rather
 * than under a fabricated one — inventing the question she was answering is
 * exactly the kind of guess the rules above forbid.
 */
function answersBlock(answers: Answer[], langName: string): string {
  const replies = answers.filter(a => a.question && a.answer.trim())
  const extras = answers.filter(a => !a.question && a.answer.trim())
  if (!replies.length && !extras.length) return ''

  let out = `\n\nWe read your questions out loud to her. She answered in ${langName}:`
  for (const a of replies) out += `\nQ: ${a.question}\nA: """${a.answer}"""`
  for (const a of extras) out += `\nShe also added, unprompted: """${a.answer}"""`
  return out + `\n\nRewrite the listing using these answers.`
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
  answers: Answer[] = [],
): Promise<Listing> {
  const key = import.meta.env.VITE_GEMINI_API_KEY
  if (!key) return mockListing(lang, answers)

  const meta = LANGS.find(l => l.code === lang)
  const langName = meta?.english ?? 'Hindi'

  // When we had to run her speech through a different language's recogniser,
  // say so — the transcript will be phonetically mangled and the model needs
  // to read it generously rather than take it literally.
  const asrNote = meta && meta.asr !== meta.code
    ? ` The transcript below was produced by a ${LANGS.find(l => l.asr === meta.asr && l.code === meta.asr)?.english ?? 'Hindi'} speech recogniser listening to ${langName}, so words may be garbled or spelled oddly. Interpret the intent generously.`
    : ''

  // No photo, no image part.
  //
  // This used to send `inlineData` with an empty `data` whenever the product
  // had no picture yet, and Gemini rejects that with
  // `400 Unable to process input image` — which reached her as a raw error
  // string on the description screen. A listing written from her words alone
  // is a perfectly good listing; an empty image is not an image.
  const img = photoDataUrl ? splitDataUrl(photoDataUrl) : null
  const hasPhoto = Boolean(img && img.data)

  const parts: Array<Record<string, unknown>> = []
  if (hasPhoto && img) parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } })
  parts.push({
    text:
      (hasPhoto ? '' : 'There is no photograph of this one. Write it from her words alone, ' +
                       'and do not describe anything you have not been told.\n\n') +
      `The artisan said, in ${langName}:\n"""${transcript}"""\n\nWrite the listing.` +
      answersBlock(answers, langName),
  })

  const body = {
    systemInstruction: { parts: [{ text: systemRules(langName, asrNote) }] },
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: SCHEMA,
      temperature: 0.4,
      ...NO_THINKING,
    },
  }

  const res = await postToChain(LISTING_MODELS, key, body)
  const text = textOf(await res.json())
  if (!text) throw new Error('Gemini returned nothing usable.')
  return JSON.parse(text) as Listing
}

/** Used until the key is added — keeps the whole flow clickable. */
function mockListing(lang: LangCode = 'hi-IN', answers: Answer[] = []): Listing {
  const askIn = lang === 'en-IN'
    ? ['What size is it?', 'What is it made of?']
    : ['इसका नाप क्या है?', 'यह किस चीज़ पर बना है?']

  // Ask until she answers, then stop — the same loop the real model runs.
  // Without this the mock never asks anything once there is a transcript, so
  // the question loop would be invisible on a laptop with no key, which is
  // precisely the machine a demo tends to run on.
  const answered = new Set(answers.filter(a => a.answer.trim()).map(a => a.question))
  const unanswered = askIn.filter(q => !answered.has(q))

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
    questions: unanswered,
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
        `the way a person actually speaks. Keep numbers, prices and dates exactly ` +
        `as given, in Arabic numerals — write 200, never २००. A price or a ` +
        `quantity she misreads is worse than no translation at all.`
      }],
    },
    contents: [{ role: 'user', parts: [{ text }] }],
    generationConfig: { temperature: 0.2, ...NO_THINKING },
  }

  // Two attempts, not three: a chat message she is waiting on should not sit
  // there for six seconds, and an untranslated message is already handled —
  // the UI marks it and retries later rather than pretending.
  const res = await postToChain(TRANSLATE_MODELS, key, body, 2)
  const out = textOf(await res.json())
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
