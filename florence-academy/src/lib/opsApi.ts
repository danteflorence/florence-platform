// ───────────────────────────────────────────────────────────────────────────
// Internal Ops console data layer (Control Tower).
//
// INTERNAL ONLY. This surface is for Florence operators, not learners or
// partners. It authenticates with an M2M client (read scopes only) entered at
// runtime and held in sessionStorage - never baked into the bundle. It reads the
// production funnel and computes operator metrics (incl. expected ARR) that must
// NEVER appear on any candidate / employer / university surface.
// ───────────────────────────────────────────────────────────────────────────

import { apiBaseUrl } from "./academyAuth";

export interface OpsCandidate {
  id: string;
  full_name: string;
  country?: string;
  created_at: string;
}
export interface OpsEnrollment {
  id: string;
  candidate_id: string;
  cohort: string;
  status: "registered" | "deposit_paid" | "attending" | "completed" | "withdrawn";
  created_at: string;
}
export interface OpsPayment {
  id: string;
  candidate_id: string;
  kind: string;
  amount_cents: number;
  currency: string;
  status: string;
}
export interface OpsAssessment {
  id: string;
  candidate_id: string;
  kind?: string;
  readiness?: number;
  theta?: number;
  items_completed?: number;
  by_client_need?: Record<string, number>;
  created_at: string;
}
export interface OpsCohort {
  id: string;
  code: string;
  name: string;
  capacity?: number;
  status: string;
}

export interface OpsData {
  candidates: OpsCandidate[];
  enrollments: OpsEnrollment[];
  payments: OpsPayment[];
  assessments: OpsAssessment[];
  cohorts: OpsCohort[];
}

const TOKEN_KEY = "fl_ops_token";
const BASE_KEY = "fl_ops_base";

// Operator-tunable financial assumptions (clearly surfaced in the UI).
export const MONTHLY_SHARE_USD = 1418;
export const TERM_MONTHS = 24;

export const STAGES = ["registered", "deposit_paid", "attending", "completed", "withdrawn"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  registered: "Registered",
  deposit_paid: "Deposit paid",
  attending: "Attending",
  completed: "Completed",
  withdrawn: "Withdrawn",
};

// Probability a candidate at each stage becomes a billable RN start (the forecast
// model - rules + assumptions now, outcome-trained later).
const START_PROB: Record<Stage, number> = {
  registered: 0.1,
  deposit_paid: 0.3,
  attending: 0.6,
  completed: 0.9,
  withdrawn: 0,
};

export type ReadinessBand = "none" | "red" | "orange" | "yellow" | "green";
export function bandFromReadiness(r: number | undefined): ReadinessBand {
  if (r === undefined || !Number.isFinite(r)) return "none";
  if (r >= 0.8) return "green";
  if (r >= 0.65) return "yellow";
  if (r >= 0.5) return "orange";
  return "red";
}

export class OpsError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "OpsError";
  }
}

export interface OpsSession {
  token: string | null;
  base: string | null;
}
export function opsSession(): OpsSession {
  try {
    return { token: sessionStorage.getItem(TOKEN_KEY), base: sessionStorage.getItem(BASE_KEY) };
  } catch {
    return { token: null, base: null };
  }
}
const CORE_KEY = "fl_ops_core";
const CORE_URL = (import.meta.env as Record<string, string | undefined>)["VITE_CORE_URL"] ?? "http://id.lvh.me:8080";

export function opsDisconnect(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(BASE_KEY);
    sessionStorage.removeItem(CORE_KEY);
  } catch {
    /* ignore */
  }
}

/** True when connected - via the shared FlorenceRN Core staff cookie OR an M2M token. */
export function opsConnected(): boolean {
  try {
    return !!(sessionStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(CORE_KEY));
  } catch {
    return false;
  }
}

/** Core login URL that returns to the Control Tower. */
export function coreLoginUrl(): string {
  return `${CORE_URL}/login?redirect=${encodeURIComponent(location.href)}`;
}

/** Connect with the shared FlorenceRN Core staff cookie - no pasted credentials.
 *  Returns true when the cookie carries an ops/staff role. */
export async function connectViaCore(): Promise<boolean> {
  const base = apiBaseUrl();
  if (!base) return false;
  try {
    const r = await fetch(`${base}/v1/session`, { credentials: "include" });
    const s = (await r.json()) as { staff?: boolean };
    if (s?.staff) {
      try {
        sessionStorage.setItem(BASE_KEY, base);
        sessionStorage.setItem(CORE_KEY, "1");
      } catch {
        /* ignore */
      }
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** Exchange operator client credentials for a read-only token (least privilege). */
export async function connect(base: string, clientId: string, secret: string): Promise<void> {
  const root = base.replace(/\/$/, "");
  let res: Response;
  try {
    res = await fetch(`${root}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: secret,
        scope: "candidates:read enrollment:read performance:read payments:read outcomes:read schools:read cohorts:read leads:read leads:write outreach:read outreach:write",
      }),
    });
  } catch {
    throw new OpsError(0, "Could not reach the API. Check the base URL.");
  }
  const j = (await res.json().catch(() => null)) as { access_token?: string } | null;
  if (!res.ok || !j?.access_token) throw new OpsError(res.status, "Invalid credentials or scope.");
  try {
    sessionStorage.setItem(TOKEN_KEY, j.access_token);
    sessionStorage.setItem(BASE_KEY, root);
  } catch {
    /* ignore */
  }
}

async function listAll<T>(path: string): Promise<T[]> {
  const { token, base } = opsSession();
  if (!base) throw new OpsError(401, "not connected");
  const out: T[] = [];
  let cursor: string | undefined;
  do {
    const url = new URL(`${base}${path}`);
    url.searchParams.set("limit", "200");
    if (cursor) url.searchParams.set("cursor", cursor);
    const res = await fetch(url.toString(), { credentials: "include", headers: token ? { authorization: `Bearer ${token}` } : {} });
    if (res.status === 401) throw new OpsError(401, "session expired");
    if (!res.ok) throw new OpsError(res.status, `failed to load ${path}`);
    const j = (await res.json()) as { data: T[]; next_cursor: string | null };
    out.push(...j.data);
    cursor = j.next_cursor ?? undefined;
  } while (cursor);
  return out;
}

export interface CohortCopilot {
  cohort: string;
  candidates: number;
  band_counts: Record<ReadinessBand, number>;
  avg_readiness: number | null;
  fallers: { candidate_id: string; full_name?: string; band: ReadinessBand; readiness?: number }[];
  top_reteach: { client_need: string; mean_score: number }[];
  groups: { client_need: string; candidate_ids: string[] }[];
  routing: Record<RouteClass, string[]>;
  generated_at: string;
}

export async function fetchCohortCopilot(code: string): Promise<CohortCopilot> {
  const { token, base } = opsSession();
  if (!base) throw new OpsError(401, "not connected");
  const res = await fetch(`${base}/v1/cohorts/${encodeURIComponent(code)}/copilot`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new OpsError(401, "session expired");
  if (!res.ok) throw new OpsError(res.status, "failed to load copilot");
  return (await res.json()) as CohortCopilot;
}

export interface OutcomeFunnel {
  nclex_pass: number;
  nclex_fail: number;
  att_issued: number;
  licensure: number;
  employer_offered: number;
  offer_accepted: number;
  start: number;
  retained_90d: number;
  repayment_active: number;
}

export interface AttendanceRollup {
  total_records: number;
  attended: number;
  attendance_rate: number;
  live_lab_attendees: number;
  by_location: { location: string; attendees: number }[];
}

// ── University Affiliate Network (ops view) ──────────────────────────────────

export interface OutreachReadyRow {
  slug: string;
  name: string;
  country: string;
  tier: "eligible" | "affiliate" | "lab_partner";
  outreach_status: string;
  affiliated: number;
  sponsored_access_activations: number;
  avg_readiness: number | null;
}

export async function fetchOutreachReady(): Promise<OutreachReadyRow[]> {
  const { token, base } = opsSession();
  if (!base) throw new OpsError(401, "not connected");
  const res = await fetch(`${base}/v1/outreach/ready`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new OpsError(401, "session expired");
  if (!res.ok) throw new OpsError(res.status, "failed to load outreach list");
  const j = (await res.json()) as { data: OutreachReadyRow[] };
  return j.data ?? [];
}

export interface SchoolReportSuppressed {
  school: { slug: string; name: string; country: string; tier: string };
  k_floor: number;
  suppressed_for_privacy: true;
  participation: { affiliated: number; verified: number; sponsored_access_activations: number };
}

export interface SchoolReportFull {
  school: { slug: string; name: string; country: string; tier: string };
  k_floor: number;
  suppressed_for_privacy: false;
  ranges_mode: boolean;
  participation: { affiliated: number; verified: number; sponsored_access_activations: number };
  band_distribution: Record<string, number | string>;
  top_gaps: { client_need: string; mean_score: number }[];
}

export type SchoolReport = SchoolReportSuppressed | SchoolReportFull;

export async function fetchSchoolReport(slug: string): Promise<SchoolReport> {
  const { token, base } = opsSession();
  if (!base) throw new OpsError(401, "not connected");
  const res = await fetch(`${base}/v1/schools/${encodeURIComponent(slug)}/report`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new OpsError(401, "session expired");
  if (!res.ok) throw new OpsError(res.status, "failed to load school report");
  return (await res.json()) as SchoolReport;
}

export async function fetchAttendanceRollup(): Promise<AttendanceRollup> {
  const { token, base } = opsSession();
  if (!base) throw new OpsError(401, "not connected");
  const res = await fetch(`${base}/v1/attendance/rollup`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new OpsError(401, "session expired");
  if (!res.ok) throw new OpsError(res.status, "failed to load attendance rollup");
  return (await res.json()) as AttendanceRollup;
}

export async function fetchOutcomeFunnel(): Promise<OutcomeFunnel> {
  const { token, base } = opsSession();
  if (!base) throw new OpsError(401, "not connected");
  const res = await fetch(`${base}/v1/outcomes/funnel`, { credentials: "include", headers: token ? { authorization: `Bearer ${token}` } : {} });
  if (res.status === 401) throw new OpsError(401, "session expired");
  if (!res.ok) throw new OpsError(res.status, "failed to load outcomes funnel");
  return (await res.json()) as OutcomeFunnel;
}

// ── Weekly Production Review (role-scoped cohort memo) ───────────────────────
export type ReviewRole = "management" | "investor" | "employer" | "university";
export const REVIEW_ROLES: ReviewRole[] = ["management", "investor", "employer", "university"];
export interface ReviewRow {
  label: string;
  value: string;
  roles: ReviewRole[];
}
export interface ProductionReview {
  cohort: string;
  rows: ReviewRow[];
  topGaps: string[];
  generatedAt: string;
}

const ALL: ReviewRole[] = ["management", "investor", "employer", "university"];
const MGMT_INV: ReviewRole[] = ["management", "investor"];

export function buildProductionReview(
  cohort: CohortRow,
  copilot: CohortCopilot,
  funnel: OutcomeFunnel,
  generatedAt: string,
): ProductionReview {
  const bc = copilot.band_counts;
  const arr = Math.round(cohort.expectedStarts * MONTHLY_SHARE_USD * 12);
  const rows: ReviewRow[] = [
    { label: "Cohort size", value: String(copilot.candidates), roles: ALL },
    { label: "Active access", value: String(cohort.accessActivations), roles: MGMT_INV },
    { label: "Readiness (G/Y/O/R)", value: `${bc.green} / ${bc.yellow} / ${bc.orange} / ${bc.red}`, roles: ALL },
    { label: "Avg readiness", value: copilot.avg_readiness != null ? `${Math.round(copilot.avg_readiness * 100)}%` : "-", roles: ALL },
    { label: "Readiness-cleared", value: String(cohort.readinessCleared), roles: ALL },
    { label: "Interview-ready", value: String(copilot.routing.interview_ready.length), roles: ALL },
    { label: "Repeat / bridge / repair", value: `${copilot.routing.repeat.length} / ${copilot.routing.bridge.length} / ${copilot.routing.credential_repair.length}`, roles: ["management", "university"] },
    { label: "Expected starts", value: String(cohort.expectedStarts), roles: ALL },
    { label: "Expected ARR", value: `$${arr.toLocaleString()}`, roles: MGMT_INV },
    { label: "Program outcomes to date (pass / starts / repaying)", value: `${funnel.nclex_pass} / ${funnel.start} / ${funnel.repayment_active}`, roles: MGMT_INV },
    { label: "Operational blockers (falling behind)", value: String(copilot.fallers.length), roles: ["management"] },
    { label: "Faculty notes", value: "-", roles: ALL },
  ];
  return {
    cohort: cohort.code,
    rows,
    topGaps: copilot.top_reteach.map((t) => needLabel(t.client_need)),
    generatedAt,
  };
}

/** Render a role's view of the review as plain text (for copy/send). */
export function reviewToText(review: ProductionReview, role: ReviewRole): string {
  const lines = [
    `Production Review - ${review.cohort} - ${role}`,
    review.generatedAt.slice(0, 10),
    "",
    ...review.rows.filter((r) => r.roles.includes(role)).map((r) => `${r.label}: ${r.value}`),
  ];
  if (review.topGaps.length) lines.push("", `Top gaps to reteach: ${review.topGaps.join(", ")}`);
  return lines.join("\n");
}

export async function loadOpsData(): Promise<OpsData> {
  const [candidates, enrollments, payments, assessments, cohorts] = await Promise.all([
    listAll<OpsCandidate>("/v1/candidates"),
    listAll<OpsEnrollment>("/v1/enrollments"),
    listAll<OpsPayment>("/v1/payments"),
    listAll<OpsAssessment>("/v1/assessment-results"),
    listAll<OpsCohort>("/v1/cohorts"),
  ]);
  return { candidates, enrollments, payments, assessments, cohorts };
}

// ── derived metrics ──────────────────────────────────────────────────────────

export interface CohortRow {
  code: string;
  name: string;
  candidates: number;
  accessActivations: number;
  readinessCleared: number;
  expectedStarts: number;
}

export interface OpsMetrics {
  totalCandidates: number;
  byStage: Record<Stage, number>;
  accessPaid: number;
  accessCollectedUsd: number;
  assessed: number;
  readinessCleared: number;
  bandCounts: Record<ReadinessBand, number>;
  avgReadiness: number | null;
  expectedStarts: number;
  expectedArrUsd: number;
  startsByMonth: { month: string; starts: number }[];
  cohorts: CohortRow[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Parse a trailing YYYY-MM out of a cohort code → "Jul 2026". */
export function monthFromCode(code: string): string | null {
  const m = code.match(/(\d{4})-(\d{2})/);
  if (!m) return null;
  const y = m[1];
  const mi = Math.min(11, Math.max(0, parseInt(m[2]!, 10) - 1));
  return `${MONTHS[mi]} ${y}`;
}

export function computeMetrics(data: OpsData): OpsMetrics {
  const { candidates, enrollments, payments, assessments, cohorts } = data;

  // Latest enrollment per candidate.
  const enrByCand = new Map<string, OpsEnrollment>();
  for (const e of enrollments) {
    const prev = enrByCand.get(e.candidate_id);
    if (!prev || e.created_at > prev.created_at) enrByCand.set(e.candidate_id, e);
  }
  // Latest assessment (readiness) per candidate.
  const latestAsr = new Map<string, OpsAssessment>();
  for (const a of assessments) {
    const prev = latestAsr.get(a.candidate_id);
    if (!prev || a.created_at > prev.created_at) latestAsr.set(a.candidate_id, a);
  }

  const byStage: Record<Stage, number> = {
    registered: 0, deposit_paid: 0, attending: 0, completed: 0, withdrawn: 0,
  };
  for (const c of candidates) {
    const stage = enrByCand.get(c.id)?.status ?? "registered";
    byStage[stage] += 1;
  }

  const paidAccess = payments.filter(
    (p) => (p.kind === "global_live_access" || p.kind === "commitment_deposit") && p.status === "paid",
  );
  const accessCollectedUsd = paidAccess.reduce((s, p) => s + p.amount_cents, 0) / 100;

  const bandCounts: Record<ReadinessBand, number> = { none: 0, red: 0, orange: 0, yellow: 0, green: 0 };
  let readinessSum = 0;
  let assessed = 0;
  for (const c of candidates) {
    const a = latestAsr.get(c.id);
    const band = bandFromReadiness(a?.readiness);
    bandCounts[band] += 1;
    if (a?.readiness !== undefined) {
      assessed += 1;
      readinessSum += a.readiness;
    }
  }
  const readinessCleared = bandCounts.green + bandCounts.yellow;
  const avgReadiness = assessed > 0 ? readinessSum / assessed : null;

  // Forecast: weighted expected starts, by candidate, grouped by cohort month.
  const monthMap = new Map<string, number>();
  const cohortAgg = new Map<string, CohortRow>();
  for (const ch of cohorts) {
    cohortAgg.set(ch.code, {
      code: ch.code, name: ch.name, candidates: 0, accessActivations: 0, readinessCleared: 0, expectedStarts: 0,
    });
  }
  let expectedStarts = 0;
  for (const c of candidates) {
    const enr = enrByCand.get(c.id);
    const stage = enr?.status ?? "registered";
    const contrib = START_PROB[stage];
    expectedStarts += contrib;
    const code = enr?.cohort;
    if (code) {
      const month = monthFromCode(code);
      if (month) monthMap.set(month, (monthMap.get(month) ?? 0) + contrib);
      const row = cohortAgg.get(code);
      if (row) {
        row.candidates += 1;
        row.expectedStarts += contrib;
        if (bandFromReadiness(latestAsr.get(c.id)?.readiness) === "green" ||
            bandFromReadiness(latestAsr.get(c.id)?.readiness) === "yellow") row.readinessCleared += 1;
        if (stage === "deposit_paid" || stage === "attending" || stage === "completed") row.accessActivations += 1;
      }
    }
  }

  const startsByMonth = [...monthMap.entries()]
    .map(([month, starts]) => ({ month, starts: Math.round(starts * 10) / 10 }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const expectedArrUsd = expectedStarts * MONTHLY_SHARE_USD * 12;

  const cohortRows = [...cohortAgg.values()]
    .filter((r) => r.candidates > 0)
    .map((r) => ({ ...r, expectedStarts: Math.round(r.expectedStarts * 10) / 10 }))
    .sort((a, b) => b.candidates - a.candidates);

  return {
    totalCandidates: candidates.length,
    byStage,
    accessPaid: paidAccess.length,
    accessCollectedUsd,
    assessed,
    readinessCleared,
    bandCounts,
    avgReadiness,
    expectedStarts: Math.round(expectedStarts * 10) / 10,
    expectedArrUsd: Math.round(expectedArrUsd),
    startsByMonth,
    cohorts: cohortRows,
  };
}

// ── per-candidate roster + readiness passport (the drill-down) ───────────────

/** NCSBN client-need display labels (kept local so opsApi stays standalone). */
export const NEED_LABEL: Record<string, string> = {
  "management-of-care": "Management of Care",
  "safety-infection-control": "Safety & Infection Control",
  "health-promotion": "Health Promotion",
  "psychosocial-integrity": "Psychosocial Integrity",
  "basic-care-comfort": "Basic Care & Comfort",
  "pharmacological-therapies": "Pharmacological Therapies",
  "reduction-of-risk": "Reduction of Risk",
  "physiological-adaptation": "Physiological Adaptation",
};
export const needLabel = (key: string): string => NEED_LABEL[key] ?? key;

export interface AssessmentHistoryEntry {
  kind?: string;
  readiness?: number;
  created_at: string;
}

export type DepositStatus = "paid" | "pending" | "failed" | "none";
export interface DepositInfo {
  status: DepositStatus;
  amountCents?: number;
  currency?: string;
}

export type RouteClass =
  | "interview_ready"
  | "repeat"
  | "bridge"
  | "credential_repair"
  | "in_progress";

export const ROUTE_LABEL: Record<RouteClass, string> = {
  interview_ready: "Interview-ready",
  repeat: "Repeat Academy",
  bridge: "Bridge pathway",
  credential_repair: "Credential repair",
  in_progress: "In progress",
};

/** Day-5 readiness routing from the band (mirrors the API). */
export function routeFromBand(band: ReadinessBand): RouteClass {
  switch (band) {
    case "green":
      return "interview_ready";
    case "yellow":
      return "repeat";
    case "orange":
      return "bridge";
    case "red":
      return "credential_repair";
    default:
      return "in_progress";
  }
}

export interface RosterRow {
  id: string;
  name: string;
  country?: string;
  cohort?: string;
  stage: Stage;
  band: ReadinessBand;
  route: RouteClass;
  readiness?: number;
  depositPaid: boolean;
  deposit: DepositInfo;
  assessmentsCount: number;
  /** Weakest client-need keys, lowest score first. */
  focusAreas: string[];
  expectedStart: number;
  lastActivity?: string;
  nextAction: string;
  // detail (powers the drill-down panel)
  theta?: number;
  itemsCompleted?: number;
  byClientNeed?: Record<string, number>;
  history: AssessmentHistoryEntry[];
}

/** The "next best action" heuristic - rules now, outcome-tuned later. */
export function nextBestAction(
  stage: Stage,
  band: ReadinessBand,
  depositPaid: boolean,
  topFocusLabel: string | undefined,
): string {
  if (stage === "withdrawn") return "Withdrawn - re-engage or archive";
  if (band === "none") return "Assign a baseline diagnostic";
  if (band === "red" || band === "orange")
    return topFocusLabel ? `Remediation - ${topFocusLabel}` : "Assign remediation";
  if (stage === "registered" && !depositPaid) return "Follow up on Global Live access";
  if (band === "green" && (stage === "attending" || stage === "completed"))
    return "Route to employer interview";
  if (band === "yellow")
    return topFocusLabel ? `Targeted review - ${topFocusLabel}` : "Targeted review";
  return "On track";
}

export function buildRoster(data: OpsData): RosterRow[] {
  const { candidates, enrollments, payments, assessments } = data;

  const enrByCand = new Map<string, OpsEnrollment>();
  for (const e of enrollments) {
    const prev = enrByCand.get(e.candidate_id);
    if (!prev || e.created_at > prev.created_at) enrByCand.set(e.candidate_id, e);
  }
  const asrByCand = new Map<string, OpsAssessment[]>();
  for (const a of assessments) {
    const arr = asrByCand.get(a.candidate_id) ?? [];
    arr.push(a);
    asrByCand.set(a.candidate_id, arr);
  }
  // Best access payment per candidate (paid > pending > failed), with amount/currency.
  const depositByCand = new Map<string, DepositInfo>();
  const rank = (s: DepositStatus) => (s === "paid" ? 3 : s === "pending" ? 2 : s === "failed" ? 1 : 0);
  for (const p of payments) {
    if (p.kind !== "global_live_access" && p.kind !== "commitment_deposit") continue;
    const status: DepositStatus =
      p.status === "paid" ? "paid" : p.status === "pending" ? "pending" : p.status === "failed" ? "failed" : "none";
    const cur = depositByCand.get(p.candidate_id);
    if (!cur || rank(status) > rank(cur.status)) {
      depositByCand.set(p.candidate_id, { status, amountCents: p.amount_cents, currency: p.currency });
    }
  }

  const rows: RosterRow[] = candidates.map((c) => {
    const enr = enrByCand.get(c.id);
    const stage: Stage = enr?.status ?? "registered";
    const asrs = (asrByCand.get(c.id) ?? []).slice().sort((a, b) => a.created_at.localeCompare(b.created_at));
    const latest = asrs[asrs.length - 1];
    const latestWithNeeds = [...asrs].reverse().find((a) => a.by_client_need && Object.keys(a.by_client_need).length > 0);
    const byClientNeed = latestWithNeeds?.by_client_need;
    const focusAreas = byClientNeed
      ? Object.entries(byClientNeed).sort((a, b) => a[1] - b[1]).slice(0, 3).map(([k]) => k)
      : [];
    const band = bandFromReadiness(latest?.readiness);
    const deposit = depositByCand.get(c.id) ?? { status: "none" as const };
    const depositPaid = deposit.status === "paid";
    const topFocusLabel = focusAreas[0] ? needLabel(focusAreas[0]) : undefined;

    return {
      id: c.id,
      name: c.full_name,
      country: c.country,
      cohort: enr?.cohort,
      stage,
      band,
      route: routeFromBand(band),
      readiness: latest?.readiness,
      depositPaid,
      deposit,
      assessmentsCount: asrs.length,
      focusAreas,
      expectedStart: START_PROB[stage],
      lastActivity: latest?.created_at,
      nextAction: nextBestAction(stage, band, depositPaid, topFocusLabel),
      theta: latest?.theta,
      itemsCompleted: latest?.items_completed,
      byClientNeed,
      history: [...asrs]
        .reverse()
        .map((a) => ({ kind: a.kind, readiness: a.readiness, created_at: a.created_at })),
    };
  });

  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

// ── Leads (Florence core nurse pipeline mirror) ─────────────────────────────
export interface OpsLead {
  id: string;
  email: string;
  external_id?: string;
  firstname?: string;
  lastname?: string;
  fullname?: string;
  country?: string;
  phone?: string;
  job_unit?: string;
  type?: "Imported Lead" | "User" | "Student Lead";
  nclex_status?: "Passed" | "Not Passed" | "Authorized" | "Planned" | "Not_planned";
  application_status?: "not_applied" | "applied_not_accepted" | "accepted" | "draft";
  evaluation_status?: "N/A" | "has_copy" | "never_received" | "no_access";
  assigned?: string;
  signup_at?: string;
  school_slug?: string;
  source: string;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}
export interface OpsLeadEvent {
  id: string;
  lead_id: string;
  kind: "imported" | "status_change" | "merged" | "manual_edit";
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  source: string;
  actor: string;
  occurred_at: string;
}
export interface OpsLeadRollup {
  total: number;
  by_country: Record<string, number>;
  by_type: Record<string, number>;
  by_nclex_status: Record<string, number>;
  by_application_status: Record<string, number>;
}

export interface OpsLeadFilters {
  country?: string;
  type?: OpsLead["type"];
  nclex_status?: OpsLead["nclex_status"];
  application_status?: OpsLead["application_status"];
  q?: string;
}

/** Paginated lead list, server-filtered. Up to `limit` per call. */
export async function fetchLeads(
  filters: OpsLeadFilters,
  cursor: string | undefined,
  limit = 100,
): Promise<{ data: OpsLead[]; next_cursor: string | null }> {
  const { token, base } = opsSession();
  if (!base) throw new OpsError(401, "not connected");
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  if (filters.country) params.set("country", filters.country);
  if (filters.type) params.set("type", filters.type);
  if (filters.nclex_status) params.set("nclex_status", filters.nclex_status);
  if (filters.application_status)
    params.set("application_status", filters.application_status);
  if (filters.q) params.set("q", filters.q);
  const res = await fetch(`${base}/v1/leads?${params.toString()}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new OpsError(401, "session expired");
  if (!res.ok) throw new OpsError(res.status, "leads list failed");
  return (await res.json()) as { data: OpsLead[]; next_cursor: string | null };
}

export async function fetchLeadRollup(): Promise<OpsLeadRollup> {
  const { token, base } = opsSession();
  if (!base) throw new OpsError(401, "not connected");
  const res = await fetch(`${base}/v1/leads/rollup`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new OpsError(res.status, "leads rollup failed");
  return (await res.json()) as OpsLeadRollup;
}

export async function fetchLead(
  id: string,
): Promise<{ lead: OpsLead; events: OpsLeadEvent[] }> {
  const { token, base } = opsSession();
  if (!base) throw new OpsError(401, "not connected");
  const res = await fetch(`${base}/v1/leads/${encodeURIComponent(id)}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new OpsError(res.status, "lead not found");
  return (await res.json()) as { lead: OpsLead; events: OpsLeadEvent[] };
}

export async function fetchRecentLeadEvents(
  sinceIso: string | undefined,
  limit = 100,
): Promise<OpsLeadEvent[]> {
  const { token, base } = opsSession();
  if (!base) throw new OpsError(401, "not connected");
  const params = new URLSearchParams({ limit: String(limit) });
  if (sinceIso) params.set("since", sinceIso);
  const res = await fetch(`${base}/v1/leads/events/recent?${params.toString()}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new OpsError(res.status, "recent events failed");
  const j = (await res.json()) as { data: OpsLeadEvent[] };
  return j.data ?? [];
}

// ── Outreach (Lob print + mail) ──────────────────────────────────────────────
export interface OpsCampaign {
  id: string;
  name: string;
  kind: "university" | "nursing_association" | "employer" | "hospital";
  mail_format: "postcard_6x11" | "letter_us";
  status: "draft" | "queued" | "sending" | "sent" | "completed" | "cancelled";
  theme: "teal" | "purple";
  notes?: string;
  totals: { targets: number; sent: number; delivered: number; activated: number };
  created_at: string;
  updated_at: string;
}

export interface OpsTarget {
  id: string;
  campaign_id: string;
  school_slug?: string;
  org_name: string;
  recipient_name?: string;
  recipient_title?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
  activation_code: string;
  status:
    | "queued"
    | "rendered"
    | "sent"
    | "in_transit"
    | "delivered"
    | "returned"
    | "activated"
    | "declined";
  contact_notes?: string;
  sent_at?: string;
  delivered_at?: string;
  activated_at?: string;
}

export interface OpsMailPiece {
  id: string;
  target_id: string;
  campaign_id: string;
  lob_id?: string;
  format: "postcard_6x11" | "letter_us";
  mode: "test" | "live";
  status: string;
  cost_cents?: number;
  preview_url?: string;
  sent_at?: string;
  delivered_at?: string;
}

export async function fetchCampaigns(): Promise<OpsCampaign[]> {
  const { token, base } = opsSession();
  if (!base) throw new OpsError(401, "not connected");
  const res = await fetch(`${base}/v1/outreach/campaigns`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new OpsError(res.status, "campaigns list failed");
  const j = (await res.json()) as { data: OpsCampaign[] };
  return j.data;
}

export async function fetchCampaign(
  id: string,
): Promise<{ campaign: OpsCampaign; targets: OpsTarget[]; pieces: OpsMailPiece[] }> {
  const { token, base } = opsSession();
  if (!base) throw new OpsError(401, "not connected");
  const res = await fetch(`${base}/v1/outreach/campaigns/${encodeURIComponent(id)}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new OpsError(res.status, "campaign get failed");
  return (await res.json()) as { campaign: OpsCampaign; targets: OpsTarget[]; pieces: OpsMailPiece[] };
}

export async function createCampaign(input: {
  name: string;
  kind: OpsCampaign["kind"];
  mail_format: OpsCampaign["mail_format"];
  theme?: OpsCampaign["theme"];
  notes?: string;
}): Promise<OpsCampaign> {
  const { token, base } = opsSession();
  if (!base) throw new OpsError(401, "not connected");
  const res = await fetch(`${base}/v1/outreach/campaigns`, {
    method: "POST",
    credentials: "include", headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new OpsError(res.status, "campaign create failed");
  return (await res.json()) as OpsCampaign;
}

export interface AddTargetInput {
  school_slug?: string;
  org_name: string;
  recipient_name?: string;
  recipient_title?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
  contact_notes?: string;
}

export async function addCampaignTargets(
  campaignId: string,
  targets: AddTargetInput[],
): Promise<{ added: number; targets: OpsTarget[]; errors: { index: number; message: string }[] }> {
  const { token, base } = opsSession();
  if (!base) throw new OpsError(401, "not connected");
  const res = await fetch(`${base}/v1/outreach/campaigns/${encodeURIComponent(campaignId)}/targets`, {
    method: "POST",
    credentials: "include", headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), "content-type": "application/json" },
    body: JSON.stringify({ targets }),
  });
  if (!res.ok) throw new OpsError(res.status, "targets add failed");
  return (await res.json()) as { added: number; targets: OpsTarget[]; errors: { index: number; message: string }[] };
}

export async function previewMailpiece(
  campaignId: string,
  targetId: string,
  tone: "quote" | "market" = "market",
): Promise<{
  format: string;
  activation_url: string;
  front: string;
  back: string;
}> {
  const { token, base } = opsSession();
  if (!base) throw new OpsError(401, "not connected");
  const res = await fetch(`${base}/v1/outreach/campaigns/${encodeURIComponent(campaignId)}/preview`, {
    method: "POST",
    credentials: "include", headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), "content-type": "application/json" },
    body: JSON.stringify({ target_id: targetId, tone }),
  });
  if (!res.ok) throw new OpsError(res.status, "preview failed");
  return (await res.json()) as { format: string; activation_url: string; front: string; back: string };
}

export interface SendInput {
  target_ids: string[];
  api_key: string;
  from: {
    name?: string;
    company?: string;
    address_line1: string;
    address_city: string;
    address_state?: string;
    address_zip: string;
    address_country: string;
  };
  tone?: "quote" | "market";
}
export interface SendResult {
  campaign_id: string;
  mode: "test" | "live";
  results: Array<{
    target_id: string;
    ok: boolean;
    mail_piece_id?: string;
    lob_id?: string;
    error?: string;
  }>;
}
export async function sendCampaign(
  campaignId: string,
  input: SendInput,
): Promise<SendResult> {
  const { token, base } = opsSession();
  if (!base) throw new OpsError(401, "not connected");
  const res = await fetch(`${base}/v1/outreach/campaigns/${encodeURIComponent(campaignId)}/send`, {
    method: "POST",
    credentials: "include", headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new OpsError(res.status, body?.error?.message ?? "send failed");
  }
  return (await res.json()) as SendResult;
}

export async function approveActivation(code: string): Promise<{ code: string; status: string }> {
  const { token, base } = opsSession();
  if (!base) throw new OpsError(401, "not connected");
  const res = await fetch(`${base}/v1/activation/${encodeURIComponent(code)}/approve`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new OpsError(res.status, "approve failed");
  return (await res.json()) as { code: string; status: string };
}
