/**
 * Any text that the artisan might not be able to read gets wrapped in this.
 * Tapping it reads it out loud. The speaker icon is the affordance — she
 * learns it once and it works everywhere in the app.
 */
import { speak, useSpeaking } from '../lib/speak'
import { useLang } from '../lib/i18n'
import { asrCode } from '../types'
import Icon from './Icon'

export default function Speakable({
  text, lang, className = '', as: Tag = 'p',
}: {
  text: string
  lang?: string
  className?: string
  as?: 'p' | 'h2' | 'h3' | 'span'
}) {
  const current = useLang()
  // One voice at a time. Tapping a second line while the first is still being
  // read cut it off mid-word, which on a screen of speakable lines is easy to
  // do by accident and sounds like the app is malfunctioning.
  const talking = useSpeaking()
  return (
    <button
      disabled={talking}
      onClick={() => speak(text, lang ?? asrCode(current))}
      className="flex w-full min-h-0 items-start gap-2 text-left active:opacity-60 disabled:opacity-45"
      aria-label={`Hear: ${text}`}
    >
      <Icon name="speak" className="mt-[3px] text-indigo" />
      <Tag className={className}>{text}</Tag>
    </button>
  )
}
