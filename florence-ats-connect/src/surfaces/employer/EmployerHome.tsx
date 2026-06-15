import { Link } from 'react-router-dom'
import { api } from '../../api'
import { useAsync } from '../../lib/useAsync'
import { useSession } from '../../lib/useSession'
import { Card, CardHeader, Badge, Button, Spinner, Icon, titleize } from '../../lib/ui'

// Employer-role home: their own imported reqs (server-scoped by Core org_id).
export default function EmployerHome() {
  const s = useSession()
  const reqs = useAsync(() => api.requisitions(), [])
  if (reqs.loading) return <div className="py-10"><Spinner label="Loading your pipeline…" /></div>
  const list = reqs.data ?? []
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Your pipeline</h2>
          <p className="text-sm text-slate-500">Open RN requisitions imported from your ATS. FlorenceRN matches &amp; submits interview-ready nurses into them.</p>
        </div>
        <Link to="/connect"><Button variant="soft"><Icon.link className="h-4 w-4" />Connect / refresh ATS</Button></Link>
      </div>
      <Card>
        <CardHeader title="Open requisitions" subtitle={`${list.length} imported`} />
        {list.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-500">No requisitions yet — <Link to="/connect" className="text-florence-700 hover:underline">connect your ATS</Link> to import your open RN roles.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {list.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-semibold text-ink">{r.title}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{[r.city, r.state].filter(Boolean).join(', ')}{r.specialty ? ` · ${r.specialty}` : ''}{r.targetStartWindow ? ` · ${r.targetStartWindow}` : ''}</div>
                  <div className="mt-1 flex flex-wrap gap-1">{r.requiredLicenseState && <Badge tone="neutral">{r.requiredLicenseState} license</Badge>}<Badge tone="neutral">{titleize(r.atsProvider)}</Badge></div>
                </div>
                <div className="shrink-0 text-right"><div className="font-mono text-sm text-slate-600">{r.openings ?? 1}</div><div className="text-[10px] uppercase text-slate-400">openings</div></div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <p className="text-[11px] text-slate-400">Signed in as {s.role === 'employer' ? `employer · ${s.employerId}` : 'staff'}. Candidate sharing is consent-gated — you receive only minimized, employer-safe packets.</p>
    </div>
  )
}
