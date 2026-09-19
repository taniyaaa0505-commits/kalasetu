// The scale must place every marker inside the drawing, whatever the numbers.
// Edge cases matter here: the floor can exceed the market band when her
// labour is worth more than the going rate, which is exactly the case the
// feature exists to make visible.
const W = 320
function positions({ floor, marketLow, marketHigh, suggested }) {
  const lo = Math.min(floor, marketLow, suggested)
  const hi = Math.max(floor, marketHigh, suggested)
  const span = Math.max(1, hi - lo), pad = span * 0.14
  const min = Math.max(0, lo - pad), max = hi + pad
  const x = v => ((v - min) / (max - min)) * W
  return { floor: x(floor), low: x(marketLow), high: x(marketHigh), sug: x(suggested) }
}

const cases = [
  ['typical',              { floor: 1100, marketLow: 2000, marketHigh: 2900, suggested: 2400 }],
  ['floor above market',   { floor: 3000, marketLow: 1200, marketHigh: 1800, suggested: 3000 }],
  ['all equal',            { floor: 500,  marketLow: 500,  marketHigh: 500,  suggested: 500  }],
  ['tiny amounts',         { floor: 12,   marketLow: 20,   marketHigh: 30,   suggested: 25   }],
  ['huge amounts',         { floor: 90000, marketLow: 150000, marketHigh: 220000, suggested: 180000 }],
]

let bad = 0
for (const [name, p] of cases) {
  const q = positions(p)
  const vals = Object.entries(q)
  const off = vals.filter(([, v]) => !Number.isFinite(v) || v < -0.5 || v > W + 0.5)
  const bandOk = q.high >= q.low
  if (off.length || !bandOk) {
    console.log(`FAIL ${name}: ${off.map(([k,v])=>`${k}=${v.toFixed(1)}`).join(' ') || 'band inverted'}`)
    bad++
  } else {
    console.log(`ok   ${name.padEnd(20)} floor=${q.floor.toFixed(0)} band=${q.low.toFixed(0)}-${q.high.toFixed(0)} pin=${q.sug.toFixed(0)}`)
  }
}
console.log(bad ? `${bad} FAILURES` : `all ${cases.length} cases stay inside the frame`)
process.exit(bad ? 1 : 0)
