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
import BuyerCard from '../components/BuyerCard'
import type { Product } from '../types'
import Empty from '../components/Empty'

export default function Buyer() {
  const nav = useNavigate()
  const [items, setItems] = useState<Product[]>([])

  /*
   * Published AND owned by somebody.
   *
   * `artisanId` is what routes an order back to the person who has to make
   * the thing. A product created before that field existed belongs to nobody,
   * so an order placed on it reaches no phone, ever — the buyer sees "order
   * placed", waits, and no artisan is even told. Listing something that
   * cannot be fulfilled is worse than not listing it.
   */
  useEffect(() => subscribeProducts(all =>
    setItems(all.filter(p => p.status === 'published' && p.artisanId))), [])

  return (
    <div className="min-h-full bg-paper">
      <header className="jaali relative bg-night px-6 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))] text-surface">
        <div className="flex items-center gap-3">
          <img src="./icons/mark-96.png" alt="" aria-hidden width={40} height={40}
            className="shrink-0 rounded-lg ring-1 ring-gold-leaf/50" />
          <div>
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-surface">Artisan Marketplace</h1>
            <p className="text-sm text-surface/65">Handmade, direct from the maker</p>
          </div>
        </div>
        {/* Not in the artisan's app — she never sees this one. It belongs on
            the demo surface, where the person asking "so what did it change?"
            is already standing. */}
        <button onClick={() => nav('/impact')}
          className="press absolute right-6 top-[max(1.25rem,env(safe-area-inset-top))] min-h-0
                     rounded-full border border-gold-leaf/50 px-3 py-1.5 text-sm text-surface/80
                     active:bg-white/10">
          Impact →
        </button>
        <Scallop className="absolute inset-x-0 -bottom-2 text-night" />
      </header>

      <div className="mx-auto max-w-5xl p-6">
        {items.length === 0 ? (
          <Empty kind="shop" message="The first pieces are on their way." className="py-20" />
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
            {items.map((p, i) => (
              <li key={p.id} className={'rise ' + ['', 'rise-1', 'rise-2', 'rise-3', 'rise-4'][Math.min(i, 4)]}>
                {/* The card itself is BuyerCard, shared with the preview she
                    approves on the publish screen, so the two cannot drift. */}
                <button onClick={() => nav(`/buyer/${p.id}`)}
                  className="press block w-full min-h-0 text-left">
                  <BuyerCard product={p} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
