// Reproduces the hang: an open request that fires `blocked` and nothing else.
// Before the fix the promise never settled. After it, we reject promptly.
function openLike({ handleBlocked }) {
  return new Promise((resolve, reject) => {
    const req = {}
    if (handleBlocked) req.onblocked = () => reject(new Error('blocked'))
    if (handleBlocked) setTimeout(() => reject(new Error('timeout')), 50)
    // simulate the browser firing ONLY `blocked` — no success, no error
    setTimeout(() => req.onblocked?.(), 5)
  })
}

async function settlesWithin(p, ms) {
  return Promise.race([
    p.then(() => 'resolved', () => 'rejected'),
    new Promise(r => setTimeout(() => r('HUNG'), ms)),
  ])
}

const before = await settlesWithin(openLike({ handleBlocked: false }), 120)
const after  = await settlesWithin(openLike({ handleBlocked: true  }), 120)

console.log(`without onblocked: ${before}`)
console.log(`with onblocked:    ${after}`)
const ok = before === 'HUNG' && after === 'rejected'
console.log(ok ? 'PASS — the fix converts a silent hang into a real error' : 'FAIL')
process.exit(ok ? 0 : 1)
