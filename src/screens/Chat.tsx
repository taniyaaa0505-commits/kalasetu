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
import { listMessages, sendMessage, translatePending } from '../services/messages'
import { listen, listenSupported, type Recogniser } from '../lib/listen'
import { speak, stopSpeaking } from '../lib/speak'
import { t, useLang } from '../lib/i18n'
import { asrCode, type Message, type LangCode } from '../types'

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
    let alive = true
    const tick = async () => {
      const list = await listMessages(id)
      if (!alive) return
      setMsgs(list)

      // Read any new buyer message aloud, once. She cannot read it.
      const latest = list.filter(m => m.from === 'buyer').at(-1)
      if (latest && !spokenRef.current.has(latest.id)) {
        spokenRef.current.add(latest.id)
        if (!latest.untranslated) speak(latest.local, asrCode(productLang))
      }
      if (list.some(m => m.untranslated)) translatePending(id)
    }
    tick()
    const timer = setInterval(tick, 1500)
    return () => { alive = false; clearInterval(timer); recRef.current?.stop(); stopSpeaking() }
  }, [id, productLang])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs.length])

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
    await sendMessage({ productId: id, from: 'artisan', text, localLang: productLang })
    setDraft(''); setSending(false)
    setMsgs(await listMessages(id))
  }

  return (
    <Screen
      title={t('messages')} onBack={() => {}}
      action={
        <BigButton
          icon={recording ? '⏹' : '🎤'}
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
        <p className="py-16 text-center text-ink-3">{t('noMessages')}</p>
      )}

      <ul className="flex flex-col gap-3">
        {msgs.map(m => <Bubble key={m.id} m={m} lang={asrCode(productLang)} />)}
      </ul>

      {(draft || sending) && (
        <div className="mt-3 rounded-2xl border-2 border-dashed border-indigo bg-wash p-3 text-lg">
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
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-ink-3">
        {mine ? t('youSaid') : t('buyerSaid')}
      </p>
      <div className={
        'rounded-2xl px-4 py-3 text-lg leading-relaxed ' +
        (mine ? 'bg-indigo text-white' : 'border border-line bg-surface')
      }>
        {/* She only ever sees her own language, whichever way the message went. */}
        <p>{m.local || m.source}</p>
        {!mine && (
          <button
            onClick={() => speak(m.local || m.source, lang)}
            className="mt-2 flex min-h-0 items-center gap-1 text-sm text-indigo"
          >🔊 {t('listenAgain')}</button>
        )}
        {m.untranslated && (
          <p className={'mt-2 text-xs ' + (mine ? 'text-white/70' : 'text-gold')}>
            ⚠ {t('notTranslated')}
          </p>
        )}
      </div>
    </li>
  )
}
