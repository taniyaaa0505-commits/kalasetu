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
import { subscribeProducts } from '../services/db'
import type { Product } from '../types'

export default function Buyer() {
  const nav = useNavigate()
  const [items, setItems] = useState<Product[]>([])

  // A live subscription, so a listing appears here the instant she publishes.
  useEffect(() => subscribeProducts(all => setItems(all.filter(p => p.status === 'published'))), [])

  return (
    <div className="min-h-full bg-paper">
      <header className="weave border-b border-line bg-surface px-6 py-5">
        <button onClick={() => nav('/')} className="press mb-2 min-h-0 py-1.5 pr-2 text-sm text-ink-3">← back to the app</button>
        <div className="flex items-center gap-3">
          <img src="./icons/mark-96.png" alt="" aria-hidden width={40} height={40}
            className="shrink-0 rounded-lg border border-line" />
          <div>
            <h1 className="text-2xl font-bold leading-tight tracking-tight">Artisan Marketplace</h1>
            <p className="text-sm text-ink-3">Handmade, direct from the maker</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl p-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <span aria-hidden className="text-4xl opacity-40">🪔</span>
            <p className="text-ink-3">The first pieces are on their way.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
            {items.map((p, i) => (
              <li key={p.id} className={'rise ' + ['', 'rise-1', 'rise-2', 'rise-3', 'rise-4'][Math.min(i, 4)]}>
                <button onClick={() => nav(`/buyer/${p.id}`)}
                  className="press block w-full min-h-0 overflow-hidden rounded-panel border border-line bg-surface text-left shadow-card">
                {p.cleanPhoto && <img src={p.cleanPhoto} alt="" className="aspect-square w-full bg-surface-2 object-cover" />}
                <div className="p-4">
                  <p className="font-semibold leading-snug">{p.listing?.titleEn}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-3">{p.listing?.descriptionEn}</p>
                  <p className="mt-3 text-xl font-bold tabular-nums text-indigo">₹{p.price?.suggested}</p>
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
