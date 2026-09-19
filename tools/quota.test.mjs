// The free tier gives TWENTY listing requests per day, per model, per project.
// A team testing all afternoon exhausts that before anyone stands up to
// present, so how the app behaves at zero quota is not an edge case.
import { readFileSync } from 'node:fs'
const g = readFileSync('src/services/gemini.ts', 'utf8')

let bad = 0
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) bad++ }

const listing = /const LISTING_MODELS = \[([\s\S]*?)\] as const/.exec(g)?.[1] ?? ''
const translate = /const TRANSLATE_MODELS = \[([\s\S]*?)\] as const/.exec(g)?.[1] ?? ''
const count = b => (b.match(/'[a-z0-9.\-]+'/g) ?? []).length

check(count(listing) >= 3, `listing has a chain, not one model (${count(listing)})`)
check(count(translate) >= 2, `translation has a chain too (${count(translate)})`)
check(/'gemini-3\.5-flash'/.test(listing.split('\n')[1] ?? ''),
  'the benchmarked model is still first — fallbacks must not change the happy path')

// 429 must NOT be blanket-retryable. On a per-DAY quota every retry spends
// another request from the bucket that is already empty: one listing used to
// burn three of the twenty and still fail.
check(!/RETRYABLE = new Set\(\[[^\]]*429/.test(g), '429 is not blanket-retryable')
check(/this\.status === 429\) return this\.retryAfterMs > 0 && this\.retryAfterMs <= 8_000/.test(g),
  'a 429 is retried only when the API says to come back within seconds')
check(/get exhausted\(\)/.test(g), 'a day-long 429 is reported as exhausted, not as retryable')
check(/err\.exhausted \|\| err\.status === 404|last\.exhausted \|\| last\.status === 404/.test(g),
  'exhausted or retired moves to the next model; a 503 does not')

// thinkingBudget:0 is rejected by most models once JSON output is requested,
// and the error names no field. Send it, drop it, remember.
check(/function withoutThinking/.test(g), 'the thinking budget can be dropped per model')
check(/fussy\.add\(id\)/.test(g), 'and a model that rejected it is remembered')

console.log(bad ? `\n${bad} failed` : '\nall good')
process.exit(bad ? 1 : 0)
