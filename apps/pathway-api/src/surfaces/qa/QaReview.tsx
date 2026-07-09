import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api'
import { useAsync } from '../../lib/useAsync'
import { Badge, Button, Card, CardHeader, Empty, Icon, Spinner, cx } from '../../lib/ui'
import { FIELD_STATUS_META, RISK_META, STATUS_META } from '@shared/constants'
import type { QaDetail } from '@shared/views'
import type { FormAnswer, JurisdictionRule } from '@shared/types'

export default function QaReview() {
  const { id } = useParams()
  const { data, loading, error, reload } = useAsync(() => api.qaReview(id!), [id])

  if (loading) return <div className="py-16"><Spinner label="Loading review…" /></div>
  if (error || !data) return <Empty>Could not load review. {error}</Empty>

  return (
    <div className="space-y-5">
      <Link to="/qa" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <Icon.arrow className="h-4 w-4 rotate-180" /> Back to queue
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-[-0.02em] text-ink">{data.candidateName}</h1>
          <p className="mt-0.5 text-sm text-slate-600">{data.workflow.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={STATUS_META[data.workflow.status].tone}>{STATUS_META[data.workflow.status].label}</Badge>
          {data.review.status !== 'pending' && <Badge tone={data.review.status === 'approved' ? 'success' : 'warn'}>{data.review.status === 'approved' ? 'Approved' : 'Changes requested'}</Badge>}
        </div>
      </div>

      {data.compliance.blocked && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <Icon.alert className="mt-0.5 h-4 w-4 shrink-0" />
          <div><strong>Blocked — escalation required.</strong> This workflow cannot proceed automatically until a specialist/counsel resolves the items below. Approval is disabled.</div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* form preview */}
        <div className="space-y-4 lg:col-span-3">
          <Card>
            <CardHeader title="Form draft preview" subtitle="Every answer is linked to its evidence and provenance." right={<Badge tone="neutral">{data.draft?.formType ?? '—'}</Badge>} />
            {!data.draft ? <div className="p-5"><Empty>No draft.</Empty></div> : (
              <div className="divide-y divide-slate-100">
                {data.draft.sections.map((s) => (
                  <div key={s.key} className="px-5 py-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{s.title}</div>
                    <div className="space-y-2">
                      {s.answers.map((a) => <AnswerRow key={a.fieldId} a={a} />)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Audit trail" subtitle="Every generated answer, decision, and milestone is logged." />
            <div className="scroll-thin max-h-64 divide-y divide-slate-50 overflow-y-auto">
              {data.audit.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2 px-5 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge tone="neutral">{e.actor}</Badge>
                    <span className="text-slate-600">{e.action}</span>
                    {e.detail && <span className="text-slate-400">— {e.detail}</span>}
                  </div>
                  <span className="text-slate-400">{new Date(e.at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* QA panel */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Agent summary" right={<Icon.sparkle className="h-4 w-4 text-florence-500" />} />
            <div className="whitespace-pre-wrap px-5 py-3 text-sm text-slate-600">{data.review.summary}</div>
          </Card>

          {data.review.flags.length > 0 && (
            <Card>
              <CardHeader title="Consistency & risk flags" right={<Badge tone="danger">{data.review.flags.length}</Badge>} />
              <div className="divide-y divide-slate-100">
                {data.review.flags.map((f) => (
                  <div key={f.id} className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Badge tone={RISK_META[f.severity].tone}>{RISK_META[f.severity].label}</Badge>
                      {f.requiresEscalation && <Badge tone="danger">Escalate</Badge>}
                      <span className="text-sm font-medium text-slate-800">{f.message}</span>
                    </div>
                    {f.involved.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5 text-xs text-slate-500">
                        {f.involved.map((x, i) => <li key={i} className="flex gap-1.5"><span className="text-slate-300">•</span>{x}</li>)}
                      </ul>
                    )}
                    {f.suggestedAction && <p className="mt-1 text-xs italic text-slate-500">→ {f.suggestedAction}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {data.review.missing.length > 0 && (
            <Card>
              <CardHeader title="Missing data" right={<Badge tone="warn">{data.review.missing.length}</Badge>} />
              <div className="divide-y divide-slate-100">
                {data.review.missing.map((m) => (
                  <div key={m.fieldId} className="flex items-start justify-between gap-2 px-5 py-2.5">
                    <div>
                      <div className="text-sm font-medium text-slate-700">{m.label}</div>
                      <p className="text-xs text-slate-500">{m.question}</p>
                    </div>
                    {m.blocker && <Badge tone="warn">blocking</Badge>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Compliance data={data} />
          <Sources rule={data.rule} />
          <Decision data={data} onDecided={reload} />
          <DeficiencyLogger workflowId={data.workflow.id} onLogged={reload} />
        </div>
      </div>
    </div>
  )
}

function AnswerRow({ a }: { a: FormAnswer }) {
  const meta = FIELD_STATUS_META[a.status]
  return (
    <div className={cx('rounded-lg border px-3 py-2', a.sensitive ? 'border-amber-200 bg-amber-50/50' : 'border-slate-100')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
          {a.sensitive && <Icon.shield className="h-3.5 w-3.5 text-amber-600" />}
          {a.label}
        </div>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>
      <div className={cx('mt-0.5 text-sm', a.value ? 'text-slate-900' : 'italic text-slate-400')}>{a.value ?? '— not provided —'}</div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        {a.evidence.map((e, i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
            <Icon.doc className="h-3 w-3" />{e.detail}
          </span>
        ))}
        {a.value && <span className="text-[10px] text-slate-400">· {a.confidence} confidence</span>}
      </div>
      {a.note && <p className="mt-1 text-xs text-amber-700">{a.note}</p>}
    </div>
  )
}

function Compliance({ data }: { data: QaDetail }) {
  const c = data.compliance
  return (
    <Card>
      <CardHeader title="Compliance" right={<Badge tone={c.blocked ? 'danger' : 'success'}>{c.blocked ? 'Blocked' : 'Clear'}</Badge>} />
      <div className="space-y-2 px-5 py-3 text-sm">
        <div className="flex flex-wrap gap-2">
          {c.requiresApplicantSignature && <Badge tone="info">Applicant must sign (DS-160)</Badge>}
          {c.requiresAttestation && <Badge tone="info">Candidate attestation required</Badge>}
        </div>
        {c.notes.map((n, i) => <p key={i} className="flex gap-1.5 text-xs text-slate-600"><Icon.shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-florence-500" />{n}</p>)}
        {c.blocks.length > 0 && (
          <div className="mt-1 space-y-1 rounded-lg bg-rose-50 px-3 py-2">
            {c.blocks.map((b) => <div key={b.id} className="text-xs text-rose-700">⛔ {b.message}</div>)}
          </div>
        )}
      </div>
    </Card>
  )
}

function Sources({ rule }: { rule: JurisdictionRule }) {
  return (
    <Card>
      <CardHeader title="Sources & official references" subtitle={rule.authority} />
      <div className="space-y-3 px-5 py-3">
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Grounded in</div>
          <ul className="space-y-1.5">
            {rule.citations.map((c, i) => (
              <li key={i} className="text-xs">
                {c.url
                  ? <a href={c.url} target="_blank" rel="noreferrer" className="font-medium text-florence-700 underline-offset-2 hover:underline">{c.label} ↗</a>
                  : <span className="font-medium text-slate-700">{c.label}</span>}
                <span className="mt-0.5 block text-slate-500">{c.note}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Official resources</div>
          <ul className="space-y-1">
            {rule.officialResources.map((r) => (
              <li key={r.url}><a href={r.url} target="_blank" rel="noreferrer" className="text-xs text-florence-700 underline-offset-2 hover:underline">{r.label} ↗</a></li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  )
}

function DeficiencyLogger({ workflowId, onLogged }: { workflowId: string; onLogged: () => void }) {
  const [open, setOpen] = useState(false)
  const [source, setSource] = useState('')
  const [items, setItems] = useState('')
  const [busy, setBusy] = useState(false)
  const log = async () => {
    const list = items.split('\n').map((s) => s.trim()).filter(Boolean)
    if (!source.trim() || !list.length) return
    setBusy(true)
    try { await api.logDeficiency(workflowId, source.trim(), list); setOpen(false); setSource(''); setItems(''); onLogged() } finally { setBusy(false) }
  }
  return (
    <Card>
      <CardHeader title="Log a board deficiency" subtitle="The AI classifies it and routes a response to the candidate." right={<Button size="sm" variant={open ? 'ghost' : 'outline'} onClick={() => setOpen((o) => !o)}>{open ? 'Cancel' : 'Log'}</Button>} />
      {open && (
        <div className="space-y-2 px-5 py-3">
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source (e.g. Florida BON)" className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-florence-400 focus:outline-none" />
          <textarea value={items} onChange={(e) => setItems(e.target.value)} placeholder="One deficiency item per line…" rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-florence-400 focus:outline-none" />
          <div className="flex justify-end"><Button size="sm" onClick={log} disabled={busy}>{busy ? 'Logging…' : 'Record deficiency'}</Button></div>
        </div>
      )}
    </Card>
  )
}

function Decision({ data, onDecided }: { data: QaDetail; onDecided: () => void }) {
  const [reviewer, setReviewer] = useState('QA Reviewer')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const decided = data.review.status !== 'pending'

  const decide = async (decision: 'approve' | 'request_changes') => {
    setBusy(true)
    try { await api.qaDecide(data.review.id, decision, reviewer.trim() || 'QA Reviewer', notes.trim() || undefined); onDecided() }
    finally { setBusy(false) }
  }

  if (decided) {
    return (
      <Card>
        <div className="px-5 py-4 text-sm">
          <div className="flex items-center gap-2 font-medium text-slate-800">
            <Icon.check className="h-4 w-4 text-emerald-600" />
            {data.review.status === 'approved' ? 'Approved' : 'Changes requested'} by {data.review.reviewer}
          </div>
          {data.review.reviewerNotes && <p className="mt-1 text-slate-500">{data.review.reviewerNotes}</p>}
          <Link to="/qa" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-florence-700 hover:underline">Back to queue <Icon.arrow className="h-3.5 w-3.5" /></Link>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader title="Decision" />
      <div className="space-y-3 px-5 py-3">
        <input value={reviewer} onChange={(e) => setReviewer(e.target.value)} placeholder="Reviewer name"
          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-florence-400 focus:outline-none" />
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reviewer notes (optional)" rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-florence-400 focus:outline-none" />
        <div className="flex gap-2">
          <Button onClick={() => decide('approve')} disabled={busy || data.compliance.blocked} >
            <Icon.check className="h-4 w-4" /> Approve
          </Button>
          <Button variant="outline" onClick={() => decide('request_changes')} disabled={busy}>Request changes</Button>
        </div>
        {data.compliance.blocked && <p className="text-xs text-rose-600">Approval disabled — resolve escalation items first.</p>}
      </div>
    </Card>
  )
}
