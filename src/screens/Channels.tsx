/**
 * The on-ramp, as a screen.
 *
 * NOT part of her app. She never comes here and there is nothing here for her
 * to do — this is the coordinator's surface, in English, next to the buyer
 * board and the impact dashboard: the three screens that exist for the person
 * asking what this thing actually produces.
 *
 * It answers the question we lost the last round on. "You said you were an
 * on-ramp to ONDC and GeM, and you built your own buyer board." True. This is
 * the catalogue in the format each of those channels ingests, downloadable,
 * with its own README saying exactly what it still needs before it is a live
 * listing — because the one thing worse than not being integrated is claiming
 * to be.
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { subscribePublished } from '../services/db'
import {
  CHANNELS, bulkSheet, ondcCatalog, readme, sellable, type Channel,
} from '../services/channels'
import { dataUrlToBytes, zip } from '../services/zip'
import { Scallop } from '../components/Ornament'
import Icon from '../components/Icon'
import type { Product } from '../types'

/**
 * The seller of record: the body that holds the registration, not the artisan.
 *
 * Every one of these networks requires a registered entity with a GST number,
 * which is the whole reason a student team cannot list on them — and also the
 * reason this is the right design rather than a workaround. A cluster producer
 * company or an SHG federation is already a registered seller on GeM; what it
 * does not have is three hundred listings written in English with clean
 * photographs. That is the half we can do.
 *
 * The address is the cluster's, deliberately. Publishing a woman's home
 * address on an open network because a schema has a field for it is not a
 * thing this project will do.
 */
const SELLER = {
  name: 'Mithila Crafts Producer Company',
  city: 'std:06272',
  gps: '26.1197,85.8918',
  address: { street: 'Jitwarpur Cluster', city: 'Madhubani', state: 'Bihar', area_code: '847211' },
}

export default function Channels() {
  const nav = useNavigate()
  const [all, setAll] = useState<Product[]>([])
  const [seller, setSeller] = useState(SELLER.name)
  const [busy, setBusy] = useState<string>()
  const [done, setDone] = useState<string>()

  // The same feed the buyer board watches: published, capped, newest first.
  useEffect(() => subscribePublished(setAll, 100), [])

  const ready = useMemo(() => all.filter(sellable), [all])

  async function download(channel: Channel) {
    setBusy(channel.id); setDone(undefined)
    try {
      const opts = { ...SELLER, sellerName: seller, imageBase: 'images' }
      const files = [
        { name: 'README.txt', body: readme(channel, ready.length, seller) },
        channel.id === 'ondc'
          ? { name: 'ondc-on_search-catalogue.json', body: JSON.stringify(ondcCatalog(all, opts), null, 2) }
          : { name: `${channel.id}-listings.csv`, body: bulkSheet(all, seller) },
        // One photograph per listing, at the name the sheet and the catalogue
        // both point at. This is what makes the bundle uploadable rather than
        // a spreadsheet full of dead links.
        ...ready.filter(p => p.cleanPhoto ?? p.photo)
          .map(p => ({ name: `images/${p.id}.jpg`, body: dataUrlToBytes((p.cleanPhoto ?? p.photo)!) })),
      ]
      const url = URL.createObjectURL(zip(files))
      const a = document.createElement('a')
      a.href = url
      a.download = `pehchaan-${channel.id}-${new Date().toISOString().slice(0, 10)}.zip`
      a.click()
      // Revoked on the next tick: Safari has not finished reading it yet when
      // click() returns, and a revoked URL downloads a zero-byte file.
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      setDone(channel.id)
    } finally { setBusy(undefined) }
  }

  return (
    <div className="min-h-full bg-paper">
      <header className="jaali relative bg-night px-6 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))] text-surface">
        <button onClick={() => nav('/buyer')} className="press min-h-0 py-1.5 pr-2 text-sm text-surface/70">
          ← marketplace
        </button>
        <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight text-surface">Market linkage</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-surface/65">
          One catalogue, four channels. Each download is the file that channel ingests — the
          listings written from the artisans' own photographs and voices, with their photographs
          beside them.
        </p>
        <Scallop className="absolute inset-x-0 -bottom-2 text-night" />
      </header>

      <div className="mx-auto max-w-3xl p-6">
        <div className="mb-6 rounded-panel border border-line-2/70 bg-surface p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">Seller of record</p>
          <input
            value={seller} onChange={e => setSeller(e.target.value)}
            className="mt-2 w-full rounded-card border border-line-2/70 bg-paper px-3.5 py-3 text-[15px] outline-none focus-visible:border-indigo"
          />
          <p className="mt-2 text-sm leading-snug text-ink-3">
            {SELLER.address.street}, {SELLER.address.city}, {SELLER.address.state} — {SELLER.address.area_code}.
            The cluster's address, never an artisan's home. Every one of these networks needs a registered
            entity with GST; the catalogue is the half a student team can build, and the half that does not
            exist today.
          </p>
        </div>

        <p className="mb-4 text-sm text-ink-2">
          <strong className="font-semibold text-ink">{ready.length}</strong> listing{ready.length === 1 ? '' : 's'} ready
          to export — published, owned by a maker, priced, and passed the handmade check.
        </p>

        <ul className="flex flex-col gap-4">
          {CHANNELS.map(c => (
            <li key={c.id} className="rounded-panel border border-line-2/70 bg-surface p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold leading-tight">{c.name}</p>
                  <p className="mt-0.5 text-sm text-ink-3">{c.format}</p>
                </div>
                <button
                  onClick={() => download(c)} disabled={busy !== undefined || ready.length === 0}
                  className="press min-h-0 shrink-0 rounded-card bg-indigo px-4 py-2.5 text-sm font-semibold text-white shadow-card disabled:opacity-40 disabled:shadow-none"
                >
                  {busy === c.id ? 'Packing…' : done === c.id ? 'Downloaded ✓' : 'Download bundle'}
                </button>
              </div>

              {/* Said on the screen, not only in the README. This list is the
                  difference between an on-ramp and a claim. */}
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-gold">
                Still needed before this is live
              </p>
              <ul className="mt-1.5 flex flex-col gap-1">
                {c.gaps.map(g => (
                  <li key={g} className="flex gap-2 text-sm leading-snug text-ink-2">
                    <span aria-hidden className="text-gold">•</span>{g}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        <p className="mt-6 flex items-start gap-2 rounded-card border border-line-2/70 bg-gold-wash px-4 py-3 text-sm leading-snug text-ink-2">
          <Icon name="gotIt" className="mt-0.5 shrink-0 text-gold" />
          <span>
            We are not connected to any of these networks, and we do not say we are. The ONDC file is built
            to the published <code>on_search</code> schema and every field it marks required is checked by
            our test suite on each build; the marketplace sheets carry the columns those uploads ask for.
            What is missing in each case is a seller account, which needs a registered entity — and the
            organisations that already have one are exactly who this file is for.
          </span>
        </p>
      </div>
    </div>
  )
}
