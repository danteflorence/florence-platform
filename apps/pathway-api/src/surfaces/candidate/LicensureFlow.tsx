import { useState, type ReactNode } from 'react'
import { api } from '../../api'
import { useAsync } from '../../lib/useAsync'
import { Button, Card, CardHeader, Spinner } from '../../lib/ui'
import type { FormDraft, FormAnswer, JurisdictionRule } from '@shared/types'

/** Guided state licensure application: review the prepared packet, capture
 *  Livescan fingerprinting, then attest & submit. Generalizes across boards;
 *  the backend blocks submission while a required item is missing. */
export function LicensureFlow({ workflowId, onClose, onDone }: { workflowId: string; onClose: () => void; onDone: () => void }) {
  const { data, loading } = useAsync(() => api.workflow(workflowId), [workflowId])
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        {loading || !data?.draft ? (
          <Card><div className="grid place-items-center py-16"><Spinner /></div></Card>
        ) : (
          <Flow draft={data.draft} rule={data.rule} workflowId={workflowId} onClose={onClose} onDone={onDone} />
        )}
      </div>
    </div>
  )
}

const inp = 'w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-florence-400 focus:outline-none'
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-0.5 block text-xs text-slate-500">{label}</span>{children}</label>
}

function EditableRow({ a, edit, onEdit }: { a: FormAnswer; edit?: string; onEdit: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const shown = edit ?? a.value
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-slate-500">{a.label}</div>
          {editing
            ? <input autoFocus defaultValue={shown ?? ''} onChange={(e) => onEdit(e.target.value)} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-florence-400 focus:outline-none" />
            : <div className="text-sm font-medium text-slate-800">{shown}</div>}
          {a.evidence[0] && !editing && <div className="mt-0.5 text-[11px] text-slate-400">Source: {a.evidence[0].detail}</div>}
        </div>
        <button onClick={() => setEditing((v) => !v)} className="shrink-0 text-xs font-medium text-florence-600 hover:underline">{editing ? 'Done' : 'Edit'}</button>
      </div>
    </div>
  )
}

function Flow({ draft, rule, workflowId, onClose, onDone }: { draft: FormDraft; rule: JurisdictionRule; workflowId: string; onClose: () => void; onDone: () => void }) {
  const all = draft.sections.flatMap((s) => s.answers)
  const fp = all.find((a) => a.fieldId === 'fingerprint')
  const fields = all.filter((a) => a.fieldId !== 'fingerprint')
  const prefilled = fields.filter((a) => a.value)
  const missing = fields.filter((a) => !a.value)

  const [edits, setEdits] = useState<Record<string, string>>({})
  const [reviewed, setReviewed] = useState(false)
  const [fpDone, setFpDone] = useState(!!fp?.value)
  const [fpDate, setFpDate] = useState('')
  const [fpRef, setFpRef] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = reviewed && (!fp || fpDone) && !!name.trim() && !busy

  const submit = async () => {
    setBusy(true); setError(null)
    try {
      const answers = Object.entries(edits).filter(([, v]) => v.trim()).map(([fieldId, value]) => ({ fieldId, value: value.trim() }))
      if (fp && fpDone) answers.push({ fieldId: 'fingerprint', value: `Completed (Livescan)${fpDate ? ` on ${fpDate}` : ''}${fpRef ? ` · TCN ${fpRef}` : ''}` })
      await api.licensureSubmit(workflowId, { signatureName: name.trim(), answers, confirmedFieldIds: prefilled.map((a) => a.fieldId) })
      onDone()
    } catch (e: any) { setError(String(e?.message ?? e)) } finally { setBusy(false) }
  }

  return (
    <Card className="flex max-h-[88vh] flex-col overflow-hidden">
      <CardHeader title={`Complete your ${rule?.title ?? 'licensure application'}`} subtitle={rule?.authority} />
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {rule?.summary && <p className="text-sm text-slate-600">{rule.summary}</p>}

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Your application — prepared from your profile</div>
          <div className="space-y-2">
            {prefilled.map((a) => <EditableRow key={a.fieldId} a={a} edit={edits[a.fieldId]} onEdit={(v) => setEdits((s) => ({ ...s, [a.fieldId]: v }))} />)}
          </div>
          {missing.length > 0 && (
            <div className="mt-2 space-y-2">
              {missing.map((a) => (
                <Field key={a.fieldId} label={`${a.label} — needed`}>
                  <input value={edits[a.fieldId] ?? ''} onChange={(e) => setEdits((s) => ({ ...s, [a.fieldId]: e.target.value }))} className={inp} />
                </Field>
              ))}
            </div>
          )}
        </div>

        {fp && (
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Fingerprinting (Livescan)</div>
            <p className="mb-2 text-xs text-slate-500">{fp.note ?? 'Electronic (Livescan) fingerprinting is required for licensure.'}</p>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={fpDone} onChange={(e) => setFpDone(e.target.checked)} className="mt-0.5" />
              <span>I’ve completed electronic (Livescan) fingerprinting.</span>
            </label>
            {fpDone && (
              <div className="mt-2 space-y-2">
                <Field label="Date completed — optional"><input type="date" value={fpDate} onChange={(e) => setFpDate(e.target.value)} className={inp} /></Field>
                <Field label="Transaction / TCN — optional"><input value={fpRef} onChange={(e) => setFpRef(e.target.value)} className={inp} /></Field>
              </div>
            )}
          </div>
        )}

        {rule?.officialResources?.length ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {rule.officialResources.map((r) => <a key={r.url} href={r.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-florence-700 hover:underline">{r.label} ↗</a>)}
          </div>
        ) : null}

        <div className="space-y-2 border-t border-slate-100 pt-3">
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} className="mt-0.5" />
            <span>I’ve reviewed this application and the information is true and correct.</span>
          </label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Type your full legal name to attest" className={inp} />
          {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={!canSubmit}>{busy ? 'Submitting…' : 'Attest & submit application'}</Button>
      </div>
    </Card>
  )
}
