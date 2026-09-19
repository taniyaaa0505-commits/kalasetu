// The proof-of-making photograph, and the four promises it has to keep.
//
// "How do you know the product is originally hers?" is the question the
// internal round kept coming back to, and this is the part of the answer a
// reseller cannot cheaply fake: one photograph of the work being made, taken
// with the app's own camera.
//
// The failure mode to guard against is NOT a missing badge. It is an app that
// stands between a woman and her own listing over a photograph she cannot
// take — alone, at a loom, with no free hand. So every check below is really
// the same check: is this still optional, still once, and still after her
// product is safe?
import { readFileSync } from 'node:fs'

const proof   = readFileSync('src/components/CraftProof.tsx', 'utf8')
const capture = readFileSync('src/screens/Capture.tsx', 'utf8')
const verify  = readFileSync('src/services/verify.ts', 'utf8')
const gemini  = readFileSync('src/services/gemini.ts', 'utf8')
const buyer   = readFileSync('src/screens/BuyerProduct.tsx', 'utf8')
const en      = readFileSync('src/lib/locales/en.ts', 'utf8')

let bad = 0
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) bad++ }

// --- it can never cost her a listing ---
check(/\{clean && saved && !busy && <CraftProof \/>\}/.test(capture),
  'it is offered only after her product photograph is cut out AND stored')
check(/onClick=\{later\}/.test(proof) && /function later\(\)/.test(proof),
  'there is always a way past it')
check(/sessionStorage\.setItem\(LATER/.test(proof),
  'and "later" is remembered, so it does not ask twice in one sitting')
check(/!v\?\.craftPhoto\) setShow\(true\)/.test(proof),
  'an artisan who has already given one is never asked again')
check(/catch \(\) => undefined\)|\.catch\(\(\) => undefined\)/.test(proof) || /checkCraftPhoto\(small\)\.catch/.test(proof),
  'the AI verdict is a bonus: if it cannot be got, the photograph is still stored')

// --- it is her hands, once, not each pot ---
check(/craftPhoto\?: string/.test(verify) && /saveCraftProof/.test(verify),
  'the photograph belongs to the ARTISAN record, not to a product')
check(/\{ merge: true \}/.test(verify.split('saveCraftProof')[1] ?? ''),
  'and it is merged, so it cannot wipe her vouch')

// --- the camera, and an honest word about what that is worth ---
check(/capture="environment"/.test(proof), 'it opens the camera rather than the gallery')
check(/hint, not a lock/.test(proof),
  'and the code says plainly that a camera hint is not a guarantee')

// --- the model is asked the right question, generously ---
check(/export async function checkCraftPhoto/.test(gemini), 'the model is asked whether this shows work being MADE')
check(/Be generous/.test(gemini), 'and told to be generous — a dark photo of real work is real work')
check(/atWork/.test(gemini) && /required: \['atWork', 'why'\]/.test(gemini),
  'it answers yes/no with a reason, as structured JSON')

// --- and the buyer, who is the entire point, can see it ---
check(/vouch\?\.craftPhoto && \(/.test(buyer), 'the buyer sees the photograph on the listing')
check(/Photographed in the app when this shop was opened/.test(buyer),
  'described exactly, claiming nothing more than what happened')

// --- she is told why, in her own language ---
for (const key of ['proofTitle', 'proofWhy', 'proofTake', 'proofLater', 'proofSaving', 'proofDone']) {
  check(new RegExp(`\\b${key}:`).test(en), `${key} exists (every locale is typed against this one)`)
}

console.log(bad ? `\n${bad} failed` : '\nall good')
process.exit(bad ? 1 : 0)
