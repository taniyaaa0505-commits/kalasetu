// The beacon points at the one thing to press. Its whole value is that it is
// RARE — a ring that is always on is wallpaper within a day, and then the
// moment you genuinely need her eye has nothing left to grab it with.
import { readFileSync } from 'node:fs'
const css  = readFileSync('src/index.css', 'utf8')
const idle = readFileSync('src/lib/idle.ts', 'utf8')
const big  = readFileSync('src/components/BigButton.tsx', 'utf8')
const read = f => readFileSync(`src/screens/${f}.tsx`, 'utf8')

let bad = 0
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) bad++ }

// ---- it is a ring around the control, never a shine across it -----------
// SPEC.md: "No gradients on buttons — contrast dies in sunlight", and a woman
// photographing her work in a courtyard is standing in exactly that.
check(/\.beacon::after/.test(css), 'the beacon is drawn outside the control')
check(!/\.beacon\s*{[^}]*gradient/.test(css), 'and never as a gradient over it')
check(/\.beacon::after[\s\S]{0,220}?border:/.test(css), 'it is a border, so the button keeps its own contrast')

// ---- only for someone who has stopped ------------------------------------
// Read the event list itself, not the file — the word "pointermove" appears
// in the comment explaining why it is deliberately absent.
const events = /const events = \[([^\]]*)\]/.exec(idle)?.[1] ?? ''
check(/'pointerdown'/.test(events) && /'keydown'/.test(events),
  'idle counts real actions')
check(!/pointermove|mousemove/.test(events),
  'and not mouse movement — a moving cursor would suppress it forever')

// ---- never twice, never on a dead button ---------------------------------
// One value decides both the ring and the bell, so the two can never disagree.
check(/const lit = Boolean\(beacon\) && !disabled/.test(big) && /lit \? 'beacon '/.test(big),
  'never rings a button she cannot press')

// ---- the bell belongs to the ring, not to the clock ----------------------
// It used to live in useIdle, which fires after three still seconds on EVERY
// screen — but each screen gates the visible ring on more than that. So the
// bell rang on its own, pointing at nothing, which is the one thing a sound
// must never do here.
// Test the import and the call, never the word — "chime" appears in the
// comment in idle.ts explaining why it is deliberately absent, exactly as
// "pointermove" does above.
check(!/from '\.\/chime'/.test(idle) && !/\bchime\(\)/.test(idle),
  'being still is not by itself a reason to make a sound')
check(/useBeaconChime\(lit\)/.test(big),
  'the bell rings from the same value that draws the ring')
for (const f of ['Home', 'Capture', 'Speak', 'Review', 'Price', 'Publish']) {
  const s = read(f)
  check(/useIdle\(\)/.test(s), `${f} only rings when she has stalled`)
  // However the step is read — getGuideStep(), useGuideStep(), a local — the
  // beacon must be gated on the guide having finished.
  check(/=== 'done'/.test(s),
    `${f} does not ring over the guide's own ring`)
}

// ---- the price screen points at what is still missing --------------------
const price = read('Price')
check(/beacon=\{nudge && usual === 0\}/.test(price),
  'price rings the income question while it is unanswered')
check(/beacon=\{nudge && usual > 0\}/.test(price),
  'and only then moves the ring to "next" — never both at once')

// ---- every question gets an answer before she can move on ----------------
// The model only asks when it genuinely could not tell, so an unanswered
// question is a fact missing from the listing a buyer will read. Answering one
// used to be enough: `dirty` flipped the footer to "write it again" and the
// obvious next move was to leave the rest blank.
const review = read('Review')
check(/const blocked = openQuestions > 0 && !rewrote/.test(review),
  'Review knows when questions are still open')
// A rewrite sends her answers back and the model may return NEW questions —
// different strings, so none of her answers match them and the wall goes back
// up. Twice and she can never leave the screen. One full pass is the rule.
check(/&& !rewrote/.test(review),
  'and one full pass releases it, so a fresh set of questions cannot trap her')
// Every way off this screen — rewrite, and both spellings of "next" — waits.
const offRamps = review.match(/disabled=\{[^}]*\}/g) ?? []
check(offRamps.filter(d => /blocked/.test(d)).length >= 3,
  'and blocks rewrite and next until every one is answered')
check(/speak\(\s*`\$\{tf\('askedMore'/.test(review),
  'and says how many are left, because she cannot read the reason')
// The order of the work is the order of the screen. Answering ONE used to flip
// the footer to a disabled "write it again" and move the guide's ring onto it,
// with the questions she still had open dimmed behind — the app pointing at a
// dead button and calling it the next step, on the run we demo.
check(/if \(dirty && openQuestions === 0\) advanceGuide\('reviewQuestions'\)/.test(review),
  'the guide leaves the questions only once the LAST one is answered')
check(/blocked\s*\n\s*\? <BigButton[\s\S]{0,240}?askedMore/.test(review),
  'and until then the footer is the questions, not a "write it again" she cannot press')

console.log(bad ? `\n${bad} failed` : '\nall good')
process.exit(bad ? 1 : 0)
