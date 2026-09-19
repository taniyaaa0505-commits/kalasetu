/**
 * Her product's card: the code, the QR, and who made it.
 *
 * Reached from her own shop, and it is the one screen in the app that is
 * about the OBJECT rather than about the listing. Everything on it is either
 * already hers or public — nothing here is a new thing for her to fill in,
 * and registering is one tap.
 *
 * The conflict panel is the interesting part. When the photograph looks like
 * something already registered we say so, show the other card, and give her
 * two honest ways forward — "I made this one too" and "I am selling someone
 * else's work". Neither of them is an accusation and neither of them stops
 * her. See services/identity.ts on why a reseller is not a criminal here.
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Screen from '../components/Screen'
import BigButton from '../components/BigButton'
import Icon from '../components/Icon'
import Speakable from '../components/Speakable'
import QrCode from '../components/QrCode'
import { getProduct } from '../services/db'
import { artisanId } from '../services/artisan'
import { getVerification } from '../services/verify'
import {
  cardUrl, makerLabel, registerProduct, registrationFor, transferTo,
  type Registration,
} from '../services/identity'
import { speak } from '../lib/speak'
import { t, tf, getLang } from '../lib/i18n'
import { asrCode, type Product } from '../types'

export default function ProductIdentity() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const [p, setP] = useState<Product>()
  const [me, setMe] = useState('')
  const [reg, setReg] = useState<Registration>()
  const [conflicts, setConflicts] = useState<Registration[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void (async () => {
      setP(await getProduct(id))
      setMe(await artisanId())
      setReg(await registrationFor(id))
    })()
  }, [id])

  async function register() {
    if (!p) return
    setBusy(true)
    try {
      const photo = p.cleanPhoto ?? p.photo
      if (!photo) return
      // Evidence is the proof-of-making photograph on her artisan record —
      // not required, and recorded as a yes or no rather than published.
      const vouch = await getVerification(me).catch(() => undefined)
      const out = await registerProduct({
        productId: id, photo, makerId: me,
        title: p.listing?.titleEn, craft: p.listing?.craft, material: p.listing?.material,
        thumb: p.photo ?? p.cleanPhoto,
        evidence: Boolean(vouch?.craftPhoto),
      })
      setReg(out.registration)
      setConflicts(out.conflicts)
      speak(out.conflicts.length ? t('idConflictSaid') : tf('idDoneSaid', { code: out.registration.id }),
        asrCode(getLang()))
    } finally { setBusy(false) }
  }

  /** "I am selling someone else's work" — the honest way out of a conflict. */
  async function claimOwnership(other: Registration) {
    setBusy(true)
    try {
      const moved = await transferTo(other.id, me)
      if (moved) { setConflicts([]); setReg(moved); speak(t('idOwnerSaid'), asrCode(getLang())) }
    } finally { setBusy(false) }
  }

  const mine = reg?.makerId === me
  const url = reg ? cardUrl(reg.id) : ''

  return (
    <Screen
      title={t('idTitle')} onBack={() => { nav(`/`); return false }}
      say={reg ? undefined : t('idWhy')}
      action={reg
        ? <BigButton icon={<Icon name="gotIt" />} label={t('goHome')} variant="quiet" onClick={() => nav('/')} />
        : <BigButton icon={<Icon name="market" />} label={busy ? t('idRegistering') : t('idRegister')}
            onClick={register} disabled={busy || !p?.cleanPhoto} />}
    >
      {!reg ? (
        <div className="flex flex-col gap-4">
          {(p?.photo ?? p?.cleanPhoto) && (
            <img src={p!.photo ?? p!.cleanPhoto} alt="" decoding="async"
              className="arch aspect-square w-full max-w-[16rem] self-center rounded-b-panel border border-line-2/70 object-cover" />
          )}
          <Speakable text={t('idWhat')} className="text-base leading-relaxed text-ink-2" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* The card itself. Laid out like a card because it is one: this is
              what gets printed and tied to the pot. */}
          <section className="rounded-panel border-2 border-gold bg-surface p-4 shadow-card">
            <div className="flex gap-4">
              {reg.thumb && (
                <img src={reg.thumb} alt="" decoding="async"
                  className="h-24 w-24 shrink-0 rounded-card border border-line-2/70 object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-display text-2xl font-bold leading-none tracking-tight text-gold">{reg.id}</p>
                <p className="mt-1 text-sm text-ink-2">{reg.title ?? t('untitled')}</p>
                <p className="mt-0.5 text-sm text-ink-3">{[reg.craft, reg.material].filter(Boolean).join(' · ')}</p>
              </div>
            </div>

            <dl className="mt-4 flex flex-col gap-1.5 text-sm">
              <Row label={t('idMaker')} value={`${makerLabel(reg.makerId)}${mine ? ` (${t('idYou')})` : ''}`} strong />
              {reg.ownerId !== reg.makerId && (
                <Row label={t('idOwner')} value={`${makerLabel(reg.ownerId)}${reg.ownerId === me ? ` (${t('idYou')})` : ''}`} />
              )}
              <Row label={t('idRegistered')} value={new Date(reg.registeredAt).toLocaleDateString('en-IN')} />
              <Row label={t('idEvidence')} value={reg.evidence ? t('idEvidenceYes') : t('idEvidenceNo')} />
            </dl>

            {/* The QR, big enough to scan off a screen and to print. */}
            <div className="mt-4 flex flex-col items-center gap-2">
              <QrCode text={url} className="h-40 w-40" />
              <p className="text-center text-xs leading-snug text-ink-3">{t('idQrHint')}</p>
            </div>
          </section>

          <Speakable text={tf('idDoneSaid', { code: reg.id })} className="text-sm leading-snug text-ink-2" />

          {!reg.checked && (
            <p className="rounded-card border border-line-2/70 bg-gold-wash px-4 py-3 text-sm text-ink-2">
              {t('idNotChecked')}
            </p>
          )}
        </div>
      )}

      {/* A flag, not a verdict. Both ways out are one tap and neither of them
          is "you are lying". */}
      {conflicts.length > 0 && (
        <section className="fade mt-4 rounded-panel border-2 border-gold bg-gold-wash p-4">
          <Speakable as="h2" text={t('idConflict')}
            className="font-display text-lg font-bold leading-tight text-gold" />
          <Speakable text={t('idConflictWhy')} className="mt-1 text-sm leading-snug text-ink-2" />

          {conflicts.slice(0, 3).map(c => (
            <div key={c.id} className="mt-3 flex items-center gap-3 rounded-card border border-line-2/70 bg-surface p-3">
              {c.thumb && <img src={c.thumb} alt="" className="h-14 w-14 shrink-0 rounded-card object-cover" />}
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold">{c.id}</p>
                <p className="text-ink-3">{makerLabel(c.makerId)} · {new Date(c.registeredAt).toLocaleDateString('en-IN')}</p>
              </div>
              <button
                onClick={() => claimOwnership(c)} disabled={busy}
                className="press min-h-0 shrink-0 rounded-card border-2 border-indigo px-3 py-2 text-xs font-semibold text-indigo"
              >
                {t('idIAmSelling')}
              </button>
            </div>
          ))}

          <button onClick={() => setConflicts([])} disabled={busy}
            className="press mt-3 min-h-0 w-full rounded-card border-2 border-good bg-surface px-3 py-3 text-sm font-semibold text-good">
            {t('idIMadeIt')}
          </button>
        </section>
      )}
    </Screen>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-3">{label}</dt>
      <dd className={'text-right ' + (strong ? 'font-semibold text-ink' : 'text-ink-2')}>{value}</dd>
    </div>
  )
}
