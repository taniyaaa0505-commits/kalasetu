/**
 * The buyer's side: a product page with a conversation.
 *
 * He types English and reads English. He never learns that the person on
 * the other end is speaking Maithili into a phone — which is the point.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProduct } from '../services/db'
import { listMessages, sendMessage, translatePending, subscribeMessages } from '../services/messages'
import { listOrders, placeOrder, setStatus, subscribeOrders } from '../services/orders'
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
  const [trouble, setTrouble] = useState<string>()
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { getProduct(id).then(setP) }, [id])

  useEffect(() => {
    const offMsgs = subscribeMessages(id, list => {
      setMsgs(list)
      if (list.some(m => m.untranslated)) translatePending(id)
    })
    const offOrders = subscribeOrders(all => setOrders(all.filter(o => o.productId === id)))
    return () => { offMsgs(); offOrders() }
  }, [id])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs.length])

  /**
   * Both of these clear their busy flag in a `finally`.
   *
   * They did not, and that was the bug: "Placing…" with nothing happening,
   * for ever. Anything that threw between setPlacing(true) and the last line
   * — Firestore refusing the write, the signal dropping mid-request — skipped
   * the reset, so the button stayed disabled and mid-sentence and the buyer
   * had no way to try again and no idea why.
   */
  async function send(e: React.FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (!body || !p) return
    setText(''); setSending(true); setTrouble(undefined)
    try {
      await sendMessage({ productId: id, from: 'buyer', text: body, localLang: p.lang })
      setMsgs(await listMessages(id))
    } catch (err) {
      setText(body)                       // give him his words back
      setTrouble(err instanceof Error ? err.message : String(err))
    } finally { setSending(false) }
  }

  async function order(e: React.FormEvent) {
    e.preventDefault()
    if (!p?.price) return
    setPlacing(true); setTrouble(undefined)
    try {
      await placeOrder({
        productId: id, quantity: qty, unitPrice: p.price.suggested,
        buyerName, buyerOrg, note: orderNote.trim() || undefined, localLang: p.lang,
      })
      setOrderNote('')
      setOrders(await listOrders(id))
    } catch (err) {
      setTrouble(err instanceof Error ? err.message : String(err))
    } finally { setPlacing(false) }
  }

  if (!p) return <div className="p-10 text-center text-ink-3">Loading…</div>

  const field = 'w-full rounded-card border border-line bg-surface px-3.5 py-3 text-[15px] ' +
                'outline-none transition-colors placeholder:text-ink-3 focus-visible:border-indigo'

  return (
    <div className="min-h-full bg-paper">
      <header className="weave border-b border-line bg-surface px-6 py-4">
        <button onClick={() => nav('/buyer')} className="press min-h-0 py-1.5 pr-2 text-sm text-ink-3">← all products</button>
      </header>

      <div className="mx-auto grid max-w-5xl gap-8 p-6 md:grid-cols-2">
        <div>
          {/* Her work, at the size of the thing being bought. */}
          {p.cleanPhoto && (
            <img src={p.cleanPhoto} alt=""
              className="rise aspect-square w-full rounded-panel border border-line bg-surface object-cover shadow-card" />
          )}
          <h1 className="mt-5 text-[26px] font-bold leading-tight tracking-tight">{p.listing?.titleEn}</h1>
          <p className="mt-2 leading-relaxed text-ink-2">{p.listing?.descriptionEn}</p>

          <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-2">
            <p className="text-[34px] font-bold leading-none tabular-nums text-indigo">₹{p.price?.suggested}</p>
            <p className="text-sm text-ink-3">per piece · direct from the maker</p>
          </div>
          {p.price && <div className="mt-3 max-w-xs"><PriceInNotes amount={p.price.suggested} size="sm" /></div>}

          {/* Bulk order form. The problem statement asks for B2B buyers, so
              quantity is the first thing on screen, not an afterthought. */}
          <form onSubmit={order} className="mt-6 rounded-panel border border-line bg-surface p-5 shadow-card">
            <h2 className="mb-4 text-lg font-bold tracking-tight">Place a bulk order</h2>

            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">Quantity</label>
            <div className="mb-4 flex items-center gap-2">
              <button type="button" aria-label="−" onClick={() => setQty(Math.max(1, qty - 5))}
                className="press h-12 w-12 min-h-0 rounded-card border border-line bg-surface text-xl shadow-rest active:bg-surface-2">−</button>
              <input type="number" min={1} value={qty}
                onChange={e => setQty(Math.max(1, +e.target.value || 1))}
                className="w-24 rounded-card border border-line bg-surface px-3 py-3 text-center text-lg font-semibold tabular-nums outline-none focus-visible:border-indigo" />
              <button type="button" aria-label="+" onClick={() => setQty(qty + 5)}
                className="press h-12 w-12 min-h-0 rounded-card border border-line bg-surface text-xl shadow-rest active:bg-surface-2">+</button>
              <span className="ml-1 text-sm text-ink-3">× ₹{p.price?.suggested}</span>
            </div>

            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              <input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Your name" className={field} />
              <input value={buyerOrg} onChange={e => setBuyerOrg(e.target.value)} placeholder="Company" className={field} />
            </div>

            {/* Its own line: the placeholder is a sentence and was being cut in
                half inside a half-width box. */}
            <input value={orderNote} onChange={e => setOrderNote(e.target.value)}
              placeholder="Anything she should know?"
              className={field + ' mb-1'} />
            <p className="mb-3 text-xs text-ink-3">She will hear this read out in her own language.</p>

            {trouble && (
              <p className="mb-3 rounded-card border border-danger/30 bg-gold-wash px-3 py-2 text-sm text-danger">
                Could not place that just now — {trouble}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">Total</p>
                <p className="text-2xl font-bold leading-tight tabular-nums">
                  ₹{(qty * (p.price?.suggested ?? 0)).toLocaleString('en-IN')}
                </p>
              </div>
              <button disabled={placing || !p.price}
                className="press min-h-0 shrink-0 rounded-card bg-indigo px-6 py-3.5 font-semibold text-white shadow-card disabled:opacity-40 disabled:shadow-none">
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

        <section className="flex flex-col overflow-hidden rounded-panel border border-line bg-surface shadow-card">
          <header className="border-b border-line px-4 py-3">
            <h2 className="font-bold tracking-tight">Message the artisan</h2>
            <p className="mt-0.5 text-sm text-ink-3">
              You write in English. She hears it in her own language, and answers by speaking.
            </p>
          </header>

          <ul className="flex max-h-[26.25rem] min-h-[13.75rem] flex-col gap-3 overflow-y-auto p-4">
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
              className={'min-w-0 flex-1 ' + field}
            />
            <button
              disabled={!text.trim() || sending}
              className="press min-h-0 shrink-0 rounded-card bg-indigo px-5 font-semibold text-white shadow-card disabled:opacity-40 disabled:shadow-none"
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
