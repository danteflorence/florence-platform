// AMN Account Radar — account-level cockpit: open RN demand × FlorenceRN supply ×
// per-RN/month economics × Employer Opportunity Value, ranked so the AMN team works
// the highest-yield books first. Generate a per-account capacity brief (AMN route).
// Reuses the existing rankAccounts + demand-brief generator (no new analytics).
import { useState } from 'react'
import { api, type RankedAccountData, type DemandBriefData } from '../../api'
import { useAsync } from '../../lib/useAsync'
import { Badge, Button, Card, CardHeader, Spinner, cx, titleize } from '../../lib/ui'

export default function AmnRadar() {
  const accts = useAsync(() => api.amnAccounts(), [])
  const [brief, setBrief] = useState<DemandBriefData | null>(null)
  const [briefing, setBriefing] = useState<string | null>(null)

  async function generate(employer: string) {
    setBriefing(employer)
    try { setBrief(await api.demandBrief(employer, 'amn')) } finally { setBriefing(null) }
  }

  if (accts.loading) return <div className="py-10"><Spinner label="Loading AMN Account Radar…" /></div>
  if (accts.error || !accts.data) return <Card className="p-6 text-sm text-rose-600">Failed to load: {accts.error}</Card>
  const rows = accts.data

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink">AMN Account Radar</h2>
        <p className="text-sm text-slate-500">Account-level RN demand × FlorenceRN supply × economics × opportunity value. Highest-yield accounts first. Briefs are DRAFTS — human review before any send; no financing/underwriting data ever appears.</p>
      </div>

      <Card>
        <CardHeader title="Accounts" subtitle={`${rows.length} accounts with open RN demand`} />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr className="border-b border-slate-200">
              {['Account', 'Open jobs', 'States', 'Licensed / near', 'Eff. fee /RN/mo', 'Net value /RN/mo', 'Opp. value', 'Pilot', ''].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {rows.map((a) => <AccountRow key={a.employer} a={a} onBrief={() => generate(a.employer)} busy={briefing === a.employer} />)}
              {rows.length === 0 && <tr><td colSpan={9} className="px-3 py-6 text-center text-sm text-slate-400">No accounts with open demand yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {brief && <BriefCard brief={brief} />}
    </div>
  )
}

function AccountRow({ a, onBrief, busy }: { a: RankedAccountData; onBrief: () => void; busy: boolean }) {
  const $ = (n: number) => `$${n.toLocaleString()}`
  const td = 'px-3 py-2 text-sm text-slate-700 align-top'
  return (
    <tr className="border-b border-slate-100">
      <td className={td}><div className="font-medium text-ink">{a.employer}</div><div className="text-xs text-slate-400">{a.specialties.slice(0, 3).map(titleize).join(', ')}</div></td>
      <td className={td}>{a.openJobs}<span className="text-slate-400"> · {a.openings} open</span></td>
      <td className={td}>{a.states.slice(0, 4).join(', ') || '—'}</td>
      <td className={td}>{a.matchedLicensed}<span className="text-slate-400"> / {a.matchedNearLicensed}</span></td>
      <td className={td}>{a.avgGrossFeePerRnMonth ? $(a.avgGrossFeePerRnMonth) : '—'}</td>
      <td className={td}>{a.avgNetValuePerRnMonth ? $(a.avgNetValuePerRnMonth) : '—'}</td>
      <td className={td}><Badge tone={a.opportunityValue.score >= 60 ? 'success' : a.opportunityValue.score >= 35 ? 'warn' : 'neutral'}>{a.opportunityValue.score}</Badge></td>
      <td className={cx(td, 'font-semibold text-florence-700')}>{a.recommendedPilotStarts}</td>
      <td className={td}><Button variant="soft" onClick={onBrief} disabled={busy}>{busy ? '…' : 'Brief'}</Button></td>
    </tr>
  )
}

function BriefCard({ brief }: { brief: DemandBriefData }) {
  const $ = (n: number) => `$${n.toLocaleString()}`
  const pdfHref = `/api/ops/demand/briefs/pdf?employer=${encodeURIComponent(brief.employer)}&route=amn`
  return (
    <Card className="border-florence-200">
      <CardHeader title={`${brief.employer} — capacity brief (AMN)`} subtitle="DRAFT — review before sending." right={<a className="text-sm font-medium text-florence-700 underline" href={pdfHref} target="_blank" rel="noreferrer">Open PDF →</a>} />
      <div className="grid gap-4 px-5 py-4 sm:grid-cols-3">
        <div><div className="text-xs uppercase tracking-wide text-slate-500">Demand</div><div className="mt-1 text-sm text-slate-700">{brief.jobs.total} open role(s) · {brief.jobs.states.join(', ') || 'n/a'}</div></div>
        <div><div className="text-xs uppercase tracking-wide text-slate-500">Matched supply</div><div className="mt-1 text-sm text-slate-700">{brief.supply.licensed} licensed · {brief.supply.nearLicensed} near · {brief.supply.total} total</div></div>
        <div><div className="text-xs uppercase tracking-wide text-slate-500">Economics /RN/mo</div><div className="mt-1 text-sm text-slate-700">Fee {$(brief.economics.avgGrossFeePerRnMonth)} · Eff. {$(brief.economics.avgEffectiveCostPerRnMonth)}</div></div>
      </div>
      {brief.compensation && (
        <div className="border-t border-slate-100 px-5 py-3 text-sm text-slate-600">
          Compensation observed: {brief.compensation.listedCount} listed · {brief.compensation.estimatedCount} estimated. Benefits: {brief.compensation.benefits.map((b) => `${titleize(b.tag)} (${b.count})`).join(', ') || 'none extracted'}.
        </div>
      )}
      <div className="border-t border-slate-100 px-5 py-3 text-sm text-slate-700">Recommended first wave: <span className="font-semibold">{brief.pilot.recommendedFirstWaveStarts}</span> RN start(s) in {brief.pilot.topSpecialties.map(titleize).join(', ') || 'top specialties'}.</div>
    </Card>
  )
}
