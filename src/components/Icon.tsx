/**
 * The six symbols that were emoji and should not have been.
 *
 * Emoji are right when the thing IS the thing — a camera for "take a photo", a
 * microphone for "speak", a bin for "delete". She recognises the object. They
 * are wrong when they stand for an abstraction: a pointing hand is not "next",
 * a graduation cap is not "learn to sell", a shopping bag is not "marketplace".
 * Those read as decoration, and worse, they are drawn differently on every
 * phone — a yellow cartoon hand on one Android and a flat grey glyph on the
 * next, at whatever size the vendor felt like.
 *
 * These are drawn once, here, so they match each other and the rest of the UI.
 *
 * Sized in `em` and stroked in `currentColor`, so they take the font size and
 * the colour of whatever they sit in and nothing has to be kept in sync.
 */

export type IconName =
  | 'next'        // was 👉
  | 'rewrite'     // was ✍️
  | 'learn'       // was 🎓
  | 'market'      // was 🛍
  | 'back'        // was ↩️
  | 'gotIt'       // was 👍

const PATHS: Record<IconName, React.ReactNode> = {
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
