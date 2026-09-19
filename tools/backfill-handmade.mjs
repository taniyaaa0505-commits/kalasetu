// Run the handmade check over listings that were published before it existed.
//
// The buyer page carried a MacBook, an iPhone case, a lipstick and an air
// cooler, because they were listed while the app still assumed everything
// photographed was handmade. Rather than pick them out by hand — which is a
// person deciding, and not repeatable — this runs the SAME check the app now
// runs on every new listing, over the old ones, and writes the verdict back.
//
// Writes go through the Firestore REST API with the Firebase CLI's own
// credentials, because firestore.rules only lets a product be updated by the
// artisan who owns it, which is right, and this is the one job that has to
// come from outside that rule.
//
//   node tools/backfill-handmade.mjs           # report only, writes nothing
//   node tools/backfill-handmade.mjs --write   # write the verdicts back
//
// Stops at the first Gemini error: the free tier is 20 requests per model per
// key per day and the app itself lives on that same allowance.
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const WRITE = process.argv.includes('--write')
const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))

const PROJECT = env.VITE_FIREBASE_PROJECT_ID
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`

// The prompt and the schema, read out of the app's own source so this can
// never drift from what ships. Same trick as tools/handmade.bench.mjs.
const src = readFileSync('src/services/gemini.ts', 'utf8')
const RULES = src.match(/function systemRules[\s\S]*?return `([\s\S]*?)`\.trim\(\)/)[1]
  .replaceAll('${langName}', 'Hindi').replace('${asrNote}', '').trim()
const SCHEMA = eval('(' + src.match(/const SCHEMA = (\{[\s\S]*?\n\})/)[1] + ')')
const MODELS = [...src.matchAll(/'(gemini-[\w.-]+)'/g)].map(m => m[1])
const KEYS = env.VITE_GEMINI_API_KEY.split(',').map(k => k.trim()).filter(Boolean)

/** An access token from whoever ran `firebase login`. */
function token() {
  const out = execFileSync('node', ['-e', `
    const {getAccessToken}=require('firebase-tools/lib/auth.js')
    const {configstore}=require('firebase-tools/lib/configstore.js')
    getAccessToken(configstore.get('tokens').refresh_token,[]).then(t=>process.stdout.write(t.access_token))
  `], { cwd: process.cwd() })
  return out.toString()
}

/* Firestore's REST shape: {stringValue}, {booleanValue}, … in and out. */
const plain = v =>
  'stringValue' in v ? v.stringValue
  : 'booleanValue' in v ? v.booleanValue
  : 'integerValue' in v ? Number(v.integerValue)
  : 'doubleValue' in v ? v.doubleValue
  : 'mapValue' in v ? Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, plain(x)]))
  : 'arrayValue' in v ? (v.arrayValue.values ?? []).map(plain)
  : undefined

const wrap = v =>
  typeof v === 'string' ? { stringValue: v }
  : typeof v === 'boolean' ? { booleanValue: v }
  : typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v })
  : Array.isArray(v) ? { arrayValue: { values: v.map(wrap) } }
  : v && typeof v === 'object' ? { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, wrap(x)])) } }
  : { nullValue: null }

const T = token()
const auth = { Authorization: `Bearer ${T}` }

async function allProducts() {
  const out = []
  let page = ''
  do {
    const r = await fetch(`${BASE}/products?pageSize=300${page ? `&pageToken=${page}` : ''}`, { headers: auth })
    const j = await r.json()
    if (j.error) throw new Error(j.error.message)
    for (const d of j.documents ?? []) {
      out.push({ name: d.name, id: d.name.split('/').pop(), ...Object.fromEntries(Object.entries(d.fields ?? {}).map(([k, v]) => [k, plain(v)])) })
    }
    page = j.nextPageToken ?? ''
  } while (page)
  return out
}

async function ask(product) {
  const photo = product.photo || product.cleanPhoto
  const [head, data] = photo.split(',')
  const body = {
    systemInstruction: { parts: [{ text: RULES }] },
    contents: [{ role: 'user', parts: [
      { inlineData: { mimeType: head.match(/data:(.*?);/)[1], data } },
      { text: `The artisan said, in Hindi:\n"""${product.transcript ?? ''}"""\n\nWrite the listing.` },
    ] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.4, thinkingConfig: { thinkingBudget: 0 } },
  }
  // Every model, every key, exactly like the app's own chain — a spent bucket
  // is a reason to use the next one, not a failure.
  let last
  for (const model of MODELS) {
    for (const key of KEYS) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const j = await r.json()
      if (!j.error) return JSON.parse(j.candidates[0].content.parts.map(p => p.text).join(''))
      last = j.error.message
    }
  }
  throw new Error(last)
}

async function writeVerdict(p, verdict) {
  const listing = { ...p.listing, handmade: verdict.handmade, handmadeWhy: verdict.handmadeWhy }
  const r = await fetch(`${BASE}/products/${p.id}?updateMask.fieldPaths=listing`, {
    method: 'PATCH', headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { listing: wrap(listing) } }),
  })
  const j = await r.json()
  if (j.error) throw new Error(j.error.message)
}

const products = await allProducts()
const todo = products.filter(p =>
  p.status === 'published' && p.listing && (p.photo || p.cleanPhoto) && p.listing.handmade === undefined)

console.log(`${products.length} products, ${todo.length} published listings with no verdict yet`)
console.log(WRITE ? 'WRITING verdicts back\n' : 'dry run — pass --write to save\n')

let held = 0, kept = 0
for (const p of todo) {
  let v
  try { v = await ask(p) } catch (e) { console.log(`\nSTOPPED: ${String(e.message).slice(0, 90)}`); break }
  const title = (p.listing.titleEn ?? p.id).slice(0, 38).padEnd(40)
  console.log(`${v.handmade ? 'keep     ' : 'HELD BACK'}  ${title} ${v.handmadeWhy}`)
  v.handmade ? kept++ : held++
  if (WRITE) await writeVerdict(p, v)
}

console.log(`\n${kept} kept on the buyer page, ${held} held back${WRITE ? '' : ' (nothing written)'}`)
process.exit(0)
