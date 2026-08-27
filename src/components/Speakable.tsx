/**
 * Any text that the artisan might not be able to read gets wrapped in this.
 * Tapping it reads it out loud. The speaker icon is the affordance — she
 * learns it once and it works everywhere in the app.
 */
import { speak } from '../lib/speak'

export default function Speakable({
  text, lang = 'hi-IN', className = '', as: Tag = 'p',
}: {
  text: string
  lang?: string
  className?: string
  as?: 'p' | 'h2' | 'h3' | 'span'
}) {
  return (
    <button
      onClick={() => speak(text, lang)}
      className="flex w-full min-h-0 items-start gap-2 text-left active:opacity-60"
      aria-label={`Hear: ${text}`}
    >
      <span aria-hidden className="mt-[2px] shrink-0 text-indigo">🔊</span>
      <Tag className={className}>{text}</Tag>
    </button>
  )
}
