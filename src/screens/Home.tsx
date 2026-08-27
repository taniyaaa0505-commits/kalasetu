import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Screen from '../components/Screen'
import BigButton from '../components/BigButton'
import { listProducts, saveProduct, newId } from '../services/db'
import { t, getLang, useLang, prefersEnglish } from '../lib/i18n'
import LanguagePicker from '../components/LanguagePicker'
import type { Product } from '../types'

export default function Home() {
  const nav = useNavigate()
  const lang = useLang()
  const mine = prefersEnglish(lang)
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => { listProducts().then(setProducts) }, [])

  async function startNew() {
    const p: Product = { id: newId(), createdAt: Date.now(), status: 'draft', lang: getLang() }
    await saveProduct(p)
    nav(`/p/${p.id}/capture`)
  }

  return (
    <Screen
      title={t('appName')}
      action={<BigButton icon="📷" label={t('addProduct')} onClick={startNew} />}
    >
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-ink-3">
        {t('myProducts')}
      </h2>

      {products.length === 0 ? (
        <p className="rounded-xl border-2 border-dashed border-line py-14 text-center text-ink-3">
          {t('noProducts')}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {products.map(p => (
            <li key={p.id}>
              <button
                onClick={() => nav(`/p/${p.id}/capture`)}
                className="flex w-full items-center gap-4 rounded-xl border border-line bg-surface p-3 text-left active:bg-wash"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-wash">
                  {p.cleanPhoto || p.photo
                    ? <img src={p.cleanPhoto ?? p.photo} alt="" className="h-full w-full object-cover" />
                    : <span className="flex h-full w-full items-center justify-center text-2xl">📦</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{(mine ? p.listing?.titleEn : p.listing?.titleHi) ?? t('untitled')}</p>
                  <p className="text-sm text-ink-3">
                    {p.status === 'published' ? `✅ ${t('onSale')}` : `✏️ ${t('incomplete')}`}
                    {p.price && ` · ₹${p.price.suggested}`}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-8 border-t border-line pt-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-3">
          {t('language')}
        </h2>
        <LanguagePicker compact />
      </section>

      <button onClick={() => nav('/buyer')} className="mt-6 w-full text-sm text-ink-3 underline">
        Buyer view (for the demo) →
      </button>
    </Screen>
  )
}
