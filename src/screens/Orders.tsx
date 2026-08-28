/**
 * Her orders.
 *
 * The only question that matters on this screen is "can you make this?", so
 * it is two big buttons and nothing else. Every order is spoken aloud: the
 * quantity, the money she will get, and what the buyer asked for.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Screen from '../components/Screen'
import BigButton from '../components/BigButton'
import PriceInNotes from '../components/PriceInNotes'
import { listOrders, setStatus } from '../services/orders'
import { listProducts } from '../services/db'
import { speak } from '../lib/speak'
import { t, useLang } from '../lib/i18n'
import { asrCode, type Order, type Product, type OrderStatus } from '../types'

export default function Orders() {
  const nav = useNavigate()
  const lang = useLang()
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Record<string, Product>>({})
  const announced = useRef<Set<string>>(new Set())

  async function refresh() {
    const [os, ps] = await Promise.all([listOrders(), listProducts()])
    setOrders(os)
    setProducts(Object.fromEntries(ps.map(p => [p.id, p])))
    return os
  }

  useEffect(() => {
    let alive = true
    const tick = async () => {
      const os = await refresh()
      if (!alive) return
      // Say a new order out loud, once. She will not read a badge.
      const fresh = os.find(o => o.status === 'placed' && !announced.current.has(o.id))
      if (fresh) {
        announced.current.add(fresh.id)
        speak(sentence(fresh), asrCode(lang))
      }
    }
    tick()
    const timer = setInterval(tick, 2500)
    return () => { alive = false; clearInterval(timer) }
  }, [lang])

  async function answer(id: string, status: OrderStatus) {
    await setStatus(id, status)
    await refresh()
  }

  return (
    <Screen title={t('orders')} onBack={() => {}}>
      {orders.length === 0 && <p className="py-20 text-center text-ink-3">{t('noOrders')}</p>}

      <ul className="flex flex-col gap-4">
        {orders.map(o => (
          <OrderCard
            key={o.id} order={o} product={products[o.productId]}
            onAnswer={answer} onOpenChat={() => nav(`/p/${o.productId}/chat`)}
          />
        ))}
      </ul>
    </Screen>
  )
}

/** What the phone says when an order lands. */
function sentence(o: Order): string {
  return `${t('newOrderCame')}. ${o.quantity} ${t('pieces')}. ${t('youWillGet')} ${o.total} ${t('rupees')}.`
}

const STATUS_LABEL: Record<OrderStatus, () => string> = {
  placed:    () => t('statusPlaced'),
  accepted:  () => t('statusAccepted'),
  declined:  () => t('statusDeclined'),
  shipped:   () => t('statusShipped'),
  delivered: () => t('statusDelivered'),
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  placed:    'border-indigo bg-wash text-indigo',
  accepted:  'border-good bg-surface text-good',
  declined:  'border-line bg-surface text-ink-3',
  shipped:   'border-good bg-surface text-good',
  delivered: 'border-good bg-surface text-good',
}

function OrderCard({ order: o, product, onAnswer, onOpenChat }: {
  order: Order
  product?: Product
  onAnswer: (id: string, s: OrderStatus) => void
  onOpenChat: () => void
}) {
  const lang = useLang()
  const isNew = o.status === 'placed'

  return (
    <li className={'rounded-2xl border-2 p-4 ' + (isNew ? 'border-indigo bg-wash' : 'border-line bg-surface')}>
      <div className="flex items-start gap-3">
        {product?.cleanPhoto && (
          <img src={product.cleanPhoto} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <span className={'inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ' + STATUS_STYLE[o.status]}>
            {STATUS_LABEL[o.status]()}
          </span>
          <p className="mt-1 truncate font-semibold">{product?.listing?.titleHi ?? product?.listing?.titleEn}</p>
          <p className="text-sm text-ink-2">{o.buyerOrg || o.buyerName}</p>
        </div>
      </div>

      {/* The two numbers she cares about, big. */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Cell label={t('quantity')} value={`${o.quantity} ${t('pieces')}`} />
        <Cell label={t('youWillGet')} value={`₹${o.total}`} />
      </div>

      <div className="mt-3"><PriceInNotes amount={o.total} size="sm" /></div>

      {o.needBy && (
        <p className="mt-3 text-sm text-ink-2">
          {t('neededBy')}: <b>{new Date(o.needBy).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</b>
        </p>
      )}

      {(o.noteLocal || o.note) && (
        <button
          onClick={() => speak(o.noteLocal || o.note || '', asrCode(lang))}
          className="mt-3 flex min-h-0 w-full items-start gap-2 rounded-lg border border-line bg-paper p-3 text-left"
        >
          <span aria-hidden className="text-indigo">🔊</span>
          <span>
            <span className="block text-xs font-semibold uppercase tracking-widest text-ink-3">{t('buyerNote')}</span>
            <span className="text-base">{o.noteLocal || o.note}</span>
          </span>
        </button>
      )}

      {/* One question, two answers. Nothing else on a new order. */}
      {isNew && (
        <div className="mt-4 flex flex-col gap-2">
          <BigButton icon="✅" label={t('accept')} variant="good" onClick={() => onAnswer(o.id, 'accepted')} />
          <BigButton icon="❌" label={t('decline')} variant="quiet" onClick={() => onAnswer(o.id, 'declined')} />
        </div>
      )}

      {o.status === 'accepted' && (
        <div className="mt-4 flex flex-col gap-2">
          <BigButton icon="📦" label={t('markShipped')} onClick={() => onAnswer(o.id, 'shipped')} />
          <button onClick={onOpenChat} className="min-h-0 text-sm text-indigo underline">
            💬 {t('messages')}
          </button>
        </div>
      )}
    </li>
  )
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper px-3 py-2">
      <p className="text-xs text-ink-3">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </div>
  )
}
