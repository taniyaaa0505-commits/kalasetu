// The polling backend must only wake the screen when something really changed.
// Without this a list of photos re-renders twice a second forever.

const sig = {
  product: p => `${p.id}:${p.status}:${p.price?.suggested ?? 0}:${p.listing ? 1 : 0}:${p.cleanPhoto ? 1 : 0}`,
  order:   o => `${o.id}:${o.status}`,
  message: m => `${m.id}:${m.untranslated ? 0 : 1}`,
}

/** Mirrors localCollection.subscribe: emit only when the fingerprint moves. */
function emissions(snapshots, f) {
  let last = null, out = 0   // null, not '' — an empty list has an empty signature
  for (const items of snapshots) {
    const now = items.map(f).join('|')
    if (now !== last) { last = now; out++ }
  }
  return out
}

let bad = 0
const check = (got, want, msg) => {
  const ok = got === want
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg} (${got} redraws, expected ${want})`)
  if (!ok) bad++
}

const P = { id: 'p1', status: 'draft', createdAt: 1 }

check(emissions([[P], [P], [P], [P]], sig.product), 1,
  'an unchanged product redraws once, not every tick')

check(emissions([[P], [{ ...P, status: 'published' }]], sig.product), 2,
  'publishing redraws')

check(emissions([[P], [{ ...P, cleanPhoto: 'data:...' }]], sig.product), 2,
  'the cleaned photo arriving redraws')

check(emissions([[P], [{ ...P, price: { suggested: 750 } }]], sig.product), 2,
  'a price redraws')

// A field the screen does not show must NOT cause a redraw.
check(emissions([[P], [{ ...P, transcript: 'she spoke' }]], sig.product), 1,
  'a changed transcript alone does not redraw the product list')

const O = { id: 'o1', status: 'placed' }
check(emissions([[O], [O], [{ ...O, status: 'accepted' }]], sig.order), 2,
  'an order redraws when its status moves')

const M = { id: 'm1', untranslated: true }
check(emissions([[M], [M], [{ ...M, untranslated: false }]], sig.message), 2,
  'a message redraws when its translation lands')

check(emissions([[], [M]], sig.message), 2, 'a new message redraws')

console.log(bad ? `\n${bad} FAILURES` : `\nall checks passed`)
process.exit(bad ? 1 : 0)
