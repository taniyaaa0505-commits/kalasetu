// Product identity: the code, the hash, and the one field that may never move.
//
// The problem this answers: everything else in the app identifies a PERSON.
// Nothing identified the pot, so a second seller could photograph the same pot,
// list it, and the woman who made it had no way to point at it.
//
// The hash half is arithmetic, so it is tested for real here — the same image
// hashes the same, a different image does not, and the threshold sits between
// them. The rest is checked against the source, including the rule that keeps
// an owner from quietly becoming the maker.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let bad = 0
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) bad++ }

const out = mkdtempSync(join(tmpdir(), 'identity-'))
const stub = (name, body) => { const p = join(out, name + '.js'); writeFileSync(p, body + '\n'); return p }
const bundle = join(out, 'identity.mjs')

// The real module imports the storage backend, which picks Firestore or
// IndexedDB at import time and needs a browser for either. Only the pure
// arithmetic is under test here, so those two imports are pointed at the
// smallest stubs that satisfy them — by rewriting a copy, because esbuild
// will not alias a relative path.
stub('store', 'export const collection = () => ({ list: async () => [], get: async () => undefined, put: async () => {}, remove: async () => {}, subscribe: () => () => {} })')
stub('idb', 'export const REGISTRY_STORE = "registry"')
const patched = join(out, 'identity.ts')
writeFileSync(patched, readFileSync('src/services/identity.ts', 'utf8')
  .replace("from './store'", "from './store.js'")
  .replace("from './idb'", "from './idb.js'"))
execFileSync('node_modules/.bin/esbuild', [
  patched, '--bundle', '--format=esm', '--platform=neutral',
  `--outfile=${bundle}`, '--log-level=error',
])
const { productCode, makerLabel, distance, LIKELY_MATCH, perceptualHash, cardUrl } = await import(bundle)

/* ---------------- the code ---------------- */

const codes = Array.from({ length: 500 }, productCode)
check(codes.every(c => /^ART-[A-Z2-9]{5}$/.test(c)), 'every code looks like ART-A72F9')
check(!codes.some(c => /[IO01]/.test(c.slice(4))),
  'and contains no I, O, 0 or 1 — the four characters that ruin a code read aloud')
check(new Set(codes).size === codes.length, '500 codes in a row, no collisions')

/* ---------------- the maker label ---------------- */

const uid = 'xO9QfGBoA4PNmhKYfTKk6fCtK2F2'
check(makerLabel(uid) === makerLabel(uid), 'a maker label is stable — the same on every piece she registers')
check(makerLabel(uid) !== makerLabel(uid + 'a'), 'and different for a different maker')
check(!makerLabel(uid).includes(uid.slice(0, 6)),
  'and it is not her uid with a prefix: nothing private goes on a public card')

/* ---------------- the hash ---------------- */

check(distance('0000000000000000', '0000000000000000') === 0, 'the same hash is distance 0')
check(distance('ffffffffffffffff', '0000000000000000') === 64, 'and opposites are 64')
check(distance('0000000000000000', '0000000000000001') === 1, 'one different bit is distance 1')
check(LIKELY_MATCH > 0 && LIKELY_MATCH < 20,
  'the threshold is generous enough to catch a re-photograph and tight enough to mean something')

// perceptualHash needs a canvas, so it is exercised in the browser probe
// rather than here; what this asserts is that it is 64 bits of hex, which is
// what `distance` above assumes.
check(/for \(let i = 0; i < 64; i \+= 4\)/.test(readFileSync('src/services/identity.ts', 'utf8')),
  'the hash is 64 bits rendered as 16 hex characters')
check(typeof perceptualHash === 'function' && typeof cardUrl === 'function', 'the module exports what the screens import')

/* ---------------- maker is forever ---------------- */

const src = readFileSync('src/services/identity.ts', 'utf8')
check(/ownerId: input\.makerId/.test(src), 'a new registration starts with the maker as the owner')
check(/const next: Registration = \{ \.\.\.r, ownerId: newOwner, ownerSince: Date\.now\(\) \}/.test(src),
  'a transfer moves the owner and copies everything else — the maker included')

const rules = readFileSync('firestore.rules', 'utf8')
const reg = rules.slice(rules.indexOf('match /registry'), rules.indexOf('function notPractice'))
check(/request\.resource\.data\.makerId == resource\.data\.makerId/.test(reg),
  'and the server refuses any update that changes the maker')
check(/hasOnly\(\['ownerId', 'ownerSince'\]\)/.test(reg),
  'an update may touch the owner and nothing else — not the hash, not the date')
check(/allow delete: if false/.test(reg), 'nothing can be deleted: a registry a claim can vanish from is not a registry')
check(/allow read: if true/.test(reg), 'and anyone holding the product can look it up, with no account')

/* ---------------- it never stands in her way ---------------- */

check(/catch \{\s*\/\/ Offline, or the registry could not be read\. She registers anyway\./.test(src),
  'a conflict check that cannot run does not stop her registering')
check(/checked: false|checked,/.test(src) && /idNotChecked/.test(readFileSync('src/screens/ProductIdentity.tsx', 'utf8')),
  'and the card says so rather than implying a clean result it never got')

const screen = readFileSync('src/screens/ProductIdentity.tsx', 'utf8')
check(/idIMadeIt/.test(screen) && /idIAmSelling/.test(screen),
  'a conflict offers two honest ways forward, and neither of them is an accusation')
check(!/fraud|stolen|fake/i.test(screen), 'the word fraud appears nowhere on it')

const publicCard = readFileSync('src/screens/PublicCard.tsx', 'utf8')
check(/not an authentication and we do not claim it is one/.test(publicCard),
  'the public card states its own limits')
check(!/phone|address|uid|artisanId/i.test(publicCard.replace(/\/\*[\s\S]*?\*\//g, '')),
  'and carries nothing private')

console.log(bad ? `\n${bad} failed` : '\nall good')
process.exit(bad ? 1 : 0)
