import { useState } from 'react'
import { api, type DemandBriefData } from '../../api'
import { useAsync } from '../../lib/useAsync'
import { Card, CardHeader, StatCard, Bar, Badge, Button, Spinner, cx, type Tone } from '../../lib/ui'

const FUNNEL_LABEL: Record<string, string> = {
  jobs_detected: 'Jobs detected', priced: 'Priced', clicks: 'Link clicks', views: 'Job views',
  interests: 'Interest', packets_shared: 'Packets shared', interviews: 'Interviews', offers: 'Offers',
  starts: 'Starts', retained_90: 'Retained 90d',
}
const FUNNEL_TONE: Record<string, Tone> = { starts: 'success', retained_90: 'success', offers: 'warn' }
const fmt$ = (n: number) => `$${Math.round(n).toLocaleString()}`

export default function DemandRadar() {
  const dash = useAsync(() => api.demandDashboard(), [])
  const [csv, setCsv] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [brief, setBrief] = useState<DemandBriefData | null>(null)

  const importCsv = async () => {
    if (!csv.trim()) return
    setBusy('import'); setMsg(null)
    try {
      const r = await api.demandImport({ csv, sourceType: 'csv' })
      setMsg({ tone: 'ok', text: `Imported: ${r.jobsCreated} new + ${r.jobsUpdated} updated job(s), ${r.skippedNonRn} non-RN skipped.` })
      setCsv(''); dash.reload()
    } catch (e: any) { setMsg({ tone: 'err', text: String(e?.message ?? e) }) } finally { setBusy(null) }
  }
  const priceAll = async () => {
    setBusy('price'); setMsg(null)
    try { const r = await api.demandPriceAll(); setMsg({ tone: 'ok', text: `Priced ${r.priced} job(s) (${r.skipped} already priced).` }); dash.reload() }
    catch (e: any) { setMsg({ tone: 'err', text: String(e?.message ?? e) }) } finally { setBusy(null) }
  }
  const genBrief = async (employer: string) => {
    setBusy('brief:' + employer); setMsg(null)
    try { setBrief(await api.demandBrief(employer, 'amn')) }
    catch (e: any) { setMsg({ tone: 'err', text: String(e?.message ?? e) }) } finally { setBusy(null) }
  }

  if (dash.loading) return <div className="py-10"><Spinner label="Loading Demand Radar…" /></div>
  if (dash.error || !dash.data) return <Card className="p-6 text-sm text-rose-600">Failed to load: {dash.error}</Card>
  const d = dash.data
  const stage = (s: string) => d.funnel.stages.find((x) => x.stage === s)
  const maxState = Math.max(1, ...Object.values(d.jobs.byState))
  const maxSpec = Math.max(1, ...Object.values(d.jobs.bySpecialty))
  const maxFunnel = Math.max(1, ...d.funnel.stages.map((s) => s.events))
  const sources = Object.entries(d.funnel.bySource).sort((a, b) => b[1] - a[1])
  const maxSrc = Math.max(1, ...sources.map(([, v]) => v))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Demand Radar</h2>
        <p className="text-sm text-slate-500">Public &amp; partner RN demand → nurse interest → employer economics → starts, attributed to source.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Open RN jobs" value={d.jobs.open} sub={`${d.jobs.total} total · ${d.jobs.stale} stale`} />
        <StatCard label="Priced" value={d.jobs.priced} sub="per-RN/month economics" />
        <StatCard label="Link clicks" value={d.links.clicks} sub={`${d.links.total} tracked links`} />
        <StatCard label="Nurse interest" value={d.interests.total} />
        <StatCard label="Attributed starts" value={stage('starts')?.events ?? 0} tone="success" sub="source → start" />
      </div>

      <Card>
        <CardHeader title="Source → start attribution funnel" subtitle="The north star: every start traceable to the demand that produced it." />
        <div className="space-y-2 px-5 py-4">
          {d.funnel.stages.map((s) => (
            <Bar key={s.stage} label={FUNNEL_LABEL[s.stage] ?? s.stage} value={s.events} max={maxFunnel} tone={FUNNEL_TONE[s.stage] ?? 'brand'} />
          ))}
        </div>
      </Card>

      {d.pay && (
        <Card>
          <CardHeader title="Compensation transparency" subtitle="Listed pay comes from the employer posting; estimated pay is a FlorenceRN local-market estimate — never presented as posted." />
          <div className="grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-4">
            <div><div className="text-xs uppercase tracking-wide text-slate-500">Employer-listed</div><div className="mt-1 text-2xl font-bold text-emerald-700">{d.pay.listed}</div></div>
            <div><div className="text-xs uppercase tracking-wide text-slate-500">FlorenceRN-estimated</div><div className="mt-1 text-2xl font-bold text-florence-700">{d.pay.estimated}</div></div>
            <div><div className="text-xs uppercase tracking-wide text-slate-500">No pay data</div><div className="mt-1 text-2xl font-bold text-slate-400">{d.pay.noPay}</div></div>
            <div><div className="text-xs uppercase tracking-wide text-slate-500">Benefits extracted</div><div className="mt-1 text-2xl font-bold text-slate-700">{d.pay.withBenefits}</div></div>
          </div>
          {d.pay.transparencyGap > 0 && (
            <div className="mx-5 mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {d.pay.transparencyGap} open posting(s) in a pay-transparency state (CA/CO/NY/WA/IL) lacked a posted pay range.
            </div>
          )}
        </Card>
      )}

      {d.opportunityStates && (
        <Card>
          <CardHeader title="Opportunity reachability" subtitle="How open jobs reach candidates today. 'Apply with FlorenceRN packet' is offered only for direct-partner / ATS-connected; everything else is express-interest." />
          <div className="grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-4">
            <div><div className="text-xs uppercase tracking-wide text-slate-500">Publicly posted</div><div className="mt-1 text-2xl font-bold text-slate-500">{d.opportunityStates.public}</div></div>
            <div><div className="text-xs uppercase tracking-wide text-slate-500">AMN channel</div><div className="mt-1 text-2xl font-bold text-florence-700">{d.opportunityStates.amn_channel}</div></div>
            <div><div className="text-xs uppercase tracking-wide text-slate-500">Direct partner</div><div className="mt-1 text-2xl font-bold text-florence-700">{d.opportunityStates.direct_partner}</div></div>
            <div><div className="text-xs uppercase tracking-wide text-slate-500">ATS-connected</div><div className="mt-1 text-2xl font-bold text-emerald-700">{d.opportunityStates.ats_connected}</div></div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Open demand by state" />
          <div className="space-y-2 px-5 py-4">
            {Object.entries(d.jobs.byState).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => <Bar key={k} label={k} value={v} max={maxState} />)}
            {Object.keys(d.jobs.byState).length === 0 && <p className="text-sm text-slate-400">No open jobs yet — import some below.</p>}
          </div>
        </Card>
        <Card>
          <CardHeader title="Open demand by specialty" />
          <div className="space-y-2 px-5 py-4">
            {Object.entries(d.jobs.bySpecialty).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => <Bar key={k} label={k} value={v} max={maxSpec} tone="warn" />)}
            {Object.keys(d.jobs.bySpecialty).length === 0 && <p className="text-sm text-slate-400">No specialties yet.</p>}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Top employers (open demand)" right={<Button variant="soft" onClick={priceAll} disabled={busy === 'price'}>{busy === 'price' ? 'Pricing…' : 'Price all open'}</Button>} />
          <div className="divide-y divide-slate-100 px-5 py-2">
            {d.jobs.topEmployers.map((e) => (
              <div key={e.employer} className="flex items-center justify-between py-2">
                <div className="min-w-0 truncate text-sm text-slate-700">{e.employer} <span className="text-slate-400">· {e.count} role(s)</span></div>
                <Button variant="ghost" onClick={() => genBrief(e.employer)} disabled={busy === 'brief:' + e.employer}>{busy === 'brief:' + e.employer ? '…' : 'Demand brief'}</Button>
              </div>
            ))}
            {d.jobs.topEmployers.length === 0 && <p className="py-3 text-sm text-slate-400">No employers yet.</p>}
          </div>
        </Card>
        <Card>
          <CardHeader title="Attribution by source" subtitle="Where the demand signal originates." />
          <div className="space-y-2 px-5 py-4">
            {sources.slice(0, 10).map(([k, v]) => <Bar key={k} label={k} value={v} max={maxSrc} />)}
            {sources.length === 0 && <p className="text-sm text-slate-400">No attribution events yet.</p>}
          </div>
        </Card>
      </div>

      {brief && (
        <Card>
          <CardHeader title={`Demand brief — ${brief.employer}`} subtitle="DRAFT — review before sending. Planning estimates; not an employer endorsement." right={<a className="text-xs font-medium text-florence-700 hover:underline" href={`/api/ops/demand/briefs/pdf?employer=${encodeURIComponent(brief.employer)}&route=amn`} target="_blank" rel="noreferrer">Open PDF →</a>} />
          <div className="grid gap-4 px-5 py-4 sm:grid-cols-3">
            <div><div className="text-xs uppercase tracking-wide text-slate-500">Demand</div><div className="mt-1 text-sm text-slate-700">{brief.jobs.total} open role(s) · {brief.jobs.states.join(', ') || 'n/a'}</div></div>
            <div><div className="text-xs uppercase tracking-wide text-slate-500">Matched supply</div><div className="mt-1 text-sm text-slate-700">{brief.supply.licensed} licensed · {brief.supply.nearLicensed} near · {brief.supply.total} total</div></div>
            <div><div className="text-xs uppercase tracking-wide text-slate-500">Economics / RN / mo</div><div className="mt-1 text-sm text-slate-700">Fee {fmt$(brief.economics.avgGrossFeePerRnMonth)} · Effective {fmt$(brief.economics.avgEffectiveCostPerRnMonth)}</div></div>
          </div>
          <div className="border-t border-slate-100 px-5 py-3 text-sm text-slate-600">Recommended first wave: <b>{brief.pilot.recommendedFirstWaveStarts}</b> start(s) in {brief.pilot.topSpecialties.join(', ') || 'top specialties'} · route via {brief.route === 'amn' ? 'AMN' : 'direct'}.</div>
        </Card>
      )}

      <Card>
        <CardHeader title="Import demand (CSV)" subtitle="Columns: employer, title, city, state, reqId, specialty. RN-only; dupes collapse by req-id/attributes." />
        <div className="space-y-3 px-5 py-4">
          <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={4} placeholder={'employer,title,city,state,reqId\nTenet Health,RN - ICU,Dallas,TX,REQ-1'} className="w-full rounded-lg border border-slate-200 p-3 font-mono text-xs" />
          <div className="flex items-center gap-3">
            <Button onClick={importCsv} disabled={busy === 'import' || !csv.trim()}>{busy === 'import' ? 'Importing…' : 'Import jobs'}</Button>
            {msg && <span className={cx('text-sm', msg.tone === 'ok' ? 'text-emerald-600' : 'text-rose-600')}>{msg.text}</span>}
          </div>
          <p className="text-[11px] text-slate-400">Public/partner demand only. Career-page crawling stays disabled until robots/ToS review. Interest ≠ application; no PII in tracked links.</p>
        </div>
      </Card>
    </div>
  )
}
