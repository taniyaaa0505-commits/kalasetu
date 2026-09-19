// Every screen she uses says what it is, and every sentence it says can be
// heard again.
//
// The app is for a woman who does not read. That makes a silent screen a
// blank screen — and it kept happening one screen at a time: orders and
// messages, the two places a buyer actually reaches her, both opened without
// a word, and the price and send screens said a line that was printed nowhere
// she could tap. This test is the thing that notices.
//
// The rule, for a screen SHE uses:
//   1. it says one sentence on arrival — `say=` on Screen, `useSay`, or its
//      own speak() on mount; and
//   2. that same sentence is on the page behind a speaker — <Speakable>, or
//      Screen's `say=`, which renders one.
//
// The buyer's screens are exempt and named below: a gifting company on a
// laptop reads English and did not come here to be read to.
import { readFileSync, readdirSync } from 'node:fs'

// The outward-facing three, plus the export screen: all English, all for
// someone at a laptop — a gifting company, a ministry officer, a cluster
// coordinator packing a catalogue for GeM. None of them is her.
const BUYER_SIDE = ['Buyer', 'BuyerProduct', 'Impact', 'Channels']

const screens = readdirSync('src/screens').filter(f => f.endsWith('.tsx')).map(f => f.replace('.tsx', ''))
let bad = 0
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) bad++ }

// The frame itself, because everything below leans on it.
const screen = readFileSync('src/components/Screen.tsx', 'utf8')
check(/useSay\(say\)/.test(screen), 'Screen speaks its `say` on arrival')
check(/\{say && <Speakable text=\{say\}/.test(screen), 'and prints it with a speaker on it')

const speakable = readFileSync('src/components/Speakable.tsx', 'utf8')
check(/onClick=\{\(\) => speak\(text/.test(speakable), 'a Speakable reads its own text out loud when tapped')

for (const name of screens) {
  if (BUYER_SIDE.includes(name)) continue
  const src = readFileSync(`src/screens/${name}.tsx`, 'utf8')

  // `useEffect(greet, [])` — the mount effect is a named function defined
  // elsewhere in the file (Start does this, because its greeting is also the
  // replay button's handler).
  const namedMountEffect = [...src.matchAll(/useEffect\((\w+),\s*\[\]\)/g)]
    .some(m => new RegExp(`(const|function)\\s+${m[1]}\\b[\\s\\S]{0,400}?speak\\(`).test(src))

  const arrives =
    /<Screen[^>]*[\s\S]{0,400}?\bsay=\{/.test(src) ||   // the frame says it
    /useSay\(/.test(src) ||                              // or the screen does
    /useEffect\([\s\S]{0,900}?speak\(/.test(src) ||     // or it speaks on mount itself
    namedMountEffect
  check(arrives, `${name} says something when she arrives`)

  const replay =
    /\bsay=\{/.test(src) ||        // Screen prints `say` with a speaker
    /<Speakable/.test(src) ||      // or the screen prints its own
    /Icon name="speak"/.test(src)  // or it draws the speaker itself (Start)
  check(replay, `${name} lets her hear it again`)
}

console.log(bad ? `\n${bad} failed` : '\nall good')
process.exit(bad ? 1 : 0)
