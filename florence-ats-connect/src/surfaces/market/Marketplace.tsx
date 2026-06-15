import { useState } from 'react'
import { api } from '../../api'
import { useAsync } from '../../lib/useAsync'
import { Card, CardHeader, Badge, Button, Spinner, Icon, cx, titleize, bandTone, categoryTone } from '../../lib/ui'
import type { FlorenceCandidate, JobRequisition, MatchResult } from '@shared/types'

export default function Marketplace() {
  const candidates = useAsync(() => api.candidates(), [])
  const employers = useAsync(() => api.employers(), [])
  const [id, setId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const doSync = async () => {
    setSyncing(true); setSyncMsg(null)
    try { const r = await api.syncCandidates(); setSyncMsg(`Synced ${r.synced} nurses from pathway-agent (${r.inserted} new, ${r.updated} updated).`); setId(null); candidates.reload() }
    catch (e: any) { setSyncMsg(String(e?.message ?? e)) } finally { setSyncing(false) }
  }

  if (candidates.loading || employers.loading) return <div className="py-10"><Spinner label="Loading marketplace…" /></div>
  const list = candidates.data!
  const current = list.find((c) => c.id === id) ?? list[0]
  const empName = new Map(employers.data!.map((e) => [e.id, e.name]))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Nurse marketplace</h2>
          <p className="text-sm text-slate-500">What a Florence nurse sees: matched roles, what's needed, and one-tap apply with consent.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="soft" onClick={doSync} disabled={syncing} title="Pull the live candidate projection from florence-pathway-agent">{syncing ? 'Syncing…' : 'Sync from Pathway'}</Button>
          <select value={current?.id ?? ''} onChange={(e) => setId(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:border-florence-400 focus:outline-none">
            {list.map((c) => <option key={c.id} value={c.id}>{c.fullName} · {c.readinessBand}</option>)}
          </select>
        </div>
      </div>
      {syncMsg && <div className="rounded-lg bg-florence-50 px-3 py-2 text-sm text-florence-700">{syncMsg}</div>}

      {current && <CandidateBoard candidate={current} empName={empName} />}
    </div>
  )
}

function CandidateBoard({ candidate, empName }: { candidate: FlorenceCandidate; empName: Map<string, string> }) {
  const { data, loading, reload } = useAsync(() => api.candidateMatches(candidate.id), [candidate.id])
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const apply = async (req: JobRequisition) => {
    setBusy(req.id); setMsg(null)
    try {
      await api.grantConsent(candidate.id, { employerId: req.employerId, jobRequisitionId: req.id })
      await api.createPacket({ candidateId: candidate.id, jobRequisitionId: req.id })
      setMsg({ tone: 'ok', text: `Applied to ${req.title} — your packet is with Florence QA.` })
      reload()
    } catch (e: any) { setMsg({ tone: 'err', text: String(e?.message ?? e) }) } finally { setBusy(null) }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.6fr]">
      <Card className="h-fit">
        <CardHeader title={candidate.fullName} subtitle={`${candidate.yearsExperience ?? '—'} yrs · ${candidate.specialtyExperience.join(', ') || 'RN'}`} />
        <div className="space-y-3 px-5 py-4 text-sm">
          <Row label="Readiness"><Badge tone={bandTone(candidate.readinessBand)}>{candidate.readinessBand}</Badge></Row>
          <Row label="NCLEX"><Badge tone="neutral">{titleize(candidate.nclexStatus)}</Badge></Row>
          <Row label="License"><Badge tone="neutral">{titleize(candidate.licenseStatus)}</Badge></Row>
          <Row label="Target states"><span className="text-slate-600">{candidate.targetStates.join(', ') || '—'}</span></Row>
          <Row label="Available"><span className="text-slate-600">{candidate.expectedStartWindow ?? '—'}</span></Row>
          <Row label="Employer-share"><Badge tone={candidate.employerShareConsent === 'granted' ? 'success' : 'warn'}>{titleize(candidate.employerShareConsent)}</Badge></Row>
        </div>
      </Card>

      <Card>
        <CardHeader title="Matched roles" subtitle="Ranked by fit; apply when you're ready to submit" />
        {msg && <div className={cx('mx-5 mt-4 rounded-lg px-3 py-2 text-sm', msg.tone === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>{msg.text}</div>}
        {loading ? <div className="px-5 py-6"><Spinner label="Finding roles…" /></div> : (
          <div className="divide-y divide-slate-100">
            {data!.matches.map(({ requisition, match }) => (
              <RoleRow key={requisition.id} req={requisition} match={match} employer={empName.get(requisition.employerId) ?? ''} onApply={() => apply(requisition)} busy={busy === requisition.id} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>{children}</div>
}

function RoleRow({ req, match, employer, onApply, busy }: { req: JobRequisition; match: MatchResult; employer: string; onApply: () => void; busy: boolean }) {
  const ready = match.category === 'ready_to_submit'
  return (
    <div className="px-5 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-ink">{req.title} <span className="font-mono text-xs text-slate-400">· {match.matchScore}</span></div>
          <div className="mt-0.5 text-xs text-slate-500">{employer} · {req.city}, {req.state} · {titleize(req.setting)}{req.targetStartWindow ? ` · ${req.targetStartWindow}` : ''}</div>
          <div className="mt-1"><Badge tone={categoryTone(match.category)}>{titleize(match.category)}</Badge></div>
        </div>
        <div className="shrink-0">
          {ready ? <Button onClick={onApply} disabled={busy}>{busy ? 'Applying…' : 'Apply with FlorenceRN'}</Button>
            : <div className="max-w-[14rem] text-right text-[11px] text-amber-700">{match.blockers[0] ? `Needs: ${match.blockers[0]}` : 'Not yet eligible'}</div>}
        </div>
      </div>
    </div>
  )
}
