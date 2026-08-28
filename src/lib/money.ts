/**
 * Money, shown as notes and coins rather than as a numeral.
 *
 * Why this exists: many of our users count cash fluently but cannot read
 * numerals. "₹2,400" is abstract. Four five-hundreds and two two-hundreds is
 * something she has held in her hand her whole life.
 *
 * We draw stylised coloured chips carrying the denomination — deliberately
 * NOT realistic reproductions of Indian currency. The colours follow the real
 * notes only so they are recognisable at a glance.
 */

export interface Stack {
  value: number
  count: number
  kind: 'note' | 'coin'
  /** Background and text colour for the chip. */
  bg: string
  fg: string
}

const DENOMS: { value: number; kind: 'note' | 'coin'; bg: string; fg: string }[] = [
  { value: 500, kind: 'note', bg: '#8C8C82', fg: '#FFFFFF' },  // stone grey
  { value: 200, kind: 'note', bg: '#E0952F', fg: '#3A2405' },  // bright orange-yellow
  { value: 100, kind: 'note', bg: '#9083BE', fg: '#FFFFFF' },  // lavender
  { value:  50, kind: 'note', bg: '#4FA8CC', fg: '#04303F' },  // fluorescent blue
  { value:  20, kind: 'note', bg: '#AEBB3C', fg: '#2A3005' },  // greenish yellow
  { value:  10, kind: 'note', bg: '#8E7355', fg: '#FFFFFF' },  // chocolate brown
  { value:   5, kind: 'coin', bg: '#B0AFAA', fg: '#2B2B28' },
  { value:   2, kind: 'coin', bg: '#B0AFAA', fg: '#2B2B28' },
  { value:   1, kind: 'coin', bg: '#B0AFAA', fg: '#2B2B28' },
]

/** Break an amount into the fewest notes and coins, largest first. */
export function toStacks(amount: number): Stack[] {
  let left = Math.max(0, Math.round(amount))
  const out: Stack[] = []
  for (const d of DENOMS) {
    const count = Math.floor(left / d.value)
    if (count > 0) { out.push({ ...d, count }); left -= count * d.value }
  }
  return out
}

/** "चार पाँच सौ के नोट, दो दो सौ के नोट" — a spoken description of the stacks. */
export function describeStacks(stacks: Stack[], lang: string): string {
  const isEn = lang.startsWith('en')
  return stacks
    .map(s => isEn
      ? `${s.count} ${s.kind === 'coin' ? 'coin' : 'note'}${s.count > 1 ? 's' : ''} of ${s.value}`
      : `${s.value} के ${s.count} ${s.kind === 'coin' ? 'सिक्के' : 'नोट'}`)
    .join(isEn ? ', ' : ', ')
}
