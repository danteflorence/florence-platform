import { useState } from 'react'
import { api } from '../../api'
import { Badge, Button, Card, CardHeader } from '../../lib/ui'
import { ENDORSEMENT_STATE_LIST, resolveEndorsement } from '@shared/endorsement'
import { getSsnPolicy } from '@shared/ssn-policy'

/** Choose-your-state engine: the nurse picks where they accepted a job, sees that
 *  state's grounded requirements, and we spin up the right pre-filled pathway
 *  (endorsement if licensed, exam if a new grad — decided server-side). */
export function StatePicker({ candidateId, current, onClose, onDone }: { candidateId: string; current?: string; onClose: () => void; onDone: () => void }) {
  const [state, setState] = useState(current && ENDORSEMENT_STATE_LIST.includes(current) ? current : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const st = state ? resolveEndorsement(state) : null
  const ssn = getSsnPolicy(state)
  const ssnTone = (ssn.requirement === 'required' || ssn.requirement === 'itin_ok') ? 'bg-amber-50 text-amber-800' : ssn.requirement === 'unverified' ? 'bg-slate-50 text-slate-500' : 'bg-emerald-50 text-emerald-700'

  const start = async () => {
    if (!state) return
    setBusy(true); setError(null)
    try { await api.chooseState(candidateId, state); onDone() }
    catch (e: any) { setError(String(e?.message ?? e)) } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <Card className="flex max-h-[88vh] flex-col overflow-hidden">
          <CardHeader title="Choose your target state" subtitle="Where did you accept (or want) a job? We’ll build the right pre-filled pathway." />
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <label className="block">
              <span className="mb-0.5 block text-xs text-slate-500">State</span>
              <select value={state} onChange={(e) => setState(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-florence-400 focus:outline-none">
                <option value="">Select a state…</option>
                {ENDORSEMENT_STATE_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>

            {st && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-ink">{st.board}</div>
                  <div className="flex gap-1.5">{st.compact && <Badge tone="info">Compact</Badge>}{st.feeUsd ? <Badge tone="neutral">${st.feeUsd}</Badge> : null}{st.timelineDays ? <Badge tone="neutral">~{st.timelineDays[0]}–{st.timelineDays[1]}d</Badge> : null}</div>
                </div>
                <dl className="mt-2 space-y-1.5 text-xs">
                  <div><dt className="inline font-medium text-slate-500">Verification: </dt><dd className="inline text-slate-700">{st.verification}</dd></div>
                  <div><dt className="inline font-medium text-slate-500">Background: </dt><dd className="inline text-slate-700">{st.fingerprints}</dd></div>
                  {st.jurisprudence && <div><dt className="inline font-medium text-slate-500">Jurisprudence: </dt><dd className="inline text-slate-700">{st.jurisprudence}</dd></div>}
                  {st.continuingEd && <div><dt className="inline font-medium text-slate-500">CE: </dt><dd className="inline text-slate-700">{st.continuingEd}</dd></div>}
                </dl>
                {st.compact && <p className="mt-2 rounded bg-florence-50 px-2 py-1 text-[11px] text-florence-700">Compact state — a multistate license from your compact home state may let you practice here without a separate license.</p>}
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {st.officialResources.slice(0, 3).map((r) => <a key={r.url} href={r.url} target="_blank" rel="noreferrer" className="text-[11px] font-medium text-florence-700 hover:underline">{r.label} ↗</a>)}
                </div>
                <p className="mt-2 rounded bg-sky-50 px-2 py-1 text-[11px] text-sky-700">Fingerprinting is captured <strong>in person</strong> after you arrive in the U.S. — we keep it queued and pre-filled for when you land in Los Angeles.</p>
                <p className={`mt-1.5 rounded px-2 py-1 text-[11px] ${ssnTone}`}><strong>SSN:</strong> {ssn.summary}</p>
              </div>
            )}
            <p className="text-xs text-slate-500">We’ll automatically set up <strong>endorsement</strong> if you already hold a U.S. RN license, or <strong>licensure by exam</strong> if you’re a new graduate — pre-filled from your profile.</p>
            {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={start} disabled={!state || busy}>{busy ? 'Setting up…' : `Start ${state || ''} pathway`}</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
