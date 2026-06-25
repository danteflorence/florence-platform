// ───────────────────────────────────────────────────────────────────────────
// Candidate identity + persistence client (browser ↔ Data API).
//
// A nurse signs up / logs in here; the API returns a short-lived, candidate-BOUND
// session token (it can only touch that one candidate's own data). We hold it in
// localStorage and attach it to progress / telemetry / readiness calls.
//
// SAFETY: this is the LEARNER surface - it only ever carries education data
// (identity, progress, assessment performance, readiness band). No financial,
// visa, or underwriting fields exist here. The token is candidate-scoped, so a
// leak exposes one learner's own study data, briefly.
// ───────────────────────────────────────────────────────────────────────────

export interface ConsentMap {
  service?: boolean;
  crm_sync?: boolean;
  underwriting?: boolean;
  pathway?: boolean;
  financing?: boolean;
  employer_sharing?: boolean;
  updated_at?: string;
}

export interface CandidateProfile {
  id: string;
  full_name: string;
  email?: string;
  country?: string;
  consent?: ConsentMap;
  email_verified?: boolean;
  created_at: string;
  updated_at: string;
}

export type ConsentPurpose =
  | "crm_sync"
  | "pathway"
  | "financing"
  | "employer_sharing"
  | "underwriting";

/** PATCH the candidate's consent map. The candidate session can only patch its own. */
export async function updateConsent(
  candidateId: string,
  patch: Partial<Record<ConsentPurpose, boolean>>,
): Promise<CandidateProfile> {
  return call<CandidateProfile>(`/v1/candidates/${encodeURIComponent(candidateId)}`, {
    method: "PATCH",
    body: { consent: patch },
  });
}

export interface SessionToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export type ReadinessBand = "none" | "red" | "orange" | "yellow" | "green";

export interface ReadinessSnapshot {
  candidate_id: string;
  band: ReadinessBand;
  next_action?: string;
  readiness?: number;
  theta?: number;
  items_completed: number;
  assessments_taken: number;
  by_client_need?: Record<string, number>;
  sections_completed: number;
  sections_total: number;
  focus_areas: string[];
  updated_at: string;
}

export type ProgressStatus = "not_started" | "in_progress" | "completed";
export interface ProgressRecord {
  candidate_id: string;
  section_slug: string;
  status: ProgressStatus;
  percent: number;
  last_segment?: string;
  updated_at: string;
}

const TOKEN_KEY = "fl_academy_token";
const CAND_KEY = "fl_academy_candidate";

/**
 * Resolve the Data API base URL. Explicit `VITE_API_URL` wins; otherwise, when
 * served from localhost we assume the reference API on :8088 (so the prebuilt
 * preview talks to it with no rebuild). Empty string ⇒ persistence disabled, so
 * the static app keeps working unchanged where no API is configured.
 */
export function apiBaseUrl(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  const explicit = env["VITE_API_URL"]?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (
    typeof window !== "undefined" &&
    /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
  ) {
    return "http://localhost:8088";
  }
  return "";
}

export function isApiConfigured(): boolean {
  return Boolean(apiBaseUrl());
}

export function storedToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storedCandidate(): CandidateProfile | null {
  try {
    const s = localStorage.getItem(CAND_KEY);
    return s ? (JSON.parse(s) as CandidateProfile) : null;
  } catch {
    return null;
  }
}

function persistSession(token: SessionToken, cand: CandidateProfile): void {
  try {
    localStorage.setItem(TOKEN_KEY, token.access_token);
    localStorage.setItem(CAND_KEY, JSON.stringify(cand));
  } catch {
    /* storage disabled - session is in-memory only for this tab */
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CAND_KEY);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function call<T>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const base = apiBaseUrl();
  if (!base) throw new ApiError(0, "api_disabled", "no API configured");
  const headers: Record<string, string> = { "content-type": "application/json" };
  const token = opts.token ?? storedToken();
  if (token) headers["authorization"] = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: opts.method ?? "GET",
      credentials: "include", // carry the shared FlorenceRN Core cookie (SSO)
      headers,
      ...(opts.body !== undefined && { body: JSON.stringify(opts.body) }),
    });
  } catch {
    throw new ApiError(0, "network_error", "could not reach the server");
  }
  const json = (await res.json().catch(() => null)) as
    | (T & { error?: { code?: string; message?: string } })
    | null;
  if (!res.ok) {
    const e = (json as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(res.status, e?.code ?? "error", e?.message ?? `request failed (${res.status})`);
  }
  return json as T;
}

export interface SignupInput {
  full_name: string;
  email: string;
  password: string;
  country?: string;
}

interface AuthResponse {
  candidate: CandidateProfile;
  token: SessionToken;
}

export async function signup(input: SignupInput): Promise<CandidateProfile> {
  const res = await call<AuthResponse>("/v1/auth/signup", { method: "POST", body: input });
  persistSession(res.token, res.candidate);
  return res.candidate;
}

export async function login(email: string, password: string): Promise<CandidateProfile> {
  const res = await call<AuthResponse>("/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });
  persistSession(res.token, res.candidate);
  return res.candidate;
}

export async function logout(): Promise<void> {
  try {
    await call("/v1/auth/logout", { method: "POST", body: {} });
  } catch {
    /* revoke is best-effort; clear locally regardless */
  } finally {
    clearSession();
  }
}

/** Refresh the signed-in candidate from the server (also validates the token). */
export async function fetchMe(): Promise<CandidateProfile> {
  const me = await call<CandidateProfile>("/v1/me");
  try {
    localStorage.setItem(CAND_KEY, JSON.stringify(me));
  } catch {
    /* ignore */
  }
  return me;
}

export async function fetchReadiness(candidateId: string): Promise<ReadinessSnapshot> {
  return call<ReadinessSnapshot>(`/v1/candidates/${candidateId}/readiness`);
}

/** A targeted-remediation assignment (auto-dispatched for a weak subscale). */
export interface RemediationAssignment {
  candidate_id: string;
  dim: "client_need" | "cjmm";
  key: string;
  theta: number;
  pass_prob: number;
  status: "assigned" | "in_progress" | "cleared";
  created_at: string;
  updated_at: string;
}

export async function fetchRemediations(candidateId: string): Promise<RemediationAssignment[]> {
  const res = await call<{ candidate_id: string; remediations: RemediationAssignment[] }>(
    `/v1/candidates/${candidateId}/remediations`,
  );
  return res.remediations;
}

export async function clearRemediation(candidateId: string, dim: string, key: string, status = "cleared"): Promise<void> {
  await call(`/v1/candidates/${candidateId}/remediations/clear`, { method: "POST", body: { dim, key, status } });
}

export async function fetchProgress(candidateId: string): Promise<ProgressRecord[]> {
  const res = await call<{ candidate_id: string; progress: ProgressRecord[] }>(
    `/v1/candidates/${candidateId}/progress`,
  );
  return res.progress;
}

export interface ProgressUpsert {
  section_slug: string;
  status?: ProgressStatus;
  percent?: number;
  last_segment?: string;
}

export async function upsertProgress(
  candidateId: string,
  body: ProgressUpsert,
): Promise<ProgressRecord> {
  return call<ProgressRecord>(`/v1/candidates/${candidateId}/progress`, {
    method: "POST",
    body,
  });
}

// Sponsored Global Live access checkout.
export interface SponsoredAccessQuote {
  product_name: string;
  list_value_usd: number;
  sponsor_subsidy_usd: number;
  student_price_usd: number;
  sponsor_id: string | null;
  sponsor_name: string | null;
  sponsor_slug: string | null;
  sponsorship_program_id: string | null;
  budget_mode?: "unlimited" | "capped";
  campaign_id: string;
  apply_url: string;
  sponsorship_available: boolean;
}

export interface CheckoutResponse {
  payment_id: string;
  checkout_url: string;
  provider: string;
  amount_cents: number;
  currency: string;
  access_pass_id?: string;
  quote?: SponsoredAccessQuote;
}

export interface PaymentRecord {
  id: string;
  kind: string;
  amount_cents: number;
  currency: string;
  status: string;
}

export interface AccessPass {
  id: string;
  candidate_id: string;
  sponsor_id: string;
  sponsorship_program_id: string;
  payment_id?: string;
  status: "pending" | "active" | "expired" | "cancelled";
  starts_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export async function fetchSponsoredAccessQuote(): Promise<SponsoredAccessQuote> {
  return call<SponsoredAccessQuote>("/v1/academy/pricing/quote", { method: "POST", body: {} });
}

/** Start a hosted-checkout session for the signed-in candidate's sponsored access. */
export async function startSponsoredAccessCheckout(): Promise<CheckoutResponse> {
  return call<CheckoutResponse>("/v1/academy/access-passes/checkout", { method: "POST", body: {} });
}

/** Complete a MOCK checkout (dev only; the server gates this to the mock provider). */
export async function completeMockCheckout(paymentId: string): Promise<boolean> {
  const base = apiBaseUrl();
  if (!base) return false;
  try {
    const res = await fetch(`${base}/v1/payments/${encodeURIComponent(paymentId)}/mock-complete`, {
      method: "POST",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchPayments(candidateId: string): Promise<PaymentRecord[]> {
  const res = await call<{ data: PaymentRecord[] }>(
    `/v1/payments?candidate_id=${encodeURIComponent(candidateId)}`,
  );
  return res.data ?? [];
}

export async function fetchMyAccessPasses(): Promise<AccessPass[]> {
  const res = await call<{ data: AccessPass[] }>("/v1/academy/access-passes/me");
  return res.data ?? [];
}

export function hasPaidSponsoredAccess(payments: PaymentRecord[]): boolean {
  return payments.some(
    (p) =>
      (p.kind === "global_live_access" || p.kind === "commitment_deposit") &&
      p.status === "paid",
  );
}

export const hasPaidDeposit = hasPaidSponsoredAccess;
export const startDepositCheckout = startSponsoredAccessCheckout;

// ── email verification ───────────────────────────────────────────────────────
export async function verifyEmail(token: string): Promise<boolean> {
  try {
    await call("/v1/auth/verify", { method: "POST", body: { token } });
    return true;
  } catch {
    return false;
  }
}

export interface ResendResult {
  sent: boolean;
  /** Present only with the mock email provider - lets dev complete without an inbox. */
  dev_url?: string;
  already_verified?: boolean;
}

export async function resendVerification(): Promise<ResendResult> {
  return call<ResendResult>("/v1/auth/resend", { method: "POST", body: {} });
}

// ── University Affiliate Network ─────────────────────────────────────────────
export interface PublicSchool {
  slug: string;
  name: string;
  country: string;
  tier: "eligible" | "affiliate" | "lab_partner";
  city?: string;
  programs?: string[];
}

/** Public eligible-school directory - no auth required. Empty when no API. */
export async function fetchSchoolsPublic(): Promise<PublicSchool[]> {
  const base = apiBaseUrl();
  if (!base) return [];
  try {
    const res = await fetch(`${base}/v1/schools`);
    if (!res.ok) return [];
    const j = (await res.json()) as { data: PublicSchool[] };
    return j.data ?? [];
  } catch {
    return [];
  }
}

// ── Public cohort schedule (for the marketing site) ──────────────────────────
export interface PublicCohort {
  code: string;
  name: string;
  status: "scheduled" | "active";
  starts_at?: string;
  capacity?: number;
  seats_remaining: number | null;
}

// ── Public activation lookup (Lob outreach landing) ─────────────────────────
export interface ActivationOffer {
  headline: string;
  product_name: string;
  list_value_usd: number;
  university_sponsorship_usd: number;
  student_price_usd: number;
  partner_dashboard: boolean;
  coming_next: string[];
}
export interface ActivationLookup {
  code: string;
  org_name: string;
  school?: { slug: string; name: string; country: string; tier: string };
  campaign_kind: string;
  offer: ActivationOffer;
  status:
    | "queued"
    | "rendered"
    | "sent"
    | "in_transit"
    | "delivered"
    | "returned"
    | "activated"
    | "declined";
}

/** Public activation lookup. Returns the offer + org for a given FLOR-XXXXX
 *  code. Used by the /activate page when a recipient scans the QR or types
 *  the code. Returns null on any failure so the UI can show a clean "code
 *  not recognized" message. */
export async function fetchActivation(code: string): Promise<ActivationLookup | null> {
  const base = apiBaseUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/v1/activation/${encodeURIComponent(code)}`);
    if (!res.ok) return null;
    return (await res.json()) as ActivationLookup;
  } catch {
    return null;
  }
}

/**
 * Public cohort schedule - no auth required. Used by the public landing page.
 * Returns [] when no API is configured (the landing still renders, the cohort
 * grid just falls back to "schedule posted soon").
 */
export async function fetchCohortsPublic(): Promise<PublicCohort[]> {
  const base = apiBaseUrl();
  if (!base) return [];
  try {
    const res = await fetch(`${base}/v1/public/cohorts`);
    if (!res.ok) return [];
    const j = (await res.json()) as { data: PublicCohort[] };
    return j.data ?? [];
  } catch {
    return [];
  }
}

// ── My cohort (candidate-bound; for the Curriculum Navigator gate) ──────────
export interface MyCohort {
  code: string;
  name: string;
  status: "scheduled" | "active" | "completed" | "cancelled";
  enrollment_status: "registered" | "deposit_paid" | "attending" | "completed" | "withdrawn";
  starts_at?: string;
  covered_through_section: number;
}

export type SelfEnrollOutcome =
  | { ok: true; enrollment_id: string; cohort: string; status: string }
  | { ok: false; code: string; message: string };

/**
 * Candidate self-enrolls into a cohort (typically right after their deposit
 * lands, picking up the cohort the landing page stashed for them). Maps the
 * possible server errors to a closed set the SPA can render plainly.
 */
export async function selfEnroll(
  candidateId: string,
  cohortCode: string,
  status: "registered" | "deposit_paid" = "deposit_paid",
): Promise<SelfEnrollOutcome> {
  try {
    const e = await call<{ id: string; cohort: string; status: string }>("/v1/enrollments", {
      method: "POST",
      body: { candidate_id: candidateId, cohort: cohortCode, status },
    });
    return { ok: true, enrollment_id: e.id, cohort: e.cohort, status: e.status };
  } catch (err) {
    if (err instanceof ApiError) {
      return { ok: false, code: err.code, message: err.message };
    }
    return { ok: false, code: "network_error", message: "Could not reach the API." };
  }
}

/**
 * The candidate's currently-active cohort. Used by AcademyHome /
 * SectionLesson to gate sections by the live-class coverage watermark.
 * Returns null when:
 *   - no API configured (offline / public build)
 *   - no session token (not signed in)
 *   - 204 from server (no eligible enrollment)
 *   - any error (we never want the curriculum to break because of this)
 */
export async function fetchMyCohort(): Promise<MyCohort | null> {
  const base = apiBaseUrl();
  if (!base) return null;
  const token = storedToken();
  if (!token) return null;
  try {
    const res = await fetch(`${base}/v1/me/cohort`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (res.status === 204) return null;
    if (!res.ok) return null;
    return (await res.json()) as MyCohort;
  } catch {
    return null;
  }
}

export type AffiliationRole = "student" | "alumni";

/** Self-attest as a student or alumna of a listed school. */
export async function attestAffiliation(
  candidateId: string,
  schoolSlug: string,
  role: AffiliationRole,
): Promise<boolean> {
  try {
    await call(`/v1/candidates/${encodeURIComponent(candidateId)}/affiliations`, {
      method: "POST",
      body: { school_slug: schoolSlug, role },
    });
    return true;
  } catch {
    return false;
  }
}

export interface AffiliationRecord {
  candidate_id: string;
  school_slug: string;
  role: AffiliationRole;
  verification: "self_attested" | "email_domain" | "manual_qa";
  created_at: string;
}

export async function fetchAffiliations(candidateId: string): Promise<AffiliationRecord[]> {
  const res = await call<{ data: AffiliationRecord[] }>(
    `/v1/candidates/${encodeURIComponent(candidateId)}/affiliations`,
  );
  return res.data ?? [];
}

// ── Pathway tasks + audit transparency (Phase 4) ─────────────────────────────
export type PathwayTaskKind =
  | "university_app" | "financing_packet" | "i20_readiness" | "ds160_guidance"
  | "visa_appointment" | "nclex_registration" | "att_tracking" | "state_licensure"
  | "endorsement" | "employer_packet" | "human_qa";

export type PathwayTaskStatus =
  | "pending" | "in_progress" | "awaiting_candidate" | "human_qa" | "completed" | "blocked";

export interface PathwayTask {
  id: string;
  candidate_id: string;
  kind: PathwayTaskKind;
  status: PathwayTaskStatus;
  note?: string;
  created_at: string;
}

export async function fetchPathwayTasks(
  candidateId: string,
): Promise<{ latest: PathwayTask[]; history: PathwayTask[] }> {
  return call<{ latest: PathwayTask[]; history: PathwayTask[] }>(
    `/v1/candidates/${encodeURIComponent(candidateId)}/pathway-tasks`,
  );
}

export interface AuditEntry {
  ts: string;
  actor: string; // "you" | "ops" | "agent" | "system" | known partner name
  action: string; // e.g. "PATCH /v1/candidates/cand_X"
  outcome?: number; // HTTP status
}

export async function fetchMyAudit(limit = 100): Promise<AuditEntry[]> {
  const res = await call<{ data: AuditEntry[] }>(`/v1/me/audit?limit=${limit}`);
  return res.data ?? [];
}
