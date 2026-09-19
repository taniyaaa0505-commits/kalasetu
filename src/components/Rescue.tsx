/**
 * What she sees instead of a white screen.
 *
 * Reported from a phone: "shows a blank page". Nothing in the source
 * explained it, because the cause is not in the source — it is in the gap
 * between two deploys.
 *
 * Screens are fetched on demand now (App.tsx), so the page she has open asks
 * for `Review-CdzQGcm6.js` by name. Deploy twice while she is holding the
 * phone and that file no longer exists: the installed app kept the old
 * index.html in its service-worker cache, the chunk it names is gone, the
 * dynamic import rejects — and React, with no error boundary anywhere in the
 * tree, unmounts everything. White screen, no buttons, nothing to press. For
 * a woman who cannot read an error message, a blank screen and a broken app
 * are the same thing, and both mean her shop is gone.
 *
 * So, two nets, in order:
 *
 *  1. A failed chunk fetch reloads the page, once. A reload re-fetches
 *     index.html, which names the chunks that do exist. That fixes it
 *     silently and she never learns anything happened.
 *  2. If it happens again — the reload did not help, or the crash was
 *     something else entirely — this catches it and puts a button on the
 *     screen. Spoken, because she cannot read it.
 *
 * ONCE is the whole design of the first net. A reload loop on a phone is
 * worse than any error: the screen flashes forever and she cannot even reach
 * the button that would have saved her.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { speak } from '../lib/speak'
import { t, getLang } from '../lib/i18n'
import { asrCode } from '../types'

const RELOADED = 'kalasetu.rescue.reloaded'

/** True when this looks like a screen that could not be downloaded. */
function isChunkFailure(err: unknown): boolean {
  const s = String((err as Error)?.message ?? err)
  return /dynamically imported module|Importing a module script failed|Failed to fetch|ChunkLoadError|error loading dynamically/i.test(s)
}

/** Reload, but never twice — see the header. */
function reloadOnce(): boolean {
  try {
    if (sessionStorage.getItem(RELOADED) === '1') return false
    sessionStorage.setItem(RELOADED, '1')
  } catch { return false }      // no storage: a loop is the risk, so do not
  location.reload()
  return true
}

/**
 * Vite fires this when a preloaded chunk cannot be fetched — which is the
 * common case above, and it fires BEFORE React ever sees an error.
 */
export function watchForStaleChunks() {
  window.addEventListener('vite:preloadError', e => {
    e.preventDefault()          // stop it becoming an unhandled rejection
    reloadOnce()
  })
  // Clear the guard once a page has run for a while. Without this, one rescue
  // in the morning spends the only reload she gets all day.
  setTimeout(() => { try { sessionStorage.removeItem(RELOADED) } catch { /* fine */ } }, 30_000)
}

export default class Rescue extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Logged in full: this is the one place a crash on her phone leaves a
    // trace anybody can read.
    console.error('[rescue] a screen crashed', error, info.componentStack)
    if (isChunkFailure(error) && reloadOnce()) return
    try { speak(t('rescueSaid'), asrCode(getLang())) } catch { /* the voice is not the point */ }
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-5 bg-paper p-8 text-center">
        <img src="./icons/icon-192.png" alt="" aria-hidden width={96} height={96}
          className="rounded-3xl shadow-card ring-1 ring-gold-leaf/40" />
        {/* Her shop is not gone. That is the only fact that matters here, and
            it is the one a blank screen fails to tell her. */}
        <p className="font-display text-xl font-semibold leading-snug">{t('rescueSaid')}</p>
        <button
          onClick={() => { try { sessionStorage.removeItem(RELOADED) } catch { /* fine */ } location.reload() }}
          className="press min-h-0 rounded-card bg-indigo px-6 py-4 text-lg font-semibold text-white shadow-card"
        >
          {t('rescueRetry')}
        </button>
      </div>
    )
  }
}
