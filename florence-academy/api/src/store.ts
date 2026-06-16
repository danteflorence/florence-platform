// Storage abstraction. All methods are async so a real database adapter fits
// the same interface (see store.postgres.ts). The in-memory adapter below runs
// the reference service with zero dependencies.

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { activationCode as _activationCode } from "./outreach.ts";
import type {
  AffiliationRole,
  AffiliationVerification,
  ApiClient,
  AssessmentResult,
  AttendanceRecord,
  AttendanceRollup,
  AttendanceStatus,
  Candidate,
  CandidateCredential,
  CandidateSchoolAffiliation,
  Cohort,
  CohortStatus,
  Consent,
  Enrollment,
  EnrollmentStatus,
  OutcomeEvent,
  OutcomeFunnel,
  OutcomeKind,
  OutreachStatus,
  Payment,
  PaymentStatus,
  ProgressRecord,
  ProgressStatus,
  RemediationAssignment,
  RemediationStatus,
  QuestionResponse,
  QuestionAnalytics,
  PathwayTaskEvent,
  PathwayTaskKind,
  PathwayTaskStatus,
  School,
  SchoolTier,
  Lead,
  LeadEvent,
  LeadLifecycleStage,
  OutreachCampaign,
  OutreachCampaignStatus,
  OutreachKind,
  OutreachMailFormat,
  OutreachTarget,
  OutreachTargetStatus,
  OutreachTheme,
  MailPiece,
  MailPieceEvent,
  MailPieceMode,
  MailPieceStatus,
} from "./types.ts";
import type { Walkthrough, WalkthroughStatus, WalkthroughUpsertInput } from "./walkthroughTypes.ts";
import { emptyLinkedContent } from "./walkthroughTypes.ts";

export interface Page<T> {
  data: T[];
  next_cursor: string | null;
}

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

/** High-entropy opaque token (email verification, etc.). */
export function newToken(): string {
  return randomBytes(24).toString("hex");
}

/** Stable SHA-256 over a result's meaningful fields — tamper-evidence. */
export function contentHash(obj: unknown): string {
  return createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

/** Content hash over a walkthrough's body (idempotency + audio cache key). */
export function walkthroughBodyHash(input: WalkthroughUpsertInput): string {
  return contentHash({
    clinical_judgment: input.clinical_judgment,
    answer_choice_analysis: input.answer_choice_analysis,
    teach_back: input.teach_back,
    what_to_review_next: input.what_to_review_next,
    standard_rationale: input.standard_rationale,
  });
}
/** The persisted body fields of a walkthrough (excludes id/status/timestamps/reviewers). */
function buildWalkthroughBody(input: WalkthroughUpsertInput, hash: string) {
  return {
    client_need: input.client_need,
    cjmm: input.cjmm,
    standard_rationale: input.standard_rationale,
    clinical_judgment: input.clinical_judgment,
    answer_choice_analysis: input.answer_choice_analysis,
    teach_back: input.teach_back,
    what_to_review_next: input.what_to_review_next,
    linked_content: { ...emptyLinkedContent(), ...(input.linked_content ?? {}) },
    provenance: input.provenance,
    model: input.model,
    content_hash: hash,
  };
}

export interface CandidateInput {
  external_ref?: string;
  full_name: string;
  email?: string;
  phone?: string;
  country?: string;
  consent?: Consent;
}
export interface CandidatePatch {
  email?: string;
  phone?: string;
  country?: string;
  consent?: Consent;
}
export interface EnrollmentInput {
  candidate_id: string;
  cohort: string;
  status?: EnrollmentStatus;
}
export interface CohortInput {
  code: string;
  name: string;
  starts_at?: string;
  capacity?: number;
  instructor_ref?: string;
  status?: CohortStatus;
  covered_through_section?: number;
}
export interface CohortPatch {
  name?: string;
  starts_at?: string;
  capacity?: number;
  instructor_ref?: string;
  status?: CohortStatus;
  covered_through_section?: number;
}
export interface AssessmentInput {
  candidate_id: string;
  kind: AssessmentResult["kind"];
  readiness?: number;
  theta?: number;
  items_completed?: number;
  by_client_need?: Record<string, number>;
  by_cjmm?: Record<string, number>;
  mastery?: AssessmentResult["mastery"];
  supersedes?: string;
}
export interface PaymentInput {
  candidate_id: string;
  kind: Payment["kind"];
  amount_cents: number;
  currency: string;
  status?: PaymentStatus;
  processor?: string;
  processor_ref?: string;
}
export interface CredentialInput {
  candidate_id: string;
  email: string;
  password_hash: string;
}
export interface ProgressInput {
  candidate_id: string;
  section_slug: string;
  status?: ProgressStatus;
  percent?: number;
  last_segment?: string;
}
export interface RemediationInput {
  candidate_id: string;
  dim: "client_need" | "cjmm" | "error_type";
  key: string;
  theta: number;
  pass_prob: number;
}
export interface ResponseInput {
  candidate_id: string;
  question_id: string;
  chosen_option_index?: number | null;
  correct: boolean;
  spent_ms?: number | null;
  pre_reveal_reasoning?: string | null;
  walkthrough_seen?: boolean;
}

/** Pure rollup of per-question responses into analytics. */
export function rollupAnalytics(questionId: string, rows: QuestionResponse[]): QuestionAnalytics {
  const attempts = rows.length;
  const correct = rows.filter((r) => r.correct).length;
  const maxIdx = rows.reduce((m, r) => Math.max(m, r.chosen_option_index ?? -1), -1);
  const by_option = Array.from({ length: maxIdx + 1 }, () => 0);
  for (const r of rows) if (r.chosen_option_index != null && r.chosen_option_index >= 0) by_option[r.chosen_option_index]! += 1;
  const wrongCounts = new Map<number, number>();
  for (const r of rows) if (!r.correct && r.chosen_option_index != null) wrongCounts.set(r.chosen_option_index, (wrongCounts.get(r.chosen_option_index) ?? 0) + 1);
  let most_common_wrong: number | null = null;
  let best = 0;
  for (const [idx, n] of wrongCounts) if (n > best) { best = n; most_common_wrong = idx; }
  const seen = rows.filter((r) => r.walkthrough_seen).length;
  return {
    question_id: questionId,
    attempts,
    correct,
    pass_rate: attempts ? correct / attempts : null,
    by_option,
    most_common_wrong,
    walkthrough_seen_rate: attempts ? seen / attempts : null,
  };
}
export interface OutcomeInput {
  candidate_id: string;
  kind: OutcomeKind;
  status?: string;
  amount_cents?: number;
  detail?: Record<string, unknown>;
  occurred_at?: string;
}
export interface AttendanceInput {
  candidate_id: string;
  cohort?: string;
  location?: string;
  session_date: string;
  status: AttendanceStatus;
}
export interface SchoolInput {
  slug: string;
  name: string;
  country: string;
  city?: string;
  programs?: string[];
  tier?: SchoolTier;
  logo_use_granted?: boolean;
  email_domains?: string[];
  outreach_status?: OutreachStatus;
  contact_email?: string;
}
export interface SchoolPatch {
  name?: string;
  country?: string;
  city?: string;
  programs?: string[];
  tier?: SchoolTier;
  logo_use_granted?: boolean;
  email_domains?: string[];
  outreach_status?: OutreachStatus;
  contact_email?: string;
}
export interface AffiliationInput {
  candidate_id: string;
  school_slug: string;
  role: AffiliationRole;
  verification?: AffiliationVerification;
}
export interface PathwayTaskInput {
  candidate_id: string;
  kind: PathwayTaskKind;
  status: PathwayTaskStatus;
  note?: string;
}

export interface Store {
  clients: {
    get(clientId: string): Promise<ApiClient | undefined>;
    create(client: ApiClient): Promise<ApiClient>;
    rotateSecret(clientId: string, secretHash: string): Promise<ApiClient | undefined>;
    list(): Promise<ApiClient[]>;
  };
  candidates: {
    create(input: CandidateInput): Promise<Candidate>;
    get(id: string): Promise<Candidate | undefined>;
    patch(id: string, patch: CandidatePatch): Promise<Candidate | undefined>;
    markEmailVerified(id: string): Promise<Candidate | undefined>;
    list(cursor: string | undefined, limit: number): Promise<Page<Candidate>>;
  };
  cohorts: {
    create(input: CohortInput): Promise<Cohort>;
    get(id: string): Promise<Cohort | undefined>;
    getByCode(code: string): Promise<Cohort | undefined>;
    patch(id: string, patch: CohortPatch): Promise<Cohort | undefined>;
    list(cursor: string | undefined, limit: number): Promise<Page<Cohort>>;
  };
  enrollments: {
    create(input: EnrollmentInput): Promise<Enrollment>;
    get(id: string): Promise<Enrollment | undefined>;
    setStatus(id: string, status: EnrollmentStatus): Promise<Enrollment | undefined>;
    list(cursor: string | undefined, limit: number): Promise<Page<Enrollment>>;
    /** All enrollments for a cohort code (roster + capacity count). */
    byCohort(code: string): Promise<Enrollment[]>;
    /** All enrollments for one candidate (deposit → stage advance). */
    byCandidate(candidateId: string): Promise<Enrollment[]>;
  };
  /** Append-only: no update/delete. Corrections are superseding inserts. */
  assessmentResults: {
    create(input: AssessmentInput): Promise<AssessmentResult>;
    get(id: string): Promise<AssessmentResult | undefined>;
    list(
      candidateId: string | undefined,
      cursor: string | undefined,
      limit: number,
    ): Promise<Page<AssessmentResult>>;
  };
  payments: {
    create(input: PaymentInput): Promise<Payment>;
    get(id: string): Promise<Payment | undefined>;
    update(
      id: string,
      patch: { status?: PaymentStatus; processor_ref?: string },
    ): Promise<Payment | undefined>;
    list(
      candidateId: string | undefined,
      cursor: string | undefined,
      limit: number,
    ): Promise<Page<Payment>>;
  };
  /** Candidate end-user login credentials (email → scrypt password hash). */
  credentials: {
    getByEmail(email: string): Promise<CandidateCredential | undefined>;
    create(input: CredentialInput): Promise<CandidateCredential>;
  };
  /** Per-section learner progress (mutable upsert, keyed on candidate+section). */
  progress: {
    upsert(input: ProgressInput): Promise<ProgressRecord>;
    listByCandidate(candidateId: string): Promise<ProgressRecord[]>;
  };
  remediations: {
    /** Create an assignment for (candidate, subscale) unless a live one exists. */
    dispatch(input: RemediationInput): Promise<RemediationAssignment>;
    listByCandidate(candidateId: string): Promise<RemediationAssignment[]>;
    setStatus(candidateId: string, dim: string, key: string, status: RemediationStatus): Promise<RemediationAssignment | undefined>;
  };
  walkthroughs: {
    /** Idempotent (content_hash) upsert of a clinical-judgment walkthrough. */
    upsert(input: WalkthroughUpsertInput): Promise<Walkthrough>;
    get(questionId: string): Promise<Walkthrough | undefined>;
    listByStatus(status: WalkthroughStatus, limit?: number): Promise<Walkthrough[]>;
    /** All approved walkthroughs (for the audio extractor). */
    listApproved(): Promise<Walkthrough[]>;
    setStatus(questionId: string, status: WalkthroughStatus, reviewer: string, note?: string): Promise<Walkthrough | undefined>;
    patchBody(questionId: string, patch: Partial<Pick<Walkthrough, "clinical_judgment" | "answer_choice_analysis" | "teach_back" | "what_to_review_next" | "standard_rationale">>, reviewer: string): Promise<Walkthrough | undefined>;
  };
  questionResponses: {
    record(input: ResponseInput): Promise<QuestionResponse>;
    analytics(questionId: string): Promise<QuestionAnalytics>;
  };
  /** Single-use email-verification tokens (token → candidate, with expiry). */
  verifications: {
    create(candidateId: string, ttlSec?: number): Promise<{ token: string; expires_at: string }>;
    consume(token: string): Promise<string | null>;
  };
  /** Append-only production outcomes (NCLEX → licensure → start → repayment). */
  outcomes: {
    create(input: OutcomeInput): Promise<OutcomeEvent>;
    list(
      candidateId: string | undefined,
      cursor: string | undefined,
      limit: number,
    ): Promise<Page<OutcomeEvent>>;
    funnel(): Promise<OutcomeFunnel>;
  };
  /** Append-only Live cohort / Live Lab attendance. */
  attendance: {
    create(input: AttendanceInput): Promise<AttendanceRecord>;
    list(
      candidateId: string | undefined,
      cursor: string | undefined,
      limit: number,
    ): Promise<Page<AttendanceRecord>>;
    rollup(): Promise<AttendanceRollup>;
  };
  /** University Affiliate Network — directory + candidate ↔ school affiliations. */
  schools: {
    create(input: SchoolInput): Promise<School>;
    get(slug: string): Promise<School | undefined>;
    patch(slug: string, patch: SchoolPatch): Promise<School | undefined>;
    list(): Promise<School[]>;
  };
  affiliations: {
    /** Upserts (candidate × school × role) — re-attestation refreshes verification only. */
    upsert(input: AffiliationInput): Promise<CandidateSchoolAffiliation>;
    listByCandidate(candidateId: string): Promise<CandidateSchoolAffiliation[]>;
    listBySchool(slug: string): Promise<CandidateSchoolAffiliation[]>;
  };
  /** Pathway-task status events from the Florence Pathway Agent (append-only). */
  pathwayTasks: {
    create(input: PathwayTaskInput): Promise<PathwayTaskEvent>;
    /** All events for a candidate, oldest first (history). */
    listByCandidate(candidateId: string): Promise<PathwayTaskEvent[]>;
  };
  /**
   * Lob print-and-mail outreach: campaigns → targets → mail pieces → events.
   * All operator-only. Lob API keys are NEVER persisted server-side; the key
   * arrives on the send call and is forwarded straight to Lob, then dropped.
   */
  outreach: {
    campaigns: {
      create(input: OutreachCampaignInput): Promise<OutreachCampaign>;
      get(id: string): Promise<OutreachCampaign | undefined>;
      patch(id: string, patch: OutreachCampaignPatch): Promise<OutreachCampaign | undefined>;
      list(): Promise<OutreachCampaign[]>;
      /** Recompute totals from the campaign's targets — call after any
       *  target status change so the campaign list view stays accurate. */
      recountTotals(id: string): Promise<void>;
    };
    targets: {
      /** Upsert by (campaign_id, activation_code) so re-importing a CSV of
       *  targets doesn't duplicate. Returns the persisted target. */
      upsert(input: OutreachTargetInput): Promise<OutreachTarget>;
      get(id: string): Promise<OutreachTarget | undefined>;
      getByCode(code: string): Promise<OutreachTarget | undefined>;
      patch(id: string, patch: OutreachTargetPatch): Promise<OutreachTarget | undefined>;
      listByCampaign(campaignId: string): Promise<OutreachTarget[]>;
    };
    pieces: {
      create(input: MailPieceInput): Promise<MailPiece>;
      get(id: string): Promise<MailPiece | undefined>;
      getByLobId(lobId: string): Promise<MailPiece | undefined>;
      patch(id: string, patch: MailPiecePatch): Promise<MailPiece | undefined>;
      listByCampaign(campaignId: string): Promise<MailPiece[]>;
    };
    events: {
      /** Append-only — every Lob webhook lands here, dedup by lob_event_id. */
      record(input: MailPieceEventInput): Promise<MailPieceEvent | undefined>;
      listByPiece(mailPieceId: string): Promise<MailPieceEvent[]>;
    };
  };
  /**
   * Florence core nurse pipeline mirror. Leads are NURSES that exist upstream
   * (CSV export today, API push tomorrow). Upserts are by lower(email). Every
   * change drops a LeadEvent so the ops "what's new since last import" view
   * can show real diffs, not just totals.
   */
  leads: {
    /** Upsert by lower(email). Returns the persisted Lead + the set of
     *  field changes (empty when nothing changed). Emits an event row when
     *  emitEvent is true and there was either a creation or any change. */
    upsert(
      input: LeadInput,
      source: string,
      actor: string,
    ): Promise<{ lead: Lead; changes: Record<string, { before: unknown; after: unknown }>; created: boolean }>;
    get(id: string): Promise<Lead | undefined>;
    getByEmail(email: string): Promise<Lead | undefined>;
    list(
      filters: LeadListFilters,
      cursor: string | undefined,
      limit: number,
    ): Promise<Page<Lead>>;
    /** Aggregate counts for the ops dashboard (country × nclex_status × type). */
    rollup(): Promise<LeadRollup>;
    events: {
      listByLead(leadId: string): Promise<LeadEvent[]>;
      /** All events across the population, newest first — for the
       *  "status changes since X" reconciliation view. */
      listRecent(since: string | undefined, limit: number): Promise<LeadEvent[]>;
    };
    // ── Drip campaign (Phase 3) ────────────────────────────────────────────
    /** Put one lead into the drip. requireOptin=true → lifecycle "invited"
     *  (re-permission first); false → "engaged" + consent_marketing=true
     *  (documented-consent segments). Mints unsubscribe_token. Idempotent:
     *  re-enrolling an already-active lead is a no-op. */
    dripEnroll(id: string, requireOptin: boolean): Promise<Lead | undefined>;
    /** Remove a lead from the active drip (lifecycle → "new"); history kept. */
    dripPause(id: string): Promise<Lead | undefined>;
    /** Bulk-enroll every lead matching the filters that is not already active
     *  and not suppressed, up to `cap`. Returns counts + a small id sample. */
    dripEnrollBatch(
      filters: LeadListFilters,
      requireOptin: boolean,
      cap: number,
    ): Promise<{ enrolled: number; skipped: number; sample_ids: string[] }>;
    /** Active drip leads (invited|engaged, not unsubscribed), oldest-contacted
     *  first, up to `limit`. The tick handler does the per-stage interval math
     *  on the returned set. */
    dripActive(limit: number): Promise<Lead[]>;
    /** Record a successful send: advance drip_step, stamp last_contacted_at,
     *  optionally transition lifecycle_stage. Logs drip_send (+ drip_advance). */
    dripRecordSend(
      id: string,
      nextStep: number,
      now: string,
      newStage?: LeadLifecycleStage,
    ): Promise<Lead | undefined>;
    /** Public opt-in / school-enrichment callback. Sets consent_marketing=true,
     *  lifecycle → "engaged", and school_slug when supplied. Logs drip_consent. */
    dripConsentByToken(token: string, schoolSlug?: string): Promise<Lead | undefined>;
    /** Public one-click unsubscribe. Sets unsubscribed_at, lifecycle →
     *  "suppressed". Logs drip_unsubscribe. Idempotent. */
    dripUnsubscribeByToken(token: string): Promise<Lead | undefined>;
    /** Funnel + rates for the ops Drip dashboard. */
    dripOverview(): Promise<LeadDripOverview>;
  };
}

/** Inputs to outreach.* stores. */
export interface OutreachCampaignInput {
  name: string;
  kind: OutreachKind;
  mail_format: OutreachMailFormat;
  theme?: OutreachTheme;
  notes?: string;
  status?: OutreachCampaignStatus;
}
export interface OutreachCampaignPatch {
  name?: string;
  status?: OutreachCampaignStatus;
  theme?: OutreachTheme;
  notes?: string;
  totals?: OutreachCampaign["totals"];
}
export interface OutreachTargetInput {
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
  contact_notes?: string;
}
export interface OutreachTargetPatch {
  status?: OutreachTargetStatus;
  recipient_name?: string;
  recipient_title?: string;
  contact_notes?: string;
  sent_at?: string;
  delivered_at?: string;
  activated_at?: string;
}
export interface MailPieceInput {
  target_id: string;
  campaign_id: string;
  format: OutreachMailFormat;
  mode: MailPieceMode;
  status?: MailPieceStatus;
  lob_id?: string;
  cost_cents?: number;
  preview_url?: string;
}
export interface MailPiecePatch {
  status?: MailPieceStatus;
  lob_id?: string;
  cost_cents?: number;
  preview_url?: string;
  sent_at?: string;
  delivered_at?: string;
}
export interface MailPieceEventInput {
  mail_piece_id: string;
  lob_event_id?: string;
  event_type: string;
  payload: Record<string, unknown>;
  occurred_at: string;
}

/** Input to leads.upsert — strips the server-managed id/timestamps. */
export interface LeadInput {
  email: string;
  external_id?: string;
  firstname?: string;
  lastname?: string;
  fullname?: string;
  country?: string;
  phone?: string;
  job_unit?: string;
  type?: Lead["type"];
  nclex_status?: Lead["nclex_status"];
  application_status?: Lead["application_status"];
  evaluation_status?: Lead["evaluation_status"];
  assigned?: string;
  video_screen?: boolean;
  signup_at?: string;
  school_slug?: string;
}

export interface LeadListFilters {
  country?: string;
  type?: Lead["type"];
  nclex_status?: Lead["nclex_status"];
  application_status?: Lead["application_status"];
  lifecycle_stage?: Lead["lifecycle_stage"];
  /** Substring search over email + fullname. */
  q?: string;
}

export interface LeadRollup {
  total: number;
  by_country: Record<string, number>;
  by_type: Record<string, number>;
  by_nclex_status: Record<string, number>;
  by_application_status: Record<string, number>;
}

/** Funnel + rates for the ops Drip dashboard. */
export interface LeadDripOverview {
  by_stage: Record<string, number>; // lifecycle_stage → count (drip leads only)
  total_in_drip: number;
  sends_today: number;
  sends_7d: number;
  due_now: number; // active leads eligible for the next tick (pre-interval estimate)
  consent_rate: number; // engaged / (invited + engaged) — re-permission yield
  unsubscribe_rate: number; // suppressed / ever-enrolled
}

export function paginate<T extends { id: string }>(
  all: T[],
  cursor: string | undefined,
  limit: number,
): Page<T> {
  let start = 0;
  if (cursor) {
    const idx = all.findIndex((x) => x.id === cursor);
    start = idx >= 0 ? idx + 1 : 0;
  }
  const data = all.slice(start, start + limit);
  const more = start + limit < all.length;
  const last = data.length > 0 ? data[data.length - 1] : undefined;
  return { data, next_cursor: more && last ? last.id : null };
}

/** Build a fresh AssessmentResult (shared so adapters hash identically). */
export function buildAssessment(input: AssessmentInput): AssessmentResult {
  const now = new Date().toISOString();
  const canonical = {
    candidate_id: input.candidate_id,
    kind: input.kind,
    readiness: input.readiness ?? null,
    theta: input.theta ?? null,
    items_completed: input.items_completed ?? null,
    by_client_need: input.by_client_need ?? null,
    by_cjmm: input.by_cjmm ?? null,
    mastery: input.mastery ?? null,
    supersedes: input.supersedes ?? null,
    created_at: now,
  };
  return {
    id: newId("asr"),
    candidate_id: input.candidate_id,
    kind: input.kind,
    content_hash: contentHash(canonical),
    created_at: now,
    ...(input.readiness !== undefined && { readiness: input.readiness }),
    ...(input.theta !== undefined && { theta: input.theta }),
    ...(input.items_completed !== undefined && { items_completed: input.items_completed }),
    ...(input.by_client_need !== undefined && { by_client_need: input.by_client_need }),
    ...(input.by_cjmm !== undefined && { by_cjmm: input.by_cjmm }),
    ...(input.mastery !== undefined && { mastery: input.mastery }),
    ...(input.supersedes !== undefined && { supersedes: input.supersedes }),
  };
}

/** Build a fresh, immutable OutcomeEvent (shared so adapters hash identically). */
export function buildOutcome(input: OutcomeInput): OutcomeEvent {
  const now = new Date().toISOString();
  const occurred_at = input.occurred_at ?? now;
  const canonical = {
    candidate_id: input.candidate_id,
    kind: input.kind,
    status: input.status ?? null,
    amount_cents: input.amount_cents ?? null,
    detail: input.detail ?? null,
    occurred_at,
  };
  return {
    id: newId("oc"),
    candidate_id: input.candidate_id,
    kind: input.kind,
    occurred_at,
    content_hash: contentHash(canonical),
    created_at: now,
    ...(input.status !== undefined && { status: input.status }),
    ...(input.amount_cents !== undefined && { amount_cents: input.amount_cents }),
    ...(input.detail !== undefined && { detail: input.detail }),
  };
}

/** Distinct-candidate counts per milestone — the conversion tail. Pure. */
export function computeOutcomeFunnel(
  events: { candidate_id: string; kind: OutcomeKind; status?: string }[],
): OutcomeFunnel {
  const s = {
    nclex_pass: new Set<string>(),
    nclex_fail: new Set<string>(),
    att_issued: new Set<string>(),
    licensure: new Set<string>(),
    employer_offered: new Set<string>(),
    offer_accepted: new Set<string>(),
    start: new Set<string>(),
    retained_90d: new Set<string>(),
    repayment_active: new Set<string>(),
  };
  for (const e of events) {
    const c = e.candidate_id;
    switch (e.kind) {
      case "nclex_result":
        if (e.status === "pass") s.nclex_pass.add(c);
        else if (e.status === "fail") s.nclex_fail.add(c);
        break;
      case "att_issued":
        s.att_issued.add(c);
        break;
      case "licensure":
        s.licensure.add(c);
        break;
      case "employer_offer":
        s.employer_offered.add(c);
        if (e.status === "accepted") s.offer_accepted.add(c);
        break;
      case "start":
        s.start.add(c);
        break;
      case "retention_90d":
        if (e.status !== "attrited") s.retained_90d.add(c);
        break;
      case "repayment":
        if (e.status === "active" || e.status === "paid") s.repayment_active.add(c);
        break;
    }
  }
  return {
    nclex_pass: s.nclex_pass.size,
    nclex_fail: s.nclex_fail.size,
    att_issued: s.att_issued.size,
    licensure: s.licensure.size,
    employer_offered: s.employer_offered.size,
    offer_accepted: s.offer_accepted.size,
    start: s.start.size,
    retained_90d: s.retained_90d.size,
    repayment_active: s.repayment_active.size,
  };
}

/** Build a fresh PathwayTaskEvent (shared so adapters hash identically). */
export function buildPathwayTask(input: PathwayTaskInput): PathwayTaskEvent {
  const now = new Date().toISOString();
  const canonical = {
    candidate_id: input.candidate_id,
    kind: input.kind,
    status: input.status,
    note: input.note ?? null,
    created_at: now,
  };
  return {
    id: newId("pt"),
    candidate_id: input.candidate_id,
    kind: input.kind,
    status: input.status,
    content_hash: contentHash(canonical),
    created_at: now,
    ...(input.note !== undefined && { note: input.note }),
  };
}

/** Build a fresh AttendanceRecord (shared so adapters hash identically). */
export function buildAttendance(input: AttendanceInput): AttendanceRecord {
  const now = new Date().toISOString();
  const canonical = {
    candidate_id: input.candidate_id,
    cohort: input.cohort ?? null,
    location: input.location ?? null,
    session_date: input.session_date,
    status: input.status,
  };
  return {
    id: newId("att"),
    candidate_id: input.candidate_id,
    session_date: input.session_date,
    status: input.status,
    content_hash: contentHash(canonical),
    created_at: now,
    ...(input.cohort !== undefined && { cohort: input.cohort }),
    ...(input.location !== undefined && { location: input.location }),
  };
}

/** Distinct-candidate attendance rollup + Live-Lab breakdown. Pure. */
export function computeAttendanceRollup(
  rows: { candidate_id: string; location?: string; status: AttendanceStatus }[],
): AttendanceRollup {
  const attended = rows.filter((r) => r.status !== "absent").length;
  const liveLabBy = new Map<string, Set<string>>();
  const liveLabAll = new Set<string>();
  for (const r of rows) {
    if (r.status === "absent" || !r.location) continue;
    liveLabAll.add(r.candidate_id);
    const s = liveLabBy.get(r.location) ?? new Set<string>();
    s.add(r.candidate_id);
    liveLabBy.set(r.location, s);
  }
  const by_location = [...liveLabBy.entries()]
    .map(([location, set]) => ({ location, attendees: set.size }))
    .sort((a, b) => b.attendees - a.attendees);
  return {
    total_records: rows.length,
    attended,
    attendance_rate: rows.length > 0 ? Math.round((attended / rows.length) * 1000) / 1000 : 0,
    live_lab_attendees: liveLabAll.size,
    by_location,
  };
}

export class MemoryStore implements Store {
  private _clients: ApiClient[] = [];
  private _candidates: Candidate[] = [];
  private _cohorts: Cohort[] = [];
  private _enrollments: Enrollment[] = [];
  private _assessments: AssessmentResult[] = [];
  private _payments: Payment[] = [];
  private _credentials: CandidateCredential[] = [];
  private _progress: ProgressRecord[] = [];
  private _remediations: RemediationAssignment[] = [];
  private _walkthroughs: Walkthrough[] = [];
  private _responses: QuestionResponse[] = [];
  private _verifications: { token: string; candidate_id: string; expires_at: string }[] = [];
  private _outcomes: OutcomeEvent[] = [];
  private _attendance: AttendanceRecord[] = [];
  private _schools: School[] = [];
  private _affiliations: CandidateSchoolAffiliation[] = [];
  private _pathwayTasks: PathwayTaskEvent[] = [];

  cohorts = {
    create: async (input: CohortInput): Promise<Cohort> => {
      const now = new Date().toISOString();
      const c: Cohort = {
        id: newId("cohort"),
        code: input.code,
        name: input.name,
        status: input.status ?? "scheduled",
        created_at: now,
        updated_at: now,
        ...(input.starts_at !== undefined && { starts_at: input.starts_at }),
        ...(input.capacity !== undefined && { capacity: input.capacity }),
        ...(input.instructor_ref !== undefined && { instructor_ref: input.instructor_ref }),
        ...(input.covered_through_section !== undefined && {
          covered_through_section: input.covered_through_section,
        }),
      };
      this._cohorts.push(c);
      return c;
    },
    get: async (id: string) => this._cohorts.find((c) => c.id === id),
    getByCode: async (code: string) => this._cohorts.find((c) => c.code === code),
    patch: async (id: string, patch: CohortPatch): Promise<Cohort | undefined> => {
      const c = this._cohorts.find((x) => x.id === id);
      if (!c) return undefined;
      if (patch.name !== undefined) c.name = patch.name;
      if (patch.starts_at !== undefined) c.starts_at = patch.starts_at;
      if (patch.capacity !== undefined) c.capacity = patch.capacity;
      if (patch.instructor_ref !== undefined) c.instructor_ref = patch.instructor_ref;
      if (patch.status !== undefined) c.status = patch.status;
      if (patch.covered_through_section !== undefined)
        c.covered_through_section = patch.covered_through_section;
      c.updated_at = new Date().toISOString();
      return c;
    },
    list: async (cursor: string | undefined, limit: number) =>
      paginate(this._cohorts, cursor, limit),
  };

  clients = {
    get: async (clientId: string) =>
      this._clients.find((c) => c.client_id === clientId),
    create: async (client: ApiClient) => {
      this._clients.push(client);
      return client;
    },
    rotateSecret: async (clientId: string, secretHash: string) => {
      const c = this._clients.find((x) => x.client_id === clientId);
      if (!c) return undefined;
      c.secret_hash = secretHash;
      return c;
    },
    list: async () => [...this._clients],
  };

  candidates = {
    create: async (input: CandidateInput): Promise<Candidate> => {
      const now = new Date().toISOString();
      const c: Candidate = {
        id: newId("cand"),
        full_name: input.full_name,
        consent: { ...(input.consent ?? {}), updated_at: now },
        email_verified: false,
        created_at: now,
        updated_at: now,
        ...(input.external_ref !== undefined && { external_ref: input.external_ref }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.country !== undefined && { country: input.country }),
      };
      this._candidates.push(c);
      return c;
    },
    get: async (id: string) => this._candidates.find((c) => c.id === id),
    markEmailVerified: async (id: string): Promise<Candidate | undefined> => {
      const c = this._candidates.find((x) => x.id === id);
      if (!c) return undefined;
      c.email_verified = true;
      c.updated_at = new Date().toISOString();
      return c;
    },
    patch: async (id: string, patch: CandidatePatch): Promise<Candidate | undefined> => {
      const c = this._candidates.find((x) => x.id === id);
      if (!c) return undefined;
      if (patch.email !== undefined) c.email = patch.email;
      if (patch.phone !== undefined) c.phone = patch.phone;
      if (patch.country !== undefined) c.country = patch.country;
      if (patch.consent !== undefined)
        c.consent = { ...c.consent, ...patch.consent, updated_at: new Date().toISOString() };
      c.updated_at = new Date().toISOString();
      return c;
    },
    list: async (cursor: string | undefined, limit: number) =>
      paginate(this._candidates, cursor, limit),
  };

  enrollments = {
    create: async (input: EnrollmentInput): Promise<Enrollment> => {
      const now = new Date().toISOString();
      const e: Enrollment = {
        id: newId("enr"),
        candidate_id: input.candidate_id,
        cohort: input.cohort,
        status: input.status ?? "registered",
        created_at: now,
        updated_at: now,
      };
      this._enrollments.push(e);
      return e;
    },
    get: async (id: string) => this._enrollments.find((e) => e.id === id),
    setStatus: async (id: string, status: EnrollmentStatus): Promise<Enrollment | undefined> => {
      const e = this._enrollments.find((x) => x.id === id);
      if (!e) return undefined;
      e.status = status;
      e.updated_at = new Date().toISOString();
      return e;
    },
    list: async (cursor: string | undefined, limit: number) =>
      paginate(this._enrollments, cursor, limit),
    byCohort: async (code: string) =>
      this._enrollments.filter((e) => e.cohort === code),
    byCandidate: async (candidateId: string) =>
      this._enrollments.filter((e) => e.candidate_id === candidateId),
  };

  assessmentResults = {
    create: async (input: AssessmentInput): Promise<AssessmentResult> => {
      const r = buildAssessment(input);
      this._assessments.push(r); // append only
      return r;
    },
    get: async (id: string) => this._assessments.find((r) => r.id === id),
    list: async (candidateId: string | undefined, cursor: string | undefined, limit: number) =>
      paginate(
        candidateId
          ? this._assessments.filter((r) => r.candidate_id === candidateId)
          : this._assessments,
        cursor,
        limit,
      ),
  };

  payments = {
    create: async (input: PaymentInput): Promise<Payment> => {
      const now = new Date().toISOString();
      const p: Payment = {
        id: newId("pay"),
        candidate_id: input.candidate_id,
        kind: input.kind,
        amount_cents: input.amount_cents,
        currency: input.currency,
        status: input.status ?? "pending",
        created_at: now,
        updated_at: now,
        ...(input.processor !== undefined && { processor: input.processor }),
        ...(input.processor_ref !== undefined && { processor_ref: input.processor_ref }),
      };
      this._payments.push(p);
      return p;
    },
    get: async (id: string) => this._payments.find((p) => p.id === id),
    update: async (id: string, patch: { status?: PaymentStatus; processor_ref?: string }) => {
      const p = this._payments.find((x) => x.id === id);
      if (!p) return undefined;
      if (patch.status !== undefined) p.status = patch.status;
      if (patch.processor_ref !== undefined) p.processor_ref = patch.processor_ref;
      p.updated_at = new Date().toISOString();
      return p;
    },
    list: async (candidateId: string | undefined, cursor: string | undefined, limit: number) =>
      paginate(
        candidateId
          ? this._payments.filter((p) => p.candidate_id === candidateId)
          : this._payments,
        cursor,
        limit,
      ),
  };

  credentials = {
    getByEmail: async (email: string): Promise<CandidateCredential | undefined> =>
      this._credentials.find((c) => c.email === email.toLowerCase()),
    create: async (input: CredentialInput): Promise<CandidateCredential> => {
      const cred: CandidateCredential = {
        candidate_id: input.candidate_id,
        email: input.email.toLowerCase(),
        password_hash: input.password_hash,
        created_at: new Date().toISOString(),
      };
      this._credentials.push(cred);
      return cred;
    },
  };

  progress = {
    upsert: async (input: ProgressInput): Promise<ProgressRecord> => {
      const now = new Date().toISOString();
      const existing = this._progress.find(
        (p) => p.candidate_id === input.candidate_id && p.section_slug === input.section_slug,
      );
      if (existing) {
        if (input.status !== undefined) existing.status = input.status;
        if (input.percent !== undefined) existing.percent = clampPct(input.percent);
        if (input.last_segment !== undefined) existing.last_segment = input.last_segment;
        existing.updated_at = now;
        return existing;
      }
      const rec: ProgressRecord = {
        candidate_id: input.candidate_id,
        section_slug: input.section_slug,
        status: input.status ?? "in_progress",
        percent: clampPct(input.percent ?? 0),
        updated_at: now,
        ...(input.last_segment !== undefined && { last_segment: input.last_segment }),
      };
      this._progress.push(rec);
      return rec;
    },
    listByCandidate: async (candidateId: string): Promise<ProgressRecord[]> =>
      this._progress.filter((p) => p.candidate_id === candidateId),
  };

  remediations = {
    dispatch: async (input: RemediationInput): Promise<RemediationAssignment> => {
      const now = new Date().toISOString();
      // One row per (candidate, subscale). Refresh metrics; re-open if cleared.
      const existing = this._remediations.find(
        (r) => r.candidate_id === input.candidate_id && r.dim === input.dim && r.key === input.key,
      );
      if (existing) {
        existing.theta = input.theta;
        existing.pass_prob = input.pass_prob;
        if (existing.status === "cleared") existing.status = "assigned";
        existing.updated_at = now;
        return existing;
      }
      const rec: RemediationAssignment = {
        candidate_id: input.candidate_id,
        dim: input.dim,
        key: input.key,
        theta: input.theta,
        pass_prob: input.pass_prob,
        status: "assigned",
        created_at: now,
        updated_at: now,
      };
      this._remediations.push(rec);
      return rec;
    },
    listByCandidate: async (candidateId: string): Promise<RemediationAssignment[]> =>
      this._remediations.filter((r) => r.candidate_id === candidateId),
    setStatus: async (candidateId: string, dim: string, key: string, status: RemediationStatus) => {
      const r = this._remediations.find((x) => x.candidate_id === candidateId && x.dim === dim && x.key === key);
      if (!r) return undefined;
      r.status = status;
      r.updated_at = new Date().toISOString();
      return r;
    },
  };

  walkthroughs = {
    upsert: async (input: WalkthroughUpsertInput): Promise<Walkthrough> => {
      const now = new Date().toISOString();
      const hash = walkthroughBodyHash(input);
      const existing = this._walkthroughs.find((w) => w.question_id === input.question_id);
      if (existing) {
        if (existing.content_hash === hash) return existing; // idempotent — unchanged
        Object.assign(existing, buildWalkthroughBody(input, hash), { updated_at: now });
        // AI body change on an approved row → re-review; templated stays approved.
        existing.status = input.status ?? (input.provenance === "templated" ? "approved" : "draft");
        if (existing.status !== "approved") { existing.approved_by = null; existing.approved_at = null; }
        return existing;
      }
      const rec: Walkthrough = {
        question_id: input.question_id,
        ...buildWalkthroughBody(input, hash),
        status: input.status ?? (input.provenance === "templated" ? "approved" : "draft"),
        sme_reviewed_by: null, sme_reviewed_at: null, approved_by: null, approved_at: null, review_note: null,
        generated_at: now, created_at: now, updated_at: now,
      };
      this._walkthroughs.push(rec);
      return rec;
    },
    get: async (questionId: string) => this._walkthroughs.find((w) => w.question_id === questionId),
    listByStatus: async (status: WalkthroughStatus, limit = 200) =>
      this._walkthroughs.filter((w) => w.status === status).slice(0, limit),
    listApproved: async () => this._walkthroughs.filter((w) => w.status === "approved"),
    setStatus: async (questionId: string, status: WalkthroughStatus, reviewer: string, note?: string) => {
      const w = this._walkthroughs.find((x) => x.question_id === questionId);
      if (!w) return undefined;
      const now = new Date().toISOString();
      w.status = status;
      if (note !== undefined) w.review_note = note;
      if (status === "sme_reviewed") { w.sme_reviewed_by = reviewer; w.sme_reviewed_at = now; }
      if (status === "approved") { w.approved_by = reviewer; w.approved_at = now; }
      w.updated_at = now;
      return w;
    },
    patchBody: async (
      questionId: string,
      patch: Partial<Pick<Walkthrough, "clinical_judgment" | "answer_choice_analysis" | "teach_back" | "what_to_review_next" | "standard_rationale">>,
      reviewer: string,
    ) => {
      const w = this._walkthroughs.find((x) => x.question_id === questionId);
      if (!w) return undefined;
      Object.assign(w, patch);
      w.content_hash = contentHash({
        clinical_judgment: w.clinical_judgment, answer_choice_analysis: w.answer_choice_analysis,
        teach_back: w.teach_back, what_to_review_next: w.what_to_review_next, standard_rationale: w.standard_rationale,
      });
      w.status = "draft"; w.approved_by = null; w.approved_at = null;
      w.review_note = `edited by ${reviewer}`;
      w.updated_at = new Date().toISOString();
      return w;
    },
  };

  questionResponses = {
    record: async (input: ResponseInput): Promise<QuestionResponse> => {
      const rec: QuestionResponse = {
        id: newId("qr"),
        candidate_id: input.candidate_id,
        question_id: input.question_id,
        chosen_option_index: input.chosen_option_index ?? null,
        correct: input.correct,
        spent_ms: input.spent_ms ?? null,
        pre_reveal_reasoning: input.pre_reveal_reasoning ?? null,
        walkthrough_seen: input.walkthrough_seen ?? false,
        created_at: new Date().toISOString(),
      };
      this._responses.push(rec); // append-only
      return rec;
    },
    analytics: async (questionId: string): Promise<QuestionAnalytics> =>
      rollupAnalytics(questionId, this._responses.filter((r) => r.question_id === questionId)),
  };

  verifications = {
    create: async (candidateId: string, ttlSec = 86_400) => {
      const token = newToken();
      const expires_at = new Date(Date.now() + ttlSec * 1000).toISOString();
      this._verifications.push({ token, candidate_id: candidateId, expires_at });
      return { token, expires_at };
    },
    consume: async (token: string): Promise<string | null> => {
      const i = this._verifications.findIndex((v) => v.token === token);
      if (i < 0) return null;
      const [v] = this._verifications.splice(i, 1); // single-use
      if (!v || new Date(v.expires_at).getTime() < Date.now()) return null; // expired
      return v.candidate_id;
    },
  };

  outcomes = {
    create: async (input: OutcomeInput): Promise<OutcomeEvent> => {
      const o = buildOutcome(input);
      this._outcomes.push(o); // append-only
      return o;
    },
    list: async (candidateId: string | undefined, cursor: string | undefined, limit: number) =>
      paginate(
        candidateId ? this._outcomes.filter((o) => o.candidate_id === candidateId) : this._outcomes,
        cursor,
        limit,
      ),
    funnel: async () => computeOutcomeFunnel(this._outcomes),
  };

  attendance = {
    create: async (input: AttendanceInput): Promise<AttendanceRecord> => {
      const a = buildAttendance(input);
      this._attendance.push(a); // append-only
      return a;
    },
    list: async (candidateId: string | undefined, cursor: string | undefined, limit: number) =>
      paginate(
        candidateId
          ? this._attendance.filter((a) => a.candidate_id === candidateId)
          : this._attendance,
        cursor,
        limit,
      ),
    rollup: async () => computeAttendanceRollup(this._attendance),
  };

  schools = {
    create: async (input: SchoolInput): Promise<School> => {
      const now = new Date().toISOString();
      const s: School = {
        id: newId("sch"),
        slug: input.slug.toUpperCase(),
        name: input.name,
        country: input.country,
        tier: input.tier ?? "eligible",
        logo_use_granted: input.logo_use_granted ?? false,
        outreach_status: input.outreach_status ?? "eligible_listed",
        created_at: now,
        updated_at: now,
        ...(input.city !== undefined && { city: input.city }),
        ...(input.programs !== undefined && { programs: input.programs }),
        ...(input.email_domains !== undefined && { email_domains: input.email_domains }),
        ...(input.contact_email !== undefined && { contact_email: input.contact_email }),
      };
      this._schools.push(s);
      return s;
    },
    get: async (slug: string) =>
      this._schools.find((s) => s.slug === slug.toUpperCase()),
    patch: async (slug: string, patch: SchoolPatch): Promise<School | undefined> => {
      const s = this._schools.find((x) => x.slug === slug.toUpperCase());
      if (!s) return undefined;
      if (patch.name !== undefined) s.name = patch.name;
      if (patch.country !== undefined) s.country = patch.country;
      if (patch.city !== undefined) s.city = patch.city;
      if (patch.programs !== undefined) s.programs = patch.programs;
      if (patch.tier !== undefined) s.tier = patch.tier;
      if (patch.logo_use_granted !== undefined) s.logo_use_granted = patch.logo_use_granted;
      if (patch.email_domains !== undefined) s.email_domains = patch.email_domains;
      if (patch.outreach_status !== undefined) s.outreach_status = patch.outreach_status;
      if (patch.contact_email !== undefined) s.contact_email = patch.contact_email;
      s.updated_at = new Date().toISOString();
      return s;
    },
    list: async () => [...this._schools],
  };

  affiliations = {
    upsert: async (input: AffiliationInput): Promise<CandidateSchoolAffiliation> => {
      const now = new Date().toISOString();
      const slug = input.school_slug.toUpperCase();
      const existing = this._affiliations.find(
        (a) => a.candidate_id === input.candidate_id && a.school_slug === slug && a.role === input.role,
      );
      if (existing) {
        if (input.verification) existing.verification = input.verification;
        return existing;
      }
      const a: CandidateSchoolAffiliation = {
        candidate_id: input.candidate_id,
        school_slug: slug,
        role: input.role,
        verification: input.verification ?? "self_attested",
        created_at: now,
      };
      this._affiliations.push(a);
      return a;
    },
    listByCandidate: async (candidateId: string) =>
      this._affiliations.filter((a) => a.candidate_id === candidateId),
    listBySchool: async (slug: string) =>
      this._affiliations.filter((a) => a.school_slug === slug.toUpperCase()),
  };

  pathwayTasks = {
    create: async (input: PathwayTaskInput): Promise<PathwayTaskEvent> => {
      const e = buildPathwayTask(input);
      this._pathwayTasks.push(e);
      return e;
    },
    listByCandidate: async (candidateId: string): Promise<PathwayTaskEvent[]> =>
      this._pathwayTasks
        .filter((e) => e.candidate_id === candidateId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
  };

  // ── Leads (Florence core nurse mirror) ─────────────────────────────────────
  private _leads: Lead[] = [];
  private _leadEvents: LeadEvent[] = [];
  // Tail of the hash chain. Each new event chains into this and updates it.
  private _leadEventsLastHash = "0".repeat(64);

  leads = {
    upsert: async (
      input: LeadInput,
      source: string,
      actor: string,
    ): Promise<{
      lead: Lead;
      changes: Record<string, { before: unknown; after: unknown }>;
      created: boolean;
    }> => {
      const now = new Date().toISOString();
      const email = input.email.trim().toLowerCase();
      if (!email) throw new Error("lead.upsert: email required");
      const existing = this._leads.find((l) => l.email === email);
      if (!existing) {
        const id = newId("ld");
        const lead: Lead = {
          id,
          email,
          source,
          first_seen_at: now,
          last_seen_at: now,
          created_at: now,
          updated_at: now,
          ...nonEmptyLeadFields(input),
        };
        this._leads.push(lead);
        this._writeLeadEvent({
          lead_id: id,
          kind: "imported",
          before: undefined,
          after: snapshotForEvent(lead),
          source,
          actor,
          occurred_at: now,
        });
        return { lead, changes: {}, created: true };
      }
      // Diff: only fields present on the input + actually changed.
      const candidate = { ...existing, ...nonEmptyLeadFields(input) };
      const changes: Record<string, { before: unknown; after: unknown }> = {};
      for (const k of WATCHED_LEAD_KEYS) {
        const before = existing[k] as unknown;
        const after = candidate[k] as unknown;
        if (input[k] !== undefined && before !== after) {
          changes[k] = { before, after };
        }
      }
      existing.last_seen_at = now;
      const hadChanges = Object.keys(changes).length > 0;
      if (hadChanges) {
        Object.assign(existing, candidate);
        existing.updated_at = now;
        existing.source = source;
        this._writeLeadEvent({
          lead_id: existing.id,
          kind: "status_change",
          before: Object.fromEntries(
            Object.entries(changes).map(([k, v]) => [k, v.before]),
          ),
          after: Object.fromEntries(
            Object.entries(changes).map(([k, v]) => [k, v.after]),
          ),
          source,
          actor,
          occurred_at: now,
        });
      }
      return { lead: existing, changes, created: false };
    },
    get: async (id: string): Promise<Lead | undefined> =>
      this._leads.find((l) => l.id === id),
    getByEmail: async (email: string): Promise<Lead | undefined> =>
      this._leads.find((l) => l.email === email.trim().toLowerCase()),
    list: async (
      filters: LeadListFilters,
      cursor: string | undefined,
      limit: number,
    ): Promise<Page<Lead>> => {
      const q = filters.q?.trim().toLowerCase();
      const filtered = this._leads.filter((l) => {
        if (filters.country && l.country !== filters.country) return false;
        if (filters.type && l.type !== filters.type) return false;
        if (filters.nclex_status && l.nclex_status !== filters.nclex_status)
          return false;
        if (
          filters.application_status &&
          l.application_status !== filters.application_status
        )
          return false;
        if (
          filters.lifecycle_stage &&
          (l.lifecycle_stage ?? "new") !== filters.lifecycle_stage
        )
          return false;
        if (q) {
          const hay = `${l.email} ${l.fullname ?? ""} ${l.firstname ?? ""} ${l.lastname ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
      // Newest activity first.
      filtered.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      return paginate(filtered, cursor, limit);
    },
    rollup: async (): Promise<LeadRollup> => {
      const r: LeadRollup = {
        total: this._leads.length,
        by_country: {},
        by_type: {},
        by_nclex_status: {},
        by_application_status: {},
      };
      for (const l of this._leads) {
        const country = l.country ?? "Unknown";
        r.by_country[country] = (r.by_country[country] ?? 0) + 1;
        if (l.type) r.by_type[l.type] = (r.by_type[l.type] ?? 0) + 1;
        if (l.nclex_status)
          r.by_nclex_status[l.nclex_status] = (r.by_nclex_status[l.nclex_status] ?? 0) + 1;
        if (l.application_status)
          r.by_application_status[l.application_status] =
            (r.by_application_status[l.application_status] ?? 0) + 1;
      }
      return r;
    },
    events: {
      listByLead: async (leadId: string): Promise<LeadEvent[]> =>
        this._leadEvents
          .filter((e) => e.lead_id === leadId)
          .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at)),
      listRecent: async (
        since: string | undefined,
        limit: number,
      ): Promise<LeadEvent[]> => {
        const filtered = since
          ? this._leadEvents.filter((e) => e.occurred_at >= since)
          : this._leadEvents;
        return [...filtered]
          .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
          .slice(0, limit);
      },
    },

    // ── Drip campaign (Phase 3) ────────────────────────────────────────────
    dripEnroll: async (id: string, requireOptin: boolean): Promise<Lead | undefined> => {
      const l = this._leads.find((x) => x.id === id);
      if (!l) return undefined;
      // Idempotent: a lead already moving through the drip stays put.
      if (l.lifecycle_stage && l.lifecycle_stage !== "new") return l;
      const now = new Date().toISOString();
      const before = l.lifecycle_stage ?? "new";
      l.lifecycle_stage = requireOptin ? "invited" : "engaged";
      l.consent_marketing = requireOptin ? l.consent_marketing : true;
      l.drip_step = undefined;
      l.drip_enrolled_at = now;
      l.unsubscribe_token = l.unsubscribe_token ?? randomBytes(24).toString("hex");
      l.updated_at = now;
      this._writeLeadEvent({
        lead_id: l.id,
        kind: "drip_advance",
        before: { lifecycle_stage: before },
        after: { lifecycle_stage: l.lifecycle_stage },
        source: "drip",
        actor: "ops",
        occurred_at: now,
      });
      return l;
    },
    dripPause: async (id: string): Promise<Lead | undefined> => {
      const l = this._leads.find((x) => x.id === id);
      if (!l) return undefined;
      const now = new Date().toISOString();
      const before = l.lifecycle_stage ?? "new";
      l.lifecycle_stage = "new";
      l.updated_at = now;
      this._writeLeadEvent({
        lead_id: l.id,
        kind: "drip_advance",
        before: { lifecycle_stage: before },
        after: { lifecycle_stage: "new" },
        source: "drip",
        actor: "ops",
        occurred_at: now,
      });
      return l;
    },
    dripEnrollBatch: async (
      filters: LeadListFilters,
      requireOptin: boolean,
      cap: number,
    ): Promise<{ enrolled: number; skipped: number; sample_ids: string[] }> => {
      const q = filters.q?.trim().toLowerCase();
      const match = (l: Lead) => {
        if (filters.country && l.country !== filters.country) return false;
        if (filters.type && l.type !== filters.type) return false;
        if (filters.nclex_status && l.nclex_status !== filters.nclex_status) return false;
        if (filters.application_status && l.application_status !== filters.application_status)
          return false;
        if (q) {
          const hay = `${l.email} ${l.fullname ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      };
      let enrolled = 0;
      let skipped = 0;
      const sample_ids: string[] = [];
      for (const l of this._leads) {
        if (!match(l)) continue;
        const stage = l.lifecycle_stage ?? "new";
        if (stage !== "new" || l.unsubscribed_at) {
          skipped++;
          continue;
        }
        if (enrolled >= cap) {
          skipped++;
          continue;
        }
        await this.leads.dripEnroll(l.id, requireOptin);
        enrolled++;
        if (sample_ids.length < 10) sample_ids.push(l.id);
      }
      return { enrolled, skipped, sample_ids };
    },
    dripActive: async (limit: number): Promise<Lead[]> =>
      this._leads
        .filter(
          (l) =>
            !l.unsubscribed_at &&
            (l.lifecycle_stage === "invited" || l.lifecycle_stage === "engaged"),
        )
        // Oldest-contacted first (never-contacted = undefined sorts first).
        .sort((a, b) => (a.last_contacted_at ?? "").localeCompare(b.last_contacted_at ?? ""))
        .slice(0, limit),
    dripRecordSend: async (
      id: string,
      nextStep: number,
      now: string,
      newStage?: LeadLifecycleStage,
    ): Promise<Lead | undefined> => {
      const l = this._leads.find((x) => x.id === id);
      if (!l) return undefined;
      const beforeStage = l.lifecycle_stage ?? "new";
      l.drip_step = nextStep;
      l.last_contacted_at = now;
      l.updated_at = now;
      this._writeLeadEvent({
        lead_id: l.id,
        kind: "drip_send",
        after: { drip_step: nextStep, sent_at: now },
        source: "drip",
        actor: "system",
        occurred_at: now,
      });
      if (newStage && newStage !== beforeStage) {
        l.lifecycle_stage = newStage;
        this._writeLeadEvent({
          lead_id: l.id,
          kind: "drip_advance",
          before: { lifecycle_stage: beforeStage },
          after: { lifecycle_stage: newStage },
          source: "drip",
          actor: "system",
          occurred_at: now,
        });
      }
      return l;
    },
    dripConsentByToken: async (
      token: string,
      schoolSlug?: string,
    ): Promise<Lead | undefined> => {
      const l = this._leads.find((x) => x.unsubscribe_token === token);
      if (!l) return undefined;
      const now = new Date().toISOString();
      const beforeStage = l.lifecycle_stage ?? "new";
      l.consent_marketing = true;
      if (l.lifecycle_stage !== "engaged") l.lifecycle_stage = "engaged";
      if (schoolSlug) l.school_slug = schoolSlug.toUpperCase();
      l.updated_at = now;
      this._writeLeadEvent({
        lead_id: l.id,
        kind: "drip_consent",
        before: { lifecycle_stage: beforeStage },
        after: {
          lifecycle_stage: l.lifecycle_stage,
          consent_marketing: true,
          ...(schoolSlug && { school_slug: l.school_slug }),
        },
        source: "drip",
        actor: "lead",
        occurred_at: now,
      });
      return l;
    },
    dripUnsubscribeByToken: async (token: string): Promise<Lead | undefined> => {
      const l = this._leads.find((x) => x.unsubscribe_token === token);
      if (!l) return undefined;
      if (l.unsubscribed_at) return l; // idempotent
      const now = new Date().toISOString();
      const beforeStage = l.lifecycle_stage ?? "new";
      l.unsubscribed_at = now;
      l.lifecycle_stage = "suppressed";
      l.updated_at = now;
      this._writeLeadEvent({
        lead_id: l.id,
        kind: "drip_unsubscribe",
        before: { lifecycle_stage: beforeStage },
        after: { lifecycle_stage: "suppressed", unsubscribed_at: now },
        source: "drip",
        actor: "lead",
        occurred_at: now,
      });
      return l;
    },
    dripOverview: async (): Promise<LeadDripOverview> => {
      const by_stage: Record<string, number> = {};
      let total_in_drip = 0;
      let invited = 0;
      let engaged = 0;
      let suppressed = 0;
      let everEnrolled = 0;
      let due_now = 0;
      for (const l of this._leads) {
        if (!l.drip_enrolled_at) continue;
        everEnrolled++;
        const stage = l.lifecycle_stage ?? "new";
        by_stage[stage] = (by_stage[stage] ?? 0) + 1;
        if (stage !== "new") total_in_drip++;
        if (stage === "invited") invited++;
        if (stage === "engaged") engaged++;
        if (stage === "suppressed") suppressed++;
        if (!l.unsubscribed_at && (stage === "invited" || stage === "engaged")) due_now++;
      }
      const todayPrefix = new Date().toISOString().slice(0, 10);
      const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
      let sends_today = 0;
      let sends_7d = 0;
      for (const e of this._leadEvents) {
        if (e.kind !== "drip_send") continue;
        if (e.occurred_at.startsWith(todayPrefix)) sends_today++;
        if (e.occurred_at >= weekAgo) sends_7d++;
      }
      return {
        by_stage,
        total_in_drip,
        sends_today,
        sends_7d,
        due_now,
        consent_rate: invited + engaged > 0 ? engaged / (invited + engaged) : 0,
        unsubscribe_rate: everEnrolled > 0 ? suppressed / everEnrolled : 0,
      };
    },
  };

  private _writeLeadEvent(
    e: Omit<LeadEvent, "id" | "prev_hash" | "content_hash">,
  ): void {
    const id = newId("le");
    const prev_hash = this._leadEventsLastHash;
    const payload = JSON.stringify({
      id,
      lead_id: e.lead_id,
      kind: e.kind,
      before: e.before ?? null,
      after: e.after ?? null,
      source: e.source,
      actor: e.actor,
      occurred_at: e.occurred_at,
      prev_hash,
    });
    const content_hash = createHash("sha256").update(payload).digest("hex");
    const ev: LeadEvent = {
      id,
      lead_id: e.lead_id,
      kind: e.kind,
      ...(e.before !== undefined && { before: e.before }),
      ...(e.after !== undefined && { after: e.after }),
      source: e.source,
      actor: e.actor,
      occurred_at: e.occurred_at,
      prev_hash,
      content_hash,
    };
    this._leadEvents.push(ev);
    this._leadEventsLastHash = content_hash;
  }

  // ── Outreach (Lob print + mail) ────────────────────────────────────────────
  private _outCampaigns: OutreachCampaign[] = [];
  private _outTargets: OutreachTarget[] = [];
  private _mailPieces: MailPiece[] = [];
  private _mailPieceEvents: MailPieceEvent[] = [];
  private _mailPieceEventsLastHash = "0".repeat(64);

  outreach = {
    campaigns: {
      create: async (input: OutreachCampaignInput): Promise<OutreachCampaign> => {
        const now = new Date().toISOString();
        const c: OutreachCampaign = {
          id: newId("camp"),
          name: input.name,
          kind: input.kind,
          mail_format: input.mail_format,
          status: input.status ?? "draft",
          theme: input.theme ?? "teal",
          ...(input.notes !== undefined && { notes: input.notes }),
          totals: { targets: 0, sent: 0, delivered: 0, activated: 0 },
          created_at: now,
          updated_at: now,
        };
        this._outCampaigns.push(c);
        return c;
      },
      get: async (id: string) => this._outCampaigns.find((c) => c.id === id),
      patch: async (id: string, patch: OutreachCampaignPatch) => {
        const c = this._outCampaigns.find((x) => x.id === id);
        if (!c) return undefined;
        if (patch.name !== undefined) c.name = patch.name;
        if (patch.status !== undefined) c.status = patch.status;
        if (patch.theme !== undefined) c.theme = patch.theme;
        if (patch.notes !== undefined) c.notes = patch.notes;
        if (patch.totals !== undefined) c.totals = patch.totals;
        c.updated_at = new Date().toISOString();
        return c;
      },
      list: async () =>
        [...this._outCampaigns].sort((a, b) => b.created_at.localeCompare(a.created_at)),
      recountTotals: async (id: string) => {
        const c = this._outCampaigns.find((x) => x.id === id);
        if (!c) return;
        const targets = this._outTargets.filter((t) => t.campaign_id === id);
        c.totals = {
          targets: targets.length,
          sent: targets.filter((t) =>
            ["sent", "in_transit", "delivered", "activated"].includes(t.status),
          ).length,
          delivered: targets.filter((t) =>
            ["delivered", "activated"].includes(t.status),
          ).length,
          activated: targets.filter((t) => t.status === "activated").length,
        };
        c.updated_at = new Date().toISOString();
      },
    },
    targets: {
      upsert: async (input: OutreachTargetInput): Promise<OutreachTarget> => {
        const seed = `${input.campaign_id}|${input.school_slug ?? input.org_name}`;
        const code = activationCodeFromSeed(seed);
        const existing = this._outTargets.find(
          (t) => t.campaign_id === input.campaign_id && t.activation_code === code,
        );
        const now = new Date().toISOString();
        if (existing) {
          // Refresh mailing-address fields on re-import but keep the status.
          existing.org_name = input.org_name;
          if (input.recipient_name !== undefined) existing.recipient_name = input.recipient_name;
          if (input.recipient_title !== undefined) existing.recipient_title = input.recipient_title;
          existing.address_line1 = input.address_line1;
          if (input.address_line2 !== undefined) existing.address_line2 = input.address_line2;
          existing.city = input.city;
          if (input.state !== undefined) existing.state = input.state;
          existing.postal_code = input.postal_code;
          existing.country = input.country;
          if (input.school_slug !== undefined) existing.school_slug = input.school_slug;
          if (input.contact_notes !== undefined) existing.contact_notes = input.contact_notes;
          existing.updated_at = now;
          return existing;
        }
        const t: OutreachTarget = {
          id: newId("tgt"),
          campaign_id: input.campaign_id,
          org_name: input.org_name,
          ...(input.school_slug !== undefined && { school_slug: input.school_slug }),
          ...(input.recipient_name !== undefined && { recipient_name: input.recipient_name }),
          ...(input.recipient_title !== undefined && { recipient_title: input.recipient_title }),
          address_line1: input.address_line1,
          ...(input.address_line2 !== undefined && { address_line2: input.address_line2 }),
          city: input.city,
          ...(input.state !== undefined && { state: input.state }),
          postal_code: input.postal_code,
          country: input.country,
          activation_code: code,
          status: "queued",
          ...(input.contact_notes !== undefined && { contact_notes: input.contact_notes }),
          created_at: now,
          updated_at: now,
        };
        this._outTargets.push(t);
        return t;
      },
      get: async (id: string) => this._outTargets.find((t) => t.id === id),
      getByCode: async (code: string) =>
        this._outTargets.find((t) => t.activation_code === code),
      patch: async (id: string, patch: OutreachTargetPatch) => {
        const t = this._outTargets.find((x) => x.id === id);
        if (!t) return undefined;
        if (patch.status !== undefined) t.status = patch.status;
        if (patch.recipient_name !== undefined) t.recipient_name = patch.recipient_name;
        if (patch.recipient_title !== undefined) t.recipient_title = patch.recipient_title;
        if (patch.contact_notes !== undefined) t.contact_notes = patch.contact_notes;
        if (patch.sent_at !== undefined) t.sent_at = patch.sent_at;
        if (patch.delivered_at !== undefined) t.delivered_at = patch.delivered_at;
        if (patch.activated_at !== undefined) t.activated_at = patch.activated_at;
        t.updated_at = new Date().toISOString();
        return t;
      },
      listByCampaign: async (campaignId: string) =>
        this._outTargets
          .filter((t) => t.campaign_id === campaignId)
          .sort((a, b) => a.org_name.localeCompare(b.org_name)),
    },
    pieces: {
      create: async (input: MailPieceInput): Promise<MailPiece> => {
        const now = new Date().toISOString();
        const p: MailPiece = {
          id: newId("mp"),
          target_id: input.target_id,
          campaign_id: input.campaign_id,
          format: input.format,
          mode: input.mode,
          status: input.status ?? "rendered",
          ...(input.lob_id !== undefined && { lob_id: input.lob_id }),
          ...(input.cost_cents !== undefined && { cost_cents: input.cost_cents }),
          ...(input.preview_url !== undefined && { preview_url: input.preview_url }),
          created_at: now,
          updated_at: now,
        };
        this._mailPieces.push(p);
        return p;
      },
      get: async (id: string) => this._mailPieces.find((p) => p.id === id),
      getByLobId: async (lobId: string) =>
        this._mailPieces.find((p) => p.lob_id === lobId),
      patch: async (id: string, patch: MailPiecePatch) => {
        const p = this._mailPieces.find((x) => x.id === id);
        if (!p) return undefined;
        if (patch.status !== undefined) p.status = patch.status;
        if (patch.lob_id !== undefined) p.lob_id = patch.lob_id;
        if (patch.cost_cents !== undefined) p.cost_cents = patch.cost_cents;
        if (patch.preview_url !== undefined) p.preview_url = patch.preview_url;
        if (patch.sent_at !== undefined) p.sent_at = patch.sent_at;
        if (patch.delivered_at !== undefined) p.delivered_at = patch.delivered_at;
        p.updated_at = new Date().toISOString();
        return p;
      },
      listByCampaign: async (campaignId: string) =>
        this._mailPieces.filter((p) => p.campaign_id === campaignId),
    },
    events: {
      record: async (
        input: MailPieceEventInput,
      ): Promise<MailPieceEvent | undefined> => {
        // Dedup by Lob event id — webhooks can retry; we accept once.
        if (
          input.lob_event_id &&
          this._mailPieceEvents.some((e) => e.lob_event_id === input.lob_event_id)
        ) {
          return undefined;
        }
        const id = newId("mpe");
        const prev_hash = this._mailPieceEventsLastHash;
        const payload = JSON.stringify({
          id,
          mail_piece_id: input.mail_piece_id,
          lob_event_id: input.lob_event_id ?? null,
          event_type: input.event_type,
          payload: input.payload,
          occurred_at: input.occurred_at,
          prev_hash,
        });
        const content_hash = createHash("sha256").update(payload).digest("hex");
        const ev: MailPieceEvent = {
          id,
          mail_piece_id: input.mail_piece_id,
          ...(input.lob_event_id !== undefined && { lob_event_id: input.lob_event_id }),
          event_type: input.event_type,
          payload: input.payload,
          occurred_at: input.occurred_at,
          prev_hash,
          content_hash,
        };
        this._mailPieceEvents.push(ev);
        this._mailPieceEventsLastHash = content_hash;
        return ev;
      },
      listByPiece: async (mailPieceId: string) =>
        this._mailPieceEvents
          .filter((e) => e.mail_piece_id === mailPieceId)
          .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at)),
    },
  };
}

/** Stable activation code per (campaign × target seed). Centralized so the
 *  memory + postgres adapters mint identical codes. */
function activationCodeFromSeed(seed: string): string {
  return _activationCode(seed);
}

/** Fields we watch for status-change events. Touching any of these emits
 *  a row in lead_events; everything else only updates the projection. */
const WATCHED_LEAD_KEYS = [
  "country",
  "phone",
  "type",
  "nclex_status",
  "application_status",
  "evaluation_status",
  "assigned",
  "job_unit",
  "video_screen",
  "school_slug",
  "fullname",
  "firstname",
  "lastname",
  "external_id",
] as const satisfies readonly (keyof LeadInput)[];

/** Project a Lead → the JSON we stamp into a lead_event's after field. */
function snapshotForEvent(l: Lead): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of WATCHED_LEAD_KEYS) {
    const v = l[k as keyof Lead];
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/** Drop undefined fields from a LeadInput so spreads don't blow away
 *  previously-set values when an importer omits a column. */
function nonEmptyLeadFields(input: LeadInput): Partial<Lead> {
  const out: Partial<Lead> = {};
  for (const k of Object.keys(input) as (keyof LeadInput)[]) {
    const v = input[k];
    if (v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    (out as Record<string, unknown>)[k] = typeof v === "string" ? v.trim() : v;
  }
  return out;
}

/** Clamp a progress percentage into 0..100. */
export function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
