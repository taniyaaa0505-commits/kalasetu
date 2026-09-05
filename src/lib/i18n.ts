/**
 * Language: which one is current, and how a component asks for a string.
 *
 * The strings themselves live in ./locales, one file per language, so that
 * translating a language is editing one file rather than picking a hundred
 * lines out of a shared one. Never put user-facing text in a component.
 *
 * The chosen language is app-wide state kept here rather than passed down
 * through props, because almost every component needs it and none of them
 * should have to think about it. Call `t('key')` and you get the current
 * language; components that must re-render on a change use `useLang()`.
 */
import { useSyncExternalStore } from 'react'
import type { LangCode } from '../types'
import { UI, hi, type Strings } from './locales'

export type StringKey = keyof Strings

/* ---------------- app-wide current language ---------------- */

// NOT renamed with the app. This key is already on every phone that has
// opened the app; changing it would silently reset her language.
const KEY = 'kalasetu.lang'
let current: LangCode = read()
const listeners = new Set<() => void>()

function read(): LangCode {
  try {
    const v = localStorage.getItem(KEY)
    if (v) return v as LangCode
  } catch { /* private mode, or storage blocked */ }
  return 'hi-IN'
}

/** Mirror the choice onto <html lang>. A screen reader picks its voice from
 *  this, and it is what tells the stylesheet whether letter-spacing is safe:
 *  see `.label` in index.css. It was hardcoded to "hi" in index.html and never
 *  updated, so Tamil was being announced in Hindi. */
function reflect(code: LangCode) {
  try { document.documentElement.lang = code } catch { /* SSR / tests */ }
}
reflect(current)

export function getLang(): LangCode { return current }

export function setLang(code: LangCode) {
  if (code === current) return
  current = code
  try { localStorage.setItem(KEY, code) } catch { /* not fatal */ }
  reflect(code)
  listeners.forEach(fn => fn())
}

/** Subscribe a component to language changes. */
export function useLang(): LangCode {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => { listeners.delete(cb) } },
    () => current,
    () => current,
  )
}

/** Look up a string. Defaults to the current language.
 *  The `?? hi` is belt and braces — every LangCode has a locale, and the type
 *  of UI says so — but a stored language from an older build could be a code
 *  we no longer ship, and that must not blank the screen. */
export function t(key: StringKey, lang: LangCode = current): string {
  return (UI[lang] ?? hi)[key]
}

/** True when the artisan's own language is English, so we show her the
 *  English half of a listing and label the Hindi half "for the buyer". */
export function prefersEnglish(lang: LangCode = current): boolean {
  return lang === 'en-IN'
}

/** Same, with {placeholders} filled in. */
export function tf(key: StringKey, vars: Record<string, string | number>, lang: LangCode = current): string {
  return Object.entries(vars).reduce(
    (out, [k, v]) => out.replaceAll(`{${k}}`, String(v)),
    t(key, lang),
  )
}
