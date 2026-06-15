// Long-Tail Demand Radar (ops) — long-tail RN demand by market×role: hiring signals,
// consented nurse interest, state-level licensed supply, lead tier, claim status, and
// per-lead actions (generate a claim link, draft outreach). Signals are LEAD-ONLY: this
// is the only place they surface (never candidate-facing). Compliance: a signal requires
// sourceUrl+observedAt for crawled sources; outreach is DRAFT-only; no contact export.
import { useState } from 'react'
import { api, type LongTailLeadData, type CategoryTileData, type OutreachDraftData } from '../../api'
import { useAsync } from '../../lib/useAsync'
import { Badge, Button, Card, CardHeader, Spinner, cx, titleize, type Tone } from '../../lib/ui'

const ROLE_CATEGORIES = ['home_health_rn', 'dialysis_rn', 'hospice_rn', 'snf_rn', 'clinic_rn', 'asc_rn', 'other_rn']
const TIER_TONE: Record<string, Tone> = { A: 'success', B: 'brand', C: 'warn', D: 'neutral' }
const roleLabel = (rc: string) => titleize(rc.replace(/_rn$/, '')) + ' RN'

export default function LongTailRadar() {
  const leads = useAsync(() => api.longTailLeads(), [])
  const tiles = useAsync(() => api.longTailTiles(), [])
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [outreach, setOutreach] = useState<OutreachDraftData | null>(null)

  async function genClaim(l: LongTailLeadData) {
    try { const r = await api.longTailClaimToken({ city: l.market.split('|')[0], state: l.market.split('|')[1], roleCategory: l.roleCategory }); setMsg({ tone: 'ok', text: `Claim link: ${r.claimUrl}` }) }
    catch (e) { setMsg({ tone: 'err', text: (e as Error).message }) }
  }
  async function draftOutreach(l: LongTailLeadData) {
    try { setOutreach(await api.longTailOutreach({ employerName: l.employerName || `${roleLabel(l.roleCategory)} employer (${l.marketDisplay})`, city: l.market.split('|')[0], state: l.market.split('|')[1], roleCategory: l.roleCategory })) }
    catch (e) { setMsg({ tone: 'err', text: (e as Error).message }) }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Long-Tail Demand Radar</h2>
        <p className="text-sm text-slate-500">Small-employer RN demand (home health · hospice · SNF · dialysis · clinic · ASC). Signals are lead-only — never shown to candidates. Invite employers to claim roles; sell licensed RN capacity per-RN/month. Outreach is DRAFT-only.</p>
      </div>

      {msg && <Card className={cx('p-3 text-sm', msg.tone === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700')}>{msg.text}</Card>}

      <SignalForm onDone={() => { leads.reload(); tiles.reload(); setMsg({ tone: 'ok', text: 'Signal recorded.' }) }} onErr={(t) => setMsg({ tone: 'err', text: t })} />

      <Card>
        <CardHeader title="Leads by tier" subtitle="A = demand + interest + supply · B = demand + interest · C = demand only · D = noisy. Supply is licensed RNs targeting the STATE (not city)." />
        {leads.loading ? <div className="p-6"><Spinner label="Scoring leads…" /></div> : leads.error || !leads.data ? <p className="p-6 text-sm text-rose-600">Failed to load.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr className="border-b border-slate-200">
                {['Tier', 'Role', 'Market', 'Signals', 'Interest', 'Lic / near (state)', 'Claimed', ''].map((h) => <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{h}</th>)}
              </tr></thead>
              <tbody>
                {leads.data.map((l) => (
                  <tr key={l.key} className="border-b border-slate-100 align-top">
                    <td className="px-3 py-2"><Badge tone={TIER_TONE[l.tier]}>{l.tier}</Badge></td>
                    <td className="px-3 py-2 text-sm text-slate-700">{roleLabel(l.roleCategory)}</td>
                    <td className="px-3 py-2 text-sm text-slate-700">{l.marketDisplay}</td>
                    <td className="px-3 py-2 text-sm text-slate-700">{l.signalCount}</td>
                    <td className="px-3 py-2 text-sm text-slate-700">{l.interestCount}</td>
                    <td className="px-3 py-2 text-sm text-slate-700">{l.licensedSupply} / {l.nearLicensedSupply}</td>
                    <td className="px-3 py-2 text-sm">{l.claimed ? <Badge tone="success">Claimed</Badge> : <span className="text-slate-400">—</span>}</td>
                    <td className="px-3 py-2"><div className="flex gap-1"><Button variant="soft" onClick={() => genClaim(l)}>Claim link</Button><Button variant="ghost" onClick={() => draftOutreach(l)}>Outreach</Button></div></td>
                  </tr>
                ))}
                {leads.data.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-sm text-slate-400">No leads yet — record a hiring signal above.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {outreach && <OutreachCard draft={outreach} onClose={() => setOutreach(null)} />}

      <Card>
        <CardHeader title="Category tiles (candidate-facing demand)" subtitle="Aggregate counts only. Claimed tiles link to a live job card; unclaimed show 'I'm interested'." />
        {tiles.loading ? <div className="p-6"><Spinner /></div> : (
          <div className="grid gap-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
            {(tiles.data ?? []).map((t: CategoryTileData) => (
              <div key={`${t.market}|${t.roleCategory}`} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between"><span className="text-sm font-medium text-ink">{roleLabel(t.roleCategory)}</span>{t.claimed ? <Badge tone="success">claimed</Badge> : <Badge tone="info">{t.interestCount} interested</Badge>}</div>
                <div className="text-xs text-slate-500">{t.marketDisplay} · {t.signalCount} signal(s)</div>
              </div>
            ))}
            {(tiles.data ?? []).length === 0 && <p className="text-sm text-slate-400">No tiles yet.</p>}
          </div>
        )}
      </Card>
    </div>
  )
}

function SignalForm({ onDone, onErr }: { onDone: () => void; onErr: (t: string) => void }) {
  const [sourceType, setSourceType] = useState('manual')
  const [employerName, setEmployerName] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [roleCategory, setRoleCategory] = useState('home_health_rn')
  const [sourceUrl, setSourceUrl] = useState('')
  const [reviewer, setReviewer] = useState('')
  const [busy, setBusy] = useState(false)
  const needsProvenance = sourceType === 'craigslist_signal' || sourceType === 'career_page' || sourceType === 'job_api'
  const canSubmit = state.trim() && (!needsProvenance || sourceUrl.trim()) && (sourceType !== 'craigslist_signal' || reviewer.trim()) && !busy
  const input = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-florence-500 focus:outline-none focus:ring-1 focus:ring-florence-500'

  async function submit() {
    setBusy(true)
    try {
      await api.longTailSignalCreate({ sourceType, employerName: employerName.trim() || undefined, city: city.trim() || undefined, state: state.trim().toUpperCase(), roleCategory, sourceUrl: sourceUrl.trim() || undefined, observedAt: needsProvenance ? new Date().toISOString() : undefined, reviewer: reviewer.trim() || undefined })
      setEmployerName(''); setCity(''); setSourceUrl(''); setReviewer(''); onDone()
    } catch (e) { onErr((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Card>
      <CardHeader title="Record a hiring signal" subtitle="A LEAD only — never candidate-facing. Crawled sources require a source URL (and a reviewer for Craigslist). Never paste posting content." />
      <div className="grid gap-3 px-5 py-4 sm:grid-cols-3">
        <label className="block text-sm font-medium text-slate-700">Source
          <select className={input} value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
            {['manual', 'craigslist_signal', 'career_page', 'job_api', 'partner_feed'].map((s) => <option key={s} value={s}>{titleize(s)}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">Role
          <select className={input} value={roleCategory} onChange={(e) => setRoleCategory(e.target.value)}>
            {ROLE_CATEGORIES.map((rc) => <option key={rc} value={rc}>{roleLabel(rc)}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">Employer (optional)<input className={input} value={employerName} onChange={(e) => setEmployerName(e.target.value)} placeholder="ABC Home Health" /></label>
        <label className="block text-sm font-medium text-slate-700">City<input className={input} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Bakersfield" /></label>
        <label className="block text-sm font-medium text-slate-700">State<input className={input} value={state} onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))} placeholder="CA" /></label>
        <div />
        {needsProvenance && <label className="block text-sm font-medium text-slate-700 sm:col-span-2">Source URL (internal reference)<input className={input} value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" /></label>}
        {sourceType === 'craigslist_signal' && <label className="block text-sm font-medium text-slate-700">Reviewer<input className={input} value={reviewer} onChange={(e) => setReviewer(e.target.value)} placeholder="your name" /></label>}
      </div>
      <div className="px-5 pb-4"><Button disabled={!canSubmit} onClick={submit}>{busy ? 'Saving…' : 'Record signal'}</Button></div>
    </Card>
  )
}

function OutreachCard({ draft, onClose }: { draft: OutreachDraftData; onClose: () => void }) {
  return (
    <Card className="border-florence-200">
      <CardHeader title={`Outreach DRAFT — ${draft.employerName}`} subtitle={`${draft.marketDisplay ?? draft.market} · ${draft.aggregateInterestCount} interested · DRAFT only (human sends)`} right={<Button variant="ghost" onClick={onClose}>Close</Button>} />
      <div className="space-y-3 px-5 py-4">
        {draft.claimUrl && <p className="text-xs text-slate-500">Claim link: <span className="font-mono">{draft.claimUrl}</span></p>}
        {draft.sequence.map((s) => (
          <div key={s.step} className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-center justify-between"><span className="text-sm font-semibold text-ink">Step {s.step} · {s.label}</span><a className="text-xs font-medium text-florence-700 underline" href={s.mailto}>Open in mail →</a></div>
            <div className="mt-1 text-xs font-medium text-slate-600">{s.subject}</div>
            <pre className="mt-1 whitespace-pre-wrap font-sans text-xs text-slate-600">{s.body}</pre>
          </div>
        ))}
      </div>
    </Card>
  )
}
