// Firestore refuses a whole document if any field is `undefined`, and our
// types are full of optional properties. Every order from the buyer page was
// being rejected for exactly this: the form never sets `needBy`, so the write
// carried `needBy: undefined` and the button sat on "Placing…" for ever.

// mirrors withoutUndefined() in services/store/cloud.ts
function withoutUndefined(value) {
  if (Array.isArray(value)) return value.map(withoutUndefined)
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) if (v !== undefined) out[k] = withoutUndefined(v)
    return out
  }
  return value
}

const hasUndefined = v =>
  Array.isArray(v) ? v.some(hasUndefined)
  : v && typeof v === 'object' ? Object.values(v).some(x => x === undefined || hasUndefined(x))
  : false

let bad = 0
const check = (name, ok) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`); if (!ok) bad++ }

// the real order that was failing
const order = {
  id: 'o1', productId: 'p1', createdAt: 1, updatedAt: 1, status: 'placed',
  quantity: 20, unitPrice: 750, total: 15000,
  buyerName: 'Ravi', buyerOrg: undefined, note: undefined, noteLocal: undefined, needBy: undefined,
}
const clean = withoutUndefined(order)
check('the order that was being rejected is now clean', !hasUndefined(clean))
check('its real fields survive', clean.quantity === 20 && clean.buyerName === 'Ravi' && clean.total === 15000)
check('the undefined keys are gone, not nulled', !('needBy' in clean) && !('note' in clean))

// a product, where optionals nest
const product = {
  id: 'p1', createdAt: 1, status: 'draft', lang: 'hi-IN',
  photo: undefined, cleanPhoto: 'data:...', answers: [{ question: '', answer: 'x' }],
  listing: { titleHi: 'a', titleEn: 'b', keywords: ['x'], questions: [], craft: undefined },
  price: undefined,
}
const cp = withoutUndefined(product)
check('nested undefined inside listing is dropped', !hasUndefined(cp))
check('nested real values survive', cp.listing.titleHi === 'a' && cp.answers[0].answer === 'x')
check('arrays stay arrays', Array.isArray(cp.listing.keywords) && cp.listing.keywords[0] === 'x')

// things that are NOT undefined must be left alone
const keep = withoutUndefined({ a: null, b: 0, c: '', d: false })
check('null, 0, empty string and false are kept', 'a' in keep && keep.b === 0 && keep.c === '' && keep.d === false)

console.log(bad ? `\n${bad} FAILURES` : `\nall checks pass — no undefined can reach Firestore`)
process.exit(bad ? 1 : 0)
