import { useState } from 'react'
import { api } from '../../api'
import { useAsync } from '../../lib/useAsync'
import { Badge, Button, Card, CardHeader, Spinner } from '../../lib/ui'
import { getEndorsementState } from '@shared/endorsement'
import type { FormDraft } from '@shared/types'

/** State-aware licensure-by-endorsement flow. Pulls the target state's grounded
 *  requirements from the endorsement engine, lets the candidate mark each step
 *  complete, then attests & submits (reusing the licensure-submit endpoint). */
export function EndorsementFlow({ workflowId, targetState, onClose, onDone }: { workflowId: string; targetState?: string; onClose: () => void; onDone: () => void }) {
  const { data, loading } = useAsync(() => api.workflow(workflowId), [workflowId])
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        {loading || !data?.draft ? (
          <Card><div className="grid place-items-center py-16"><Spinner /></div></Card>
        ) : (
          <Flow draft={data.draft} targetState={targetState} workflowId={workflowId} onClose={onClose} onDone={onDone} />
        )}
      </div>
    </div>
  )
}

const inp = 'w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-florence-400 focus:outline-none'

function Flow({ draft, targetState, workflowId, onClose, onDone }: { draft: FormDraft; targetState?: string; workflowId: string; onClose: () => void; onDone: () => void }) {
  const st = getEndorsementState(targetState)
  const section = draft.sections.find((s) => s.key === 'endorsement')
  const answers = section?.answers ?? []
  const prefilled = answers.filter((a) => a.value)
  const actions = answers.filter((a) => !a.value)

  const [done, setDone] = useState<Record<string, boolean>>({})
  const [reviewed, setReviewed] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allDone = actions.every((a) => done[a.fieldId])
  const canSubmit = allDone && reviewed && !!name.trim() && !busy

  const submit = async () => {
    setBusy(true); setError(null)
    try {
      const out = actions.filter((a) => done[a.fieldId]).map((a) => ({ fieldId: a.fieldId, value: 'Completed' }))
      await api.licensureSubmit(workflowId, { signatureName: name.trim(), answers: out, confirmedFieldIds: prefilled.map((a) => a.fieldId) })
      onDone()
    } catch (e: any) { setError(String(e?.message ?? e)) } finally { setBusy(false) }
  }

  return (
    <Card className="flex max-h-[88vh] flex-col overflow-hidden">
      <CardHeader title={`Endorse your license to ${st?.state ?? targetState ?? 'your target state'}`} subtitle={st?.board ?? 'Licensure by endorsement'} />
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {st && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {st.compact && <Badge tone="info">Compact (NLC) state</Badge>}
              {st.feeUsd ? <Badge tone="neutral">${st.feeUsd} fee</Badge> : null}
              {st.timelineDays ? <Badge tone="neutral">~{st.timelineDays[0]}–{st.timelineDays[1]} days</Badge> : null}
            </div>
            <ul className="mt-2 space-y-1">
              {st.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2 text-xs text-slate-600"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />{h}</li>
              ))}
            </ul>
            {st.compact && <p className="mt-2 rounded bg-florence-50 px-2 py-1 text-[11px] text-florence-700">{st.state} is a compact state — if you hold a multistate license from your compact home state, you may be able to practice without a separate {st.state} license.</p>}
          </div>
        )}

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">From your record</div>
          <div className="space-y-2">
            {prefilled.map((a) => (
              <div key={a.fieldId} className="rounded-lg border border-slate-200 px-3 py-2">
                <div className="text-xs text-slate-500">{a.label}</div>
                <div className="text-sm font-medium text-slate-800">{a.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">What you need to do</div>
          <div className="space-y-2">
            {actions.map((a) => (
              <label key={a.fieldId} className="flex items-start gap-2.5 rounded-lg border border-slate-200 px-3 py-2">
                <input type="checkbox" checked={!!done[a.fieldId]} onChange={(e) => setDone((s) => ({ ...s, [a.fieldId]: e.target.checked }))} className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-slate-800">{a.label}</div>
                  {a.note && <div className="text-xs text-slate-500">{a.note}</div>}
                </div>
              </label>
            ))}
          </div>
        </div>

        {st?.officialResources?.length ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {st.officialResources.map((r) => <a key={r.url} href={r.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-florence-700 hover:underline">{r.label} ↗</a>)}
          </div>
        ) : null}

        <div className="space-y-2 border-t border-slate-100 pt-3">
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} className="mt-0.5" />
            <span>I’ve reviewed this and the information is true and correct.</span>
          </label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Type your full legal name to attest" className={inp} />
          {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={!canSubmit}>{busy ? 'Submitting…' : 'Attest & submit endorsement'}</Button>
      </div>
    </Card>
  )
}
