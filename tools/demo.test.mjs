// The practice piece, and the four places it must not leak into.
//
// lib/guide.ts runs the tour on the REAL app and is right to — she ends it
// holding a listing made from her own photograph, not a simulation. The last
// inch is the problem: that listing used to go straight onto the buyer page
// and into the Ministry dashboard. Twenty judges each learning which button is
// the camera fills the projector with practice pots and counts every one as a
// catalogued product.
//
// The failure this guards against is the opposite one, though, and it is
// worse: a REAL pot silently marked practice, hidden from every buyer, while
// she waits for an order that can never arrive.
import { readFileSync } from 'node:fs'
const guide   = readFileSync('src/lib/guide.ts', 'utf8')
const capture = readFileSync('src/screens/Capture.tsx', 'utf8')
const types   = readFileSync('src/types.ts', 'utf8')
const buyer   = readFileSync('src/screens/Buyer.tsx', 'utf8')
const impact  = readFileSync('src/screens/Impact.tsx', 'utf8')
const publish = readFileSync('src/screens/Publish.tsx', 'utf8')
const home    = readFileSync('src/screens/Home.tsx', 'utf8')
const product = readFileSync('src/screens/BuyerProduct.tsx', 'utf8')
const rules   = readFileSync('firestore.rules', 'utf8')

let bad = 0
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) bad++ }

// --- only the first run, never a replay ---
check(/export function firstRun\(\)/.test(guide), 'the first run is a state the guide can name')
check(/firstRunDone/.test(guide) && /if \(step === 'done'\) localStorage\.setItem\(FIRST_DONE/.test(guide),
  'and it latches the first time the guide ever ends')
check(/demo: firstRun\(\) \|\| undefined/.test(capture),
  'stamped from firstRun(), NOT guiding() — a replay must not hide a real pot')
check(/demo: firstRun/.test(capture) && !/demo: guiding/.test(capture),
  'and there is no path that marks a replay as practice')
check(/demo\?: boolean/.test(types), 'the field is optional, so every existing product stays real')

// --- the four places it must not appear ---
check(/p\.status === 'published' && p\.artisanId && !p\.demo/.test(buyer),
  'the buyer marketplace never lists one')
check(/const products = all\.filter\(p => !p\.demo\)/.test(impact),
  'the Ministry dashboard leaves them out of every figure')
check(/practice > 0 &&/.test(impact),
  'and says how many it left out, like every other exclusion on that page')
check(/product\.demo \? t\('demoPill'\)/.test(home),
  'her own card says "practice", never "on sale"')
check(/p\.status === 'published' && !p\.demo\).length/.test(home),
  'and her on-sale count does not include one')

check(/if \(p\.demo \|\| p\.status !== 'published'/.test(product),
  'and a direct link to one cannot take an order')
check(/notPractice\(request\.resource\.data\.productId\)/.test(rules),
  'nor can a write that goes around the page')

// --- the handmade check: same doors, one more reason ---
const gemini = readFileSync('src/services/gemini.ts', 'utf8')
check(/'handmade','handmadeWhy'/.test(gemini) && /HANDMADE CHECK/.test(gemini),
  'the listing call is asked whether the photo is handmade')
check(/whenever you are unsure/.test(gemini),
  'and gives the benefit of the doubt — a hidden real pot is the worse mistake')
check(/p\.listing\?\.handmade !== false/.test(buyer),
  'the marketplace hides what it called factory-made')
check(/p\.listing\?\.handmade === false\) return/.test(product),
  'and so does a direct link')
check(/notHandmadeOnPhone/.test(publish),
  'and the send screen says so instead of promising a buyer')

// --- but it is never a trap ---
check(/demoGoLive/.test(publish) && /patchProduct\(id, \{ demo: false \}\)/.test(publish),
  'she can put the practice piece on sale for real')
check(/demo( \|\| held)? \? \(/.test(publish) && /demoOnPhone/.test(publish),
  'and the send screen does not promise a marketplace it will not reach')

console.log(bad ? `\n${bad} failed` : '\nall good')
process.exit(bad ? 1 : 0)
