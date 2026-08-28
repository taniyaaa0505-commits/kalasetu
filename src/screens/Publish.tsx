import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Screen from '../components/Screen'
import BigButton from '../components/BigButton'
import { getProduct, patchProduct } from '../services/db'
import { speak } from '../lib/speak'
import PriceInNotes from '../components/PriceInNotes'
import { t, useLang, prefersEnglish } from '../lib/i18n'
import type { Product } from '../types'

/** Where the listing goes. Mocked for round 1 — say so honestly in the pitch. */
const CHANNEL_NAMES = ['ONDC', 'GeM', 'Amazon Karigar']

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
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <span className="text-7xl" aria-hidden>✅</span>
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

      <p className="mt-6 mb-2 text-xs font-semibold uppercase tracking-widest text-ink-3">
        {t('sentTo')}
      </p>
      <ul className="flex flex-wrap gap-2">
        {[...CHANNEL_NAMES, t('bulkBuyers')].map(c => (
          <li key={c} className="rounded-full border border-line bg-surface px-3 py-2 text-sm">{c}</li>
        ))}
      </ul>
    </Screen>
  )
}
