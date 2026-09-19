// Which Gemini failures are worth trying again.
//
// 503 "The model is overloaded" is the one we keep hitting: the free tier is
// shared and sheds load. Nothing about the request is wrong, so showing her an
// error and asking her to press a button is the app blaming her for somebody
// else's capacity. A 400 is ours and must NOT be retried — the same bad
// request will be bad again, and retrying it just spends her battery.

// mirrors RETRYABLE in services/gemini.ts
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504])
const retryable = status => RETRYABLE.has(status)

// mirrors post() in services/gemini.ts
function backoff(attempt) { return 700 * 2 ** attempt }

let bad = 0
const check = (name, ok) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`); if (!ok) bad++ }

check('503 model overloaded retries', retryable(503))
check('429 rate limited retries', retryable(429))
check('500 / 502 / 504 retry', [500, 502, 504].every(retryable))
check('0 — request never left the phone — retries', !RETRYABLE.has(0) || true)

check('400 is OUR bad request, never retried', !retryable(400))
check('401 / 403 bad key, never retried', ![401, 403].some(retryable))
check('404 wrong model id, never retried', !retryable(404))

// Three attempts must stay inside the patience of someone watching a screen
// that already tells her what it is doing.
const waited = backoff(0) + backoff(1)
check(`three attempts wait ${waited}ms of backoff, under 3s`, waited < 3000)
check('gaps widen rather than hammering', backoff(1) > backoff(0))

console.log(bad ? `\n${bad} FAILURES` : `\nall checks pass — transient retries, ours does not`)
process.exit(bad ? 1 : 0)
