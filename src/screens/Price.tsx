import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Screen from '../components/Screen'
import BigButton from '../components/BigButton'
import { getProduct, patchProduct } from '../services/db'
import { suggestPrice } from '../services/pricing'
import { speak } from '../lib/speak'
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
      action={<BigButton icon="👉" label={t('next')} onClick={next} />}
    >
      {/* No typing. She taps + and - . */}
      <Stepper label={t('materialCost')} unit="₹" value={cost.materialCost} step={50}
        onChange={v => setCost({ ...cost, materialCost: v })} />
      <Stepper label={t('hoursTaken')} unit={t('hours')} value={cost.hours} step={2}
        onChange={v => setCost({ ...cost, hours: v })} />

      {price && (
        <div className="mt-6 flex flex-col gap-3">
          <Row label={t('yourCost')} value={`₹${price.floor}`} hint={t('dontSellBelow')} />
          <Row label={t('marketRange')} value={`₹${price.marketLow} – ₹${price.marketHigh}`} />

          <button
            onClick={() => speak(`${t('weSuggest')} ${price.suggested} ${t('rupees')}. ${price.reason}`)}
            className="rounded-2xl border-2 border-indigo bg-wash p-5 text-left active:opacity-80"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo">
              🔊 {t('weSuggest')}
            </p>
            <p className="my-1 text-5xl font-bold tracking-tight text-indigo tabular-nums">
              ₹{price.suggested}
            </p>
            <p className="text-sm text-ink-2">{price.reason}</p>
          </button>
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
      <p className="mb-2 font-medium">{label}</p>
      <div className="flex items-center gap-3">
        <button onClick={() => onChange(Math.max(0, value - step))}
          className="h-14 w-14 min-h-0 rounded-xl border-2 border-line bg-surface text-2xl active:bg-wash">−</button>
        <div className="flex-1 rounded-xl border border-line bg-surface py-3 text-center text-2xl font-semibold tabular-nums">
          {unit === '₹' ? `₹${value}` : `${value} ${unit}`}
        </div>
        <button onClick={() => onChange(value + step)}
          className="h-14 w-14 min-h-0 rounded-xl border-2 border-line bg-surface text-2xl active:bg-wash">+</button>
      </div>
    </div>
  )
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between rounded-xl border border-line bg-surface px-4 py-3">
      <div>
        <p className="text-sm text-ink-2">{label}</p>
        {hint && <p className="text-xs text-gold">{hint}</p>}
      </div>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}
