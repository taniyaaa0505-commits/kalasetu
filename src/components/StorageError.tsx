/**
 * A storage failure used to look like an empty app: no products, no orders,
 * no error, nothing. Now it says what went wrong and what to do about it.
 *
 * Listens for the event db.ts dispatches rather than wrapping every call,
 * so a failure anywhere in the app surfaces here.
 */
import { useEffect, useState } from 'react'
import { resetConnection, type DbFault } from '../services/db'
import { useLang, prefersEnglish } from '../lib/i18n'

const TEXT: Record<DbFault, { hi: string; en: string }> = {
  blocked: {
    hi: 'ऐप दूसरी जगह भी खुला है। बाकी सब बंद करके यह पन्ना फिर से खोलिए।',
    en: 'The app is open in another tab or window. Close the others, then reload this one.',
  },
  superseded: {
    hi: 'ऐप का नया रूप खुल गया है। यह पन्ना फिर से खोलिए।',
    en: 'A newer version of the app opened elsewhere. Reload this page.',
  },
  timeout: {
    hi: 'सामान खुल नहीं पाया। फिर से कोशिश कीजिए।',
    en: 'Storage did not respond. Try again.',
  },
  failed: {
    hi: 'सामान सुरक्षित नहीं हो पाया। फिर से कोशिश कीजिए।',
    en: 'Could not open storage. Try again.',
  },
}

export default function StorageError() {
  const lang = useLang()
  const [fault, setFault] = useState<DbFault | null>(null)

  useEffect(() => {
    const onErr = (e: Event) => setFault((e as CustomEvent<DbFault>).detail)
    window.addEventListener('kalasetu:db-error', onErr)
    return () => window.removeEventListener('kalasetu:db-error', onErr)
  }, [])

  if (!fault) return null
  const msg = TEXT[fault]

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-50 mx-auto max-w-[480px] border-b-2 border-gold bg-gold-wash px-4 pb-3
                 pt-[max(0.75rem,env(safe-area-inset-top))]"
    >
      <p className="mb-2 text-base leading-snug text-ink">
        ⚠ {prefersEnglish(lang) ? msg.en : msg.hi}
      </p>
      <button
        onClick={() => { resetConnection(); location.reload() }}
        className="min-h-0 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-white"
      >
        {prefersEnglish(lang) ? 'Reload' : 'फिर से खोलें'}
      </button>
    </div>
  )
}
