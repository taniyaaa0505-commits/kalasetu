import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Screen from '../components/Screen'
import BigButton from '../components/BigButton'
import Speakable from '../components/Speakable'
import { getProduct, patchProduct } from '../services/db'
import { generateListing, geminiConfigured } from '../services/gemini'
import { t, useLang, prefersEnglish } from '../lib/i18n'
import type { Listing } from '../types'

export default function Review() {
  const { id = '' } = useParams()
  const nav = useNavigate()

  const lang = useLang()
  const mine = prefersEnglish(lang)      // show her half first, the other half is 'for the buyer'
  const [listing, setListing] = useState<Listing>()
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    (async () => {
      const p = await getProduct(id)
      if (!p) return
      if (p.listing) { setListing(p.listing); setBusy(false); return }
      try {
        const l = await generateListing(p.cleanPhoto ?? p.photo ?? '', p.transcript ?? '', p.lang ?? lang)
        setListing(l)
        await patchProduct(id, { listing: l })
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally { setBusy(false) }
    })()
  }, [id])

  if (busy) return (
    <Screen title={t('preparing')} step={4}>
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <span className="animate-spin text-5xl" aria-hidden>⚙️</span>
        <p className="text-ink-2">{t('writingListing')}</p>
      </div>
    </Screen>
  )

  return (
    <Screen
      title={t('screenListing')} step={4} onBack={() => {}}
      action={<BigButton icon="👉" label={t('next')} onClick={() => nav(`/p/${id}/price`)} disabled={!listing} />}
    >
      {!geminiConfigured() && (
        <p className="mb-4 rounded-lg bg-gold-wash p-3 text-sm text-gold">
          Demo text — add <code>VITE_GEMINI_API_KEY</code> to <code>.env</code> for the real thing.
        </p>
      )}
      {error && <p className="mb-4 rounded-lg bg-gold-wash p-3 text-sm text-danger">{error}</p>}

      {listing && (
        <div className="flex flex-col gap-5">
          <Field label={t('whatIsIt')}>
            <Speakable text={mine ? listing.titleEn : listing.titleHi} className="text-lg font-semibold" />
          </Field>

          <Field label={t('descriptionLabel')}>
            <Speakable text={mine ? listing.descriptionEn : listing.descriptionHi} className="leading-relaxed" />
          </Field>

          {/* The other language, for whoever is buying. */}
          <Field label={`${mine ? 'हिंदी' : 'English'} — ${t('forTheBuyer')}`}>
            <p className="font-semibold">{mine ? listing.titleHi : listing.titleEn}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">
              {mine ? listing.descriptionHi : listing.descriptionEn}
            </p>
          </Field>

          {/* The anti-hallucination rule made visible: anything the AI was not
              sure about becomes a question, never a guess. */}
          {listing.questions.length > 0 && (
            <div className="rounded-xl border-2 border-gold bg-gold-wash p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold">
                {t('tellUsMore')}
              </p>
              {listing.questions.map(q => <Speakable key={q} text={q} className="py-1" />)}
            </div>
          )}
        </div>
      )}
    </Screen>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-ink-3">{label}</h2>
      <div className="rounded-xl border border-line bg-surface p-4">{children}</div>
    </section>
  )
}
