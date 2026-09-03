import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Screen from '../components/Screen'
import BigButton from '../components/BigButton'
import { listProducts, saveProduct, newId } from '../services/db'
import { listMessages } from '../services/messages'
import { pendingOrders } from '../services/orders'
import { speak } from '../lib/speak'
import { tourSeen } from '../lib/tour'
import { asrCode } from '../types'
import { t, getLang, useLang, prefersEnglish } from '../lib/i18n'
import type { Product } from '../types'

export default function Home() {
  const nav = useNavigate()
  const lang = useLang()
  const mine = prefersEnglish(lang)
  const [products, setProducts] = useState<Product[]>([])
  const [msgCounts, setMsgCounts] = useState<Record<string, number>>({})
  const [waiting, setWaiting] = useState(0)
  const announced = useRef(false)

  // First time she opens the app, show her how it works before anything else.
  useEffect(() => {
    if (!tourSeen()) nav('/tour', { replace: true })
  }, [nav])

  useEffect(() => {
    // Poll so a buyer's message shows up without her doing anything.
    // Firestore's realtime listener replaces this later.
    let alive = true
    const tick = async () => {
      const list = await listProducts()
      if (!alive) return
      setProducts(list)
      const counts: Record<string, number> = {}
      for (const p of list) counts[p.id] = (await listMessages(p.id)).length
      if (!alive) return
      setMsgCounts(counts)

      // An order waiting for her answer is the most important thing in the
      // app. Say it out loud once — she will not read a badge.
      const pending = await pendingOrders()
      if (!alive) return
      setWaiting(pending.length)
      if (pending.length > 0 && !announced.current) {
        announced.current = true
        speak(t('newOrderCame'), asrCode(getLang()))
      }
      if (pending.length === 0) announced.current = false
    }
    tick()
    const timer = setInterval(tick, 2500)
    return () => { alive = false; clearInterval(timer) }
  }, [])

  async function startNew() {
    const p: Product = { id: newId(), createdAt: Date.now(), status: 'draft', lang: getLang() }
    await saveProduct(p)
    nav(`/p/${p.id}/capture`)
  }

  return (
    <Screen
      title={t('appName')}
      action={<BigButton icon="📷" label={t('addProduct')} onClick={startNew} />}
    >
      {waiting > 0 && (
        <button
          onClick={() => nav('/orders')}
          className="mb-5 flex w-full items-center gap-3 rounded-2xl border-2 border-indigo bg-indigo px-4 py-4 text-left text-white active:opacity-90"
        >
          <span aria-hidden className="text-3xl">🔔</span>
          <span className="flex-1">
            <span className="block text-lg font-bold">{t('newOrderCame')}</span>
            <span className="block text-sm text-white/80">{waiting} {t('ordersWaiting')}</span>
          </span>
          <span aria-hidden className="text-2xl">›</span>
        </button>
      )}

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-ink-3">
        {t('myProducts')}
      </h2>

      {products.length === 0 ? (
        <p className="rounded-xl border-2 border-dashed border-line py-14 text-center text-ink-3">
          {t('noProducts')}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {products.map(p => (
            <li key={p.id}>
              <div className="flex items-center gap-2">
              <button
                onClick={() => nav(`/p/${p.id}/capture`)}
                className="flex min-w-0 flex-1 items-center gap-4 rounded-xl border border-line bg-surface p-3 text-left active:bg-wash"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-wash">
                  {p.cleanPhoto || p.photo
                    ? <img src={p.cleanPhoto ?? p.photo} alt="" className="h-full w-full object-cover" />
                    : <span className="flex h-full w-full items-center justify-center text-2xl">📦</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{(mine ? p.listing?.titleEn : p.listing?.titleHi) ?? t('untitled')}</p>
                  <p className="text-sm text-ink-3">
                    {p.status === 'published' ? `✅ ${t('onSale')}` : `✏️ ${t('incomplete')}`}
                    {p.price && ` · ₹${p.price.suggested}`}
                  </p>
                </div>
              </button>

              {/* A buyer is talking to her. This has to be impossible to miss. */}
              {msgCounts[p.id] > 0 && (
                <button
                  onClick={() => nav(`/p/${p.id}/chat`)}
                  aria-label={t('messages')}
                  className="relative flex h-[76px] w-[76px] shrink-0 flex-col items-center justify-center
                             gap-0.5 rounded-xl border-2 border-indigo bg-wash active:opacity-80"
                >
                  <span aria-hidden className="text-2xl">💬</span>
                  <span className="text-xs font-bold tabular-nums text-indigo">{msgCounts[p.id]}</span>
                </button>
              )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => nav('/tour')}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-line
                   bg-surface py-3 text-base font-medium active:bg-wash"
      >
        <span aria-hidden className="text-xl">🎓</span>
        <span>{t('learnHow')}</span>
      </button>

      <button onClick={() => nav('/orders')} className="mt-4 w-full text-sm text-indigo underline">
        📦 {t('orders')} →
      </button>

      <button onClick={() => nav('/buyer')} className="mt-3 w-full text-sm text-ink-3 underline">
        Buyer view (for the demo) →
      </button>
    </Screen>
  )
}
