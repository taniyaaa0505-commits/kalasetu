/**
 * What the QR code opens: the product's card, for anyone holding the product.
 *
 * A buyer in a shop, a cooperative checking a consignment, a judge scanning a
 * tag off a slide. No sign-in, English, and deliberately thin — the whole
 * value here is that a stranger can look up an object and be told who first
 * claimed to have made it.
 *
 * NOTHING PRIVATE. Not her phone number, not her uid, not her address, not
 * her name — the maker appears as a stable four-character label that is the
 * same on every piece she registers and identifies her to nobody. The page is
 * public by design and has to be safe to print on a paper tag and leave in a
 * stranger's hand.
 *
 * It also states its own limits, in the same size type as everything else: an
 * entry here means somebody registered this first, and that is all it means.
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Scallop } from '../components/Ornament'
import { getRegistration, makerLabel, type Registration } from '../services/identity'

export default function PublicCard() {
  const { code = '' } = useParams()
  const nav = useNavigate()
  const [reg, setReg] = useState<Registration | null>()

  useEffect(() => { void getRegistration(code).then(r => setReg(r ?? null)) }, [code])

  return (
    <div className="min-h-full bg-paper">
      <header className="jaali relative bg-night px-6 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))] text-surface">
        <div className="flex items-center gap-3">
          <img src="./icons/mark-96.png" alt="" aria-hidden width={36} height={36}
            className="shrink-0 rounded-lg ring-1 ring-gold-leaf/50" />
          <div>
            <h1 className="text-xl font-bold leading-tight tracking-tight text-surface">Product identity</h1>
            <p className="text-sm text-surface/65">Pehchaan · who made this piece</p>
          </div>
        </div>
        <Scallop className="absolute inset-x-0 -bottom-2 text-night" />
      </header>

      <div className="mx-auto max-w-lg p-6">
        {reg === undefined && (
          <p className="text-sm text-ink-3">Looking this up…</p>
        )}

        {reg === null && (
          <div className="rounded-panel border border-line-2/70 bg-surface p-5 shadow-card">
            <p className="font-display text-lg font-bold">No product with this code</p>
            <p className="mt-1 text-sm leading-snug text-ink-2">
              Nothing has been registered as <strong>{code}</strong>. A code that does not
              resolve is not evidence of anything either way — it may simply never have
              been registered.
            </p>
          </div>
        )}

        {reg && (
          <>
            <section className="rounded-panel border-2 border-gold bg-surface p-5 shadow-card">
              {reg.thumb && (
                <img src={reg.thumb} alt="" decoding="async"
                  className="arch mb-4 aspect-square w-full max-w-[14rem] rounded-b-panel border border-line-2/70 object-cover" />
              )}
              <p className="font-display text-3xl font-bold leading-none tracking-tight text-gold">{reg.id}</p>
              {reg.title && <p className="mt-2 text-base text-ink-2">{reg.title}</p>}
              {(reg.craft || reg.material) && (
                <p className="mt-0.5 text-sm text-ink-3">{[reg.craft, reg.material].filter(Boolean).join(' · ')}</p>
              )}

              <dl className="mt-5 flex flex-col gap-2 text-[15px]">
                <Row label="Original maker" value={makerLabel(reg.makerId)} strong />
                {reg.ownerId !== reg.makerId && (
                  <Row label="Current owner" value={makerLabel(reg.ownerId)} />
                )}
                <Row label="Registered" value={new Date(reg.registeredAt).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })} />
                <Row label="Evidence of making" value={reg.evidence ? 'Available' : 'Not on file'} />
              </dl>

              {/* Said here rather than in a footnote: the difference between
                  these two lines is the entire feature. */}
              {reg.ownerId !== reg.makerId && (
                <p className="mt-4 rounded-card border border-line-2/70 bg-wash px-3 py-2.5 text-sm leading-snug text-ink-2">
                  This piece is being sold by someone other than its maker, and says so.
                  The maker's name does not change when a piece changes hands.
                </p>
              )}
            </section>

            <p className="mt-4 text-sm leading-relaxed text-ink-3">
              <strong className="text-ink-2">What this card is.</strong> A record that this
              product was registered by this maker on this date, in an app the maker uses to
              list her own work. It is not an authentication and we do not claim it is one:
              it means somebody registered it first.
              {reg.conflictWith && (
                <> This piece was registered even though it resembled <strong>{reg.conflictWith}</strong>,
                and that is recorded here rather than hidden.</>
              )}
              {!reg.checked && <> The check against existing registrations could not run when
                this was registered — the device was offline.</>}
            </p>

            <button onClick={() => nav('/buyer')}
              className="press mt-5 min-h-0 rounded-card border border-line-2/70 bg-surface px-4 py-3 text-sm font-medium text-ink-2">
              See other pieces from these makers →
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-1.5 last:border-0">
      <dt className="text-ink-3">{label}</dt>
      <dd className={'text-right ' + (strong ? 'font-semibold text-ink' : 'text-ink-2')}>{value}</dd>
    </div>
  )
}
