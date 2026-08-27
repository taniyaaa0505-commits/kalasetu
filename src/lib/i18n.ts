/**
 * Every string the artisan sees lives here, so it can be translated AND
 * spoken. Never put user-facing text directly in a component.
 *
 * The chosen language is app-wide state kept here rather than passed down
 * through props, because almost every component needs it and none of them
 * should have to think about it. Call `t('key')` and you get the current
 * language; components that must re-render on a change use `useLang()`.
 */
import { useSyncExternalStore } from 'react'
import type { LangCode } from '../types'

const hi = {
  appName: 'कलासेतु',
  myProducts: 'मेरा सामान',
  addProduct: 'नया सामान जोड़ें',
  takePhoto: 'फोटो लें',
  retakePhoto: 'दोबारा फोटो लें',
  cleaning: 'फोटो साफ़ हो रही है…',
  speakNow: 'बोलिए',
  stopSpeaking: 'रुकें',
  speakHint: 'अपने सामान के बारे में 30 सेकंड बोलिए',
  next: 'आगे',
  back: 'पीछे',
  price: 'दाम',
  yourCost: 'आपकी लागत',
  marketRange: 'बाज़ार का दाम',
  weSuggest: 'हमारा सुझाव',
  publish: 'बेचने के लिए भेजें',
  published: 'आपका सामान अब बिक्री के लिए तैयार है',
  noProducts: 'अभी कोई सामान नहीं है',
  listenAgain: 'फिर से सुनें',
  hearItBack: 'सुनकर देखिए',
  sayAgain: 'फिर से बोलिए',
  nothingHeard: 'कुछ सुनाई नहीं दिया। फिर से बोलिए।',
  chooseLanguage: 'आप कौन सी भाषा बोलेंगे?',
  language: 'भाषा',
  rupees: 'रुपये',
  dontSellBelow: 'इससे कम मत बेचिए',
  reasonHandmade: '{craft} हाथ से बना है',
  reasonDiwali: 'दिवाली नज़दीक है',
  reasonRakhi: 'राखी का मौसम है',
  reasonWedding: 'शादी का मौसम है',
  reasonMarket: 'बाज़ार के दाम के हिसाब से',
  materialCost: 'सामान का खर्च',
  hoursTaken: 'कितने घंटे लगे',
  hours: 'घंटे',
  screenPhoto: 'फोटो',
  screenSpeak: 'बोलिए',
  screenListing: 'विवरण',
  screenSend: 'भेजें',
  preparing: 'तैयार हो रहा है',
  writingListing: 'आपका विवरण लिखा जा रहा है…',
  whatIsIt: 'क्या है',
  descriptionLabel: 'विवरण',
  forTheBuyer: 'खरीदार के लिए',
  tellUsMore: 'हमें यह भी बताइए',
  goHome: 'वापस घर',
  sentTo: 'यहाँ भेजा जाएगा',
  bulkBuyers: 'बल्क खरीदार',
  untitled: 'बिना नाम का सामान',
  onSale: 'बिक्री पर',
  incomplete: 'अधूरा',
  firstTimeSetup: 'पहली बार तैयार हो रहा है…',
  composingPhoto: 'सफ़ेद पर लगाया जा रहा है…',
  photoTip: 'सादे रंग की जगह पर रखिए तो और अच्छा आएगा',
  photoPrompt: 'अपने सामान की फोटो लीजिए',
  buyerViewLink: 'खरीदार क्या देखता है',
  onlyFirstTime: 'सिर्फ़ पहली बार, फिर हमेशा के लिए तैयार',
  before: 'पहले',
  after: 'बाद में',
}

const en: typeof hi = {
  appName: 'KalaSetu',
  myProducts: 'My products',
  addProduct: 'Add a new product',
  takePhoto: 'Take a photo',
  retakePhoto: 'Take it again',
  cleaning: 'Cleaning the photo…',
  speakNow: 'Speak',
  stopSpeaking: 'Stop',
  speakHint: 'Tell us about your product for 30 seconds',
  next: 'Next',
  back: 'Back',
  price: 'Price',
  yourCost: 'Your cost',
  marketRange: 'Market range',
  weSuggest: 'We suggest',
  publish: 'Send it to sell',
  published: 'Your product is now ready to sell',
  noProducts: 'Nothing here yet',
  listenAgain: 'Hear it again',
  hearItBack: 'Hear what we heard',
  sayAgain: 'Say it again',
  nothingHeard: 'We did not hear anything. Please speak again.',
  chooseLanguage: 'Which language will you speak?',
  language: 'Language',
  rupees: 'rupees',
  dontSellBelow: 'Do not sell below this',
  reasonHandmade: '{craft} is handmade',
  reasonDiwali: 'Diwali is near',
  reasonRakhi: 'it is Rakhi season',
  reasonWedding: 'it is wedding season',
  reasonMarket: 'based on current market prices',
  materialCost: 'Cost of materials',
  hoursTaken: 'Hours of work',
  hours: 'hours',
  screenPhoto: 'Photo',
  screenSpeak: 'Speak',
  screenListing: 'Description',
  screenSend: 'Send',
  preparing: 'Getting ready',
  writingListing: 'Writing your description…',
  whatIsIt: 'What it is',
  descriptionLabel: 'Description',
  forTheBuyer: 'For the buyer',
  tellUsMore: 'Tell us this too',
  goHome: 'Back home',
  sentTo: 'Will be sent to',
  bulkBuyers: 'Bulk buyers',
  untitled: 'Untitled product',
  onSale: 'On sale',
  incomplete: 'Not finished',
  firstTimeSetup: 'Getting ready, first time only…',
  composingPhoto: 'Placing it on white…',
  photoTip: 'A plain background works best',
  photoPrompt: 'Take a photo of your product',
  buyerViewLink: 'What the buyer sees',
  onlyFirstTime: 'Only the first time, then ready forever',
  before: 'Before',
  after: 'After',
}

export type StringKey = keyof typeof hi

/**
 * UI translations we actually have. The other languages fall back to Hindi
 * for interface text while still using their own language for speech —
 * filling these in is an open task, see SPEC.md.
 */
const UI: Partial<Record<LangCode, typeof hi>> = { 'hi-IN': hi, 'en-IN': en }

/* ---------------- app-wide current language ---------------- */

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

export function getLang(): LangCode { return current }

export function setLang(code: LangCode) {
  if (code === current) return
  current = code
  try { localStorage.setItem(KEY, code) } catch { /* not fatal */ }
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

/** Look up a string. Defaults to the current language. */
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
