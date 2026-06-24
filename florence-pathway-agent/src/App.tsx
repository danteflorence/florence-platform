import { Routes, Route, NavLink, Outlet, Navigate, useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, type ReactNode } from 'react'
import { api, isStaff, onStaffChange, staffLogout, staffLogin, refreshSession } from './api'
import { useAsync } from './lib/useAsync'
import { Badge, Spinner, cx, Icon, Card, CardHeader, Button } from './lib/ui'
import CandidateCopilot from './surfaces/candidate/CandidateCopilot'
import QaConsole from './surfaces/qa/QaConsole'
import QaReview from './surfaces/qa/QaReview'
import AdminDashboard from './surfaces/admin/AdminDashboard'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="candidate/:id" element={<CandidateCopilot />} />
        <Route path="qa" element={<StaffGate><QaConsole /></StaffGate>} />
        <Route path="qa/:id" element={<StaffGate><QaReview /></StaffGate>} />
        <Route path="admin" element={<StaffGate><AdminDashboard /></StaffGate>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

/** Reactive staff sign-in state (Core session, in api.ts). */
function useStaff(): boolean {
  const [v, setV] = useState(isStaff())
  useEffect(() => {
    const off = onStaffChange(() => setV(isStaff()))
    void refreshSession()
    return off
  }, [])
  return v
}

/** Gates the QA + Operations surfaces behind a Core staff role (server-enforced). */
function StaffGate({ children }: { children: ReactNode }) {
  const staff = useStaff()
  if (staff) return <>{children}</>
  return (
    <div className="mx-auto max-w-md py-16">
      <Card>
        <CardHeader title="Staff sign-in" subtitle="The QA Console and Operations are staff-only — they include internal production economics that candidates never see." />
        <div className="space-y-3 px-5 py-4">
          <p className="text-sm text-slate-600">Sign in with your FlorenceRN account to continue.</p>
          <Button onClick={() => staffLogin()}>Sign in with FlorenceRN</Button>
          <p className="text-[11px] text-slate-400">Server-enforced gate — <code className="font-mono">/qa</code> and <code className="font-mono">/admin</code> reject requests without a Core staff role (super_admin / ops / qa).</p>
        </div>
      </Card>
    </div>
  )
}

function Home() {
  const { data, loading } = useAsync(() => api.candidates(), [])
  if (loading) return <div className="p-10"><Spinner label="Loading candidates…" /></div>
  if (data && data.length) return <Navigate to={`/candidate/${data[0].id}`} replace />
  return <div className="p-10 text-slate-500">No candidates yet.</div>
}

function Layout() {
  const { data: meta } = useAsync(() => api.meta(), [])
  const { data: candidates } = useAsync(() => api.candidates(), [])
  const params = useParams()
  const navigate = useNavigate()
  const staff = useStaff()
  const activeCandidate = params.id ?? candidates?.[0]?.id ?? ''

  const tab = (to: string, label: string, icon: keyof typeof Icon, staffOnly = false) => {
    const IconC = Icon[icon]
    const locked = staffOnly && !staff
    return (
      <NavLink
        to={to}
        className={({ isActive }) => cx(
          'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition',
          isActive ? 'bg-florence-50 text-florence-700' : 'text-slate-600 hover:bg-slate-100',
        )}
      >
        <IconC className="h-4 w-4" />
        {label}
        {locked && <Icon.lock className="h-3 w-3 text-slate-400" />}
      </NavLink>
    )
  }

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5">
          <div className="flex shrink-0 items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-[9px] bg-florence-600 text-white shadow-sm">
              <span className="font-display text-lg font-bold leading-none">F</span>
            </div>
            <div className="leading-tight">
              <div className="whitespace-nowrap">
                <span className="font-display text-[15px] font-bold tracking-[-0.01em] text-ink">Florence</span>
                <span className="ml-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-florence-700">Pathway OS</span>
              </div>
              <div className="hidden whitespace-nowrap text-[11px] text-slate-400 xl:block">One profile → every workflow · AI drafts · humans QA · candidates attest</div>
            </div>
          </div>

          <nav className="ml-2 flex shrink-0 items-center gap-1">
            {tab(`/candidate/${activeCandidate}`, 'Candidate Copilot', 'user')}
            {tab('/qa', 'QA Console', 'shield', true)}
            {tab('/admin', 'Operations', 'chart', true)}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {candidates && (
              <select
                value={params.id ?? ''}
                onChange={(e) => e.target.value && navigate(`/candidate/${e.target.value}`)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:border-florence-400 focus:outline-none"
              >
                <option value="" disabled>Jump to candidate…</option>
                {candidates.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.nationality}</option>)}
              </select>
            )}
            <Badge tone={meta?.llmMode === 'model_gateway' ? 'success' : 'neutral'}>
              <Icon.sparkle className="h-3 w-3" />
              {meta ? (meta.llmMode === 'model_gateway' ? 'Model Gateway' : 'Heuristic') : '…'}
            </Badge>
            {staff && (
              <button
                onClick={() => { staffLogout(); navigate(`/candidate/${activeCandidate}`) }}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                title="Sign out of staff surfaces"
              >
                <Icon.lock className="h-3 w-3" />Staff · sign out
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-7xl px-4 pb-10 pt-2 text-[11px] leading-relaxed text-slate-400">
        Florence Pathway OS prepares &amp; quality-checks drafts and explains each step — it is not a law firm and does not provide legal advice. Always verify on the official site.{' '}
        Find legitimate help:{' '}
        <a className="text-florence-600 hover:underline" href="https://www.uscis.gov/scams-fraud-and-misconduct/avoid-scams/find-legal-services" target="_blank" rel="noreferrer">USCIS Find Legal Services ↗</a>.
      </footer>
    </div>
  )
}
