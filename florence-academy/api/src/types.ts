// Domain types + scope vocabulary, shared across the service.

export type Scope =
  | "candidates:read"
  | "candidates:write"
  | "enrollment:read"
  | "enrollment:write"
  | "performance:read"
  | "performance:write"
  | "payments:read"
  | "payments:write"
  | "outcomes:read"
  | "outcomes:write"
  | "employer:read"
  | "university:read"
  | "schools:read"
  | "schools:write"
  | "academy:sponsors:read"
  | "academy:sponsors:write"
  | "pathway:write"
  | "webhooks:manage"
  | "clients:manage"
  | "tokens:mint"
  | "cohorts:read"
  | "cohorts:write"
  | "leads:read"
  | "leads:write"
  | "outreach:read"
  | "outreach:write"
  | "content:read"
  | "content:write";

export const ALL_SCOPES: readonly Scope[] = [
  "candidates:read",
  "candidates:write",
  "enrollment:read",
  "enrollment:write",
  "performance:read",
  "performance:write",
  "payments:read",
  "payments:write",
  "outcomes:read",
  "outcomes:write",
  "employer:read",
  "university:read",
  "schools:read",
  "schools:write",
  "academy:sponsors:read",
  "academy:sponsors:write",
  "pathway:write",
  "webhooks:manage",
  "clients:manage",
  "tokens:mint",
  "cohorts:read",
  "cohorts:write",
  "leads:read",
  "leads:write",
  "outreach:read",
  "outreach:write",
  "content:read",
  "content:write",
];

/** Scopes that must never be delegated into a browser/session child token. */
export const NON_DELEGABLE_SCOPES: readonly Scope[] = [
  "tokens:mint",
  "clients:manage",
  "webhooks:manage",
];

export function isScope(s: string): s is Scope {
  return (ALL_SCOPES as readonly string[]).includes(s);
}

export interface Consent {
  service?: boolean;
  crm_sync?: boolean;
  /** Explicit consent to use performance/financial data for underwriting. */
  underwriting?: boolean;
  /** Allow the Florence Pathway Agent to receive readiness + write tasks. */
  pathway?: boolean;
  /** Allow assembly of a financing packet (separate from underwriting). */
  financing?: boolean;
  /** Allow sharing an interview-ready packet with employer partners. */
  employer_sharing?: boolean;
  updated_at?: string;
}

export interface Candidate {
  id: string;
  external_ref?: string;
  full_name: string;
  email?: string;
  /** PII. In production this column is encrypted at rest (KMS data key). */
  phone?: string;
  country?: string;
  consent: Consent;
  /** Whether the candidate has confirmed their email via a verification link. */
  email_verified?: boolean;
  created_at: string;
  updated_at: string;
}

export type CohortStatus = "scheduled" | "active" | "completed" | "cancelled";

/** A scheduled class. `code` is the human cohort code AND the live room code. */
export interface Cohort {
  id: string;
  code: string;
  name: string;
  starts_at?: string;
  capacity?: number;
  /** Owning instructor (email / client id) - metadata, not an auth principal. */
  instructor_ref?: string;
  status: CohortStatus;
  /**
   * Per-cohort coverage watermark - how far the live cohort has progressed.
   * 0 = nothing covered yet, N = sections 1..N have been taught live and are
   * revisitable. The instructor bumps this from /instructor after each class.
   * Students see this on their AcademyHome via /v1/me/cohort. Optional so old
   * stored cohorts default to 0 on read.
   */
  covered_through_section?: number;
  created_at: string;
  updated_at: string;
}

export type EnrollmentStatus =
  | "registered"
  | "deposit_paid"
  | "attending"
  | "completed"
  | "withdrawn";

export interface Enrollment {
  id: string;
  candidate_id: string;
  cohort: string;
  status: EnrollmentStatus;
  created_at: string;
  updated_at: string;
}

export type AssessmentKind =
  | "tutor"
  | "nightly"
  | "adaptive_exam"
  | "timed"
  | "diagnostic";

/** Append-only, immutable performance record (underwriting-grade). */
export interface AssessmentResult {
  id: string;
  candidate_id: string;
  kind: AssessmentKind;
  readiness?: number;
  theta?: number;
  items_completed?: number;
  by_client_need?: Record<string, number>;
  /** Pass-probability per NGN clinical-judgment (NCJMM) step, when items were tagged. */
  by_cjmm?: Record<string, number>;
  /** Per-subscale ability (Client Need + CJMM step) - feeds gates + remediation. */
  mastery?: { dim: string; key: string; theta: number; se: number; passProb: number; items: number }[];
  /** ID of a prior result this row corrects (corrections never edit in place). */
  supersedes?: string;
  /** SHA-256 of the canonical payload - tamper-evidence. */
  content_hash: string;
  created_at: string;
}

export type RemediationStatus = "assigned" | "in_progress" | "cleared";

/**
 * A targeted-remediation assignment, auto-dispatched when a candidate's mastery
 * of a subscale (Client Need or CJMM step) falls below threshold. The API tracks
 * the ASSIGNMENT (which weak subscale, status); the frontend builds the actual
 * module (items + case + tutor prompt) from the question bank via buildRemediation.
 */
export interface RemediationAssignment {
  candidate_id: string;
  // R1: a reasoning-error dimension joins the mastery dims, so a miss can route to
  // the exact gap (content vs cue vs priority vs evaluation), not just the topic.
  dim: "client_need" | "cjmm" | "error_type";
  key: string; // the ClientNeed | CjmmStep | ErrorType
  theta: number; // the gap θ at assignment time (0 for error_type dispatches)
  pass_prob: number;
  status: RemediationStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Per-response signal (append-only) - the measurement substrate: which option each
 * learner chose, whether it was right, time spent, optional "explain-first" reasoning,
 * and whether they viewed the walkthrough. Powers item analytics ("most common wrong
 * answer", "did the walkthrough reduce repeat misses") + future A/B.
 */
export interface QuestionResponse {
  id: string;
  candidate_id: string;
  question_id: string;
  chosen_option_index: number | null;
  correct: boolean;
  spent_ms: number | null;
  pre_reveal_reasoning: string | null;
  walkthrough_seen: boolean;
  created_at: string;
}

export interface QuestionAnalytics {
  question_id: string;
  attempts: number;
  correct: number;
  pass_rate: number | null;
  by_option: number[]; // selection count per option index
  most_common_wrong: number | null; // option index most chosen among wrong answers
  walkthrough_seen_rate: number | null;
}

export type PaymentStatus =
  | "pending"
  | "paid"
  | "refunded"
  | "credited"
  | "failed";

export interface Payment {
  id: string;
  candidate_id: string;
  kind: "commitment_deposit" | "global_live_access" | "tuition" | "other";
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  processor?: string;
  /** Processor token/charge id only - never a raw card/bank number. Encrypted. */
  processor_ref?: string;
  created_at: string;
  updated_at: string;
}

// ── Sponsored Global Live Access and Apply funnel ───────────────────────────
export type SponsorStatus = "active" | "paused" | "ended";

export interface Sponsor {
  id: string;
  slug: string;
  name: string;
  status: SponsorStatus;
  brand_color?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export type SponsorshipProgramType =
  | "global_live_access"
  | "live_session"
  | "manila_residency"
  | "la_residency"
  | "application_flow";

export interface SponsorshipProgram {
  id: string;
  sponsor_id: string;
  name: string;
  program_type: SponsorshipProgramType;
  list_value_usd: number;
  sponsor_subsidy_usd: number;
  student_price_usd: number;
  budget_mode: "unlimited" | "capped";
  budget_usd?: number;
  used_budget_usd?: number;
  status: SponsorStatus;
  default_apply_url: string;
  eligible_countries?: string[];
  eligible_programs?: string[];
  created_at: string;
  updated_at: string;
}

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

export type AccessPassStatus = "pending" | "active" | "expired" | "cancelled";

export interface AccessPass {
  id: string;
  candidate_id: string;
  sponsor_id: string;
  sponsorship_program_id: string;
  payment_id?: string;
  status: AccessPassStatus;
  starts_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export type ApplyCTAPlacement =
  | "academy_home"
  | "checkout_success"
  | "live_class"
  | "class_completion"
  | "diagnostic_result"
  | "sponsor_card"
  | "residency_page"
  | "grant_center"
  | "email"
  | "whatsapp"
  | "practice"
  | "tutor"
  | "account"
  | "landing";

export interface ApplyCTA {
  id: string;
  placement: ApplyCTAPlacement;
  label: string;
  subtext: string;
  destination_url: string;
  sponsor_id?: string;
  campaign_id?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type ApplyAttributionEventType = "viewed" | "clicked";

export interface ApplyAttribution {
  id: string;
  candidate_id?: string;
  sponsor_id?: string;
  campaign_id: string;
  placement: ApplyCTAPlacement;
  event_type: ApplyAttributionEventType;
  safe_session_id: string;
  destination_url?: string;
  created_at: string;
}

export interface ApplicationFeeCoverage {
  id: string;
  candidate_id: string;
  university_id: string;
  program_id?: string;
  application_id?: string;
  fee_amount_usd: number;
  coverage_type: "florence_paid" | "university_waived" | "sponsor_covered";
  status: "eligible" | "approved" | "paid" | "waived" | "rejected" | "refunded" | "cancelled";
  payment_reference_id?: string;
  approved_by?: string;
  approved_at?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AcademyEvent {
  id: string;
  event_type: string;
  candidate_id?: string;
  sponsor_id?: string;
  campaign_id?: string;
  payload?: Record<string, unknown>;
  created_at: string;
}

export interface AuditEntry {
  ts: string;
  request_id: string;
  actor?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  scope_used?: string;
  ip?: string;
  outcome?: number;
  // ── tamper-evidence (filled by the sink): each entry hash-chains the prior ──
  seq?: number;
  prev_hash?: string;
  hash?: string;
}

export interface ApiClient {
  client_id: string;
  name: string;
  /** scrypt(salt + secret), hex "salt:hash". Never plaintext. */
  secret_hash: string;
  allowed_scopes: Scope[];
  active: boolean;
}

// ── Candidate end-user auth (distinct from machine-to-machine api_clients) ────
// api_clients authenticate PARTNERS (CRMs, the ops backend). A CandidateCredential
// authenticates a NURSE signing into the learner app. A successful login mints a
// short-lived, candidate-BOUND session token (see issueCandidateSession), so the
// browser only ever holds a token scoped to its own candidate.
export interface CandidateCredential {
  candidate_id: string;
  /** Lowercased login email - the natural key. */
  email: string;
  /** scrypt(salt + password), "salt:hash". Never plaintext. */
  password_hash: string;
  created_at: string;
}

export type ProgressStatus = "not_started" | "in_progress" | "completed";

/** A learner's progress through one course section (mutable upsert, not append-only). */
export interface ProgressRecord {
  candidate_id: string;
  section_slug: string;
  status: ProgressStatus;
  /** 0..100 - percent of the section's segments completed. */
  percent: number;
  last_segment?: string;
  updated_at: string;
}

export type ReadinessBand = "none" | "red" | "orange" | "yellow" | "green";

/** Day-5 readiness routing (NOT pathway/visa routing - that's the Pathway Agent). */
export type RouteClass =
  | "interview_ready"
  | "repeat"
  | "bridge"
  | "credential_repair"
  | "in_progress";

/**
 * Passport v0 - a COMPUTED, role-scoped readiness snapshot (derived from
 * append-only assessment_results + progress; never itself persisted). This is
 * the learner-facing projection: it carries no ARR, loan, or financial fields.
 */
export interface ReadinessSnapshot {
  candidate_id: string;
  band: ReadinessBand;
  /** Day-5 readiness routing derived from the band. */
  route: RouteClass;
  /** Learner-facing study next-best-action (no pathway/visa - that's the Agent). */
  next_action: string;
  /** Latest projected pass probability 0..1, if assessed. */
  readiness?: number;
  theta?: number;
  items_completed: number;
  assessments_taken: number;
  by_client_need?: Record<string, number>;
  sections_completed: number;
  sections_total: number;
  /** Weakest client-need areas (lowest mean score first) - the remediation hint. */
  focus_areas: string[];
  updated_at: string;
}

// ── Pathway tasks (status updates from the Florence Pathway Agent) ──────────
// Append-only event log - each row is a status change. Latest-per-(candidate,
// kind) wins for the candidate-facing display. The Academy does NOT generate
// these; the Pathway Agent posts them through a scoped M2M client.
export type PathwayTaskKind =
  | "university_app"
  | "financing_packet"
  | "i20_readiness"
  | "ds160_guidance"
  | "visa_appointment"
  | "nclex_registration"
  | "att_tracking"
  | "state_licensure"
  | "endorsement"
  | "employer_packet"
  | "human_qa";

export type PathwayTaskStatus =
  | "pending"
  | "in_progress"
  | "awaiting_candidate"
  | "human_qa"
  | "completed"
  | "blocked";

export interface PathwayTaskEvent {
  id: string; // pt_…
  candidate_id: string;
  kind: PathwayTaskKind;
  status: PathwayTaskStatus;
  /** Short note for the candidate when status is awaiting_candidate or blocked. */
  note?: string;
  /** SHA-256 of the canonical payload - tamper-evidence. */
  content_hash: string;
  created_at: string;
}

// ── University Affiliate Network ─────────────────────────────────────────────
// Two tiers (load-bearing): an "eligible" school is just listed - students/alumni
// qualify for the $75 preferred deposit, but Florence makes NO endorsement claim
// and the school's logo never renders. An "affiliate" has a signed agreement.
// "lab_partner" is a deeper relationship (co-branded Live Lab).
export type SchoolTier = "eligible" | "affiliate" | "lab_partner";

/** Outreach lifecycle - internal-only; never visible to the school itself. */
export type OutreachStatus =
  | "eligible_listed" // baseline on creation
  | "contacted"
  | "report_sent"
  | "discussing"
  | "agreement_in_review"
  | "signed_affiliate"
  | "lab_launching";

export interface School {
  id: string; // sch_…
  slug: string; // FLORENCE-PH-UPMANILA (uppercase, hyphenated)
  name: string;
  country: string;
  city?: string;
  /** Names of nursing programs at the school (for the picker). */
  programs?: string[];
  tier: SchoolTier;
  /** TRUE only with a signed agreement; gates name/logo rendering on partner views. */
  logo_use_granted: boolean;
  /** Trusted email domains (e.g. ["upm.edu.ph"]) - power v1 verification. */
  email_domains?: string[];
  /** Internal outreach status - never sent to the school. */
  outreach_status: OutreachStatus;
  /** Internal-only contact for outreach. */
  contact_email?: string;
  created_at: string;
  updated_at: string;
}

export type AffiliationRole = "student" | "alumni";
export type AffiliationVerification =
  | "self_attested" // candidate ticked the box; lowest evidence
  | "email_domain" // matches school.email_domains
  | "manual_qa"; // future: uploaded transcript reviewed by ops

/** One row per (candidate × school) - a candidate can attest to multiple schools (rare). */
export interface CandidateSchoolAffiliation {
  candidate_id: string;
  school_slug: string;
  role: AffiliationRole;
  verification: AffiliationVerification;
  created_at: string;
}

// ── Live cohort + Live Lab attendance (append-only) ──────────────────────────
// One row per (candidate × session). status = present | absent | late. Live Lab
// sessions carry a location (e.g. "Manila Hotel"); fully-online sessions don't.
export type AttendanceStatus = "present" | "absent" | "late";
export interface AttendanceRecord {
  id: string; // att_…
  candidate_id: string;
  /** Cohort code (matches enrollments.cohort) or a stand-alone session id. */
  cohort?: string;
  /** "Manila Hotel" | "MNL University" | undefined (online-only). */
  location?: string;
  /** ISO date (yyyy-mm-dd) - one entry per candidate × session_date × cohort. */
  session_date: string;
  status: AttendanceStatus;
  /** SHA-256 of canonical payload - tamper-evidence. */
  content_hash: string;
  created_at: string;
}

export interface AttendanceRollup {
  total_records: number;
  /** Present + late count as "attended"; this is the headline. */
  attended: number;
  attendance_rate: number; // 0..1
  /** Distinct candidates who attended at least one Live Lab (with a location). */
  live_lab_attendees: number;
  /** Distinct candidates per Live-Lab location. */
  by_location: { location: string; attendees: number }[];
}

// ── Outcomes (append-only production-funnel telemetry) ───────────────────────
// The compounding moat: the platform records whether readiness became a license,
// a job, revenue, and repayment. Append-only + immutable, like assessment_results.
export type OutcomeKind =
  | "nclex_result" // status: pass | fail
  | "att_issued" // Authorization to Test issued
  | "visa_step" // detail: { step, status }
  | "licensure" // status; detail: { state }
  | "employer_offer" // status: offered | accepted | declined
  | "start" // a billable RN start
  | "retention_90d" // status: retained | attrited
  | "repayment"; // status: active | delinquent | paid; amount_cents?

export interface OutcomeEvent {
  id: string; // oc_…
  candidate_id: string;
  kind: OutcomeKind;
  status?: string;
  amount_cents?: number;
  detail?: Record<string, unknown>;
  /** When the outcome happened (vs created_at = when it was recorded). */
  occurred_at: string;
  /** SHA-256 of the canonical payload - tamper-evidence. */
  content_hash: string;
  created_at: string;
}

/** Distinct-candidate counts per milestone - the conversion tail. */
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

// ── Leads (Florence core nurse pipeline → Academy ops) ──────────────────────
//
// A `Lead` is a NURSE that exists in the Florence core system but has not yet
// signed up for the Academy (or has, in which case they're cross-linked to a
// candidate). Imported weekly from CSV today; eventually pushed live via API.
//
// SAFETY: Leads live in the ops layer. They are NEVER queried from the
// candidate-facing app or returned in any public endpoint. The boundary is
// the same as the deposit/payments and CRM-sync boundaries: regulated data
// stays out of /learn.

export type LeadType = "Imported Lead" | "User" | "Student Lead";

export type NclexStatus =
  | "Passed"
  | "Not Passed"
  | "Authorized"
  | "Planned"
  | "Not_planned";

export type ApplicationStatus =
  | "not_applied"
  | "applied_not_accepted"
  | "accepted"
  | "draft";

export type EvaluationStatus =
  | "N/A"
  | "has_copy"
  | "never_received"
  | "no_access";

export interface Lead {
  id: string; // ld_…
  email: string; // lowercase canonical
  external_id?: string; // Florence core lead id, if surfaced in the export
  firstname?: string;
  lastname?: string;
  fullname?: string;
  country?: string;
  phone?: string;
  job_unit?: string;
  type?: LeadType;
  nclex_status?: NclexStatus;
  application_status?: ApplicationStatus;
  evaluation_status?: EvaluationStatus;
  assigned?: string; // ops user / advisor name
  video_screen?: boolean;
  signup_at?: string; // when they joined Florence core
  /** Slug into the school directory, set once we can join leads to schools.
   *  Today the export doesn't carry school; we'll backfill once core ships it. */
  school_slug?: string;
  // ── Drip campaign (Phase 3) - all optional so the CSV importer path is
  //    untouched. A lead enters the drip only via the operator enroll flow. ──
  /** Where the lead sits in the lifecycle funnel. Defaults to "new". */
  lifecycle_stage?: LeadLifecycleStage;
  /** True once the lead opts in (clicks the re-permission email's CTA) or an
   *  operator marks a documented-consent segment. Gates every send. */
  consent_marketing?: boolean;
  /** 0-based index of the last drip stage SENT to this lead. */
  drip_step?: number;
  drip_enrolled_at?: string;
  /** Last time any drip email was sent - gates the per-stage re-send window. */
  last_contacted_at?: string;
  /** Set when the lead one-click unsubscribes; terminal for the drip. */
  unsubscribed_at?: string;
  /** Opaque token minted at enroll time; powers the public unsubscribe +
   *  school-enrichment callbacks (no auth, single lead). */
  unsubscribe_token?: string;
  source: string; // "csv:2026-06-06" | "api:v1" | "manual"
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

/** Lead lifecycle funnel for the drip campaign.
 *   new        - imported, not in the drip
 *   invited    - opt-in (re-permission) email sent, awaiting a click
 *   engaged    - consented; receiving the value sequence
 *   reserved   - started a deposit checkout
 *   enrolled   - paid deposit / became a candidate
 *   converted  - downstream outcome (RN start)
 *   suppressed - unsubscribed or hard-bounced; terminal */
export type LeadLifecycleStage =
  | "new"
  | "invited"
  | "engaged"
  | "reserved"
  | "enrolled"
  | "converted"
  | "suppressed";

/** Append-only event for every meaningful change to a Lead. Drives the
 *  "status changes since last import" reconciliation view + the drip
 *  campaign's trigger + audit conditions. */
export type LeadEventKind =
  | "imported"
  | "status_change"
  | "merged"
  | "manual_edit"
  | "drip_send" // a drip email was dispatched
  | "drip_advance" // lifecycle_stage transitioned
  | "drip_consent" // opted in (re-permission click / enrichment)
  | "drip_unsubscribe"; // one-click opt-out

export interface LeadEvent {
  id: string; // le_…
  lead_id: string;
  kind: LeadEventKind;
  /** Partial before/after - only the fields that actually changed.
   *  Values are JSON-serializable Lead field values (string/number/boolean). */
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  source: string; // "csv:…" | "api:v1" | "ops"
  actor: string; // "ops" | "system" | client_id
  occurred_at: string;
  /** Tamper-evidence chain, same shape as audit + outcome events. */
  prev_hash: string;
  content_hash: string;
}

// ── Outreach campaigns (Lob print + mail) ───────────────────────────────────
//
// A campaign is a batch of mail pieces aimed at signing up universities (today)
// or other entities (associations, employers) as Florence Academy partners.
// Each target gets a deterministic FLOR-XXXXX activation code; the QR + URL on
// the mailpiece let recipients self-activate, which flips the school's tier
// and unlocks the alumni discount.
//
// Design constraints on the mailpiece (from the existing Florence brand):
//   - Value + activation copy ONLY. No FICA / visa / tax / immigration ever.
//   - No italics. No em-dashes. Period.
//   - Theme: teal or purple per brand tokens.
//
// SAFETY: outreach lives in ops. Never returned in any candidate-facing
// endpoint. Lob API keys are NEVER bundled with the SPA - operator types
// the key per campaign launch into a sessionStorage-only credential field.

export type OutreachKind =
  | "university"
  | "nursing_association"
  | "employer"
  | "hospital";

export type OutreachMailFormat = "postcard_6x11" | "letter_us";

export type OutreachTheme = "teal" | "purple";

export type OutreachCampaignStatus =
  | "draft" // operator setting up
  | "queued" // targets locked, awaiting send
  | "sending" // batch in flight
  | "sent" // all pieces dispatched to Lob
  | "completed" // all pieces delivered or terminal
  | "cancelled";

export interface OutreachCampaign {
  id: string;
  name: string;
  kind: OutreachKind;
  mail_format: OutreachMailFormat;
  status: OutreachCampaignStatus;
  theme: OutreachTheme;
  notes?: string;
  /** Cheap counters projected from outreach_targets for the list view. */
  totals: {
    targets: number;
    sent: number;
    delivered: number;
    activated: number;
  };
  created_at: string;
  updated_at: string;
}

export type OutreachTargetStatus =
  | "queued" // added to campaign, not yet sent
  | "rendered" // preview produced; ready to dispatch
  | "sent" // dispatched to Lob, awaiting USPS pickup
  | "in_transit" // first USPS scan
  | "delivered" // delivered to mailbox
  | "returned" // returned_to_sender
  | "activated" // QR code redeemed → partner application started
  | "declined"; // operator marked as not a fit / rejected

export interface OutreachTarget {
  id: string;
  campaign_id: string;
  /** Optional join to schools.slug. PNA chapters won't have one. */
  school_slug?: string;
  org_name: string; // "University of Edinburgh" / "PNA Greater Toronto Chapter"
  recipient_name?: string; // "Dr. Jane Smith"
  recipient_title?: string; // "Dean of Nursing"
  /** Mailing address - Lob verifies + standardizes on send. */
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string; // ISO-3166 alpha-2 or full name
  /** Deterministic FLOR-XXXXX, stable for a given (campaign, school_slug|org_name). */
  activation_code: string;
  status: OutreachTargetStatus;
  /** Free-text contact-method notes from ops (email, LinkedIn, etc.). */
  contact_notes?: string;
  sent_at?: string;
  delivered_at?: string;
  activated_at?: string;
  created_at: string;
  updated_at: string;
}

export type MailPieceMode = "test" | "live";
export type MailPieceStatus =
  | "rendered" // HTML produced, not yet sent to Lob
  | "created" // Lob created the postcard/letter id
  | "in_transit"
  | "in_local_area"
  | "processed_for_delivery"
  | "delivered"
  | "re_routed"
  | "returned_to_sender";

export interface MailPiece {
  id: string;
  target_id: string;
  campaign_id: string;
  /** Lob id (psc_… | ltr_…). Null until Lob creates it. */
  lob_id?: string;
  format: OutreachMailFormat;
  mode: MailPieceMode; // test vs live key that created this
  status: MailPieceStatus;
  /** Per-piece cost in cents from Lob's `price` response (live mode only). */
  cost_cents?: number;
  /** Lob's preview PDF URL (test mode renders a real PDF, no mail). */
  preview_url?: string;
  sent_at?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MailPieceEvent {
  id: string;
  mail_piece_id: string;
  /** Lob's event id (deduped if the same webhook fires twice). */
  lob_event_id?: string;
  event_type: string; // "postcard.in_transit" | "postcard.delivered" | …
  /** Whole raw Lob payload, for audit. */
  payload: Record<string, unknown>;
  occurred_at: string;
  prev_hash: string;
  content_hash: string;
}
