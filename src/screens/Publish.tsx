import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Screen from '../components/Screen'
import Icon from '../components/Icon'
import { Gota } from '../components/Ornament'
import Coach from '../components/Coach'
import { useSay } from '../lib/arrival'
import { useIdle } from '../lib/idle'
import { getGuideStep } from '../lib/guide'
import { advanceGuide, endGuide } from '../lib/guide'
import BigButton from '../components/BigButton'
import { getProduct, patchProduct } from '../services/db'
import { speak } from '../lib/speak'
import PriceInNotes from '../components/PriceInNotes'
import { t, useLang, prefersEnglish } from '../lib/i18n'
import { asrCode } from '../types'
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

  // The last instruction in the flow. `published` is spoken by publish()
  // itself, so this only covers the arrival.
  useSay(t('tourPublishSub'), !done)
  const nudge = useIdle() && getGuideStep() === 'done'

  async function publish() {
    advanceGuide('publishSend')
    await patchProduct(id, { status: 'published' })
    setDone(true)
    // The guide ends HERE, on a real published listing of her own.
    endGuide()
    speak(t('published'), asrCode(lang))
  }

  if (done) return (
    /* Not green. Green is the app's yes — publish this, accept this order —
       and going home is neither. Spending the confirm colour on plain
       navigation is what stops it meaning anything where it has to. */
    <Screen action={
      <BigButton icon={<Icon name="back" />} label={t('goHome')} onClick={() => nav('/')} />
    }>
      {/* One thing to look at and one thing to press.
          This screen had four choices on it — marketplace, messages, orders,
          home — and every one of them was a place she had never been, offered
          at the exact moment she had just finished her first listing and had
          no idea what any of them meant. The listing is already sent; there is
          nothing left here that has to happen now. */}
      <div className="flex min-h-full flex-col items-center justify-center gap-5 text-center">
        <img src="./icons/icon-192.png" alt="" aria-hidden width={128} height={128}
          className="rise block rounded-3xl shadow-card ring-1 ring-gold-leaf/40" />
        <Gota className="w-40" />
        <p className="font-display text-2xl font-semibold leading-snug">{t('published')}</p>
      </div>
    </Screen>
  )

  return (
    <Screen
      title={t('screenSend')} step={6} onBack={() => {}}
      action={<BigButton icon="✅" label={t('publish')} variant="good" onClick={publish} beacon={nudge} />}
    >
      <Coach step="publishSend" target="action" mode="tap"
             title={t('tourPublishStep')} body={t('tourPublishSub')} />

      {p?.cleanPhoto && (
        <img src={p.cleanPhoto} alt=""
          className="arch mb-4 w-full rounded-b-panel border border-line-2/70 bg-surface shadow-card ring-1 ring-gold-leaf/30" />
      )}
      <p className="text-lg font-semibold">{mine ? p?.listing?.titleEn : p?.listing?.titleHi}</p>
      <p className="mt-1 font-display text-3xl font-bold tabular-nums text-indigo">₹{p?.price?.suggested}</p>
      {p?.price && <div className="mt-3"><PriceInNotes amount={p.price.suggested} size="sm" /></div>}

      {/* What actually happens: it appears on our buyer marketplace. */}
      <p className="mt-6 mb-2 text-xs font-semibold label uppercase text-ink-3">
        {t('sentTo')}
      </p>
      <ul className="flex flex-wrap gap-2">
        <li className="rounded-full border-2 border-good bg-surface px-3 py-2 text-sm font-medium text-good">
          ✓ {t('ourMarketplace')}
        </li>
      </ul>

      {/* What does not happen yet, said plainly. */}
      <p className="mt-5 mb-2 text-xs font-semibold label uppercase text-ink-3">
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
