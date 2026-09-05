import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import Screen from '../components/Screen'
import Icon from '../components/Icon'
import { Gota, Corner } from '../components/Ornament'
import BigButton from '../components/BigButton'
import { listProducts, newId, subscribeProducts } from '../services/db'
import { listMessages } from '../services/messages'
import { subscribeOrders } from '../services/orders'
import { speak } from '../lib/speak'
import Coach from '../components/Coach'
import { advanceGuide, restartGuide, useGuideStep } from '../lib/guide'
import ConfirmRemove from '../components/ConfirmRemove'
import Shopfront from '../components/Shopfront'
import Speakable from '../components/Speakable'
import { asrCode } from '../types'
import { t, tf, getLang, useLang, prefersEnglish } from '../lib/i18n'
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

  // Nothing at all until she has a language. Everything below this line is
  // words, and none of them are legible to her until she has answered that.
  const guide = useGuideStep()
  useEffect(() => {
    if (guide === 'language') nav('/start', { replace: true })
  }, [guide, nav])

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
    advanceGuide('homeAdd')     // she pressed the real button, not a picture of it
    // Navigate FIRST, and let the camera screen create it. Saving here woke the
    // subscription above, so the list redrew with an empty stub in it — visible
    // for a frame — before the router moved, and left a nameless product behind
    // whenever she backed out of the camera.
    nav(`/p/${newId()}/capture`)
  }

  const empty = products.length === 0
  const waiting = orders.filter(o => o.status === 'placed').length
  const draft = products.find(p => p.status !== 'published')

  return (
    <Screen
      title={t('appName')} brand
      action={<BigButton icon={<Icon name="camera" />} label={t('addProduct')} onClick={startNew} size="lg" />}
    >
      <div className="flex min-h-full flex-col">

        {waiting > 0 && (
          <button
            onClick={() => nav('/orders')}
            className="press rise mb-5 flex w-full items-center gap-3 rounded-panel bg-indigo px-4 py-4 text-left text-white shadow-card active:opacity-90"
          >
            <span aria-hidden className="text-3xl">🔔</span>
            <span className="flex-1">
              <span className="block text-lg font-bold">{t('newOrderCame')}</span>
              <span className="block text-sm text-white/80">{waiting} {t('ordersWaiting')}</span>
            </span>
            <span aria-hidden className="text-2xl">›</span>
          </button>
        )}

        {/* What this app is FOR, in one line, before anything else on the
            screen. She may have been handed the phone by someone else and have
            no idea what she is looking at.

            Only while the shop is empty. Once there is work in it the line
            became "what shall we do today?" — a question the screen below it
            already answers, taking a whole heading's worth of the one part of
            the page she sees without scrolling. Her earnings go there now. */}
        {empty && (
          <Speakable
            text={t('tagline')}
            className="font-display text-[1.375rem] font-bold leading-tight tracking-tight"
          />
        )}

        {/* An empty shop is the first thing she ever sees. A woman at her work
            reads as an invitation; a dashed box saying "nothing here" reads as
            a screen that failed to load. */}
        {empty && (
          <div className="rise rise-1 mb-5 mt-3 flex flex-col items-center gap-3 text-center">
            {/* A jharokha: her work seen through a carved window, with the
                brackets where the arch meets its pillars. */}
            <div className="relative w-full max-w-[19rem] p-2">
              <div className="arch overflow-hidden rounded-b-panel bg-surface p-2 shadow-card ring-1 ring-gold-leaf/45">
                <div className="arch overflow-hidden rounded-b-card">
                  <Shopfront width={288} />
                </div>
              </div>
              <Corner className="absolute -left-0.5 -top-0.5" />
              <Corner className="absolute -right-0.5 -top-0.5 -scale-x-100" />
              <Corner className="absolute -bottom-0.5 -left-0.5 -scale-y-100" />
              <Corner className="absolute -bottom-0.5 -right-0.5 -scale-100" />
            </div>
            <Speakable text={t('noProducts')} className="text-base leading-relaxed text-ink-2" />
          </div>
        )}

        {/* What the app is about to do for her, before she risks anything. Only
            while the shop is empty: after that the shop says it better than any
            promise could, and this would be noise.

            Above the two errands, not below them, because on an empty shop
            Orders has nothing in it and the promise is the thing worth the
            first screenful. */}
        {empty && <div data-guide="what"><WhatWeDo /></div>}

        {/* The record her work builds — and it goes FIRST.
            It used to sit under the product grid, which meant the one number
            this whole project is judged on ("you got ₹X more than you used
            to") was three screens down, below however many things she had
            listed. She would never see it, and neither would anyone she was
            trying to convince — a loan officer, a buyer, her family. It is the
            answer to "is this app worth my time", so it is the first thing on
            the screen after what the app is. */}
        {!empty && <SoFar products={products} orders={orders} draft={draft} />}

        {/* The two side errands. Adding a product is NOT here — it is pinned to
            the bottom of the screen, so it stays under her thumb however long
            the shop below gets. */}
        <div className="rise rise-2 mt-4 grid grid-cols-2 gap-3">
          <Tile icon={<Icon name="learn" />} label={t('learnHow')} onClick={restartGuide} />
          <div data-guide="orders" className="contents">
            <Tile
              icon={<Icon name="box" />} label={t('orders')} onClick={() => nav('/orders')}
              badge={waiting > 0 ? waiting : undefined}
            />
          </div>
        </div>

        {!empty && (
          <section className="rise rise-3 mt-8">
            <SectionTitle>{t('yourShop')}</SectionTitle>
            <ul className="grid grid-cols-2 gap-3">
              {products.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  title={(mine ? p.listing?.titleEn : p.listing?.titleHi) ?? t('untitled')}
                  messages={msgCounts[p.id] ?? 0}
                  onOpen={() => nav(`/p/${p.id}/capture`)}
                  onChat={() => nav(`/p/${p.id}/chat`)}
                  onRemove={() => setRemoving(p)}
                />
              ))}
            </ul>
          </section>
        )}

        {/* The empty home, one control at a time. Each one rings the real thing
          and says out loud what it is for. */}
      <Coach step="homeWhat"   target="what"   title={t('weWillDo')}
             body={[t('capPhoto'), t('capWords'), t('capPrice')].join('. ')} />
      <Coach step="homeOrders" target="orders" title={t('tourOrders')} body={t('tourOrdersSub')} />
      <Coach step="homeLang"   target="lang"   title={t('language')}  body={t('tourSpeaksSub')} />
      {/* No body. It used to carry the same sentence the camera screen's own
          ring says one tap later — "press the big button and photograph your
          product", twice, on two consecutive screens. The ring is around the
          button and the card already says "tap this"; the title is the whole
          instruction. */}
      <Coach step="homeAdd"    target="action" title={t('tourStart')} mode="tap" />

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
          className="press mt-auto flex w-full items-center justify-center gap-2 pt-6 pb-1 text-sm font-medium text-indigo">
          <Icon name="market" className="text-base" />
          <span className="underline">{t('ourMarketplace')}</span>
        </button>
      </div>
    </Screen>
  )
}

/* ---------------- pieces ---------------- */

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3">
      <Gota className="mb-2" />
      <h2 className="text-center font-body text-xs font-semibold label uppercase text-gold">{children}</h2>
    </div>
  )
}

/**
 * The three capabilities, as a promise rather than a menu.
 *
 * The design brief asked for three tool buttons — improve a photo, write a
 * listing, get a price. They are not three tools; they are three stages of one
 * flow, and there is nothing to price before there is a product. Three buttons
 * would have been three dead ends. So they are shown as what she GETS, with
 * the single real action pinned below where her thumb already is.
 */
function WhatWeDo() {
  const lang = useLang()
  const caps = [
    { icon: <Icon name="camera" />, text: t('capPhoto') },
    { icon: <Icon name="mic" />, text: t('capWords') },
    { icon: '₹',  text: t('capPrice') },
  ]
  return (
    <section className="rise rise-3">
      <button
        onClick={() => speak([t('weWillDo'), ...caps.map(c => c.text)].join('. '), asrCode(lang))}
        className="press mb-3 flex min-h-0 items-center gap-2 py-1 active:opacity-60"
      >
        <Icon name="speak" className="text-indigo" />
        <span className="text-xs font-semibold label uppercase text-ink-3">{t('weWillDo')}</span>
      </button>

      <ul className="flex flex-col gap-2">
        {caps.map(c => (
          <li key={c.text}
            className="flex items-center gap-3 rounded-card border border-line-2/70 bg-surface px-3 py-2.5 shadow-rest">
            <span aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-clay-wash text-lg font-semibold text-clay">
              {c.icon}
            </span>
            <span className="text-[0.9375rem] leading-snug">{c.text}</span>
            <Icon name="ai" className="ml-auto shrink-0 text-base text-indigo/40" />
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * One product, with its photograph as the whole point.
 *
 * Her work is the hero of this screen, so the image gets the card and the
 * chrome gets out of the way: status is a pill ON the photo, the price sits
 * under it. The bin is small, last, and needs a deliberate reach — deleting is
 * the only irreversible thing here and it should never be the easiest hit.
 */
function ProductCard({
  product, title, messages, onOpen, onChat, onRemove,
}: {
  product: Product
  title: string
  messages: number
  onOpen: () => void
  onChat: () => void
  onRemove: () => void
}) {
  const live = product.status === 'published'
  const photo = product.cleanPhoto ?? product.photo

  return (
    <li className="relative">
      <button
        onClick={onOpen}
        className="press block w-full min-h-0 overflow-hidden rounded-card border border-line-2/70 bg-surface text-left shadow-card"
      >
        <div className="relative aspect-square w-full">
          {/* Her work seen through the same carved window as everywhere else.
              The badge is a sibling, not a child: inside the clip it loses its
              corner to the curve of the arch. */}
          <div className="arch-deep h-full w-full overflow-hidden bg-surface-2">
            {photo
              ? <img src={photo} alt="" className="h-full w-full object-cover" />
              : <span className="flex h-full w-full items-center justify-center text-4xl opacity-40"><Icon name="box" /></span>}
          </div>

          {/* At the TOP of the card it sat in the arch's shoulder, half on the
              dome and half off it, and read as a mistake. The bottom edge of
              the window is straight. */}
          <span className={
            'absolute bottom-2 left-2 rounded-full px-2 py-1 text-[11px] font-bold shadow-rest ' +
            (live ? 'bg-good text-white' : 'bg-gold-wash text-gold')
          }>
            {live ? t('onSale') : t('incomplete')}
          </span>
        </div>

        {/* Right padding keeps the price clear of the bin sitting over it. */}
        <div className="px-3 pt-2 pb-3 pr-14">
          <p className="line-clamp-2 min-h-[2.6em] text-sm font-semibold leading-snug">{title}</p>
          <p className="mt-1 font-display text-lg font-bold tabular-nums text-indigo">
            {product.price ? `₹${product.price.suggested}` : '—'}
          </p>
        </div>
      </button>

      {/* A buyer is talking to her. This has to be impossible to miss. */}
      {messages > 0 && (
        <button
          onClick={onChat}
          aria-label={t('messages')}
          className="press absolute right-2 top-2 flex h-9 min-h-0 items-center gap-1 rounded-full bg-indigo px-2.5 text-white shadow-card"
        >
          <Icon name="chat" className="text-sm" />
          <span className="text-xs font-bold tabular-nums">{messages}</span>
        </button>
      )}

      <button
        onClick={onRemove}
        aria-label={`${t('remove')} — ${title}`}
        className="press absolute bottom-2 right-2 flex h-11 w-11 min-h-0 items-center justify-center rounded-full border border-line bg-surface/90 text-base backdrop-blur active:bg-surface-2"
      ><Icon name="trash" /></button>
    </li>
  )
}

/**
 * What her work has added up to, under the shop it is made of.
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

  const delivered = orders.filter(o => o.status === 'delivered')
  const earned = delivered.reduce((n, o) => n + o.total, 0)
  const live = orders.filter(o => o.status !== 'declined').length
  const onSale = products.filter(p => p.status === 'published').length

  /**
   * How much more she got than she used to.
   *
   * The number the Ministry of Social Justice is actually buying. Counted only
   * where BOTH sides are real — a delivered order, and a price she told us she
   * used to be paid — so it is a fact about her, not an estimate about her. A
   * product she never answered for contributes nothing rather than a guess.
   */
  const extra = delivered.reduce((n, o) => {
    const was = products.find(p => p.id === o.productId)?.usualPrice
    if (!was || o.unitPrice <= was) return n
    return n + (o.unitPrice - was) * o.quantity
  }, 0)
  const askedAnyUsual = products.some(p => p.usualPrice)

  const stats: [string, string][] = [
    [`₹${earned}`, t('earnedLabel')],
    [String(live), t('orders')],
    [String(onSale), t('onSale')],
  ]

  return (
    <section className="rise rise-2 mt-5">
      <button
        onClick={() => speak(
          `${t('soFar')}. ${t('earnedLabel')} ${earned} ${t('rupees')}. ` +
          `${live} ${t('orders')}. ${onSale} ${t('onSale')}.`, asrCode(lang))}
        className="press mb-3 flex min-h-0 items-center gap-2 py-1 active:opacity-60"
      >
        <Icon name="speak" className="text-indigo" />
        <span className="text-xs font-semibold label uppercase text-ink-3">{t('soFar')}</span>
      </button>

      <div className="grid grid-cols-3 gap-2">
        {stats.map(([value, label]) => (
          <div key={label}
            className="rounded-card border border-line-2/70 bg-surface px-2 py-3 text-center shadow-rest">
            <p className="font-display text-2xl font-bold tabular-nums leading-tight text-indigo">{value}</p>
            <p className="mt-0.5 text-xs text-ink-3">{label}</p>
          </div>
        ))}
      </div>

      {/* The headline. Not a fourth stat squeezed into the row — this is the
          one number the whole project is judged on, so it gets its own line
          and its own colour, and it only appears once it is TRUE. */}
      {extra > 0 && (
        <button
          onClick={() => speak(`${t('extraEarned')}. ${tf('moreThisTime', { n: extra })}`, asrCode(lang))}
          className="press mt-2 flex w-full items-center gap-3 rounded-card border-2 border-good bg-sage-wash px-4 py-3 text-left"
        >
          <Icon name="rising" className="text-2xl" />
          <span className="flex-1">
            <span className="block font-display text-xl font-bold leading-tight tabular-nums text-good">₹{extra}</span>
            <span className="block text-sm text-ink-2">{t('extraEarned')}</span>
          </span>
          <Icon name="speak" className="text-good" />
        </button>
      )}

      {/* She has never been asked, so we have nothing to compare against.
          Say what is missing rather than showing a silent zero. */}
      {extra === 0 && !askedAnyUsual && onSale > 0 && (
        <p className="mt-2 rounded-card border border-line bg-surface px-4 py-3 text-[15px] leading-snug text-ink-3">
          <Icon name="rising" /> {t('tellUsUsual')}
        </p>
      )}

      {/* One next thing, never a list of them. */}
      {draft ? (
        <button
          onClick={() => nav(`/p/${draft.id}/capture`)}
          className="press mt-2 flex w-full items-center gap-3 rounded-card border-2 border-gold bg-gold-wash px-4 py-3 text-left"
        >
          <Icon name="rewrite" className="text-xl" />
          <span className="flex-1 text-[0.9375rem] font-medium leading-snug text-gold">{t('finishDraft')}</span>
          <span aria-hidden className="text-lg text-gold">›</span>
        </button>
      ) : earned === 0 ? (
        <p className="mt-2 rounded-card border border-line bg-surface px-4 py-3 text-[0.9375rem] text-ink-3">
          ⏳ {t('nothingSoldYet')}
        </p>
      ) : null}
    </section>
  )
}

/** Both tiles say their own label out loud, for the same reason BigButton
 *  does: an icon and a word are both unreadable to someone who reads neither. */
function Tile({
  icon, label, onClick, badge,
}: { icon: ReactNode; label: string; onClick: () => void; badge?: number }) {
  const lang = useLang()
  return (
    <button
      onClick={() => { speak(label, asrCode(lang)); onClick() }}
      className="press relative flex min-h-[5.75rem] flex-col items-center justify-center gap-1.5 rounded-card
                 border border-line bg-surface px-3 py-3 text-center shadow-rest active:bg-surface-2"
    >
      <span aria-hidden className="text-2xl text-indigo">{icon}</span>
      <span className="text-[0.9375rem] font-medium leading-snug">{label}</span>
      {badge !== undefined && (
        <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full
                         bg-indigo px-1.5 text-xs font-bold tabular-nums text-white">{badge}</span>
      )}
    </button>
  )
}
