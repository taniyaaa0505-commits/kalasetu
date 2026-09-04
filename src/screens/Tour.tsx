/**
 * The first-run tour — the app teaching itself, out loud.
 *
 * Three rules shaped this:
 *
 *  1. She cannot read, so every step SPEAKS itself the moment it appears.
 *  2. Watching is not learning. The steps that matter make her actually press
 *     the camera, the microphone and the green tick, so her hands learn the
 *     real flow before she has anything at stake.
 *  3. It must work on a stranger's phone in a hall with bad wifi — so nothing
 *     here touches the camera, the microphone, the network or her data. The
 *     photos are drawn, the transcript is scripted, the price is fixed.
 *
 * It reuses the REAL components, so what she learns here is what she meets
 * later rather than a lookalike.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BigButton from '../components/BigButton'
import Icon from '../components/Icon'
import Artisan from '../components/Artisan'
import Kolam from '../components/Kolam'
import PriceScale from '../components/PriceScale'
import PriceInNotes from '../components/PriceInNotes'
import Thread from '../components/Thread'
import LangButton from '../components/LangButton'
import LanguagePicker from '../components/LanguagePicker'
import { speak, stopSpeaking } from '../lib/speak'
import { t, useLang } from '../lib/i18n'
import { markTourSeen } from '../lib/tour'
import { asrCode } from '../types'

const DEMO_PRICE = { floor: 340, marketLow: 600, marketHigh: 900, suggested: 750, reason: '' }

/** Steps she must act on, rather than just watch. */
type Kind = 'watch' | 'tapHear' | 'tapCamera' | 'tapMic' | 'tapPublish'
type Id = 'welcome' | 'speaks' | 'photo' | 'cleaning' | 'speaking'
        | 'listing' | 'price' | 'publish' | 'orders' | 'done'

interface Step { id: Id; title: () => string; sub: () => string; kind: Kind }

/** Everything a step says out loud. The welcome slide adds the one sentence
 *  that is the whole pitch — she must HEAR it, not read it off the picture. */
function intro(step: Step): string {
  return [step.title(), step.sub(), step.id === 'welcome' ? t('sellWithVoice') : '']
    .filter(Boolean).join('. ')
}

const STEPS: Step[] = [
  { id: 'welcome',  title: () => t('tourWelcome'),     sub: () => t('tourWelcomeSub'),  kind: 'watch' },
  { id: 'speaks',   title: () => t('tourSpeaks'),      sub: () => t('tourSpeaksSub'),   kind: 'tapHear' },
  { id: 'photo',    title: () => t('tourPhoto'),       sub: () => t('tourPhotoSub'),    kind: 'tapCamera' },
  { id: 'cleaning', title: () => t('tourCleaning'),    sub: () => t('tourCleaningSub'), kind: 'watch' },
  { id: 'speaking', title: () => t('tourSpeakStep'),   sub: () => t('tourSpeakSub'),    kind: 'tapMic' },
  { id: 'listing',  title: () => t('tourListing'),     sub: () => t('tourListingSub'),  kind: 'watch' },
  { id: 'price',    title: () => t('tourPriceStep'),   sub: () => t('tourPriceSub'),    kind: 'watch' },
  { id: 'publish',  title: () => t('tourPublishStep'), sub: () => t('tourPublishSub'),  kind: 'tapPublish' },
  { id: 'orders',   title: () => t('tourOrders'),      sub: () => t('tourOrdersSub'),   kind: 'watch' },
  { id: 'done',     title: () => t('tourDone'),        sub: () => '',                   kind: 'watch' },
]

export default function Tour() {
  const nav = useNavigate()
  const lang = useLang()
  const voice = asrCode(lang)

  const [i, setI] = useState(0)
  const [acted, setActed] = useState(false)   // she has done this step's action
  const [typed, setTyped] = useState('')      // the transcript, revealing itself
  const step = STEPS[i]
  const last = i === STEPS.length - 1

  // Every step introduces itself out loud.
  useEffect(() => {
    setActed(false)
    speak(intro(step), voice)
    return stopSpeaking
  }, [i, lang])

  // The scripted voice note types itself in after she presses the microphone.
  useEffect(() => {
    if (step.kind !== 'tapMic' || !acted) { setTyped(''); return }
    const full = t('demoTranscript')
    let n = 0
    const id = setInterval(() => {
      n += 2
      setTyped(full.slice(0, n))
      if (n >= full.length) clearInterval(id)
    }, 45)
    return () => clearInterval(id)
  }, [step.kind, acted, lang])

  function finish() {
    stopSpeaking(); markTourSeen(); nav('/')
  }

  const needsAction = step.kind !== 'watch' && !acted

  return (
    <div className="mx-auto flex h-full max-w-[480px] flex-col bg-paper">
      {/* Two rows, not one. Sharing a line with the language button and the
          skip link left the ten beads about 190px to live in, and the whole
          thread scaled down to fit — legible only if you already knew what it
          was. It gets the full width now. */}
      <header className="border-b border-line bg-surface px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mb-2 flex items-center gap-3">
          <LangButton />
          <button onClick={finish} className="press ml-auto min-h-0 px-1 py-1.5 text-sm text-ink-3 underline">
            {t('tourSkip')}
          </button>
        </div>
        <Thread
          ariaLabel={`${i + 1} / ${STEPS.length}`}
          beads={STEPS.map((_, n) => ({ done: n < i, current: n === i }))}
        />
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <button
          onClick={() => speak(intro(step), voice)}
          className="mb-1 flex w-full min-h-0 items-start gap-2 text-left"
        >
          <span aria-hidden className="mt-1 text-indigo">🔊</span>
          <span>
            <span className="block text-2xl font-bold leading-tight">{step.title()}</span>
            {step.sub() && <span className="mt-1 block text-ink-2">{step.sub()}</span>}
          </span>
        </button>

        <div className="mt-6">
          <Stage step={step} acted={acted} onAct={() => setActed(true)} typed={typed} voice={voice} />
        </div>
      </main>

      <footer className="border-t border-line bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {last ? (
          <BigButton icon="📷" label={t('tourStart')} variant="good"
            onClick={() => { stopSpeaking(); markTourSeen(); nav('/') }} />
        ) : (
          <BigButton icon={<Icon name="next" />} label={t('tourNext')} disabled={needsAction}
            onClick={() => setI(n => n + 1)} speakOnTap={false} />
        )}
      </footer>
    </div>
  )
}

/** What she looks at — and, on the acting steps, what she presses. */
function Stage({ step, acted, onAct, typed, voice }: {
  step: Step; acted: boolean; onAct: () => void; typed: string; voice: string
}) {
  switch (step.kind) {
    case 'tapHear':
      return (
        <Center>
          <Tappable pulse={!acted} onClick={() => { speak(t('tourTapToHear'), voice); onAct() }}>
            <span className="text-4xl" aria-hidden>🔊</span>
            <span className="text-lg font-semibold">{t('tourTapToHear')}</span>
          </Tappable>
          {acted && <Well>{t('tourHeard')}</Well>}
        </Center>
      )

    case 'tapCamera':
      return (
        <Center>
          {!acted ? (
            <Tappable pulse onClick={onAct} round>
              <span className="text-6xl" aria-hidden>📷</span>
            </Tappable>
          ) : (
            <img src="./demo-before.jpg" alt="" className="w-full rounded-xl border-2 border-line" />
          )}
        </Center>
      )

    case 'tapMic':
      return (
        <Center>
          {!acted ? (
            <Tappable pulse onClick={onAct} round danger>
              <span className="text-6xl" aria-hidden>🎤</span>
            </Tappable>
          ) : (
            <div className="w-full rounded-xl border-2 border-indigo bg-surface p-4 text-lg leading-relaxed">
              {typed}<span className="animate-pulse">▌</span>
            </div>
          )}
        </Center>
      )

    case 'tapPublish':
      return (
        <Center>
          {!acted ? (
            <Tappable pulse onClick={onAct} round good>
              <span className="text-6xl" aria-hidden>✅</span>
            </Tappable>
          ) : <Kolam size={170} />}
        </Center>
      )

    default:
      return <Watch id={step.id} />
  }
}

/** The steps she only watches. */
function Watch({ id }: { id: Id }) {
  if (id === 'cleaning') return (
    <div className="grid grid-cols-2 gap-3">
      <Shot src="./demo-before.jpg" label={t('before')} />
      <Shot src="./demo-after.jpg" label={t('after')} highlight />
    </div>
  )

  if (id === 'listing') return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-lg font-semibold">{t('demoTitle')}</p>
      <p className="mt-1 text-ink-2">{t('demoDesc')}</p>
    </div>
  )

  if (id === 'price') return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-line bg-surface p-4">
        <PriceScale price={{ ...DEMO_PRICE, reason: '' }}
          labels={{ floor: t('yourCost'), market: t('marketRange'), suggested: t('weSuggest') }} />
      </div>
      <div className="rounded-2xl border-2 border-indigo bg-wash p-4">
        <p className="text-4xl font-bold tabular-nums text-indigo">₹{DEMO_PRICE.suggested}</p>
        <div className="mt-3"><PriceInNotes amount={DEMO_PRICE.suggested} /></div>
      </div>
    </div>
  )

  if (id === 'orders') return (
    <div className="rounded-2xl border-2 border-indigo bg-wash p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo">
        🔔 {t('newOrderCame')}
      </p>
      <p className="text-xl font-bold">200 {t('pieces')} · ₹{200 * DEMO_PRICE.suggested}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-good py-3 text-center font-semibold text-white">✅ {t('accept')}</div>
        <div className="rounded-xl border-2 border-line bg-surface py-3 text-center font-semibold">❌ {t('decline')}</div>
      </div>
    </div>
  )

  if (id === 'done') return <Center><Kolam size={150} /></Center>

  // The first thing anyone sees of the app. The app icon said nothing; this
  // says who it is for, and the line under it is the whole pitch in one
  // sentence — she does not have to write a single word.
  if (id === 'welcome') return (
    <Center>
      <Artisan width={220} />
      <p className="flex items-center justify-center gap-2 rounded-xl bg-wash px-4 py-3
                    text-center text-lg font-semibold text-indigo">
        <span aria-hidden className="text-2xl">🎤</span>
        <span>{t('sellWithVoice')}</span>
      </p>

      {/* The tour SPEAKS. Everything after this slide is spoken Hindi unless
          she changes it here, and until this existed there was no way to —
          the picker lived on the Speak screen, four steps in, behind a tour
          she could not follow. Tapping a language says a sentence in it, so
          she picks by ear. */}
      <div className="w-full">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-ink-3">
          {t('chooseLanguage')}
        </p>
        <LanguagePicker />
      </div>
    </Center>
  )

  return (
    <Center>
      <img src="./icons/icon-512.png" alt="" className="h-32 w-32 rounded-3xl" />
    </Center>
  )
}

/* ---------------- small pieces ---------------- */

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-center gap-4">{children}</div>
}

function Well({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-good/10 px-4 py-3 text-center font-semibold text-good">{children}</p>
}

function Shot({ src, label, highlight }: { src: string; label: string; highlight?: boolean }) {
  return (
    <figure className="m-0">
      <figcaption className={'mb-1 text-xs font-semibold uppercase tracking-widest ' +
        (highlight ? 'text-indigo' : 'text-ink-3')}>{label}</figcaption>
      <img src={src} alt="" className={'w-full rounded-xl border-2 ' +
        (highlight ? 'border-indigo' : 'border-line')} />
    </figure>
  )
}

/** The thing she is meant to press, ringed until she does. */
function Tappable({ children, onClick, pulse, round, good, danger }: {
  children: React.ReactNode; onClick: () => void
  pulse?: boolean; round?: boolean; good?: boolean; danger?: boolean
}) {
  return (
    <span className="relative flex items-center justify-center">
      {pulse && (
        <span aria-hidden className={
          'pointer-events-none absolute animate-ping rounded-full border-4 ' +
          (danger ? 'border-danger' : good ? 'border-good' : 'border-indigo')
        } style={{ width: round ? 150 : '100%', height: round ? 150 : '100%' }} />
      )}
      <button
        onClick={onClick}
        className={
          'relative flex items-center justify-center gap-3 font-semibold text-white ' +
          (round
            ? 'h-[9.375rem] w-[9.375rem] flex-col rounded-full '
            : 'min-h-[4.75rem] w-full rounded-2xl px-5 ') +
          (danger ? 'bg-danger ' : good ? 'bg-good ' : 'bg-indigo ') +
          'active:scale-95 transition-transform'
        }
      >{children}</button>
    </span>
  )
}
