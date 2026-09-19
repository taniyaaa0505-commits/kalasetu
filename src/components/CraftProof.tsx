/**
 * "How do you know she made it?"
 *
 * The question a judge asked in the first round, and the one a buyer asks
 * every time. Three things answer it, and only together:
 *
 *   1. Her phone number — the shop is hers and survives a new handset.
 *   2. The handmade check — the model looks at the product photograph and
 *      refuses to put a factory item on the buyer page (see types.ts).
 *   3. This: one photograph of her hands at work, taken with the app's own
 *      camera, once, ever.
 *
 * The third is the one a reseller cannot fake cheaply. A warehouse can
 * photograph a factory pot on a white sheet; it cannot photograph the pot
 * being made, on the spot, on demand.
 *
 * THE RULES THIS FOLLOWS, all of them from the same principle — that nothing
 * may stand between her and selling her work:
 *
 *  - Once per artisan, not once per product. She is the thing being
 *    evidenced.
 *  - Asked only AFTER her product photograph is safely stored, so a woman who
 *    ignores it entirely still ends the screen with a listing.
 *  - Skippable, in one tap, with no penalty she can see. A widow working
 *    alone cannot hold a phone and a loom at the same time, and an app that
 *    locks her out of her own shop over a photograph has chosen the wrong
 *    side. She is simply asked again on her next listing.
 *  - `capture="environment"` opens the camera rather than the gallery.
 *    Honest limit: it is a hint, not a lock, and a determined person can
 *    still supply a saved file. It raises the cost of faking, it does not
 *    make it impossible, and we say so rather than claiming a guarantee.
 */
import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import Speakable from './Speakable'
import { artisanId } from '../services/artisan'
import { getVerification, saveCraftProof, verifyAvailable } from '../services/verify'
import { checkCraftPhoto } from '../services/gemini'
import { shrink } from '../services/bgRemove'
import { speak } from '../lib/speak'
import { t, getLang } from '../lib/i18n'
import { asrCode } from '../types'

/** She said "later" on this device. Asked again next listing, not this one. */
const LATER = 'kalasetu.craftProof.later'

export default function CraftProof() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  // Ask only if there is nowhere to put it, nobody to attach it to, or she
  // has already given one. Every one of those is a reason to stay out of the
  // way rather than a reason to prompt.
  useEffect(() => {
    let gone = false
    if (!verifyAvailable()) return
    try { if (sessionStorage.getItem(LATER) === '1') return } catch { /* no storage, ask */ }
    void artisanId().then(getVerification).then(v => {
      if (!gone && !v?.craftPhoto) setShow(true)
    }).catch(() => { /* offline: not the moment to ask */ })
    return () => { gone = true }
  }, [])

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const full = await new Promise<string>((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(r.result as string)
        r.onerror = reject
        r.readAsDataURL(file)
      })
      // Small: it rides in one Firestore document and is shown at about 200px.
      const small = await shrink(full, 480, 0.75)
      const me = await artisanId()
      // The verdict is a bonus, never a gate. No key, no quota, no signal —
      // the photograph is still hers and still stored.
      const verdict = await checkCraftPhoto(small).catch(() => undefined)
      await saveCraftProof(me, small, verdict)
      setDone(true)
      speak(t('proofDone'), asrCode(getLang()))
    } catch (err) {
      // Nothing is said out loud about a failure here. She came to this screen
      // to list a pot, she has listed it, and this was extra.
      console.warn('[proof] could not save the craft photograph', err)
      setShow(false)
    } finally { setBusy(false) }
  }

  function later() {
    try { sessionStorage.setItem(LATER, '1') } catch { /* fine */ }
    setShow(false)
  }

  if (!show) return null

  if (done) return (
    <div className="fade mt-4 flex items-start gap-3 rounded-card border-2 border-good bg-sage-wash px-4 py-3">
      <span aria-hidden className="mt-0.5 text-lg">✅</span>
      <Speakable text={t('proofDone')} className="text-sm leading-snug text-ink-2" />
    </div>
  )

  return (
    <section className="fade mt-4 rounded-panel border-2 border-gold bg-gold-wash p-4">
      <Speakable text={t('proofTitle')} as="h2"
        className="font-display text-lg font-bold leading-tight text-gold" />
      <Speakable text={t('proofWhy')} className="mt-1 text-sm leading-snug text-ink-2" />

      <input
        ref={fileRef} type="file" accept="image/*" capture="environment"
        onChange={onPick} className="hidden"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => fileRef.current?.click()} disabled={busy}
          className="press flex min-h-0 items-center gap-2 rounded-card bg-gold px-4 py-3 font-semibold text-white shadow-card disabled:opacity-50"
        >
          <Icon name="camera" />{busy ? t('proofSaving') : t('proofTake')}
        </button>
        {/* Quiet, and always there. A prompt she cannot dismiss is a wall. */}
        <button onClick={later} disabled={busy}
          className="press min-h-0 rounded-card px-3 py-3 text-sm text-ink-3 active:bg-surface/60">
          {t('proofLater')}
        </button>
      </div>
    </section>
  )
}
