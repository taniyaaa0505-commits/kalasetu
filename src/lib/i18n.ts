/**
 * Every string the artisan sees lives here, so it can be translated AND
 * spoken. Never put user-facing text directly in a component.
 *
 * Only Hindi + English are filled in for now. The other three languages
 * fall back to Hindi until someone fills them in — that is a good
 * first task for whoever owns voice & accessibility.
 */
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
}

export type StringKey = keyof typeof hi

const TABLE: Partial<Record<LangCode | 'en', typeof hi>> = { 'hi-IN': hi }

export function t(key: StringKey, lang: LangCode | 'en' = 'hi-IN'): string {
  if (lang === 'en') return en[key]
  return (TABLE[lang] ?? hi)[key]
}
