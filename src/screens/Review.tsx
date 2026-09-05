import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Screen from '../components/Screen'
import Icon from '../components/Icon'
import BigButton from '../components/BigButton'
import Speakable from '../components/Speakable'
import Working from '../components/Working'
import Coach from '../components/Coach'
import { advanceGuide } from '../lib/guide'
import { getProduct, patchProduct } from '../services/db'
import { generateListing, geminiConfigured, GeminiError } from '../services/gemini'
import { enqueue, isOnline, onConnectivityChange } from '../services/queue'
import { listen, listenSupported, type Recogniser } from '../lib/listen'
import { speak, stopSpeaking } from '../lib/speak'
import { t, tf, useLang, prefersEnglish } from '../lib/i18n'
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
  // Parked because there is no signal, rather than failed.
  // 'offline' vs 'busy' — the reason changes what we tell her.
  const [parked, setParked] = useState<null | 'offline' | 'busy'>(null)
  const questionsRef = useRef<HTMLDivElement | null>(null)
  const announced = useRef(false)

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
      // Everything here is guarded, including reading the product. Offline,
      // the Firestore chunk may fail to load at all and this read rejects —
      // unguarded that left `busy` true and the screen sat on "preparing"
      // for ever, which is the worst possible way to have no signal.
      try {
      const p = await getProduct(id)
      if (!p) { setBusy(false); return }
      answersRef.current = p.answers ?? []
      setAnswers(p.answers ?? [])
      setPhoto(p.cleanPhoto ?? p.photo)
      if (p.listing) { setListing(p.listing); setBusy(false); return }

      // Writing the listing happens on somebody else's computer, so it is one
      // of the two things in this app that genuinely cannot happen offline.
      // Do not fail her for that: take what she gave us, promise to finish it,
      // and let her carry on to the price.
      if (!isOnline()) {
        await enqueue({ kind: 'generate-listing', productId: id })
        setParked(isOnline() ? 'busy' : 'offline'); setBusy(false)
        return
      }

      try {
        const l = await generateListing(
          p.cleanPhoto ?? p.photo ?? '', p.transcript ?? '', p.lang ?? lang, p.answers ?? [],
        )
        setListing(l)
        await patchProduct(id, { listing: l })
      } catch (e) {
        // Two different failures, two different answers. A dropped signal or
        // an overloaded model is "not now" — park it, say so, let her carry
        // on, and QueueRunner finishes it when it can. Anything else is a
        // real fault and she gets a plain sentence with the detail under it.
        if (!isOnline() || (e instanceof GeminiError && e.retryable)) {
          await enqueue({ kind: 'generate-listing', productId: id })
          setParked(isOnline() ? 'busy' : 'offline')
        } else {
          setError(e instanceof Error ? e.message : String(e))
        }
      } finally { setBusy(false) }
      } catch (e) {
        if (!isOnline() || (e instanceof GeminiError && e.retryable)) {
          await enqueue({ kind: 'generate-listing', productId: id }).catch(() => {})
          setParked(isOnline() ? 'busy' : 'offline')
        } else setError(e instanceof Error ? e.message : String(e))
        setBusy(false)
      }
    })()
  }, [id])

  // Never leave the microphone open or the phone talking to an empty screen.
  useEffect(() => () => { recRef.current?.stop(); stopSpeaking() }, [])

  /**
   * Tell her the app has asked something.
   *
   * The questions sit 695px down on a 360px phone — 139px below the fold —
   * so on arrival they do not exist as far as she is concerned. A "scroll for
   * more" hint would be text she cannot read or an arrow she may never have
   * been taught. She is not a reader; she is a listener, and this app already
   * talks. So it says how many, and then asks the first one.
   */
  useEffect(() => {
    if (!listing || announced.current) return
    const open = (listing.questions ?? [])
      .filter(q => !answersRef.current.some(a => a.question === q && a.answer.trim()))
    announced.current = true

    /*
     * Order matters, and it was wrong.
     *
     * This used to open with "the app wants to know three more things" the
     * instant the listing landed — before she had heard a single word of what
     * the app had actually written for her. She was being asked to answer
     * follow-up questions about a description she had not yet heard.
     *
     * So: her listing first, in her own language, then the questions. One
     * utterance, not two, because two `speak` calls in a row cancel each other
     * — the second one arrives while the first is still going and cuts it off
     * mid-sentence. Chaining through `onDone` is what makes them queue.
     */
    const heading = mine ? listing.titleEn : listing.titleHi
    const body    = mine ? listing.descriptionEn : listing.descriptionHi
    const voice   = asrCode(lang)

    speak(`${heading}. ${body}`, voice, () => {
      if (!open.length) return
      speak(`${tf('askedMore', { n: open.length })}. ${open[0]}`, voice)
    })
  }, [listing, lang, mine])

  // If she is still standing here when the signal returns, write it now
  // rather than making her go back and forth.
  useEffect(() => onConnectivityChange(online => {
    if (online && parked) void rewrite()
  }), [parked])

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
  // She answered something. That, not the scroll, is the end of the step.
  useEffect(() => { if (dirty) advanceGuide('reviewQuestions') }, [dirty])

  async function rewrite() {
    advanceGuide('reviewRewrite')
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
      setParked(null)
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
  const openQuestions = (listing?.questions ?? []).filter(q => !answerFor(q)).length
  const asked = new Set(listing?.questions ?? [])
  const extras = answers.filter(a => !a.question || !asked.has(a.question))

  return (
    <Screen
      title={t('screenListing')} step={4} onBack={() => { recRef.current?.stop(); stopSpeaking() }}
      action={
        dirty
          ? <div className="flex flex-col gap-2">
              <div data-guide="rewrite">
                <BigButton
                  icon={<Icon name="rewrite" />} label={rewriting ? t('rewriting') : t('writeAgain')}
                  onClick={rewrite} disabled={rewriting || asking !== null}
                />
              </div>
              <BigButton
                icon={<Icon name="next" />} label={t('next')} variant="quiet"
                onClick={() => { advanceGuide('reviewNext'); nav(`/p/${id}/price`) }} disabled={!listing || rewriting}
              />
            </div>
          : <BigButton
              icon={<Icon name="next" />} label={t('next')}
              onClick={() => { advanceGuide('reviewNext'); nav(`/p/${id}/price`) }} disabled={rewriting}
            />
      }
    >
      <Coach step="reviewQuestions" target="questions" mode="tap"
             title={tf('askedMore', { n: openQuestions })} body={t('tellUsMore')} />
      <Coach step="reviewRewrite"   target="rewrite"   mode="tap"
             title={t('writeAgain')} body={t('youAlsoSaid')} />
      <Coach step="reviewListen"    target="listen"    mode="tap"
             title={t('hearItBack')} body={t('forTheBuyer')} />
      <Coach step="reviewNext"      target="action"    mode="tap"
             title={t('tourPriceStep')} body={t('tourPriceSub')} />

      {!geminiConfigured() && (
        <p className="mb-4 rounded-lg bg-gold-wash p-3 text-sm text-gold">
          Demo text — add <code>VITE_GEMINI_API_KEY</code> to <code>.env</code> for the real thing.
        </p>
      )}
      {!listenSupported() && (
        <p className="mb-4 rounded-lg bg-gold-wash p-3 text-sm text-gold">{t('cannotHear')}</p>
      )}
      {parked && (
        <div className="mb-4 rounded-card border border-gold/40 bg-gold-wash p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-gold">
            <span aria-hidden>{parked === 'busy' ? '⏳' : '📶'}</span>
            {parked === 'busy' ? t('busyNow') : t('noSignal')}
          </p>
          <Speakable
            text={parked === 'busy' ? t('writeWhenFree') : t('writeWhenOnline')}
            className="mt-1 text-[15px] leading-snug text-gold"
          />
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-card border border-danger/30 bg-gold-wash p-4">
          <Speakable text={t('couldNotWrite')} className="text-[15px] font-semibold text-danger" />
          <button onClick={() => void rewrite()}
            className="press mt-2 min-h-0 rounded-full border border-danger/40 px-3 py-1.5 text-sm font-medium text-danger">
            {t('tryAgainNow')}
          </button>
          {/* The technical reason, kept for us and out of her way. */}
          <p className="mt-2 text-xs leading-snug text-ink-3">{error}</p>
        </div>
      )}

      {listing && openQuestions > 0 && (
        <button
          data-guide="questions"
          onClick={() => questionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
          className="press mb-4 flex w-full items-center gap-3 rounded-card border-2 border-gold bg-gold-wash px-4 py-3 text-left"
        >
          <Icon name="speak" className="text-xl" />
          <span className="flex-1 text-[15px] font-semibold leading-snug text-gold">
            {tf('askedMore', { n: openQuestions })}
          </span>
          <span aria-hidden className="text-lg text-gold">↓</span>
        </button>
      )}

      {listing && (
        <div className={'flex flex-col gap-5 transition-opacity ' + (rewriting ? 'opacity-50' : '')}>
          {/* Her listing, laid out the way a marketplace lays one out — her
              photograph first and largest, the words under it. She should be
              looking at her own work, not at a form the app filled in. */}
          <article className="arch overflow-hidden rounded-b-panel border border-line-2/70 bg-surface shadow-card ring-1 ring-gold-leaf/30">
            {photo && <img src={photo} alt="" className="arch block aspect-square w-full object-cover" />}
            <div className="flex flex-col gap-3 p-4">
              <span className="flex w-fit items-center gap-1.5 rounded-full bg-wash px-2.5 py-1 text-[11px] font-semibold label uppercase text-indigo">
                <Icon name="ai" className="text-xs" />{t('screenListing')}
              </span>
              <div data-guide="listen" onClickCapture={() => advanceGuide('reviewListen')}>
                <Speakable text={mine ? listing.titleEn : listing.titleHi}
                  className="font-display text-xl font-bold leading-tight tracking-tight" />
              </div>
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
            <div ref={questionsRef} className="rounded-panel border-2 border-gold bg-gold-wash p-4 shadow-rest">
              <p className="mb-3 text-xs font-semibold label uppercase text-gold">
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
            <h2 className="mb-1 text-xs font-semibold label uppercase text-ink-3">
              {t('tellMore')}
            </h2>
            <div className="rounded-xl border border-line-2/70 bg-surface p-4">
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
          ? <div className="mt-2 rounded-card border border-line-2/70 bg-surface p-3">
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
      <Icon name={recording ? 'stop' : 'mic'} className="text-xl" />
      <span>{label}</span>
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 text-xs font-semibold label uppercase text-ink-3">{label}</h2>
      <div className="rounded-card border border-line-2/70 bg-surface p-4 shadow-rest">{children}</div>
    </section>
  )
}
