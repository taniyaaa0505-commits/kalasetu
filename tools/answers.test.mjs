// The question loop on the listing screen: the AI asks instead of guessing,
// she answers out loud, the listing is written again knowing what she said.
//
// Two failures here would be invisible until a demo: an answer silently
// replacing a different one, and a free-form remark being fed back to the
// model as though it answered a question nobody asked.

// mirrors record() in screens/Review.tsx
function record(answers, question, answer) {
  return question
    ? [...answers.filter(a => a.question !== question), { question, answer }]
    : [...answers, { question, answer }]
}

// mirrors answersBlock() in services/gemini.ts
function block(answers) {
  const replies = answers.filter(a => a.question && a.answer.trim())
  const extras = answers.filter(a => !a.question && a.answer.trim())
  if (!replies.length && !extras.length) return ''
  let out = 'HEADER'
  for (const a of replies) out += `\nQ: ${a.question}\nA: """${a.answer}"""`
  for (const a of extras) out += `\nShe also added, unprompted: """${a.answer}"""`
  return out
}

// mirrors the `extras` list in screens/Review.tsx
function extras(answers, questions) {
  const asked = new Set(questions)
  return answers.filter(a => !a.question || !asked.has(a.question))
}

const SIZE = 'इसका नाप क्या है?'
const MADE = 'यह किस चीज़ पर बना है?'

let bad = 0
const check = (name, cond) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}`)
  if (!cond) bad++
}

/* --- keeping her answers --------------------------------------------- */

// "Say it again" must overwrite, or the model sees both the wrong answer and
// the correction and has to guess which she meant.
let a = record(record([], SIZE, 'दो फुट'), SIZE, 'डेढ़ फुट')
check('re-answering a question replaces the first attempt',
  a.length === 1 && a[0].answer === 'डेढ़ फुट')

// Free-form remarks answer nothing, so nothing identifies a duplicate. They
// accumulate — losing one would lose the only thing she volunteered herself.
a = record(record([], '', 'दिवाली के लिए बनाया है'), '', 'रंग पक्का है')
check('free-form additions accumulate rather than replace', a.length === 2)

a = record(record([], SIZE, 'डेढ़ फुट'), MADE, 'मिट्टी')
check('different questions are kept side by side', a.length === 2)

/* --- what the model is told ------------------------------------------ */

a = [{ question: SIZE, answer: 'डेढ़ फुट' }, { question: '', answer: 'दिवाली के लिए' }]
const text = block(a)
check('an answer is sent under its own question', text.includes(`Q: ${SIZE}`))
check('a free-form remark is NOT sent under a question',
  text.includes('unprompted') && !text.includes('Q: \n') && !/Q: *\nA: *"""दिवाली/.test(text))

check('nothing to say means no block at all', block([]) === '')
check('blank answers never reach the model',
  block([{ question: SIZE, answer: '   ' }, { question: '', answer: '' }]) === '')

/* --- what she sees --------------------------------------------------- */

// After a rewrite the model stops asking what she answered. Her words must not
// vanish with the question — she cannot scroll back to a previous draft.
a = [{ question: SIZE, answer: 'डेढ़ फुट' }, { question: '', answer: 'दिवाली के लिए' }]
check('an answered question that is no longer asked moves to "you also told us"',
  extras(a, [MADE]).length === 2)
check('an answer still being asked about stays under its question',
  extras(a, [SIZE]).length === 1 && extras(a, [SIZE])[0].question === '')

console.log(bad ? `\n${bad} FAILURES` : `\nall checks passed — no answer lost, none misattributed`)
process.exit(bad ? 1 : 0)
