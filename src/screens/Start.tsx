/**
 * The first screen, ever. Nothing but "which language do you speak?".
 *
 * It has no header, no back button and no way past it except answering,
 * because everything else in the app is words and none of those words mean
 * anything yet. The app previously opened on a Hindi welcome and offered the
 * language picker four screens in — which is to say it opened in a language a
 * Tamil artisan could not read, and told her so in Hindi.
 *
 * Nothing here needs reading either: each language is written in its own
 * script, and tapping one speaks a sentence in that language, so she confirms
 * her choice by ear. The prompt is spoken in every language in turn on
 * arrival for the same reason — one of them will be hers.
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LanguagePicker from '../components/LanguagePicker'
import BigButton from '../components/BigButton'
import Icon from '../components/Icon'
import { Scallop, Gota } from '../components/Ornament'
import { advanceGuide } from '../lib/guide'
import { speak, useHasSpoken } from '../lib/speak'
import { t, useLang } from '../lib/i18n'
import { asrCode } from '../types'

export default function Start() {
  const lang = useLang()
  const nav = useNavigate()

  /*
   * Whether this phone has actually made a sound yet.
   *
   * The app tries to greet her the moment this screen opens, and on a phone
   * that attempt is silently thrown away: Chrome will not let a page speak
   * until it has had a real touch, and no script can ask it to. Verified on
   * the deployed build — `speak()` is called at 793ms with the right words and
   * `onstart` never fires. She is left looking at six words in six scripts,
   * in silence, with no idea what is being asked of her.
   *
   * We cannot make it talk first. We can make it obvious what to touch, in a
   * way that needs no reading — so until a sound has come out, the question
   * is a single enormous speaker button. Her first touch anywhere unlocks the
   * voice (see lib/speak.ts), and this is the thing her thumb lands on.
   */
  const heard = useHasSpoken()
  const greet = () => speak(`${t('tourWelcome')}. ${t('chooseLanguage')}`, asrCode(lang))

  // Still worth trying: on a laptop it just works, and inside the APK Android's
  // own TTS has no gesture requirement at all.
  useEffect(greet, [])   // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto flex h-full max-w-[480px] flex-col bg-paper">
      <header className="jaali relative bg-night px-5 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))] text-surface">
        <div className="flex items-center gap-3">
          <img src="./icons/mark-96.png" alt="" aria-hidden width={44} height={44}
            className="shrink-0 rounded-xl ring-1 ring-gold-leaf/50" />
          <div>
            <p className="font-display text-2xl font-bold leading-tight">{t('appName')}</p>
            <p className="text-sm text-surface/70">{t('tagline')}</p>
          </div>
        </div>
        <Scallop className="absolute inset-x-0 -bottom-2 text-night" />
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <Gota className="mb-4" />

        {heard ? (
          /* It has spoken. A quiet replay control is enough. */
          <button onClick={greet}
            className="press mb-4 flex w-full min-h-0 items-center gap-2 py-1 text-left">
            <Icon name="speak" className="text-indigo" />
            <span className="font-display text-xl font-bold leading-tight">{t('chooseLanguage')}</span>
          </button>
        ) : (
          /* It has not. This is the whole screen's job now. */
          <button onClick={greet}
            className="beacon press mb-5 flex w-full flex-col items-center gap-3 rounded-panel
                       bg-indigo px-5 py-7 text-white shadow-card">
            <Icon name="speak" className="text-6xl" />
            <span className="font-display text-xl font-bold leading-tight">{t('chooseLanguage')}</span>
          </button>
        )}

        <LanguagePicker />
      </main>

      <footer className="relative bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <Scallop className="absolute inset-x-0 -top-2 -scale-y-100 text-surface" />
        <BigButton
          icon={<Icon name="next" />} label={t('tourNext')}
          onClick={() => { advanceGuide('language'); nav('/', { replace: true }) }}
        />
      </footer>
    </div>
  )
}
