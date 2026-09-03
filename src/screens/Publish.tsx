import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Screen from '../components/Screen'
import BigButton from '../components/BigButton'
import { getProduct, patchProduct } from '../services/db'
import { speak } from '../lib/speak'
import PriceInNotes from '../components/PriceInNotes'
import Kolam from '../components/Kolam'
import { t, useLang, prefersEnglish } from '../lib/i18n'
import type { Product } from '../types'

/**
 * Channels we have NOT built yet.
 *
 * These are rendered as clearly-marked "planned", never as if the listing is
 * being sent there. Every one of them requires a registered business entity
 * to onboard, which a student team does not have — see SPEC.md. Do not let
 * this list drift back into looking live.
 */
const PLANNED_CHANNELS = ['ONDC', 'GeM', 'Amazon Karigar', 'Flipkart Samarth']

export default function Publish() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const lang = useLang()
  const mine = prefersEnglish(lang)
  const [p, setP] = useState<Product>()
  const [done, setDone] = useState(false)

  useEffect(() => { getProduct(id).then(setP) }, [id])

  async function publish() {
    await patchProduct(id, { status: 'published' })
    setDone(true)
    speak(t('published'))
  }

  if (done) return (
    <Screen action={<BigButton icon="🏠" label={t('goHome')} variant="quiet" onClick={() => nav('/')} />}>
      <div className="flex flex-col items-center gap-4 py-14 text-center">
        {/* A kolam is drawn at a threshold on a good morning. Her work is
            now out in the world — that is the right gesture, not confetti. */}
        <Kolam />
        <p className="text-2xl font-semibold">{t('published')}</p>
        <button onClick={() => nav('/buyer')} className="text-indigo underline">
          {t('buyerViewLink')} →
        </button>
        <button onClick={() => nav(`/p/${id}/chat`)} className="text-indigo underline">
          💬 {t('messages')} →
        </button>
      </div>
    </Screen>
  )

  return (
    <Screen
      title={t('screenSend')} step={6} onBack={() => {}}
      action={<BigButton icon="✅" label={t('publish')} variant="good" onClick={publish} />}
    >
      {p?.cleanPhoto && <img src={p.cleanPhoto} alt="" className="mb-4 w-full rounded-xl border border-line" />}
      <p className="text-lg font-semibold">{mine ? p?.listing?.titleEn : p?.listing?.titleHi}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-indigo">₹{p?.price?.suggested}</p>
      {p?.price && <div className="mt-3"><PriceInNotes amount={p.price.suggested} size="sm" /></div>}

      {/* What actually happens: it appears on our buyer marketplace. */}
      <p className="mt-6 mb-2 text-xs font-semibold uppercase tracking-widest text-ink-3">
        {t('sentTo')}
      </p>
      <ul className="flex flex-wrap gap-2">
        <li className="rounded-full border-2 border-good bg-surface px-3 py-2 text-sm font-medium text-good">
          ✓ {t('ourMarketplace')}
        </li>
      </ul>

      {/* What does not happen yet, said plainly. */}
      <p className="mt-5 mb-2 text-xs font-semibold uppercase tracking-widest text-ink-3">
        {t('plannedChannels')} · <span className="text-gold">{t('notConnectedYet')}</span>
      </p>
      <ul className="flex flex-wrap gap-2">
        {PLANNED_CHANNELS.map(c => (
          <li key={c}
            className="rounded-full border border-dashed border-line bg-transparent px-3 py-2 text-sm text-ink-3">
            {c}
          </li>
        ))}
      </ul>
    </Screen>
  )
}
