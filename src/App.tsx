import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './screens/Home'
import StorageError from './components/StorageError'
import QueueRunner from './components/QueueRunner'

/*
 * Home is imported outright; everything else is fetched when it is needed.
 *
 * All fifteen screens used to be in the first bundle — the price screen, the
 * buyer marketplace, the impact dashboard — and every one of them had to be
 * parsed before the home screen could paint. On the phone this app is for,
 * that is the difference between opening and waiting. Home is the one screen
 * that must be instant, so it is the one screen that stays.
 *
 * The rest would each cost a fetch at the moment she taps, which is the wrong
 * trade for the camera — so `warm()` below pulls the golden path down while
 * she is still reading the home screen. By the time she presses anything it
 * is already in memory, and the split costs her nothing.
 */
const Capture      = lazy(() => import('./screens/Capture'))
const SpeakScreen  = lazy(() => import('./screens/Speak'))
const Review       = lazy(() => import('./screens/Review'))
const Price        = lazy(() => import('./screens/Price'))
const Publish      = lazy(() => import('./screens/Publish'))
const Buyer        = lazy(() => import('./screens/Buyer'))
const BuyerProduct = lazy(() => import('./screens/BuyerProduct'))
const Chat         = lazy(() => import('./screens/Chat'))
const Orders       = lazy(() => import('./screens/Orders'))
const Messages     = lazy(() => import('./screens/Messages'))
const Start        = lazy(() => import('./screens/Start'))
const Account      = lazy(() => import('./screens/Account'))
const Impact       = lazy(() => import('./screens/Impact'))
const Channels     = lazy(() => import('./screens/Channels'))

/**
 * Fetch the next screens while nobody is waiting for them.
 *
 * In the order she meets them, and only once the browser says it is idle, so
 * this never competes with the home screen's own first paint. A failure is
 * silence: these are prefetches, and React.lazy will simply fetch it again
 * when the route is actually opened.
 */
function warm() {
  const queue = [
    () => import('./screens/Capture'),
    () => import('./screens/Speak'),
    () => import('./screens/Review'),
    () => import('./screens/Price'),
    () => import('./screens/Publish'),
  ]
  const idle = (fn: () => void) =>
    'requestIdleCallback' in window
      ? (window as unknown as { requestIdleCallback: (f: () => void) => void }).requestIdleCallback(fn)
      : setTimeout(fn, 400)
  // One at a time: five parallel fetches on a 3G connection is five slow
  // fetches, and the camera screen is the only one she needs soon.
  const next = () => { const job = queue.shift(); if (job) void job().then(() => idle(next)).catch(() => {}) }
  idle(next)
}

/**
 * What shows while a screen is being fetched — the same gold thread the buyer
 * page uses, not the word "Loading", which she cannot read. On a warm cache
 * this is never seen at all.
 */
function Waiting() {
  return (
    <div className="flex min-h-full items-center justify-center bg-paper p-10">
      <span aria-label="Loading" role="status"
        className="block h-1 w-40 overflow-hidden rounded-full bg-gold-leaf/25">
        <span className="pull block h-full w-1/3 rounded-full bg-gold-leaf" />
      </span>
    </div>
  )
}

/**
 * HashRouter, not BrowserRouter, on purpose: URLs look like /#/p/123/capture,
 * which means the built `dist` folder works on ANY static host at ANY path —
 * GitHub Pages, Netlify, Firebase, even opened from a USB stick — with no
 * server rewrite rules and no 404 on refresh. One less class of bug.
 *
 * The golden path, as routes. Read top to bottom and you have the demo:
 *   capture -> speak -> review -> price -> publish
 */
export default function App() {
  useEffect(warm, [])

  return (
    <HashRouter>
      <StorageError />
      <QueueRunner />
      <Suspense fallback={<Waiting />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/start"         element={<Start />} />
          <Route path="/p/:id/capture" element={<Capture />} />
          <Route path="/p/:id/speak"   element={<SpeakScreen />} />
          <Route path="/p/:id/review"  element={<Review />} />
          <Route path="/p/:id/price"   element={<Price />} />
          <Route path="/p/:id/publish" element={<Publish />} />
          <Route path="/p/:id/chat"    element={<Chat />} />
          <Route path="/orders"        element={<Orders />} />
          <Route path="/messages"      element={<Messages />} />
          <Route path="/buyer"         element={<Buyer />} />
          <Route path="/account"       element={<Account />} />
          <Route path="/impact"        element={<Impact />} />
          <Route path="/channels"      element={<Channels />} />
          <Route path="/buyer/:id"     element={<BuyerProduct />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
