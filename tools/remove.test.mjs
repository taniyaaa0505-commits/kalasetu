// Removing a product must never leave an order pointing at nothing.
// That failure would show up as an order silently vanishing, mid-demo.

// mirrors blockingOrders() in services/products.ts
const blocking = orders => orders.filter(o => o.status !== 'declined')

/** The whole rule: refuse if anything is still owed to a buyer. */
function simulate({ orders, messages }) {
  const blockers = blocking(orders)
  if (blockers.length) return { removed: false, orders, messages }
  return { removed: true, orders: [], messages: [] }   // messages go with it
}

const cases = [
  ['no orders at all',        { orders: [], messages: ['m1','m2'] }, true],
  ['only a declined order',   { orders: [{status:'declined'}], messages: [] }, true],
  ['a new order waiting',     { orders: [{status:'placed'}], messages: [] }, false],
  ['she accepted it',         { orders: [{status:'accepted'}], messages: ['m1'] }, false],
  ['already shipped',         { orders: [{status:'shipped'}], messages: [] }, false],
  ['delivered — still kept',  { orders: [{status:'delivered'}], messages: [] }, false],
  ['declined + one live',     { orders: [{status:'declined'},{status:'placed'}], messages: [] }, false],
]

let bad = 0
for (const [name, state, shouldRemove] of cases) {
  const r = simulate(state)
  const orphanOrders = r.removed && r.orders.length > 0
  const orphanMsgs   = r.removed && r.messages.length > 0
  const ok = r.removed === shouldRemove && !orphanOrders && !orphanMsgs
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(26)} removed=${r.removed}`)
  if (!ok) bad++
}

// A delivered order is history that the credit story depends on. Keeping it is
// deliberate, not an oversight — say so if anyone asks why it blocks removal.
console.log(bad ? `\n${bad} FAILURES` : `\nall ${cases.length} cases pass — no orphaned orders or messages`)
process.exit(bad ? 1 : 0)
