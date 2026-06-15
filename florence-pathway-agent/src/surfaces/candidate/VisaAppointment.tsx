import { useState, type ReactNode } from 'react'
import { api } from '../../api'
import { useAsync } from '../../lib/useAsync'
import { Badge, Button, Card, CardHeader, Spinner } from '../../lib/ui'
import type { FormDraft, JurisdictionRule } from '@shared/types'

/** Guided visa-interview scheduling: we hand the candidate the data they need
 *  (DS-160 confirmation number, suggested consulate) and the official links, then
 *  capture the appointment they booked so the system can monitor the date. */
export function VisaAppointmentModal({ workflowId, onClose, onDone }: { workflowId: string; onClose: () => void; onDone: () => void }) {
  const { data, loading } = useAsync(() => api.workflow(workflowId), [workflowId])
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
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

function Flow({ draft, rule, workflowId, onClose, onDone }: { draft: FormDraft; rule: JurisdictionRule; workflowId: string; onClose: () => void; onDone: () => void }) {
  const answers = draft.sections[0]?.answers ?? []
  const confAns = answers.find((a) => a.fieldId === 'ds160_confirmation')
  const conf = confAns?.value && confAns.value !== 'On file' ? confAns.value : null
  const defaultConsulate = answers.find((a) => a.fieldId === 'consulate')?.value ?? ''

  const [consulate, setConsulate] = useState(defaultConsulate)
  const [date, setDate] = useState('')
  const [location, setLocation] = useState('')
  const [mrv, setMrv] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setBusy(true); setError(null)
    try {
      await api.scheduleAppointment(workflowId, { consulate: consulate.trim(), appointmentDate: date, location: location.trim() || undefined, mrvReceipt: mrv.trim() || undefined })
      onDone()
    } catch (e: any) { setError(String(e?.message ?? e)) } finally { setBusy(false) }
  }

  return (
    <Card className="flex max-h-[88vh] flex-col overflow-hidden">
      <CardHeader title="Schedule your visa interview" subtitle="We’ve prepared what you need — book on the official portal, then record it here." />
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">What we’ve prepared for you</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
              <div className="min-w-0">
                <div className="text-xs text-slate-500">DS-160 confirmation number — you’ll enter this on the portal</div>
                {conf
                  ? <div className="font-mono text-sm font-semibold tracking-widest text-slate-800">{conf}</div>
                  : <div className="text-sm text-amber-700">Submit your DS-160 in CEAC first to get this number.</div>}
              </div>
              {conf && <Badge tone="success">on file</Badge>}
            </div>
            <div className="rounded-lg border border-slate-200 px-3 py-2">
              <div className="text-xs text-slate-500">Suggested consulate (by your country of residence)</div>
              <div className="text-sm font-medium text-slate-800">{defaultConsulate || '—'}</div>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Pay the visa fee & book on the official portal</div>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
            <li>On your country’s official appointment portal, create a profile and enter your DS-160 confirmation number (above).</li>
            <li>Pay the visa application (MRV) fee.</li>
            <li>Choose an interview date at your consulate — then record it below.</li>
          </ol>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {rule?.officialResources?.map((r) => (
              <a key={r.url} href={r.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-florence-700 hover:underline">{r.label} ↗</a>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Record your appointment</div>
          <div className="space-y-2">
            <Field label="Consulate / embassy"><input value={consulate} onChange={(e) => setConsulate(e.target.value)} className={inp} /></Field>
            <Field label="Interview date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} /></Field>
            <Field label="Location (city) — optional"><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Manila" className={inp} /></Field>
            <Field label="MRV fee receipt number — optional"><input value={mrv} onChange={(e) => setMrv(e.target.value)} className={inp} /></Field>
          </div>
        </div>

        {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={!consulate.trim() || !date || busy}>{busy ? 'Saving…' : 'Record my appointment'}</Button>
      </div>
    </Card>
  )
}
