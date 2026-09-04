import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Screen from '../components/Screen'
import Icon from '../components/Icon'
import BigButton from '../components/BigButton'
import Speakable from '../components/Speakable'
import Working from '../components/Working'
import { getProduct, patchProduct } from '../services/db'
import { generateListing, geminiConfigured } from '../services/gemini'
import { listen, listenSupported, type Recogniser } from '../lib/listen'
import { speak, stopSpeaking } from '../lib/speak'
import { t, useLang, prefersEnglish } from '../lib/i18n'
import { asrCode, type Answer, type Listing } from '../types'

/** `asking` holds the question being answered; '' is the free-form mic. */
const FREE_FORM = ''

export default function Review() {
  const { id = '' } = useParams()
  const nav = useNavigate()

  const lang = useLang()
  const mine = prefersEnglish(lang)      // show her half first, the other half is 'for the buyer'
  const [listing, setListing] = useState<Listing>()
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string>()
  const [photo, setPhoto] = useState<string>()

  // What she has told us since the first draft, and whether the draft on
  // screen already reflects it.
  const [answers, setAnswers] = useState<Answer[]>([])
  const [dirty, setDirty] = useState(false)
  const [rewriting, setRewriting] = useState(false)
  // The listen callbacks fire long after the render that created them, so they
  // read the answers from here rather than from a captured, stale `answers`.
  const answersRef = useRef<Answer[]>([])

  // Recording. `asking` is null when idle — note FREE_FORM is '', which is
  // falsy, so every check has to be against null explicitly.
  const [asking, setAsking] = useState<string | null>(null)
  const [partial, setPartial] = useState('')
  const recRef = useRef<Recogniser | null>(null)
  // Bumped on every tap, so a question that has been read aloud does not open
  // the microphone if she has already moved on to a different one.
  const turnRef = useRef(0)

  useEffect(() => {
    (async () => {
      const p = await getProduct(id)
      if (!p) return
      answersRef.current = p.answers ?? []
      setAnswers(p.answers ?? [])
      setPhoto(p.cleanPhoto ?? p.photo)
      if (p.listing) { setListing(p.listing); setBusy(false); return }
      try {
        const l = await generateListing(
          p.cleanPhoto ?? p.photo ?? '', p.transcript ?? '', p.lang ?? lang, p.answers ?? [],
        )
        setListing(l)
        await patchProduct(id, { listing: l })
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally { setBusy(false) }
    })()
  }, [id])

  // Never leave the microphone open or the phone talking to an empty screen.
  useEffect(() => () => { recRef.current?.stop(); stopSpeaking() }, [])

  /**
   * Read a question out loud, then listen for the answer.
   *
   * The two must not overlap: the phone's own voice goes straight back into
   * the microphone and gets recognised as hers. `speak` calls us back when it
   * has actually finished, which is the only safe moment to open the mic.
   */
  function ask(question: string) {
    if (!listenSupported()) { setError(t('cannotHear')); return }

    recRef.current?.stop()
    const turn = ++turnRef.current
    setError(undefined)
    setPartial('')
    setAsking(question)

    const openMic = () => {
      if (turnRef.current !== turn) return      // she tapped something else meanwhile
      recRef.current = listen(asrCode(lang), {
        onPartial: setPartial,
        // Keyed to its OWN question, so a late result is still saved
        // correctly even if she has moved on to the next one.
        onFinal: final => {
          if (final.trim()) record(question, final.trim())
          else if (turnRef.current === turn) setError(t('nothingHeard'))
        },
        onError: e => setError(e),
        onEnd: () => { if (turnRef.current === turn) { setAsking(null); setPartial('') } },
      })
    }

    speak(question || t('tellMoreHint'), asrCode(lang), openMic)
  }

  function stopAsking() { recRef.current?.stop() }

  /** Keep what she said, and remember the draft is now out of date. */
  function record(question: string, answer: string) {
    const prev = answersRef.current
    // Answering the same question again replaces the earlier attempt; a
    // free-form addition is always a new one, since it answers nothing.
    const next = question
      ? [...prev.filter(a => a.question !== question), { question, answer }]
      : [...prev, { question, answer }]

    answersRef.current = next
    setAnswers(next)
    setDirty(true)
    void patchProduct(id, { answers: next })
  }

  /** Ask the model to write it again, this time knowing what she told us. */
  async function rewrite() {
    const p = await getProduct(id)
    if (!p) return

    recRef.current?.stop()
    stopSpeaking()
    setRewriting(true)
    setError(undefined)
    try {
      const l = await generateListing(
        p.cleanPhoto ?? p.photo ?? '', p.transcript ?? '', p.lang ?? lang, answersRef.current,
      )
      setListing(l)
      setDirty(false)
      await patchProduct(id, { listing: l })
    } catch (e) {
      // The old listing stays on screen. A failed rewrite must never cost her
      // the description she already had.
      setError(e instanceof Error ? e.message : String(e))
    } finally { setRewriting(false) }
  }

  if (busy) return (
    <Screen title={t('preparing')} step={4}>
      <div className="flex min-h-full flex-col justify-center">
        <Working title={t('writingListing')} />
      </div>
    </Screen>
  )

  const answerFor = (q: string) => answers.find(a => a.question === q)?.answer
  // Free-form additions, plus answers to questions the model has since stopped
  // asking — she should still be able to hear back everything she added.
  const asked = new Set(listing?.questions ?? [])
  const extras = answers.filter(a => !a.question || !asked.has(a.question))

  return (
    <Screen
      title={t('screenListing')} step={4} onBack={() => { recRef.current?.stop(); stopSpeaking() }}
      action={
        dirty
          ? <div className="flex flex-col gap-2">
              <BigButton
                icon={<Icon name="rewrite" />} label={rewriting ? t('rewriting') : t('writeAgain')}
                onClick={rewrite} disabled={rewriting || asking !== null}
              />
              <BigButton
                icon={<Icon name="next" />} label={t('next')} variant="quiet"
                onClick={() => nav(`/p/${id}/price`)} disabled={!listing || rewriting}
              />
            </div>
          : <BigButton
              icon={<Icon name="next" />} label={t('next')}
              onClick={() => nav(`/p/${id}/price`)} disabled={!listing || rewriting}
            />
      }
    >
      {!geminiConfigured() && (
        <p className="mb-4 rounded-lg bg-gold-wash p-3 text-sm text-gold">
          Demo text — add <code>VITE_GEMINI_API_KEY</code> to <code>.env</code> for the real thing.
        </p>
      )}
      {!listenSupported() && (
        <p className="mb-4 rounded-lg bg-gold-wash p-3 text-sm text-gold">{t('cannotHear')}</p>
      )}
      {error && <p className="mb-4 rounded-lg bg-gold-wash p-3 text-sm text-danger">{error}</p>}

      {listing && (
        <div className={'flex flex-col gap-5 transition-opacity ' + (rewriting ? 'opacity-50' : '')}>
          {/* Her listing, laid out the way a marketplace lays one out — her
              photograph first and largest, the words under it. She should be
              looking at her own work, not at a form the app filled in. */}
          <article className="overflow-hidden rounded-panel border border-line bg-surface shadow-card">
            {photo && <img src={photo} alt="" className="block aspect-square w-full object-cover" />}
            <div className="flex flex-col gap-3 p-4">
              <span className="flex w-fit items-center gap-1.5 rounded-full bg-wash px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo">
                <Icon name="ai" className="text-xs" />{t('screenListing')}
              </span>
              <Speakable text={mine ? listing.titleEn : listing.titleHi}
                className="text-xl font-bold leading-tight tracking-tight" />
              <Speakable text={mine ? listing.descriptionEn : listing.descriptionHi}
                className="leading-relaxed text-ink-2" />
            </div>
          </article>

          {/* The other language, for whoever is buying. */}
          <Field label={`${mine ? 'हिंदी' : 'English'} — ${t('forTheBuyer')}`}>
            <p className="font-semibold">{mine ? listing.titleHi : listing.titleEn}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">
              {mine ? listing.descriptionHi : listing.descriptionEn}
            </p>
          </Field>

          {/* The anti-hallucination rule made visible: anything the AI was not
              sure about becomes a question, never a guess — and she can answer
              it out loud, which is the only half of this she can actually do. */}
          {listing.questions.length > 0 && (
            <div className="rounded-panel border-2 border-gold bg-gold-wash p-4 shadow-rest">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold">
                {t('tellUsMore')}
              </p>
              <div className="flex flex-col gap-4">
                {listing.questions.map(q => (
                  <Question
                    key={q}
                    question={q}
                    answer={answerFor(q)}
                    recording={asking === q}
                    partial={asking === q ? partial : ''}
                    busy={rewriting || (asking !== null && asking !== q)}
                    onAsk={() => ask(q)}
                    onStop={stopAsking}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Anything the model never thought to ask about. */}
          <section>
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-ink-3">
              {t('tellMore')}
            </h2>
            <div className="rounded-xl border border-line bg-surface p-4">
              <MicButton
                recording={asking === FREE_FORM}
                label={asking === FREE_FORM ? t('stopSpeaking') : t('tellMore')}
                disabled={rewriting || (asking !== null && asking !== FREE_FORM)}
                onClick={() => (asking === FREE_FORM ? stopAsking() : ask(FREE_FORM))}
              />
              {asking === FREE_FORM && partial && (
                <p className="mt-3 leading-relaxed text-ink-2">{partial}</p>
              )}
            </div>
          </section>

          {extras.length > 0 && (
            <Field label={t('youAlsoSaid')}>
              <div className="flex flex-col gap-2">
                {extras.map((a, i) => (
                  <Speakable key={`${a.question}-${i}`} text={a.answer} className="leading-relaxed" />
                ))}
              </div>
            </Field>
          )}
        </div>
      )}
    </Screen>
  )
}

/** One question, its mic, and whatever she has said back to it. */
function Question({
  question, answer, recording, partial, busy, onAsk, onStop,
}: {
  question: string
  answer?: string
  recording: boolean
  partial: string
  busy: boolean
  onAsk: () => void
  onStop: () => void
}) {
  return (
    <div>
      <Speakable text={question} />
      <div className="mt-2">
        <MicButton
          recording={recording}
          label={recording ? t('stopSpeaking') : answer ? t('sayAgain') : t('answerThis')}
          disabled={busy}
          onClick={recording ? onStop : onAsk}
        />
      </div>

      {/* Her words, under the question that prompted them. She cannot read
          them, so the speaker icon is what lets her check. */}
      {recording
        ? <p className="mt-2 text-ink-2">{partial || t('answering')}</p>
        : answer
          ? <div className="mt-2 rounded-card border border-line bg-surface p-3">
              <Speakable text={answer} className="leading-relaxed" />
            </div>
          : null}
    </div>
  )
}

/**
 * A compact microphone. Deliberately NOT a BigButton: that one says its own
 * label out loud on tap, which would talk over the question we are about to
 * read out and land in the recording.
 */
function MicButton({
  recording, label, disabled, onClick,
}: {
  recording: boolean
  label: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        'flex w-full items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold ' +
        'min-h-[3.5rem] disabled:opacity-40 press ' +
        (recording ? 'bg-danger text-white shadow-card' : 'border-2 border-indigo bg-surface text-indigo shadow-rest active:bg-wash')
      }
    >
      <span aria-hidden className="text-xl">{recording ? '⏹' : '🎤'}</span>
      <span>{label}</span>
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-ink-3">{label}</h2>
      <div className="rounded-card border border-line bg-surface p-4 shadow-rest">{children}</div>
    </section>
  )
}
