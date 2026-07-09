import {
  AlertBanner,
  AppShell,
  Badge,
  Card,
  DataTable,
  DocumentCard,
  EmptyState,
  LegalDisclaimer,
  MetricCard,
  ProfileCard,
  Sidebar,
  StageStepper,
  StatusPill,
  Timeline,
  TopNav,
  buttonClassName,
} from "@florence/design-system";
import { useEffect, useMemo, useState, type DependencyList, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  academyApiUrl,
  applyUrl,
  createEconomistProposal,
  createEconomistQuote,
  demoNurseId,
  liveUrl,
  loginUrl,
  logoutUrl,
  readEmployerDemand,
  readEmployerLedger,
  readEmployerRequisitions,
  readLedger,
  readNashpDatasetMetadata,
  readNashpTrend,
  readNashpTrendEntities,
  readPassport,
  readPathwayCandidates,
  type EmployerDemandSummary,
  type EmployerLedgerSummary,
  type EmployerRequisitionSummary,
  type EconomistEnvelope,
  type EconomistProposal,
  type EconomistQuote,
  type EconomistQuoteRequest,
  type NashpDatasetMetadata,
  type NashpMetricDefinition,
  type NashpTrend,
  type NashpTrendEntity,
  type NashpTrendGroupBy,
  type NashpTrendPoint,
  readSession,
  type LedgerResponse,
  type PassportResponse,
  type PathwayCandidateSummary,
  type SessionState,
} from "./coreClient";

type RoleKey =
  | "student"
  | "navigator"
  | "faculty"
  | "grantReviewer"
  | "employerPartner"
  | "universityPartner"
  | "lenderPartner"
  | "admin";

interface RoleDefinition {
  label: string;
  description: string;
}

interface AppRoute {
  path: string;
  label: string;
  title: string;
  subtitle: string;
  roles: RoleKey[];
  badge?: string;
  element: ReactNode;
}

type LoadState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message: string };

const roles: Record<RoleKey, RoleDefinition> = {
  student: {
    label: "Student / nurse",
    description: "Academy, pathway, profile, documents, grants, and jobs.",
  },
  navigator: {
    label: "Florence navigator",
    description: "Operational view across readiness, pathway, jobs, and ledger.",
  },
  faculty: {
    label: "Faculty",
    description: "Academy readiness and teaching workflows.",
  },
  grantReviewer: {
    label: "Grant reviewer",
    description: "Grant eligibility, awards, and document readiness.",
  },
  employerPartner: {
    label: "Employer partner",
    description: "Employer-safe jobs, packets, and partner pipeline.",
  },
  universityPartner: {
    label: "University partner",
    description: "Aggregate academic progress and partner programs.",
  },
  lenderPartner: {
    label: "Lender partner",
    description: "Consented financing and pathway views.",
  },
  admin: {
    label: "Admin",
    description: "Platform configuration, gates, audit, and partner scope.",
  },
};

const allRoles = Object.keys(roles) as RoleKey[];

const kpiRows = [
  { label: "Readiness", value: "82%", hint: "candidate-safe NCLEX readiness band", tone: "primary" as const },
  { label: "Pathway", value: "4/6", hint: "open human-reviewed gates", tone: "accent" as const },
  { label: "Packets", value: "12", hint: "consent-gated partner packets", tone: "success" as const },
  { label: "Reviews", value: "3", hint: "items waiting on Florence review", tone: "warning" as const },
];

const academyModules = [
  { title: "Clinical tutor", status: "Active", body: "Explain, quiz, simulate, remediate, and update readiness from one Academy surface." },
  { title: "Practice engine", status: "Active", body: "NCLEX-style practice stays linked to the Nurse Passport readiness band." },
  { title: "Live cohort", status: "Scheduled", body: `Live classroom connects through ${liveUrl} with the same Florence session.` },
  { title: "Resource library", status: "Curated", body: `Approved library reads from the Academy API at ${academyApiUrl}.` },
];

const academySections = [
  { n: 1, title: "Prioritization and delegation", state: "Complete", tone: "success" as const },
  { n: 2, title: "Clinical deterioration", state: "Studying", tone: "primary" as const },
  { n: 3, title: "Pharmacology safety", state: "Queued", tone: "warning" as const },
  { n: 4, title: "Maternal-newborn review", state: "Locked", tone: "neutral" as const },
  { n: 5, title: "Pediatric respiratory cases", state: "Locked", tone: "neutral" as const },
  { n: 6, title: "Leadership and care coordination", state: "Locked", tone: "neutral" as const },
];

const practiceModes = [
  { mode: "Tutor practice", count: "10 items", detail: "Immediate rationale after each answer." },
  { mode: "Nightly 150", count: "150 items", detail: "Long adaptive set for stamina and blueprint coverage." },
  { mode: "Adaptive exam", count: "85-150 items", detail: "Variable-length exam-style confidence rule." },
  { mode: "Unfolding cases", count: "NGN", detail: "Six-step clinical judgment cases." },
];

const tutorModes = [
  { mode: "Review", purpose: "Analyze missed items and rationales." },
  { mode: "Teach", purpose: "Explain from approved Florence lessons." },
  { mode: "Simulate", purpose: "Run a short patient scenario." },
  { mode: "Remediate", purpose: "Assign targeted review from readiness gaps." },
  { mode: "Listen", purpose: "Play audio coaching and explain-back practice." },
];

const libraryItems = [
  { title: "Clinical judgment checklist", type: "PDF", status: "Published" },
  { title: "Deterioration cues handout", type: "Handout", status: "Published" },
  { title: "SBAR practice pack", type: "Scenario", status: "Review" },
  { title: "Medication safety deck", type: "Slides", status: "Published" },
];

const pathwayTasks = [
  { task: "Identity profile", owner: "Navigator", status: "Ready", tone: "success" as const },
  { task: "Credential documents", owner: "Student", status: "Needs review", tone: "warning" as const },
  { task: "NCLEX readiness gate", owner: "Faculty", status: "In progress", tone: "primary" as const },
  { task: "Licensure packet", owner: "Navigator", status: "Blocked", tone: "danger" as const },
];

const grantRows = [
  { program: "Bridge scholarship", candidate: "Synthetic candidate A", state: "Review", amount: "$2,500" },
  { program: "Exam support", candidate: "Synthetic candidate B", state: "Approved", amount: "$475" },
  { program: "Credential evaluation", candidate: "Synthetic candidate C", state: "Needs document", amount: "$650" },
];

const jobRows = [
  { role: "Med-surg RN", market: "Texas", status: "Open", partner: "Employer partner" },
  { role: "ICU RN", market: "Florida", status: "Interviewing", partner: "Employer partner" },
  { role: "Long-term care RN", market: "New York", status: "Packet QA", partner: "University channel" },
];

const partnerRows = [
  { partner: "Employer", scope: "Employer-safe packets", gate: "Consent + application gate" },
  { partner: "University", scope: "Aggregate readiness", gate: "Anonymized by default" },
  { partner: "Lender", scope: "Consented financing", gate: "Purpose-specific consent" },
  { partner: "Faculty", scope: "Readiness and remediation", gate: "Academic-only view" },
];

const employerFallbackRows: EmployerRequisitionSummary[] = [
  { id: "req-synthetic-1", title: "Med-surg RN", state: "TX", specialty: "Med-surg", status: "open", openings: 4, atsProvider: "manual" },
  { id: "req-synthetic-2", title: "ICU RN", state: "FL", specialty: "ICU", status: "open", openings: 2, atsProvider: "workday" },
  { id: "req-synthetic-3", title: "Long-term care RN", state: "NY", specialty: "Post-acute", status: "packet_qa", openings: 3, atsProvider: "icims" },
];

function getStoredRole(): RoleKey {
  try {
    const stored = window.localStorage.getItem("florence-os-role");
    return allRoles.includes(stored as RoleKey) ? (stored as RoleKey) : "student";
  } catch {
    return "student";
  }
}

function storeRole(role: RoleKey): void {
  try {
    window.localStorage.setItem("florence-os-role", role);
  } catch {
    /* local storage is optional */
  }
}

function useCoreResource<T>(loader: () => Promise<T>, deps: DependencyList): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    loader()
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Core is not available";
          setState({ status: "error", message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, deps);

  return state;
}

function useSession(): LoadState<SessionState> {
  return useCoreResource(readSession, []);
}

function useActiveNurseId(): string {
  const session = useSession();
  return session.status === "ready" && session.data.cand ? session.data.cand : demoNurseId;
}

function formatDate(value?: string): string {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function normalizeLabel(value?: string): string {
  if (!value) return "Not recorded";
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatPercent(value?: number): string {
  if (typeof value !== "number") return "Not recorded";
  return `${Math.round(value * 100)}%`;
}

function formatCurrency(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNashpMetricValue(value: number | null | undefined, metric?: NashpMetricDefinition): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  if (metric?.format === "percent") return `${(value * 100).toFixed(1)}%`;
  if (metric?.format === "count") return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
  return formatCurrency(value);
}

function currentSubpage(pathname: string, basePath: string, allowed: string[], fallback = "overview"): string {
  const suffix = pathname === basePath ? "" : pathname.replace(`${basePath}/`, "");
  const first = suffix.split("/").filter(Boolean)[0] ?? fallback;
  return allowed.includes(first) ? first : fallback;
}

function isActivePath(pathname: string, routePath: string): boolean {
  return pathname === routePath || pathname.startsWith(`${routePath}/`);
}

function SurfaceTabs({
  basePath,
  tabs,
}: {
  basePath: string;
  tabs: { key: string; label: string }[];
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const active = currentSubpage(location.pathname, basePath, tabs.map((tab) => tab.key));

  return (
    <nav className="fos-tabs" aria-label="Section">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={tab.key === active ? "fos-tabs__item fos-tabs__item--active" : "fos-tabs__item"}
          onClick={() => navigate(tab.key === "overview" ? basePath : `${basePath}/${tab.key}`)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

function surfaceRoutes(): AppRoute[] {
  return [
    {
      path: "/academy",
      label: "Academy",
      title: "Academy",
      subtitle: "Learning, simulation, live cohort, and readiness.",
      roles: ["student", "navigator", "faculty", "universityPartner", "admin"],
      badge: "Learn",
      element: <AcademyPage />,
    },
    {
      path: "/apply",
      label: "Apply",
      title: "Apply",
      subtitle: "One guided application path with fail-closed gates before external submission.",
      roles: ["student", "navigator", "admin"],
      badge: "CTA",
      element: <ApplyPage />,
    },
    {
      path: "/pathway",
      label: "Pathway",
      title: "Pathway",
      subtitle: "Visa, NCLEX, licensure, credential, and QA tasks in one workflow.",
      roles: ["student", "navigator", "faculty", "universityPartner", "lenderPartner", "admin"],
      element: <PathwayPage />,
    },
    {
      path: "/profile",
      label: "Profile",
      title: "Nurse Passport",
      subtitle: "Core-backed profile, readiness, credentials, and disclosure controls.",
      roles: allRoles,
      element: <ProfilePage />,
    },
    {
      path: "/documents",
      label: "Documents",
      title: "Document Vault",
      subtitle: "Restricted document state read from Core with signed-url access kept behind authorization.",
      roles: ["student", "navigator", "grantReviewer", "lenderPartner", "admin"],
      element: <DocumentsPage />,
    },
    {
      path: "/grants",
      label: "Grants",
      title: "Grants",
      subtitle: "Grant review and award tracking in the same candidate journey.",
      roles: ["student", "navigator", "grantReviewer", "lenderPartner", "admin"],
      element: <GrantsPage />,
    },
    {
      path: "/jobs",
      label: "Jobs",
      title: "Jobs",
      subtitle: "Candidate-safe opportunity discovery and Florence-reviewed application readiness.",
      roles: ["student", "navigator", "employerPartner", "universityPartner", "admin"],
      element: <JobsPage />,
    },
    {
      path: "/employer-connect",
      label: "Employer Connect",
      title: "Employer Connect",
      subtitle: "Partner jobs, packet QA, matching, starts, and retention.",
      roles: ["navigator", "employerPartner", "universityPartner", "admin"],
      badge: "Partner",
      element: <EmployerConnectPage />,
    },
    {
      path: "/economist",
      label: "Economist",
      title: "Workforce Economist",
      subtitle: "Facility pricing, customer effective cost, proposals, and Core quote events.",
      roles: ["navigator", "employerPartner", "admin"],
      badge: "Quote",
      element: <EconomistPage />,
    },
    {
      path: "/partners",
      label: "Partners",
      title: "Partners",
      subtitle: "Tenant-scoped employer, university, lender, faculty, and grant partner views.",
      roles: ["navigator", "faculty", "grantReviewer", "employerPartner", "universityPartner", "lenderPartner", "admin"],
      element: <PartnersPage />,
    },
    {
      path: "/ops",
      label: "Ops",
      title: "Production Ledger",
      subtitle: "Core-backed event timeline, current stage, and operational gates.",
      roles: ["navigator", "admin"],
      element: <OpsPage />,
    },
    {
      path: "/admin",
      label: "Admin",
      title: "Admin",
      subtitle: "Platform configuration, role scope, security gates, and governance.",
      roles: ["admin"],
      element: <AdminPage />,
    },
  ];
}

function App() {
  const [role, setRole] = useState<RoleKey>(getStoredRole);
  const routes = useMemo(surfaceRoutes, []);
  const session = useSession();

  function updateRole(nextRole: RoleKey) {
    setRole(nextRole);
    storeRole(nextRole);
  }

  return (
    <AppFrame role={role} routes={routes} session={session} onRoleChange={updateRole}>
      <Routes>
        <Route path="/" element={<Navigate to="/academy" replace />} />
        {routes.map((route) => (
          <Route key={route.path} path={`${route.path}/*`} element={route.element} />
        ))}
        <Route path="*" element={<Navigate to="/academy" replace />} />
      </Routes>
    </AppFrame>
  );
}

function AppFrame({
  role,
  routes,
  session,
  onRoleChange,
  children,
}: {
  role: RoleKey;
  routes: AppRoute[];
  session: LoadState<SessionState>;
  onRoleChange: (role: RoleKey) => void;
  children: ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const allowedRoutes = routes.filter((route) => route.roles.includes(role));
  const currentRoute = routes.find((route) => isActivePath(location.pathname, route.path)) ?? routes[0];
  const sessionReady = session.status === "ready" && session.data.authenticated;
  const sessionLabel = sessionReady
    ? session.data.user?.name ?? session.data.user?.email ?? "Signed in"
    : "Sign in";

  return (
    <AppShell
      className="fos-shell"
      sidebar={
        <Sidebar
          title="Florence OS"
          subtitle={roles[role].label}
          items={allowedRoutes.map((route) => ({
            label: route.label,
            active: isActivePath(location.pathname, route.path),
            onClick: () => navigate(route.path),
            badge: route.badge ? <Badge tone="neutral">{route.badge}</Badge> : undefined,
          }))}
        />
      }
      topNav={
        <TopNav
          title={currentRoute.title}
          subtitle={currentRoute.subtitle}
          actions={
            <>
              <label className="fos-role-select">
                <span>Role</span>
                <select value={role} onChange={(event) => onRoleChange(event.target.value as RoleKey)}>
                  {allRoles.map((key) => (
                    <option key={key} value={key}>
                      {roles[key].label}
                    </option>
                  ))}
                </select>
              </label>
              <a className={buttonClassName({ variant: "primary", size: "sm" })} href={applyUrl}>
                Apply
              </a>
              <a
                className={buttonClassName({ variant: sessionReady ? "ghost" : "secondary", size: "sm" })}
                href={sessionReady ? logoutUrl() : loginUrl()}
              >
                {sessionLabel}
              </a>
            </>
          }
        />
      }
      footer={
        <footer className="fos-footer">
          <LegalDisclaimer compact>
            Florence OS keeps external sharing consent-gated, tenant-scoped, and audit-backed. AI output is assistive and
            high-stakes decisions require human review.
          </LegalDisclaimer>
        </footer>
      }
    >
      <div className="fos-layout">
        <PersistentApplyCta />
        {children}
      </div>
    </AppShell>
  );
}

function PersistentApplyCta() {
  return (
    <AlertBanner
      tone="info"
      title="Student application remains available across Florence OS."
      action={
        <a className={buttonClassName({ variant: "primary", size: "sm" })} href={applyUrl}>
          Continue application
        </a>
      }
    >
      The canonical application entry point is https://www.florenceedu.com/apply.
    </AlertBanner>
  );
}

function PageHeader({
  eyebrow,
  title,
  body,
  badge,
}: {
  eyebrow: string;
  title: string;
  body: string;
  badge?: string;
}) {
  return (
    <section className="fos-page-header">
      <div>
        <div className="fos-eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{body}</p>
      </div>
      {badge && <StatusPill tone="primary">{badge}</StatusPill>}
    </section>
  );
}

function KpiStrip() {
  return (
    <section className="fos-metric-grid" aria-label="Florence OS metrics">
      {kpiRows.map((metric) => (
        <MetricCard key={metric.label} label={metric.label} value={metric.value} hint={metric.hint} tone={metric.tone} />
      ))}
    </section>
  );
}

function AcademyPage() {
  const location = useLocation();
  const section = currentSubpage(location.pathname, "/academy", ["overview", "curriculum", "practice", "tutor", "library"]);

  return (
    <>
      <PageHeader
        eyebrow="Academy"
        title="Today’s learning plan."
        body="Study plan, practice, tutor remediation, live cohort, and readiness updates stay tied to the same Nurse Passport."
        badge="Integrated"
      />
      <SurfaceTabs
        basePath="/academy"
        tabs={[
          { key: "overview", label: "Overview" },
          { key: "curriculum", label: "Curriculum" },
          { key: "practice", label: "Practice" },
          { key: "tutor", label: "Tutor" },
          { key: "library", label: "Library" },
        ]}
      />
      {section === "overview" && <AcademyOverview />}
      {section === "curriculum" && <AcademyCurriculum />}
      {section === "practice" && <AcademyPractice />}
      {section === "tutor" && <AcademyTutor />}
      {section === "library" && <AcademyLibrary />}
    </>
  );
}

function AcademyOverview() {
  return (
    <>
      <KpiStrip />
      <section className="fos-card-grid">
        {academyModules.map((module) => (
          <Card
            key={module.title}
            title={module.title}
            subtitle={module.body}
            action={<StatusPill tone={module.status === "Scheduled" ? "warning" : "success"}>{module.status}</StatusPill>}
          >
            <div className="fos-card-actions">
              <StatusPill tone="neutral">Florence OS</StatusPill>
            </div>
          </Card>
        ))}
      </section>
      <Card title="Academy readiness spine" subtitle="Approved readiness events update the Core Nurse Passport.">
        <StageStepper
          steps={[
            { label: "Study plan", description: "Assigned from current readiness band.", state: "complete" },
            { label: "Practice", description: "Question performance updates readiness.", state: "active" },
            { label: "Tutor", description: "Remediation recommendations stay reviewable.", state: "pending" },
            { label: "Passport update", description: "Core receives the approved readiness event.", state: "pending" },
          ]}
        />
      </Card>
    </>
  );
}

function AcademyCurriculum() {
  return (
    <Card title="Curriculum navigator" subtitle="Cohort progress appears in the same Florence route as readiness and application status.">
      <DataTable
        rows={academySections}
        getRowKey={(row) => row.n}
        columns={[
          { id: "section", header: "Section", render: (row) => `${row.n}. ${row.title}` },
          { id: "state", header: "State", render: (row) => <StatusPill tone={row.tone}>{row.state}</StatusPill> },
          {
            id: "action",
            header: "Action",
            render: (row) => (
              <a className={buttonClassName({ variant: row.state === "Locked" ? "ghost" : "secondary", size: "sm" })} href="/academy/curriculum">
                {row.state === "Locked" ? "Locked" : "Open"}
              </a>
            ),
            align: "right",
          },
        ]}
      />
    </Card>
  );
}

function AcademyPractice() {
  return (
    <section className="fos-two-column">
      <Card title="Adaptive practice" subtitle="Exam-style modes stay tied to the learner readiness record.">
        <DataTable
          rows={practiceModes}
          getRowKey={(row) => row.mode}
          columns={[
            { id: "mode", header: "Mode", render: (row) => row.mode },
            { id: "count", header: "Count", render: (row) => <Badge tone="accent">{row.count}</Badge> },
            { id: "detail", header: "Use", render: (row) => row.detail },
          ]}
        />
      </Card>
      <Card title="Practice gate" subtitle="Readiness events are reviewable before they affect high-stakes workflow gates.">
        <StageStepper
          steps={[
            { label: "Choose mode", description: "Tutor, nightly, timed, exam, or case practice.", state: "complete" },
            { label: "Run session", description: "Adaptive items and rationales remain learner-facing.", state: "active" },
            { label: "Review result", description: "Faculty or navigator can review readiness movement.", state: "pending" },
            { label: "Write event", description: "Approved readiness event updates Core.", state: "pending" },
          ]}
        />
      </Card>
    </section>
  );
}

function AcademyTutor() {
  return (
    <section className="fos-two-column">
      <Card title="Clinical tutor" subtitle="Tutor actions remain assistive and auditable.">
        <DataTable
          rows={tutorModes}
          getRowKey={(row) => row.mode}
          columns={[
            { id: "mode", header: "Mode", render: (row) => row.mode },
            { id: "purpose", header: "Purpose", render: (row) => row.purpose },
          ]}
        />
      </Card>
      <Card title="Current round" subtitle="A structured daily round for clinical judgment practice.">
        <Timeline
          items={[
            { title: "Review missed item", body: "Explain the tempting cue and the safer action." },
            { title: "Similar question", body: "Practice the same judgment step under a new scenario." },
            { title: "Patient simulation", body: "Run a short SBAR escalation." },
            { title: "Remediation", body: "Assign approved review content from the weak area." },
          ]}
        />
      </Card>
    </section>
  );
}

function AcademyLibrary() {
  return (
    <section className="fos-document-list">
      {libraryItems.map((item) => (
        <DocumentCard
          key={item.title}
          title={item.title}
          description={`${item.type} resource in the Academy library.`}
          status={<StatusPill tone={item.status === "Published" ? "success" : "warning"}>{item.status}</StatusPill>}
          meta="Library access is read-only for students"
        />
      ))}
    </section>
  );
}

function ApplyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Apply"
        title="One guided Florence application."
        body="Application progress must pass authorization, licensure, consent, packet QA, and workflow gates before any external submission."
        badge="Fail closed"
      />
      <section className="fos-two-column">
        <Card
          title="Application gates"
          subtitle="Future submission changes must remain Core-backed and human-reviewed."
          action={
            <a className={buttonClassName({ variant: "primary", size: "sm" })} href={applyUrl}>
              Start at www.florenceedu.com/apply
            </a>
          }
        >
          <StageStepper
            steps={[
              { label: "Identity", description: "Core session and candidate record.", state: "complete" },
              { label: "Documents", description: "Document Vault verification.", state: "active" },
              { label: "License", description: "State-specific licensure readiness.", state: "pending" },
              { label: "Consent", description: "Purpose-specific external sharing.", state: "pending" },
              { label: "Human review", description: "Navigator approval before submission.", state: "blocked" },
            ]}
          />
        </Card>
        <Card title="Apply from anywhere" subtitle="The canonical public entry point remains available throughout the candidate journey.">
          <p className="fos-body-copy">
            Students and nurses can continue an application while reviewing Academy readiness, pathway tasks, grants,
            documents, or jobs.
          </p>
        </Card>
      </section>
    </>
  );
}

function PathwayPage() {
  const location = useLocation();
  const section = currentSubpage(location.pathname, "/pathway", ["overview", "candidate", "qa", "documents"]);

  return (
    <>
      <PageHeader
        eyebrow="Pathway"
        title="Pathway review queue."
        body="Visa, credential, NCLEX, licensure, and QA work stay on one reviewed pathway timeline."
        badge="Human review"
      />
      <SurfaceTabs
        basePath="/pathway"
        tabs={[
          { key: "overview", label: "Overview" },
          { key: "candidate", label: "Candidate" },
          { key: "qa", label: "QA" },
          { key: "documents", label: "Documents" },
        ]}
      />
      {section === "overview" && <PathwayOverview />}
      {section === "candidate" && <PathwayCandidate />}
      {section === "qa" && <PathwayQa />}
      {section === "documents" && <PathwayDocuments />}
    </>
  );
}

function PathwayOverview() {
  const candidates = useCoreResource(readPathwayCandidates, []);

  return (
    <section className="fos-two-column">
      <Card title="Current pathway" subtitle="High-stakes work remains reviewed and auditable.">
        <StageStepper
          steps={[
            { label: "Profile", description: "Core identity and Nurse Passport created.", state: "complete" },
            { label: "Documents", description: "Restricted documents tracked in Core.", state: "active" },
            { label: "NCLEX", description: "Readiness signal linked from Academy.", state: "pending" },
            { label: "Licensure", description: "State packet QA.", state: "pending" },
            { label: "Work authorization", description: "Human-reviewed pathway gate.", state: "blocked" },
          ]}
        />
      </Card>
      <PathwayLiveSummary state={candidates} />
    </section>
  );
}

function PathwayLiveSummary({ state }: { state: LoadState<PathwayCandidateSummary[]> }) {
  if (state.status === "loading") {
    return <EmptyState title="Loading Pathway">Reading current Pathway queue from the service.</EmptyState>;
  }
  if (state.status === "error") {
    return (
      <Card title="Pathway service" subtitle="The shell route is ready; start the Pathway service to populate live queue data.">
        <AlertBanner tone="warning" title="Pathway API unavailable">{state.message}</AlertBanner>
        <PathwayTaskTable />
      </Card>
    );
  }

  const blocked = state.data.reduce((sum, row) => sum + row.blockedCount, 0);
  const escalations = state.data.reduce((sum, row) => sum + row.escalations, 0);
  const workflows = state.data.reduce((sum, row) => sum + row.workflowCount, 0);

  return (
    <Card title="Live Pathway queue" subtitle="Counts are read from the Pathway service through the unified app route.">
      <div className="fos-passport-grid">
        <MetricCard label="Candidates" value={state.data.length} tone="primary" />
        <MetricCard label="Workflows" value={workflows} tone="accent" />
        <MetricCard label="Blocked" value={blocked} tone={blocked ? "danger" : "success"} />
        <MetricCard label="Escalations" value={escalations} tone={escalations ? "warning" : "success"} />
      </div>
    </Card>
  );
}

function PathwayTaskTable() {
  return (
    <DataTable
      rows={pathwayTasks}
      getRowKey={(row) => row.task}
      columns={[
        { id: "task", header: "Task", render: (row) => row.task },
        { id: "owner", header: "Owner", render: (row) => row.owner },
        { id: "status", header: "Status", render: (row) => <StatusPill tone={row.tone}>{row.status}</StatusPill> },
      ]}
    />
  );
}

function PathwayCandidate() {
  const candidates = useCoreResource(readPathwayCandidates, []);
  const rows = candidates.status === "ready" ? candidates.data : [];

  return (
    <Card title="Candidate pathway records" subtitle="Identifiers and counts only; sensitive form details stay in the reviewed workflow.">
      <DataTable
        rows={rows}
        empty={candidates.status === "error" ? `Pathway API unavailable: ${candidates.message}` : "No candidates available."}
        getRowKey={(row) => row.id}
        columns={[
          { id: "record", header: "Record", render: (row) => row.id },
          { id: "visa", header: "Visa target", render: (row) => row.visaTarget ?? "Not recorded" },
          { id: "nclex", header: "NCLEX state", render: (row) => row.nclexState ?? "Not recorded" },
          { id: "workflows", header: "Workflows", render: (row) => row.workflowCount, align: "right" },
          { id: "blocked", header: "Blocked", render: (row) => <StatusPill tone={row.blockedCount ? "danger" : "success"}>{row.blockedCount}</StatusPill>, align: "right" },
        ]}
      />
    </Card>
  );
}

function PathwayQa() {
  return (
    <section className="fos-two-column">
      <Card title="QA workbench" subtitle="Human review remains the gate before high-stakes actions.">
        <PathwayTaskTable />
      </Card>
      <Card title="Review controls" subtitle="AI may draft and check, but final pathway decisions stay human-reviewed.">
        <Timeline
          items={[
            { title: "Draft prepared", body: "Automation prepares a checklist or form draft." },
            { title: "Candidate attests", body: "Candidate reviews and signs their own required answers." },
            { title: "Navigator approves", body: "Florence reviewer checks source, completeness, and safety." },
            { title: "Submission gate", body: "Workflow fails closed if any required gate is missing." },
          ]}
        />
      </Card>
    </section>
  );
}

function PathwayDocuments() {
  return (
    <section className="fos-document-list">
      {[
        ["Passport identity page", "Restricted identity document"],
        ["Transcript", "Education record"],
        ["Credential evaluation", "Pathway requirement"],
        ["NCLEX authorization", "Licensure requirement"],
      ].map(([title, description], index) => (
        <DocumentCard
          key={title}
          title={title}
          description={description}
          status={<StatusPill tone={index < 2 ? "success" : "warning"}>{index < 2 ? "Verified" : "Review"}</StatusPill>}
          meta="Document Vault access required"
        />
      ))}
    </section>
  );
}

function ProfilePage() {
  const nurseId = useActiveNurseId();
  const passport = useCoreResource(() => readPassport(nurseId, "candidate"), [nurseId]);
  const data = passport.status === "ready" ? passport.data.passport : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Profile"
        title="Nurse Passport is the profile spine."
        body="Profile status, readiness, credentials, and document flags are read from Core through the permissioned passport view."
        badge="Core-backed"
      />
      <section className="fos-two-column">
        <ProfileCard
          name={data?.name ?? "Florence nurse"}
          title="Florence Education candidate"
          meta={`Passport ${data?.nurseId ?? nurseId}`}
          actions={<StatusPill tone={passport.status === "ready" ? "success" : "warning"}>{passport.status}</StatusPill>}
        />
        <PassportPanel state={passport} />
      </section>
    </>
  );
}

function PassportPanel({ state }: { state: LoadState<PassportResponse> }) {
  if (state.status === "loading") {
    return <EmptyState title="Loading Nurse Passport">Reading the permissioned Core profile view.</EmptyState>;
  }
  if (state.status === "error") {
    return (
      <EmptyState
        title="Core sign-in required"
        action={
          <a className={buttonClassName({ variant: "secondary", size: "sm" })} href={loginUrl()}>
            Sign in with Florence
          </a>
        }
      >
        {state.message}
      </EmptyState>
    );
  }

  const passport = state.data.passport;
  return (
    <Card title="Core Nurse Passport" subtitle={`View: ${state.data.view ?? "candidate"}`}>
      <div className="fos-passport-grid">
        <MetricCard label="Funnel" value={normalizeLabel(passport?.funnelStage)} hint={`${passport?.eventCount ?? 0} Core events`} tone="primary" />
        <MetricCard label="Readiness" value={normalizeLabel(passport?.readiness?.band)} hint={formatPercent(passport?.readiness?.passProbability)} tone="accent" />
        <MetricCard label="NCLEX" value={normalizeLabel(passport?.nclex?.status)} hint={formatDate(passport?.nclex?.updatedAt)} tone="neutral" />
        <MetricCard label="License" value={normalizeLabel(passport?.licensure?.status)} hint={passport?.licensure?.state ?? "State pending"} tone="success" />
      </div>
      {state.data.withheld && state.data.withheld.length > 0 && (
        <AlertBanner tone="warning" title="Minimum-necessary view applied">
          {state.data.withheld.length} fields were withheld for this audience.
        </AlertBanner>
      )}
    </Card>
  );
}

function DocumentsPage() {
  const nurseId = useActiveNurseId();
  const passport = useCoreResource(() => readPassport(nurseId, "candidate"), [nurseId]);

  return (
    <>
      <PageHeader
        eyebrow="Documents"
        title="Document Vault."
        body="Core document state appears here while restricted document viewing stays behind signed-url authorization."
        badge="Restricted"
      />
      <DocumentVaultPanel state={passport} />
    </>
  );
}

function DocumentVaultPanel({ state }: { state: LoadState<PassportResponse> }) {
  if (state.status === "loading") {
    return <EmptyState title="Loading Document Vault">Reading document flags from Core.</EmptyState>;
  }
  if (state.status === "error") {
    return (
      <EmptyState
        title="Core sign-in required"
        action={
          <a className={buttonClassName({ variant: "secondary", size: "sm" })} href={loginUrl()}>
            Sign in with Florence
          </a>
        }
      >
        {state.message}
      </EmptyState>
    );
  }

  const documents = Object.entries(state.data.passport?.documents ?? {});
  if (documents.length === 0) {
    return (
      <EmptyState title="No verified documents yet">
        Upload and signed-url workflows stay in Core. This shell shows only the current permissioned document state.
      </EmptyState>
    );
  }

  return (
    <section className="fos-document-list">
      {documents.map(([documentType, available]) => (
        <DocumentCard
          key={documentType}
          title={normalizeLabel(documentType)}
          description="Core Document Vault state. Contents are not exposed in the shell without a short-lived signed URL."
          status={<StatusPill tone={available ? "success" : "warning"}>{available ? "Verified" : "Pending"}</StatusPill>}
          meta="Audit required before access"
        />
      ))}
    </section>
  );
}

function GrantsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Grants"
        title="Grant review belongs in the Florence journey."
        body="Grant eligibility, awards, and required documents use the same candidate profile and review shell."
        badge="Role scoped"
      />
      <Card
        title="Grant queue"
        subtitle="Current grant eligibility, award, and document review states. Application fee coverage is tracked after the student applies."
        action={
          <a className={buttonClassName({ variant: "primary", size: "sm" })} href={applyUrl}>
            Apply
          </a>
        }
      >
        <DataTable
          rows={grantRows}
          getRowKey={(row) => `${row.program}:${row.candidate}`}
          columns={[
            { id: "program", header: "Program", render: (row) => row.program },
            { id: "candidate", header: "Candidate", render: (row) => row.candidate },
            { id: "state", header: "State", render: (row) => <StatusPill tone={row.state === "Approved" ? "success" : "warning"}>{row.state}</StatusPill> },
            { id: "amount", header: "Amount", render: (row) => row.amount, align: "right" },
          ]}
        />
      </Card>
    </>
  );
}

function JobsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Jobs"
        title="Jobs stay connected to application readiness."
        body="Candidates see opportunity status alongside readiness and pathway gates; partner packet release remains consent-gated."
        badge="Candidate safe"
      />
      <Card
        title="Opportunity queue"
        subtitle="Employer and university channels appear in one Florence OS jobs surface."
        action={
          <a className={buttonClassName({ variant: "primary", size: "sm" })} href={applyUrl}>
            Apply
          </a>
        }
      >
        <DataTable
          rows={jobRows}
          getRowKey={(row) => `${row.role}:${row.market}`}
          columns={[
            { id: "role", header: "Role", render: (row) => row.role },
            { id: "market", header: "Market", render: (row) => row.market },
            { id: "status", header: "Status", render: (row) => <StatusPill tone={row.status === "Open" ? "primary" : "warning"}>{row.status}</StatusPill> },
            { id: "partner", header: "Source", render: (row) => row.partner },
          ]}
        />
      </Card>
    </>
  );
}

function EmployerConnectPage() {
  const location = useLocation();
  const section = currentSubpage(location.pathname, "/employer-connect", ["overview", "pipeline", "requisitions", "demand"]);

  return (
    <>
      <PageHeader
        eyebrow="Employer Connect"
        title="Employer partner pipeline."
        body="Jobs, packet QA, submissions, starts, and retention stay connected to Florence readiness and application gates."
        badge="Partner safe"
      />
      <SurfaceTabs
        basePath="/employer-connect"
        tabs={[
          { key: "overview", label: "Overview" },
          { key: "pipeline", label: "Pipeline" },
          { key: "requisitions", label: "Requisitions" },
          { key: "demand", label: "Demand" },
        ]}
      />
      {section === "overview" && <EmployerOverview />}
      {section === "pipeline" && <EmployerPipeline />}
      {section === "requisitions" && <EmployerRequisitions />}
      {section === "demand" && <EmployerDemand />}
    </>
  );
}

function EmployerOverview() {
  const demand = useCoreResource(readEmployerDemand, []);
  const ledger = useCoreResource(readEmployerLedger, []);

  return (
    <>
      <EmployerMetricStrip demand={demand} ledger={ledger} />
      <section className="fos-two-column">
        <Card title="Partner pipeline" subtitle="Outbound partner actions require scope, consent, QA, and audit.">
          <Timeline
            items={[
              { title: "Job imported", body: "Employer demand normalized into Florence OS.", meta: "Tenant-scoped" },
              { title: "Candidate matched", body: "Profile and readiness viewed through the employer-safe packet.", meta: "Consent gate" },
              { title: "Packet QA", body: "Navigator review before any external submission.", meta: "Fail closed" },
              { title: "Start verified", body: "Production Ledger waits for approved verification.", meta: "Core event" },
            ]}
          />
        </Card>
        <Card title="Employer-safe surface" subtitle="No visa, financing, raw remediation, or unrelated employer details are shown.">
          <p className="fos-body-copy">
            Employer Connect is a role-specific Florence OS view. Sensitive packet generation remains behind the Application
            Gate and Core redaction rules.
          </p>
        </Card>
      </section>
    </>
  );
}

function EmployerMetricStrip({
  demand,
  ledger,
}: {
  demand: LoadState<EmployerDemandSummary>;
  ledger: LoadState<EmployerLedgerSummary>;
}) {
  const demandData = demand.status === "ready" ? demand.data : undefined;
  const ledgerData = ledger.status === "ready" ? ledger.data : undefined;
  const started = ledgerData?.funnel.find((row) => row.stage === "started")?.candidates ?? 0;

  return (
    <section className="fos-metric-grid" aria-label="Employer Connect metrics">
      <MetricCard label="Open requisitions" value={demandData?.openRequisitions ?? "N/A"} hint="ATS demand" tone="primary" />
      <MetricCard label="Openings" value={demandData?.totalOpenings ?? "N/A"} hint="RN seats" tone="accent" />
      <MetricCard label="Submitted" value={demandData?.submittedApplications ?? "N/A"} hint="Application gate passed" tone="success" />
      <MetricCard label="Started" value={started || "N/A"} hint="Ledger verified" tone="warning" />
    </section>
  );
}

function EmployerPipeline() {
  const ledger = useCoreResource(readEmployerLedger, []);

  if (ledger.status === "loading") {
    return <EmptyState title="Loading pipeline">Reading employer production ledger summary.</EmptyState>;
  }
  if (ledger.status === "error") {
    return (
      <Card title="Pipeline service" subtitle="The in-shell page is ready; start ATS Connect to populate live data.">
        <AlertBanner tone="warning" title="Employer Connect API unavailable">{ledger.message}</AlertBanner>
        <Timeline
          items={[
            { title: "Matched", body: "Candidate reached employer-safe match stage." },
            { title: "Packet QA", body: "Packet prepared and waiting on review." },
            { title: "Submitted", body: "Application submitted after gates passed." },
            { title: "Started", body: "Start event awaits verification." },
          ]}
        />
      </Card>
    );
  }

  return (
    <Card title="Production funnel" subtitle="Read through ATS Connect and aligned to the Core Production Ledger vocabulary.">
      <DataTable
        rows={ledger.data.funnel}
        getRowKey={(row) => row.stage}
        columns={[
          { id: "stage", header: "Stage", render: (row) => normalizeLabel(row.stage) },
          { id: "candidates", header: "Candidates", render: (row) => row.candidates, align: "right" },
        ]}
      />
    </Card>
  );
}

function EmployerRequisitions() {
  const requisitions = useCoreResource(readEmployerRequisitions, []);
  const rows = requisitions.status === "ready" && requisitions.data.length ? requisitions.data : employerFallbackRows;

  return (
    <Card
      title="Requisitions"
      subtitle={
        requisitions.status === "ready"
          ? "Live employer requisitions read through the unified app route."
          : "Fallback requisition shape shown until ATS Connect is running."
      }
    >
      {requisitions.status === "error" && <AlertBanner tone="warning" title="Employer API unavailable">{requisitions.message}</AlertBanner>}
      <DataTable
        rows={rows}
        getRowKey={(row) => row.id}
        columns={[
          { id: "title", header: "Role", render: (row) => row.title },
          { id: "market", header: "Market", render: (row) => [row.city, row.state].filter(Boolean).join(", ") || "Not recorded" },
          { id: "specialty", header: "Specialty", render: (row) => row.specialty ?? "Not recorded" },
          { id: "status", header: "Status", render: (row) => <StatusPill tone={row.status === "open" ? "success" : "warning"}>{normalizeLabel(row.status)}</StatusPill> },
          { id: "openings", header: "Openings", render: (row) => row.openings ?? 1, align: "right" },
        ]}
      />
    </Card>
  );
}

function EmployerDemand() {
  const demand = useCoreResource(readEmployerDemand, []);

  if (demand.status === "loading") {
    return <EmptyState title="Loading demand">Reading employer demand dashboard.</EmptyState>;
  }
  if (demand.status === "error") {
    return (
      <Card title="Demand Radar" subtitle="Demand Radar will populate from ATS Connect when the service is running.">
        <AlertBanner tone="warning" title="Employer API unavailable">{demand.message}</AlertBanner>
      </Card>
    );
  }

  const stateRows = Object.entries(demand.data.byState).map(([state, value]) => ({ state, ...value }));
  const specialtyRows = Object.entries(demand.data.bySpecialty).map(([specialty, value]) => ({ specialty, ...value }));

  return (
    <section className="fos-two-column">
      <Card title="Demand by state" subtitle="Open RN demand by market.">
        <DataTable
          rows={stateRows}
          getRowKey={(row) => row.state}
          columns={[
            { id: "state", header: "State", render: (row) => row.state },
            { id: "reqs", header: "Reqs", render: (row) => row.reqs, align: "right" },
            { id: "openings", header: "Openings", render: (row) => row.openings, align: "right" },
          ]}
        />
      </Card>
      <Card title="Demand by specialty" subtitle="Specialty demand used for matching and cohort planning.">
        <DataTable
          rows={specialtyRows}
          getRowKey={(row) => row.specialty}
          columns={[
            { id: "specialty", header: "Specialty", render: (row) => row.specialty },
            { id: "reqs", header: "Reqs", render: (row) => row.reqs, align: "right" },
            { id: "openings", header: "Openings", render: (row) => row.openings, align: "right" },
          ]}
        />
      </Card>
    </section>
  );
}

type EconomistRunState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "ready";
      quote: EconomistEnvelope<EconomistQuote>;
      proposal: EconomistEnvelope<EconomistProposal>;
    }
  | { status: "error"; message: string };

const economistFacilities = [
  { id: "tenet-gulf-coast-med-surg", label: "Tenet-style Gulf Coast" },
  { id: "kaiser-norcal-telemetry", label: "Kaiser-style Northern California" },
];

function EconomistPage() {
  const [form, setForm] = useState<EconomistQuoteRequest>({
    facilityId: "tenet-gulf-coast-med-surg",
    rnCount: 12,
    specialty: "med_surg",
    channel: "direct",
  });
  const [state, setState] = useState<EconomistRunState>({ status: "idle" });

  function updateForm<K extends keyof EconomistQuoteRequest>(key: K, value: EconomistQuoteRequest[K]): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function generateQuote(): Promise<void> {
    setState({ status: "loading" });
    try {
      const quoteInput = {
        ...form,
        rnCount: Number(form.rnCount ?? 1),
        channelShareRate: form.channel === "channel" ? Number(form.channelShareRate ?? 0.18) : undefined,
      };
      const quote = await createEconomistQuote(quoteInput);
      const proposal = await createEconomistProposal({
        quoteInput,
        durationMonths: 12,
        title: `${quote.data.facility.name} workforce proposal`,
      });
      setState({ status: "ready", quote, proposal });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Economist API unavailable" });
    }
  }

  const quote = state.status === "ready" ? state.quote.data : undefined;
  const proposal = state.status === "ready" ? state.proposal.data : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Workforce Economist"
        title="Facility quote workspace."
        body="Create a facility-level RN workforce quote, preview customer economics, and draft a proposal from the same Florence OS route."
        badge="Core events"
      />
      <section className="fos-two-column">
        <Card
          title="Quote inputs"
          subtitle="Synthetic facility benchmarks are used for pricing previews; candidate records are not part of this surface."
          action={<StatusPill tone={state.status === "ready" && state.quote.coreEvent?.emitted ? "success" : "neutral"}>{state.status === "ready" && state.quote.coreEvent?.emitted ? "Ledger event" : "Draft"}</StatusPill>}
        >
          <div className="fos-form-grid">
            <label className="fos-field">
              <span>Facility</span>
              <select value={form.facilityId} onChange={(event) => updateForm("facilityId", event.target.value)}>
                {economistFacilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {facility.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="fos-field">
              <span>RN seats</span>
              <input
                min="1"
                max="500"
                type="number"
                value={form.rnCount ?? 1}
                onChange={(event) => updateForm("rnCount", Number(event.target.value))}
              />
            </label>
            <label className="fos-field">
              <span>Specialty</span>
              <select value={form.specialty} onChange={(event) => updateForm("specialty", event.target.value)}>
                <option value="med_surg">Med-surg</option>
                <option value="telemetry">Telemetry</option>
                <option value="icu">ICU</option>
                <option value="post_acute">Post-acute</option>
              </select>
            </label>
            <label className="fos-field">
              <span>Channel</span>
              <select value={form.channel} onChange={(event) => updateForm("channel", event.target.value as EconomistQuoteRequest["channel"])}>
                <option value="direct">Direct</option>
                <option value="channel">Channel partner</option>
              </select>
            </label>
            {form.channel === "channel" && (
              <label className="fos-field">
                <span>Channel share</span>
                <input
                  min="0"
                  max="0.5"
                  step="0.01"
                  type="number"
                  value={form.channelShareRate ?? 0.18}
                  onChange={(event) => updateForm("channelShareRate", Number(event.target.value))}
                />
              </label>
            )}
            <label className="fos-field">
              <span>Monthly fee per RN</span>
              <input
                min="0"
                step="50"
                type="number"
                placeholder="Facility default"
                value={form.monthlyEmployerFeePerRn ?? ""}
                onChange={(event) => updateForm("monthlyEmployerFeePerRn", event.target.value ? Number(event.target.value) : undefined)}
              />
            </label>
          </div>
          <div className="fos-card-actions">
            <button className={buttonClassName({ variant: "primary", size: "sm" })} type="button" onClick={generateQuote} disabled={state.status === "loading"}>
              {state.status === "loading" ? "Generating" : "Generate quote"}
            </button>
          </div>
          {state.status === "error" && <AlertBanner tone="warning" title="Economist API unavailable">{state.message}</AlertBanner>}
        </Card>
        <Card title="Revenue guardrail" subtitle="Payroll-tax offset is shown only as a customer-side effective-cost reducer.">
          <Timeline
            items={[
              { title: "Employer monthly fee", body: quote ? formatCurrency(quote.florenceFee.employerMonthlyFeeTotal) : "Generate a quote to calculate the fee.", meta: "Customer pays" },
              { title: "Florence revenue", body: quote ? formatCurrency(quote.florenceFee.florenceMonthlyRevenueTotal) : "Revenue excludes payroll-tax offset.", meta: "Core ledger reference" },
              { title: "Customer offset", body: quote ? formatCurrency(quote.customerOffset.payrollTaxOffsetMonthlyTotal) : "Shown as customer-side only.", meta: "Not Florence revenue" },
              { title: "Proposal review", body: proposal ? proposal.status : "Draft proposal is created from the quote.", meta: "Human review required" },
            ]}
          />
        </Card>
      </section>
      <HospitalSpendTrends />
      {state.status === "ready" ? (
        <EconomistResults
          quote={state.quote.data}
          proposal={state.proposal.data}
          quoteEvent={state.quote.coreEvent}
          proposalEvent={state.proposal.coreEvent}
        />
      ) : (
        <EconomistEmptyPreview />
      )}
    </>
  );
}

type NashpTrendLoadState = LoadState<NashpTrend> | { status: "idle" };

const nashpGroupOptions: { value: NashpTrendGroupBy; label: string }[] = [
  { value: "health_system", label: "Health system" },
  { value: "hospital", label: "Hospital" },
  { value: "msa", label: "MSA" },
  { value: "state", label: "State" },
];

function EconomistEmptyPreview() {
  return (
    <EmptyState title="No quote generated yet">
      Workforce Economist results will show facility pricing, customer effective cost, proposal lines, and Core event status here.
    </EmptyState>
  );
}

function HospitalSpendTrends() {
  const [groupBy, setGroupBy] = useState<NashpTrendGroupBy>("health_system");
  const [metricSlug, setMetricSlug] = useState("hospital_operating_costs");
  const [entityId, setEntityId] = useState("");
  const [trendState, setTrendState] = useState<NashpTrendLoadState>({ status: "idle" });
  const metadata = useCoreResource(() => readNashpDatasetMetadata().then((response) => response.data), []);
  const entities = useCoreResource(
    () => readNashpTrendEntities({ groupBy, metric: metricSlug, limit: 75 }).then((response) => response.data),
    [groupBy, metricSlug],
  );

  useEffect(() => {
    if (metadata.status !== "ready") return;
    if (!metadata.data.metrics.some((metric) => metric.slug === metricSlug)) {
      setMetricSlug(metadata.data.metrics[0]?.slug ?? "hospital_operating_costs");
    }
  }, [metadata, metricSlug]);

  useEffect(() => {
    if (entities.status !== "ready") return;
    setEntityId((current) => (entities.data.some((entity) => entity.id === current) ? current : entities.data[0]?.id ?? ""));
  }, [entities]);

  useEffect(() => {
    if (!entityId) {
      setTrendState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setTrendState({ status: "loading" });
    readNashpTrend({
      groupBy,
      id: entityId,
      metric: metricSlug,
      fromYear: metadata.status === "ready" ? metadata.data.source.minYear : undefined,
      toYear: metadata.status === "ready" ? metadata.data.source.maxYear : undefined,
    })
      .then((response) => {
        if (!cancelled) setTrendState({ status: "ready", data: response.data });
      })
      .catch((error: unknown) => {
        if (!cancelled) setTrendState({ status: "error", message: error instanceof Error ? error.message : "Trend unavailable" });
      });
    return () => {
      cancelled = true;
    };
  }, [entityId, groupBy, metricSlug, metadata]);

  const metricOptions = metadata.status === "ready" ? metadata.data.metrics : [];
  const selectedMetric = metricOptions.find((metric) => metric.slug === metricSlug);
  const metadataSource = metadata.status === "ready" ? metadata.data.source : undefined;
  const sourceCheckText = metadataSource?.pageUpdatedOn
    ? `official page updated ${metadataSource.pageUpdatedOn}`
    : metadataSource?.checkedAt
      ? `official page checked ${formatDate(metadataSource.checkedAt)}`
      : "official page check pending";

  return (
    <section>
      <Card
        title="NASHP hospital spend trends"
        subtitle={
          metadataSource
            ? `${metadataSource.releaseLabel}; loaded through ${metadataSource.maxYear}; ${metadataSource.rowCount.toLocaleString()} hospital-year records; ${sourceCheckText}.`
            : "Loading NASHP source metadata."
        }
        action={<StatusPill tone={metadataSource ? "success" : "neutral"}>{metadataSource ? `Latest loaded ${metadataSource.maxYear}` : "Loading"}</StatusPill>}
      >
        <div className="fos-form-grid fos-trend-controls">
          <label className="fos-field">
            <span>Group</span>
            <select value={groupBy} onChange={(event) => setGroupBy(event.target.value as NashpTrendGroupBy)}>
              {nashpGroupOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="fos-field">
            <span>Metric</span>
            <select value={metricSlug} onChange={(event) => setMetricSlug(event.target.value)} disabled={metadata.status !== "ready"}>
              {metricOptions.map((metric) => (
                <option key={metric.slug} value={metric.slug}>
                  {metric.label}
                </option>
              ))}
            </select>
          </label>
          <label className="fos-field">
            <span>Entity</span>
            <select value={entityId} onChange={(event) => setEntityId(event.target.value)} disabled={entities.status !== "ready" || entities.data.length === 0}>
              {entities.status === "ready" ? (
                entities.data.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.label}
                  </option>
                ))
              ) : (
                <option>Loading</option>
              )}
            </select>
          </label>
        </div>
        {metadata.status === "error" && <AlertBanner tone="warning" title="NASHP metadata unavailable">{metadata.message}</AlertBanner>}
        {entities.status === "error" && <AlertBanner tone="warning" title="NASHP entities unavailable">{entities.message}</AlertBanner>}
        {trendState.status === "ready" && selectedMetric ? (
          <NashpTrendPanel trend={trendState.data} metadata={metadata.status === "ready" ? metadata.data : undefined} />
        ) : trendState.status === "error" ? (
          <AlertBanner tone="warning" title="Trend unavailable">{trendState.message}</AlertBanner>
        ) : (
          <EmptyState title="Loading trend">NASHP trend data will appear here.</EmptyState>
        )}
      </Card>
    </section>
  );
}

function NashpTrendPanel({ trend, metadata }: { trend: NashpTrend; metadata?: NashpDatasetMetadata }) {
  const populated = trend.series.filter((point) => point.value !== null);
  const latest = populated.at(-1);
  const first = populated.at(0);
  const change =
    latest && first && typeof latest.value === "number" && typeof first.value === "number"
      ? latest.value - first.value
      : undefined;
  const yearLabel = first && latest ? `${first.year}-${latest.year}` : `${trend.source.minYear}-${trend.source.maxYear}`;

  return (
    <div className="fos-trend-panel">
      <section className="fos-metric-grid" aria-label="NASHP trend summary">
        <MetricCard label="Latest value" value={formatNashpMetricValue(latest?.value, trend.metric)} hint={latest ? String(latest.year) : "No value"} tone="primary" />
        <MetricCard label="Period change" value={formatNashpMetricValue(change, trend.metric)} hint={yearLabel} tone="accent" />
        <MetricCard label="Records" value={new Intl.NumberFormat().format(trend.entity.observationCount)} hint={trend.entity.subtitle} tone="neutral" />
        <MetricCard label="MSA coverage" value={metadata ? formatPercent(metadata.source.msaCoverage) : "N/A"} hint="ZIP-to-CBSA enrichment" tone="success" />
      </section>
      <NashpTrendChart trend={trend} />
      <DataTable
        rows={trend.series}
        getRowKey={(row) => row.year}
        columns={[
          { id: "year", header: "Year", render: (row) => row.year, width: "90px" },
          { id: "value", header: trend.metric.label, render: (row) => formatNashpMetricValue(row.value, trend.metric), align: "right" },
          { id: "records", header: "Records", render: (row) => row.observationCount, align: "right", width: "110px" },
        ]}
      />
    </div>
  );
}

function NashpTrendChart({ trend }: { trend: NashpTrend }) {
  const points = trend.series.filter((point): point is NashpTrendPoint & { value: number } => typeof point.value === "number");
  if (points.length === 0) {
    return <EmptyState title="No values">No yearly values are available for this selection.</EmptyState>;
  }

  const width = 640;
  const height = 220;
  const padding = { top: 18, right: 24, bottom: 34, left: 58 };
  const values = points.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const yRange = maxValue - minValue || 1;
  const xByYear = new Map(trend.series.map((point, index) => [point.year, index]));
  const xMax = Math.max(1, trend.series.length - 1);
  const x = (point: NashpTrendPoint) => padding.left + ((xByYear.get(point.year) ?? 0) / xMax) * (width - padding.left - padding.right);
  const y = (value: number) => padding.top + (1 - (value - minValue) / yRange) * (height - padding.top - padding.bottom);
  const polyline = points.map((point) => `${x(point)},${y(point.value)}`).join(" ");
  const firstYear = trend.series[0]?.year;
  const lastYear = trend.series.at(-1)?.year;

  return (
    <div className="fos-trend-chart" aria-label={`${trend.entity.label} ${trend.metric.label} trend`}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} />
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} />
        <text x="8" y={padding.top + 4}>
          {formatNashpMetricValue(maxValue, trend.metric)}
        </text>
        <text x="8" y={height - padding.bottom}>
          {formatNashpMetricValue(minValue, trend.metric)}
        </text>
        <text x={padding.left} y={height - 8} textAnchor="start">
          {firstYear}
        </text>
        <text x={width - padding.right} y={height - 8} textAnchor="end">
          {lastYear}
        </text>
        <polyline points={polyline} />
        {points.map((point) => (
          <circle key={point.year} cx={x(point)} cy={y(point.value)} r="4" />
        ))}
      </svg>
    </div>
  );
}

function EconomistResults({
  quote,
  proposal,
  quoteEvent,
  proposalEvent,
}: {
  quote: EconomistQuote;
  proposal: EconomistProposal;
  quoteEvent?: EconomistEnvelope<EconomistQuote>["coreEvent"];
  proposalEvent?: EconomistEnvelope<EconomistProposal>["coreEvent"];
}) {
  const lineRows = proposal.lineItems;
  return (
    <>
      <section className="fos-metric-grid" aria-label="Workforce Economist quote metrics">
        <MetricCard label="Employer fee" value={formatCurrency(quote.florenceFee.employerMonthlyFeeTotal)} hint={`${quote.input.rnCount} RN seats`} tone="primary" />
        <MetricCard label="Florence revenue" value={formatCurrency(quote.florenceFee.florenceMonthlyRevenueTotal)} hint={quote.florenceFee.channelPartnerMonthlyShareTotal ? "after channel share" : "direct"} tone="accent" />
        <MetricCard label="Customer offset" value={formatCurrency(quote.customerOffset.payrollTaxOffsetMonthlyTotal)} hint={quote.customerOffset.treatment} tone="warning" />
        <MetricCard label="Net savings" value={formatCurrency(quote.customerSavings.netMonthlySavingsVsAgencyTotal)} hint="vs agency baseline" tone="success" />
      </section>
      <section className="fos-two-column">
        <Card title={proposal.title} subtitle={proposal.summary} action={<StatusPill tone="warning">{proposal.status}</StatusPill>}>
          <DataTable
            rows={lineRows}
            getRowKey={(row) => row.label}
            columns={[
              { id: "line", header: "Line", render: (row) => row.label },
              { id: "audience", header: "Audience", render: (row) => <Badge tone={row.audience === "florence" ? "accent" : row.audience === "partner" ? "neutral" : "primary"}>{normalizeLabel(row.audience)}</Badge> },
              { id: "amount", header: "Monthly", render: (row) => formatCurrency(row.amountMonthly), align: "right" },
            ]}
          />
        </Card>
        <Card title="Core event status" subtitle={`Quote ${quote.id}`}>
          <DataTable
            rows={[
              { event: "Quote", status: quoteEvent?.emitted ? "Emitted" : "Pending", detail: quoteEvent?.eventId ?? quoteEvent?.reason ?? "Core not configured" },
              { event: "Proposal", status: proposalEvent?.emitted ? "Emitted" : "Pending", detail: proposalEvent?.eventId ?? proposalEvent?.reason ?? "Core not configured" },
            ]}
            getRowKey={(row) => row.event}
            columns={[
              { id: "event", header: "Event", render: (row) => row.event },
              { id: "status", header: "Status", render: (row) => <StatusPill tone={row.status === "Emitted" ? "success" : "warning"}>{row.status}</StatusPill> },
              { id: "detail", header: "Detail", render: (row) => row.detail },
            ]}
          />
          <AlertBanner tone="info" title="Customer offset guardrail">
            FICA/payroll-tax savings remain customer-side and are excluded from Florence revenue in the quote payload.
          </AlertBanner>
        </Card>
      </section>
    </>
  );
}

function PartnersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Partners"
        title="Partner views share one access model."
        body="Each partner role gets a tenant-scoped view backed by Core consent, redaction, and audit controls."
        badge="Scoped"
      />
      <Card title="Partner access matrix" subtitle="Each partner view is scoped to the approved audience and purpose.">
        <DataTable
          rows={partnerRows}
          getRowKey={(row) => row.partner}
          columns={[
            { id: "partner", header: "Partner", render: (row) => row.partner },
            { id: "scope", header: "View", render: (row) => row.scope },
            { id: "gate", header: "Gate", render: (row) => row.gate },
          ]}
        />
      </Card>
    </>
  );
}

function OpsPage() {
  const nurseId = useActiveNurseId();
  const ledger = useCoreResource(() => readLedger(nurseId), [nurseId]);

  return (
    <>
      <PageHeader
        eyebrow="Ops"
        title="Production Ledger is read from Core."
        body="Current stage and event names are visible here without exposing event payloads or restricted document contents."
        badge="Core ledger"
      />
      <LedgerPanel state={ledger} />
    </>
  );
}

function LedgerPanel({ state }: { state: LoadState<LedgerResponse> }) {
  if (state.status === "loading") {
    return <EmptyState title="Loading Production Ledger">Reading the Core ledger timeline.</EmptyState>;
  }
  if (state.status === "error") {
    return (
      <EmptyState
        title="Core sign-in required"
        action={
          <a className={buttonClassName({ variant: "secondary", size: "sm" })} href={loginUrl()}>
            Sign in with Florence
          </a>
        }
      >
        {state.message}
      </EmptyState>
    );
  }

  const events = state.data.events ?? [];
  return (
    <section className="fos-two-column">
      <Card title="Current ledger stage" subtitle={`Nurse ${state.data.nurseId ?? "current record"}`}>
        <div className="fos-passport-grid">
          <MetricCard label="Current stage" value={normalizeLabel(state.data.currentStage)} tone="primary" />
          <MetricCard label="Funnel" value={normalizeLabel(state.data.funnelStage)} tone="accent" />
          <MetricCard label="Events" value={events.length} hint="payloads hidden in shell" tone="neutral" />
        </div>
      </Card>
      <Card title="Timeline" subtitle="Oldest-first Core events with payloads withheld from this shell view.">
        <DataTable
          rows={events}
          empty="No ledger events are available for this Core profile."
          getRowKey={(row, index) => `${row.type}:${row.at ?? index}`}
          columns={[
            { id: "type", header: "Event", render: (row) => normalizeLabel(row.type) },
            { id: "at", header: "When", render: (row) => formatDate(row.at) },
          ]}
        />
      </Card>
    </section>
  );
}

function AdminPage() {
  const controls = [
    { area: "Session", state: "Core SSO", detail: "One fl_session cookie works across Florence OS subdomains." },
    { area: "Domain", state: "Canonical", detail: "Public app shell targets app.florenceedu.com." },
    { area: "Design", state: "Shared", detail: "Shared Florence UI across product areas." },
    { area: "Security", state: "Fail closed", detail: "External sharing requires consent, tenant scope, audit, and review gates." },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Unified platform controls."
        body="Admins can review role navigation, Core gates, and canonical domain posture from one route."
        badge="Platform"
      />
      <Card title="Control checklist" subtitle="Admin-facing status for the unified shell implementation.">
        <DataTable
          rows={controls}
          getRowKey={(row) => row.area}
          columns={[
            { id: "area", header: "Area", render: (row) => row.area },
            { id: "state", header: "State", render: (row) => <StatusPill tone="success">{row.state}</StatusPill> },
            { id: "detail", header: "Detail", render: (row) => row.detail },
          ]}
        />
      </Card>
    </>
  );
}

export default App;
