import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { api } from '../../api'
import { useAsync } from '../../lib/useAsync'
import { Badge, Card, CardHeader, Empty, Spinner, Stat } from '../../lib/ui'
import { STATUS_META, WORKFLOW_META, TONE_CLASSES } from '@shared/constants'

export default function AdminDashboard() {
  const { data: m, loading, error } = useAsync(() => api.metrics(), [])
  const { data: audit } = useAsync(() => api.audit(), [])

  if (loading) return <div className="py-16"><Spinner label="Crunching operations metrics…" /></div>
  if (error || !m) return <Empty>Could not load metrics. {error}</Empty>

  const funnelData = m.funnel.map((f) => ({ name: f.stage, count: f.count }))
  const typeData = m.byType.map((t) => ({ name: WORKFLOW_META[t.type].short, count: t.count }))
  const money = (n: number) => '$' + n.toLocaleString()
  const pv = m.productionValue
  const staleCount = m.ruleFreshness.filter((r) => r.stale).length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-[-0.02em] text-ink">Operations</h1>
        <p className="mt-1 text-sm text-slate-600">Production view across every candidate and workflow — where the pipeline is, and what’s blocking starts.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Candidates" value={m.candidates} tone="progress" />
        <Stat label="Workflows" value={m.workflows} />
        <Stat label="Pending QA" value={m.pendingQa} tone="warn" />
        <Stat label="Blocked" value={m.blocked} tone={m.blocked ? 'danger' : 'success'} />
        <Stat label="Escalations" value={m.escalations} tone={m.escalations ? 'danger' : 'success'} />
        <Stat label="Milestones" value={m.milestones} tone="success" />
      </div>

      <Card className="border-purple-200 bg-purple-50/40">
        <CardHeader
          title="Production value — Control Tower"
          subtitle="Internal economics, derived from the critical-path forecast. Staff-only — never shown to candidates."
          right={<span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 ring-1 ring-inset ring-purple-200">Internal</span>}
        />
        <div className="grid grid-cols-2 gap-3 px-5 py-4 md:grid-cols-4">
          <Stat label="In-flight starts" value={pv.inFlightStarts} tone="progress" />
          <Stat label="Cohort value (in-flight)" value={money(pv.cohortValueInFlight)} purple hint={`24-mo recurring @ ${money(pv.monthlySubscription)}/mo`} />
          <Stat label="Revenue at risk" value={`${money(pv.revenueAtRiskMonthly)}/mo`} tone={pv.revenueAtRiskMonthly ? 'danger' : 'success'} hint="from delayed starts" />
          <Stat label="Expected ≤ 90 days" value={pv.expectedStartsNext90d} tone="progress" />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Production rollup"
          subtitle="Profiles → start, across the whole pipeline — the counts the FlorenceRN model runs on."
          right={<Badge tone="neutral">Internal</Badge>}
        />
        <div className="space-y-4 px-5 py-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {m.productionCounts.map((s, i) => (
              <div key={i}>
                <div className="font-display text-2xl font-extrabold leading-none tracking-[-0.02em] text-ink">{s.count}</div>
                <div className="mt-1 text-[11px] leading-tight text-slate-500">{s.stage}</div>
              </div>
            ))}
          </div>
          {m.expectedStartsByMonth.length > 0 && (
            <div className="border-t border-slate-100 pt-3">
              <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-400">Expected starts by month</div>
              <div className="flex flex-wrap gap-2">
                {m.expectedStartsByMonth.map((b, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs">
                    <span className="font-semibold text-ink">{b.count}</span> <span className="text-slate-500">{b.month}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Regulatory freshness"
          subtitle="Every rule has an owner and a review date — staleness is visible, not silent."
          right={staleCount > 0 ? <Badge tone="danger">{staleCount} need review</Badge> : <Badge tone="success">All current</Badge>}
        />
        <div className="overflow-x-auto px-5 py-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th className="pb-2 pr-3 font-medium">Rule</th>
                <th className="pb-2 pr-3 font-medium">Owner</th>
                <th className="pb-2 pr-3 font-medium">Last verified</th>
                <th className="pb-2 pr-3 font-medium">Next review</th>
                <th className="pb-2 font-medium">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {m.ruleFreshness.map((r) => (
                <tr key={r.type} className="border-t border-slate-100">
                  <td className="py-1.5 pr-3 text-slate-700">{r.title}{r.requiresCounsel && <span className="ml-1.5 text-[10px] text-amber-600">⚖ counsel</span>}</td>
                  <td className="py-1.5 pr-3 text-slate-500">{r.owner}</td>
                  <td className="py-1.5 pr-3 text-slate-500">{r.lastVerified}</td>
                  <td className="py-1.5 pr-3">{r.stale ? <span className="font-medium text-rose-600">{r.nextReview} · overdue</span> : <span className="text-slate-500">{r.nextReview}</span>}</td>
                  <td className="py-1.5"><Badge tone={r.confidence === 'high' ? 'success' : r.confidence === 'medium' ? 'warn' : 'danger'}>{r.confidence}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Production funnel" subtitle="Workflows that have reached each stage." />
          <div className="px-3 py-4">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={funnelData} layout="vertical" margin={{ left: 24, right: 24 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: '#475467' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#F2F4F7' }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" fill="#0ABAB5" radius={[0, 6, 6, 0]} barSize={18}>
                  <LabelList dataKey="count" position="right" style={{ fontSize: 11, fill: '#475467' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Workflows by type" subtitle="Volume per pathway workflow." />
          <div className="px-3 py-4">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={typeData} margin={{ left: 0, right: 8 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475467' }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#98A2B3' }} axisLine={false} tickLine={false} width={24} />
                <Tooltip cursor={{ fill: '#F2F4F7' }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={26}>
                  {typeData.map((_, i) => <Cell key={i} fill={i % 2 ? '#008E8A' : '#0ABAB5'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Bottlenecks" subtitle="Where workflows are waiting." />
          <div className="divide-y divide-slate-100">
            {m.bottlenecks.length === 0 && <div className="p-5"><Empty>No bottlenecks.</Empty></div>}
            {m.bottlenecks.map((b, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-2.5 text-sm">
                <span className="text-slate-600">{b.label}</span>
                <Badge tone="warn">{b.count}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Status breakdown" />
          <div className="space-y-1.5 px-5 py-3">
            {m.byStatus.map((s) => {
              const total = m.workflows || 1
              const meta = STATUS_META[s.status]
              return (
                <div key={s.status}>
                  <div className="mb-0.5 flex items-center justify-between text-xs">
                    <span className="text-slate-600">{meta.label}</span>
                    <span className="tabular-nums text-slate-400">{s.count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${TONE_CLASSES[meta.tone].split(' ')[0]}`} style={{ width: `${(s.count / total) * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title="Production ledger" subtitle="Recent milestones → FlorenceRN." />
          <div className="scroll-thin max-h-72 divide-y divide-slate-50 overflow-y-auto">
            {m.recentLedger.map((l) => (
              <div key={l.id} className="px-5 py-2 text-xs">
                <div className="text-slate-700">{l.milestone}</div>
                <div className="text-slate-400">{new Date(l.at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Audit feed" subtitle="Every agent action, QA decision, and candidate signature is logged." />
        <div className="scroll-thin max-h-72 divide-y divide-slate-50 overflow-y-auto">
          {(audit ?? []).slice(0, 40).map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-2 px-5 py-1.5 text-xs">
              <div className="flex items-center gap-2">
                <Badge tone="neutral">{e.actor}</Badge>
                <span className="text-slate-600">{e.action}</span>
                {e.detail && <span className="truncate text-slate-400">— {e.detail}</span>}
              </div>
              <span className="shrink-0 text-slate-400">{new Date(e.at).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
