import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, staffLogin } from '../../api'
import { useSession } from '../../lib/useSession'
import { Card, CardHeader, Button, Badge, Icon, cx } from '../../lib/ui'

// Public "click to add" landing — the target of every ATS marketplace listing.
// Renders for anyone; the connect actions require a FlorenceRN (Core) sign-in.
const ATS = ['Workday', 'iCIMS', 'Oracle Taleo', 'SAP SuccessFactors', 'UKG', 'Greenhouse', '+ 50 more via Merge']

export default function Onboarding() {
  const s = useSession()
  const authed = s.role === 'employer' || s.staff
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [done, setDone] = useState<{ imported: number } | null>(null)
  const [ghKey, setGhKey] = useState('')

  const onConnected = (imported: number) => { setDone({ imported }); setMsg({ tone: 'ok', text: `Connected — imported ${imported} open requisition(s). FlorenceRN nurses can now be matched and submitted into your ATS.` }) }

  const connectMerge = async () => {
    if (!authed) return staffLogin()
    setBusy('merge'); setMsg(null)
    try {
      const lt = await api.mergeLinkToken()
      if (lt.mode === 'mock') {
        // Live: open the Merge Link widget (@mergeapi/react-merge-link) with lt.linkToken,
        // then pass its public token to the callback. Mock simulates that handshake.
        const r = await api.mergeCallback({ publicToken: `mock-public-${lt.linkToken}` })
        onConnected(r.imported)
      } else {
        setMsg({ tone: 'err', text: 'Live mode: the Merge Link widget opens here (wire @mergeapi/react-merge-link with the returned link token).' })
      }
    } catch (e: any) { setMsg({ tone: 'err', text: String(e?.message ?? e) }) } finally { setBusy(null) }
  }

  const connectGreenhouse = async () => {
    if (!authed) return staffLogin()
    if (!ghKey.trim()) { setMsg({ tone: 'err', text: 'Paste your Greenhouse Candidate Ingestion API key.' }); return }
    setBusy('gh'); setMsg(null)
    try { const r = await api.greenhouseConnect({ apiKey: ghKey.trim() }); onConnected(r.imported) }
    catch (e: any) { setMsg({ tone: 'err', text: String(e?.message ?? e) }) } finally { setBusy(null) }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <div className="text-center">
        <Badge tone="brand"><Icon.sparkle className="h-3 w-3" />FlorenceRN ATS Connect</Badge>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">Add the FlorenceRN nurse pipeline to your ATS</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">Connect once and Florence's interview-ready, internationally-educated RNs flow into your open requisitions — application packets land in the ATS your recruiters already use. No new system to adopt.</p>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">{ATS.map((a) => <Badge key={a} tone="neutral">{a}</Badge>)}</div>
      </div>

      {msg && <div className={cx('rounded-lg px-3 py-2 text-sm', msg.tone === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>{msg.text}</div>}

      {done ? (
        <Card>
          <CardHeader title="You're connected ✓" subtitle="Your open RN requisitions are importing; matching runs continuously." />
          <div className="flex items-center justify-between px-5 py-4">
            <div className="text-sm text-slate-600">{done.imported} requisition(s) imported.</div>
            <Link to={s.staff ? '/ops/requisitions' : '/employer'}><Button>View your pipeline →</Button></Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <CardHeader title="Connect your ATS" subtitle="Workday, iCIMS, Taleo, SAP, UKG, Greenhouse & more — via Merge" />
            <div className="space-y-3 px-5 py-4">
              <p className="text-sm text-slate-600">One secure authorization links your ATS. We import your open RN reqs and submit Florence candidates back — read &amp; write.</p>
              <Button onClick={connectMerge} disabled={busy === 'merge'}>{busy === 'merge' ? 'Connecting…' : authed ? 'Connect your ATS' : 'Sign in to connect'}</Button>
              {!authed && <p className="text-[11px] text-slate-400">You'll sign in with FlorenceRN, then authorize your ATS.</p>}
            </div>
          </Card>

          <Card>
            <CardHeader title="Use Greenhouse?" subtitle="Paste a Candidate Ingestion API key" />
            <div className="space-y-3 px-5 py-4">
              <p className="text-sm text-slate-600">Greenhouse admins: create a Candidate Ingestion API key and paste it — FlorenceRN becomes a sourcing partner on your jobs.</p>
              <input value={ghKey} onChange={(e) => setGhKey(e.target.value)} placeholder="ghi_… ingestion key" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-florence-400 focus:outline-none" />
              <Button variant="soft" onClick={connectGreenhouse} disabled={busy === 'gh'}>{busy === 'gh' ? 'Connecting…' : authed ? 'Connect Greenhouse' : 'Sign in to connect'}</Button>
            </div>
          </Card>
        </div>
      )}

      <p className="text-center text-[11px] leading-relaxed text-slate-400">FlorenceRN only ever shares a candidate's employer-ready packet with their explicit consent, and withholds national-origin / visa data pre-offer by design. Start &amp; retention are verified via HRIS/attestation, never bare ATS status.</p>
    </div>
  )
}
