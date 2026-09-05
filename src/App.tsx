import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './screens/Home'
import Capture from './screens/Capture'
import SpeakScreen from './screens/Speak'
import Review from './screens/Review'
import Price from './screens/Price'
import Publish from './screens/Publish'
import Buyer from './screens/Buyer'
import BuyerProduct from './screens/BuyerProduct'
import Chat from './screens/Chat'
import Orders from './screens/Orders'
import Start from './screens/Start'
import Impact from './screens/Impact'
import StorageError from './components/StorageError'
import QueueRunner from './components/QueueRunner'

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
  return (
    <HashRouter>
      <StorageError />
      <QueueRunner />
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
        <Route path="/buyer"         element={<Buyer />} />
        <Route path="/impact"        element={<Impact />} />
        <Route path="/buyer/:id"     element={<BuyerProduct />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
