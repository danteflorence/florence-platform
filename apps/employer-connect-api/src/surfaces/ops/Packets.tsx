import { useState } from 'react'
import { api } from '../../api'
import { useAsync } from '../../lib/useAsync'
import { Card, CardHeader, Badge, Button, Spinner, Icon, cx, titleize, type Tone } from '../../lib/ui'
import type { ApplicationPacket, ATSApplication, FlorenceCandidate } from '@shared/types'

const APP_TONE: Record<string, Tone> = { submitted: 'brand', interview: 'brand', offer: 'warn', hired: 'success', started: 'success', start_scheduled: 'success', rejected: 'danger', withdrawn: 'neutral' }

export default function Packets() {
  const packets = useAsync(() => api.packets(), [])
  const apps = useAsync(() => api.atsApplications(), [])
  const candidates = useAsync(() => api.candidates(), [])
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  if (packets.loading || apps.loading || candidates.loading) return <div className="py-10"><Spinner label="Loading packets…" /></div>
  const name = new Map((candidates.data as FlorenceCandidate[]).map((c) => [c.id, c.fullName]))

  const act = async (fn: () => Promise<unknown>, okText: string) => {
    setMsg(null)
    try { await fn(); setMsg({ tone: 'ok', text: okText }); packets.reload(); apps.reload() }
    catch (e: any) { setMsg({ tone: 'err', text: String(e?.message ?? e) }) }
    finally { setBusy(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Packets &amp; QA</h2>
          <p className="text-sm text-slate-500">Human QA before anything leaves Florence. Then submit via the employer's channel and sync status back.</p>
        </div>
        <Button variant="soft" onClick={() => { setBusy('hris'); act(() => api.syncHris(), 'HRIS confirmed starts/retention (verifiedVia: hris).') }} disabled={busy === 'hris'} title="Pull start/retention from the HRIS feed — the billing-grade source">{busy === 'hris' ? 'Syncing…' : 'Sync HRIS starts'}</Button>
      </div>
      {msg && <div className={cx('rounded-lg px-3 py-2 text-sm', msg.tone === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>{msg.text}</div>}

      <Card>
        <CardHeader title="Packet queue" subtitle={`${packets.data!.length} packets`} />
        <div className="divide-y divide-slate-100">
          {packets.data!.length === 0 && <div className="px-5 py-6 text-sm text-slate-400">No packets yet — build one from Requisitions or the Marketplace.</div>}
          {packets.data!.map((p) => <PacketRow key={p.id} p={p} name={name.get(p.candidateId) ?? p.candidateId}
            onApprove={() => { setBusy(p.id); act(() => api.qaApprove(p.id, { reviewer: 'ops', decision: 'approve' }), 'QA approved.') }}
            onSubmit={() => { setBusy(p.id); act(() => api.submitPacket(p.id), 'Submitted via the employer channel.') }}
            busy={busy === p.id} />)}
        </div>
      </Card>

      <Card>
        <CardHeader title="ATS applications" subtitle="Status syncs back to the Production Ledger" />
        <div className="divide-y divide-slate-100">
          {apps.data!.length === 0 && <div className="px-5 py-6 text-sm text-slate-400">No submissions yet.</div>}
          {apps.data!.map((a) => <AppRow key={a.id} a={a} name={name.get(a.candidateId) ?? a.candidateId} onStatus={(body) => { setBusy(a.id); act(() => api.updateStatus(a.id, body), `Status → ${body.status}.`) }} busy={busy === a.id} />)}
        </div>
      </Card>
    </div>
  )
}

function PacketRow({ p, name, onApprove, onSubmit, busy }: { p: ApplicationPacket; name: string; onApprove: () => void; onSubmit: () => void; busy: boolean }) {
  const [open, setOpen] = useState(false)
  const tone: Tone = p.status === 'submitted' ? 'success' : p.status === 'ready_to_submit' ? 'brand' : 'warn'
  return (
    <div className="px-5 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-ink">{name}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            <Badge tone={tone}>{titleize(p.status)}</Badge>
            <Badge tone={p.humanQaStatus === 'approved' ? 'success' : p.humanQaStatus === 'blocked' ? 'danger' : 'warn'}>QA: {p.humanQaStatus}</Badge>
            <Badge tone="neutral">readiness {p.readinessPassport.credentialCompletenessPct}%</Badge>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={() => setOpen((v) => !v)} className="text-xs font-medium text-florence-700 hover:underline">{open ? 'Hide' : 'Packet'}</button>
          {p.status === 'qa_pending' && <Button variant="soft" onClick={onApprove} disabled={busy}>{busy ? '…' : 'QA approve'}</Button>}
          {p.status === 'ready_to_submit' && <Button onClick={onSubmit} disabled={busy}>{busy ? '…' : 'Submit'}</Button>}
        </div>
      </div>
      {open && (
        <div className="mt-3 grid gap-3 rounded-lg bg-slate-50 px-3 py-3 sm:grid-cols-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Shared with employer</div>
            <ul className="mt-1 space-y-0.5 text-xs text-slate-600">{Object.entries(p.sharedFields).map(([k, v]) => <li key={k}><span className="text-slate-400">{titleize(k)}:</span> {v}</li>)}</ul>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-600">Withheld (data minimization)</div>
            <ul className="mt-1 space-y-0.5 text-xs text-slate-500">{p.withheldFields.map((w) => <li key={w.field} className="flex gap-1"><Icon.lock className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" /><span><span className="font-medium text-slate-600">{titleize(w.field)}</span> — {w.reason}</span></li>)}</ul>
          </div>
        </div>
      )}
    </div>
  )
}

function AppRow({ a, name, onStatus, busy }: { a: ATSApplication; name: string; onStatus: (b: { status: string; verifiedVia?: string }) => void; busy: boolean }) {
  return (
    <div className="px-5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-ink">{name}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            <Badge tone={APP_TONE[a.status] ?? 'neutral'}>{titleize(a.status)}</Badge>
            <Badge tone="neutral">{titleize(a.submissionMode)}</Badge>
            {a.packetLink && <a href={a.packetLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-florence-700 hover:underline"><Icon.link className="h-3 w-3" />packet link</a>}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <Button variant="ghost" onClick={() => onStatus({ status: 'interview', verifiedVia: 'ats' })} disabled={busy}>Interview</Button>
          <Button variant="ghost" onClick={() => onStatus({ status: 'offer', verifiedVia: 'ats' })} disabled={busy}>Offer</Button>
          {/* Demonstrates the invariant: bare ATS 'started' is rejected (409). */}
          <Button variant="ghost" onClick={() => onStatus({ status: 'started', verifiedVia: 'ats' })} disabled={busy} title="Bare ATS start — should be rejected">Started (ATS)</Button>
          <Button variant="soft" onClick={() => onStatus({ status: 'started', verifiedVia: 'employer_attestation' })} disabled={busy} title="Attested start — accepted">Started (attested)</Button>
        </div>
      </div>
    </div>
  )
}
