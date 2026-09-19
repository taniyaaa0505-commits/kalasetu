// A hook after a conditional `return` is a blank screen waiting to happen.
//
// This is not theoretical. `useIdle()` was placed below `if (busy) return` in
// Review.tsx: five hooks while the listing was being written, six once it
// arrived, and React unmounted the whole tree at precisely the moment her
// title and description should have appeared. It shipped, and it took a real
// phone to find it.
import { readFileSync, readdirSync } from 'node:fs'

const HOOK = /\b(use[A-Z]\w*)\s*\(/
let bad = 0
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) bad++ }

const files = [
  ...readdirSync('src/screens').map(f => `src/screens/${f}`),
  ...readdirSync('src/components').map(f => `src/components/${f}`),
].filter(f => f.endsWith('.tsx'))

for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n')
  let depth = 0, returnedEarly = -1, offence = null

  lines.forEach((line, i) => {
    // Track component boundaries loosely: a top-level function resets state.
    if (/^(export default )?function [A-Z]/.test(line)) { returnedEarly = -1; depth = 0 }
    // A conditional return at the top level of a component body.
    if (/^\s{2}if \(.*\) return/.test(line) && returnedEarly < 0) returnedEarly = i + 1
    if (returnedEarly > 0 && !offence) {
      const m = HOOK.exec(line)
      // Ignore hook definitions and calls nested inside other functions.
      if (m && /^\s{2}(const|let|var|use)/.test(line) && !/function|=>/.test(line)) {
        offence = `${m[1]}() on line ${i + 1}, after an early return on line ${returnedEarly}`
      }
    }
    depth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length
  })

  check(!offence, `${file.split('/').pop()}${offence ? ' — ' + offence : ''}`)
}

// ---- a hook behind && or ?: only runs sometimes --------------------------
// `useIdle() && useGuideStep() === 'done'` reads perfectly well and is the
// same bug by another route: && short-circuits, so the second hook is called
// on some renders and not others.
for (const file of files) {
  const src = readFileSync(file, 'utf8')
  const shorted = [...src.matchAll(/^.*?(?:&&|\|\||\?)[^\n]*?\buse[A-Z]\w*\s*\(/gm)]
    .map(m => m[0].trim())
    .filter(l => !l.startsWith('//') && !l.startsWith('*') && !/^(export )?function|=>/.test(l))
  check(shorted.length === 0,
    `${file.split('/').pop()} — no hook behind a short-circuit${shorted.length ? ': ' + shorted[0].slice(0, 60) : ''}`)
}

console.log(bad ? `\n${bad} problem(s)` : '\nall good')
process.exit(bad ? 1 : 0)
