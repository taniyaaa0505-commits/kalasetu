/**
 * What the buyer sees. Stands in for ONDC / GeM in the demo.
 *
 * Build this early and put it on the projector: when she taps the green
 * tick on the phone and this page updates, that is the moment that proves
 * the whole "we are a pipe, not a shop" argument.
 *
 * TODO: once Firestore is in, this listens in real time instead of polling.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scallop } from '../components/Ornament'
import { subscribeProducts } from '../services/db'
import type { Product } from '../types'
import Empty from '../components/Empty'

export default function Buyer() {
  const nav = useNavigate()
  const [items, setItems] = useState<Product[]>([])

  // A live subscription, so a listing appears here the instant she publishes.
  useEffect(() => subscribeProducts(all => setItems(all.filter(p => p.status === 'published'))), [])

  return (
    <div className="min-h-full bg-paper">
      <header className="jaali relative bg-night px-6 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))] text-surface">
        <button onClick={() => nav('/')} className="press mb-2 min-h-0 py-1.5 pr-2 text-sm text-ink-3">← back to the app</button>
        <div className="flex items-center gap-3">
          <img src="./icons/mark-96.png" alt="" aria-hidden width={40} height={40}
            className="shrink-0 rounded-lg ring-1 ring-gold-leaf/50" />
          <div>
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-surface">Artisan Marketplace</h1>
            <p className="text-sm text-surface/65">Handmade, direct from the maker</p>
          </div>
        </div>
        <Scallop className="absolute inset-x-0 -bottom-2 text-night" />
      </header>

      <div className="mx-auto max-w-5xl p-6">
        {items.length === 0 ? (
          <Empty kind="shop" message="The first pieces are on their way." className="py-20" />
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
            {items.map((p, i) => (
              <li key={p.id} className={'rise ' + ['', 'rise-1', 'rise-2', 'rise-3', 'rise-4'][Math.min(i, 4)]}>
                <button onClick={() => nav(`/buyer/${p.id}`)}
                  className="press block w-full min-h-0 overflow-hidden rounded-b-panel border border-line-2/70 bg-surface text-left shadow-card ring-1 ring-gold-leaf/25">
                {p.cleanPhoto && <img src={p.cleanPhoto} alt="" className="arch aspect-square w-full bg-surface-2 object-cover" />}
                <div className="p-4">
                  <p className="font-semibold leading-snug">{p.listing?.titleEn}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-3">{p.listing?.descriptionEn}</p>
                  <p className="mt-3 font-display text-xl font-bold tabular-nums text-indigo">₹{p.price?.suggested}</p>
                  <p className="mt-2 flex items-center gap-1 text-sm font-medium text-clay">
                    Message the artisan <span aria-hidden>→</span>
                  </p>
                </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
