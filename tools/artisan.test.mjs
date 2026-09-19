// Identity, for a dashboard metric, in an app whose user cannot read.
// The failure mode this guards against is a login screen appearing in front
// of someone who has never typed on a phone, for the sake of a number on a
// page she never opens.
import { readFileSync } from 'node:fs'
const a = readFileSync('src/services/artisan.ts', 'utf8')
const capture = readFileSync('src/screens/Capture.tsx', 'utf8')
const impact = readFileSync('src/screens/Impact.tsx', 'utf8')
const types = readFileSync('src/types.ts', 'utf8')

let bad = 0
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) bad++ }

check(/signInAnonymously/.test(a), 'anonymous sign-in — no screen, nothing to read or type')
check(!/signInWithEmail|signInWithPhone|createUserWith/.test(a),
  'and no credential flow anywhere near her')
check(/catch[\s\S]{0,200}?localId\(\)/.test(a),
  'auth failing falls back to a device id rather than blocking the golden path')
check(/onAuthStateChanged/.test(a), 'an existing session is reused instead of signing in again')
check(/artisanId\?: string/.test(types), 'the field is optional, so older products stay valid')
check(/artisanId: await artisanId\(\)/.test(capture), 'stamped once, where the product starts existing')

// The metric has to report its own unknowns.
check(/const unattributed = products\.filter\(p => !p\.artisanId\)\.length/.test(impact),
  'products without an id are counted separately')
check(/filter\(Boolean\)/.test(impact), 'and are never folded into the artisan count')
check(/counts devices, not people/.test(impact),
  'the dashboard states what the number actually measures')

console.log(bad ? `\n${bad} failed` : '\nall good')
process.exit(bad ? 1 : 0)
