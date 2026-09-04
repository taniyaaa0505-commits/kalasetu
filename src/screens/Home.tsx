import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Screen from '../components/Screen'
import { listProducts, saveProduct, newId, subscribeProducts } from '../services/db'
import { listMessages } from '../services/messages'
import { pendingOrders, subscribeOrders } from '../services/orders'
import { speak } from '../lib/speak'
import { tourSeen } from '../lib/tour'
import ConfirmRemove from '../components/ConfirmRemove'
import Artisan from '../components/Artisan'
import Speakable from '../components/Speakable'
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
  const [removing, setRemoving] = useState<Product | null>(null)

  // First time she opens the app, show her how it works before anything else.
  useEffect(() => {
    if (!tourSeen()) nav('/tour', { replace: true })
  }, [nav])

  useEffect(() => subscribeProducts(async list => {
    setProducts(list)
    const counts: Record<string, number> = {}
    for (const p of list) counts[p.id] = (await listMessages(p.id)).length
    setMsgCounts(counts)
  }), [])

  // An order waiting for her answer is the most important thing in the app.
  // Say it out loud once — she will not read a badge.
  useEffect(() => subscribeOrders(async () => {
    const pending = await pendingOrders()
    setWaiting(pending.length)
    if (pending.length > 0 && !announced.current) {
      announced.current = true
      speak(t('newOrderCame'), asrCode(getLang()))
    }
    if (pending.length === 0) announced.current = false
  }), [])

  async function startNew() {
    const p: Product = { id: newId(), createdAt: Date.now(), status: 'draft', lang: getLang() }
    await saveProduct(p)
    nav(`/p/${p.id}/capture`)
  }

  const empty = products.length === 0

  return (
    <Screen title={t('appName')} brand>
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

      {/* An empty shop is the first thing she ever sees. A woman at her work
          reads as an invitation; a dashed box saying "nothing here" reads as a
          screen that failed to load. */}
      {empty && (
        <div className="mb-6 flex flex-col items-center gap-4 text-center">
          <Artisan width={300} />
          <Speakable text={t('noProducts')} className="text-base leading-relaxed text-ink-2" />
        </div>
      )}

      {/* The three things she can do, biggest first. This replaces the single
          pinned button: with the illustration above it the page is short
          enough that all three sit in reach without scrolling. */}
      <div className="grid grid-cols-[1.05fr_1fr] gap-3">
        <BigTile icon="📷" label={t('addProduct')} onClick={startNew} />
        <div className="grid grid-rows-2 gap-3">
          <SmallTile icon="🎓" label={t('learnHow')} onClick={() => nav('/tour')} />
          <SmallTile
            icon="📦" label={t('orders')} onClick={() => nav('/orders')}
            badge={waiting > 0 ? waiting : undefined}
          />
        </div>
      </div>

      {!empty && (
        <>
          <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-widest text-ink-3">
            {t('myProducts')}
          </h2>
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

                  <button
                    onClick={() => setRemoving(p)}
                    aria-label={`${t('remove')} — ${p.listing?.titleHi ?? t('untitled')}`}
                    className="flex h-[76px] w-[52px] shrink-0 items-center justify-center rounded-xl
                               border border-line bg-surface text-xl active:bg-wash"
                  >🗑</button>

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
        </>
      )}

      {removing && (
        <ConfirmRemove
          product={removing}
          onClose={() => setRemoving(null)}
          onRemoved={async () => {
            setRemoving(null)
            setProducts(await listProducts())
          }}
        />
      )}

      <button onClick={() => nav('/buyer')} className="mt-6 w-full text-sm text-indigo underline">
        🛍 {t('ourMarketplace')} →
      </button>
    </Screen>
  )
}

/* ---------------- the tiles ---------------- */

/** Both tiles say their own label out loud, for the same reason BigButton
 *  does: an icon and a word mean nothing to someone who cannot read either. */
function useSpoken(label: string) {
  const lang = useLang()
  return () => speak(label, asrCode(lang))
}

function BigTile({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  const say = useSpoken(label)
  return (
    <button
      onClick={() => { say(); onClick() }}
      className="flex min-h-[172px] flex-col items-center justify-center gap-3 rounded-2xl
                 border-2 border-indigo bg-wash px-3 py-5 text-center active:opacity-80"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo text-3xl">
        <span aria-hidden>{icon}</span>
      </span>
      <span className="text-lg font-semibold leading-snug text-indigo">{label}</span>
    </button>
  )
}

function SmallTile({
  icon, label, onClick, badge,
}: { icon: string; label: string; onClick: () => void; badge?: number }) {
  const say = useSpoken(label)
  return (
    <button
      onClick={() => { say(); onClick() }}
      className="relative flex items-center gap-3 rounded-2xl border border-line bg-surface
                 px-4 py-3 text-left active:bg-wash"
    >
      <span aria-hidden className="text-2xl">{icon}</span>
      <span className="flex-1 text-base font-medium leading-snug">{label}</span>
      {badge !== undefined && (
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-indigo px-1.5
                         text-xs font-bold tabular-nums text-white">{badge}</span>
      )}
    </button>
  )
}
