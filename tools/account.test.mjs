// Getting her shop back, without putting a login in front of her.
//
// Two failure modes are guarded here and they pull in opposite directions.
// One is the sign-in screen appearing at the door, in front of someone who has
// never typed on a phone — the thing services/artisan.ts exists to prevent.
// The other is the sign-in silently doing the OPPOSITE of its job on the one
// day it matters: she reinstalls, Firebase says the number is already in use,
// and a naive implementation reports an error instead of handing her back the
// shop it just found.
import { readFileSync } from 'node:fs'
const acc     = readFileSync('src/services/account.ts', 'utf8')
const artisan = readFileSync('src/services/artisan.ts', 'utf8')
const screen  = readFileSync('src/screens/Account.tsx', 'utf8')
const home    = readFileSync('src/screens/Home.tsx', 'utf8')
const verify  = readFileSync('src/services/verify.ts', 'utf8')
const buyer   = readFileSync('src/screens/BuyerProduct.tsx', 'utf8')
const rules   = readFileSync('firestore.rules', 'utf8')
const app     = readFileSync('src/App.tsx', 'utf8')

let bad = 0
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) bad++ }

// --- the recovery branch, which is the whole point ---
check(/credential-already-in-use/.test(acc),
  'a number that is already in use is treated as the reinstall, not as an error')
check(/linkWithCredential/.test(acc) && /signInWithCredential/.test(acc),
  'link first (the uid survives, so nothing migrates), sign in only as the fallback')
check(/auth\/account-exists-with-different-credential/.test(acc),
  'and so is the same case arriving under its other Firebase code')
check(/adoptArtisanId/.test(acc),
  'a recovered uid is adopted, so every live subscription reopens under it')

// --- the golden path stays clear ---
check(!/signInWithEmail|signInWithPhone|createUserWith/.test(artisan),
  'no credential flow leaked back into the identity the camera screen depends on')
check(/signInAnonymously/.test(artisan),
  'her first product is still made without a sign-in of any kind')
check(!/\/account/.test(readFileSync('src/screens/Capture.tsx', 'utf8')),
  'and the capture screen has no idea this feature exists')
check(/path="\/account"/.test(app), 'the screen is reachable, off the golden path')

// --- deferred, not at the door ---
check(/products\.some\(p => p\.status === 'published'\)/.test(home),
  'the offer waits for a PUBLISHED product — a draft is not a shop worth keeping')
check(/!currentAccount\(\)/.test(home),
  'and disappears once she is signed in rather than nagging')

// --- a second door that does not depend on an SMS quota ---
check(/signInWithGoogle/.test(acc), 'Google is offered too, for a handset with no SMS quota left')
check(/one-time-code/.test(readFileSync('src/screens/Account.tsx', 'utf8')),
  'the code box lets the phone fill itself in')

// --- rules, or the sign-in is decoration ---
check(!/allow read, write: if true/.test(rules), 'the database is no longer open to everyone')
check(/match \/products\/\{id\}[\s\S]{0,400}?allow update, delete: if ownedByMe/.test(rules),
  'only the maker may change or delete her own product')
check(/match \/orders\/\{id\}[\s\S]{0,2000}?allow delete: if false/.test(rules),
  'and nobody may delete an order — it is the sales record a loan rests on')
check(/allow read, write: if false;\s*\}\s*\}\s*\}\s*$/.test(rules.trim()),
  'anything not thought about yet is closed')

// --- verification is vouched, never self-declared ---
check(/get\(\/databases\/\$\(database\)\/documents\/vouchers/.test(rules),
  'a badge is checked against a real voucher by the rule, not trusted from the phone')
check(/allow write: if false/.test(rules.slice(rules.indexOf('match /vouchers'))),
  'and no client can mint one')
// Not a stray grep: the word appears in verify.ts on purpose, explaining why
// the mechanism is a vouch. What must never appear is a FIELD holding one.
check(!/\b(aadhaar|aadhar|vid|uidai)\s*:/i.test(acc + verify),
  'no Aadhaar or VID number is ever collected or stored')
check(/AUA\/KUA|licence|license/.test(verify),
  'and the file says why, so nobody re-opens the question on demo morning')
check(/verifiedBy/.test(buyer),
  'the badge is shown to the BUYER, which is the only place it earns anything')

// --- and she can leave the screen, and knows what came back ---
//
// Both from one report with a screenshot: she signed in, the app said her
// shop was safe on …3210, and the back arrow did nothing. Screen runs onBack
// and then nav(-1) unless onBack says it handled it — so "go home" went home
// and immediately one step further back, which on a fresh install is this
// screen again.
check(/onBack=\{\(\) => \{ nav\('\/'\); return false \}\}/.test(screen),
  'the back arrow says it handled the navigation, so the app does not go back twice')
check(/seeMyShop/.test(screen),
  'and once signed in there is a button to her shop — this screen had nothing to press')
// The same report's second half: recovery WORKED and looked broken, because
// the number belonged to an account with nothing in it and the screen said
// the same sentence either way.
check(/shopHasItems/.test(screen) && /shopHasNothing/.test(screen),
  'it says how much came back, and says plainly when the answer is nothing')

console.log(bad ? `\n${bad} failed` : '\nall good')
process.exit(bad ? 1 : 0)
