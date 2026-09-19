// A crash must never be a blank screen.
//
// Reported from a phone as "shows a blank page", and the cause was not in any
// screen's code: screens are fetched on demand, so an app left open across two
// deploys asks for a chunk that no longer exists, the import rejects, and
// React — with no error boundary anywhere — unmounts the entire tree. White
// screen, nothing to press, and for someone who cannot read an error message
// that is indistinguishable from "my shop is gone".
import { readFileSync } from 'node:fs'
const rescue = readFileSync('src/components/Rescue.tsx', 'utf8')
const app    = readFileSync('src/App.tsx', 'utf8')
const en     = readFileSync('src/lib/locales/en.ts', 'utf8')

let bad = 0
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) bad++ }

check(/getDerivedStateFromError/.test(rescue) && /componentDidCatch/.test(rescue),
  'something in the tree catches a crash')
check(/<Rescue>/.test(app) && app.indexOf('<Rescue>') < app.indexOf('<Suspense'),
  'and it wraps Suspense, so it catches a screen that fails to LOAD as well as one that fails to render')
check(/vite:preloadError/.test(rescue) && /watchForStaleChunks\(\)/.test(app),
  'a chunk that cannot be fetched is caught before React ever sees it')
check(/sessionStorage\.getItem\(RELOADED\) === '1'\) return false/.test(rescue),
  'the automatic reload happens ONCE — a reload loop on a phone is worse than the crash')
check(/rescueRetry/.test(rescue) && /location\.reload\(\)/.test(rescue),
  'and if it still fails there is a button, not a blank screen')
check(/speak\(t\('rescueSaid'\)/.test(rescue), 'it says what happened out loud')
check(/rescueSaid:.*shop is safe/i.test(en),
  'and what it says first is that her shop is safe, which is the fact that matters')

console.log(bad ? `\n${bad} failed` : '\nall good')
process.exit(bad ? 1 : 0)
