/**
 * One shop on two phones.
 *
 * The screen for services/pairing.ts, and it is deliberately not on the golden
 * path: nobody photographs a pot by coming here. It exists because an identity
 * issued per install means the PWA and the APK on one handset are two
 * different artisans, and because a reinstall used to orphan everything she
 * had listed.
 *
 * Both halves are on one screen on purpose. Which phone is "the first one" is
 * not a question she should have to answer — she is holding two phones and one
 * of them already has her work in it. Show a number on that one, type it into
 * the other, done.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Screen from '../components/Screen'
import BigButton from '../components/BigButton'
import Icon from '../components/Icon'
import Speakable from '../components/Speakable'
import { createPairingCode, redeemPairingCode, pairingAvailable } from '../services/pairing'
import { isPaired } from '../services/artisan'
import { speak } from '../lib/speak'
import { t, getLang } from '../lib/i18n'
import { asrCode } from '../types'

export default function Pair() {
  const nav = useNavigate()
  const [code, setCode] = useState<string>()
  const [making, setMaking] = useState(false)
  const [typed, setTyped] = useState('')
  const [joining, setJoining] = useState(false)
  const [failed, setFailed] = useState(false)
  const [trouble, setTrouble] = useState<string>()
  const online = pairingAvailable()

  // Read aloud on arrival. She cannot read the paragraph that explains what
  // this screen is for, and it is the only thing on it that explains anything.
  useEffect(() => { speak(t('pairWhy'), asrCode(getLang())) }, [])

  async function show() {
    setMaking(true); setTrouble(undefined)
    try {
      const made = await createPairingCode()
      setCode(made)
      // Digits, spaced, so the voice says "four, two, one" rather than
      // "four hundred and twenty-one thousand".
      speak(made.split('').join(' '), asrCode(getLang()))
    } catch (err) {
      setTrouble(err instanceof Error ? err.message : String(err))
    } finally { setMaking(false) }
  }

  async function join() {
    setJoining(true); setFailed(false); setTrouble(undefined)
    try {
      // On success this never returns — adoptArtisanId reloads the app so
      // every live subscription reopens under the new identity.
      const ok = await redeemPairingCode(typed)
      if (!ok) { setFailed(true); speak(t('pairBad'), asrCode(getLang())) }
    } catch (err) {
      setTrouble(err instanceof Error ? err.message : String(err))
    } finally { setJoining(false) }
  }

  return (
    <Screen title={t('pairTitle')} onBack={() => { nav('/') }}>
      <div className="flex min-h-full flex-col gap-6">
        <Speakable text={t('pairWhy')} className="text-base leading-relaxed text-ink-2" />

        {isPaired() && (
          <p className="rounded-card border-2 border-good bg-sage-wash px-4 py-3 text-sm font-semibold text-good">
            {t('pairAlready')}
          </p>
        )}

        {!online && (
          <p className="rounded-card border border-line-2/70 bg-gold-wash px-4 py-3 text-sm text-ink-2">
            {t('pairNeedNet')}
          </p>
        )}

        {/* This phone's number. */}
        <section className="rounded-panel border border-line-2/70 bg-surface p-5 shadow-card">
          {code ? (
            <>
              <Speakable text={t('pairCodeIs')} className="text-sm text-ink-2" />
              {/* Big, spaced, tabular. It is going to be read out across a
                  room or copied by someone squinting at a cracked screen. */}
              <p className="mt-3 text-center font-display text-[2.75rem] font-bold leading-none tracking-[0.18em] tabular-nums text-indigo">
                {code}
              </p>
              <p className="mt-3 text-center text-xs text-ink-3">{t('pairExpires')}</p>
            </>
          ) : (
            <BigButton
              icon={<Icon name="phones" />} label={t('pairShow')}
              onClick={show} disabled={making || !online} variant="quiet"
            />
          )}
        </section>

        {/* The other phone's number. */}
        <section className="rounded-panel border border-line-2/70 bg-surface p-5 shadow-card">
          <Speakable text={t('pairEnter')} className="text-sm text-ink-2" />
          <input
            value={typed}
            onChange={e => { setTyped(e.target.value.replace(/\D/g, '').slice(0, 6)); setFailed(false) }}
            inputMode="numeric" autoComplete="off"
            aria-label={t('pairEnter')}
            className="mt-3 w-full rounded-card border-2 border-line-2/70 bg-paper px-4 py-4 text-center
                       font-display text-[2rem] font-bold tracking-[0.18em] tabular-nums outline-none
                       focus-visible:border-indigo"
          />
          {failed && (
            <p className="mt-3 rounded-card border border-danger/30 bg-gold-wash px-3 py-2 text-sm text-danger">
              {t('pairBad')}
            </p>
          )}
          <div className="mt-4">
            <BigButton
              icon={<Icon name="next" />} label={t('pairJoin')}
              onClick={join} disabled={typed.length !== 6 || joining || !online}
            />
          </div>
        </section>

        {trouble && <p className="text-sm text-danger">{trouble}</p>}
      </div>
    </Screen>
  )
}
