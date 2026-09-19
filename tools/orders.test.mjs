// Check the state machine refuses nonsense transitions.
const NEXT = {
  placed: ['accepted', 'declined'], accepted: ['shipped'],
  declined: [], shipped: ['delivered'], delivered: [],
}
const cases = [
  ['placed', 'accepted', true], ['placed', 'declined', true],
  ['placed', 'shipped', false],     // cannot ship what she never accepted
  ['declined', 'accepted', false],  // no undo of a decline
  ['accepted', 'shipped', true], ['shipped', 'delivered', true],
  ['delivered', 'shipped', false],  // no going backwards
  ['accepted', 'declined', false],  // cannot decline after accepting
]
let bad = 0
for (const [from, to, want] of cases) {
  const got = NEXT[from].includes(to)
  if (got !== want) { console.log(`FAIL ${from} -> ${to}: got ${got}, want ${want}`); bad++ }
}
console.log(bad === 0 ? `all ${cases.length} transition rules correct` : `${bad} FAILURES`)
process.exit(bad ? 1 : 0)
