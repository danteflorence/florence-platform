import { useState } from 'react'
import { api } from '../../api'
import { useAsync } from '../../lib/useAsync'
import { Card, CardHeader, Badge, Button, Spinner, Icon, cx, titleize, bandTone, categoryTone } from '../../lib/ui'
import type { MatchResult } from '@shared/types'

export default function Requisitions() {
  const reqs = useAsync(() => api.requisitions(), [])
  const employers = useAsync(() => api.employers(), [])
  const [selected, setSelected] = useState<string | null>(null)

  if (reqs.loading || employers.loading) return <div className="py-10"><Spinner label="Loading requisitions…" /></div>
  const empName = new Map(employers.data!.map((e) => [e.id, e.name]))
  const sel = reqs.data!.find((r) => r.id === selected) ?? reqs.data![0]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Requisitions</h2>
        <p className="text-sm text-slate-500">Imported employer reqs. Select one to see ranked, explainable nurse matches.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
        <Card>
          <CardHeader title="Open requisitions" subtitle={`${reqs.data!.length} total`} />
          <div className="max-h-[70vh] divide-y divide-slate-100 overflow-auto scroll-thin">
            {reqs.data!.map((r) => (
              <button key={r.id} onClick={() => setSelected(r.id)} className={cx('flex w-full items-start justify-between gap-3 px-5 py-3 text-left transition hover:bg-slate-50', sel.id === r.id && 'bg-florence-50/60')}>
                <div>
                  <div className="text-sm font-semibold text-ink">{r.title}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{empName.get(r.employerId)} · {r.city}, {r.state} · {titleize(r.setting)}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {r.specialty && <Badge tone="neutral">{r.specialty}</Badge>}
                    {r.requiredLicenseState && <Badge tone="neutral">{r.requiredLicenseState} license</Badge>}
                    {r.targetStartWindow && <Badge tone="neutral"><Icon.clock className="h-3 w-3" />{r.targetStartWindow}</Badge>}
                  </div>
                </div>
                <div className="shrink-0 text-right"><div className="font-mono text-sm text-slate-600">{r.openings}</div><div className="text-[10px] uppercase text-slate-400">openings</div></div>
              </button>
            ))}
          </div>
        </Card>

        {sel && <Matches reqId={sel.id} reqTitle={sel.title} employerId={sel.employerId} employerName={empName.get(sel.employerId) ?? ''} />}
      </div>
    </div>
  )
}

function Matches({ reqId, reqTitle, employerId, employerName }: { reqId: string; reqTitle: string; employerId: string; employerName: string }) {
  const { data, loading } = useAsync(() => api.matches(reqId), [reqId])
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const buildPacket = async (m: MatchResult) => {
    setBusy(m.candidateId); setMsg(null)
    try {
      // Ops capturing consent on the candidate's behalf for the demo; in the live
      // product this consent is granted by the nurse in the Marketplace.
      await api.grantConsent(m.candidateId, { employerId, jobRequisitionId: reqId })
      await api.createPacket({ candidateId: m.candidateId, jobRequisitionId: reqId })
      setMsg({ tone: 'ok', text: `Packet created for ${m.candidateName} → see Packets & QA.` })
    } catch (e: any) { setMsg({ tone: 'err', text: String(e?.message ?? e) }) } finally { setBusy(null) }
  }

  return (
    <Card>
      <CardHeader title="Matches" subtitle={`${reqTitle} · ${employerName}`} />
      {msg && <div className={cx('mx-5 mt-4 rounded-lg px-3 py-2 text-sm', msg.tone === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>{msg.text}</div>}
      {loading ? <div className="px-5 py-6"><Spinner label="Matching…" /></div> : (
        <div className="divide-y divide-slate-100">
          {data!.matches.map((m) => <MatchRow key={m.candidateId} m={m} onBuild={() => buildPacket(m)} busy={busy === m.candidateId} />)}
        </div>
      )}
    </Card>
  )
}

function MatchRow({ m, onBuild, busy }: { m: MatchResult; onBuild: () => void; busy: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="px-5 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 font-mono text-sm font-semibold text-slate-600">{m.matchScore}</div>
          <div>
            <div className="text-sm font-semibold text-ink">{m.candidateName}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1">
              <Badge tone={categoryTone(m.category)}>{titleize(m.category)}</Badge>
              <Badge tone={bandTone(m.readinessBand)}>{m.readinessBand}</Badge>
              <Badge tone="neutral">route: {m.routeConfidence}</Badge>
              {m.expectedStartWindow && <Badge tone="neutral"><Icon.clock className="h-3 w-3" />{m.expectedStartWindow}</Badge>}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={() => setOpen((v) => !v)} className="text-xs font-medium text-florence-700 hover:underline">{open ? 'Hide' : 'Why?'}</button>
          {m.category === 'ready_to_submit' && <Button variant="soft" onClick={onBuild} disabled={busy}>{busy ? 'Building…' : 'Build packet'}</Button>}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 pl-13">
        {m.reasons.map((r, i) => <span key={i} className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-700"><Icon.check className="h-3 w-3" />{r}</span>)}
        {m.blockers.map((b, i) => <span key={i} className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700"><Icon.alert className="h-3 w-3" />{b}</span>)}
      </div>
      {open && (
        <div className="mt-3 space-y-1.5 rounded-lg bg-slate-50 px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Score breakdown (transparent — not a black box)</div>
          {m.signals.map((s) => (
            <div key={s.signal} className="flex items-center gap-3 text-xs">
              <div className="w-44 shrink-0 text-slate-600">{s.signal} <span className="text-slate-400">·{Math.round(s.weight * 100)}%</span></div>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-florence-500" style={{ width: `${Math.round(s.score * 100)}%` }} /></div>
              <div className="w-56 shrink-0 truncate text-slate-500">{s.note}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
