/**
 * The artisan's side of the conversation.
 *
 * She never reads English and never types. The buyer's message arrives in
 * her own language and is read aloud automatically; she answers by speaking.
 * That is the entire disintermediation argument in one screen.
 */
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import Screen from '../components/Screen'
import BigButton from '../components/BigButton'
import { getProduct } from '../services/db'
import { sendMessage, translatePending, subscribeMessages, TRANSLATING_WINDOW_MS } from '../services/messages'
import { markSeen } from '../lib/seen'
import { listen, listenSupported, type Recogniser } from '../lib/listen'
import { speak, stopSpeaking } from '../lib/speak'
import { t, useLang } from '../lib/i18n'
import { asrCode, type Message, type LangCode } from '../types'
import Icon from '../components/Icon'
import Empty from '../components/Empty'

export default function Chat() {
  const { id = '' } = useParams()
  const lang = useLang()
  const [msgs, setMsgs] = useState<Message[]>([])
  const [productLang, setProductLang] = useState<LangCode>(lang)
  const [recording, setRecording] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const recRef = useRef<Recogniser | null>(null)
  const spokenRef = useRef<Set<string>>(new Set())
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { getProduct(id).then(p => { if (p?.lang) setProductLang(p.lang) }) }, [id])

  // Poll rather than push: the buyer may be typing in another tab, and on
  // one device that is exactly how the demo runs. Firestore replaces this.
  useEffect(() => {
    const off = subscribeMessages(id, list => {
      setMsgs(list)

      /* Read any new buyer message aloud, once. She cannot read it.
       *
       * Marked as spoken only when it is actually SPOKEN. It used to be marked
       * on arrival and then skipped if it had no translation yet — so a
       * message that arrived untranslated was silently retired and never read
       * to her at all, not even when its Hindi landed a second later. That was
       * a latent bug while the buyer's send waited for the translation before
       * storing anything. Now that it does not, every message arrives
       * untranslated first, and this would have silenced the whole screen. */
      const latest = list.filter(m => m.from === 'buyer').at(-1)
      if (latest && !latest.untranslated && !spokenRef.current.has(latest.id)) {
        spokenRef.current.add(latest.id)
        speak(latest.local, asrCode(productLang))
      }
      // She is looking at this conversation right now, so it is no longer
      // waiting for her — this is what clears the banner on the home screen.
      if (latest) markSeen(id, latest.createdAt)
      if (list.some(m => m.untranslated)) translatePending(id)
    })
    return () => { off(); recRef.current?.stop(); stopSpeaking() }
  }, [id, productLang])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs.length])

  // One redraw when the "translating…" window closes, so a translation that
  // failed stops claiming to still be working. Nothing else would trigger it.
  const [, tick] = useState(0)
  useEffect(() => {
    const waiting = msgs.filter(m => m.untranslated)
    if (!waiting.length) return
    const soonest = Math.min(...waiting.map(m => m.createdAt + TRANSLATING_WINDOW_MS - Date.now()))
    if (soonest <= 0) return
    const timer = setTimeout(() => tick(n => n + 1), soonest + 100)
    return () => clearTimeout(timer)
  }, [msgs])

  function startTalking() {
    stopSpeaking(); setDraft(''); setRecording(true)
    recRef.current = listen(asrCode(productLang), {
      onPartial: setDraft,
      onFinal: final => { if (final) send(final) },
      onError: () => setRecording(false),
      onEnd: () => setRecording(false),
    })
  }

  async function send(text: string) {
    setSending(true)
    try {
      // No re-read afterwards: subscribeMessages above is live and hands the
      // message straight back. And no waiting on the translation — see
      // services/messages.ts. She spoke; the words go up now.
      await sendMessage({ productId: id, from: 'artisan', text, localLang: productLang })
      setDraft('')
    } catch (err) {
      // It had no catch at all, so a store that refused the write left her
      // looking at "sending…" with no way out and nothing said.
      console.error('[chat] could not send', err)
    } finally { setSending(false) }
  }

  return (
    <Screen
      title={t('messages')} onBack={() => {}}
      action={
        <BigButton
          icon={<Icon name={recording ? 'stop' : 'mic'} />}
          label={recording ? t('stopSpeaking') : t('replyByVoice')}
          variant={recording ? 'quiet' : 'primary'}
          onClick={() => recording ? recRef.current?.stop() : startTalking()}
          speakOnTap={false}
        />
      }
    >
      {!listenSupported() && (
        <p className="mb-3 rounded-lg bg-gold-wash p-3 text-sm text-gold">
          This browser cannot hear. Use Chrome on Android.
        </p>
      )}

      {msgs.length === 0 && (
        <Empty kind="chat" message={t('noMessages')} />
      )}

      <ul className="flex flex-col gap-3">
        {msgs.map(m => <Bubble key={m.id} m={m} lang={asrCode(productLang)} />)}
      </ul>

      {(draft || sending) && (
        <div className="mt-3 rounded-panel border-2 border-dashed border-indigo bg-wash p-3 text-lg">
          {draft || t('sending')}
        </div>
      )}
      <div ref={endRef} />
    </Screen>
  )
}

function Bubble({ m, lang }: { m: Message; lang: string }) {
  const mine = m.from === 'artisan'
  return (
    <li className={mine ? 'self-end' : 'self-start'} style={{ maxWidth: '88%' }}>
      <p className="mb-1 text-xs font-semibold label uppercase text-ink-3">
        {mine ? t('youSaid') : t('buyerSaid')}
      </p>
      <div className={
        'rounded-panel px-4 py-3 text-lg leading-relaxed ' +
        (mine ? 'bg-indigo text-white' : 'border border-line-2/70 bg-surface')
      }>
        {/* She only ever sees her own language, whichever way the message went. */}
        <p>{m.local || m.source}</p>
        {!mine && (
          <button
            onClick={() => speak(m.local || m.source, lang)}
            className="mt-2 flex min-h-0 items-center gap-1 text-sm text-indigo"
          ><Icon name="speak" /> {t('listenAgain')}</button>
        )}
        {m.untranslated && (
          <p className={'mt-2 text-xs ' + (mine ? 'text-white/70' : 'text-gold')}>
            {Date.now() - m.createdAt < TRANSLATING_WINDOW_MS
              ? t('translating')
              : `⚠ ${t('notTranslated')}`}
          </p>
        )}
      </div>
    </li>
  )
}
