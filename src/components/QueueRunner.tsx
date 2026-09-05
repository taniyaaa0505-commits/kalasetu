/**
 * Keeps the promises the app made while it had no signal.
 *
 * Mounted once, beside the router, so it runs wherever she happens to be —
 * she can park a listing on the description screen, walk to the price screen,
 * and have it finish under her without going back.
 *
 * It renders nothing. The result appears where it belongs: the product gains
 * its listing, and any screen watching that product redraws itself.
 */
import { useEffect } from 'react'
import { drain, isOnline, onConnectivityChange, type Job } from '../services/queue'
import { getProduct, patchProduct } from '../services/db'
import { generateListing } from '../services/gemini'
import { getLang } from '../lib/i18n'
import { cloudEnabled, firestore } from '../services/firebase'

async function perform(job: Job): Promise<void> {
  if (job.kind !== 'generate-listing') return
  const p = await getProduct(job.productId)
  // She deleted it, or it already got written on another screen. Either way
  // the promise is discharged; returning cleanly drops the job.
  if (!p || p.listing) return

  const listing = await generateListing(
    p.cleanPhoto ?? p.photo ?? '', p.transcript ?? '', p.lang ?? getLang(), p.answers ?? [],
  )
  await patchProduct(job.productId, { listing })
}

export default function QueueRunner() {
  // Pull the Firestore chunk down while there is a signal to pull it with.
  //
  // It is deliberately kept out of the precache — 700 KB that a phone with no
  // cloud configured would never need. But it is loaded by a dynamic import,
  // and offline that import simply fails: every read of a product rejects and
  // screens that wait on one hang. Fetching it once, early, while online puts
  // it in the runtime cache so the offline path has something to load.
  useEffect(() => {
    if (!cloudEnabled() || !isOnline()) return
    let alive = true

    // AFTER the service worker is controlling, not before. On the very first
    // visit the worker installs while the page is already running, so a fetch
    // made on mount goes straight to the network and is never seen — measured:
    // the heavy-libs cache stayed empty and the next offline start could not
    // import Firestore at all. Waiting for `ready` costs a few hundred
    // milliseconds once and is the difference between working offline on the
    // second run and only on the third.
    const warm = () => { if (alive) void firestore().catch(() => { /* signal went again */ }) }
    if ('serviceWorker' in navigator) navigator.serviceWorker.ready.then(warm).catch(warm)
    else warm()

    return () => { alive = false }
  }, [])

  useEffect(() => {
    let alive = true
    const go = () => { if (alive && isOnline()) void drain(perform) }

    go()                                     // anything parked from last time
    const off = onConnectivityChange(online => { if (online) go() })

    // The `online` event is not reliable on Android — a phone can regain a
    // usable connection without firing it. A slow poll costs nothing and is
    // the difference between the promise being kept and being forgotten.
    const timer = setInterval(go, 30_000)

    return () => { alive = false; off(); clearInterval(timer) }
  }, [])

  return null
}
