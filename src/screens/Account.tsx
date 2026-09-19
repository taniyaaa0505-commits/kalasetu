/**
 * Keeping her shop, and proving it is hers.
 *
 * Two jobs on one screen, in the order she meets them. There is no identity
 * worth verifying until there is an identity that survives a new handset, so
 * the badge section does not appear until she is signed in — and neither half
 * is on the golden path. Nobody photographs a pot by coming here.
 *
 * The paragraph that explains the screen is read aloud
 * on arrival, because it is the only thing here that explains anything and she
 * cannot read it.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Screen from '../components/Screen'
import BigButton from '../components/BigButton'
import Icon from '../components/Icon'
import Speakable from '../components/Speakable'
import {
  accountAvailable, currentAccount, sendCode, confirmCode,
  signInWithGoogle, signOutAccount, toE164, type Pending, type Outcome,
} from '../services/account'
import { artisanId } from '../services/artisan'
import { listMyProducts } from '../services/db'
import { useSay } from '../lib/arrival'
import { getVerification, redeemVoucher, verifyAvailable } from '../services/verify'
import { speak } from '../lib/speak'
import { t, tf, getLang } from '../lib/i18n'
import { asrCode } from '../types'

/** The coordinator-code card. See the note where it renders. */
const SHOW_VOUCH = false

export default function Account() {
  const nav = useNavigate()
  const online = accountAvailable()
  /*
   * State, not a bare read.
   *
   * The 'restored' branch reloads the page and would have refreshed this for
   * free — which is exactly why the bug hid. On 'kept' nothing reloads, because
   * her uid never changed and every subscription is already right, so a plain
   * `currentAccount()` left her looking at the phone box she had just finished
   * with while the app said out loud that her shop was safe.
   */
  const [account, setAccount] = useState(currentAccount)

  useEffect(() => { speak(t('keepWhy'), asrCode(getLang())) }, [])

  /*
   * `return false` is the whole fix for a screen she could not leave.
   *
   * Screen's back button runs onBack and then, unless it is told the
   * navigation was handled, does nav(-1) as well. This one navigated home
   * itself and did not say so, so every tap went home and immediately one
   * step further back — which, from a freshly installed app, is this screen
   * again. She signed in, saw that her shop was safe, and could not get out.
   * Reported from a phone, with a screenshot.
   */
  return (
    <Screen title={t('keepTitle')} onBack={() => { nav('/'); return false }}>
      <div className="flex min-h-full flex-col gap-6">
        <Speakable text={t('keepWhy')} className="text-base leading-relaxed text-ink-2" />

        {!online && (
          <p className="rounded-card border border-line-2/70 bg-gold-wash px-4 py-3 text-sm text-ink-2">
            {t('keepNeedNet')}
          </p>
        )}

        {account
          ? <SignedIn label={account.label} />
          : <SignIn disabled={!online} onDone={() => setAccount(currentAccount())} />}
      </div>
    </Screen>
  )
}

/* ---------------- signing in ---------------- */

function SignIn({ disabled, onDone }: { disabled: boolean; onDone: () => void }) {
  const [phone, setPhone] = useState('')
  const [pending, setPending] = useState<Pending>()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [trouble, setTrouble] = useState<string>()

  /**
   * Let the phone fill the code in by itself.
   *
   * Chrome on Android hands it over without her reading the SMS at all, which
   * for someone who does not read is the difference between a step and a wall.
   * It only fires when the message is formatted with the domain and `#code`,
   * so treat it as a gift and never as the mechanism — the box below works
   * whether or not this ever resolves.
   *
   * On the APK the question rarely gets this far: Play Integrity verifies the
   * number without an SMS at all on most handsets.
   */
  useEffect(() => {
    if (!pending) return
    const otp = (navigator.credentials as { get?: unknown } | undefined)
    if (!otp?.get || !('OTPCredential' in window)) return
    const stop = new AbortController()
    navigator.credentials
      .get({ otp: { transport: ['sms'] }, signal: stop.signal } as CredentialRequestOptions)
      .then(c => { const v = (c as { code?: string } | null)?.code; if (v) setCode(v) })
      .catch(() => { /* she dismissed it, or the format did not match */ })
    return () => { stop.abort() }
  }, [pending])

  async function send() {
    setBusy(true); setTrouble(undefined)
    try {
      setPending(await sendCode(phone))
    } catch (err) {
      const why = (err as { code?: string; message?: string })
      const bad = why.message === 'bad-number' || why.code === 'auth/invalid-phone-number'
      setTrouble(bad ? t('keepBadNumber') : (why.code ?? why.message ?? String(err)))
      speak(bad ? t('keepBadNumber') : t('keepNeedNet'), asrCode(getLang()))
    } finally { setBusy(false) }
  }

  async function confirm() {
    if (!pending) return
    setBusy(true); setTrouble(undefined)
    try {
      say(await confirmCode(pending, code))
    } catch (err) {
      const why = (err as { code?: string })
      const bad = why.code === 'auth/invalid-verification-code'
      setTrouble(bad ? t('keepBadCode') : (why.code ?? String(err)))
      speak(t('keepBadCode'), asrCode(getLang()))
    } finally { setBusy(false) }
  }

  async function google() {
    setBusy(true); setTrouble(undefined)
    try {
      say(await signInWithGoogle())
    } catch (err) {
      setTrouble((err as { code?: string }).code ?? String(err))
    } finally { setBusy(false) }
  }

  /**
   * 'restored' never gets here — services/account.ts reloads the page on that
   * branch so every live subscription reopens under the recovered identity.
   * The sentence is spoken anyway, for the case where the reload is slow
   * enough that she is still looking at this screen.
   */
  function say(outcome: Outcome) {
    speak(outcome === 'restored' ? t('keepRestored') : t('keepKept'), asrCode(getLang()))
    onDone()
  }

  return (
    <section className="rounded-panel border border-line-2/70 bg-surface p-5 shadow-card">
      {!pending ? (
        <>
          <Speakable text={t('keepPhone')} className="text-sm text-ink-2" />
          <div className="mt-3 flex items-center gap-2">
            {/* Shown, not typed. She recites ten digits; the country code is
                our problem, and a field that rejects her own number with a red
                message she cannot read is a dead end. */}
            <span className="font-display text-xl font-bold tabular-nums text-ink-3">+91</span>
            <input
              value={phone}
              onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setTrouble(undefined) }}
              inputMode="numeric" autoComplete="tel" aria-label={t('keepPhone')}
              className="w-full rounded-card border-2 border-line-2/70 bg-paper px-4 py-4 text-center
                         font-display text-[1.75rem] font-bold tracking-[0.12em] tabular-nums outline-none
                         focus-visible:border-indigo"
            />
          </div>
          <p className="mt-2 text-xs text-ink-3">{t('keepPhoneHint')}</p>
          <div className="mt-4">
            <BigButton
              icon={<Icon name="chat" />} label={t('keepSend')} onClick={send}
              disabled={busy || disabled || !toE164(phone)}
            />
          </div>
        </>
      ) : (
        <>
          <Speakable text={t('keepCode')} className="text-sm text-ink-2" />
          <input
            value={code}
            onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setTrouble(undefined) }}
            inputMode="numeric" autoComplete="one-time-code" aria-label={t('keepCode')}
            className="mt-3 w-full rounded-card border-2 border-line-2/70 bg-paper px-4 py-4 text-center
                       font-display text-[2rem] font-bold tracking-[0.18em] tabular-nums outline-none
                       focus-visible:border-indigo"
          />
          <div className="mt-4">
            <BigButton
              icon={<Icon name="next" />} label={t('keepConfirm')} onClick={confirm}
              disabled={busy || code.length < 6}
            />
          </div>
        </>
      )}

      {/* The door that costs nothing per use.
          On a handset that was set up with a Google account this is one tap
          and no keyboard at all — which for this user beats any number of
          digits, however few — and it is the way in if the SMS quota is what
          fails on the day. */}
      <div className="mt-4 border-t border-line-2/50 pt-4">
        <BigButton
          icon={<Icon name="next" />} label={t('keepGoogle')} variant="quiet"
          onClick={google} disabled={busy || disabled}
        />
      </div>

      {trouble && <p className="mt-3 text-sm text-danger">{trouble}</p>}
    </section>
  )
}

/* ---------------- signed in, and the badge ---------------- */

function SignedIn({ label }: { label: string }) {
  const nav = useNavigate()

  /*
   * How much came back.
   *
   * Without this the screen says "your shop is safe on …3210" and stops, and
   * that sentence reads exactly the same whether her forty listings just came
   * back or the number belongs to an account with nothing in it. That is not
   * a hypothetical: it is what happened on the first real test — the number
   * had been linked the night before, from a session that never published
   * anything, so recovery worked perfectly and looked broken.
   *
   * So: count them, say the number out loud, and when it is zero say THAT
   * plainly rather than leaving her to guess.
   */
  const [count, setCount] = useState<number>()
  useEffect(() => {
    let gone = false
    void artisanId()
      .then(listMyProducts)
      .then(ps => { if (!gone) setCount(ps.length) })
      .catch(() => { /* offline: the count is the least of it */ })
    return () => { gone = true }
  }, [])

  useSay(count === undefined ? undefined
    : count > 0 ? tf('shopHasItems', { n: count }) : t('shopHasNothing'))

  return (
    <>
      <p className="rounded-card border-2 border-good bg-sage-wash px-4 py-3 text-sm font-semibold text-good">
        {tf('keepSignedIn', { label })}
      </p>

      {count !== undefined && (
        <Speakable
          text={count > 0 ? tf('shopHasItems', { n: count }) : t('shopHasNothing')}
          className="text-base leading-relaxed text-ink-2"
        />
      )}

      {/* The way out. This screen had a sign-out button on it, which was the
          only thing to press, and removing that left her looking at a green
          line with nowhere to go. */}
      <BigButton icon={<Icon name="back" />} label={t('seeMyShop')} onClick={() => nav('/')} />

      {/* Off. Typing a coordinator's code was one more thing to ask of a
          woman who came here to sell a pot. Verification belongs on the
          coordinator's side, not hers — services/verify.ts and the rules
          stay, so turning this back on is this one flag. */}
      {SHOW_VOUCH && <Vouch />}

    </>
  )
}

function Vouch() {
  const [cluster, setCluster] = useState<string>()
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let gone = false
    void artisanId()
      .then(getVerification)
      .then(v => { if (!gone) setCluster(v?.verifiedBy) })
    return () => { gone = true }
  }, [])

  async function redeem() {
    setBusy(true); setFailed(false)
    try {
      const me = await artisanId()
      const got = await redeemVoucher(me, typed)
      if (got) {
        setCluster(got)
        speak(tf('vouchDone', { cluster: got }), asrCode(getLang()))
      } else {
        setFailed(true)
        speak(t('vouchBad'), asrCode(getLang()))
      }
    } catch {
      setFailed(true)
    } finally { setBusy(false) }
  }

  if (cluster) {
    return (
      <section className="rounded-panel border-2 border-gold bg-gold-wash p-5 shadow-card">
        <p className="flex items-center gap-2 font-display text-lg font-bold text-gold">
          <Icon name="gotIt" /> {t('verifiedBadge')}
        </p>
        <p className="mt-1 text-sm text-ink-2">{tf('vouchDone', { cluster })}</p>
      </section>
    )
  }

  return (
    <section className="rounded-panel border border-line-2/70 bg-surface p-5 shadow-card">
      <Speakable text={t('vouchTitle')} className="font-display text-base font-bold" />
      <Speakable text={t('vouchWhy')} className="mt-2 text-sm leading-relaxed text-ink-2" />
      <input
        value={typed}
        onChange={e => { setTyped(e.target.value.toUpperCase().slice(0, 12)); setFailed(false) }}
        autoComplete="off" aria-label={t('vouchEnter')}
        placeholder={t('vouchEnter')}
        className="mt-3 w-full rounded-card border-2 border-line-2/70 bg-paper px-4 py-4 text-center
                   font-display text-xl font-bold tracking-[0.12em] outline-none placeholder:text-sm
                   placeholder:font-normal placeholder:tracking-normal placeholder:text-ink-3
                   focus-visible:border-indigo"
      />
      {failed && (
        <p className="mt-3 rounded-card border border-danger/30 bg-gold-wash px-3 py-2 text-sm text-danger">
          {t('vouchBad')}
        </p>
      )}
      <div className="mt-4">
        <BigButton
          icon={<Icon name="next" />} label={t('vouchGo')} variant="quiet"
          onClick={redeem} disabled={busy || typed.trim().length < 4}
        />
      </div>
    </section>
  )
}
