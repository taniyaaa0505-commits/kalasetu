/**
 * Every conversation a buyer has started with her, in one place.
 *
 * The sibling of Orders, and deliberately the same screen in every way that
 * matters: reached from a tile of its own on the home screen, a list of cards
 * with the product it is about, a count of what is waiting, and one tap into
 * the thing itself. An order and a message are the only two ways a buyer
 * reaches her, so they should not be two different shapes to learn.
 *
 * One row per PRODUCT, not per message. The conversation is the unit — she
 * does not think "I have four messages", she thinks "the man about the pot
 * wants something".
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Screen from '../components/Screen'
import Empty from '../components/Empty'
import Icon from '../components/Icon'
import { subscribeMyMessages } from '../services/messages'
import { listMyProducts } from '../services/db'
import { artisanId } from '../services/artisan'
import { lastSeen } from '../lib/seen'
import { speak } from '../lib/speak'
import { t, useLang, prefersEnglish } from '../lib/i18n'
import { asrCode, type Message, type Product } from '../types'

/** One conversation, folded down to what the list needs. */
interface Thread {
  product?: Product
  productId: string
  last: Message
  unread: number
}

export default function Messages() {
  const nav = useNavigate()
  const lang = useLang()
  const mine = prefersEnglish(lang)
  const [threads, setThreads] = useState<Thread[]>([])

  useEffect(() => {
    let off: (() => void) | undefined
    let gone = false
    void artisanId().then(me => {
      if (gone) return
      off = subscribeMyMessages(me, async items => {
        const ps = await listMyProducts(me)
        const byId = Object.fromEntries(ps.map(p => [p.id, p]))

        // Fold the flat list into one entry per conversation, newest first.
        const byProduct = new Map<string, Message[]>()
        for (const m of items) {
          const list = byProduct.get(m.productId) ?? []
          list.push(m)
          byProduct.set(m.productId, list)
        }

        const out: Thread[] = []
        for (const [productId, msgs] of byProduct) {
          const sorted = [...msgs].sort((a, b) => a.createdAt - b.createdAt)
          const seen = lastSeen(productId)
          out.push({
            productId,
            product: byId[productId],
            last: sorted[sorted.length - 1],
            unread: sorted.filter(m => m.from === 'buyer' && m.createdAt > seen).length,
          })
        }
        out.sort((a, b) => b.last.createdAt - a.last.createdAt)
        setThreads(out)
      })
    })
    return () => { gone = true; off?.() }
  }, [])

  return (
    <Screen title={t('messages')} onBack={() => {}}>
      {threads.length === 0 && <Empty kind="chat" message={t('noMessages')} />}

      <ul className="flex flex-col gap-3">
        {threads.map(th => (
          <li key={th.productId}>
            <button
              onClick={() => nav(`/p/${th.productId}/chat`)}
              className={
                'press flex w-full items-center gap-3 rounded-card border-2 p-3 text-left shadow-rest ' +
                (th.unread > 0
                  ? 'border-clay bg-clay-wash'      // waiting for her
                  : 'border-line bg-surface')
              }
            >
              <span className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                {th.product?.cleanPhoto
                  ? <img src={th.product.cleanPhoto} alt="" className="h-full w-full object-cover" />
                  : <span className="flex h-full w-full items-center justify-center text-ink-3">
                      <Icon name="chat" />
                    </span>}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {(mine ? th.product?.listing?.titleEn : th.product?.listing?.titleHi) ?? t('untitled')}
                </span>
                {/* Her language, always — the same rule the chat itself follows. */}
                <span className="mt-0.5 block truncate text-sm text-ink-2">
                  {th.last.local || th.last.source}
                </span>
              </span>

              {/* Hearing it is the point. She cannot read the line above. */}
              <span
                role="button"
                tabIndex={0}
                aria-label={t('listenAgain')}
                onClick={e => { e.stopPropagation(); speak(th.last.local || th.last.source, asrCode(lang)) }}
                onKeyDown={e => {
                  if (e.key !== 'Enter' && e.key !== ' ') return
                  e.stopPropagation(); e.preventDefault()
                  speak(th.last.local || th.last.source, asrCode(lang))
                }}
                className="press flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-indigo"
              >
                <Icon name="speak" className="text-xl" />
              </span>

              {th.unread > 0 && (
                <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full
                                 bg-clay px-2 text-sm font-bold tabular-nums text-white">
                  {th.unread}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </Screen>
  )
}
