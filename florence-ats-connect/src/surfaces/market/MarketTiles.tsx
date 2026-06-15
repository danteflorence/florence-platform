// PUBLIC category interest tiles (/markets). Shows where FlorenceRN sees RN demand by
// market×role. UNCLAIMED tiles → "I'm interested" (capture nurse interest by market, NOT
// an application). CLAIMED tiles → link to the employer-authorized job card. Aggregate
// counts only; no employer identity for unclaimed demand.
import { useEffect, useState } from 'react'
import { api, type CategoryTileData } from '../../api'
import { Badge, Button, Card, Spinner, cx } from '../../lib/ui'

const ROLE_LABEL: Record<string, string> = {
  home_health_rn: 'Home Health RN', dialysis_rn: 'Dialysis RN', hospice_rn: 'Hospice RN',
  snf_rn: 'SNF RN', clinic_rn: 'Clinic RN', asc_rn: 'ASC RN', other_rn: 'RN',
}

export default function MarketTiles() {
  const [tiles, setTiles] = useState<CategoryTileData[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<CategoryTileData | null>(null)

  async function reload() { setLoading(true); try { setTiles(await api.publicTiles()) } finally { setLoading(false) } }
  useEffect(() => { void reload() }, [])

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-10">
      <header className="mb-6 flex items-center gap-2">
        <span className="font-display text-xl font-bold tracking-tight text-florence-700">FlorenceRN</span>
        <Badge tone="brand">RN opportunities by market</Badge>
      </header>

      {loading && <Card className="p-6"><Spinner label="Loading markets…" /></Card>}
      {!loading && tiles && tiles.length === 0 && <Card className="p-6 text-sm text-slate-600">No markets yet — check back soon.</Card>}
      {!loading && tiles && tiles.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {tiles.map((t) => (
            <Card key={`${t.market}|${t.roleCategory}`} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg font-bold text-ink">{ROLE_LABEL[t.roleCategory] ?? 'RN'}</h3>
                  <p className="text-sm text-slate-500">{t.marketDisplay}</p>
                </div>
                {t.claimed ? <Badge tone="success">Hiring now</Badge> : <Badge tone="info">{t.interestCount} interested</Badge>}
              </div>
              <div className="mt-4">
                {t.claimed && t.claimedJobId
                  ? <a href={`/jobs/${t.claimedJobId}`}><Button variant="primary" className="w-full">View role</Button></a>
                  : <Button variant="soft" className="w-full" onClick={() => setActive(t)}>I’m interested</Button>}
              </div>
            </Card>
          ))}
        </div>
      )}
      <p className="mt-8 text-center text-xs text-slate-400">Expressing interest is not a job application. FlorenceRN aggregates nurse interest by market to bring licensed RN opportunities to you — nothing is shared with an employer until you’re licensed and consent.</p>

      {active && <InterestModal tile={active} onClose={() => setActive(null)} onDone={() => { setActive(null); void reload() }} />}
    </div>
  )
}

function InterestModal({ tile, onClose, onDone }: { tile: CategoryTileData; onClose: () => void; onDone: () => void }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [readiness, setReadiness] = useState('pathway_first')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const state = (tile.market.split('|')[1] ?? '').toUpperCase()
  const canSubmit = fullName.trim() && (email.trim() || phone.trim()) && consent && !busy

  async function submit() {
    setBusy(true); setErr(null)
    try {
      await api.publicMarketInterest({ state, roleCategory: tile.roleCategory, fullName: fullName.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined, readinessStatus: readiness, consentToShareAggregate: consent })
      setDone(true)
    } catch (e) { setErr((e as Error).message || 'Something went wrong.') } finally { setBusy(false) }
  }

  const input = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-florence-500 focus:outline-none focus:ring-1 focus:ring-florence-500'
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className={cx('w-full max-w-md')} onClick={(e) => e.stopPropagation()}>
        <Card className="p-6">
          {done ? (
            <>
              <p className="font-semibold text-emerald-800">You’re on the list.</p>
              <p className="mt-1 text-sm text-emerald-700">We’ll reach out as licensed {ROLE_LABEL[tile.roleCategory]} opportunities open in {tile.marketDisplay}.</p>
              <Button className="mt-4 w-full" onClick={onDone}>Done</Button>
            </>
          ) : (
            <>
              <h2 className="font-display text-lg font-bold text-ink">Interested in {ROLE_LABEL[tile.roleCategory]} — {tile.marketDisplay}</h2>
              <div className="mt-4 space-y-3">
                <label className="block text-sm font-medium text-slate-700">Full name<input className={input} value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">Email<input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
                  <label className="block text-sm font-medium text-slate-700">Phone<input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="optional" /></label>
                </div>
                <label className="block text-sm font-medium text-slate-700">Where are you?
                  <select className={input} value={readiness} onChange={(e) => setReadiness(e.target.value)}>
                    <option value="licensed">Licensed in {state}</option>
                    <option value="near_licensed">Passed NCLEX, license in progress</option>
                    <option value="pathway_first">Still pursuing licensure</option>
                  </select>
                </label>
                <label className="flex items-start gap-2 text-sm text-slate-600">
                  <input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  <span>I consent to FlorenceRN contacting me about RN opportunities in this market. Nothing is shared with an employer until I’m licensed and give separate consent.</span>
                </label>
                {err && <p className="text-sm text-rose-600">{err}</p>}
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={onClose}>Cancel</Button>
                  <Button disabled={!canSubmit} onClick={submit} className="flex-1">{busy ? 'Submitting…' : 'Express interest'}</Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
