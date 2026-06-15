// AMN/Kaiser Program Workspace — the operator cockpit for a productized RN program
// (e.g. Kaiser 200-RN): overview, licensed slate (+lock wave), wave tracker, scorecard,
// effective-cost/invoice rollup, expansion gate. Ops-scoped. Kaiser sees only the
// redacted licensed packets via share links — never this internal cockpit.

import { useState } from 'react'
import { api, type ProgramOverview, type LicensedSlateData, type WaveTrackerRow, type ProgramScorecard, type InvoiceRollup, type ExpansionGateRow } from '../../api'
import type { Program } from '@shared/types'
import { useAsync } from '../../lib/useAsync'
import { Card, CardHeader, StatCard, Bar, Badge, Button, Spinner } from '../../lib/ui'

const fmt$ = (n: number) => `$${Math.round(n).toLocaleString()}`

export default function ProgramWorkspace() {
  const programs = useAsync(() => api.programs(), [])
  const [selected, setSelected] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">AMN / Kaiser Program Workspace</h1>
        {selected && <Button variant="ghost" onClick={() => setSelected(null)}>← All programs</Button>}
      </div>
      {msg && <p className="text-sm text-slate-600">{msg}</p>}

      {!selected ? (
        <>
          <CreateProgram onCreated={(id) => { programs.reload(); setSelected(id) }} />
          <Card>
            <CardHeader title="Programs" subtitle="Productized employer programs (200-RN waves)" />
            {programs.loading ? <Spinner label="Loading programs…" /> : (
              <div className="divide-y divide-slate-100">
                {(programs.data ?? []).length === 0 && <p className="p-4 text-sm text-slate-500">No programs yet — create one above.</p>}
                {(programs.data ?? []).map((p: Program) => (
                  <button key={p.id} onClick={() => setSelected(p.id)} className="flex w-full items-center justify-between p-3 text-left hover:bg-slate-50">
                    <span><span className="font-medium text-slate-900">{p.name}</span> <Badge tone="neutral">{p.channel}</Badge></span>
                    <span className="text-sm text-slate-500">target {p.targetCount} · waves {p.waveStructure.join('+')}</span>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </>
      ) : (
        <ProgramDetail programId={selected} onMsg={setMsg} />
      )}
    </div>
  )
}

function CreateProgram({ onCreated }: { onCreated: (id: string) => void }) {
  const [employerId, setEmployerId] = useState('')
  const [name, setName] = useState('Kaiser 200-RN')
  const [target, setTarget] = useState('200')
  const [waves, setWaves] = useState('50,50,100')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const create = async () => {
    setBusy(true); setErr(null)
    try {
      const ov = await api.createProgram({
        employerId: employerId.trim(), name: name.trim(), targetCount: Number(target) || 0,
        waveStructure: waves.split(',').map((s) => Number(s.trim())).filter((n) => n > 0), channel: 'amn',
      })
      onCreated(ov.program.id)
    } catch (e: any) { setErr(String(e?.message ?? e)) } finally { setBusy(false) }
  }
  return (
    <Card>
      <CardHeader title="New program" subtitle="Group an employer's placements into waves" />
      <div className="grid gap-2 p-3 sm:grid-cols-5">
        <input className="rounded border border-slate-300 px-2 py-1 text-sm" placeholder="employerId" value={employerId} onChange={(e) => setEmployerId(e.target.value)} />
        <input className="rounded border border-slate-300 px-2 py-1 text-sm" placeholder="name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="rounded border border-slate-300 px-2 py-1 text-sm" placeholder="target" value={target} onChange={(e) => setTarget(e.target.value)} />
        <input className="rounded border border-slate-300 px-2 py-1 text-sm" placeholder="waves e.g. 50,50,100" value={waves} onChange={(e) => setWaves(e.target.value)} />
        <Button onClick={create} disabled={busy || !employerId.trim()}>Create</Button>
      </div>
      {err && <p className="px-3 pb-3 text-sm text-rose-600">{err}</p>}
    </Card>
  )
}

function ProgramDetail({ programId, onMsg }: { programId: string; onMsg: (m: string) => void }) {
  const data = useAsync(async () => {
    const [overview, slate, tracker, score, invoices, expansion] = await Promise.all([
      api.program(programId), api.programSlate(programId), api.programWaveTracker(programId),
      api.programScorecard(programId), api.programInvoices(programId), api.programExpansion(programId),
    ])
    return { overview, slate, tracker, score, invoices, expansion }
  }, [programId])

  const lockWave1 = async () => {
    if (!data.data) return
    const wave = data.data.overview.waves[0]
    const ids = data.data.slate.eligible.slice(0, wave?.targetCount ?? 50).map((e) => e.candidateId)
    if (!wave || ids.length === 0) { onMsg('No eligible candidates to lock.'); return }
    try {
      const slate = await api.lockWave(programId, wave.id, ids)
      onMsg(`Locked ${slate.candidateIds.length} licensed RN(s) into wave ${wave.waveNumber}.`)
      data.reload()
    } catch (e: any) { onMsg(String(e?.message ?? e)) }
  }

  if (data.loading || !data.data) return <Spinner label="Loading program…" />
  const { overview, slate, tracker, score, invoices, expansion } = data.data
  const p = overview.program

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-slate-900">{p.name} <Badge tone="neutral">{p.channel}</Badge></h2>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Target" value={p.targetCount} />
        <StatCard label="Waves" value={p.waveStructure.join(' + ')} />
        <StatCard label="Locked RNs" value={overview.lockedCandidates} />
        <StatCard label="Licensed eligible" value={slate.eligible.length} tone="success" />
      </div>

      <Card>
        <CardHeader title="Licensed slate" subtitle="Licensed + employer-ready (consent granted). Kaiser sees only these redacted packets." right={<Button onClick={lockWave1} disabled={slate.eligible.length === 0}>Lock wave 1</Button>} />
        <div className="divide-y divide-slate-100">
          {slate.eligible.length === 0 && <p className="p-3 text-sm text-slate-500">No licensed+consented candidates yet.</p>}
          {slate.eligible.map((c) => (
            <div key={c.candidateId} className="flex items-center justify-between p-2.5 text-sm">
              <span className="font-medium text-slate-900">{c.fullName}</span>
              <span className="text-slate-500">match {c.matchScore}</span>
            </div>
          ))}
          {slate.consentPending.length > 0 && <p className="p-2.5 text-xs text-amber-700">{slate.consentPending.length} licensed but awaiting employer-share consent.</p>}
        </div>
      </Card>

      <Card>
        <CardHeader title="Wave tracker" subtitle="Locked → packet → interview → offer → start → retained" />
        <div className="space-y-2 p-3">
          {tracker.map((w: WaveTrackerRow) => (
            <div key={w.waveId}>
              <p className="mb-1 text-xs font-medium text-slate-600">Wave {w.waveNumber} (target {w.targetCount})</p>
              <div className="grid grid-cols-5 gap-2">
                <Bar label="Locked" value={w.locked} max={w.targetCount || 1} />
                <Bar label="Shared" value={w.packetShared} max={w.targetCount || 1} />
                <Bar label="Interview" value={w.interview} max={w.targetCount || 1} tone="warn" />
                <Bar label="Offer" value={w.offer} max={w.targetCount || 1} tone="warn" />
                <Bar label="Started" value={w.started} max={w.targetCount || 1} tone="success" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Interviews" value={score.interviews} />
        <StatCard label="Offers" value={score.offers} tone="warn" />
        <StatCard label="Starts" value={score.starts} tone="success" />
      </div>

      <Card>
        <CardHeader title="Commercial · effective cost" subtitle={`Fee ${fmt$(invoices.perRnMonthlyFeeUsd)}/RN/mo (${invoices.feeSource}). FICA offset is customer-side only — never FlorenceRN revenue.`} />
        <div className="grid gap-3 p-3 sm:grid-cols-3">
          <StatCard label="Verified starts (cum.)" value={invoices.cumulative.verifiedStarts} />
          <StatCard label="Gross (Florence revenue)" value={fmt$(invoices.cumulative.grossUsd)} tone="success" />
          <StatCard label="Customer effective cost" value={fmt$(invoices.cumulative.customerEffectiveCostUsd)} sub={`after ${fmt$(invoices.ficaOffsetPerRnUsd)}/RN FICA offset`} />
        </div>
        {invoices.months.length > 0 && (
          <div className="px-3 pb-3 text-xs text-slate-500">
            {invoices.months.map((m) => <span key={m.month} className="mr-3">{m.month}: {m.verifiedStarts} started → {fmt$(m.grossUsd)}</span>)}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Expansion gate" subtitle="≥80% of a wave started → ready to advance" />
        <div className="space-y-1 p-3">
          {expansion.map((e: ExpansionGateRow) => (
            <div key={e.waveNumber} className="flex items-center justify-between text-sm">
              <span>Wave {e.waveNumber}: {e.started}/{e.targetCount} started ({e.fillPct}%)</span>
              <Badge tone={e.readyToAdvance ? 'success' : 'neutral'}>{e.readyToAdvance ? 'Ready to advance' : 'In progress'}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
