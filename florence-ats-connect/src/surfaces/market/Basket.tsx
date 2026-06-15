// PUBLIC Opportunity Basket cockpit — the nurse's own triage across opportunities
// they've expressed consented interest in. Reached at /basket/:ref (ref = the opaque
// lead id returned after express-interest). No PII in the URL. Lets the nurse re-bucket
// and compare side-by-side. All reads/writes are consent-gated server-side.
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, type BasketEntryData, type CompareRowData } from '../../api'
import { Badge, Button, Card, CardHeader, Spinner, cx, titleize } from '../../lib/ui'

const BUCKETS: { key: string; label: string }[] = [
  { key: 'apply_now', label: 'Apply now' },
  { key: 'apply_when_licensed', label: 'Apply when licensed' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'interested', label: 'Interested' },
  { key: 'not_eligible', label: 'Not eligible' },
]

export default function Basket() {
  const { ref = '' } = useParams()
  const [basket, setBasket] = useState<Record<string, BasketEntryData[]> | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [compare, setCompare] = useState<CompareRowData[] | null>(null)

  async function reload() {
    setLoading(true)
    try { setBasket(await api.publicBasket(ref)); setErr(null) }
    catch { setErr('Basket not found.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void reload() }, [ref]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (jobId: string) => setSelected((s) => { const n = new Set(s); n.has(jobId) ? n.delete(jobId) : n.add(jobId); return n })
  async function setBucket(jobId: string, bucket: string) { await api.publicSetBucket(jobId, ref, bucket); await reload() }
  async function runCompare() { if (selected.size) setCompare(await api.publicCompare(ref, [...selected])) }

  const all = basket ? Object.values(basket).flat() : []

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-10">
      <header className="mb-6 flex items-center gap-2">
        <span className="font-display text-xl font-bold tracking-tight text-florence-700">FlorenceRN</span>
        <Badge tone="brand">Opportunity Basket</Badge>
      </header>

      {loading && <Card className="p-6"><Spinner label="Loading your basket…" /></Card>}
      {!loading && err && <Card className="p-6 text-sm text-slate-600">{err}</Card>}
      {!loading && basket && all.length === 0 && <Card className="p-6 text-sm text-slate-600">No opportunities yet. Express interest in a role to start your basket.</Card>}

      {!loading && basket && all.length > 0 && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Your opportunities" subtitle="Select 2+ and compare side-by-side. Re-bucket to plan your path." right={<Button disabled={selected.size < 2} onClick={runCompare}>Compare ({selected.size})</Button>} />
            <div className="divide-y divide-slate-100">
              {BUCKETS.filter((b) => (basket[b.key]?.length ?? 0) > 0).map((b) => (
                <div key={b.key} className="px-5 py-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{b.label} · {basket[b.key].length}</p>
                  <div className="space-y-2">
                    {basket[b.key].map((e) => (
                      <BasketRow key={e.jobId} e={e} checked={selected.has(e.jobId)} onToggle={() => toggle(e.jobId)} onBucket={(bk) => setBucket(e.jobId, bk)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {compare && compare.length > 0 && <CompareTable rows={compare} />}
        </div>
      )}
    </div>
  )
}

function BasketRow({ e, checked, onToggle, onBucket }: { e: BasketEntryData; checked: boolean; onToggle: () => void; onBucket: (b: string) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
      <input type="checkbox" checked={checked} onChange={onToggle} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-ink">{e.title}</div>
        <div className="truncate text-xs text-slate-500">{e.employerName}{e.state ? ` · ${e.state}` : ''}</div>
      </div>
      <Badge tone={e.fitScore >= 70 ? 'success' : e.fitScore >= 40 ? 'warn' : 'neutral'}>Fit {e.fitScore}</Badge>
      <select value={e.bucket} onChange={(ev) => onBucket(ev.target.value)} className="rounded-md border border-slate-300 px-2 py-1 text-xs">
        {BUCKETS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
      </select>
    </div>
  )
}

function CompareTable({ rows }: { rows: CompareRowData[] }) {
  const th = 'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400'
  const td = 'px-3 py-2 text-sm text-slate-700 align-top'
  return (
    <Card>
      <CardHeader title="Side-by-side compare" subtitle="Listed pay is from the employer posting; estimated pay is a FlorenceRN local-market estimate." />
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead><tr className="border-b border-slate-200">
            <th className={th}>Role</th><th className={th}>Pay</th><th className={th}>Benefits</th><th className={th}>Fit</th><th className={th}>Eligibility</th><th className={th}>Start</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.jobId} className="border-b border-slate-100">
                <td className={td}><div className="font-medium text-ink">{r.title}</div><div className="text-xs text-slate-500">{r.employerName}{r.state ? ` · ${r.state}` : ''}</div></td>
                <td className={td}><span className={cx('font-medium', r.pay.kind === 'listed' ? 'text-emerald-700' : r.pay.kind === 'estimated' ? 'text-florence-700' : 'text-slate-400')}>{r.pay.amount || '—'}</span><div className="text-[11px] text-slate-400">{r.pay.label}</div></td>
                <td className={td}>{r.benefits.length ? r.benefits.map((b) => titleize(b)).join(', ') : '—'}</td>
                <td className={td}><Badge tone={r.fitScore >= 70 ? 'success' : r.fitScore >= 40 ? 'warn' : 'neutral'}>{r.fitScore}</Badge></td>
                <td className={td}>{titleize(r.eligibilityState)}</td>
                <td className={td}>{r.startFeasibility.replace('d', '').replace('_', '–')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
