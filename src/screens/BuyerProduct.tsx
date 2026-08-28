/**
 * The buyer's side: a product page with a conversation.
 *
 * He types English and reads English. He never learns that the person on
 * the other end is speaking Maithili into a phone — which is the point.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProduct } from '../services/db'
import { listMessages, sendMessage, translatePending } from '../services/messages'
import { listOrders, placeOrder, setStatus } from '../services/orders'
import PriceInNotes from '../components/PriceInNotes'
import type { Message, Order, Product } from '../types'

export default function BuyerProduct() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const [p, setP] = useState<Product>()
  const [msgs, setMsgs] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [qty, setQty] = useState(10)
  const [buyerName, setBuyerName] = useState('Anand Gupta')
  const [buyerOrg, setBuyerOrg] = useState('Meridian Corporate Gifting')
  const [orderNote, setOrderNote] = useState('')
  const [placing, setPlacing] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { getProduct(id).then(setP) }, [id])

  useEffect(() => {
    let alive = true
    const tick = async () => {
      const [list, os] = await Promise.all([listMessages(id), listOrders(id)])
      if (!alive) return
      setMsgs(list); setOrders(os)
      if (list.some(m => m.untranslated)) translatePending(id)
    }
    tick()
    const timer = setInterval(tick, 1500)
    return () => { alive = false; clearInterval(timer) }
  }, [id])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs.length])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (!body || !p) return
    setText(''); setSending(true)
    await sendMessage({ productId: id, from: 'buyer', text: body, localLang: p.lang })
    setMsgs(await listMessages(id)); setSending(false)
  }

  async function order(e: React.FormEvent) {
    e.preventDefault()
    if (!p?.price) return
    setPlacing(true)
    await placeOrder({
      productId: id, quantity: qty, unitPrice: p.price.suggested,
      buyerName, buyerOrg, note: orderNote.trim() || undefined, localLang: p.lang,
    })
    setOrderNote(''); setOrders(await listOrders(id)); setPlacing(false)
  }

  if (!p) return <div className="p-10 text-center text-ink-3">Loading…</div>

  return (
    <div className="min-h-full bg-white">
      <header className="border-b border-line px-6 py-4">
        <button onClick={() => nav('/buyer')} className="min-h-0 text-sm text-ink-3">← all products</button>
      </header>

      <div className="mx-auto grid max-w-5xl gap-8 p-6 md:grid-cols-2">
        <div>
          {p.cleanPhoto && <img src={p.cleanPhoto} alt="" className="w-full rounded-xl border border-line" />}
          <h1 className="mt-4 text-2xl font-bold tracking-tight">{p.listing?.titleEn}</h1>
          <p className="mt-2 leading-relaxed text-ink-2">{p.listing?.descriptionEn}</p>
          <p className="mt-4 text-3xl font-bold tabular-nums">₹{p.price?.suggested}</p>
          {p.price && <div className="mt-3 max-w-xs"><PriceInNotes amount={p.price.suggested} size="sm" /></div>}

          {/* Bulk order form. The problem statement asks for B2B buyers, so
              quantity is the first thing on screen, not an afterthought. */}
          <form onSubmit={order} className="mt-6 rounded-xl border border-line p-4">
            <h2 className="mb-3 font-semibold">Place a bulk order</h2>

            <label className="mb-1 block text-sm text-ink-2">Quantity</label>
            <div className="mb-3 flex items-center gap-2">
              <button type="button" onClick={() => setQty(Math.max(1, qty - 5))}
                className="min-h-0 h-10 w-10 rounded-lg border border-line">−</button>
              <input type="number" min={1} value={qty}
                onChange={e => setQty(Math.max(1, +e.target.value || 1))}
                className="w-24 rounded-lg border border-line px-3 py-2 text-center tabular-nums outline-none focus-visible:border-indigo" />
              <button type="button" onClick={() => setQty(qty + 5)}
                className="min-h-0 h-10 w-10 rounded-lg border border-line">+</button>
              <span className="ml-2 text-ink-3">× ₹{p.price?.suggested}</span>
            </div>

            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              <input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Your name"
                className="rounded-lg border border-line px-3 py-2 outline-none focus-visible:border-indigo" />
              <input value={buyerOrg} onChange={e => setBuyerOrg(e.target.value)} placeholder="Company"
                className="rounded-lg border border-line px-3 py-2 outline-none focus-visible:border-indigo" />
            </div>

            <input value={orderNote} onChange={e => setOrderNote(e.target.value)}
              placeholder="Anything she should know? (she will hear this in her language)"
              className="mb-3 w-full rounded-lg border border-line px-3 py-2 outline-none focus-visible:border-indigo" />

            <div className="flex items-center justify-between">
              <p className="text-xl font-bold tabular-nums">₹{(qty * (p.price?.suggested ?? 0)).toLocaleString('en-IN')}</p>
              <button disabled={placing || !p.price}
                className="min-h-0 rounded-lg bg-indigo px-5 py-2.5 font-semibold text-white disabled:opacity-40">
                {placing ? 'Placing…' : 'Place order'}
              </button>
            </div>
          </form>

          {orders.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2">
              {orders.map(o => <BuyerOrderRow key={o.id} o={o} onRefresh={async () => setOrders(await listOrders(id))} />)}
            </ul>
          )}
        </div>

        <section className="flex flex-col rounded-xl border border-line">
          <header className="border-b border-line px-4 py-3">
            <h2 className="font-semibold">Message the artisan</h2>
            <p className="text-sm text-ink-3">
              You write in English. She hears it in her own language, and answers by speaking.
            </p>
          </header>

          <ul className="flex max-h-[420px] min-h-[220px] flex-col gap-3 overflow-y-auto p-4">
            {msgs.length === 0 && <li className="py-10 text-center text-ink-3">No messages yet.</li>}
            {msgs.map(m => (
              <li key={m.id} className={m.from === 'buyer' ? 'self-end' : 'self-start'} style={{ maxWidth: '85%' }}>
                <div className={
                  'rounded-2xl px-4 py-2.5 leading-relaxed ' +
                  (m.from === 'buyer' ? 'bg-indigo text-white' : 'border border-line bg-paper')
                }>
                  {/* He only ever sees English, whichever way the message went. */}
                  <p>{m.english || m.source}</p>
                  {m.from === 'artisan' && !m.untranslated && (
                    <p className="mt-1.5 text-xs text-ink-3">
                      translated from {m.sourceLang.split('-')[0]} · “{m.source}”
                    </p>
                  )}
                  {m.untranslated && (
                    <p className={'mt-1.5 text-xs ' + (m.from === 'buyer' ? 'text-white/70' : 'text-gold')}>
                      ⚠ not translated
                    </p>
                  )}
                </div>
              </li>
            ))}
            <div ref={endRef} />
          </ul>

          <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
            <input
              value={text} onChange={e => setText(e.target.value)}
              placeholder="Ask about size, quantity, delivery…"
              className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 outline-none focus-visible:border-indigo"
            />
            <button
              disabled={!text.trim() || sending}
              className="min-h-0 rounded-lg bg-indigo px-4 py-2 font-semibold text-white disabled:opacity-40"
            >Send</button>
          </form>
        </section>
      </div>
    </div>
  )
}

const STATUS_TEXT: Record<Order['status'], string> = {
  placed:    'Waiting for the artisan to confirm',
  accepted:  'She accepted — making it now',
  declined:  'She cannot take this order',
  shipped:   'She has sent it',
  delivered: 'Delivered',
}

function BuyerOrderRow({ o, onRefresh }: { o: Order; onRefresh: () => void }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
      <div>
        <p className="font-semibold tabular-nums">{o.quantity} × ₹{o.unitPrice} = ₹{o.total.toLocaleString('en-IN')}</p>
        <p className="text-sm text-ink-3">{STATUS_TEXT[o.status]}</p>
      </div>
      {o.status === 'shipped' && (
        <button
          onClick={async () => { await setStatus(o.id, 'delivered'); onRefresh() }}
          className="min-h-0 shrink-0 rounded-lg border border-line px-3 py-2 text-sm font-medium"
        >Mark received</button>
      )}
    </li>
  )
}
