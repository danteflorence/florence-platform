import { useState, type ReactNode } from 'react'
import { api } from '../../api'
import { useAsync } from '../../lib/useAsync'
import { Button, Card, CardHeader, Spinner } from '../../lib/ui'
import type { CandidateDossier } from '@shared/types'

/** Guided ATT capture + NCLEX exam scheduling. The ATT validity is the binding
 *  constraint — the exam must fall inside it. Tests are taken at a U.S. center. */
export function NclexAttModal({ candidateId, workflowId, onClose, onDone }: { candidateId: string; workflowId: string; onClose: () => void; onDone: () => void }) {
  const { data, loading } = useAsync(() => api.dossier(candidateId), [candidateId])
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        {loading || !data ? (
          <Card><div className="grid place-items-center py-16"><Spinner /></div></Card>
        ) : (
          <Flow dossier={data} workflowId={workflowId} onClose={onClose} onDone={onDone} />
        )}
      </div>
    </div>
  )
}

const inp = 'w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-florence-400 focus:outline-none'
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-0.5 block text-xs text-slate-500">{label}</span>{children}</label>
}

function Flow({ dossier, workflowId, onClose, onDone }: { dossier: CandidateDossier; workflowId: string; onClose: () => void; onDone: () => void }) {
  const reg = dossier.nclex[0]
  const existingExam = dossier.appointments.find((a) => a.kind === 'nclex' && a.status !== 'cancelled')

  const [attNumber, setAttNumber] = useState(reg?.attNumber ?? '')
  const [attExpiresOn, setAttExpiresOn] = useState(reg?.attExpiresOn ?? '')
  const [examDate, setExamDate] = useState(existingExam?.scheduledFor ?? '')
  const [testCenter, setTestCenter] = useState(existingExam?.location ?? '')
  const [readiness, setReadiness] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectiveAtt = attExpiresOn || reg?.attExpiresOn || ''
  const examTooLate = !!(examDate && effectiveAtt && examDate > effectiveAtt)
  const canSave = (!!attExpiresOn || !!examDate) && !examTooLate && (!examDate || (readiness && !!testCenter.trim())) && !busy

  const save = async () => {
    setBusy(true); setError(null)
    try {
      await api.nclexAtt(workflowId, {
        attNumber: attNumber.trim() || undefined,
        attExpiresOn: attExpiresOn || undefined,
        examDate: examDate || undefined,
        testCenter: testCenter.trim() || undefined,
        readinessConfirmed: readiness,
      })
      onDone()
    } catch (e: any) { setError(String(e?.message ?? e)) } finally { setBusy(false) }
  }

  return (
    <Card className="flex max-h-[88vh] flex-col overflow-hidden">
      <CardHeader title="Your NCLEX — ATT & exam scheduling" subtitle="Record your Authorization to Test, then book your exam at a U.S. test center." />
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Authorization to Test (ATT)</div>
          <p className="mb-2 text-xs text-slate-500">After your board declares you eligible and you’ve registered, Pearson VUE emails your ATT. It’s valid for a limited window (often ~90 days) — you must test before it expires.</p>
          <div className="space-y-2">
            <Field label="ATT number — optional"><input value={attNumber} onChange={(e) => setAttNumber(e.target.value)} className={inp} /></Field>
            <Field label="ATT expires on"><input type="date" value={attExpiresOn} onChange={(e) => setAttExpiresOn(e.target.value)} className={inp} /></Field>
          </div>
          {effectiveAtt && <div className="mt-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800">⏳ You must take the NCLEX on or before <strong>{effectiveAtt}</strong>. We’ll track this for you.</div>}
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Schedule your exam — U.S. test center</div>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
            <li>On <a href="https://home.pearsonvue.com/nclex" target="_blank" rel="noreferrer" className="font-medium text-florence-700 hover:underline">Pearson VUE — NCLEX ↗</a>, choose “Schedule” and pick a U.S. test center near you.</li>
            <li>Choose a date inside your ATT window, then record it here so we can track it.</li>
          </ol>
          <div className="mt-2 space-y-2">
            <Field label="U.S. test center (city, state)"><input value={testCenter} onChange={(e) => setTestCenter(e.target.value)} placeholder="e.g. Miami, FL" className={inp} /></Field>
            <Field label="Exam date"><input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className={inp} /></Field>
          </div>
          {examTooLate && <div className="mt-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs text-rose-700">Your exam date is after your ATT expiry ({effectiveAtt}). Pick an earlier date.</div>}
          {examDate && !examTooLate && (
            <label className="mt-2 flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={readiness} onChange={(e) => setReadiness(e.target.checked)} className="mt-0.5" />
              <span>I’m ready to test (or my Florence readiness check is cleared).</span>
            </label>
          )}
        </div>

        {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={!canSave}>{busy ? 'Saving…' : 'Save'}</Button>
      </div>
    </Card>
  )
}
