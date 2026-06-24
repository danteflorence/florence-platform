import { useState, type ChangeEvent } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../api'
import { useAsync } from '../../lib/useAsync'
import { Badge, Button, Card, CardHeader, Empty, Icon, Progress, Spinner, Stat, cx } from '../../lib/ui'
import { STATUS_META, RISK_META } from '@shared/constants'
import type { CandidateView, ChecklistEntry, MustReviewEntry, DeficiencyView } from '@shared/views'
import type { InterviewPrep } from '@shared/interview-prep'
import { Ds160ReviewSign } from './Ds160ReviewSign'
import { VisaAppointmentModal } from './VisaAppointment'
import { NclexRegisterModal } from './NclexRegister'
import { NclexAttModal } from './NclexAtt'
import { LicensureFlow } from './LicensureFlow'
import { EndorsementFlow } from './EndorsementFlow'
import { StatePicker } from './StatePicker'

export default function CandidateCopilot() {
  const { id } = useParams()
  const { data, loading, error, reload } = useAsync(() => api.candidateView(id!), [id])
  const [reviewing, setReviewing] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [scheduling, setScheduling] = useState<string | null>(null)
  const [registeringNclex, setRegisteringNclex] = useState<string | null>(null)
  const [nclexAttModal, setNclexAttModal] = useState<string | null>(null)
  const [licensure, setLicensure] = useState<string | null>(null)
  const [endorsing, setEndorsing] = useState<string | null>(null)
  const [choosingState, setChoosingState] = useState(false)

  if (loading) return <div className="py-16"><Spinner label="Assembling pathway…" /></div>
  if (error || !data) return <Empty>Could not load candidate. {error}</Empty>

  const v = data
  const blocked = v.workflows.filter((w) => w.status === 'blocked').length
  const urgent = v.deadlines.filter((d) => d.severity === 'high').length
  const ds160 = v.workflows.find((w) => w.type === 'ds160')
  const ds160Reviewable = ds160 && !['candidate_signed', 'submitted', 'completed'].includes(ds160.status)
  const ds160Signed = ds160?.status === 'candidate_signed'
  const va = v.workflows.find((w) => w.type === 'visa_appointment')
  const canSchedule = va && ds160?.status === 'submitted' && !['submitted', 'completed'].includes(va.status)
  const nclexWf = v.workflows.find((w) => w.type === 'nclex_att')
  const canRegisterNclex = nclexWf && !['submitted', 'completed'].includes(nclexWf.status)
  const nclexAttStage = nclexWf?.status === 'submitted'
  const EXAM_TYPES = ['florida_rn_exam', 'newyork_rn_exam', 'texas_rn_exam', 'california_rn_exam', 'arizona_rn_exam', 'rn_exam']
  const licWf = v.workflows.find((w) => EXAM_TYPES.includes(w.type) && !['submitted', 'completed'].includes(w.status))
  const endorsementWf = v.workflows.find((w) => w.type === 'endorsement' && !['submitted', 'completed'].includes(w.status))

  return (
    <div className="space-y-5">
      {/* identity header — white editorial (Florence uses flat fills, never gradients) */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-5 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-florence-50 text-florence-700 ring-1 ring-florence-200">
              <span className="font-display text-2xl font-bold leading-none">{`${v.profile.legalFirstName?.[0] ?? ''}${v.profile.legalLastName?.[0] ?? ''}`}</span>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-florence-700">Candidate pathway</div>
              <h1 className="mt-0.5 font-display text-3xl font-bold leading-tight tracking-[-0.02em] text-ink">{v.profile.legalFirstName} {v.profile.legalLastName}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
                <span>{v.profile.nationality}</span><span className="text-slate-300">·</span>
                <span>Target {v.profile.visaTarget ?? '—'}</span><span className="text-slate-300">·</span>
                <span>NCLEX {v.profile.nclexState ?? '—'}</span><span className="text-slate-300">·</span>
                <span>Start {v.profile.targetStartDate ?? '—'}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2.5">
            <HeaderStat label="Workflows" value={v.workflows.length} />
            <HeaderStat label="To-dos" value={v.checklist.length} tone={v.checklist.length ? 'warn' : 'ok'} />
            <HeaderStat label="Blocked" value={blocked} tone={blocked ? 'bad' : 'ok'} />
          </div>
        </div>
      </Card>

      {ds160Reviewable && (
        <Card className="border border-florence-200 bg-florence-50">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-start gap-3">
              <Icon.shield className="mt-0.5 h-5 w-5 shrink-0 text-florence-600" />
              <div>
                <div className="text-sm font-semibold text-ink">Your DS-160 is ready for your review</div>
                <p className="mt-0.5 text-xs text-slate-600">Florence prepared your draft. Review every answer, answer the security questions yourself, then sign — by law you must sign your own DS-160.</p>
              </div>
            </div>
            <Button onClick={() => setReviewing(ds160!.id)}>Review &amp; sign my DS-160</Button>
          </div>
        </Card>
      )}
      {reviewing && <Ds160ReviewSign workflowId={reviewing} onClose={() => setReviewing(null)} onSigned={() => { setReviewing(null); reload() }} />}

      {ds160Signed && (
        <Card className="border border-emerald-200 bg-emerald-50">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-start gap-3">
              <Icon.shield className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <div className="text-sm font-semibold text-ink">DS-160 signed — now submit it in CEAC</div>
                <p className="mt-0.5 text-xs text-slate-600">Submit your signed DS-160 in CEAC, then enter your confirmation number so we can use it to schedule your visa appointment.</p>
              </div>
            </div>
            <Button onClick={() => setConfirming(ds160!.id)}>Record DS-160 confirmation</Button>
          </div>
        </Card>
      )}
      {confirming && <RecordConfirmation workflowId={confirming} onClose={() => setConfirming(null)} onDone={() => { setConfirming(null); reload() }} />}

      {canSchedule && (
        <Card className="border border-florence-200 bg-florence-50">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-start gap-3">
              <Icon.clock className="mt-0.5 h-5 w-5 shrink-0 text-florence-600" />
              <div>
                <div className="text-sm font-semibold text-ink">Your DS-160 is in — let’s book your visa interview</div>
                <p className="mt-0.5 text-xs text-slate-600">We have your confirmation number and consulate ready. Book on the official portal, then record your appointment so we can track the date.</p>
              </div>
            </div>
            <Button onClick={() => setScheduling(va!.id)}>Schedule visa interview</Button>
          </div>
        </Card>
      )}
      {scheduling && <VisaAppointmentModal workflowId={scheduling} onClose={() => setScheduling(null)} onDone={() => { setScheduling(null); reload() }} />}

      {canRegisterNclex && (
        <Card className="border border-amber-200 bg-amber-50">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-start gap-3">
              <Icon.shield className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <div className="text-sm font-semibold text-ink">Register for your NCLEX — let’s get your name exactly right</div>
                <p className="mt-0.5 text-xs text-slate-600">A name that doesn’t match your ID is the #1 reason candidates are turned away at the test center. We’ll hand you the exact name and details to use with Pearson VUE.</p>
              </div>
            </div>
            <Button onClick={() => setRegisteringNclex(nclexWf!.id)}>Register with Pearson</Button>
          </div>
        </Card>
      )}
      {registeringNclex && <NclexRegisterModal workflowId={registeringNclex} onClose={() => setRegisteringNclex(null)} onDone={() => { setRegisteringNclex(null); reload() }} />}

      {nclexAttStage && (
        <Card className="border border-florence-200 bg-florence-50">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-start gap-3">
              <Icon.clock className="mt-0.5 h-5 w-5 shrink-0 text-florence-600" />
              <div>
                <div className="text-sm font-semibold text-ink">Registered with Pearson — record your ATT &amp; book your exam</div>
                <p className="mt-0.5 text-xs text-slate-600">When your Authorization to Test arrives, record its expiry here and schedule your NCLEX at a U.S. test center. We’ll track the deadline so you don’t miss the window.</p>
              </div>
            </div>
            <Button onClick={() => setNclexAttModal(nclexWf!.id)}>ATT &amp; scheduling</Button>
          </div>
        </Card>
      )}
      {nclexAttModal && <NclexAttModal candidateId={id!} workflowId={nclexAttModal} onClose={() => setNclexAttModal(null)} onDone={() => { setNclexAttModal(null); reload() }} />}

      {licWf && (
        <Card className="border border-sky-200 bg-sky-50">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-start gap-3">
              <Icon.shield className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
              <div>
                <div className="text-sm font-semibold text-ink">Complete your {licWf.short} licensure application</div>
                <p className="mt-0.5 text-xs text-slate-600">We’ve prepared your board application. Review it, complete your Livescan fingerprinting, then attest and submit — complete applications process faster.</p>
              </div>
            </div>
            <Button onClick={() => setLicensure(licWf!.id)}>Complete application</Button>
          </div>
        </Card>
      )}
      {licensure && <LicensureFlow workflowId={licensure} onClose={() => setLicensure(null)} onDone={() => { setLicensure(null); reload() }} />}

      {endorsementWf && (
        <Card className="border border-sky-200 bg-sky-50">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-start gap-3">
              <Icon.shield className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
              <div>
                <div className="text-sm font-semibold text-ink">Endorse your license to {v.profile.employmentState ?? 'your target state'}</div>
                <p className="mt-0.5 text-xs text-slate-600">We’ve mapped {v.profile.employmentState ?? 'the target state'}’s exact endorsement requirements — verification, fingerprints, and any jurisprudence exam. Complete them, then attest and submit.</p>
              </div>
            </div>
            <Button onClick={() => setEndorsing(endorsementWf!.id)}>Start endorsement</Button>
          </div>
        </Card>
      )}
      {endorsing && <EndorsementFlow workflowId={endorsing} targetState={v.profile.employmentState} onClose={() => setEndorsing(null)} onDone={() => { setEndorsing(null); reload() }} />}
      {choosingState && <StatePicker candidateId={id!} current={v.profile.employmentState} onClose={() => setChoosingState(false)} onDone={() => { setChoosingState(false); reload() }} />}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* main column */}
        <div className="space-y-5 lg:col-span-2">
          <PathwayPassportCard v={v} />
          <YourWeekCard v={v} />
          <SevisPaymentCard v={v} onChange={reload} />
          <RecommendedRouteCard v={v} />
          <PathwayMapCard v={v} />
          <TargetStateCard v={v} onChoose={() => setChoosingState(true)} />
          <RequirementsCard v={v} />
          {v.deficiencies.length > 0 && <DeficiencyCard v={v} onChange={reload} />}
          <Checklist v={v} onChange={reload} />
          <AfterArrival v={v} />
          <SsnPathway v={v} candidateId={id!} onChange={reload} />
          <MustReview v={v} onChange={reload} />
          <Workflows v={v} />
          {v.interviewPrep && <InterviewPrepCard prep={v.interviewPrep} />}
        </div>

        {/* sidebar */}
        <div className="space-y-5">
          <Reminders v={v} candidateId={id!} />
          <Copilot candidateId={id!} starters={v.nextActions.map((a) => a.title)} />
          {urgent > 0 || v.deadlines.length > 0 ? <Deadlines v={v} /> : null}
          <SpecialistNotice v={v} />
          <CorridorCard v={v} />
          <Resources v={v} />
          <Documents v={v} candidateId={id!} onChange={reload} />
          <ProfileVault v={v} candidateId={id!} onChange={reload} />
          <LedgerTimeline v={v} />
        </div>
      </div>
    </div>
  )
}

function HeaderStat({ label, value, tone = 'plain' }: { label: string; value: number; tone?: 'plain' | 'ok' | 'warn' | 'bad' }) {
  const color = tone === 'bad' && value > 0 ? 'text-rose-600' : tone === 'warn' && value > 0 ? 'text-amber-600' : 'text-ink'
  return (
    <div className="min-w-[76px] rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-center">
      <div className={cx('font-display text-2xl font-extrabold leading-none tabular-nums', color)}>{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">{label}</div>
    </div>
  )
}

function SevisPaymentCard({ v, onChange }: { v: CandidateView; onChange: () => void }) {
  const p = v.consularPayments.i901
  const [name, setName] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState({ filename: '', sevisId: '', legalName: '', schoolCode: '', amountUsd: '' })
  const tone = p.status === 'receipt_qa_approved' || p.status === 'not_required' ? 'success' : p.status.includes('rejected') || p.status.includes('failed') ? 'danger' : p.status === 'not_started' ? 'neutral' : 'warn'

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label); setError('')
    try { await fn(); onChange() }
    catch (e) { setError((e as Error).message) }
    finally { setBusy(null) }
  }

  const attest = () => {
    if (!p.orderId || !name.trim()) return
    void run('attest', () => api.i901Attest(p.orderId!, name.trim()))
  }
  const handoff = () => {
    if (!p.orderId) return
    void run('handoff', async () => {
      const out = await api.i901Handoff(p.orderId!)
      const link = out?.handoff?.paymentLink
      if (link) window.open(link, '_blank', 'noopener,noreferrer')
    })
  }
  const upload = () => {
    if (!p.orderId || !receipt.filename.trim() || !receipt.sevisId.trim()) return
    void run('receipt', () => api.i901Receipt(p.orderId!, {
      filename: receipt.filename.trim(),
      sevisId: receipt.sevisId.trim(),
      ...(receipt.legalName.trim() ? { legalName: receipt.legalName.trim() } : {}),
      ...(receipt.schoolCode.trim() ? { schoolCode: receipt.schoolCode.trim() } : {}),
      ...(receipt.amountUsd.trim() ? { amountUsd: Number(receipt.amountUsd) } : {}),
    }))
  }

  return (
    <Card>
      <CardHeader
        title="Your SEVIS payment"
        subtitle={p.school ? `${p.school} · ${p.sevisIdMasked ?? 'SEVIS pending'}` : 'I-901 SEVIS fee'}
        right={<Badge tone={tone}>{p.statusLabel}</Badge>}
      />
      <div className="space-y-4 px-5 py-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Requirement</div>
            <div className="mt-1 text-sm font-medium text-ink">{p.required ? 'Required' : 'Not required'}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Receipt</div>
            <div className="mt-1 text-sm font-medium text-ink">{p.receiptQaStatus ?? 'Not verified'}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Next</div>
            <div className="mt-1 text-sm font-medium text-ink">{p.nextStep}</div>
          </div>
        </div>

        {p.missing.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Waiting on: {p.missing.join(', ')}
          </div>
        )}
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}

        {p.orderId && p.status === 'awaiting_student_attestation' && (
          <div className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 sm:flex-row">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Type your full legal name"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-florence-400 focus:outline-none" />
            <Button onClick={attest} disabled={!name.trim() || busy === 'attest'}>{busy === 'attest' ? 'Signing…' : 'Confirm details'}</Button>
          </div>
        )}

        {p.orderId && (p.status === 'ready_for_sevismate' || p.status === 'payment_link_generated') && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-florence-200 bg-florence-50 px-3 py-3">
            <div className="text-sm text-slate-700">SEVISmate handoff is ready.</div>
            <Button onClick={handoff} disabled={busy === 'handoff'}>{busy === 'handoff' ? 'Opening…' : 'Pay I-901 through SEVISmate'}</Button>
          </div>
        )}

        {p.orderId && p.required && p.status !== 'receipt_qa_approved' && p.status !== 'not_required' && (
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 text-sm font-semibold text-ink">Upload receipt metadata</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input value={receipt.filename} onChange={(e) => setReceipt({ ...receipt, filename: e.target.value })} placeholder="Receipt filename"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-florence-400 focus:outline-none" />
              <input value={receipt.sevisId} onChange={(e) => setReceipt({ ...receipt, sevisId: e.target.value })} placeholder="SEVIS ID"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-florence-400 focus:outline-none" />
              <input value={receipt.legalName} onChange={(e) => setReceipt({ ...receipt, legalName: e.target.value })} placeholder="Name on receipt"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-florence-400 focus:outline-none" />
              <input value={receipt.schoolCode} onChange={(e) => setReceipt({ ...receipt, schoolCode: e.target.value })} placeholder="School code"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-florence-400 focus:outline-none" />
            </div>
            <div className="mt-2 flex justify-end">
              <Button variant="outline" onClick={upload} disabled={!receipt.filename.trim() || !receipt.sevisId.trim() || busy === 'receipt'}>{busy === 'receipt' ? 'Uploading…' : 'Upload receipt'}</Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

function NextActions({ v }: { v: CandidateView }) {
  return (
    <Card>
      <CardHeader title="What we need from you next" subtitle="The fastest way to keep your start date on track." />
      <div className="divide-y divide-slate-100">
        {v.nextActions.length === 0 && <div className="px-5 py-6"><Empty>You're all caught up. We'll notify you when something needs you.</Empty></div>}
        {v.nextActions.map((a, i) => (
          <div key={i} className="flex items-start gap-3 px-5 py-3">
            <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-florence-50 text-xs font-semibold text-florence-700">{i + 1}</div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-800">{a.title}</span>
                <Badge tone="progress">{a.workflowShort}</Badge>
              </div>
              {a.description && <p className="mt-0.5 text-xs text-slate-500">{a.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Checklist({ v, onChange }: { v: CandidateView; onChange: () => void }) {
  if (v.checklist.length === 0) return null
  return (
    <Card>
      <CardHeader title="Your checklist" subtitle="Items we still need before we can complete your paperwork." right={<Badge tone="warn">{v.checklist.filter((c) => c.blocker).length} blocking</Badge>} />
      <div className="divide-y divide-slate-100">
        {v.checklist.map((c, i) => <ChecklistRow key={`${c.workflowId}-${c.fieldId}-${i}`} entry={c} onChange={onChange} />)}
      </div>
    </Card>
  )
}

function ChecklistRow({ entry, onChange }: { entry: ChecklistEntry; onChange: () => void }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (!value.trim()) return
    setSaving(true)
    try { await api.answer(entry.workflowId, entry.fieldId, value.trim()); onChange() }
    finally { setSaving(false); setOpen(false) }
  }
  return (
    <div className="px-5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className={cx('mt-1 h-2 w-2 shrink-0 rounded-full', entry.blocker ? 'bg-amber-500' : 'bg-slate-300')} />
          <div>
            <div className="text-sm font-medium text-slate-800">{entry.label} <span className="ml-1 text-xs font-normal text-slate-400">· {entry.workflowShort}</span></div>
            <p className="mt-0.5 text-xs text-slate-500">{entry.question}</p>
          </div>
        </div>
        <Button size="sm" variant={open ? 'ghost' : 'outline'} onClick={() => setOpen((o) => !o)}>{open ? 'Cancel' : 'Provide'}</Button>
      </div>
      {open && (
        <div className="mt-3 flex gap-2 pl-5">
          <input
            autoFocus value={value} onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder="Type your answer…"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-florence-400 focus:outline-none"
          />
          <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Submit'}</Button>
        </div>
      )}
    </div>
  )
}

function MustReview({ v, onChange }: { v: CandidateView; onChange: () => void }) {
  const [signing, setSigning] = useState<MustReviewEntry | null>(null)
  if (v.mustReview.length === 0) return null
  return (
    <Card>
      <CardHeader title="You must personally review & sign" subtitle="By law these require your own confirmation — Florence never signs for you." />
      <div className="divide-y divide-slate-100">
        {v.mustReview.map((m, i) => (
          <div key={i} className="flex items-center justify-between gap-3 px-5 py-3">
            <div className="flex items-start gap-2.5">
              <Icon.shield className="mt-0.5 h-4 w-4 text-florence-600" />
              <div>
                <div className="text-sm font-medium text-slate-800">{m.label} <span className="ml-1 text-xs font-normal text-slate-400">· {m.workflowShort}</span></div>
                <p className="mt-0.5 text-xs text-slate-500">{m.reason}</p>
              </div>
            </div>
            <Button size="sm" onClick={() => setSigning(m)}>Review &amp; sign</Button>
          </div>
        ))}
      </div>
      {signing && <SignModal entry={signing} onClose={() => setSigning(null)} onSigned={() => { setSigning(null); onChange() }} />}
    </Card>
  )
}

function SignModal({ entry, onClose, onSigned }: { entry: MustReviewEntry; onClose: () => void; onSigned: () => void }) {
  const [name, setName] = useState('')
  const [ack, setAck] = useState(false)
  const [busy, setBusy] = useState(false)
  const sign = async () => {
    setBusy(true)
    try { await api.attest(entry.workflowId, name.trim()); onSigned() } finally { setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-slate-900/40 p-4" onClick={onClose}>
      <Card className="w-full max-w-md" >
        <div onClick={(e) => e.stopPropagation()}>
          <CardHeader title={entry.label} subtitle={entry.workflowShort} />
          <div className="space-y-3 px-5 py-4">
            <p className="text-sm text-slate-600">{entry.reason}</p>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5" />
              <span>I have reviewed the information, it is true and correct, and I am signing it myself.</span>
            </label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Type your full legal name to sign"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-florence-400 focus:outline-none" />
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={sign} disabled={!ack || !name.trim() || busy}>{busy ? 'Signing…' : 'Sign'}</Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

function Workflows({ v }: { v: CandidateView }) {
  return (
    <Card>
      <CardHeader title="Your pathway" subtitle="Every workflow from credentials to start." />
      <div className="grid grid-cols-1 gap-px bg-slate-100 sm:grid-cols-2">
        {v.workflows.map((w) => {
          const meta = STATUS_META[w.status]
          return (
            <div key={w.id} className="bg-white px-5 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-800">{w.short}</span>
                <Badge tone={meta.tone}>{meta.label}</Badge>
              </div>
              <div className="mt-2"><Progress value={w.progress} purple={w.type === 'financing_packet'} tone={w.status === 'blocked' ? 'danger' : w.status === 'completed' || w.status === 'submitted' ? 'success' : 'progress'} /></div>
              {w.nextStep && <p className="mt-1.5 text-xs text-slate-500">Next: {w.nextStep.title} <span className="text-slate-400">({w.nextStep.owner})</span></p>}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function Deadlines({ v }: { v: CandidateView }) {
  return (
    <Card>
      <CardHeader title="Deadlines" />
      <div className="divide-y divide-slate-100">
        {v.deadlines.map((d, i) => (
          <div key={i} className="flex items-center justify-between gap-2 px-5 py-2.5">
            <div className="flex items-center gap-2">
              <Icon.clock className={cx('h-4 w-4', d.severity === 'high' ? 'text-rose-500' : d.severity === 'medium' ? 'text-amber-500' : 'text-slate-400')} />
              <span className="text-sm text-slate-700">{d.label}</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-slate-800">{d.date ?? '—'}</div>
              {typeof d.daysRemaining === 'number' && (
                <div className={cx('text-[11px]', d.daysRemaining < 0 ? 'text-rose-600' : d.severity === 'high' ? 'text-rose-600' : d.severity === 'medium' ? 'text-amber-600' : 'text-slate-400')}>
                  {d.daysRemaining < 0 ? `${Math.abs(d.daysRemaining)}d overdue` : `${d.daysRemaining}d left`}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function SpecialistNotice({ v }: { v: CandidateView }) {
  if (v.specialistReviewCount === 0 && v.flags.length === 0) return null
  return (
    <Card>
      <CardHeader title="Under review" />
      <div className="space-y-2 px-5 py-3">
        {v.specialistReviewCount > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-florence-50 px-3 py-2 text-sm text-florence-800">
            <Icon.user className="mt-0.5 h-4 w-4" />
            <span>{v.specialistReviewCount} item{v.specialistReviewCount > 1 ? 's are' : ' is'} with your Florence specialist / counsel.</span>
          </div>
        )}
        {v.flags.map((f) => (
          <div key={f.id} className="rounded-lg border border-slate-100 px-3 py-2">
            <div className="flex items-center gap-2">
              <Badge tone={RISK_META[f.severity].tone}>{RISK_META[f.severity].label}</Badge>
              <span className="text-xs font-medium text-slate-700">{f.message}</span>
            </div>
            {f.suggestedAction && <p className="mt-1 text-xs text-slate-500">{f.suggestedAction}</p>}
          </div>
        ))}
      </div>
    </Card>
  )
}

function LedgerTimeline({ v }: { v: CandidateView }) {
  if (v.ledger.length === 0) return null
  return (
    <Card>
      <CardHeader title="Your journey" subtitle="Every milestone from profile to U.S. RN license." />
      <div className="px-5 py-3">
        <ol className="relative ml-2 border-l-2 border-florence-100">
          {v.ledger.map((m) => (
            <li key={m.id} className="mb-3 ml-4">
              <span className="absolute -left-[7px] mt-0.5 h-3 w-3 rounded-full border-2 border-white bg-florence-500" />
              <div className="text-sm font-medium text-slate-700">{m.milestone}</div>
              <div className="text-[11px] text-slate-400">{new Date(m.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
            </li>
          ))}
          <li className="ml-4">
            <span className="absolute -left-[7px] mt-0.5 h-3 w-3 rounded-full border-2 border-white bg-slate-300" />
            <div className="text-sm font-medium text-slate-400">U.S. RN license</div>
          </li>
        </ol>
      </div>
    </Card>
  )
}

function AfterArrival({ v }: { v: CandidateView }) {
  if (v.afterArrival.length === 0) return null
  const hasSsnGate = v.afterArrival.some((a) => a.kind === 'ssn')
  return (
    <Card className="border-sky-200 bg-sky-50/40">
      <CardHeader
        title="After you arrive in Los Angeles"
        subtitle="These steps need you physically in the U.S. — we keep them pre-filled and queued so you finish fast once you land."
        right={<Badge tone="info">In person</Badge>}
      />
      <ul className="space-y-2 px-5 pb-4">
        {v.afterArrival.map((a, i) => (
          <li key={`${a.workflowId}-${a.label}-${i}`} className="flex items-start gap-3 rounded-lg border border-sky-100 bg-white px-3 py-2.5">
            <Icon.pin className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-ink">{a.label}</span>
                <Badge tone="neutral">{a.workflowShort}</Badge>
                <Badge tone={a.kind === 'ssn' ? 'warn' : 'info'}>{a.kind === 'ssn' ? 'Needs SSN' : 'In person'}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">{a.reason}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="border-t border-sky-100 px-5 py-2.5 text-[11px] leading-relaxed text-slate-500">
        Live Scan fingerprinting can only be captured in person once you reach the U.S.
        {hasSsnGate && ' Some states require a Social Security Number — you’ll obtain one after you’re work-authorized, and we’ll complete those items then.'}
      </p>
    </Card>
  )
}

function SsnPathway({ v, candidateId, onChange }: { v: CandidateView; candidateId: string; onChange: () => void }) {
  const [busy, setBusy] = useState(false)
  const { policy, action, hasSsn, state, resources, privacyNote } = v.ssn
  if (!state) return null // no target state chosen yet

  const mark = async (val: boolean) => { setBusy(true); try { await api.setSsnStatus(candidateId, val); onChange() } finally { setBusy(false) } }

  const req = policy.requirement
  // Lead with the state's own grounded summary (accurate across all 25 states);
  // tone is driven by the requirement class, not a generic per-action sentence.
  const tone: 'good' | 'info' | 'warn' | 'neutral' =
    hasSsn || req === 'not_required' || req === 'sevis_or_visa_ok' ? 'good'
      : req === 'declaration_ok' ? 'info'
      : req === 'itin_ok' || req === 'required' ? 'warn'
      : 'neutral'
  const headline = hasSsn ? 'SSN on file — no further action needed for licensure.' : policy.summary

  const toneCls = { good: 'border-emerald-200 bg-emerald-50/40', info: 'border-sky-200 bg-sky-50/40', warn: 'border-amber-200 bg-amber-50/40', neutral: 'border-slate-200' }[tone]
  const dotCls = { good: 'bg-emerald-500', info: 'bg-sky-500', warn: 'bg-amber-500', neutral: 'bg-slate-400' }[tone]
  const needsNumber = !hasSsn && (action === 'apply_ssn' || action === 'apply_itin')

  return (
    <Card className={toneCls}>
      <CardHeader
        title="Social Security Number"
        subtitle={`Your path for ${state} — we never collect the number itself.`}
        right={
          hasSsn ? <Badge tone="success">On file</Badge>
            : req === 'not_required' || req === 'sevis_or_visa_ok' ? <Badge tone="success">Not needed</Badge>
            : req === 'declaration_ok' ? <Badge tone="info">Affidavit</Badge>
            : req === 'itin_ok' ? <Badge tone="warn">SSN or ITIN</Badge>
            : req === 'required' ? <Badge tone="warn">SSN required</Badge>
            : <Badge tone="neutral">Verify</Badge>
        }
      />
      <div className="space-y-3 px-5 pb-4">
        <div className="flex items-start gap-2.5">
          <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', dotCls)} />
          <p className="text-sm font-medium text-ink">{headline}</p>
        </div>
        {policy.detail && <p className="text-xs leading-relaxed text-slate-600">{policy.detail}</p>}

        {resources.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {resources.map((r) => <a key={r.url} href={r.url} target="_blank" rel="noreferrer" className="text-[11px] font-medium text-florence-700 hover:underline">{r.label} ↗</a>)}
          </div>
        )}

        {needsNumber && (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <span className="flex-1 text-xs text-slate-600">Got your {action === 'apply_itin' ? 'ITIN' : 'SSN'}? Mark it received — we’ll unblock the license step. We don’t store the number.</span>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => mark(true)}>{busy ? '…' : `I have my ${action === 'apply_itin' ? 'ITIN' : 'SSN'}`}</Button>
          </div>
        )}
        {hasSsn && (
          <button onClick={() => mark(false)} disabled={busy} className="text-[11px] text-slate-400 hover:text-slate-600 hover:underline">Mark as not yet received</button>
        )}

        <p className="rounded-md bg-slate-50 px-2.5 py-1.5 text-[11px] leading-relaxed text-slate-500">{privacyNote}</p>
      </div>
    </Card>
  )
}

// The radically-simple candidate view: your part vs what Florence handles.
function YourWeekCard({ v }: { v: CandidateView }) {
  const actions = v.candidateActions
  const bg = v.backgroundTasks
  return (
    <Card>
      <CardHeader
        title={actions.length ? `You have ${actions.length} action${actions.length > 1 ? 's' : ''} this week` : 'You’re all caught up'}
        subtitle="The simple version — just your part. Florence handles the rest."
      />
      <div className="space-y-3 px-5 pb-4">
        {actions.length > 0 ? (
          <ol className="space-y-2">
            {actions.slice(0, 5).map((a, i) => (
              <li key={`${a.title}-${i}`} className="flex items-start gap-2.5">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-florence-100 text-[11px] font-semibold text-florence-700">{i + 1}</span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-ink">{a.title}{a.workflowShort && <span className="ml-1.5 text-[11px] font-normal text-slate-400">{a.workflowShort}</span>}</div>
                  {a.detail && <div className="text-xs text-slate-500">{a.detail}</div>}
                </div>
              </li>
            ))}
            {actions.length > 5 && <li className="pl-7 text-[11px] text-slate-400">+{actions.length - 5} more below</li>}
          </ol>
        ) : (
          <p className="text-sm text-slate-500">Nothing needs you right now — Florence is working in the background.</p>
        )}
        {bg.length > 0 && (
          <div className="rounded-lg bg-slate-50 px-3 py-2.5">
            <div className="text-xs font-medium text-slate-600">Florence is handling {bg.length} task{bg.length > 1 ? 's' : ''} with human review</div>
            <ul className="mt-1.5 space-y-1">
              {bg.slice(0, 6).map((t, i) => (
                <li key={`${t.title}-${i}`} className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                  <span className="truncate">{t.title}</span>
                  <span className="shrink-0 text-slate-400">· {t.workflowShort}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  )
}

// The route recommender — fastest compliant licensure route, scored transparently.
function RecommendedRouteCard({ v }: { v: CandidateView }) {
  const rr = v.routeRecommendation
  if (!rr.options.length) return null
  const rec = rr.options.find((o) => o.recommended) ?? rr.options[0]
  const alts = rr.options.filter((o) => o !== rec)
  return (
    <Card className="border-florence-200 bg-florence-50/30">
      <CardHeader
        title="Recommended route"
        subtitle="The fastest compliant path to your start — and exactly why."
        right={<Badge tone="success">~{rec.estimatedDays} days</Badge>}
      />
      <div className="space-y-3 px-5 pb-4">
        <div className="text-sm font-semibold text-ink">{rec.label}</div>
        <ul className="space-y-1.5">
          {rec.reasons.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-florence-500" />{r}
            </li>
          ))}
        </ul>
        {rec.blockers.length > 0 && (
          <div className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] leading-relaxed text-amber-800">
            {rec.blockers.map((b, i) => <div key={i}>⚠ {b}</div>)}
          </div>
        )}
        {alts.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer select-none text-slate-500 hover:text-slate-700">Compare {alts.length} alternative{alts.length > 1 ? 's' : ''}</summary>
            <div className="mt-2 space-y-2">
              {alts.map((a, i) => (
                <div key={i} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-700">{a.label}</span>
                    <span className="shrink-0 text-[11px] text-slate-400">~{a.estimatedDays}d · score {a.score}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">{a.reasons[0]}</div>
                </div>
              ))}
            </div>
          </details>
        )}
        <p className="text-[11px] text-slate-400">Transparent scoring — every recommendation shows its reasons. Florence advises; you choose.</p>
      </div>
    </Card>
  )
}

// Requirements, fees & sources — every element of the process, what it costs, its
// official source, and whether it's done. Fee-transparent · sourced · tracked.
const REQ_DOT: Record<string, string> = { pending: 'bg-slate-300', provided: 'bg-florence-500', verified: 'bg-emerald-500' }
function RequirementsCard({ v }: { v: CandidateView }) {
  const groups = v.requirements
  if (!groups.length) return null
  const totalFees = groups.reduce((s, g) => s + g.totalFeesUsd, 0)
  const totalDone = groups.reduce((s, g) => s + g.completeCount, 0)
  const total = groups.reduce((s, g) => s + g.totalCount, 0)
  return (
    <Card>
      <CardHeader
        title="Requirements, fees & sources"
        subtitle="Every element — what it costs, the official source, and whether it's done."
        right={<Badge tone={totalDone === total ? 'success' : 'neutral'}>{totalDone}/{total} complete</Badge>}
      />
      <div className="space-y-4 px-5 pb-4">
        {totalFees > 0 && (
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Known fees so far: <span className="font-semibold text-ink">${totalFees.toLocaleString()}</span> — confirm each amount on the linked official source.
          </div>
        )}
        {groups.map((g) => (
          <div key={g.workflowId}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div className="truncate text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">{g.workflowShort} · {g.title}</div>
              <span className="shrink-0 text-[11px] text-slate-400">{g.completeCount}/{g.totalCount}{g.totalFeesUsd > 0 ? ` · $${g.totalFeesUsd.toLocaleString()}` : ''}</span>
            </div>
            <ul className="space-y-2">
              {g.items.map((it, i) => (
                <li key={`${it.fieldId}-${i}`} className="flex items-start gap-2.5">
                  <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', REQ_DOT[it.status])} title={it.status} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-sm text-ink">{it.label}</span>
                      {it.feeUsd != null && <span className="text-xs font-semibold text-florence-700">${it.feeUsd}</span>}
                      {it.inPerson && <Badge tone="info">in person</Badge>}
                      {it.status === 'verified' && <Badge tone="success">verified</Badge>}
                    </div>
                    {it.detail && <div className="text-[11px] leading-snug text-slate-500">{it.detail}</div>}
                    <a href={it.source.url} target="_blank" rel="noreferrer" className="text-[11px] font-medium text-florence-700 hover:underline">{it.source.label} ↗</a>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  )
}

const NODE_STATE_CLS: Record<string, string> = {
  done: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  active: 'bg-sky-100 text-sky-700 ring-sky-200',
  attention: 'bg-amber-100 text-amber-800 ring-amber-200',
  blocked: 'bg-rose-100 text-rose-700 ring-rose-200',
  upcoming: 'bg-slate-100 text-slate-500 ring-slate-200',
  locked: 'bg-slate-50 text-slate-400 ring-slate-200',
}

// Pathway map + critical-path clock — "Google Maps for nurse production."
function PathwayMapCard({ v }: { v: CandidateView }) {
  const { pathway, clock } = v
  const behind = clock.delayDays > 0
  const criticalLabels = pathway.criticalPath.map((k) => pathway.nodes.find((n) => n.key === k)?.label).filter(Boolean)
  // Candidate-facing: schedule only. No Florence economics here, ever.
  const metrics: [string, string, boolean][] = [
    ['Expected start', clock.expectedStartDate ?? '—', false],
    ['Target start', clock.targetStartDate ?? '—', false],
    [behind ? 'Behind by' : 'On track', behind ? `${clock.delayDays} days` : '✓', behind],
  ]
  return (
    <Card>
      <CardHeader title="Pathway to your U.S. RN start" subtitle="The critical path — the chain of steps that sets your start date." />
      <div className="space-y-4 px-5 pb-4">
        <div className="grid grid-cols-3 gap-3">
          {metrics.map(([label, value, warn], i) => (
            <div key={i}>
              <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
              <div className={cx('text-sm font-semibold', warn ? 'text-amber-600' : 'text-ink')}>{value}</div>
            </div>
          ))}
        </div>
        {clock.bottleneck && (
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
            <span className="font-medium text-ink">Current focus:</span>{' '}
            <span className="text-slate-600">{clock.bottleneck.label} — {clock.bottleneck.reason.toLowerCase()}.</span>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {pathway.nodes.map((n) => (
            <span
              key={n.key}
              title={n.statusLabel}
              className={cx('rounded-full px-2.5 py-1 text-[11px] ring-1 ring-inset', NODE_STATE_CLS[n.state], n.future && 'border border-dashed border-slate-300', n.key === pathway.currentNodeKey && 'font-semibold ring-2 ring-florence-400')}
            >
              {n.label}
            </span>
          ))}
        </div>
        {criticalLabels.length > 0 && (
          <div className="text-[11px] leading-relaxed text-slate-500"><span className="font-medium text-slate-600">Critical path:</span> {criticalLabels.join(' → ')}</div>
        )}
      </div>
    </Card>
  )
}

const PASSPORT_BAND_TONE: Record<string, { bg: string; text: string; bar: string }> = {
  not_started: { bg: 'bg-slate-100', text: 'text-slate-700', bar: 'bg-slate-400' },
  building: { bg: 'bg-sky-100', text: 'text-sky-800', bar: 'bg-sky-500' },
  qa_needed: { bg: 'bg-amber-100', text: 'text-amber-800', bar: 'bg-amber-500' },
  candidate_action: { bg: 'bg-florence-100', text: 'text-florence-800', bar: 'bg-florence-500' },
  start_ready: { bg: 'bg-emerald-100', text: 'text-emerald-800', bar: 'bg-emerald-500' },
}

// The Pathway Passport — one administrative status band across every workflow domain.
function PathwayPassportCard({ v }: { v: CandidateView }) {
  const p = v.passport
  const tone = PASSPORT_BAND_TONE[p.band] ?? PASSPORT_BAND_TONE.building
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Pathway Passport</div>
          <div className="text-sm text-slate-500">{p.summary}</div>
        </div>
        <span className={cx('rounded-full px-3 py-1 text-sm font-semibold', tone.bg, tone.text)}>{p.bandLabel}</span>
      </div>
      {p.rows.length > 0 ? (
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 px-5 py-4 sm:grid-cols-2">
          {p.rows.map((r, i) => {
            const rt = PASSPORT_BAND_TONE[r.band] ?? PASSPORT_BAND_TONE.building
            return (
              <div key={`${r.label}-${i}`} className="min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium text-ink">{r.label}</span>
                  <span className="shrink-0 text-[11px] text-slate-400">{r.statusLabel}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={cx('h-full rounded-full', rt.bar)} style={{ width: `${Math.round(r.progress * 100)}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="px-5 py-4 text-sm text-slate-400">No workflows yet — choose your target state to begin.</div>
      )}
    </Card>
  )
}

function TargetStateCard({ v, onChoose }: { v: CandidateView; onChoose: () => void }) {
  return (
    <Card className={cx(v.profile.employmentState ? '' : 'border-florence-300 bg-florence-50')}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <Icon.shield className="h-5 w-5 shrink-0 text-florence-600" />
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Target state</div>
            <div className="text-sm font-semibold text-ink">{v.profile.employmentState ?? 'Choose where you accepted a job'}</div>
          </div>
        </div>
        <Button variant={v.profile.employmentState ? 'outline' : undefined} size="sm" onClick={onChoose}>{v.profile.employmentState ? 'Change state' : 'Choose your state'}</Button>
      </div>
    </Card>
  )
}

function Reminders({ v, candidateId }: { v: CandidateView; candidateId: string }) {
  const [sent, setSent] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (v.reminders.length === 0) return null
  const tone = (s: string) => (s === 'high' || s === 'escalate') ? 'text-rose-500' : s === 'medium' ? 'text-amber-500' : 'text-slate-400'
  const send = async () => { setBusy(true); try { const r = await api.notify(candidateId); setSent(`Dispatched ${r.sent} · ${r.channel}`) } finally { setBusy(false) } }
  return (
    <Card className="border-florence-200">
      <CardHeader title="Reminders" subtitle="We’ll nudge you before anything lapses." right={<button onClick={send} disabled={busy} className="text-xs font-medium text-florence-600 hover:underline">{busy ? '…' : 'Send now'}</button>} />
      <div className="divide-y divide-slate-100">
        {v.reminders.map((r, i) => (
          <div key={i} className="flex items-start gap-2.5 px-5 py-2.5">
            <Icon.clock className={cx('mt-0.5 h-4 w-4 shrink-0', tone(r.severity))} />
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-800">{r.title}</div>
              <div className="text-[11px] text-slate-500">{r.detail}{r.date ? ` · ${r.date}` : ''}</div>
            </div>
          </div>
        ))}
      </div>
      {sent && <div className="border-t border-slate-100 px-5 py-2 text-[11px] text-emerald-700">{sent}</div>}
    </Card>
  )
}

function Documents({ v, candidateId, onChange }: { v: CandidateView; candidateId: string; onChange: () => void }) {
  const [kind, setKind] = useState('passport_scan')
  const [busy, setBusy] = useState(false)
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setBusy(true)
    try { await api.uploadDocument(candidateId, { kind, filename: f.name }); onChange() } finally { setBusy(false); e.target.value = '' }
  }
  return (
    <Card>
      <CardHeader title="Your documents" subtitle="Upload once — we reuse them across every form." />
      <div className="space-y-2 px-5 py-3">
        {v.documents.length > 0 ? (
          <ul className="space-y-1">
            {v.documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-slate-700">{d.filename}</span>
                <Badge tone={d.extracted ? 'success' : 'neutral'}>{d.kind.replace(/_/g, ' ')}</Badge>
              </li>
            ))}
          </ul>
        ) : <p className="text-xs text-slate-400">No documents uploaded yet.</p>}
        <div className="flex items-center gap-2 pt-1">
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1 text-xs focus:outline-none">
            <option value="passport_scan">Passport</option>
            <option value="i20">I-20</option>
            <option value="transcript">Transcript</option>
            <option value="license_doc">License</option>
            <option value="english_score">English score</option>
            <option value="offer_letter">Offer letter</option>
          </select>
          <label className="cursor-pointer rounded-lg bg-florence-500 px-3 py-1 text-xs font-medium text-white hover:bg-florence-600">
            {busy ? 'Uploading…' : 'Upload'}
            <input type="file" className="hidden" onChange={onFile} />
          </label>
        </div>
        <p className="text-[11px] text-slate-400">Extraction (passport / I-20 → form fields) runs with a vision model when configured.</p>
      </div>
    </Card>
  )
}

// Canonical profile + consent: the keystone of Pathway OS. Fields are collected once
// (with provenance) and reused everywhere — but Capital/employer reuse is gated by
// the candidate's explicit consent toggles.
function ProfileVault({ v, candidateId, onChange }: { v: CandidateView; candidateId: string; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const toggle = async (scope: string, granted: boolean) => {
    setBusy(scope)
    try { await api.setConsent(candidateId, scope, granted); onChange() } finally { setBusy(null) }
  }
  return (
    <Card>
      <CardHeader title="Your profile & data sharing" subtitle="Collected once, reused across every workflow — only where you allow." />
      <div className="space-y-3 px-5 pb-4">
        {v.provenance.length > 0 && (
          <dl className="space-y-1">
            {v.provenance.map((p) => (
              <div key={p.field} className="flex items-center justify-between gap-2 text-xs">
                <dt className="shrink-0 text-slate-500">{p.field}</dt>
                <dd className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-slate-700">{p.value}</span>
                  <Badge tone={p.confidence === 'high' ? 'success' : p.confidence === 'unknown' ? 'neutral' : 'info'}>{p.sourceDoc}</Badge>
                </dd>
              </div>
            ))}
          </dl>
        )}
        <div className="space-y-2.5 border-t border-slate-100 pt-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Data sharing</div>
          {v.consents.map((c) => (
            <div key={c.scope} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-medium text-ink">{c.label}{c.core && <span className="ml-1 font-normal text-[10px] text-slate-400">· required for your pathway</span>}</div>
                <div className="text-[11px] leading-snug text-slate-500">{c.description}</div>
              </div>
              <button
                type="button"
                onClick={() => toggle(c.scope, !c.granted)}
                disabled={busy === c.scope || c.core}
                aria-pressed={c.granted}
                title={c.core ? 'Required for your pathway' : c.granted ? 'Turn off sharing' : 'Turn on sharing'}
                className={cx('mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full transition-colors', c.granted ? (c.scope === 'underwriting' ? 'bg-purple-600' : 'bg-emerald-500') : 'bg-slate-300', (busy === c.scope || c.core) && 'opacity-60')}
              >
                <span className={cx('block h-4 w-4 rounded-full bg-white shadow transition-transform', c.granted ? 'translate-x-[18px]' : 'translate-x-0.5')} />
              </button>
            </div>
          ))}
        </div>
        <p className="rounded bg-slate-50 px-2.5 py-1.5 text-[11px] leading-relaxed text-slate-500">Florence Capital and employers only ever see your data for a scope you’ve turned on.</p>
      </div>
    </Card>
  )
}

function DeficiencyCard({ v, onChange }: { v: CandidateView; onChange: () => void }) {
  const [responding, setResponding] = useState<DeficiencyView | null>(null)
  return (
    <>
      {v.deficiencies.map((def) => (
        <Card key={def.id} className="border border-rose-200 bg-rose-50">
          <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
            <div className="flex items-start gap-3">
              <Icon.shield className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <div>
                <div className="text-sm font-semibold text-ink">{def.workflowShort}: {def.source} sent a deficiency notice</div>
                <p className="mt-0.5 text-xs text-slate-600">{def.classes.map((c) => c.label).join(' · ')} — {def.items.length} item(s). Florence classified, routed, and drafted your response.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {def.dueInDays != null && <Badge tone={def.dueInDays <= 3 ? 'danger' : 'warn'}>{def.dueInDays < 0 ? `${Math.abs(def.dueInDays)}d overdue` : `due in ${def.dueInDays}d`}</Badge>}
              <Button onClick={() => setResponding(def)}>Respond</Button>
            </div>
          </div>
        </Card>
      ))}
      {responding && <DeficiencyRespond def={responding} onClose={() => setResponding(null)} onResolved={() => { setResponding(null); onChange() }} />}
    </>
  )
}

function DeficiencyRespond({ def, onClose, onResolved }: { def: DeficiencyView; onClose: () => void; onResolved: () => void }) {
  const [busy, setBusy] = useState(false)
  const resolve = async () => { setBusy(true); try { await api.resolveDeficiency(def.id); onResolved() } finally { setBusy(false) } }
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <Card className="flex max-h-[88vh] flex-col overflow-hidden">
          <CardHeader title="Respond to your deficiency notice" subtitle={`${def.source} · ${def.classification}`} />
          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            <div>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Classified & routed</div>
              <div className="space-y-2">
                {def.classes.map((c, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-ink">{c.label}</span>
                      <span className="flex shrink-0 gap-1.5"><Badge tone="neutral">{c.owner}</Badge><Badge tone={c.slaDays <= 7 ? 'warn' : 'info'}>{c.slaDays}d SLA</Badge></span>
                    </div>
                    <ul className="mt-1 space-y-0.5">{c.items.map((it, j) => <li key={j} className="text-xs text-slate-600">• {it}</li>)}</ul>
                    <ul className="mt-1.5 space-y-0.5 border-t border-slate-100 pt-1.5">{c.checklist.map((ck, j) => <li key={j} className="flex items-start gap-1.5 text-[11px] text-slate-500"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-florence-400" />{ck}</li>)}</ul>
                  </div>
                ))}
              </div>
            </div>
            {def.responseDraft && (
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Florence’s drafted response</div>
                <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{def.responseDraft}</pre>
              </div>
            )}
            <p className="text-xs text-slate-500">Complete the items above (we’ve added them to your checklist), then mark this resolved. Human QA reviews before anything is sent to the board.</p>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <Button onClick={resolve} disabled={busy}>{busy ? 'Saving…' : 'I’ve addressed these — mark resolved'}</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

// Country corridor playbook — source-country-specific guidance that compounds.
function CorridorCard({ v }: { v: CandidateView }) {
  const p = v.countryPlaybook
  if (!p) return null
  return (
    <Card>
      <CardHeader title={`${p.country} corridor`} subtitle="What tends to matter for nurses coming from here." />
      <div className="space-y-3 px-5 pb-4 text-xs">
        <div>
          <div className="font-medium text-slate-600">Common document gaps</div>
          <ul className="mt-1 space-y-0.5">
            {p.documentGaps.map((g, i) => <li key={i} className="flex items-start gap-1.5 text-slate-500"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-400" />{g}</li>)}
          </ul>
        </div>
        <div><span className="font-medium text-slate-600">Visa interview: </span><span className="text-slate-500">{p.visaTimingNote}</span></div>
        <div><span className="font-medium text-slate-600">Education verification: </span><span className="text-slate-500">{p.educationVerification}</span></div>
        <div><span className="font-medium text-slate-600">English: </span><span className="text-slate-500">{p.englishNote}</span></div>
        {p.riskFlags.length > 0 && (
          <div className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
            {p.riskFlags.map((f, i) => <div key={i}>• {f}</div>)}
          </div>
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-100 pt-2">
          {p.officialResources.map((r) => <a key={r.url} href={r.url} target="_blank" rel="noreferrer" className="text-[11px] font-medium text-florence-700 hover:underline">{r.label} ↗</a>)}
        </div>
      </div>
    </Card>
  )
}

function Resources({ v }: { v: CandidateView }) {
  return (
    <Card>
      <CardHeader title="Official resources & help" subtitle="Florence prepares your draft — always verify on the official site." />
      <div className="space-y-3 px-5 py-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
            <Icon.shield className="h-3.5 w-3.5" /> Need legal help? Use a real lawyer.
          </div>
          <p className="mt-1 text-[11px] leading-snug text-amber-700">{v.disclaimer}</p>
          <ul className="mt-1.5 space-y-1">
            {v.help.map((h) => (
              <li key={h.url}>
                <a href={h.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-amber-800 underline-offset-2 hover:underline">{h.label} ↗</a>
                {h.note && <span className="block text-[11px] text-amber-600">{h.note}</span>}
              </li>
            ))}
          </ul>
        </div>
        {v.resources.map((r) => (
          <div key={r.workflowShort}>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{r.workflowShort}</div>
            <ul className="space-y-1">
              {r.items.map((it) => (
                <li key={it.url}>
                  <a href={it.url} target="_blank" rel="noreferrer" className="text-sm text-florence-700 underline-offset-2 hover:underline">{it.label} ↗</a>
                  {it.note && <span className="block text-[11px] text-slate-400">{it.note}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  )
}

function InterviewPrepCard({ prep }: { prep: InterviewPrep }) {
  return (
    <Card>
      <CardHeader title="Prepare for your F-1 visa interview" subtitle="What to bring, what the officer is checking, and questions to practice." />
      <div className="space-y-4 px-5 py-4">
        <p className="text-sm text-slate-600">{prep.intro}</p>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Bring these documents</div>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {prep.documentsToBring.map((doc) => (
              <li key={doc} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-florence-400" />
                {doc}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">What the officer is checking</div>
          <div className="space-y-2">
            {prep.keyConcepts.map((c) => (
              <div key={c.title} className="rounded-lg bg-slate-50 px-3 py-2">
                <div className="text-sm font-semibold text-ink">{c.title}</div>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{c.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Practice questions</div>
          <ul className="space-y-1">
            {prep.commonQuestions.map((q) => (
              <li key={q} className="text-sm italic text-slate-600">“{q}”</li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3">
          {prep.resources.map((r) => (
            <a key={r.url} href={r.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-florence-700 underline-offset-2 hover:underline">{r.label} ↗</a>
          ))}
        </div>
      </div>
    </Card>
  )
}

function RecordConfirmation({ workflowId, onClose, onDone }: { workflowId: string; onClose: () => void; onDone: () => void }) {
  const [num, setNum] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const save = async () => {
    setBusy(true); setError(null)
    try { await api.recordConfirmation(workflowId, num.trim().toUpperCase()); onDone() }
    catch (e: any) { setError(String(e?.message ?? e)) } finally { setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/50 p-4" onClick={onClose}>
      <Card className="w-full max-w-md">
        <div onClick={(e) => e.stopPropagation()}>
          <CardHeader title="Record your DS-160 confirmation" subtitle="From CEAC, after you submit" />
          <div className="space-y-3 px-5 py-4">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
              <li>Go to <a href="https://ceac.state.gov/genniv/" target="_blank" rel="noreferrer" className="font-medium text-florence-700 hover:underline">CEAC ↗</a> and submit your signed DS-160.</li>
              <li>You’ll get a confirmation page with a barcode and a ~10-character confirmation number.</li>
              <li>Enter that number below — we’ll use it to schedule your visa appointment.</li>
            </ol>
            <input value={num} onChange={(e) => setNum(e.target.value.toUpperCase())} placeholder="e.g. AA00ABCD12" maxLength={12}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tracking-widest focus:border-florence-400 focus:outline-none" />
            {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={save} disabled={num.trim().length < 8 || busy}>{busy ? 'Recording…' : 'I’ve submitted — record it'}</Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

interface Msg { role: 'you' | 'copilot'; text: string }
function Copilot({ candidateId, starters }: { candidateId: string; starters: string[] }) {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'copilot', text: 'Hi! I’m your Florence pathway copilot. Ask me what’s next, or about your visa, NCLEX, name match, fingerprinting, or appointment.' }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  const send = async (q: string) => {
    if (!q.trim() || busy) return
    setMsgs((m) => [...m, { role: 'you', text: q }])
    setInput('')
    setBusy(true)
    try {
      const { reply } = await api.chat(candidateId, q)
      setMsgs((m) => [...m, { role: 'copilot', text: reply }])
    } catch {
      setMsgs((m) => [...m, { role: 'copilot', text: 'Sorry — I had trouble answering just now.' }])
    } finally { setBusy(false) }
  }

  const quick = ['What do I need to do next?', 'Is my name a problem?', 'When does my ATT expire?']

  return (
    <Card className="flex h-[28rem] flex-col">
      <CardHeader title="Pathway copilot" right={<Icon.sparkle className="h-4 w-4 text-florence-500" />} />
      <div className="scroll-thin flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {msgs.map((m, i) => (
          <div key={i} className={cx('flex', m.role === 'you' ? 'justify-end' : 'justify-start')}>
            <div className={cx('max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm', m.role === 'you' ? 'bg-florence-600 text-white' : 'bg-slate-100 text-slate-700')}>{m.text}</div>
          </div>
        ))}
        {busy && <div className="flex justify-start"><div className="rounded-2xl bg-slate-100 px-3 py-2"><Spinner label="" /></div></div>}
      </div>
      <div className="border-t border-slate-100 px-3 py-2">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {quick.map((q) => <button key={q} onClick={() => send(q)} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600 hover:bg-slate-200">{q}</button>)}
        </div>
        <div className="flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send(input)}
            placeholder="Ask your copilot…" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-florence-400 focus:outline-none" />
          <Button onClick={() => send(input)} disabled={busy}><Icon.send className="h-4 w-4" /></Button>
        </div>
      </div>
    </Card>
  )
}
