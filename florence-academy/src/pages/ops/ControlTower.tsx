import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  buildProductionReview,
  buildRoster,
  computeMetrics,
  connect,
  connectViaCore,
  coreLoginUrl,
  opsConnected,
  fetchAttendanceRollup,
  fetchCohortCopilot,
  fetchOutcomeFunnel,
  fetchOutreachReady,
  fetchSchoolReport,
  loadOpsData,
  MONTHLY_SHARE_USD,
  needLabel,
  opsDisconnect,
  OpsError,
  REVIEW_ROLES,
  reviewToText,
  ROUTE_LABEL,
  STAGE_LABEL,
  STAGES,
  type AttendanceRollup,
  type CohortCopilot,
  type CohortRow,
  type OpsMetrics,
  type OutreachReadyRow,
  type ProductionReview,
  type ReadinessBand,
  type ReviewRole,
  type RosterRow,
  type SchoolReport,
  type Stage,
} from "../../lib/opsApi";
import LeadsPanel from "./LeadsPanel";
import OutreachPanel from "./OutreachPanel";

const BAND_COLOR: Record<ReadinessBand, string> = {
  green: "#0BC5A0",
  yellow: "#F5B400",
  orange: "#F97316",
  red: "#E5484D",
  none: "#94A3B8",
};
const BAND_LABEL: Record<ReadinessBand, string> = {
  green: "Exam-ready",
  yellow: "Almost there",
  orange: "Building",
  red: "Foundational",
  none: "Not assessed",
};
const STAGE_COLOR = ["#C7D2FE", "#A5B4FC", "#5EC9B8", "#0BC5A0", "#CBD5E1"];

function usd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function depositAmount(d: { amountCents?: number }): string {
  return `$${Math.round((d.amountCents ?? 0) / 100)}`;
}
const DEPOSIT_DOT: Record<string, string> = {
  paid: "#0BC5A0",
  pending: "#F5B400",
  failed: "#E5484D",
  none: "#94A3B8",
};

type Tab = "dashboard" | "leads" | "outreach";

export default function ControlTower() {
  const [status, setStatus] = useState<"checking" | "disconnected" | "loading" | "ready" | "error">(
    "checking",
  );
  const [tab, setTab] = useState<Tab>("dashboard");
  const [metrics, setMetrics] = useState<OpsMetrics | null>(null);
  const [roster, setRoster] = useState<RosterRow[] | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRollup | null>(null);
  const [outreach, setOutreach] = useState<OutreachReadyRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const [data, att, out] = await Promise.all([
        loadOpsData(),
        fetchAttendanceRollup().catch(() => null),
        fetchOutreachReady().catch(() => null),
      ]);
      setMetrics(computeMetrics(data));
      setRoster(buildRoster(data));
      setAttendance(att);
      setOutreach(out);
      setStatus("ready");
    } catch (e) {
      if (e instanceof OpsError && e.status === 401) {
        opsDisconnect();
        setStatus("disconnected");
        return;
      }
      setError(e instanceof Error ? e.message : "Failed to load");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (opsConnected()) {
      void load();
      return;
    }
    // Try the shared FlorenceRN Core staff cookie (SSO) before asking to connect.
    void connectViaCore().then((ok) => (ok ? void load() : setStatus("disconnected")));
  }, [load]);

  if (status === "checking") {
    return <Frame><p className="animate-pulse text-sm text-white/60">…</p></Frame>;
  }

  if (status === "disconnected") {
    return (
      <Frame>
        <ConnectForm
          onConnected={() => void load()}
        />
      </Frame>
    );
  }

  return (
    <Frame>
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-florence-teal">
              FlorenceRN · Internal
            </p>
            <h1 className="font-serif text-2xl font-semibold text-white">Production Control Tower</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-white/80 hover:bg-white/10"
            >
              ↻ Refresh
            </button>
            <button
              type="button"
              onClick={() => {
                opsDisconnect();
                setStatus("disconnected");
                setMetrics(null);
              }}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-white/60 hover:bg-white/10"
            >
              Disconnect
            </button>
          </div>
        </div>

        {status === "loading" && (
          <p className="mt-10 animate-pulse text-sm text-white/60">Loading the production funnel…</p>
        )}
        {status === "error" && (
          <p className="mt-10 rounded-lg bg-vital-danger/15 px-4 py-3 text-sm text-vital-danger">
            {error}
          </p>
        )}

        {status === "ready" && metrics && (
          <>
            {/* Tab nav - Dashboard | Leads. Internal-only surface; Leads is
                the Florence-core mirror, not visible to candidates. */}
            <nav className="mt-6 flex gap-1 border-b border-white/10">
              {(["dashboard", "leads", "outreach"] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                    tab === t
                      ? "border-florence-teal text-white"
                      : "border-transparent text-white/50 hover:text-white/80"
                  }`}
                >
                  {t === "dashboard"
                    ? "Production funnel"
                    : t === "leads"
                      ? "Florence core leads"
                      : "Outreach (Lob)"}
                </button>
              ))}
            </nav>
            {tab === "dashboard" ? (
              <Dashboard m={metrics} roster={roster ?? []} attendance={attendance} outreach={outreach ?? []} />
            ) : tab === "leads" ? (
              <div className="mt-6">
                <LeadsPanel />
              </div>
            ) : (
              <div className="mt-6">
                <OutreachPanel />
              </div>
            )}
          </>
        )}
      </div>
    </Frame>
  );
}

function Dashboard({
  m,
  roster,
  attendance,
  outreach,
}: {
  m: OpsMetrics;
  roster: RosterRow[];
  attendance: AttendanceRollup | null;
  outreach: OutreachReadyRow[];
}) {
  const [copilotCohort, setCopilotCohort] = useState<string | null>(null);
  const [reviewCohort, setReviewCohort] = useState<CohortRow | null>(null);
  const funnelData = STAGES.map((s) => ({ name: STAGE_LABEL[s], value: m.byStage[s] }));
  const bandData = (["green", "yellow", "orange", "red", "none"] as ReadinessBand[]).map((b) => ({
    name: BAND_LABEL[b],
    band: b,
    value: m.bandCounts[b],
  }));

  return (
    <div className="mt-6 space-y-6">
      {/* Top metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Candidates" value={String(m.totalCandidates)} />
        <Metric label="Paid deposits" value={String(m.depositsPaid)} sub={usd(m.depositsCollectedUsd)} />
        <Metric label="Readiness-cleared" value={String(m.readinessCleared)} sub={`of ${m.assessed} assessed`} />
        <Metric label="Attending now" value={String(m.byStage.attending)} />
        <Metric label="Expected starts" value={String(m.expectedStarts)} accent />
        <Metric label="Expected ARR" value={usd(m.expectedArrUsd)} accent />
      </div>

      {attendance && attendance.total_records > 0 && (
        <Panel title="Live Lab attendance" subtitle="Live cohort sessions + Live-Lab locations">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Sessions recorded" value={String(attendance.total_records)} />
            <Metric label="Attended" value={String(attendance.attended)} />
            <Metric label="Attendance rate" value={`${Math.round(attendance.attendance_rate * 100)}%`} />
            <Metric label="Live-Lab attendees" value={String(attendance.live_lab_attendees)} accent />
          </div>
          {attendance.by_location.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {attendance.by_location.map((l) => (
                <div key={l.location} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-sm">
                  <span className="text-white/80">{l.location}</span>
                  <span className="tabular-nums font-semibold text-florence-teal">{l.attendees}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Production funnel" subtitle="Candidates by stage">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={funnelData} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
              <XAxis dataKey="name" tick={{ fill: "#94A3B8", fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={48} />
              <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} allowDecimals={false} />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={TOOLTIP} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {funnelData.map((_, i) => (
                  <Cell key={i} fill={STAGE_COLOR[i % STAGE_COLOR.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Readiness distribution" subtitle="Latest assessment per candidate">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={bandData} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
              <XAxis dataKey="name" tick={{ fill: "#94A3B8", fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={48} />
              <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} allowDecimals={false} />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={TOOLTIP} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {bandData.map((d, i) => (
                  <Cell key={i} fill={BAND_COLOR[d.band]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel title="Forecasted RN starts by month" subtitle="Stage-weighted - the bridge to ARR">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={m.startsByMonth} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
            <XAxis dataKey="month" tick={{ fill: "#94A3B8", fontSize: 11 }} />
            <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} allowDecimals={false} />
            <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={TOOLTIP} />
            <Bar dataKey="starts" fill="#0BC5A0" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      {/* Cohort table */}
      <Panel title="Cohorts" subtitle="Throughput by class · click a row for the Instructor Copilot">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/50">
                <th className="py-2 pr-4 font-medium">Cohort</th>
                <th className="py-2 pr-4 font-medium">Candidates</th>
                <th className="py-2 pr-4 font-medium">Deposits</th>
                <th className="py-2 pr-4 font-medium">Readiness-cleared</th>
                <th className="py-2 pr-4 font-medium">Expected starts</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="text-white/85">
              {m.cohorts.map((c) => (
                <tr
                  key={c.code}
                  onClick={() => setCopilotCohort(c.code)}
                  className="cursor-pointer border-b border-white/5 transition-colors hover:bg-white/[0.04]"
                >
                  <td className="py-2.5 pr-4">
                    <span className="font-medium text-white">{c.name}</span>
                    <span className="ml-2 font-mono text-xs text-white/40">{c.code}</span>
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums">{c.candidates}</td>
                  <td className="py-2.5 pr-4 tabular-nums">{c.deposits}</td>
                  <td className="py-2.5 pr-4 tabular-nums">{c.readinessCleared}</td>
                  <td className="py-2.5 pr-4 tabular-nums font-semibold text-florence-teal">{c.expectedStarts}</td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReviewCohort(c);
                      }}
                      className="rounded-md border border-white/15 px-2 py-1 text-xs font-medium text-white/70 hover:bg-white/10"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <CandidatesPanel roster={roster} />

      <OutreachReadyPanel outreach={outreach} />

      <p className="pb-10 text-xs leading-relaxed text-white/40">
        Forecast model (v0): expected starts weight each stage by historical start probability
        (completed 0.9, attending 0.6, deposit paid 0.3, registered 0.1). Expected ARR ={" "}
        expected starts × {usd(MONTHLY_SHARE_USD)}/mo Florence share × 12. Assumptions are operator-tunable
        and will be replaced by outcome-trained estimates as starts accrue. Internal figures - never shown to
        candidates, employers, or universities.
      </p>

      {copilotCohort && <CopilotDrawer code={copilotCohort} onClose={() => setCopilotCohort(null)} />}
      {reviewCohort && <ProductionReviewDrawer cohort={reviewCohort} onClose={() => setReviewCohort(null)} />}
    </div>
  );
}

function ProductionReviewDrawer({ cohort, onClose }: { cohort: CohortRow; onClose: () => void }) {
  const [review, setReview] = useState<ProductionReview | null>(null);
  const [role, setRole] = useState<ReviewRole>("management");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const [copilot, funnel] = await Promise.all([fetchCohortCopilot(cohort.code), fetchOutcomeFunnel()]);
        if (alive) setReview(buildProductionReview(cohort, copilot, funnel, new Date().toISOString()));
      } catch {
        if (alive) setError("Could not build the production review.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [cohort]);

  function copy() {
    if (!review) return;
    void navigator.clipboard?.writeText(reviewToText(review, role));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const visibleRows = review?.rows.filter((r) => r.roles.includes(role)) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="h-full w-full max-w-lg overflow-y-auto border-l border-white/10 bg-florence-ink p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-florence-teal">Weekly Production Review</p>
            <h3 className="mt-1 font-mono text-lg font-semibold text-white">{cohort.code}</h3>
            <p className="text-sm text-white/50">{cohort.name}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/15 px-2.5 py-1 text-sm text-white/60 hover:bg-white/10">
            ✕
          </button>
        </div>

        {/* Role toggle */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {REVIEW_ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                role === r ? "bg-florence-teal text-florence-ink" : "bg-white/[0.04] text-white/70 hover:bg-white/10"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {error && <p className="mt-4 rounded-lg bg-vital-danger/15 px-3 py-2 text-sm text-vital-danger">{error}</p>}
        {!review && !error && <p className="mt-6 animate-pulse text-sm text-white/50">Compiling…</p>}

        {review && (
          <div className="mt-5">
            <dl className="divide-y divide-white/5">
              {visibleRows.map((r) => (
                <div key={r.label} className="flex items-baseline justify-between gap-4 py-2">
                  <dt className="text-sm text-white/60">{r.label}</dt>
                  <dd className="text-sm font-medium tabular-nums text-white">{r.value}</dd>
                </div>
              ))}
            </dl>

            {review.topGaps.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Top gaps to reteach</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {review.topGaps.map((g) => (
                    <span key={g} className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/85">{g}</span>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={copy}
              className="mt-5 w-full rounded-xl bg-florence-teal px-5 py-2.5 text-sm font-semibold text-florence-ink hover:bg-florence-teal/90"
            >
              {copied ? "Copied ✓" : `Copy ${role} memo`}
            </button>
            <p className="mt-3 text-xs text-white/35">
              ARR + financial lines appear only on the management/investor views - never on employer or university memos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function OutreachReadyPanel({ outreach }: { outreach: OutreachReadyRow[] }) {
  const [selected, setSelected] = useState<OutreachReadyRow | null>(null);
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-white">Schools ready for outreach</h2>
        <p className="text-xs text-white/50">
          Eligible schools with ≥10 affiliated candidates, ≥3 paid deposits, ≥65% avg
          readiness · click for the K-anonymized report
        </p>
      </div>
      {outreach.length === 0 ? (
        <p className="text-sm text-white/40">
          None yet - add schools (admin endpoint) and let students attest to see the list.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/50">
                <th className="py-2 pr-4 font-medium">School</th>
                <th className="py-2 pr-4 font-medium">Country</th>
                <th className="py-2 pr-4 font-medium">Affiliated</th>
                <th className="py-2 pr-4 font-medium">Deposits</th>
                <th className="py-2 pr-4 font-medium">Avg readiness</th>
                <th className="py-2 font-medium">Outreach status</th>
              </tr>
            </thead>
            <tbody className="text-white/85">
              {outreach.map((s) => (
                <tr
                  key={s.slug}
                  onClick={() => setSelected(s)}
                  className="cursor-pointer border-b border-white/5 transition-colors hover:bg-white/[0.04]"
                >
                  <td className="py-2.5 pr-4">
                    <span className="font-medium text-white">{s.name}</span>
                    <span className="ml-2 font-mono text-xs text-white/40">{s.slug}</span>
                  </td>
                  <td className="py-2.5 pr-4 text-white/70">{s.country}</td>
                  <td className="py-2.5 pr-4 tabular-nums">{s.affiliated}</td>
                  <td className="py-2.5 pr-4 tabular-nums">{s.paid_deposits}</td>
                  <td className="py-2.5 pr-4 tabular-nums">
                    {s.avg_readiness != null ? `${Math.round(s.avg_readiness * 100)}%` : "-"}
                  </td>
                  <td className="py-2.5 text-white/70 capitalize">
                    {s.outreach_status.replace(/_/g, " ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && <SchoolReportDrawer slug={selected.slug} onClose={() => setSelected(null)} />}
    </section>
  );
}

function SchoolReportDrawer({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [report, setReport] = useState<SchoolReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const r = await fetchSchoolReport(slug);
        if (alive) setReport(r);
      } catch {
        if (alive) setError("Could not load the school report.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-florence-ink p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-florence-teal">
              K-anonymized school report
            </p>
            <h3 className="mt-1 font-mono text-lg font-semibold text-white">{slug}</h3>
            {report && (
              <p className="text-sm text-white/50">
                {report.school.name} · {report.school.country} · tier {report.school.tier}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/15 px-2.5 py-1 text-sm text-white/60 hover:bg-white/10">
            ✕
          </button>
        </div>

        {error && <p className="mt-4 rounded-lg bg-vital-danger/15 px-3 py-2 text-sm text-vital-danger">{error}</p>}
        {!report && !error && <p className="mt-6 animate-pulse text-sm text-white/50">Loading…</p>}

        {report && (
          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <DetailStat label="Affiliated" value={String(report.participation.affiliated)} />
              <DetailStat label="Verified" value={String(report.participation.verified)} />
              <DetailStat label="Deposits paid" value={String(report.participation.paid_deposits)} />
            </div>

            {report.suppressed_for_privacy ? (
              <div className="rounded-lg bg-white/[0.04] p-4 text-sm text-white/70">
                <strong className="text-white">Suppressed for privacy.</strong> Below K={report.k_floor}{" "}
                affiliated candidates, the report shows participation counts only - no
                demographic breakdown - to protect individual identities.
              </div>
            ) : (
              <>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
                    Readiness distribution {report.ranges_mode && "(ranges)"}
                  </p>
                  <div className="space-y-1.5">
                    {(["green", "yellow", "orange", "red", "none"] as ReadinessBand[]).map((b) => (
                      <div key={b} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-1.5 text-sm">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: BAND_COLOR[b] }} />
                          <span className="text-white/80">{BAND_LABEL[b]}</span>
                        </span>
                        <span className="tabular-nums text-white/70">
                          {typeof report.band_distribution[b] === "number"
                            ? `${report.band_distribution[b]}%`
                            : report.band_distribution[b]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {report.top_gaps.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
                      Top gaps to reteach
                    </p>
                    <ol className="space-y-1.5">
                      {report.top_gaps.map((g, i) => (
                        <li key={g.client_need} className="flex items-center justify-between text-sm">
                          <span className="text-white/85">
                            {i + 1}. {needLabel(g.client_need)}
                          </span>
                          <span className="tabular-nums text-white/50">
                            {Math.round(g.mean_score * 100)}%
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </>
            )}

            <p className="text-xs leading-relaxed text-white/40">
              Education readiness only - never financial / ARR / visa data. K floor:{" "}
              {report.k_floor}. This is the report a school sees once an affiliate
              data-sharing agreement is signed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CopilotDrawer({ code, onClose }: { code: string; onClose: () => void }) {
  const [report, setReport] = useState<CohortCopilot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const r = await fetchCohortCopilot(code);
        if (alive) setReport(r);
      } catch {
        if (alive) setError("Could not load the cohort copilot.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [code]);

  const bands = (["green", "yellow", "orange", "red", "none"] as ReadinessBand[]).filter(
    (b) => (report?.band_counts[b] ?? 0) > 0,
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="h-full w-full max-w-lg overflow-y-auto border-l border-white/10 bg-florence-ink p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-florence-teal">Instructor Copilot</p>
            <h3 className="mt-1 font-mono text-lg font-semibold text-white">{code}</h3>
            {report && (
              <p className="text-sm text-white/50">
                {report.candidates} candidate{report.candidates === 1 ? "" : "s"}
                {report.avg_readiness != null && ` · avg ${Math.round(report.avg_readiness * 100)}% ready`}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/15 px-2.5 py-1 text-sm text-white/60 hover:bg-white/10">
            ✕
          </button>
        </div>

        {error && <p className="mt-4 rounded-lg bg-vital-danger/15 px-3 py-2 text-sm text-vital-danger">{error}</p>}
        {!report && !error && <p className="mt-6 animate-pulse text-sm text-white/50">Analyzing cohort…</p>}

        {report && (
          <div className="mt-5 space-y-5">
            <CopilotSection title="Readiness distribution">
              <div className="flex flex-wrap gap-2">
                {bands.length === 0 && <span className="text-sm text-white/40">No assessments yet.</span>}
                {bands.map((b) => (
                  <span key={b} className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1 text-sm text-white/85">
                    <span className="h-2 w-2 rounded-full" style={{ background: BAND_COLOR[b] }} />
                    {BAND_LABEL[b]}: <span className="tabular-nums">{report.band_counts[b]}</span>
                  </span>
                ))}
              </div>
            </CopilotSection>

            <CopilotSection title="Reteach next - weakest client needs">
              {report.top_reteach.length === 0 ? (
                <p className="text-sm text-white/40">Not enough data.</p>
              ) : (
                <ol className="space-y-1.5">
                  {report.top_reteach.map((t, i) => (
                    <li key={t.client_need} className="flex items-center justify-between text-sm">
                      <span className="text-white/85">
                        {i + 1}. {needLabel(t.client_need)}
                      </span>
                      <span className="tabular-nums text-white/50">{Math.round(t.mean_score * 100)}%</span>
                    </li>
                  ))}
                </ol>
              )}
            </CopilotSection>

            <CopilotSection title="Falling behind">
              {report.fallers.length === 0 ? (
                <p className="text-sm text-vital-ok">Nobody flagged - strong cohort.</p>
              ) : (
                <ul className="space-y-1.5">
                  {report.fallers.map((f) => (
                    <li key={f.candidate_id} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-1.5 text-sm">
                      <span className="text-white/85">{f.full_name ?? f.candidate_id}</span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: BAND_COLOR[f.band] }} />
                        <span className="tabular-nums text-white/50">{f.readiness != null ? `${Math.round(f.readiness * 100)}%` : "-"}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CopilotSection>

            <CopilotSection title="Day-5 routing draft">
              <div className="space-y-1.5">
                {(Object.keys(ROUTE_LABEL) as (keyof typeof ROUTE_LABEL)[]).map((r) =>
                  report.routing[r].length > 0 ? (
                    <div key={r} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-white/70">{ROUTE_LABEL[r]}</span>
                      <span className="tabular-nums font-semibold text-florence-teal">{report.routing[r].length}</span>
                    </div>
                  ) : null,
                )}
              </div>
            </CopilotSection>

            <p className="text-xs leading-relaxed text-white/35">
              Deterministic analysis for faculty review - not an automated decision. Generated{" "}
              {report.generated_at.slice(0, 19).replace("T", " ")} UTC.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CopilotSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">{title}</p>
      {children}
    </div>
  );
}

const TOOLTIP = {
  background: "#0f172a",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  color: "#fff",
  fontSize: 12,
} as const;

function Metric({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-florence-teal/40 bg-florence-teal/10" : "border-white/10 bg-white/[0.03]"}`}>
      <p className={`text-2xl font-semibold tabular-nums ${accent ? "text-florence-teal" : "text-white"}`}>{value}</p>
      <p className="mt-0.5 text-xs font-medium text-white/60">{label}</p>
      {sub && <p className="text-[11px] text-white/40">{sub}</p>}
    </div>
  );
}

type DepositFilter = "all" | "paid" | "unpaid" | "pending";

function CandidatesPanel({ roster }: { roster: RosterRow[] }) {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<Stage | "all">("all");
  const [band, setBand] = useState<ReadinessBand | "all">("all");
  const [deposit, setDeposit] = useState<DepositFilter>("all");
  const [followUp, setFollowUp] = useState(false);
  const [selected, setSelected] = useState<RosterRow | null>(null);

  // Candidates worth a deposit nudge: enrolled-but-not-paid, excluding withdrawn.
  const isFollowUp = (r: RosterRow) => r.deposit.status !== "paid" && r.stage !== "withdrawn";
  const followUpCount = useMemo(() => roster.filter(isFollowUp).length, [roster]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roster.filter((r) => {
      if (followUp && !isFollowUp(r)) return false;
      if (stage !== "all" && r.stage !== stage) return false;
      if (band !== "all" && r.band !== band) return false;
      if (deposit === "paid" && r.deposit.status !== "paid") return false;
      if (deposit === "pending" && r.deposit.status !== "pending") return false;
      if (deposit === "unpaid" && r.deposit.status === "paid") return false;
      if (q && !`${r.name} ${r.country ?? ""} ${r.cohort ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [roster, query, stage, band, deposit, followUp]);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Candidates</h2>
          <p className="text-xs text-white/50">
            {filtered.length} of {roster.length} · click a row for candidate detail
          </p>
          {followUpCount > 0 && (
            <button
              type="button"
              onClick={() => setFollowUp((v) => !v)}
              aria-pressed={followUp}
              className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                followUp
                  ? "bg-amber-500 text-florence-ink"
                  : "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
              }`}
              title="Enrolled candidates without a paid deposit (excludes withdrawn)"
            >
              ⚑ {followUpCount} need a deposit follow-up{followUp ? " · on" : ""}
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name / country / cohort"
            className="ops-input w-56"
          />
          <select value={stage} onChange={(e) => setStage(e.target.value as Stage | "all")} className="ops-input w-auto">
            <option value="all">All stages</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>{STAGE_LABEL[s]}</option>
            ))}
          </select>
          <select value={band} onChange={(e) => setBand(e.target.value as ReadinessBand | "all")} className="ops-input w-auto">
            <option value="all">All readiness</option>
            {(["green", "yellow", "orange", "red", "none"] as ReadinessBand[]).map((b) => (
              <option key={b} value={b}>{BAND_LABEL[b]}</option>
            ))}
          </select>
          <select value={deposit} onChange={(e) => setDeposit(e.target.value as DepositFilter)} className="ops-input w-auto">
            <option value="all">All deposits</option>
            <option value="paid">Deposit paid</option>
            <option value="unpaid">Deposit unpaid</option>
            <option value="pending">Deposit pending</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/50">
              <th className="py-2 pr-4 font-medium">Candidate</th>
              <th className="py-2 pr-4 font-medium">Cohort</th>
              <th className="py-2 pr-4 font-medium">Stage</th>
              <th className="py-2 pr-4 font-medium">Readiness</th>
              <th className="py-2 pr-4 font-medium">Deposit</th>
              <th className="py-2 font-medium">Next best action</th>
            </tr>
          </thead>
          <tbody className="text-white/85">
            {filtered.map((r) => (
              <tr
                key={r.id}
                onClick={() => setSelected(r)}
                className="cursor-pointer border-b border-white/5 transition-colors hover:bg-white/[0.04]"
              >
                <td className="py-2.5 pr-4">
                  <span className="font-medium text-white">{r.name}</span>
                  {r.country && <span className="ml-2 text-xs text-white/40">{r.country}</span>}
                </td>
                <td className="py-2.5 pr-4 font-mono text-xs text-white/60">{r.cohort ?? "-"}</td>
                <td className="py-2.5 pr-4 text-white/70">{STAGE_LABEL[r.stage]}</td>
                <td className="py-2.5 pr-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: BAND_COLOR[r.band] }} />
                    <span className="tabular-nums text-white/70">
                      {r.readiness != null ? `${Math.round(r.readiness * 100)}%` : "-"}
                    </span>
                  </span>
                </td>
                <td className="py-2.5 pr-4">
                  {r.deposit.status === "paid" ? (
                    <span className="font-medium text-vital-ok">{depositAmount(r.deposit)}</span>
                  ) : r.deposit.status === "pending" ? (
                    <span className="text-amber-400">Pending</span>
                  ) : r.deposit.status === "failed" ? (
                    <span className="text-vital-danger">Failed</span>
                  ) : (
                    <span className="text-white/30">-</span>
                  )}
                </td>
                <td className="py-2.5 text-white/80">{r.nextAction}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-sm text-white/40">No candidates match.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && <CandidateDetail row={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

function CandidateDetail({ row, onClose }: { row: RosterRow; onClose: () => void }) {
  const needs = row.byClientNeed
    ? Object.entries(row.byClientNeed).sort((a, b) => a[1] - b[1])
    : [];
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-florence-ink p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-florence-teal">Candidate detail</p>
            <h3 className="mt-1 text-xl font-semibold text-white">{row.name}</h3>
            <p className="text-sm text-white/50">
              {[row.country, row.cohort, STAGE_LABEL[row.stage]].filter(Boolean).join(" · ")}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/15 px-2.5 py-1 text-sm text-white/60 hover:bg-white/10">
            ✕
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-florence-teal/30 bg-florence-teal/10 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-florence-teal">Next best action</p>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/80">
              {ROUTE_LABEL[row.route]}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-white">{row.nextAction}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <DetailStat label="Readiness band" value={BAND_LABEL[row.band]} dot={BAND_COLOR[row.band]} />
          <DetailStat label="Projected pass" value={row.readiness != null ? `${Math.round(row.readiness * 100)}%` : "-"} />
          <DetailStat label="Assessments" value={String(row.assessmentsCount)} />
          <DetailStat
            label="Seat deposit"
            value={
              row.deposit.status === "paid"
                ? `${depositAmount(row.deposit)} paid`
                : row.deposit.status === "pending"
                  ? "Pending"
                  : row.deposit.status === "failed"
                    ? "Failed"
                    : "Not started"
            }
            dot={DEPOSIT_DOT[row.deposit.status]}
          />
        </div>

        {row.focusAreas.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Focus next</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {row.focusAreas.map((f) => (
                <span key={f} className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/85">
                  {needLabel(f)}
                </span>
              ))}
            </div>
          </div>
        )}

        {needs.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">By client need (latest)</p>
            <div className="space-y-1.5">
              {needs.map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="w-40 shrink-0 truncate text-xs text-white/70">{needLabel(k)}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                    <span className="block h-full rounded-full bg-florence-teal" style={{ width: `${Math.round(v * 100)}%` }} />
                  </span>
                  <span className="w-9 shrink-0 text-right text-xs tabular-nums text-white/60">{Math.round(v * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {row.history.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Assessment history</p>
            <ul className="space-y-1.5">
              {row.history.map((h, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-1.5 text-sm">
                  <span className="text-white/70">{h.kind ?? "assessment"}</span>
                  <span className="tabular-nums text-white/85">
                    {h.readiness != null ? `${Math.round(h.readiness * 100)}%` : "-"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailStat({ label, value, dot }: { label: string; value: string; dot?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
        {dot && <span className="h-2 w-2 rounded-full" style={{ background: dot }} />}
        {value}
      </p>
      <p className="text-[11px] text-white/50">{label}</p>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-white/50">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function ConnectForm({ onConnected }: { onConnected: () => void }) {
  const [base, setBase] = useState("http://localhost:8088");
  const [clientId, setClientId] = useState("demo-crm");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await connect(base.trim(), clientId.trim(), secret);
      onConnected();
    } catch (err) {
      setError(err instanceof OpsError ? err.message : "Connection failed");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-[80vh] max-w-md place-items-center px-5">
      <form onSubmit={onSubmit} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-florence-teal">
          FlorenceRN · Internal
        </p>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-white">Control Tower</h1>
        <p className="mt-1 text-sm text-white/50">
          Operator access. Sign in with your FlorenceRN account (one login across the platform),
          or connect a read-scoped API client.
        </p>
        <button
          type="button"
          onClick={async () => {
            if (await connectViaCore()) onConnected();
            else window.location.href = coreLoginUrl();
          }}
          className="mt-5 w-full rounded-xl bg-florence-teal px-5 py-2.5 text-sm font-semibold text-florence-ink transition-colors hover:bg-florence-teal/90"
        >
          Sign in with FlorenceRN
        </button>
        <p className="mt-4 mb-1 text-center text-[11px] uppercase tracking-wider text-white/30">or connect an API client</p>
        <div className="mt-1 space-y-3">
          <OpsField label="API base URL">
            <input value={base} onChange={(e) => setBase(e.target.value)} className="ops-input" />
          </OpsField>
          <OpsField label="Client ID">
            <input value={clientId} onChange={(e) => setClientId(e.target.value)} className="ops-input" />
          </OpsField>
          <OpsField label="Client secret">
            <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} className="ops-input" placeholder="••••••••" />
          </OpsField>
          {error && <p className="rounded-lg bg-vital-danger/15 px-3 py-2 text-sm text-vital-danger">{error}</p>}
          <button
            type="submit"
            disabled={busy || !secret}
            className="w-full rounded-xl bg-florence-teal px-5 py-2.5 text-sm font-semibold text-florence-ink transition-colors hover:bg-florence-teal/90 disabled:opacity-50"
          >
            {busy ? "Connecting…" : "Connect"}
          </button>
        </div>
      </form>
    </div>
  );
}

function OpsField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-white/60">{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-florence-ink">{children}</div>;
}
