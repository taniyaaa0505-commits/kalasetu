// The app talks constantly, and two voices at once is worse than silence —
// she cannot re-read what she missed. These are the places where an utterance
// can collide with another, or with the microphone.
import { readFileSync } from 'node:fs'

const review = readFileSync('src/screens/Review.tsx', 'utf8')
const speak  = readFileSync('src/lib/speak.ts', 'utf8')
const speakS = readFileSync('src/screens/Speak.tsx', 'utf8')
const able   = readFileSync('src/components/Speakable.tsx', 'utf8')

let bad = 0
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) bad++ }

// ---- on arrival she hears the questions, and nothing else ----------------
// The draft that lands is missing exactly the facts the questions are about,
// so reading it out first was thirty seconds of prose that was about to be
// replaced, with the questions arriving behind it as an afterthought. The
// listing gets read properly after the rewrite, when it contains her answers.
const ann = review.slice(review.indexOf('announced.current = true'))
const iAsked   = ann.search(/askedMore/)
const iListing = ann.search(/speak\(`\$\{heading\}\. \$\{body\}`/)
check(iAsked > -1, 'the questions are spoken on arrival')
check(iListing > iAsked, 'and the whole listing is NOT read out ahead of them')
// The count and the first question are one utterance for the same reason the
// chain existed: two bare speak() calls in a row cancel each other.
check(/speak\(`\$\{tf\('askedMore'[\s\S]{0,80}?\$\{open\[0\]\}`/.test(ann),
  'the count and the first question go out as ONE utterance')
// Read back only once it is worth reading, and only then point at the way out.
check(/setRewrote\(true\)/.test(review) && /\(\) => \{?\s*setReadBack\(true\)/.test(review),
  'the rewritten listing is read back, and "next" waits for that to finish')

// ---- one voice at a time -------------------------------------------------
check(/export function useSpeaking/.test(speak), 'speaking state is observable')
check(/setTalking\(false\)/.test(speak.slice(speak.indexOf('export function stopSpeaking'))),
  'stopSpeaking clears the flag, so nothing is left disabled forever')
check(!/if \(!onDone\) return/.test(speak),
  'the finish watchdog runs for every utterance, not only ones with a callback')

// ---- nothing that would collide stays pressable --------------------------
check(/disabled=\{talking\}/.test(able), 'a speakable line cannot cut off the one already playing')
check(/disabled=\{talking && !recording\}/.test(speakS),
  'the microphone cannot open while the phone is still talking into it')
check(/label=\{t\('hearItBack'\)\}[^/]*disabled=\{talking\}/.test(speakS.replace(/\n/g, ' ')),
  'hear-it-back waits its turn')

// ---- every step of the golden path says what it is for ------------------
// Outside the guided first run these screens opened in silence, which is fine
// for a reader and useless for anyone else.
import { readFileSync as rf } from 'node:fs'
const arrival = rf('src/lib/arrival.ts', 'utf8')
const screen  = rf('src/components/Screen.tsx', 'utf8')
// `say=` on Screen counts: the frame calls useSay for the screen and prints
// the same sentence with a speaker on it. tools/voice.test.mjs holds the
// whole-app version of this rule.
for (const f of ['Capture', 'Speak', 'Price', 'Publish']) {
  const src = rf(`src/screens/${f}.tsx`, 'utf8')
  check(/useSay\(/.test(src) || /\bsay=\{/.test(src), `${f} speaks on arrival`)
}
check(/useSay\(t\('stepDone'\)/.test(rf('src/screens/Capture.tsx', 'utf8'))
   && /useSay\(t\('stepDone'\)/.test(rf('src/screens/Speak.tsx', 'utf8')),
  'and says so when the step is finished')
check(/getGuideStep\(\) !== 'done'\) return/.test(arrival),
  'but never over the guide — one voice per screen, not two')
check(/said\.current === text/.test(arrival),
  'and once per screen, not once per render')
check(/useEffect\(\(\) => \(\) => stopSpeaking\(\), \[\]\)/.test(screen),
  'a sentence does not follow her onto the next page')

// ---- the very first sound the app ever makes ---------------------------
// Chrome will not speak until the page has had a real touch, and it fails
// SILENTLY: speak() is accepted, nothing is queued, no error is raised. So the
// opening screen must give her something to press, and must know the
// difference between "we called speak" and "a sound came out".
const start = rf('src/screens/Start.tsx', 'utf8')
check(/export function hasSpoken/.test(speak), 'speak.ts reports whether a sound actually started')
check(/u\.onstart = markSpoke/.test(speak),
  'measured from onstart — the only honest signal, since the call itself always succeeds')
check(/markSpoke\(\)\s*\/\/ Android TTS has no gesture requirement/.test(speak),
  'the APK is exempt: native TTS has no gate')
check(/const heard = useHasSpoken\(\)/.test(start), 'the start screen watches for it')
check(/heard \? \(/.test(start) && /beacon press/.test(start),
  'and shows one enormous ringed speaker until a sound has come out')

console.log(bad ? `\n${bad} failed` : '\nall good')
process.exit(bad ? 1 : 0)
