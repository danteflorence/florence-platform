import { Routes, Route, NavLink, Outlet, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { staffLogin, staffLogout } from './api'
import { useSession } from './lib/useSession'
import { cx, Icon, Card, CardHeader, Button } from './lib/ui'
import Dashboards from './surfaces/ops/Dashboards'
import Requisitions from './surfaces/ops/Requisitions'
import Packets from './surfaces/ops/Packets'
import DemandRadar from './surfaces/ops/DemandRadar'
import AmnRadar from './surfaces/ops/AmnRadar'
import LongTailRadar from './surfaces/ops/LongTailRadar'
import ApplicationQueue from './surfaces/ops/ApplicationQueue'
import ProgramWorkspace from './surfaces/ops/ProgramWorkspace'
import Marketplace from './surfaces/market/Marketplace'
import JobCard from './surfaces/market/JobCard'
import Basket from './surfaces/market/Basket'
import ClaimJob from './surfaces/market/ClaimJob'
import MarketTiles from './surfaces/market/MarketTiles'
import Onboarding from './surfaces/onboarding/Onboarding'
import EmployerHome from './surfaces/employer/EmployerHome'

export default function App() {
  return (
    <Routes>
      {/* PUBLIC candidate-facing surfaces — no staff chrome, no login. */}
      <Route path="jobs/:code" element={<JobCard />} />
      <Route path="basket/:ref" element={<Basket />} />
      <Route path="markets" element={<MarketTiles />} />
      <Route path="claim/:token" element={<ClaimJob />} />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="connect" element={<Onboarding />} />
        <Route path="ops" element={<Staff><Dashboards /></Staff>} />
        <Route path="ops/requisitions" element={<Staff><Requisitions /></Staff>} />
        <Route path="ops/packets" element={<Staff><Packets /></Staff>} />
        <Route path="ops/demand" element={<Staff><DemandRadar /></Staff>} />
        <Route path="ops/amn" element={<Staff><AmnRadar /></Staff>} />
        <Route path="ops/longtail" element={<Staff><LongTailRadar /></Staff>} />
        <Route path="ops/queue" element={<Staff><ApplicationQueue /></Staff>} />
        <Route path="ops/programs" element={<Staff><ProgramWorkspace /></Staff>} />
        <Route path="market" element={<Staff><Marketplace /></Staff>} />
        <Route path="employer" element={<EmployerView><EmployerHome /></EmployerView>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function Home() {
  const s = useSession()
  if (s.staff) return <Navigate to="/ops" replace />
  if (s.role === 'employer') return <Navigate to="/employer" replace />
  return <Navigate to="/connect" replace />
}

function Staff({ children }: { children: ReactNode }) {
  const s = useSession()
  return s.staff ? <>{children}</> : <SignIn note="The Operations console requires a FlorenceRN staff role (super_admin / ops)." />
}
function EmployerView({ children }: { children: ReactNode }) {
  const s = useSession()
  return s.role === 'employer' || s.staff ? <>{children}</> : <SignIn note="Sign in with your employer account to view your pipeline." />
}

function Layout() {
  const s = useSession()
  const authed = s.staff || s.role === 'employer'
  const tab = (to: string, label: string, icon: keyof typeof Icon, end = false) => {
    const IconC = Icon[icon]
    return (
      <NavLink to={to} end={end} className={({ isActive }) => cx('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition', isActive ? 'bg-florence-50 text-florence-700' : 'text-slate-600 hover:bg-slate-100')}>
        <IconC className="h-4 w-4" />{label}
      </NavLink>
    )
  }
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5">
          <div className="flex shrink-0 items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-[9px] bg-florence-600 text-white shadow-sm"><span className="font-display text-lg font-bold leading-none">F</span></div>
            <div className="leading-tight">
              <div className="whitespace-nowrap"><span className="font-display text-[15px] font-bold tracking-[-0.01em] text-ink">FlorenceRN</span><span className="ml-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-florence-700">ATS Connect</span></div>
              <div className="hidden whitespace-nowrap text-[11px] text-slate-400 xl:block">Jobs in · Florence nurses out · status both ways</div>
            </div>
          </div>
          <nav className="ml-2 flex shrink-0 items-center gap-1">
            {s.staff && tab('/ops', 'Operations', 'chart', true)}
            {s.staff && tab('/ops/requisitions', 'Requisitions', 'briefcase')}
            {s.staff && tab('/ops/packets', 'Packets & QA', 'inbox')}
            {s.staff && tab('/ops/demand', 'Demand Radar', 'sparkle')}
            {s.staff && tab('/ops/amn', 'AMN Radar', 'chart')}
            {s.staff && tab('/ops/longtail', 'Long-Tail', 'sparkle')}
            {s.staff && tab('/ops/queue', 'App Queue', 'inbox')}
            {s.staff && tab('/ops/programs', 'Programs', 'briefcase')}
            {s.staff && tab('/market', 'Marketplace', 'users')}
            {s.role === 'employer' && tab('/employer', 'Your pipeline', 'briefcase', true)}
            {tab('/connect', 'Connect your ATS', 'link')}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {authed
              ? <button onClick={staffLogout} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"><Icon.lock className="h-3 w-3" />Sign out</button>
              : <Button variant="soft" onClick={() => staffLogin()}>Sign in</Button>}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6"><Outlet /></main>
      <footer className="mx-auto max-w-7xl px-4 pb-10 pt-2 text-[11px] leading-relaxed text-slate-400">
        ATS Connect shares an employer-ready packet only with the candidate's consent, and withholds national-origin / visa data pre-offer by design. Demo data; mock connectors unless live credentials are set.
      </footer>
    </div>
  )
}

function SignIn({ note }: { note: string }) {
  return (
    <div className="mx-auto max-w-md py-16">
      <Card>
        <CardHeader title="Sign in" subtitle={note} />
        <div className="space-y-3 px-5 py-4">
          <Button onClick={() => staffLogin()}>Sign in with FlorenceRN</Button>
          <p className="text-[11px] text-slate-400">Single sign-on via FlorenceRN Core. Employer logins are provisioned in the Core admin console (an <code className="font-mono">employer</code> role on the org whose id is your ATS employer id).</p>
        </div>
      </Card>
    </div>
  )
}
