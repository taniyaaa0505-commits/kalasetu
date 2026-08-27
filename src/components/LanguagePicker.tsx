/**
 * Choosing a language, for someone who cannot read.
 *
 * Two rules make this work:
 *  - each language is written in its OWN script, never "Hindi" in English
 *  - tapping one SPEAKS a sample sentence in that language, so she confirms
 *    her choice by ear rather than by reading
 */
import { LANGS, type LangCode } from '../types'
import { setLang, useLang } from '../lib/i18n'
import { speak } from '../lib/speak'

export default function LanguagePicker({ compact = false }: { compact?: boolean }) {
  const lang = useLang()

  function choose(code: LangCode) {
    setLang(code)
    const l = LANGS.find(x => x.code === code)
    if (l) speak(l.sample, l.asr)      // speak in the ASR voice, which exists on the device
  }

  return (
    <div className={compact ? 'flex gap-2 overflow-x-auto pb-1' : 'grid grid-cols-2 gap-3'}>
      {LANGS.map(l => {
        const on = l.code === lang
        return (
          <button
            key={l.code}
            onClick={() => choose(l.code)}
            aria-pressed={on}
            className={
              'flex shrink-0 items-center justify-center rounded-xl border-2 font-semibold transition-colors ' +
              (compact ? 'min-h-[48px] px-4 text-base ' : 'min-h-[64px] px-4 text-lg ') +
              (on ? 'border-indigo bg-indigo text-white' : 'border-line bg-surface text-ink active:bg-wash')
            }
          >
            {l.label}
          </button>
        )
      })}
    </div>
  )
}
