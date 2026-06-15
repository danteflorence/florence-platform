import { useState } from 'react'
import { api } from '../../api'
import { useAsync } from '../../lib/useAsync'
import { Card, CardHeader, StatCard, Bar, Badge, Button, Spinner, Icon, titleize, cx, type Tone } from '../../lib/ui'

const CONNECTOR_PROVIDERS = new Set(['icims', 'workday', 'oracle_taleo', 'greenhouse', 'sap_successfactors', 'ukg_pro'])

const STAGE_TONE: Record<string, Tone> = {
  matched: 'neutral', packet_created: 'neutral', qa_approved: 'brand', ats_application_submitted: 'brand',
  interview_scheduled: 'brand', offer_made: 'warn', offer_accepted: 'success', start_scheduled: 'success',
  started: 'success', retention_30d: 'success', retention_90d: 'success',
}

export default function Dashboards() {
  const integration = useAsync(() => api.dashIntegration(), [])
  const demand = useAsync(() => api.dashDemand(), [])
  const subs = useAsync(() => api.dashSubmissions(), [])
  const ledger = useAsync(() => api.dashLedger(), [])
  const [connBusy, setConnBusy] = useState<string | null>(null)
  const [connMsg, setConnMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  const connectPull = async (e: { id: string; name: string; atsProvider: string; integrationStatus: string }) => {
    setConnBusy(e.id); setConnMsg(null)
    try {
      if (e.integrationStatus !== 'active') await api.connectConnector(e.id, e.atsProvider)
      const pull = await api.pullConnector(e.id, e.atsProvider)
      setConnMsg({ tone: 'ok', text: `${e.name}: connected & pulled ${pull.imported} new req(s) via ${e.atsProvider}.` })
      integration.reload(); demand.reload()
    } catch (err: any) { setConnMsg({ tone: 'err', text: String(err?.message ?? err) }) } finally { setConnBusy(null) }
  }

  if (integration.loading || demand.loading || subs.loading || ledger.loading) return <div className="py-10"><Spinner label="Loading operations…" /></div>

  const d = demand.data!
  const s = subs.data!
  const l = ledger.data!
  const ih = integration.data!
  const maxState = Math.max(1, ...Object.values(d.byState).map((v) => v.openings))
  const maxSpec = Math.max(1, ...Object.values(d.bySpecialty).map((v) => v.openings))
  const maxFunnel = Math.max(1, ...l.funnel.map((f) => f.candidates))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Operations</h2>
        <p className="text-sm text-slate-500">Employer demand → matched supply → submissions → forecasted starts.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Open requisitions" value={d.openRequisitions} sub={`${d.totalOpenings} openings`} />
        <StatCard label="Applications submitted" value={d.submittedApplications} />
        <StatCard label="Interview rate" value={`${Math.round(s.rates.interview * 100)}%`} sub="of submitted" />
        <StatCard label="Started" value={l.funnel.find((f) => f.stage === 'started')?.candidates ?? 0} tone="success" sub="HRIS/attestation-verified" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Employer demand" subtitle="Open RN openings by state and specialty" />
          <div className="space-y-4 px-5 py-4">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">By state</div>
              {Object.entries(d.byState).sort((a, b) => b[1].openings - a[1].openings).map(([k, v]) => <Bar key={k} label={k} value={v.openings} max={maxState} />)}
            </div>
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">By specialty</div>
              {Object.entries(d.bySpecialty).sort((a, b) => b[1].openings - a[1].openings).map(([k, v]) => <Bar key={k} label={k} value={v.openings} max={maxSpec} tone="success" />)}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Production ledger" subtitle="Requisition → start funnel (distinct candidates)" />
          <div className="space-y-2 px-5 py-4">
            {l.funnel.map((f) => (
              <div key={f.stage} className="flex items-center gap-3">
                <div className="w-44 shrink-0 truncate text-sm text-slate-600">{titleize(f.stage)}</div>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={cx('h-full rounded-full', f.candidates ? 'bg-florence-500' : 'bg-slate-200')} style={{ width: `${Math.round((f.candidates / maxFunnel) * 100)}%` }} /></div>
                <div className="w-8 shrink-0 text-right font-mono text-xs text-slate-500">{f.candidates}</div>
              </div>
            ))}
            <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
              {l.forecast.expectedStartsByMonth.length
                ? <>Forecast: {l.forecast.expectedStartsByMonth.map((m) => `${m.month}: ${m.started} started / ${m.scheduled} scheduled`).join(' · ')}</>
                : l.forecast.note}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Submissions" subtitle="Packet & application status" />
          <div className="grid grid-cols-2 gap-4 px-5 py-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Packets</div>
              <ul className="mt-1 space-y-1 text-sm">{Object.entries(s.packetsByStatus).length ? Object.entries(s.packetsByStatus).map(([k, v]) => <li key={k} className="flex justify-between"><span className="text-slate-600">{titleize(k)}</span><span className="font-mono text-slate-500">{v}</span></li>) : <li className="text-slate-400">None yet</li>}</ul>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Applications</div>
              <ul className="mt-1 space-y-1 text-sm">{Object.entries(s.applicationsByStatus).length ? Object.entries(s.applicationsByStatus).map(([k, v]) => <li key={k} className="flex justify-between"><span className="text-slate-600">{titleize(k)}</span><span className="font-mono text-slate-500">{v}</span></li>) : <li className="text-slate-400">None yet</li>}</ul>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Integration health" subtitle="Connector status per employer" right={ih.failed.length ? <Badge tone="danger"><Icon.alert className="h-3 w-3" />{ih.failed.length} failed</Badge> : <Badge tone="success"><Icon.check className="h-3 w-3" />Healthy</Badge>} />
          <div className="px-5 py-4">
            {connMsg && <div className={cx('mb-3 rounded-lg px-3 py-2 text-sm', connMsg.tone === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>{connMsg.text}</div>}
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-400"><th className="pb-2 font-semibold">Employer</th><th className="pb-2 font-semibold">ATS</th><th className="pb-2 font-semibold">Status</th><th className="pb-2 text-right font-semibold">Syncs</th><th className="pb-2 text-right font-semibold">Connector</th></tr></thead>
              <tbody>{ih.employers.map((e) => (
                <tr key={e.id} className="border-t border-slate-100">
                  <td className="py-2 text-slate-700">{e.name}</td>
                  <td className="py-2 font-mono text-xs text-slate-500">{e.atsProvider}</td>
                  <td className="py-2"><Badge tone={e.integrationStatus === 'active' ? 'success' : 'neutral'}>{titleize(e.integrationStatus)}</Badge></td>
                  <td className="py-2 text-right font-mono text-xs text-slate-500">{e.syncCount}</td>
                  <td className="py-2 text-right">{CONNECTOR_PROVIDERS.has(e.atsProvider)
                    ? <Button variant="soft" onClick={() => connectPull(e)} disabled={connBusy === e.id}>{connBusy === e.id ? '…' : e.integrationStatus === 'active' ? 'Pull' : 'Connect & pull'}</Button>
                    : <span className="text-xs text-slate-400">—</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
