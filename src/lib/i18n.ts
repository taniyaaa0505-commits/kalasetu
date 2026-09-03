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
  sentTo: 'अभी यहाँ दिख रहा है',
  plannedChannels: 'आगे यहाँ भी भेजा जाएगा',
  notConnectedYet: 'अभी जुड़ा नहीं है',
  ourMarketplace: 'खरीदार बाज़ार',
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
  messages: 'खरीदार से बात',
  noMessages: 'अभी कोई बात नहीं हुई',
  replyByVoice: 'बोलकर जवाब दें',
  buyerSaid: 'खरीदार ने कहा',
  youSaid: 'आपने कहा',
  notTranslated: 'अनुवाद नहीं हो पाया',
  sending: 'भेजा जा रहा है…',
  orders: 'ऑर्डर',
  newOrderCame: 'आपका ऑर्डर आया है',
  noOrders: 'अभी कोई ऑर्डर नहीं आया',
  accept: 'हाँ, बना दूँगी',
  decline: 'नहीं बना पाऊँगी',
  markShipped: 'भेज दिया',
  quantity: 'कितने चाहिए',
  pieces: 'पीस',
  youWillGet: 'आपको मिलेंगे',
  neededBy: 'कब तक चाहिए',
  buyerNote: 'खरीदार ने कहा',
  statusPlaced: 'नया ऑर्डर',
  statusAccepted: 'आपने हाँ कहा',
  statusDeclined: 'आपने मना किया',
  statusShipped: 'भेज दिया',
  statusDelivered: 'पहुँच गया',
  ordersWaiting: 'ऑर्डर आपका जवाब चाहते हैं',

  learnHow: 'सीखिए कैसे बेचें',
  tourSkip: 'छोड़ दीजिए',
  tourNext: 'आगे',
  tourWelcome: 'नमस्ते! यह कलासेतु है',
  tourWelcomeSub: 'मैं आपको दिखाऊँगी कि अपना सामान कैसे बेचें। सिर्फ़ फोटो लीजिए और बोलिए।',
  tourSpeaks: 'यहाँ हर चीज़ बोलती है',
  tourSpeaksSub: 'जहाँ यह निशान दिखे, उसे दबाइए और सुनिए। पढ़ने की ज़रूरत नहीं।',
  tourTapToHear: 'मुझे दबाकर सुनिए',
  tourHeard: 'शाबाश! अब आगे बढ़िए',
  tourPhoto: 'पहले फोटो लीजिए',
  tourPhotoSub: 'बड़ा हरा बटन दबाइए और अपने सामान की फोटो लीजिए',
  tourCleaning: 'ऐप खुद फोटो साफ़ कर देता है',
  tourCleaningSub: 'पीछे का सामान हट जाता है और सफ़ेद हो जाता है — बिल्कुल दुकान जैसी फोटो',
  tourSpeakStep: 'अब बोलकर बताइए',
  tourSpeakSub: 'माइक दबाइए और अपने सामान के बारे में बोलिए, अपनी भाषा में',
  tourListing: 'ऐप ने आपके लिए लिख दिया',
  tourListingSub: 'आपकी बात से ऐप ने पूरा विवरण बना दिया — हिंदी और अंग्रेज़ी दोनों में',
  tourPriceStep: 'तीन दाम दिखेंगे',
  tourPriceSub: 'आपकी लागत, बाज़ार का दाम, और हमारा सुझाव। लागत से कम कभी मत बेचिए।',
  tourPublishStep: 'अब बेचने के लिए भेजिए',
  tourPublishSub: 'हरा निशान दबाइए और आपका सामान खरीदारों तक पहुँच जाएगा',
  tourOrders: 'ऑर्डर आने पर फ़ोन बोलेगा',
  tourOrdersSub: 'आपको सिर्फ़ हाँ या ना कहना है। बस इतना ही।',
  tourDone: 'बस! अब आप खुद कीजिए',
  tourStart: 'अपना सामान जोड़िए',
  demoTranscript: 'यह मिट्टी का घड़ा है, हाथ से बनाया है, पानी ठंडा रहता है',
  demoTitle: 'हाथ से बना मिट्टी का घड़ा',
  demoDesc: 'हाथ से बना मिट्टी का घड़ा, जिसमें पानी प्राकृतिक रूप से ठंडा रहता है।',

  remove: 'हटाइए',
  removeAsk: 'क्या सच में हटाना है?',
  removeYes: 'हाँ, हटा दीजिए',
  removeNo: 'नहीं, रहने दीजिए',
  removed: 'हटा दिया',
  cannotRemove: 'यह नहीं हट सकता',
  cannotRemoveOrders: 'इसका ऑर्डर आया हुआ है। पहले ऑर्डर पूरा कीजिए।',
  understood: 'ठीक है',
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
  sentTo: 'Live now on',
  plannedChannels: 'Planned channels',
  notConnectedYet: 'not connected yet',
  ourMarketplace: 'Buyer marketplace',
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
  messages: 'Talk to the buyer',
  noMessages: 'No messages yet',
  replyByVoice: 'Reply by speaking',
  buyerSaid: 'The buyer said',
  youSaid: 'You said',
  notTranslated: 'Could not translate',
  sending: 'Sending…',
  orders: 'Orders',
  newOrderCame: 'You have a new order',
  noOrders: 'No orders yet',
  accept: 'Yes, I will make it',
  decline: 'I cannot make it',
  markShipped: 'I have sent it',
  quantity: 'How many',
  pieces: 'pieces',
  youWillGet: 'You will get',
  neededBy: 'Needed by',
  buyerNote: 'The buyer said',
  statusPlaced: 'New order',
  statusAccepted: 'You said yes',
  statusDeclined: 'You said no',
  statusShipped: 'Sent',
  statusDelivered: 'Delivered',
  ordersWaiting: 'orders need your answer',

  learnHow: 'Learn how to sell',
  tourSkip: 'Skip',
  tourNext: 'Next',
  tourWelcome: 'Hello! This is KalaSetu',
  tourWelcomeSub: 'I will show you how to sell your work. Just take a photo and speak.',
  tourSpeaks: 'Everything here speaks',
  tourSpeaksSub: 'Wherever you see this mark, press it and listen. No reading needed.',
  tourTapToHear: 'Press me and listen',
  tourHeard: 'Well done! Now carry on',
  tourPhoto: 'First, take a photo',
  tourPhotoSub: 'Press the big button and photograph your product',
  tourCleaning: 'The app cleans the photo itself',
  tourCleaningSub: 'The background disappears and turns white — a proper shop photo',
  tourSpeakStep: 'Now speak about it',
  tourSpeakSub: 'Press the microphone and describe your product, in your own language',
  tourListing: 'The app wrote it for you',
  tourListingSub: 'From your words it made the whole description — in Hindi and English',
  tourPriceStep: 'You will see three prices',
  tourPriceSub: 'Your cost, the market price, and our suggestion. Never sell below your cost.',
  tourPublishStep: 'Now send it to sell',
  tourPublishSub: 'Press the green tick and your product reaches buyers',
  tourOrders: 'The phone will tell you when an order comes',
  tourOrdersSub: 'You only have to say yes or no. That is all.',
  tourDone: 'That is it! Now try it yourself',
  tourStart: 'Add your product',
  demoTranscript: 'This is a clay pot, made by hand, it keeps water cool',
  demoTitle: 'Handmade clay water pot',
  demoDesc: 'A handmade clay pot that keeps water naturally cool.',

  remove: 'Remove',
  removeAsk: 'Really remove this?',
  removeYes: 'Yes, remove it',
  removeNo: 'No, keep it',
  removed: 'Removed',
  cannotRemove: 'This cannot be removed',
  cannotRemoveOrders: 'It has an order. Finish the order first.',
  understood: 'All right',
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
