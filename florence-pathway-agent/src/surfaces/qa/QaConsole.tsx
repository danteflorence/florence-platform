import { Link } from 'react-router-dom'
import { api } from '../../api'
import { useAsync } from '../../lib/useAsync'
import { Badge, Card, CardHeader, Empty, Icon, Spinner, cx } from '../../lib/ui'
import { RISK_META, WORKFLOW_META } from '@shared/constants'
import type { RiskLevel } from '@shared/types'

const RANK: Record<RiskLevel, number> = { escalate: 4, high: 3, medium: 2, low: 1, none: 0 }

export default function QaConsole() {
  const { data, loading, error } = useAsync(() => api.qaQueue(), [])

  if (loading) return <div className="py-16"><Spinner label="Loading review queue…" /></div>
  if (error) return <Empty>Could not load queue. {error}</Empty>
  const queue = [...(data ?? [])].sort((a, b) => RANK[b.highestSeverity] - RANK[a.highestSeverity])
  const escalations = queue.filter((q) => q.highestSeverity === 'escalate').length

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-[-0.02em] text-ink">Human QA Console</h1>
          <p className="mt-1 text-sm text-slate-600">Exception management: the AI handles the ordinary work; you handle the risk. {queue.length} draft{queue.length === 1 ? '' : 's'} awaiting review.</p>
        </div>
        <div className="flex gap-2">
          <Badge tone="progress">{queue.length} pending</Badge>
          {escalations > 0 && <Badge tone="danger">{escalations} escalation{escalations > 1 ? 's' : ''}</Badge>}
        </div>
      </div>

      <Card>
        <CardHeader title="Review queue" subtitle="Sorted by highest risk first." />
        {queue.length === 0 ? (
          <div className="p-6"><Empty>Queue is clear. 🎉</Empty></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2.5 font-medium">Candidate</th>
                  <th className="px-5 py-2.5 font-medium">Workflow</th>
                  <th className="px-5 py-2.5 font-medium">Risk</th>
                  <th className="px-5 py-2.5 text-center font-medium">Flags</th>
                  <th className="px-5 py-2.5 text-center font-medium">Missing</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {queue.map((q) => (
                  <tr key={q.review.id} className="group hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-medium text-slate-800">{q.candidateName}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Badge tone="neutral">{WORKFLOW_META[q.workflowType].short}</Badge>
                        <span className="text-slate-600">{q.workflowTitle}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3"><Badge tone={RISK_META[q.highestSeverity].tone}>{RISK_META[q.highestSeverity].label}</Badge></td>
                    <td className="px-5 py-3 text-center tabular-nums text-slate-600">{q.flagCount}</td>
                    <td className="px-5 py-3 text-center tabular-nums text-slate-600">{q.missingCount}</td>
                    <td className="px-5 py-3 text-right">
                      <Link to={`/qa/${q.review.id}`} className={cx('inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-florence-700 hover:bg-florence-50')}>
                        Review <Icon.arrow className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
