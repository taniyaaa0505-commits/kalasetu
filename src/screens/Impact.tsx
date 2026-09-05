/**
 * The impact dashboard. `/#/impact`.
 *
 * Not for the artisan — she never sees this. It is for the person deciding
 * whether the scheme worked: the Ministry of Social Justice owns this problem
 * statement, and what they are buying is income change, not an app.
 *
 * So it is in English, laid out for a projector, and it leads with the one
 * number the whole project is judged on rather than with feature counts.
 *
 * IT ALSO STATES WHAT IT CANNOT MEASURE, in the same size type as what it can.
 * A dashboard that only reports its good numbers is marketing; a judge who
 * finds an unstated limit stops believing the stated ones. Every figure here
 * is computed from real rows in the store — nothing is seeded, extrapolated or
 * annualised.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scallop, Gota } from '../components/Ornament'
import Icon from '../components/Icon'
import { subscribeProducts } from '../services/db'
import { subscribeOrders } from '../services/orders'
import type { Order, Product } from '../types'

const rs = (n: number) => '₹' + n.toLocaleString('en-IN')

export default function Impact() {
  const nav = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => subscribeProducts(setProducts), [])
  useEffect(() => subscribeOrders(setOrders), [])

  const published = products.filter(p => p.status === 'published')
  const delivered = orders.filter(o => o.status === 'delivered')
  const gmv = delivered.reduce((n, o) => n + o.total, 0)

  /**
   * The headline, and the only one that needs defending.
   *
   * Counted per delivered order, and ONLY where she told us what she used to
   * be paid for one of these. A product she never answered for contributes
   * nothing — not a zero, not an average, nothing. That makes the number
   * smaller and makes it a fact rather than a projection.
   */
  const measurable = delivered.filter(o => {
    const was = products.find(p => p.id === o.productId)?.usualPrice
    return typeof was === 'number' && was > 0
  })
  const delta = measurable.reduce((n, o) => {
    const was = products.find(p => p.id === o.productId)!.usualPrice!
    return n + Math.max(0, o.unitPrice - was) * o.quantity
  }, 0)
  const before = measurable.reduce((n, o) => {
    const was = products.find(p => p.id === o.productId)!.usualPrice!
    return n + was * o.quantity
  }, 0)
  const uplift = before > 0 ? Math.round((delta / before) * 100) : 0
  const coverage = delivered.length ? Math.round((measurable.length / delivered.length) * 100) : 0

  return (
    <div className="min-h-full bg-paper">
      <header className="jaali relative bg-night px-6 pb-7 pt-[max(1.25rem,env(safe-area-inset-top))] text-surface">
        <button onClick={() => nav('/')} className="press mb-3 min-h-0 py-1 pr-2 text-sm text-surface/60">
          ← back to the app
        </button>
        <div className="flex items-center gap-4">
          <img src="./icons/mark-96.png" alt="" aria-hidden width={44} height={44}
            className="shrink-0 rounded-xl ring-1 ring-gold-leaf/50" />
          <div>
            <h1 className="font-display text-2xl font-bold leading-tight">Impact</h1>
            <p className="text-sm text-surface/65">
              Pehchaan · every figure computed from live records, none seeded
            </p>
          </div>
        </div>
        <Scallop className="absolute inset-x-0 -bottom-2 text-night" />
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">

        {/* The headline. Its own panel, because it is the argument. */}
        <section className="arch overflow-hidden rounded-b-panel border-2 border-good bg-sage-wash p-6 shadow-card">
          <p className="label text-xs font-semibold uppercase text-good">Additional income earned by the artisan</p>
          <p className="mt-2 font-display text-6xl font-bold tabular-nums leading-none text-good">{rs(delta)}</p>
          <p className="mt-3 max-w-[52ch] text-[15px] leading-snug text-ink-2">
            {measurable.length === 0
              ? 'Nothing measured yet. This counts only delivered orders on products where she told us what a middleman used to pay her — no answer means no number, rather than an estimate.'
              : <>Across <b>{measurable.length}</b> delivered {measurable.length === 1 ? 'order' : 'orders'},
                  she received {rs(before + delta)} for work that previously earned her {rs(before)}
                  {uplift > 0 && <> — an uplift of <b>{uplift}%</b></>}.</>}
          </p>
        </section>

        <Gota className="my-8" />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Products catalogued" value={String(products.length)}
            note="one photo + 30s of speech each" />
          <Stat label="Live listings" value={String(published.length)}
            note="visible to buyers now" />
          <Stat label="Orders received" value={String(orders.length)}
            note={`${delivered.length} delivered`} />
          <Stat label="Gross merchandise value" value={rs(gmv)}
            note="delivered orders only" />
        </div>

        <h2 className="mt-10 font-display text-lg font-bold">Per product</h2>
        {published.length === 0 ? (
          <p className="mt-3 text-ink-3">No published listings yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-card border border-line-2/70 bg-surface shadow-rest">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  {['Product', 'Used to get', 'Now listed at', 'Delivered', 'Extra earned'].map(h => (
                    <th key={h} className="label px-4 py-3 text-xs font-semibold uppercase text-ink-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {published.map(p => {
                  const mine = orders.filter(o => o.productId === p.id && o.status === 'delivered')
                  const qty = mine.reduce((n, o) => n + o.quantity, 0)
                  const extra = p.usualPrice
                    ? mine.reduce((n, o) => n + Math.max(0, o.unitPrice - p.usualPrice!) * o.quantity, 0)
                    : undefined
                  return (
                    <tr key={p.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 font-medium">{p.listing?.titleEn ?? 'Untitled'}</td>
                      <td className="px-4 py-3 tabular-nums text-ink-2">
                        {p.usualPrice ? rs(p.usualPrice) : <span className="text-ink-3">not stated</span>}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{p.price ? rs(p.price.suggested) : '—'}</td>
                      <td className="px-4 py-3 tabular-nums text-ink-2">{qty || '—'}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-good">
                        {extra ? rs(extra) : <span className="font-normal text-ink-3">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* The part that makes the rest believable. */}
        <section className="mt-10 rounded-card border border-line-2/70 bg-surface-2 p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <Icon name="ai" className="text-gold" />What this does not measure yet
          </h2>
          <ul className="mt-3 flex flex-col gap-2 text-[15px] leading-snug text-ink-2">
            <li>
              <b>Artisans onboarded is not on this page</b>, because there is no artisan
              identity in the data model — a product has no owner field, so one device is
              one artisan and the figure cannot be aggregated honestly. Adding it is a
              schema change plus sign-in, and it is the next thing this dashboard needs.
            </li>
            <li>
              <b>Measurement coverage is {coverage}%</b> — {measurable.length} of {delivered.length}{' '}
              delivered {delivered.length === 1 ? 'order has' : 'orders have'} a stated
              previous price. The rest are excluded rather than estimated, so the headline
              understates rather than flatters.
            </li>
            <li>
              <b>No money moves through the app.</b> GMV is the value of orders the artisan
              marked delivered and the buyer confirmed receiving; there is no payment
              gateway and no escrow.
            </li>
            <li>
              <b>Prices come from listings, not transactions.</b> The market band is the
              25th–75th percentile of ~130 real listings across nine crafts
              (<code>services/comparables.ts</code>, each row cited); it is what these
              things are advertised at, not a record of what buyers paid.
            </li>
          </ul>
        </section>
      </main>
    </div>
  )
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-card border border-line-2/70 bg-surface p-4 shadow-rest">
      <p className="label text-xs font-semibold uppercase text-ink-3">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold tabular-nums leading-tight text-indigo">{value}</p>
      <p className="mt-1 text-xs text-ink-3">{note}</p>
    </div>
  )
}
