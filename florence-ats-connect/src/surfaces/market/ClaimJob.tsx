// PUBLIC employer claim deeplink (/claim/:token). An employer who is hiring claims a
// role: certifies authority, fills posting detail → FlorenceRN mints a displayable job
// and can present licensed RN packets. No PII in the URL; no Craigslist content shown.
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, type ClaimPrefillData } from '../../api'
import { Badge, Button, Card, Spinner } from '../../lib/ui'

const ROLE_LABEL: Record<string, string> = {
  home_health_rn: 'Home Health RN', dialysis_rn: 'Dialysis RN', hospice_rn: 'Hospice RN',
  snf_rn: 'SNF RN', clinic_rn: 'Clinic RN', asc_rn: 'ASC RN', other_rn: 'RN',
}
const CERT_TEXT = 'I am authorized to post and promote this job on behalf of my organization, and I authorize FlorenceRN to display, summarize, and promote this role to FlorenceRN nurses.'

export default function ClaimJob() {
  const { token = '' } = useParams()
  const [view, setView] = useState<ClaimPrefillData | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    api.publicClaimView(token)
      .then((v) => { if (live) { setView(v); setErr(null) } })
      .catch(() => { if (live) setErr('This claim link is no longer available.') })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [token])

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      <header className="mb-6 flex items-center gap-2">
        <span className="font-display text-xl font-bold tracking-tight text-florence-700">FlorenceRN</span>
        <Badge tone="brand">Claim your role</Badge>
      </header>
      {loading && <Card className="p-6"><Spinner label="Loading…" /></Card>}
      {!loading && err && <Card className="p-6 text-sm text-slate-600">{err}</Card>}
      {!loading && view && <ClaimForm token={token} view={view} />}
      <p className="mt-8 text-center text-xs text-slate-400">FlorenceRN delivers licensed RN capacity on a per-RN/month basis, billed after start. Claiming creates a FlorenceRN role from your own authorized details — nothing is copied from any third-party site.</p>
    </div>
  )
}

function ClaimForm({ token, view }: { token: string; view: ClaimPrefillData }) {
  const [employerName, setEmployerName] = useState('')
  const [authorizedBy, setAuthorizedBy] = useState('')
  const [title, setTitle] = useState(view.prefillTitle ?? ROLE_LABEL[view.roleCategory] ?? 'Registered Nurse')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState(view.marketDisplay ?? '')
  const [licenseState, setLicenseState] = useState((view.marketDisplay?.split(',')[1] ?? '').trim())
  const [payMin, setPayMin] = useState('')
  const [payMax, setPayMax] = useState('')
  const [cert, setCert] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const canSubmit = employerName.trim() && authorizedBy.trim() && title.trim() && (licenseState.trim() || location.includes(',')) && cert && !busy

  async function submit() {
    setBusy(true); setErr(null)
    try {
      const r = await api.publicClaim(token, {
        certificationChecked: cert, certificationText: CERT_TEXT, employerName: employerName.trim(),
        employerAuthorizedBy: authorizedBy.trim(), title: title.trim(), description: description.trim() || undefined,
        location: location.trim() || undefined, requiredLicenseState: licenseState.trim().toUpperCase() || undefined,
        payMin: payMin ? Number(payMin) : undefined, payMax: payMax ? Number(payMax) : undefined, payUnit: 'hour',
      })
      setDone(r.jobId)
    } catch (e) { setErr((e as Error).message || 'Something went wrong.') } finally { setBusy(false) }
  }

  if (done) return (
    <Card className="border-emerald-200 bg-emerald-50 p-6">
      <p className="font-semibold text-emerald-800">Role claimed — thank you.</p>
      <p className="mt-1 text-sm text-emerald-700">Your role is now live in FlorenceRN. A FlorenceRN advisor will present licensed RN packets and coordinate interviews. You can review the candidate-facing card at <a className="underline" href={`/jobs/${done}`}>/jobs/{done.slice(0, 8)}…</a></p>
    </Card>
  )

  const input = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-florence-500 focus:outline-none focus:ring-1 focus:ring-florence-500'
  return (
    <Card className="p-6">
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{ROLE_LABEL[view.roleCategory] ?? 'RN'} — {view.marketDisplay ?? view.market}</h1>
      <p className="mt-1 text-sm text-slate-600">Confirm your details to publish this role in FlorenceRN and receive licensed RN packets.</p>
      <div className="mt-4 space-y-3">
        <label className="block text-sm font-medium text-slate-700">Organization name<input className={input} value={employerName} onChange={(e) => setEmployerName(e.target.value)} placeholder="ABC Home Health" /></label>
        <label className="block text-sm font-medium text-slate-700">Your name &amp; title (authorizing this)<input className={input} value={authorizedBy} onChange={(e) => setAuthorizedBy(e.target.value)} placeholder="Jane Doe, Director of Nursing" /></label>
        <label className="block text-sm font-medium text-slate-700">Role title<input className={input} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">Location<input className={input} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Bakersfield, CA" /></label>
          <label className="block text-sm font-medium text-slate-700">Required RN license state<input className={input} value={licenseState} onChange={(e) => setLicenseState(e.target.value.toUpperCase().slice(0, 2))} placeholder="CA" /></label>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">Pay min ($/hr, optional)<input className={input} value={payMin} onChange={(e) => setPayMin(e.target.value)} inputMode="decimal" /></label>
          <label className="block text-sm font-medium text-slate-700">Pay max ($/hr, optional)<input className={input} value={payMax} onChange={(e) => setPayMax(e.target.value)} inputMode="decimal" /></label>
        </div>
        <label className="block text-sm font-medium text-slate-700">Role description (optional)<textarea className={input} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input type="checkbox" className="mt-0.5" checked={cert} onChange={(e) => setCert(e.target.checked)} />
          <span>{CERT_TEXT}</span>
        </label>
        {err && <p className="text-sm text-rose-600">{err}</p>}
        <Button disabled={!canSubmit} onClick={submit} className="w-full">{busy ? 'Publishing…' : 'Claim & publish role'}</Button>
      </div>
    </Card>
  )
}
