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
import PriceInNotes from '../components/PriceInNotes'
import type { Message, Product } from '../types'

export default function BuyerProduct() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const [p, setP] = useState<Product>()
  const [msgs, setMsgs] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { getProduct(id).then(setP) }, [id])

  useEffect(() => {
    let alive = true
    const tick = async () => {
      const list = await listMessages(id)
      if (alive) setMsgs(list)
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
