/**
 * Every language the interface exists in.
 *
 * A locale here is the INTERFACE only. Which recogniser hears her, and which
 * voice reads back to her, is decided separately by `asr` in types.ts — Chrome
 * has no Maithili model, for instance, so Maithili speech goes in as Hindi
 * while everything on this list stays properly Maithili.
 *
 * Adding a language: copy hi.ts, translate, and add it below. TypeScript will
 * not let you ship it half-done — every locale is typed against `Strings`, so
 * a missing key fails the build rather than leaving a hole on her screen.
 */
import type { LangCode } from '../../types'
import { hi, type Strings } from './hi'
import { en } from './en'
import { bn } from './bn'
import { mr } from './mr'
import { ta } from './ta'
import { mai } from './mai'

export type { Strings } from './hi'

export const UI: Record<LangCode, Strings> = {
  'hi-IN': hi,
  'en-IN': en,
  'mai-IN': mai,
  'bn-IN': bn,
  'mr-IN': mr,
  'ta-IN': ta,
}

/** The fallback, and the file every other locale is typed against. */
export { hi }
