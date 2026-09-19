// The guided first run is the first thing a stranger sees, and it is spread
// across eight files, so its wiring is worth asserting rather than trusting.
import { readFileSync, readdirSync } from 'node:fs'

const guide = readFileSync('src/lib/guide.ts', 'utf8')
const coach = readFileSync('src/components/Coach.tsx', 'utf8')

let bad = 0
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) bad++ }

// ---- the step list --------------------------------------------------------
const steps = [...guide.matchAll(/^\s*'([a-zA-Z]+)',\s*(?:\/\/.*)?$/gm)].map(m => m[1])
check(steps.length >= 13, `${steps.length} steps defined`)
check(new Set(steps).size === steps.length, 'step names are unique')
check(steps[0] === 'language', 'language is first — nothing is legible before it')
check(steps.at(-1) === 'done', 'done is last')

// ---- every step is actually rendered somewhere ----------------------------
const SCREENS = ['Home', 'Capture', 'Speak', 'Review', 'Price', 'Publish']
const src = SCREENS.map(f => readFileSync(`src/screens/${f}.tsx`, 'utf8')).join('\n')
  + readFileSync('src/screens/Start.tsx', 'utf8')
const rendered = new Set([...src.matchAll(/<Coach\s+step="([a-zA-Z]+)"/g)].map(m => m[1]))
const orphans = steps.filter(s => s !== 'language' && s !== 'done' && !rendered.has(s))
check(orphans.length === 0, `every step has a Coach${orphans.length ? ' — missing: ' + orphans : ''}`)

// ---- every step can be left ----------------------------------------------
// A step with no advance call and no `mode="next"` button is a dead end: she
// would be stuck behind a ring with nothing that dismisses it.
const advanced = new Set([...src.matchAll(/advanceGuide\('([a-zA-Z]+)'\)/g)].map(m => m[1]))
const nextMode = new Set(
  [...src.matchAll(/<Coach\s+step="([a-zA-Z]+)"[\s\S]{0,400}?\/>/g)]
    .filter(m => !m[0].includes('mode="tap"')).map(m => m[1]))
const stuck = steps.filter(s => s !== 'done' && !advanced.has(s) && !nextMode.has(s))
check(stuck.length === 0, `no dead ends${stuck.length ? ' — stuck at: ' + stuck : ''}`)

// ---- every target a Coach points at exists somewhere ----------------------
const all = readdirSync('src/screens').map(f => readFileSync(`src/screens/${f}`, 'utf8')).join('\n')
  + readdirSync('src/components').map(f => readFileSync(`src/components/${f}`, 'utf8')).join('\n')
const targets = [...new Set([...src.matchAll(/target="([a-z]+)"/g)].map(m => m[1]))]
// A target may be written on the element (`data-guide="usual"`) or handed to a
// component that forwards it (`guide="usual"` -> `data-guide={guide}`). Both
// are real; only "declared nowhere" is a bug.
const forwards = /data-guide=\{\w+\}/.test(all)
const missing = targets.filter(t =>
  !all.includes(`data-guide="${t}"`) && !(forwards && all.includes(`guide="${t}"`)))
check(missing.length === 0, `all ${targets.length} targets exist${missing.length ? ' — missing: ' + missing : ''}`)

// ---- it must be escapable and survivable ---------------------------------
check(coach.includes('endGuide'), 'every step offers a way out')
check(guide.includes("localStorage.getItem(OLD_KEY) === '1'"),
  'anyone who finished the old tour is not made to do this again')
check(/catch\s*{\s*return 'done'/.test(guide),
  'blocked storage ends the guide rather than looping it forever')

// ---- the strings it speaks exist in every language ------------------------
const LOCALES = readdirSync('src/lib/locales')
  .filter(f => f.endsWith('.ts') && f !== 'index.ts')
  .map(f => [f.replace('.ts', ''), readFileSync(`src/lib/locales/${f}`, 'utf8')])
const spoken = [...new Set([
  ...[...src.matchAll(/(?:title|body)=\{t\('([a-zA-Z]+)'\)\}/g)].map(m => m[1]),
  ...[...coach.matchAll(/t\('([a-zA-Z]+)'\)/g)].map(m => m[1]),
])]
for (const [name, text] of LOCALES) {
  const gaps = spoken.filter(k => !new RegExp(`^\\s*${k}:`, 'm').test(text))
  check(gaps.length === 0, `${name}: all ${spoken.length} guide strings present${gaps.length ? ' — missing: ' + gaps : ''}`)
}

// ---- the guide can never be left behind her -------------------------------
// She can outrun it: a ring waiting for a target that never appears does not
// stop her pressing the real button next to it. If advancing required an exact
// match, finishing a later step while the guide sat on an earlier one would
// silently do nothing and she would walk the rest of the app unguided.
check(/const now = GUIDE_STEPS.indexOf\(current\)/.test(guide) && /if \(now > i\) return/.test(guide),
  'advanceGuide jumps forward when the guide is behind her')
check(guide.includes('quiet = true'), 'a self-skip is marked silent')
check(/if \(enteredQuietly\(\)\) return/.test(coach), 'a silently-entered step does not speak')

// ---- a target must have a box ------------------------------------------
// `display: contents` renders the children and no box of its own, so
// getBoundingClientRect returns zeros and the ring can never find it — the
// step just skips, silently. It cost homeOrders and homeLearn before anyone
// noticed.
const boxless = [...all.matchAll(/data-guide=\"(\w+)\"[^>]*className=\"[^\"]*\bcontents\b/g)]
  .concat([...all.matchAll(/className=\"[^\"]*\bcontents\b[^\"]*\"[^>]*data-guide=\"(\w+)\"/g)])
  .map(m => m[1])
check(boxless.length === 0,
  `no guide target on a display:contents element${boxless.length ? ' — ' + boxless : ''}`)

console.log(bad ? `\n${bad} failed` : '\nall good')
process.exit(bad ? 1 : 0)
