// PUBLIC candidate-facing job card. Reached via a FlorenceRN tracked link
// (/l/:code → /jobs/:code?frn_click_id=…). No login, no PII in the URL. The nurse
// can "Express interest" (NOT apply) — contact + explicit consent are sent in the
// POST body. Listed pay (from the posting) and estimated pay (FlorenceRN local-market
// estimate) are always visually + textually distinct.
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { api, type PublicJobCardData } from '../../api'
import { Badge, Button, Card, Spinner, cx, titleize, type Tone } from '../../lib/ui'

const BENEFIT_LABEL: Record<string, string> = {
  health_insurance: 'Health insurance', retirement_401k: '401(k)', pto: 'Paid time off',
  tuition_support: 'Tuition support', relocation: 'Relocation', shift_differential: 'Shift differential', union: 'Union',
}
const STATE_TONE: Record<string, Tone> = {
  public: 'neutral', amn_channel: 'info', direct_partner: 'brand', ats_connected: 'success',
}

export default function JobCard() {
  const { code = '' } = useParams()
  const [sp] = useSearchParams()
  const frnClickId = sp.get('frn_click_id') ?? undefined
  const [job, setJob] = useState<PublicJobCardData | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true
    setLoading(true)
    api.publicJob(code)
      .then((j) => { if (live) { setJob(j); setErr(null) } })
      .catch(() => { if (live) setErr('This opportunity is no longer available.') })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [code])

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      <header className="mb-6 flex items-center gap-2">
        <span className="font-display text-xl font-bold tracking-tight text-florence-700">FlorenceRN</span>
        {job && <Badge tone={STATE_TONE[job.opportunityState] ?? 'brand'}>{job.opportunityStateLabel}</Badge>}
        {!job && <Badge tone="brand">Matched opportunity</Badge>}
      </header>

      {loading && <Card className="p-6"><Spinner label="Loading opportunity…" /></Card>}
      {!loading && err && <Card className="p-6 text-sm text-slate-600">{err}</Card>}
      {!loading && job && <JobBody job={job} frnClickId={frnClickId} />}

      <p className="mt-8 text-center text-xs text-slate-400">
        FlorenceRN surfaces publicly posted RN roles and FlorenceRN-matched opportunities. Expressing interest is not a job
        application and shares nothing with an employer until you are licensed and have given explicit consent.
      </p>
    </div>
  )
}

function JobBody({ job, frnClickId }: { job: PublicJobCardData; frnClickId?: string }) {
  const payTone = job.pay.kind === 'listed' ? 'success' : job.pay.kind === 'estimated' ? 'info' : 'neutral'
  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{job.title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {job.employerName}{job.city || job.state ? ` · ${[job.city, job.state].filter(Boolean).join(', ')}` : ''}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {job.specialty && <Badge tone="brand">{titleize(job.specialty)}</Badge>}
          {job.setting && <Badge>{titleize(job.setting)}</Badge>}
          {job.shift && <Badge>{titleize(job.shift)} shift</Badge>}
          {job.requiredLicenseState && <Badge tone="warn">{job.requiredLicenseState} RN license</Badge>}
        </div>

        {/* Pay — listed vs estimated kept clearly distinct */}
        <div className={cx('mt-4 rounded-lg border p-4', job.pay.kind === 'listed' ? 'border-emerald-200 bg-emerald-50' : job.pay.kind === 'estimated' ? 'border-florence-200 bg-florence-50' : 'border-slate-200 bg-slate-50')}>
          {job.pay.kind === 'none' ? (
            <p className="text-sm text-slate-500">Pay not posted for this role.</p>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-ink">{job.pay.amount}</span>
                <Badge tone={payTone}>{job.pay.label}</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {job.pay.source}{job.pay.kind === 'estimated' && job.pay.confidence ? ` · ${job.pay.confidence} confidence` : ''}
              </p>
            </>
          )}
        </div>

        {job.benefits.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Benefits observed</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {job.benefits.map((b) => <Badge key={b} tone="success">{BENEFIT_LABEL[b] ?? titleize(b)}</Badge>)}
            </div>
          </div>
        )}

        <p className="mt-4 text-sm text-slate-600">{job.readinessNote}</p>
      </Card>

      <InterestForm jobId={job.id} frnClickId={frnClickId} cta={job.cta} />
    </div>
  )
}

function InterestForm({ jobId, frnClickId, cta }: { jobId: string; frnClickId?: string; cta: PublicJobCardData['cta'] }) {
  const isApply = cta === 'apply_with_packet'
  const heading = isApply ? 'Apply with FlorenceRN' : 'Express interest'
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [targetState, setTargetState] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [doneRef, setDoneRef] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const canSubmit = fullName.trim() && (email.trim() || phone.trim()) && consent && !busy

  async function submit() {
    setBusy(true); setErr(null)
    try {
      const r = await api.publicInterest(jobId, { fullName: fullName.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined, targetState: targetState.trim() || undefined, trackingClickId: frnClickId, consentGranted: consent })
      setDoneRef(r.ref)
    } catch (e) {
      setErr((e as Error).message || 'Something went wrong — please try again.')
    } finally { setBusy(false) }
  }

  if (doneRef) return (
    <Card className="border-emerald-200 bg-emerald-50 p-6">
      <p className="font-semibold text-emerald-800">Thanks — your interest is in.</p>
      <p className="mt-1 text-sm text-emerald-700">A FlorenceRN advisor will reach out about your fastest licensure + start path. Nothing is shared with the employer yet.</p>
      <a href={`/basket/${doneRef}`} className="mt-3 inline-block text-sm font-medium text-florence-700 underline">View your Opportunity Basket →</a>
    </Card>
  )

  const input = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-florence-500 focus:outline-none focus:ring-1 focus:ring-florence-500'
  return (
    <Card className="p-6">
      <h2 className="font-display text-lg font-bold text-ink">{heading}</h2>
      <p className="mt-0.5 text-sm text-slate-500">{isApply ? 'FlorenceRN can submit your packet to this partner once you’re licensed and consent — this starts that path.' : 'Not an application — just lets a FlorenceRN advisor map your path to this role.'}</p>
      <div className="mt-4 space-y-3">
        <label className="block text-sm font-medium text-slate-700">Full name
          <input className={input} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Okafor, RN" />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">Email
            <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
          </label>
          <label className="block text-sm font-medium text-slate-700">Phone
            <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="optional" />
          </label>
        </div>
        <label className="block text-sm font-medium text-slate-700">State you’re licensed in / pursuing
          <input className={input} value={targetState} onChange={(e) => setTargetState(e.target.value.toUpperCase().slice(0, 2))} placeholder="e.g. CA" />
        </label>
        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>I consent to FlorenceRN contacting me about this and similar RN opportunities. I understand nothing is shared with an employer until I’m licensed and give separate consent.</span>
        </label>
        {err && <p className="text-sm text-rose-600">{err}</p>}
        <Button disabled={!canSubmit} onClick={submit} className="w-full">{busy ? 'Submitting…' : heading}</Button>
      </div>
    </Card>
  )
}
