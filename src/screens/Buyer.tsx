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
import { listProducts } from '../services/db'
import type { Product } from '../types'

export default function Buyer() {
  const nav = useNavigate()
  const [items, setItems] = useState<Product[]>([])

  useEffect(() => {
    const load = () => listProducts().then(all => setItems(all.filter(p => p.status === 'published')))
    load()
    const timer = setInterval(load, 1500)   // poll for now; Firestore replaces this
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-full bg-white">
      <header className="border-b border-line px-6 py-4">
        <button onClick={() => nav('/')} className="mb-1 min-h-0 text-sm text-ink-3">← back to the app</button>
        <h1 className="text-2xl font-bold tracking-tight">Artisan Marketplace</h1>
        <p className="text-sm text-ink-3">Standing in for ONDC / GeM in the demo</p>
      </header>

      <div className="mx-auto max-w-5xl p-6">
        {items.length === 0 ? (
          <p className="py-24 text-center text-ink-3">Nothing published yet.</p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
            {items.map(p => (
              <li key={p.id}>
                <button onClick={() => nav(`/buyer/${p.id}`)}
                  className="block w-full overflow-hidden rounded-xl border border-line text-left active:opacity-80">
                {p.cleanPhoto && <img src={p.cleanPhoto} alt="" className="aspect-square w-full object-cover" />}
                <div className="p-3">
                  <p className="font-semibold leading-snug">{p.listing?.titleEn}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-3">{p.listing?.descriptionEn}</p>
                  <p className="mt-2 text-lg font-bold tabular-nums">₹{p.price?.suggested}</p>
                  <p className="mt-1 text-sm text-indigo">Message the artisan →</p>
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
