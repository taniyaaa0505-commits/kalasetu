import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import Screen from '../components/Screen'
import Icon from '../components/Icon'
import BigButton from '../components/BigButton'
import { listProducts, newId, subscribeProducts } from '../services/db'
import { listMessages } from '../services/messages'
import { subscribeOrders } from '../services/orders'
import { speak } from '../lib/speak'
import { tourSeen } from '../lib/tour'
import ConfirmRemove from '../components/ConfirmRemove'
import Artisan from '../components/Artisan'
import Speakable from '../components/Speakable'
import { asrCode } from '../types'
import { t, getLang, useLang, prefersEnglish } from '../lib/i18n'
import type { Order, Product } from '../types'

export default function Home() {
  const nav = useNavigate()
  const lang = useLang()
  const mine = prefersEnglish(lang)
  const [products, setProducts] = useState<Product[]>([])
  const [msgCounts, setMsgCounts] = useState<Record<string, number>>({})
  const [orders, setOrders] = useState<Order[]>([])
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
  useEffect(() => subscribeOrders(items => {
    setOrders(items)
    const waiting = items.filter(o => o.status === 'placed').length
    if (waiting > 0 && !announced.current) {
      announced.current = true
      speak(t('newOrderCame'), asrCode(getLang()))
    }
    if (waiting === 0) announced.current = false
  }), [])

  function startNew() {
    // Navigate FIRST, and let the camera screen create it.
    //
    // This used to save the product and then navigate. The save woke the
    // subscription above, so the list redrew with the new empty stub in it —
    // "बिना नाम का सामान · अधूरा", visible for a frame — and only then did the
    // router move. That flash was the app appearing to do the wrong thing.
    //
    // It also left a nameless empty product behind every time she opened the
    // camera and backed out. Now nothing exists until there is a photo.
    nav(`/p/${newId()}/capture`)
  }

  const empty = products.length === 0
  const waiting = orders.filter(o => o.status === 'placed').length
  const draft = products.find(p => p.status !== 'published')

  return (
    <Screen
      title={t('appName')} brand
      action={<BigButton icon="📷" label={t('addProduct')} onClick={startNew} size="lg" />}
    >
      {/* A full-height column, so the quiet footer link sits at the bottom of
          the screen instead of floating in the middle of it. */}
      <div className="flex min-h-full flex-col">
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
        <div className="mb-5 flex flex-col items-center gap-3 text-center">
          <Artisan width={296} />
          <Speakable text={t('noProducts')} className="text-base leading-relaxed text-ink-2" />
        </div>
      )}

      {/* The two side errands. Adding a product is NOT here — it is pinned to
          the bottom of the screen, so it stays under her thumb however long
          the list below gets. It was a tile for one release and scrolled away
          the moment she had a few products, which is exactly the thing the
          pinned slot exists to prevent. */}
      <div className="grid grid-cols-2 gap-3">
        <Tile icon={<Icon name="learn" />} label={t('learnHow')} onClick={() => nav('/tour')} />
        <Tile
          icon="📦" label={t('orders')} onClick={() => nav('/orders')}
          badge={waiting > 0 ? waiting : undefined}
        />
      </div>

      {/* What is about to happen to her, before she risks anything. She cannot
          read the tiles above and has no idea what "add a product" leads to;
          the tour teaches this properly, but she has to choose to open it.
          Only while the list is empty. Measured: showing it alongside the
          record too pushes 114px past the fold on a 393x852 phone, and the
          record is the thing that was meant to fill that space. */}
      {empty && <HowItWorks />}

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

      {/* The record her work builds. It is also the whole loan argument: an
          artisan applying to NSFDC has no books, and this is the first time
          her selling has ever been written down anywhere. */}
      {!empty && <SoFar products={products} orders={orders} draft={draft} />}

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

      <button onClick={() => nav('/buyer')}
        className="mt-auto w-full pt-6 pb-1 text-sm text-indigo underline">
        <Icon name="market" className="mr-1.5 align-[-0.15em]" />{t('ourMarketplace')}
      </button>
      </div>
    </Screen>
  )
}

/**
 * What her work has added up to, under the list it is made of.
 *
 * Three numbers rather than a chart, because they get read out loud and a
 * chart cannot be. `earned` counts delivered orders ONLY — money that actually
 * arrived, not money that was promised — because the point of writing this
 * down is that a lender can believe it.
 *
 * Zeroes are honest and they are not a dead end: whatever is missing, the row
 * underneath says the next thing to do about it.
 */
function SoFar({ products, orders, draft }: {
  products: Product[]; orders: Order[]; draft?: Product
}) {
  const nav = useNavigate()
  const lang = useLang()

  const earned = orders.filter(o => o.status === 'delivered').reduce((n, o) => n + o.total, 0)
  const live = orders.filter(o => o.status !== 'declined').length
  const onSale = products.filter(p => p.status === 'published').length

  const stats: [string, string][] = [
    [`₹${earned}`, t('earnedLabel')],
    [String(live), t('orders')],
    [String(onSale), t('onSale')],
  ]

  return (
    <section className="mt-8">
      <button
        onClick={() => speak(
          `${t('soFar')}. ${t('earnedLabel')} ${earned} ${t('rupees')}. ` +
          `${live} ${t('orders')}. ${onSale} ${t('onSale')}.`, asrCode(lang))}
        className="mb-2 flex min-h-0 items-center gap-2 active:opacity-60"
      >
        <span aria-hidden className="text-indigo">🔊</span>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-3">{t('soFar')}</h2>
      </button>

      <div className="grid grid-cols-3 gap-2">
        {stats.map(([value, label]) => (
          <div key={label} className="rounded-2xl border border-line bg-surface px-2 py-3 text-center">
            <p className="text-2xl font-bold tabular-nums leading-tight text-indigo">{value}</p>
            <p className="mt-0.5 text-xs text-ink-3">{label}</p>
          </div>
        ))}
      </div>

      {/* One next thing, never a list of them. */}
      {draft ? (
        <button
          onClick={() => nav(`/p/${draft.id}/capture`)}
          className="mt-2 flex w-full items-center gap-3 rounded-2xl border-2 border-gold
                     bg-gold-wash px-4 py-3 text-left active:opacity-80"
        >
          <span aria-hidden className="text-xl">✏️</span>
          <span className="flex-1 text-[15px] font-medium leading-snug text-gold">{t('finishDraft')}</span>
          <span aria-hidden className="text-lg text-gold">›</span>
        </button>
      ) : earned === 0 ? (
        <p className="mt-2 rounded-2xl border border-line bg-surface px-4 py-3 text-[15px] text-ink-3">
          ⏳ {t('nothingSoldYet')}
        </p>
      ) : null}
    </section>
  )
}

/**
 * The whole app in three lines, read out in one tap.
 *
 * A timeline rather than "1. 2. 3." — the beads and the rule between them
 * carry the order, the way the step dots do everywhere else, because a numeral
 * is no more readable to her than a word. The third line is the promise the
 * other two are for: she is not being handed an empty shop to run.
 */
function HowItWorks() {
  const lang = useLang()
  const steps = [
    { icon: '📷', text: t('how1') },
    { icon: '🎤', text: t('how2') },
    { icon: '₹',  text: t('how3') },
  ]
  return (
    <section className="mt-6">
      <button
        onClick={() => speak([t('howItWorks'), ...steps.map(s => s.text)].join('. '), asrCode(lang))}
        className="mb-2 flex min-h-0 items-center gap-2 active:opacity-60"
      >
        <span aria-hidden className="text-indigo">🔊</span>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-3">
          {t('howItWorks')}
        </h2>
      </button>

      <ol className="relative rounded-2xl border border-line bg-surface px-4 py-2.5">
        {/* the thread the beads hang on */}
        <span aria-hidden className="absolute left-[35px] top-8 bottom-8 w-px bg-line-2" />
        {steps.map(s => (
          <li key={s.text} className="relative flex items-center gap-3 py-1.5">
            <span aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full
                         border border-line-2 bg-wash text-lg font-semibold text-indigo">
              {s.icon}
            </span>
            <span className="text-[15px] leading-snug">{s.text}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/* ---------------- the tiles ---------------- */

/** Both tiles say their own label out loud, for the same reason BigButton
 *  does: an icon and a word mean nothing to someone who cannot read either. */
function useSpoken(label: string) {
  const lang = useLang()
  return () => speak(label, asrCode(lang))
}

function Tile({
  icon, label, onClick, badge,
}: { icon: ReactNode; label: string; onClick: () => void; badge?: number }) {
  const say = useSpoken(label)
  return (
    <button
      onClick={() => { say(); onClick() }}
      className="relative flex min-h-[92px] flex-col items-center justify-center gap-1.5 rounded-2xl
                 border border-line bg-surface px-3 py-3 text-center active:bg-wash"
    >
      <span aria-hidden className="text-2xl">{icon}</span>
      <span className="text-[15px] font-medium leading-snug">{label}</span>
      {badge !== undefined && (
        <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full
                         bg-indigo px-1.5 text-xs font-bold tabular-nums text-white">{badge}</span>
      )}
    </button>
  )
}
