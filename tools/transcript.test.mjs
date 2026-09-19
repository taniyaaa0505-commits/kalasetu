// The transcript must say what she said, once.
//
// This bug shipped twice. The first fix assumed Chrome replayed the same
// result INDEX; it does not — on Android it delivers the growing hypothesis at
// NEW indices, so keying by index still joined four prefixes and her sentence
// stacked up on screen while she was still talking. The exact string she
// photographed is the first case below.

// mirrors mergeTranscript() in src/lib/listen.ts
function mergeTranscript(parts) {
  const key = s => s.toLowerCase().replace(/[.,!?;:।॥]/g, '').replace(/\s+/g, ' ').trim()
  const segs = [], keys = []
  for (const raw of parts) {
    const piece = (raw ?? '').trim()
    const k = key(piece)
    if (!k) continue
    const lastKey = keys[keys.length - 1]
    if (lastKey !== undefined && k.startsWith(lastKey)) {
      segs[segs.length - 1] = piece; keys[keys.length - 1] = k; continue
    }
    if (keys.includes(k)) continue
    segs.push(piece); keys.push(k)
  }
  return segs.join(' ')
}

const cases = [
  ['the exact screenshot',
   ['यह', 'यह एक', 'यह एक पंखा', 'यह एक पंखा है'], 'यह एक पंखा है'],

  ['a second sentence is kept',
   ['यह एक पंखा है', 'लकड़ी का बना है'], 'यह एक पंखा है लकड़ी का बना है'],

  ['a whole phrase replayed unchanged',
   ['यह एक पंखा है', 'यह एक पंखा है'], 'यह एक पंखा है'],

  ['English: finalising capitalises and punctuates, still one copy',
   ['this is', 'this is a fan', 'This is a fan.'], 'This is a fan.'],

  ['growth then a new phrase then more growth',
   ['मिट्टी', 'मिट्टी का', 'मिट्टी का घड़ा', 'हाथ से', 'हाथ से बना'],
   'मिट्टी का घड़ा हाथ से बना'],

  ['blanks and whitespace are ignored', ['', '  ', 'नमस्ते'], 'नमस्ते'],
  ['nothing heard at all', [], ''],
  ['she really does repeat a word',
   ['बहुत', 'बहुत बढ़िया'], 'बहुत बढ़िया'],

  // A deliberate trade-off, written down so nobody "fixes" it later. An exact
  // whole-phrase repeat is dropped, because that is what a replayed result
  // looks like and stacking is the far worse failure. If she genuinely says
  // the same sentence twice in one recording, she gets it once.
  ['an identical phrase arriving again out of order is dropped',
   ['मिट्टी का घड़ा', 'हाथ से बना', 'मिट्टी का घड़ा'], 'मिट्टी का घड़ा हाथ से बना'],
]

let bad = 0
for (const [name, parts, want] of cases) {
  const got = mergeTranscript(parts)
  const ok = got === want
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`)
  if (!ok) { console.log(`       want: ${want}\n       got : ${got}`); bad++ }
}

// The naive join is what the screen was showing. Prove we no longer do it.
const naive = ['यह', 'यह एक', 'यह एक पंखा', 'यह एक पंखा है'].join(' ')
console.log(`\nnaive join would be: ${naive}`)
console.log(`we produce:          ${mergeTranscript(['यह', 'यह एक', 'यह एक पंखा', 'यह एक पंखा है'])}`)

console.log(bad ? `\n${bad} FAILURES` : `\nall ${cases.length} cases pass — nothing said twice`)
process.exit(bad ? 1 : 0)
