/**
 * The "are you sure" for removing a product.
 *
 * The safety here is the SPOKEN confirmation, not a hidden button. Hiding a
 * destructive action from someone who cannot read does not protect her — it
 * just means she can trigger it without ever understanding what she did. So
 * the button is plainly visible, and this sheet says out loud what is about
 * to happen, shows the photo so she can see which item it is, and puts the
 * safe answer first.
 */
import { useEffect, useState } from 'react'
import BigButton from './BigButton'
import Icon from './Icon'
import { canRemove, removeProduct } from '../services/products'
import { speak, stopSpeaking } from '../lib/speak'
import { t, useLang } from '../lib/i18n'
import { asrCode, type Product } from '../types'

export default function ConfirmRemove({ product, onClose, onRemoved }: {
  product: Product
  onClose: () => void
  onRemoved: () => void
}) {
  const lang = useLang()
  const voice = asrCode(lang)
  const [blocked, setBlocked] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  const name = product.listing?.titleHi ?? product.listing?.titleEn ?? t('untitled')

  useEffect(() => {
    let alive = true
    canRemove(product.id).then(({ ok }) => {
      if (!alive) return
      setBlocked(!ok)
      speak(ok ? `${t('removeAsk')} ${name}` : `${t('cannotRemove')}. ${t('cannotRemoveOrders')}`, voice)
    })
    return () => { alive = false; stopSpeaking() }
  }, [product.id, lang])

  async function confirm() {
    setBusy(true)
    const res = await removeProduct(product.id)
    stopSpeaking()
    if (res.ok) { speak(t('removed'), voice); onRemoved() }
    else { setBlocked(true); setBusy(false) }   // an order landed while she decided
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-3 pb-3"
         role="dialog" aria-modal="true">
      <div className="w-full max-w-[456px] rounded-panel border border-line-2/70 bg-surface p-5 shadow-lift">
        <div className="mb-4 flex items-center gap-3">
          {product.cleanPhoto && (
            <img src={product.cleanPhoto} alt="" className="h-16 w-16 rounded-card object-cover" />
          )}
          <p className="min-w-0 flex-1 truncate text-lg font-semibold">{name}</p>
        </div>

        {blocked === null && <p className="py-6 text-center text-ink-3">…</p>}

        {blocked === true && (
          <>
            <p className="mb-1 text-xl font-bold text-gold">⚠ {t('cannotRemove')}</p>
            <p className="mb-5 text-ink-2">{t('cannotRemoveOrders')}</p>
            <BigButton icon={<Icon name="gotIt" />} label={t('understood')} variant="quiet" onClick={onClose} />
          </>
        )}

        {blocked === false && (
          <>
            <p className="mb-5 text-xl font-bold">{t('removeAsk')}</p>
            {/* The safe answer sits first and reads as the default. */}
            <div className="flex flex-col gap-2">
              <BigButton icon={<Icon name="back" />} label={t('removeNo')} variant="quiet" onClick={onClose} />
              <BigButton icon="🗑" label={t('removeYes')} variant="danger" onClick={confirm} disabled={busy} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
