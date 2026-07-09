import { useState, type ReactNode } from 'react'
import { api } from '../../api'
import { useAsync } from '../../lib/useAsync'
import { Badge, Button, Card, CardHeader, Icon, Spinner } from '../../lib/ui'
import type { FormDraft } from '@shared/types'

const tokens = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean).sort().join(' ')

/** Guided NCLEX / Pearson VUE registration. Leads with the exact-name match —
 *  the most common, most expensive failure — and resolves the mismatch flag. */
export function NclexRegisterModal({ workflowId, onClose, onDone }: { workflowId: string; onClose: () => void; onDone: () => void }) {
  const { data, loading } = useAsync(() => api.workflow(workflowId), [workflowId])
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        {loading || !data?.draft ? (
          <Card><div className="grid place-items-center py-16"><Spinner /></div></Card>
        ) : (
          <Flow draft={data.draft} workflowId={workflowId} onClose={onClose} onDone={onDone} />
        )}
      </div>
    </div>
  )
}

const inp = 'w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-florence-400 focus:outline-none'
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-0.5 block text-xs text-slate-500">{label}</span>{children}</label>
}

function Flow({ draft, workflowId, onClose, onDone }: { draft: FormDraft; workflowId: string; onClose: () => void; onDone: () => void }) {
  const all = draft.sections.flatMap((s) => s.answers)
  const val = (id: string) => all.find((a) => a.fieldId === id)?.value ?? ''
  const exactName = val('legal_name')
  const currentPearson = val('pearson_name')
  const nrb = val('nrb')
  const mismatch = !!currentPearson && tokens(currentPearson) !== tokens(exactName)

  const [pearsonName, setPearsonName] = useState(exactName)
  const [programCode, setProgramCode] = useState(val('program_code'))
  const [email, setEmail] = useState(val('email'))
  const [registered, setRegistered] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setBusy(true); setError(null)
    try {
      await api.nclexRegister(workflowId, { nameOnPearson: pearsonName.trim(), programCode: programCode.trim() || undefined, email: email.trim() || undefined, registered })
      onDone()
    } catch (e: any) { setError(String(e?.message ?? e)) } finally { setBusy(false) }
  }

  return (
    <Card className="flex max-h-[88vh] flex-col overflow-hidden">
      <CardHeader title={`Register for the NCLEX${nrb ? ` — ${nrb}` : ''}`} subtitle="With Pearson VUE. The #1 thing we get exactly right: your name." />
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Use this exact name</div>
          <div className="rounded-lg border border-florence-200 bg-florence-50 px-3 py-2.5">
            <div className="text-xs text-slate-500">Your full legal name, exactly as on your passport — this must match at the test center</div>
            <div className="mt-0.5 text-base font-semibold text-ink">{exactName || '—'}</div>
          </div>
          {mismatch && (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              <Icon.shield className="mt-0.5 h-4 w-4 shrink-0" />
              <span>We had <strong>“{currentPearson}”</strong> on file, which does <strong>not</strong> match your ID — registering with it would fail you at check-in. We’ve set the field below to your exact legal name.</span>
            </div>
          )}
          <div className="mt-2">
            <Field label="Name you’ll register with Pearson">
              <input value={pearsonName} onChange={(e) => setPearsonName(e.target.value)} className={inp} />
            </Field>
            {!mismatch && tokens(pearsonName) === tokens(exactName) && pearsonName && (
              <div className="mt-1 flex items-center gap-1 text-xs text-emerald-700"><Badge tone="success">matches your ID</Badge></div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">What you’ll need</div>
          <div className="space-y-2">
            <Field label="Program code"><input value={programCode} onChange={(e) => setProgramCode(e.target.value)} placeholder="from your nursing program / board" className={inp} /></Field>
            <Field label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} className={inp} /></Field>
            <div className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">NCLEX-RN registration fee: <strong>US$200</strong>, paid to Pearson VUE.</div>
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Register & pay on Pearson VUE</div>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
            <li>Create your account at <a href="https://home.pearsonvue.com/nclex" target="_blank" rel="noreferrer" className="font-medium text-florence-700 hover:underline">Pearson VUE — NCLEX ↗</a>.</li>
            <li>Enter your program code and your name <strong>exactly</strong> as shown above.</li>
            <li>Pay the US$200 fee. You’ll get your Authorization to Test (ATT) after your board declares you eligible.</li>
          </ol>
        </div>

        <label className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <input type="checkbox" checked={registered} onChange={(e) => setRegistered(e.target.checked)} className="mt-0.5" />
          <span>I’ve registered with Pearson VUE using the exact name above.</span>
        </label>
        {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={!pearsonName.trim() || !registered || busy}>{busy ? 'Saving…' : 'Save my registration'}</Button>
      </div>
    </Card>
  )
}
