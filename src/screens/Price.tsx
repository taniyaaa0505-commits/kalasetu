import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Screen from '../components/Screen'
import Icon from '../components/Icon'
import BigButton from '../components/BigButton'
import { getProduct, patchProduct } from '../services/db'
import { suggestPrice } from '../services/pricing'
import { speak } from '../lib/speak'
import PriceInNotes from '../components/PriceInNotes'
import PriceScale from '../components/PriceScale'
import { t } from '../lib/i18n'
import type { CostInput, PriceSuggestion } from '../types'

export default function Price() {
  const { id = '' } = useParams()
  const nav = useNavigate()

  const [cost, setCost] = useState<CostInput>({ materialCost: 300, hours: 16 })
  const [craft, setCraft] = useState<string>()
  const [price, setPrice] = useState<PriceSuggestion>()

  useEffect(() => {
    getProduct(id).then(p => { if (p?.cost) setCost(p.cost); setCraft(p?.listing?.craft) })
  }, [id])

  // Recompute on every change — the floor is pure maths, it is instant.
  useEffect(() => { setPrice(suggestPrice(cost, craft)) }, [cost, craft])

  async function next() {
    await patchProduct(id, { cost, price })
    nav(`/p/${id}/publish`)
  }

  return (
    <Screen
      title={t('price')} step={5} onBack={() => {}}
      action={<BigButton icon={<Icon name="next" />} label={t('next')} onClick={next} />}
    >
      {/* No typing. She taps + and - . */}
      <p className="mb-4 text-[0.9375rem] leading-snug text-ink-2">{t('tellUsCost')}</p>
      <Stepper label={t('materialCost')} unit="₹" value={cost.materialCost} step={50}
        onChange={v => setCost({ ...cost, materialCost: v })} />
      <Stepper label={t('hoursTaken')} unit={t('hours')} value={cost.hours} step={2}
        onChange={v => setCost({ ...cost, hours: v })} />

      {price && (
        <div className="rise mt-7 flex flex-col gap-3">

          {/* The number first, at the size of the decision it is. Everything
              under it exists to answer "why that?" — which is the question a
              price she did not choose has to survive. */}
          {/* A panel, not one big button. PriceInNotes is itself a button —
              it speaks the amount — and nesting it inside another was invalid
              HTML that React warns about. Two tap targets, each of which says
              something different out loud. */}
          <div className="rounded-panel border-2 border-indigo bg-wash p-5 shadow-card">
            <button
              onClick={() => speak(`${t('weSuggest')} ${price.suggested} ${t('rupees')}. ${price.reason}`)}
              className="press block w-full min-h-0 text-left active:opacity-70"
            >
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-indigo">
                <span aria-hidden>🔊</span>{t('weSuggest')}
                <Icon name="ai" className="ml-auto text-base opacity-50" />
              </p>
              <p className="my-1 text-[3.25rem] font-bold leading-none tracking-tight text-indigo tabular-nums">
                ₹{price.suggested}
              </p>
              <p className="text-sm leading-snug text-ink-2">{price.reason}</p>
            </button>

            {/* What ₹3,040 actually looks like in her hand. She can count
                money even when she cannot read the numeral. */}
            <div className="mt-4">
              <PriceInNotes amount={price.suggested} />
            </div>
          </div>

          {/* Where that number sits between what she must not go below and
              what the market pays. One line, because three separate figures
              make her hold three facts and work out how they relate. */}
          <div className="rounded-card border border-line bg-surface p-4 shadow-rest">
            <PriceScale
              price={price}
              labels={{ floor: t('yourCost'), market: t('marketRange'), suggested: t('weSuggest') }}
            />
          </div>

          <Row label={t('yourCost')} value={`₹${price.floor}`} hint={t('dontSellBelow')} />
        </div>
      )}
    </Screen>
  )
}

function Stepper({ label, unit, value, step, onChange }: {
  label: string; unit: string; value: number; step: number; onChange: (v: number) => void
}) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-[0.9375rem] font-medium">{label}</p>
      <div className="flex items-center gap-3">
        <button onClick={() => onChange(Math.max(0, value - step))}
          aria-label="−"
          className="press h-14 w-14 min-h-0 rounded-card border-2 border-line bg-surface text-2xl shadow-rest active:bg-surface-2">−</button>
        <div className="flex-1 rounded-card border border-line bg-surface py-3 text-center text-2xl font-semibold tabular-nums shadow-rest">
          {unit === '₹' ? `₹${value}` : `${value} ${unit}`}
        </div>
        <button onClick={() => onChange(value + step)}
          aria-label="+"
          className="press h-14 w-14 min-h-0 rounded-card border-2 border-line bg-surface text-2xl shadow-rest active:bg-surface-2">+</button>
      </div>
    </div>
  )
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between rounded-card border border-line bg-surface px-4 py-3 shadow-rest">
      <div>
        <p className="text-sm text-ink-2">{label}</p>
        {hint && <p className="text-xs text-gold">{hint}</p>}
      </div>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}
