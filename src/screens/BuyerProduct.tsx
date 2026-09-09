/**
 * The buyer's side: a product page with a conversation.
 *
 * He types English and reads English. He never learns that the person on
 * the other end is speaking Maithili into a phone — which is the point.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProduct } from '../services/db'
import { sendMessage, translatePending, subscribeMessages, TRANSLATING_WINDOW_MS } from '../services/messages'
import { placeOrder, setStatus, subscribeOrders } from '../services/orders'
import PriceInNotes from '../components/PriceInNotes'
import { Scallop } from '../components/Ornament'
import type { Message, Order, Product } from '../types'

/** How long a button may claim to be working before we call it stuck. */
const WATCHDOG_MS = 12000

export default function BuyerProduct() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const [p, setP] = useState<Product>()
  const [msgs, setMsgs] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [qty, setQty] = useState(10)
  const [buyerName, setBuyerName] = useState('Name')
  const [buyerOrg, setBuyerOrg] = useState('Meridian Corporate Gifting')
  const [orderNote, setOrderNote] = useState('')
  const [placing, setPlacing] = useState(false)
  const [placed, setPlaced] = useState(false)
  const [trouble, setTrouble] = useState<string>()
  const endRef = useRef<HTMLDivElement>(null)
  const placedRef = useRef<HTMLDivElement>(null)

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

  // One redraw at the moment the "translating…" window closes. Nothing else
  // would trigger it: a translation that fails writes nothing, so the label
  // would sit there claiming to be busy until the next message arrived.
  const [, tick] = useState(0)
  useEffect(() => {
    const waiting = msgs.filter(m => m.untranslated)
    if (!waiting.length) return
    const soonest = Math.min(...waiting.map(m => m.createdAt + TRANSLATING_WINDOW_MS - Date.now()))
    if (soonest <= 0) return
    const timer = setTimeout(() => tick(n => n + 1), soonest + 100)
    return () => clearTimeout(timer)
  }, [msgs])

  /**
   * A ceiling on how long a button may say it is busy.
   *
   * Everything below this line is now local-first and returns in milliseconds,
   * so this should never fire. It exists because the failure it guards against
   * is not an exception — it is a promise that never settles, which no
   * try/finally can catch — and because the cost of being wrong about that is
   * a buyer staring at "Placing…" with no way forward and no idea why. If it
   * ever does fire, he gets his button back and a sentence he can act on.
   */
  useEffect(() => {
    if (!placing && !sending) return
    const timer = setTimeout(() => {
      setPlacing(false); setSending(false)
      setTrouble('that took too long — check your connection and try again')
    }, WATCHDOG_MS)
    return () => clearTimeout(timer)
  }, [placing, sending])

  // Put the confirmation where he is looking. On a phone the order form fills
  // the screen, so a banner rendered under it is a banner nobody sees.
  useEffect(() => {
    if (placed) placedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [placed])

  /**
   * Both of these clear their busy flag in a `finally`.
   *
   * They did not, and that was the bug: "Placing…" with nothing happening,
   * for ever. Anything that threw between setPlacing(true) and the last line
   * — Firestore refusing the write, the signal dropping mid-request — skipped
   * the reset, so the button stayed disabled and mid-sentence and the buyer
   * had no way to try again and no idea why.
   *
   * `finally` fixed the throwing case. It does nothing for the case that
   * actually shows up on a phone, which is a promise that never settles at
   * all — so neither of these awaits a network read it does not need any
   * more, and the button has a clock on it besides. See WATCHDOG_MS.
   */
  async function send(e: React.FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (!body || !p) return
    setText(''); setSending(true); setTrouble(undefined)
    try {
      // No re-read afterwards: subscribeMessages is live and hands us the
      // message back the moment it lands, which is sooner than a fresh
      // listMessages() would have returned it.
      await sendMessage({
        productId: id, from: 'buyer', text: body,
        localLang: p.lang, artisanId: p.artisanId,
      })
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
      /*
       * Two network reads used to sit between this buyer and his confirmation,
       * and neither of them was needed to place the order.
       *
       * placeOrder re-read the PRODUCT — a document carrying two base64
       * photographs — to learn one string this component has had in `p` since
       * it rendered. Then we re-read the whole ORDERS collection, to build a
       * list that subscribeOrders was already keeping up to date. The write
       * itself is local-first and returns in a millisecond; it was the two
       * reads wrapped around it that left the button sitting on "Placing…".
       */
      const fresh = await placeOrder({
        productId: id, quantity: qty, unitPrice: p.price.suggested,
        buyerName, buyerOrg, note: orderNote.trim() || undefined,
        localLang: p.lang, artisanId: p.artisanId,
      })
      setOrderNote('')
      // Show it immediately; the live listener will send the same order along
      // shortly, so key on id rather than appending twice.
      setOrders(prev => prev.some(o => o.id === fresh.id) ? prev : [fresh, ...prev])
      setPlaced(true)
    } catch (err) {
      setTrouble(err instanceof Error ? err.message : String(err))
    } finally { setPlacing(false) }
  }

  // Not the word "Loading": a gold thread pulling itself through, which is
  // the same motif as the step beads and needs no translating.
  if (!p) return (
    <div className="flex min-h-full items-center justify-center bg-paper p-10">
      <span aria-label="Loading" role="status"
        className="block h-1 w-40 overflow-hidden rounded-full bg-gold-leaf/25">
        <span className="pull block h-full w-1/3 rounded-full bg-gold-leaf" />
      </span>
    </div>
  )

  const field = 'w-full rounded-card border border-line-2/70 bg-surface px-3.5 py-3 text-[15px] ' +
                'outline-none transition-colors placeholder:text-ink-3 focus-visible:border-indigo'

  return (
    <div className="min-h-full bg-paper">
      <header className="jaali relative bg-night px-6 pb-6 pt-[max(1rem,env(safe-area-inset-top))] text-surface">
        <button onClick={() => nav('/buyer')} className="press min-h-0 py-1.5 pr-2 text-sm text-surface/70">← all products</button>
        <Scallop className="absolute inset-x-0 -bottom-2 text-night" />
      </header>

      <div className="mx-auto grid max-w-5xl gap-8 p-6 md:grid-cols-2">
        <div>
          {/* Her work, at the size of the thing being bought. */}
          {p.cleanPhoto && (
            <img src={p.cleanPhoto} alt=""
              className="rise arch aspect-square w-full rounded-b-panel border border-line-2/70 bg-surface object-cover shadow-card ring-1 ring-gold-leaf/30" />
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
          {/*
            * noValidate, deliberately.
            *
            * The quantity box is <input type="number" min={1}>, and the browser
            * refuses to submit a form containing a field that fails its own
            * constraints — silently, with a tooltip that a mobile keyboard
            * covers. Clear the box, or leave it mid-edit as "1e", and pressing
            * "Place order" does nothing at all, with no error and no clue.
            * The quantity is already clamped in JS on every keystroke, so the
            * native check was buying us nothing and could cost us the sale.
            */}
          <form onSubmit={order} noValidate
                className="mt-6 rounded-panel border border-line-2/70 bg-surface p-5 shadow-card">
            <h2 className="mb-4 text-lg font-bold tracking-tight">Place a bulk order</h2>

            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">Quantity</label>
            <div className="mb-4 flex items-center gap-2">
              <button type="button" aria-label="−" onClick={() => setQty(Math.max(1, qty - 5))}
                className="press h-12 w-12 min-h-0 rounded-card border border-line-2/70 bg-surface text-xl shadow-rest active:bg-surface-2">−</button>
              <input type="number" min={1} value={qty}
                onChange={e => setQty(Math.max(1, +e.target.value || 1))}
                className="w-24 rounded-card border border-line-2/70 bg-surface px-3 py-3 text-center text-lg font-semibold tabular-nums outline-none focus-visible:border-indigo" />
              <button type="button" aria-label="+" onClick={() => setQty(qty + 5)}
                className="press h-12 w-12 min-h-0 rounded-card border border-line-2/70 bg-surface text-xl shadow-rest active:bg-surface-2">+</button>
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
                <p className="font-display text-2xl font-bold leading-tight tabular-nums">
                  ₹{(qty * (p.price?.suggested ?? 0)).toLocaleString('en-IN')}
                </p>
              </div>
              <button disabled={placing || !p.price}
                className="press min-h-0 shrink-0 rounded-card bg-indigo px-6 py-3.5 font-semibold text-white shadow-card disabled:opacity-40 disabled:shadow-none">
                {placing ? 'Placing…' : 'Place order'}
              </button>
            </div>
          </form>

          {/* What happens next, said plainly.
              The button went back to reading "Place order" and a row quietly
              appeared in a list below — so the only feedback for the most
              consequential action on this page was a row he had no reason to
              look at. It also has to say that nothing is confirmed yet: an
              order is a REQUEST until she accepts it, and a buyer who thinks
              he has bought something will chase the wrong person. */}
          {placed && (
            <div role="status" ref={placedRef}
              className="fade mt-4 flex items-start gap-3 rounded-card border-2 border-good bg-sage-wash px-4 py-3.5">
              <span aria-hidden className="mt-0.5 text-lg">✅</span>
              <div className="flex-1">
                <p className="font-semibold text-good">Order placed</p>
                <p className="mt-0.5 text-sm leading-snug text-ink-2">
                  Waiting for the artisan to accept. She has been notified on her phone,
                  and you will see the status change here.
                </p>
              </div>
              <button onClick={() => setPlaced(false)} aria-label="Dismiss"
                className="press min-h-0 shrink-0 px-1 py-0.5 text-lg leading-none text-ink-3">×</button>
            </div>
          )}

          {orders.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2">
              {orders.map(o => <BuyerOrderRow key={o.id} o={o} />)}
            </ul>
          )}
        </div>

        <section className="flex flex-col overflow-hidden rounded-panel border border-line-2/70 bg-surface shadow-card">
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
                  (m.from === 'buyer' ? 'bg-indigo text-white' : 'border border-line-2/70 bg-paper')
                }>
                  {/* He only ever sees English, whichever way the message went. */}
                  <p>{m.english || m.source}</p>
                  {m.from === 'artisan' && !m.untranslated && (
                    <p className="mt-1.5 text-xs text-ink-3">
                      translated from {m.sourceLang.split('-')[0]} · “{m.source}”
                    </p>
                  )}
                  {/* Still working, or genuinely failed — not the same thing.
                      A message is drawn the instant it is sent, seconds before
                      its other language exists, and calling that "not
                      translated" reads as a broken chat rather than a busy
                      one. */}
                  {m.untranslated && (
                    <p className={'mt-1.5 text-xs ' + (m.from === 'buyer' ? 'text-white/70' : 'text-gold')}>
                      {Date.now() - m.createdAt < TRANSLATING_WINDOW_MS ? 'translating…' : '⚠ not translated'}
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

/**
 * One order, from the buyer's side.
 *
 * "Mark received" is the last step in the whole system and the only one that
 * writes `delivered` — which is the single status the artisan's income figure
 * counts. If this silently fails, her headline number silently stops moving.
 *
 * It used to be a bare button with an un-awaited handler: no pressed state, no
 * busy state, and a thrown write went nowhere at all. It worked, but a slow
 * connection was indistinguishable from a dead control, and a failed one was
 * indistinguishable from both. Same shape as the "Placing…" bug on this page.
 */
function BuyerOrderRow({ o }: { o: Order }) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<string>()

  async function receive() {
    setBusy(true); setFailed(undefined)
    try {
      // `known: o` — this row IS the order, so there is nothing to go and
      // fetch first. And no refresh afterwards: subscribeOrders on the parent
      // is live and redraws this row itself. Both reads were the same mistake
      // as the one on the Place order button, on the very last step of the
      // system.
      await setStatus(o.id, 'delivered', { known: o })
    } catch (err) {
      setFailed(err instanceof Error ? err.message : String(err))
    } finally { setBusy(false) }
  }

  return (
    <li className="rounded-xl border border-line-2/70 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold tabular-nums">{o.quantity} × ₹{o.unitPrice} = ₹{o.total.toLocaleString('en-IN')}</p>
          <p className="text-sm text-ink-3">{STATUS_TEXT[o.status]}</p>
        </div>
        {o.status === 'shipped' && (
          <button
            onClick={receive} disabled={busy}
            className="press min-h-0 shrink-0 rounded-lg border-2 border-good bg-sage-wash px-3 py-2
                       text-sm font-semibold text-good disabled:opacity-40"
          >{busy ? 'Saving…' : 'Mark received'}</button>
        )}
      </div>
      {failed && (
        <p className="mt-2 text-sm text-danger">
          Could not save that — check the connection and try again.
        </p>
      )}
    </li>
  )
}
