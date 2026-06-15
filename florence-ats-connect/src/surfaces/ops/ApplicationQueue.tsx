// Interest-to-Application Queue (ops) — every nurse who expressed interest, the exact
// gates still blocking submission, and when they'll be release-ready. The bridge from
// free interest signal → gated employer submission. Read-only view over the gate.
import { api, type ApplicationQueueRow } from '../../api'
import { useAsync } from '../../lib/useAsync'
import { Badge, Card, CardHeader, Spinner, titleize, type Tone } from '../../lib/ui'

const GATE_LABEL: Record<string, string> = {
  employer_share_consent: 'Consent', visa_approved: 'Visa', license_verified_active: 'License',
  employer_packet_qa_approved: 'QA', job_open: 'Job open', channel_authorized: 'Channel', documents_complete: 'Docs',
}
const STATUS_TONE: Record<string, Tone> = {
  ready_to_submit: 'success', submitted: 'brand', missing_consent: 'warn', visa_pending: 'danger',
  license_pending: 'warn', qa_pending: 'info', not_ready: 'neutral',
}

export default function ApplicationQueue() {
  const q = useAsync(() => api.applicationQueue(), [])
  if (q.loading) return <div className="py-10"><Spinner label="Loading application queue…" /></div>
  if (q.error || !q.data) return <Card className="p-6 text-sm text-rose-600">Failed to load: {q.error}</Card>
  const rows = q.data
  const ready = rows.filter((r) => r.readyToSubmit).length

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Interest → Application Queue</h2>
        <p className="text-sm text-slate-500">Nurses who expressed interest, the exact gates blocking submission, and expected release. FlorenceRN submits only after consent + visa + license + QA clear — interviews/offers remain subject to consular processing.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4"><div className="text-xs uppercase tracking-wide text-slate-500">Interested</div><div className="mt-1 text-2xl font-bold text-ink">{rows.length}</div></Card>
        <Card className="p-4"><div className="text-xs uppercase tracking-wide text-slate-500">Ready to submit</div><div className="mt-1 text-2xl font-bold text-emerald-700">{ready}</div></Card>
        <Card className="p-4"><div className="text-xs uppercase tracking-wide text-slate-500">Visa-blocked</div><div className="mt-1 text-2xl font-bold text-rose-600">{rows.filter((r) => r.missing.includes('visa_approved')).length}</div></Card>
        <Card className="p-4"><div className="text-xs uppercase tracking-wide text-slate-500">Consent-blocked</div><div className="mt-1 text-2xl font-bold text-amber-600">{rows.filter((r) => r.missing.includes('employer_share_consent')).length}</div></Card>
      </div>

      <Card>
        <CardHeader title="Queue" subtitle="Most-actionable first. Missing chips show the remaining gates." />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr className="border-b border-slate-200">
              {['Candidate', 'Job', 'Employer', 'Channel', 'Status', 'Missing gates', 'Expected release'].map((h) => <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.candidateId}|${r.jobId}`} className="border-b border-slate-100 align-top">
                  <td className="px-3 py-2 text-sm font-medium text-ink">{r.candidate}</td>
                  <td className="px-3 py-2 text-sm text-slate-700">{r.job}</td>
                  <td className="px-3 py-2 text-sm text-slate-700">{r.employer}</td>
                  <td className="px-3 py-2 text-sm text-slate-500">{titleize(r.channel)}</td>
                  <td className="px-3 py-2"><Badge tone={STATUS_TONE[r.applicationGateStatus] ?? 'neutral'}>{titleize(r.applicationGateStatus)}</Badge></td>
                  <td className="px-3 py-2">{r.readyToSubmit ? <span className="text-xs text-emerald-700">— none —</span> : <div className="flex flex-wrap gap-1">{r.missing.map((m) => <Badge key={m} tone="neutral">{GATE_LABEL[m] ?? m}</Badge>)}</div>}</td>
                  <td className="px-3 py-2 text-sm text-slate-600">{r.expectedRelease}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-400">No interest registered yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
