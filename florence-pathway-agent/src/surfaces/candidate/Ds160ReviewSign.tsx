import { useState } from 'react'
import { api } from '../../api'
import { useAsync } from '../../lib/useAsync'
import { Badge, Button, Card, CardHeader, Progress, Spinner, cx } from '../../lib/ui'
import type { FormDraft, FormAnswer, FormSection } from '@shared/types'

type Sens = { value: string; note: string }

/** Full DS-160 review-and-sign walkthrough. The applicant confirms every prepared
 *  answer and personally answers the security questions — the attestation is only
 *  valid because this review happened. */
export function Ds160ReviewSign({ workflowId, onClose, onSigned }: { workflowId: string; onClose: () => void; onSigned: () => void }) {
  const { data, loading } = useAsync(() => api.workflow(workflowId), [workflowId])
  const draft: FormDraft | undefined = data?.draft
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        {loading || !draft ? (
          <Card><div className="grid place-items-center py-16"><Spinner /></div></Card>
        ) : (
          <ReviewFlow draft={draft} workflowId={workflowId} onClose={onClose} onSigned={onSigned} />
        )}
      </div>
    </div>
  )
}

function ReviewFlow({ draft, workflowId, onClose, onSigned }: { draft: FormDraft; workflowId: string; onClose: () => void; onSigned: () => void }) {
  const sections = draft.sections
  const total = sections.length
  const allSensitive = sections.flatMap((s) => s.answers).filter((a) => a.sensitive)
  const [step, setStep] = useState(0) // 0..total-1 = sections; total = sign step
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({})
  const [sensitive, setSensitive] = useState<Record<string, Sens>>({})
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [name, setName] = useState('')
  const [ack, setAck] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sectionComplete = (s: FormSection): boolean => {
    const sensOk = s.answers.filter((a) => a.sensitive).every((a) => sensitive[a.fieldId]?.value)
    const hasFactual = s.answers.some((a) => !a.sensitive)
    return sensOk && (!hasFactual || confirmed[s.key])
  }
  const allComplete = sections.every(sectionComplete)
  const answeredSensitive = allSensitive.filter((a) => sensitive[a.fieldId]?.value).length
  const onSignStep = step >= total
  const current = sections[step]

  const sign = async () => {
    setBusy(true); setError(null)
    try {
      const answers = [
        ...Object.entries(sensitive).filter(([, v]) => v.value).map(([fieldId, v]) => ({ fieldId, value: v.value, note: v.note.trim() || undefined })),
        ...Object.entries(edits).filter(([, v]) => v.trim()).map(([fieldId, value]) => ({ fieldId, value: value.trim() })),
      ]
      const confirmedFieldIds = sections
        .filter((s) => confirmed[s.key])
        .flatMap((s) => s.answers.filter((a) => !a.sensitive && a.value != null && a.value !== '').map((a) => a.fieldId))
      await api.reviewAndSign(workflowId, { signatureName: name.trim(), answers, confirmedFieldIds })
      onSigned()
    } catch (e: any) { setError(String(e?.message ?? e)) } finally { setBusy(false) }
  }

  return (
    <Card className="flex max-h-[88vh] flex-col overflow-hidden">
      <CardHeader
        title="Review your DS-160 before signing"
        subtitle={onSignStep ? 'Final step — your signature' : `Section ${step + 1} of ${total}: ${current.title}`}
        right={<Badge tone={answeredSensitive === allSensitive.length ? 'success' : 'warn'}>{answeredSensitive}/{allSensitive.length} required answered</Badge>}
      />
      <div className="px-5 pt-3"><Progress value={onSignStep ? 1 : step / total} tone="progress" /></div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {onSignStep ? (
          <SignStep name={name} setName={setName} ack={ack} setAck={setAck} total={total} answeredSensitive={answeredSensitive} totalSensitive={allSensitive.length} error={error} />
        ) : (
          <SectionStep
            section={current}
            sensitive={sensitive}
            setSensitive={(fieldId, v) => setSensitive((s) => ({ ...s, [fieldId]: v }))}
            edits={edits}
            setEdit={(fieldId, v) => setEdits((s) => ({ ...s, [fieldId]: v }))}
            confirmed={!!confirmed[current.key]}
            setConfirmed={(b) => setConfirmed((c) => ({ ...c, [current.key]: b }))}
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
        <Button variant="ghost" onClick={() => (step === 0 ? onClose() : setStep(step - 1))}>{step === 0 ? 'Cancel' : 'Back'}</Button>
        {onSignStep ? (
          <Button onClick={sign} disabled={!allComplete || !ack || !name.trim() || busy}>{busy ? 'Recording…' : 'Confirm review & sign'}</Button>
        ) : (
          <Button onClick={() => setStep(step + 1)} disabled={!sectionComplete(current)}>{step === total - 1 ? 'Review complete →' : 'Next section'}</Button>
        )}
      </div>
    </Card>
  )
}

function SectionStep({ section, sensitive, setSensitive, edits, setEdit, confirmed, setConfirmed }: {
  section: FormSection
  sensitive: Record<string, Sens>
  setSensitive: (fieldId: string, v: Sens) => void
  edits: Record<string, string>
  setEdit: (fieldId: string, v: string) => void
  confirmed: boolean
  setConfirmed: (b: boolean) => void
}) {
  const factual = section.answers.filter((a) => !a.sensitive)
  const sens = section.answers.filter((a) => a.sensitive)
  return (
    <div className="space-y-4">
      {factual.length > 0 && (
        <div className="space-y-2">
          {factual.map((a) => (
            <FactualRow key={a.fieldId} a={a} edit={edits[a.fieldId]} onEdit={(v) => setEdit(a.fieldId, v)} />
          ))}
          <label className="flex items-start gap-2 rounded-lg bg-florence-50 px-3 py-2 text-sm text-florence-800">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
            <span>I’ve reviewed this section and the information is correct.</span>
          </label>
        </div>
      )}
      {sens.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-rose-600">You must answer these yourself</div>
          {sens.map((a) => (
            <SensitiveRow key={a.fieldId} a={a} val={sensitive[a.fieldId]} onChange={(v) => setSensitive(a.fieldId, v)} />
          ))}
        </div>
      )}
    </div>
  )
}

function FactualRow({ a, edit, onEdit }: { a: FormAnswer; edit?: string; onEdit: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const shown = edit ?? a.value
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-slate-500">{a.label}</div>
          {editing ? (
            <input autoFocus defaultValue={shown ?? ''} onChange={(e) => onEdit(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-florence-400 focus:outline-none" />
          ) : (
            <div className="text-sm font-medium text-slate-800">{shown || <span className="italic text-slate-400">— not provided —</span>}</div>
          )}
          {a.evidence[0] && !editing && <div className="mt-0.5 text-[11px] text-slate-400">Source: {a.evidence[0].detail}</div>}
        </div>
        <button onClick={() => setEditing((v) => !v)} className="shrink-0 text-xs font-medium text-florence-600 hover:underline">{editing ? 'Done' : 'Edit'}</button>
      </div>
    </div>
  )
}

function SensitiveRow({ a, val, onChange }: { a: FormAnswer; val?: Sens; onChange: (v: Sens) => void }) {
  const v = val ?? { value: '', note: '' }
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50/40 px-3 py-2.5">
      <div className="text-sm font-medium text-slate-800">{a.label}</div>
      {a.note && <div className="mt-0.5 text-[11px] text-slate-500">{a.note}</div>}
      <div className="mt-2 flex gap-2">
        {['No', 'Yes'].map((opt) => (
          <button key={opt} onClick={() => onChange({ ...v, value: opt })}
            className={cx('rounded-lg border px-4 py-1 text-sm font-medium', v.value === opt ? 'border-florence-500 bg-florence-500 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400')}>
            {opt}
          </button>
        ))}
      </div>
      {v.value === 'Yes' && (
        <input value={v.note} onChange={(e) => onChange({ ...v, note: e.target.value })} placeholder="Please explain (the consular officer will ask)"
          className="mt-2 w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-florence-400 focus:outline-none" />
      )}
    </div>
  )
}

function SignStep({ name, setName, ack, setAck, total, answeredSensitive, totalSensitive, error }: {
  name: string; setName: (v: string) => void; ack: boolean; setAck: (b: boolean) => void
  total: number; answeredSensitive: number; totalSensitive: number; error: string | null
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        You reviewed all {total} sections and answered {answeredSensitive} of {totalSensitive} required security questions.
      </div>
      <p className="text-sm text-slate-600">
        By signing, you certify that you have read and understood the questions and that your answers are
        <strong> true and correct to the best of your knowledge and belief</strong>. You will personally sign and submit
        your DS-160 in CEAC — Florence never signs for you.
      </p>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5" />
        <span>I reviewed every answer myself, it is true and correct, and I will sign and submit my own DS-160.</span>
      </label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Type your full legal name to sign"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-florence-400 focus:outline-none" />
      {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
    </div>
  )
}
