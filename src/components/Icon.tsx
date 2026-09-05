/**
 * Every symbol in the app, drawn here.
 *
 * This file used to hold six icons and an argument for why the rest could stay
 * as emoji: that a camera emoji IS a camera, so she recognises it. The first
 * half of that is true and the second half was wrong. Emoji are drawn by the
 * phone, not by us — a glossy skeuomorphic camera on one Android, a flat grey
 * one on the next, at whatever size and colour the vendor chose. Put twelve of
 * them on a screen and nothing lines up: some are bright, some are dull, the
 * speaker in the header is a different weight from the speaker in the card, and
 * none of them can take the ink colour of the text they sit beside.
 *
 * So they are all drawn now, one hand, one stroke weight. The objects are still
 * objects — the camera is a camera, the bin is a bin — she loses no recognition
 * and gains a screen that looks made rather than assembled.
 *
 * What is deliberately NOT here: ✅ and ❌, because the green and the red are
 * doing the work and a monochrome stroke would throw it away, and 🔔, which is
 * the one place a loud vendor-coloured glyph is exactly right.
 *
 * Sized in `em` and stroked in `currentColor`, so they take the font size and
 * the colour of whatever they sit in and nothing has to be kept in sync.
 */

export type IconName =
  // Abstractions, which were never the phone's to draw.
  | 'next'        // was 👉
  | 'rewrite'     // was ✍️ and ✏️
  | 'learn'       // was 🎓
  | 'market'      // was 🛍
  | 'back'        // was ↩️
  | 'gotIt'       // was 👍
  | 'ai'          // the one mark that means "the app is doing this for you"
  // Objects, which the phone drew inconsistently.
  | 'speak'       // was 🔊
  | 'mic'         // was 🎤
  | 'stop'        // was ⏹
  | 'redo'        // was 🔄
  | 'keyboard'    // was ⌨️
  | 'camera'      // was 📷
  | 'box'         // was 📦
  | 'trash'       // was 🗑
  | 'rising'      // was 📈
  | 'language'    // was 🗣
  | 'chat'        // was 💬

const PATHS: Record<IconName, React.ReactNode> = {
  /* A four-pointed spark. Used ONLY where the app is doing work on her
     behalf, so it comes to mean that and nothing else. Not a robot, not a
     brain, not a chat bubble — she is not being sold an AI, she is being
     helped. */
  ai: (
    <>
      <path d="M12 3.2 13.7 9 19.5 10.7 13.7 12.4 12 18.2 10.3 12.4 4.5 10.7 10.3 9z" />
      <path d="M18.4 16.6 19.1 18.9 21.4 19.6 19.1 20.3 18.4 22.6 17.7 20.3 15.4 19.6 17.7 18.9z" />
    </>
  ),

  next: <path d="M4 12h15M13 5.5 19.5 12 13 18.5" />,

  rewrite: (
    <>
      <path d="M4 20.5h4.2L20 8.7a2.6 2.6 0 0 0-3.7-3.7L4.5 16.8z" />
      <path d="M14.8 6.5 18.5 10.2" />
    </>
  ),

  learn: (
    <>
      <path d="M12 4 2.5 8.6 12 13.2l9.5-4.6z" />
      <path d="M6.5 10.9V16c0 1.6 2.5 2.9 5.5 2.9s5.5-1.3 5.5-2.9v-5.1" />
      <path d="M21.5 8.6v5.2" />
    </>
  ),

  market: (
    <>
      <path d="M5 8h14l1.1 11.5a1 1 0 0 1-1 1.1H4.9a1 1 0 0 1-1-1.1z" />
      <path d="M8.6 10.5V6.8a3.4 3.4 0 0 1 6.8 0v3.7" />
    </>
  ),

  back: (
    <>
      <path d="M9.5 15 5 10.5 9.5 6" />
      <path d="M5 10.5h9.2a4.8 4.8 0 0 1 0 9.6H11" />
    </>
  ),

  gotIt: (
    <>
      <path d="M7.5 21.5V10.2l4.6-7.4a1.9 1.9 0 0 1 2.9 2l-1.2 4.7h5a1.9 1.9 0 0 1 1.9 2.3l-1.5 6.9a1.9 1.9 0 0 1-1.9 1.5z" />
      <path d="M7.5 10.6H3.6v10.9h3.9" />
    </>
  ),

  /* The most-repeated mark in the app: it is on almost every line of text,
     because almost every line can be heard instead of read. Two arcs, not
     three — at 16px the third becomes a smudge. */
  speak: (
    <>
      <path d="M4 9.4h3.3L12 5.2v13.6L7.3 14.6H4a.9.9 0 0 1-.9-.9v-3.4a.9.9 0 0 1 .9-.9z" />
      <path d="M15.4 9.3a4 4 0 0 1 0 5.4" />
      <path d="M18.1 6.5a7.9 7.9 0 0 1 0 11" />
    </>
  ),

  mic: (
    <>
      <rect x="9" y="2.6" width="6" height="11.3" rx="3" />
      <path d="M5.4 11.3a6.6 6.6 0 0 0 13.2 0" />
      <path d="M12 17.9v3.5" />
    </>
  ),

  /* Filled, alone among these. It is the one control that must read as ON at a
     glance, from across a room, while she is talking and not looking. */
  stop: <rect x="6.4" y="6.4" width="11.2" height="11.2" rx="2.4" fill="currentColor" stroke="none" />,

  redo: (
    <>
      <path d="M20.6 12a8.6 8.6 0 1 1-2.6-6.1" />
      <path d="M20.7 4.2v5.3h-5.3" />
    </>
  ),

  keyboard: (
    <>
      <rect x="2.4" y="6" width="19.2" height="12" rx="2.2" />
      <path d="M6.4 9.7h.01M9.9 9.7h.01M13.4 9.7h.01M16.9 9.7h.01M6.4 13.1h.01M9.9 13.1h.01M13.4 13.1h.01M16.9 13.1h.01" />
      <path d="M8.6 16.3h6.8" />
    </>
  ),

  camera: (
    <>
      <path d="M3.4 8.4h3.4l1.5-2.6h7.4l1.5 2.6h3.4a1.3 1.3 0 0 1 1.3 1.3v8.3a1.3 1.3 0 0 1-1.3 1.3H3.4a1.3 1.3 0 0 1-1.3-1.3V9.7a1.3 1.3 0 0 1 1.3-1.3z" />
      <circle cx="12" cy="13.7" r="3.6" />
    </>
  ),

  box: (
    <>
      <path d="M3.3 7.7 12 3.4l8.7 4.3v8.6L12 20.6l-8.7-4.3z" />
      <path d="M3.3 7.7 12 12l8.7-4.3" />
      <path d="M12 12v8.6" />
    </>
  ),

  trash: (
    <>
      <path d="M4.6 6.6h14.8" />
      <path d="M9.5 6.6V4.9a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" />
      <path d="M6.5 6.6l.9 12.5a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5l.9-12.5" />
      <path d="M10.3 10.4v6.3M13.7 10.4v6.3" />
    </>
  ),

  /* Her income going up. The only icon in the app that makes a promise, so it
     is used on exactly two screens and nowhere decorative. */
  rising: (
    <>
      <path d="M3.4 3.4v16.2a1 1 0 0 0 1 1h16.2" />
      <path d="M7.4 15.9 11.3 11l3 2.6 4.5-5.8" />
      <path d="M15.5 7.8h3.5v3.5" />
    </>
  ),

  chat: (
    <path d="M3.4 4.2h17.2a1.3 1.3 0 0 1 1.3 1.3v9.3a1.3 1.3 0 0 1-1.3 1.3H10.3l-5 4.2v-4.2H3.4a1.3 1.3 0 0 1-1.3-1.3V5.5a1.3 1.3 0 0 1 1.3-1.3z" />
  ),

  language: (
    <>
      <circle cx="12" cy="12" r="8.7" />
      <path d="M3.3 12h17.4" />
      <path d="M12 3.3c2.2 2.4 3.4 5.4 3.4 8.7S14.2 18.3 12 20.7c-2.2-2.4-3.4-5.4-3.4-8.7S9.8 5.7 12 3.3z" />
    </>
  ),
}

export default function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24" width="1em" height="1em"
      fill="none" stroke="currentColor" strokeWidth="1.9"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden focusable="false"
      className={'inline-block shrink-0 ' + className}
    >
      {PATHS[name]}
    </svg>
  )
}
