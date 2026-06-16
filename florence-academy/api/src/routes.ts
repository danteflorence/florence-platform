// Route handlers + the route table. Handlers are async (the store is async) and
// those that don't need shared deps simply omit the second parameter.

import type { ReqCtx, Route, Deps } from "./http.ts";
import {
  arr,
  authRateLimitOk,
  bool,
  clearLoginFailures,
  compile,
  err,
  loginLockRemaining,
  num,
  obj,
  pagination,
  recordLoginFailure,
  send,
  str,
  validationError,
} from "./http.ts";
import { buildClient, hasScope, issueCandidateSession, issueSessionToken, issueToken, safePrincipal } from "./auth.ts";
import { verifyJwt } from "./crypto.ts";
import { isStaff as coreIsStaff } from "./coreAuth.ts";
import { agoraAppId, agoraConfigured, buildRtcToken } from "./agora.ts";
import { recordingConfigured, recordingPublicBase, startRecording, stopRecording, type RecordingHandle } from "./agoraRecording.ts";
import { listRecordings, saveRecording } from "./recordingsStore.ts";
import { publicManifest, assetFilePath } from "./audioStore.ts";
import { tutorConfigured, tutorSignedUrl } from "./elevenlabs.ts";
import { emitPassport, passportEnabled } from "./passport.ts";
import { readFileSync } from "node:fs";
import { validate, type Schema } from "./validate.ts";
import { config } from "./config.ts";
import { hashSecret, verifySecret } from "./crypto.ts";
import { computeReadiness } from "./readiness.ts";
import { buildPathwayIntake } from "./pathway.ts";
import { computeCohortCopilot } from "./copilot.ts";
import { renderMailpiece } from "./mailpiece.ts";
import {
  countryToIso2,
  lobIdempotencyKey,
  lobKeyMode,
  verifyLobSignature,
} from "./outreach.ts";
import { lobCreate, LobError, priceDollarsToCents, type LobAddress } from "./lob_client.ts";
import { timingSafeEqual } from "node:crypto";
import {
  DRIP_MAX_STEP,
  renderDripStage,
  stageAdvanceTarget,
  type DripContext,
} from "./drip_copy.ts";
import { buildInterviewPacket, computeUniversityOverview, isReadinessCleared } from "./partners.ts";
import { cohortPassRates, publishedReport } from "./cohortStats.ts";
import type {
  AffiliationRole,
  AffiliationVerification,
  AssessmentKind,
  AssessmentResult,
  Candidate,
  CohortStatus,
  Consent,
  EnrollmentStatus,
  Lead,
  OutcomeKind,
  OutreachStatus,
  OutreachCampaignStatus,
  OutreachKind,
  OutreachMailFormat,
  OutreachTheme,
  PathwayTaskKind,
  PathwayTaskStatus,
  PaymentStatus,
  ProgressStatus,
  ReadinessSnapshot,
  School,
  SchoolTier,
  Scope,
} from "./types.ts";
import { isScope } from "./types.ts";

const PROGRESS_STATUSES: readonly ProgressStatus[] = [
  "not_started",
  "in_progress",
  "completed",
];

const SCHOOL_TIERS: readonly SchoolTier[] = ["eligible", "affiliate", "lab_partner"];
const OUTREACH_STATUSES: readonly OutreachStatus[] = [
  "eligible_listed", "contacted", "report_sent", "discussing",
  "agreement_in_review", "signed_affiliate", "lab_launching",
];
const AFFILIATION_ROLES: readonly AffiliationRole[] = ["student", "alumni"];
const PATHWAY_TASK_KINDS: readonly PathwayTaskKind[] = [
  "university_app", "financing_packet", "i20_readiness", "ds160_guidance",
  "visa_appointment", "nclex_registration", "att_tracking", "state_licensure",
  "endorsement", "employer_packet", "human_qa",
];
const PATHWAY_TASK_STATUSES: readonly PathwayTaskStatus[] = [
  "pending", "in_progress", "awaiting_candidate", "human_qa", "completed", "blocked",
];

const OUTCOME_KINDS: readonly OutcomeKind[] = [
  "nclex_result",
  "att_issued",
  "visa_step",
  "licensure",
  "employer_offer",
  "start",
  "retention_90d",
  "repayment",
];

const ASSESSMENT_KINDS: readonly AssessmentKind[] = [
  "tutor",
  "nightly",
  "adaptive_exam",
  "timed",
  "diagnostic",
];
const ENROLLMENT_STATUSES: readonly EnrollmentStatus[] = [
  "registered",
  "deposit_paid",
  "attending",
  "completed",
  "withdrawn",
];
const PAYMENT_STATUSES: readonly PaymentStatus[] = [
  "pending",
  "paid",
  "refunded",
  "credited",
  "failed",
];
const PAYMENT_KINDS = ["commitment_deposit", "tuition", "other"] as const;
const COHORT_STATUSES: readonly CohortStatus[] = [
  "scheduled",
  "active",
  "completed",
  "cancelled",
];

const SCHEMAS = {
  candidate: {
    full_name: { type: "string", required: true, min: 1, max: 200 },
    email: { type: "string", max: 320 },
    phone: { type: "string", max: 40 },
    country: { type: "string", max: 80 },
    external_ref: { type: "string", max: 200 },
    consent: { type: "object" },
  },
  enrollment: {
    candidate_id: { type: "string", required: true, max: 64 },
    cohort: { type: "string", required: true, min: 1, max: 80 },
    status: { type: "string", enum: ENROLLMENT_STATUSES },
  },
  enrollmentStatus: {
    status: { type: "string", required: true, enum: ENROLLMENT_STATUSES },
  },
  assessment: {
    candidate_id: { type: "string", required: true, max: 64 },
    kind: { type: "string", required: true, enum: ASSESSMENT_KINDS },
    readiness: { type: "number", min: 0, max: 1 },
    theta: { type: "number" },
    items_completed: { type: "integer", min: 0 },
    by_client_need: { type: "object" },
    by_cjmm: { type: "object" },
    mastery: { type: "array" },
    supersedes: { type: "string", max: 64 },
  },
  payment: {
    candidate_id: { type: "string", required: true, max: 64 },
    kind: { type: "string", required: true, enum: PAYMENT_KINDS },
    amount_cents: { type: "integer", required: true, min: 0 },
    currency: { type: "string", required: true, min: 1, max: 8 },
    status: { type: "string", enum: PAYMENT_STATUSES },
    processor: { type: "string", max: 40 },
    processor_ref: { type: "string", required: true, max: 200 },
  },
  client: {
    client_id: { type: "string", required: true, min: 1, max: 128 },
    name: { type: "string", required: true, min: 1, max: 200 },
    secret: { type: "string", required: true, min: 8, max: 512 },
    scopes: { type: "array", required: true, itemsType: "string" },
  },
  sessionToken: {
    candidate_id: { type: "string", required: true, max: 64 },
    scopes: { type: "array", itemsType: "string" },
    ttl_sec: { type: "integer", min: 60, max: 3600 },
  },
  introspect: {
    token: { type: "string", required: true },
  },
  cohort: {
    code: { type: "string", required: true, min: 1, max: 64 },
    name: { type: "string", required: true, min: 1, max: 200 },
    starts_at: { type: "string", max: 40 },
    capacity: { type: "integer", min: 1 },
    instructor_ref: { type: "string", max: 200 },
    status: { type: "string", enum: COHORT_STATUSES },
    covered_through_section: { type: "integer", min: 0, max: 100 },
  },
  cohortPatch: {
    name: { type: "string", min: 1, max: 200 },
    starts_at: { type: "string", max: 40 },
    capacity: { type: "integer", min: 1 },
    instructor_ref: { type: "string", max: 200 },
    status: { type: "string", enum: COHORT_STATUSES },
    covered_through_section: { type: "integer", min: 0, max: 100 },
  },
  cohortCoverage: {
    covered_through_section: { type: "integer", required: true, min: 0, max: 100 },
    override: { type: "boolean" },
  },
  leadImport: {
    // Operator-supplied source label (e.g. "csv:2026-06-06"). REQUIRED so
    // every imported row carries a provenance string in its event log.
    source: { type: "string", required: true, min: 3, max: 80 },
    leads: { type: "array", required: true },
  },
  lead: {
    email: { type: "string", required: true, min: 3, max: 320 },
    external_id: { type: "string", max: 200 },
    firstname: { type: "string", max: 200 },
    lastname: { type: "string", max: 200 },
    fullname: { type: "string", max: 400 },
    country: { type: "string", max: 80 },
    phone: { type: "string", max: 40 },
    job_unit: { type: "string", max: 200 },
    type: { type: "string", enum: ["Imported Lead", "User", "Student Lead"] as const },
    nclex_status: {
      type: "string",
      enum: ["Passed", "Not Passed", "Authorized", "Planned", "Not_planned"] as const,
    },
    application_status: {
      type: "string",
      enum: ["not_applied", "applied_not_accepted", "accepted", "draft"] as const,
    },
    evaluation_status: {
      type: "string",
      enum: ["N/A", "has_copy", "never_received", "no_access"] as const,
    },
    assigned: { type: "string", max: 200 },
    video_screen: { type: "boolean" },
    signup_at: { type: "string", max: 40 },
    school_slug: { type: "string", max: 64 },
  },
  signup: {
    full_name: { type: "string", required: true, min: 1, max: 200 },
    email: { type: "string", required: true, min: 3, max: 320 },
    password: { type: "string", required: true, min: 8, max: 200 },
    country: { type: "string", max: 80 },
    consent: { type: "object" },
  },
  login: {
    email: { type: "string", required: true, min: 3, max: 320 },
    password: { type: "string", required: true, min: 1, max: 200 },
  },
  progress: {
    section_slug: { type: "string", required: true, min: 1, max: 120 },
    status: { type: "string", enum: PROGRESS_STATUSES },
    percent: { type: "number", min: 0, max: 100 },
    last_segment: { type: "string", max: 200 },
  },
  checkout: {
    candidate_id: { type: "string", max: 64 },
  },
  verifyEmail: {
    token: { type: "string", required: true, min: 8, max: 200 },
  },
  outcome: {
    candidate_id: { type: "string", required: true, max: 64 },
    kind: { type: "string", required: true, enum: OUTCOME_KINDS },
    status: { type: "string", max: 40 },
    amount_cents: { type: "integer", min: 0 },
    detail: { type: "object" },
    occurred_at: { type: "string", max: 40 },
  },
  employerOffer: {
    candidate_id: { type: "string", required: true, max: 64 },
    status: { type: "string", enum: ["offered", "accepted", "declined"] },
  },
  attendance: {
    candidate_id: { type: "string", required: true, max: 64 },
    cohort: { type: "string", max: 80 },
    location: { type: "string", max: 120 },
    session_date: { type: "string", required: true, min: 10, max: 10 },
    status: { type: "string", required: true, enum: ["present", "absent", "late"] as const },
  },
  school: {
    slug: { type: "string", required: true, min: 3, max: 64 },
    name: { type: "string", required: true, min: 1, max: 200 },
    country: { type: "string", required: true, min: 1, max: 80 },
    city: { type: "string", max: 120 },
    programs: { type: "array", itemsType: "string" },
    tier: { type: "string", enum: SCHOOL_TIERS },
    logo_use_granted: { type: "boolean" },
    email_domains: { type: "array", itemsType: "string" },
    outreach_status: { type: "string", enum: OUTREACH_STATUSES },
    contact_email: { type: "string", max: 320 },
  },
  schoolPatch: {
    name: { type: "string", min: 1, max: 200 },
    country: { type: "string", min: 1, max: 80 },
    city: { type: "string", max: 120 },
    programs: { type: "array", itemsType: "string" },
    tier: { type: "string", enum: SCHOOL_TIERS },
    logo_use_granted: { type: "boolean" },
    email_domains: { type: "array", itemsType: "string" },
    outreach_status: { type: "string", enum: OUTREACH_STATUSES },
    contact_email: { type: "string", max: 320 },
  },
  affiliation: {
    school_slug: { type: "string", required: true, min: 3, max: 64 },
    role: { type: "string", required: true, enum: AFFILIATION_ROLES },
  },
  pathwayTask: {
    kind: { type: "string", required: true, enum: PATHWAY_TASK_KINDS },
    status: { type: "string", required: true, enum: PATHWAY_TASK_STATUSES },
    note: { type: "string", max: 500 },
  },
} satisfies Record<string, Schema>;

function toConsent(o: Record<string, unknown> | undefined): Consent | undefined {
  if (!o) return undefined;
  const c: Consent = {};
  if (typeof o["service"] === "boolean") c.service = o["service"];
  if (typeof o["crm_sync"] === "boolean") c.crm_sync = o["crm_sync"];
  if (typeof o["underwriting"] === "boolean") c.underwriting = o["underwriting"];
  if (typeof o["pathway"] === "boolean") c.pathway = o["pathway"];
  if (typeof o["financing"] === "boolean") c.financing = o["financing"];
  if (typeof o["employer_sharing"] === "boolean") c.employer_sharing = o["employer_sharing"];
  return c;
}

function scopeList(v: unknown): Scope[] {
  if (!Array.isArray(v)) return [];
  return v.filter((s): s is Scope => typeof s === "string" && isScope(s));
}

/** Session (candidate-bound) tokens may only act on their own candidate. */
function boundOk(ctx: ReqCtx, candidateId: string | undefined): boolean {
  const bound = ctx.auth?.candidateId;
  return !bound || candidateId === bound;
}
/** Session tokens cannot enumerate all records (no per-candidate filter). */
function isSessionToken(ctx: ReqCtx): boolean {
  return Boolean(ctx.auth?.candidateId);
}

// Purpose limitation: a read tagged `X-Purpose: underwriting` for a specific
// candidate requires that candidate's explicit `underwriting` consent.
async function underwritingBlocked(ctx: ReqCtx, deps: Deps): Promise<boolean> {
  if (ctx.headers["x-purpose"] !== "underwriting") return false;
  const candId = ctx.query.get("candidate_id");
  if (!candId) return false;
  const cand = await deps.store.candidates.get(candId);
  return !(cand && cand.consent.underwriting === true);
}

// ── OAuth2 token ────────────────────────────────────────────────────────────
async function postToken(ctx: ReqCtx, deps: Deps): Promise<void> {
  let clientId = str(ctx.body, "client_id");
  let clientSecret = str(ctx.body, "client_secret");
  const authH = ctx.headers["authorization"];
  if ((!clientId || !clientSecret) && typeof authH === "string" && authH.startsWith("Basic ")) {
    const dec = Buffer.from(authH.slice(6), "base64").toString("utf8");
    const i = dec.indexOf(":");
    if (i >= 0) {
      clientId = dec.slice(0, i);
      clientSecret = dec.slice(i + 1);
    }
  }
  if (str(ctx.body, "grant_type") !== "client_credentials")
    return err(ctx, 400, "unsupported_grant_type", "grant_type must be client_credentials");
  if (!clientId || !clientSecret)
    return err(ctx, 401, "invalid_client", "missing client credentials");
  const res = await issueToken(deps.store, clientId, clientSecret, str(ctx.body, "scope"));
  if (!res.ok) return err(ctx, res.status, res.error, "client authentication failed");
  ctx.resourceType = "token";
  ctx.resourceId = clientId;
  send(ctx, 200, res.token);
}

function getHealth(ctx: ReqCtx): void {
  send(ctx, 200, { ok: true, service: "florence-academy-api" });
}

// "Who am I?" per the shared FlorenceRN Core cookie (or Bearer). Public route —
// returns the Core principal so any academy surface can gate on the SSO session.
async function getSession(ctx: ReqCtx): Promise<void> {
  const p = await safePrincipal({ headers: ctx.headers });
  if (!p) return send(ctx, 200, { authenticated: false });
  send(ctx, 200, {
    authenticated: true,
    email: p.email ?? null,
    role: p.role ?? null,
    roles: p.roles,
    cand: p.cand ?? null,
    staff: coreIsStaff(p),
  });
}

// Whether the live A/V (Agora) is wired on this instance — lets the SPA show the
// classroom video or fall back to slides-only.
function getLiveConfig(ctx: ReqCtx): void {
  send(ctx, 200, {
    configured: agoraConfigured(),
    appId: agoraConfigured() ? agoraAppId() : null,
    recordingBase: recordingPublicBase(),
  });
}

// Mint a role-scoped Agora RTC token for a live class. Instructors/ops join as
// HOST (publisher); everyone else as AUDIENCE (subscriber). Gated by the Core
// session — only an authenticated user gets a token, only staff get publish.
const LIVE_HOST_ROLES = new Set(["super_admin", "ops", "instructor"]);
async function postLiveToken(ctx: ReqCtx): Promise<void> {
  if (!agoraConfigured())
    return err(ctx, 503, "not_configured", "live A/V is not configured on this instance");
  const p = await safePrincipal({ headers: ctx.headers });
  if (!p) return err(ctx, 401, "unauthorized", "sign in to join the live class");
  const channel = (str(ctx.body, "channel") ?? "").trim();
  if (!channel || channel.length > 64) return err(ctx, 400, "invalid_channel", "a channel is required");
  const publisher = (p.roles ?? []).some((r) => LIVE_HOST_ROLES.has(r));
  send(ctx, 200, buildRtcToken(channel, publisher));
}

// ── Live class cloud recording (Agora → your bucket) ────────────────────────
// In-memory per-channel handle for this process; the durable artifact is the mp4
// in your storage bucket. (Persist sids to the store for a full replay library.)
const activeRecordings = new Map<string, RecordingHandle & { since: string }>();

function isLiveHost(roles: string[] | undefined): boolean {
  return (roles ?? []).some((r) => LIVE_HOST_ROLES.has(r));
}

async function postRecordingStart(ctx: ReqCtx): Promise<void> {
  const p = await safePrincipal({ headers: ctx.headers });
  if (!p) return err(ctx, 401, "unauthorized", "sign in to record");
  if (!isLiveHost(p.roles)) return err(ctx, 403, "forbidden", "only instructors can record");
  if (!recordingConfigured()) return err(ctx, 503, "not_configured", "cloud recording is not configured");
  const channel = (str(ctx.body, "channel") ?? "").trim();
  if (!channel) return err(ctx, 400, "invalid_channel", "a channel is required");
  const existing = activeRecordings.get(channel);
  if (existing) return send(ctx, 200, { recording: true, since: existing.since, sid: existing.sid });
  try {
    const h = await startRecording(channel);
    const since = new Date().toISOString();
    activeRecordings.set(channel, { ...h, since });
    send(ctx, 200, { recording: true, since, sid: h.sid });
  } catch (e) {
    err(ctx, 502, "recording_failed", (e as Error).message);
  }
}

async function postRecordingStop(ctx: ReqCtx): Promise<void> {
  const p = await safePrincipal({ headers: ctx.headers });
  if (!p) return err(ctx, 401, "unauthorized", "sign in");
  if (!isLiveHost(p.roles)) return err(ctx, 403, "forbidden", "only instructors can record");
  const channel = (str(ctx.body, "channel") ?? "").trim();
  const h = activeRecordings.get(channel);
  if (!h) return send(ctx, 200, { recording: false, files: [] });
  try {
    const { files } = await stopRecording(channel, h);
    activeRecordings.delete(channel);
    const endedAt = new Date().toISOString();
    void saveRecording({
      id: h.sid,
      channel,
      files,
      startedAt: h.since,
      endedAt,
      durationSec: Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(h.since)) / 1000)),
      ...(p.email ? { by: p.email } : {}),
    });
    send(ctx, 200, { recording: false, files });
  } catch (e) {
    activeRecordings.delete(channel);
    err(ctx, 502, "recording_failed", (e as Error).message);
  }
}

// Replay library: list past recordings (optionally for one channel). Any
// signed-in user can browse replays; playback URL = base + file key.
async function postRecordingsList(ctx: ReqCtx): Promise<void> {
  const p = await safePrincipal({ headers: ctx.headers });
  if (!p) return err(ctx, 401, "unauthorized", "sign in");
  const channel = (str(ctx.body, "channel") ?? "").trim();
  const recordings = await listRecordings(channel || undefined, 100);
  send(ctx, 200, { recordings, base: recordingPublicBase() });
}

async function postRecordingStatus(ctx: ReqCtx): Promise<void> {
  const p = await safePrincipal({ headers: ctx.headers });
  if (!p) return err(ctx, 401, "unauthorized", "sign in");
  const channel = (str(ctx.body, "channel") ?? "").trim();
  const h = channel ? activeRecordings.get(channel) : undefined;
  send(ctx, 200, { configured: recordingConfigured(), recording: Boolean(h), since: h?.since ?? null });
}

// ── Pre-recorded narration (ElevenLabs) ─────────────────────────────────────
// The always-on async layer: a generated MP3 per question rationale + lesson
// segment. Manifest maps stable content key → playback URL; files are static
// (generated once), so these are public + cacheable like any other content asset.
function getAudioManifest(ctx: ReqCtx): void {
  ctx.res.setHeader("cache-control", "public, max-age=300");
  send(ctx, 200, publicManifest());
}

// Serve one generated clip from disk (when no CDN base is configured). Binary,
// so it bypasses send()'s JSON path and streams the bytes directly.
function getAudioFile(ctx: ReqCtx): void {
  const name = ctx.params["name"] ?? "";
  const path = assetFilePath(name);
  if (!path) return err(ctx, 404, "not_found", "no such audio file");
  const buf = readFileSync(path);
  ctx.res.writeHead(200, {
    "content-type": "audio/mpeg",
    "content-length": String(buf.length),
    "x-content-type-options": "nosniff",
    "cache-control": "public, max-age=31536000, immutable",
  });
  ctx.res.end(buf);
}

// ── Conversational voice tutor (ElevenLabs Agents) ──────────────────────────
// config is public (so the SPA can show/hide the button); a session signed URL
// is gated to signed-in learners because it consumes grant minutes.
function getTutorConfig(ctx: ReqCtx): void {
  send(ctx, 200, { configured: tutorConfigured() });
}

async function postTutorSession(ctx: ReqCtx): Promise<void> {
  const p = await safePrincipal({ headers: ctx.headers });
  if (!p) return err(ctx, 401, "unauthorized", "sign in to talk to the tutor");
  if (!tutorConfigured()) return err(ctx, 503, "not_configured", "voice tutor is not configured on this instance");
  try {
    const signedUrl = await tutorSignedUrl();
    send(ctx, 200, { signedUrl });
  } catch (e) {
    err(ctx, 502, "tutor_unavailable", (e as Error).message);
  }
}

// ── session token exchange (browser-safe, candidate-bound) ──────────────────
// A trusted backend (holding `tokens:mint`) exchanges proof of a signed-in
// student for a short-lived token bound to that one candidate, downscoped (e.g.
// performance:write only). Safe to hand to the browser.
async function mintSessionToken(ctx: ReqCtx, deps: Deps): Promise<void> {
  if (!ctx.auth) return err(ctx, 401, "unauthorized", "authentication required");
  const verr = validate(ctx.body, SCHEMAS.sessionToken);
  if (!verr.ok) return validationError(ctx, verr.errors);
  const candidate_id = str(ctx.body, "candidate_id");
  if (!candidate_id)
    return err(ctx, 400, "invalid_request", "candidate_id is required");
  if (!(await deps.store.candidates.get(candidate_id)))
    return err(ctx, 400, "invalid_request", "unknown candidate_id");
  const requested = scopeList((ctx.body as Record<string, unknown> | null)?.["scopes"]);
  const scopes = requested.length ? requested : [...ctx.auth.scopes];
  const res = issueSessionToken(ctx.auth, candidate_id, scopes, num(ctx.body, "ttl_sec") ?? 600);
  if (!res.ok) return err(ctx, res.status, res.error, "could not mint session token");
  ctx.resourceType = "session_token";
  ctx.resourceId = candidate_id;
  send(ctx, 201, res.token);
}

// Revoke a token before its TTL. No body → revoke the presented token (logout);
// any authenticated token can do that. Revoking a *different* jti needs
// tokens:mint (the backend that minted children can kill them).
async function revokeToken(ctx: ReqCtx, deps: Deps): Promise<void> {
  if (!ctx.auth) return err(ctx, 401, "unauthorized", "authentication required");
  const targetJti = str(ctx.body, "jti");
  if (targetJti && targetJti !== ctx.auth.jti && !hasScope(ctx.auth, "tokens:mint"))
    return err(ctx, 403, "forbidden", "revoking another token requires tokens:mint");
  const jti = targetJti ?? ctx.auth.jti;
  const exp = jti === ctx.auth.jti ? ctx.auth.exp : Math.floor(Date.now() / 1000) + config.tokenTtlSec;
  deps.revocations.revoke(jti, exp);
  ctx.resourceType = "token_revocation";
  ctx.resourceId = jti;
  send(ctx, 200, { revoked: jti });
}

// RFC 7662-style introspection: a backend submits a token; we report whether
// it's active and (if so) its claims. Protected (tokens:mint). An expired,
// revoked, or wrong-audience token returns { active: false }.
function introspectToken(ctx: ReqCtx, deps: Deps): void {
  const verr = validate(ctx.body, SCHEMAS.introspect);
  if (!verr.ok) return validationError(ctx, verr.errors);
  const token = str(ctx.body, "token") ?? "";
  const res = verifyJwt(token, config.jwtSecret, Math.floor(Date.now() / 1000));
  if (
    !res.ok ||
    res.payload.aud !== config.jwtAudience ||
    res.payload.iss !== config.jwtIssuer ||
    deps.revocations.isRevoked(res.payload.jti)
  ) {
    return send(ctx, 200, { active: false });
  }
  const p = res.payload;
  ctx.resourceType = "token_introspection";
  ctx.resourceId = p.jti;
  send(ctx, 200, {
    active: true,
    scope: p.scope,
    client_id: p.sub,
    sub: p.sub,
    exp: p.exp,
    iat: p.iat,
    jti: p.jti,
    ...(p.cand && { cand: p.cand }),
  });
}

// ── partner client registry ─────────────────────────────────────────────────
async function createClient(ctx: ReqCtx, deps: Deps): Promise<void> {
  const verr = validate(ctx.body, SCHEMAS.client);
  if (!verr.ok) return validationError(ctx, verr.errors);
  const client_id = str(ctx.body, "client_id");
  const name = str(ctx.body, "name");
  const secret = str(ctx.body, "secret");
  const scopes = scopeList((ctx.body as Record<string, unknown> | null)?.["scopes"]);
  if (!client_id || !name || !secret)
    return err(ctx, 400, "invalid_request", "client_id, name, secret are required");
  if (scopes.length === 0)
    return err(ctx, 400, "invalid_request", "at least one valid scope is required");
  if (await deps.store.clients.get(client_id))
    return err(ctx, 409, "conflict", "client_id already exists");
  await deps.store.clients.create(buildClient(client_id, name, secret, scopes));
  ctx.resourceType = "client";
  ctx.resourceId = client_id;
  // Never echo the secret hash; the caller already holds the secret.
  send(ctx, 201, { client_id, name, allowed_scopes: scopes, active: true });
}
async function rotateClient(ctx: ReqCtx, deps: Deps): Promise<void> {
  const id = ctx.params["id"] ?? "";
  const secret = str(ctx.body, "secret");
  ctx.resourceType = "client";
  ctx.resourceId = id;
  if (!secret) return err(ctx, 400, "invalid_request", "secret is required");
  const updated = await deps.store.clients.rotateSecret(id, hashSecret(secret));
  if (!updated) return err(ctx, 404, "not_found", "client not found");
  send(ctx, 200, { client_id: id, rotated: true });
}

// ── candidates ──────────────────────────────────────────────────────────────
async function listCandidates(ctx: ReqCtx, deps: Deps): Promise<void> {
  if (isSessionToken(ctx))
    return err(ctx, 403, "forbidden", "session tokens cannot list candidates");
  const { cursor, limit } = pagination(ctx.query);
  send(ctx, 200, await deps.store.candidates.list(cursor, limit));
}
async function createCandidate(ctx: ReqCtx, deps: Deps): Promise<void> {
  if (isSessionToken(ctx))
    return err(ctx, 403, "forbidden", "session tokens cannot create candidates");
  const verr = validate(ctx.body, SCHEMAS.candidate);
  if (!verr.ok) return validationError(ctx, verr.errors);
  const full_name = str(ctx.body, "full_name");
  if (!full_name) return err(ctx, 400, "invalid_request", "full_name is required");
  const c = await deps.store.candidates.create({
    full_name,
    external_ref: str(ctx.body, "external_ref"),
    email: str(ctx.body, "email"),
    phone: str(ctx.body, "phone"),
    country: str(ctx.body, "country"),
    consent: toConsent(obj(ctx.body, "consent")),
  });
  ctx.resourceType = "candidate";
  ctx.resourceId = c.id;
  send(ctx, 201, c);
}
async function getCandidate(ctx: ReqCtx, deps: Deps): Promise<void> {
  const id = ctx.params["id"] ?? "";
  ctx.resourceType = "candidate";
  ctx.resourceId = id;
  if (!boundOk(ctx, id))
    return err(ctx, 403, "forbidden", "token is bound to a different candidate");
  const c = await deps.store.candidates.get(id);
  if (!c) return err(ctx, 404, "not_found", "candidate not found");
  send(ctx, 200, c);
}
async function patchCandidate(ctx: ReqCtx, deps: Deps): Promise<void> {
  const id = ctx.params["id"] ?? "";
  ctx.resourceType = "candidate";
  ctx.resourceId = id;
  if (!boundOk(ctx, id))
    return err(ctx, 403, "forbidden", "token is bound to a different candidate");
  const c = await deps.store.candidates.patch(id, {
    email: str(ctx.body, "email"),
    phone: str(ctx.body, "phone"),
    country: str(ctx.body, "country"),
    consent: toConsent(obj(ctx.body, "consent")),
  });
  if (!c) return err(ctx, 404, "not_found", "candidate not found");
  send(ctx, 200, c);
}

// ── enrollments ─────────────────────────────────────────────────────────────
async function listEnrollments(ctx: ReqCtx, deps: Deps): Promise<void> {
  if (isSessionToken(ctx))
    return err(ctx, 403, "forbidden", "session tokens cannot list enrollments");
  const { cursor, limit } = pagination(ctx.query);
  send(ctx, 200, await deps.store.enrollments.list(cursor, limit));
}
async function createEnrollment(ctx: ReqCtx, deps: Deps): Promise<void> {
  const verr = validate(ctx.body, SCHEMAS.enrollment);
  if (!verr.ok) return validationError(ctx, verr.errors);
  const candidate_id = str(ctx.body, "candidate_id");
  const cohort = str(ctx.body, "cohort");
  if (!candidate_id || !cohort)
    return err(ctx, 400, "invalid_request", "candidate_id and cohort are required");
  if (!boundOk(ctx, candidate_id))
    return err(ctx, 403, "forbidden", "token is bound to a different candidate");
  if (!(await deps.store.candidates.get(candidate_id)))
    return err(ctx, 400, "invalid_request", "unknown candidate_id");
  const statusRaw = str(ctx.body, "status");
  if (statusRaw && !ENROLLMENT_STATUSES.includes(statusRaw as EnrollmentStatus))
    return err(ctx, 400, "invalid_request", "invalid status");
  // Candidate-bound caller: self-service enrollment is allowed, but only
  // into a scheduled/active cohort, only if not already enrolled, and only
  // at a status the candidate has actually earned. A candidate proving
  // they paid the deposit can self-set status=deposit_paid; anything else
  // is registered or rejected.
  const isCandidateCaller = !!ctx.auth?.candidateId;
  const cohortDef = await deps.store.cohorts.getByCode(cohort);
  if (isCandidateCaller) {
    if (!cohortDef) return err(ctx, 404, "not_found", "cohort not found");
    if (cohortDef.status !== "scheduled" && cohortDef.status !== "active")
      return err(ctx, 410, "cohort_closed", "cohort is no longer open");
    const existing = await deps.store.enrollments.byCandidate(candidate_id);
    if (existing.some((e) => e.cohort === cohort && e.status !== "withdrawn"))
      return err(ctx, 409, "already_enrolled", "candidate already enrolled in this cohort");
    if (statusRaw && statusRaw !== "registered" && statusRaw !== "deposit_paid")
      return err(ctx, 403, "forbidden", "candidates can only self-enroll as registered or deposit_paid");
    if (statusRaw === "deposit_paid") {
      const page = await deps.store.payments.list(candidate_id, undefined, 200);
      const paid = page.data.some(
        (p) => p.kind === "commitment_deposit" && p.status === "paid",
      );
      if (!paid)
        return err(ctx, 402, "deposit_required", "deposit must be paid before self-promoting to deposit_paid");
    }
  }
  // If a cohort with this code is defined and capped, enforce its capacity.
  if (cohortDef?.capacity != null) {
    const roster = await deps.store.enrollments.byCohort(cohort);
    if (roster.length >= cohortDef.capacity)
      return err(ctx, 409, "cohort_full", "cohort has reached capacity");
  }
  const e = await deps.store.enrollments.create({
    candidate_id,
    cohort,
    status: statusRaw as EnrollmentStatus | undefined,
  });
  ctx.resourceType = "enrollment";
  ctx.resourceId = e.id;
  send(ctx, 201, e);
}
async function patchEnrollment(ctx: ReqCtx, deps: Deps): Promise<void> {
  const id = ctx.params["id"] ?? "";
  ctx.resourceType = "enrollment";
  ctx.resourceId = id;
  const verr = validate(ctx.body, SCHEMAS.enrollmentStatus);
  if (!verr.ok) return validationError(ctx, verr.errors);
  const statusRaw = str(ctx.body, "status");
  if (!statusRaw || !ENROLLMENT_STATUSES.includes(statusRaw as EnrollmentStatus))
    return err(ctx, 400, "invalid_request", "valid status is required");
  const e = await deps.store.enrollments.setStatus(id, statusRaw as EnrollmentStatus);
  if (!e) return err(ctx, 404, "not_found", "enrollment not found");
  deps.webhooks.emit("enrollment.status_changed", e);
  send(ctx, 200, e);
}

// ── assessment results (append-only) ────────────────────────────────────────
async function listAssessments(ctx: ReqCtx, deps: Deps): Promise<void> {
  const candFilter = ctx.query.get("candidate_id") ?? undefined;
  if (isSessionToken(ctx) && candFilter !== ctx.auth?.candidateId)
    return err(ctx, 403, "forbidden", "session tokens may only read their own candidate");
  if (await underwritingBlocked(ctx, deps))
    return err(ctx, 403, "underwriting_consent_required", "candidate has not consented to underwriting use");
  const { cursor, limit } = pagination(ctx.query);
  send(ctx, 200, await deps.store.assessmentResults.list(candFilter, cursor, limit));
}
async function createAssessment(ctx: ReqCtx, deps: Deps): Promise<void> {
  const verr = validate(ctx.body, SCHEMAS.assessment);
  if (!verr.ok) return validationError(ctx, verr.errors);
  const candidate_id = str(ctx.body, "candidate_id");
  const kind = str(ctx.body, "kind");
  if (!candidate_id || !kind)
    return err(ctx, 400, "invalid_request", "candidate_id and kind are required");
  if (!boundOk(ctx, candidate_id))
    return err(ctx, 403, "forbidden", "token is bound to a different candidate");
  if (!ASSESSMENT_KINDS.includes(kind as AssessmentKind))
    return err(ctx, 400, "invalid_request", "invalid kind");
  const cand = await deps.store.candidates.get(candidate_id);
  if (!cand)
    return err(ctx, 400, "invalid_request", "unknown candidate_id");
  const r = await deps.store.assessmentResults.create({
    candidate_id,
    kind: kind as AssessmentKind,
    readiness: num(ctx.body, "readiness"),
    theta: num(ctx.body, "theta"),
    items_completed: num(ctx.body, "items_completed"),
    by_client_need: obj(ctx.body, "by_client_need") as Record<string, number> | undefined,
    by_cjmm: obj(ctx.body, "by_cjmm") as Record<string, number> | undefined,
    mastery: arr(ctx.body, "mastery") as AssessmentResult["mastery"],
    supersedes: str(ctx.body, "supersedes"),
  });
  ctx.resourceType = "assessment_result";
  ctx.resourceId = r.id;
  deps.webhooks.emit("assessment_result.created", r);
  // Mirror the readiness signal to the Nurse Passport spine (fire-and-forget).
  if (passportEnabled) {
    void emitPassport(
      { email: cand.email, name: cand.full_name, ref: { app: "academy", externalId: candidate_id } },
      "academy.assessment_completed",
      { theta: r.theta, passProbability: r.readiness, readiness: r.readiness, ...(r.mastery ? { mastery: r.mastery } : {}) },
    ).catch(() => undefined);
    // Emit a band-CHANGE signal (onboarding-risk input) only when the band actually moved.
    void (async () => {
      try {
        const results = await allAssessments(deps, candidate_id);
        const progress = await deps.store.progress.listByCandidate(candidate_id);
        const newBand = computeReadiness({ candidateId: candidate_id, results, progress }).band;
        const prior = results.filter((x) => x.id !== r.id);
        const prevBand = prior.length ? computeReadiness({ candidateId: candidate_id, results: prior, progress }).band : undefined;
        if (newBand !== prevBand) {
          await emitPassport(
            { email: cand.email, name: cand.full_name, ref: { app: "academy", externalId: candidate_id } },
            "academy.readiness_band_changed",
            { band: newBand, ...(prevBand ? { prevBand } : {}), ...(typeof r.theta === "number" ? { theta: r.theta } : {}) },
          );
        }
      } catch { /* fire-and-forget enrichment */ }
    })();
  }
  // Closed-loop dispatch: auto-assign targeted remediation for every weak subscale
  // (θ below the passing standard with enough evidence). Idempotent — an open
  // assignment for a subscale is refreshed, not duplicated.
  if (Array.isArray(r.mastery)) {
    for (const m of r.mastery) {
      if (m.items >= REMEDIATION_MIN_ITEMS && m.theta < REMEDIATION_THRESHOLD && (m.dim === "client_need" || m.dim === "cjmm")) {
        await deps.store.remediations.dispatch({ candidate_id, dim: m.dim, key: m.key, theta: m.theta, pass_prob: m.passProb });
      }
    }
  }
  send(ctx, 201, r);
}

// Mastery gate thresholds (kept in sync with src/lib/mastery.ts MASTERY_THRESHOLD;
// the API has no access to the question bank, so it tracks ASSIGNMENTS while the
// frontend builds the actual module via buildRemediation).
const REMEDIATION_THRESHOLD = 0.0;
const REMEDIATION_MIN_ITEMS = 4;

// ── clinical-judgment walkthroughs (content QA + learner fetch) ─────────────
const reviewerOf = (ctx: ReqCtx): string => ctx.auth?.clientId ?? ctx.auth?.candidateId ?? "system";

async function listWalkthroughs(ctx: ReqCtx, deps: Deps): Promise<void> {
  const status = (ctx.query.get("status") ?? "draft") as "draft" | "sme_reviewed" | "approved" | "rejected";
  const limit = Math.max(1, Math.min(500, Number(ctx.query.get("limit") ?? "100")));
  send(ctx, 200, { status, walkthroughs: await deps.store.walkthroughs.listByStatus(status, limit) });
}
async function getWalkthroughAdmin(ctx: ReqCtx, deps: Deps): Promise<void> {
  const w = await deps.store.walkthroughs.get(ctx.params["qid"] ?? "");
  if (!w) return err(ctx, 404, "not_found", "no walkthrough for that question");
  send(ctx, 200, w);
}
async function smeReviewWalkthrough(ctx: ReqCtx, deps: Deps): Promise<void> {
  const w = await deps.store.walkthroughs.setStatus(ctx.params["qid"] ?? "", "sme_reviewed", reviewerOf(ctx), str(ctx.body, "note"));
  if (!w) return err(ctx, 404, "not_found", "no walkthrough for that question");
  send(ctx, 200, w);
}
async function approveWalkthrough(ctx: ReqCtx, deps: Deps): Promise<void> {
  const w = await deps.store.walkthroughs.setStatus(ctx.params["qid"] ?? "", "approved", reviewerOf(ctx), str(ctx.body, "note"));
  if (!w) return err(ctx, 404, "not_found", "no walkthrough for that question");
  send(ctx, 200, w);
}
async function rejectWalkthrough(ctx: ReqCtx, deps: Deps): Promise<void> {
  const w = await deps.store.walkthroughs.setStatus(ctx.params["qid"] ?? "", "rejected", reviewerOf(ctx), str(ctx.body, "note"));
  if (!w) return err(ctx, 404, "not_found", "no walkthrough for that question");
  send(ctx, 200, w);
}
async function patchWalkthrough(ctx: ReqCtx, deps: Deps): Promise<void> {
  const body = (ctx.body ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const k of ["clinical_judgment", "answer_choice_analysis", "teach_back", "what_to_review_next", "standard_rationale"]) {
    if (body[k] !== undefined) patch[k] = body[k];
  }
  const w = await deps.store.walkthroughs.patchBody(ctx.params["qid"] ?? "", patch, reviewerOf(ctx));
  if (!w) return err(ctx, 404, "not_found", "no walkthrough for that question");
  send(ctx, 200, w);
}
/** Learner fetch: returns the APPROVED walkthrough for a question, or 404 (→ plain rationale fallback). */
async function getQuestionWalkthrough(ctx: ReqCtx, deps: Deps): Promise<void> {
  const w = await deps.store.walkthroughs.get(ctx.params["id"] ?? "");
  if (!w || w.status !== "approved") return err(ctx, 404, "not_found", "no approved walkthrough");
  send(ctx, 200, w);
}

// ── per-response capture + item analytics ──────────────────────────────────
async function recordResponse(ctx: ReqCtx, deps: Deps): Promise<void> {
  const candidate_id = ctx.params["id"] ?? "";
  if (!boundOk(ctx, candidate_id)) return err(ctx, 403, "forbidden", "token is bound to a different candidate");
  const body = (ctx.body ?? {}) as Record<string, unknown>;
  const question_id = str(ctx.body, "question_id");
  if (!question_id) return err(ctx, 400, "invalid_request", "question_id is required");
  const r = await deps.store.questionResponses.record({
    candidate_id,
    question_id,
    chosen_option_index: typeof body["chosen_option_index"] === "number" ? (body["chosen_option_index"] as number) : null,
    correct: body["correct"] === true,
    spent_ms: typeof body["spent_ms"] === "number" ? (body["spent_ms"] as number) : null,
    pre_reveal_reasoning: typeof body["pre_reveal_reasoning"] === "string" ? (body["pre_reveal_reasoning"] as string) : null,
    walkthrough_seen: body["walkthrough_seen"] === true,
  });
  send(ctx, 201, r);
}
async function getQuestionAnalytics(ctx: ReqCtx, deps: Deps): Promise<void> {
  send(ctx, 200, await deps.store.questionResponses.analytics(ctx.params["id"] ?? ""));
}

async function listRemediations(ctx: ReqCtx, deps: Deps): Promise<void> {
  const candidate_id = ctx.params["id"] ?? "";
  if (!boundOk(ctx, candidate_id))
    return err(ctx, 403, "forbidden", "token is bound to a different candidate");
  const rows = await deps.store.remediations.listByCandidate(candidate_id);
  send(ctx, 200, { candidate_id, remediations: rows });
}

async function clearRemediation(ctx: ReqCtx, deps: Deps): Promise<void> {
  const candidate_id = ctx.params["id"] ?? "";
  if (!boundOk(ctx, candidate_id))
    return err(ctx, 403, "forbidden", "token is bound to a different candidate");
  const dim = str(ctx.body, "dim");
  const key = str(ctx.body, "key");
  const status = (str(ctx.body, "status") ?? "cleared") as "assigned" | "in_progress" | "cleared";
  if (!dim || !key) return err(ctx, 400, "invalid_request", "dim and key are required");
  const updated = await deps.store.remediations.setStatus(candidate_id, dim, key, status);
  if (!updated) return err(ctx, 404, "not_found", "no such remediation assignment");
  send(ctx, 200, updated);
}
async function getAssessment(ctx: ReqCtx, deps: Deps): Promise<void> {
  const id = ctx.params["id"] ?? "";
  ctx.resourceType = "assessment_result";
  ctx.resourceId = id;
  const r = await deps.store.assessmentResults.get(id);
  if (!r) return err(ctx, 404, "not_found", "assessment result not found");
  if (!boundOk(ctx, r.candidate_id))
    return err(ctx, 403, "forbidden", "token is bound to a different candidate");
  send(ctx, 200, r);
}

// ── payments (tokens only) ──────────────────────────────────────────────────
async function listPayments(ctx: ReqCtx, deps: Deps): Promise<void> {
  const candFilter = ctx.query.get("candidate_id") ?? undefined;
  if (isSessionToken(ctx) && candFilter !== ctx.auth?.candidateId)
    return err(ctx, 403, "forbidden", "session tokens may only read their own candidate");
  if (await underwritingBlocked(ctx, deps))
    return err(ctx, 403, "underwriting_consent_required", "candidate has not consented to underwriting use");
  const { cursor, limit } = pagination(ctx.query);
  send(ctx, 200, await deps.store.payments.list(candFilter, cursor, limit));
}
async function createPayment(ctx: ReqCtx, deps: Deps): Promise<void> {
  const verr = validate(ctx.body, SCHEMAS.payment);
  if (!verr.ok) return validationError(ctx, verr.errors);
  const candidate_id = str(ctx.body, "candidate_id");
  const kind = str(ctx.body, "kind");
  const amount_cents = num(ctx.body, "amount_cents");
  const currency = str(ctx.body, "currency");
  const processor_ref = str(ctx.body, "processor_ref");
  if (!candidate_id || !kind || amount_cents === undefined || !currency || !processor_ref)
    return err(ctx, 400, "invalid_request", "candidate_id, kind, amount_cents, currency, processor_ref are required");
  if (!boundOk(ctx, candidate_id))
    return err(ctx, 403, "forbidden", "token is bound to a different candidate");
  if (!(PAYMENT_KINDS as readonly string[]).includes(kind))
    return err(ctx, 400, "invalid_request", "invalid kind");
  const statusRaw = str(ctx.body, "status");
  if (statusRaw && !PAYMENT_STATUSES.includes(statusRaw as PaymentStatus))
    return err(ctx, 400, "invalid_request", "invalid status");
  const p = await deps.store.payments.create({
    candidate_id,
    kind: kind as (typeof PAYMENT_KINDS)[number],
    amount_cents,
    currency,
    status: statusRaw as PaymentStatus | undefined,
    processor: str(ctx.body, "processor"),
    processor_ref,
  });
  ctx.resourceType = "payment";
  ctx.resourceId = p.id;
  send(ctx, 201, p);
}

// ── deposit checkout (hosted provider; card data never touches us) ──────────
/** Mark a deposit paid: update payment, advance the funnel, emit an event. Idempotent. */
async function markDepositPaid(deps: Deps, paymentId: string, providerRef?: string): Promise<boolean> {
  const p = await deps.store.payments.get(paymentId);
  if (!p) return false;
  if (p.status !== "paid") {
    await deps.store.payments.update(paymentId, {
      status: "paid",
      ...(providerRef && { processor_ref: providerRef }),
    });
    const enrollments = await deps.store.enrollments.byCandidate(p.candidate_id);
    for (const e of enrollments) {
      if (e.status === "registered") await deps.store.enrollments.setStatus(e.id, "deposit_paid");
    }
    deps.webhooks.emit("payment.completed", {
      id: paymentId,
      candidate_id: p.candidate_id,
      amount_cents: p.amount_cents,
      currency: p.currency,
    });
  }
  return true;
}

async function postCheckout(ctx: ReqCtx, deps: Deps): Promise<void> {
  if (!ctx.auth) return err(ctx, 401, "unauthorized", "authentication required");
  const verr = validate(ctx.body, SCHEMAS.checkout);
  if (!verr.ok) return validationError(ctx, verr.errors);
  // A candidate session acts on itself; an M2M caller needs payments:write to
  // start a checkout for someone else.
  const bound = ctx.auth.candidateId;
  const candidate_id = bound ?? str(ctx.body, "candidate_id");
  if (!candidate_id) return err(ctx, 400, "invalid_request", "candidate_id is required");
  if (!bound && !hasScope(ctx.auth, "payments:write"))
    return err(ctx, 403, "forbidden", "starting a checkout for another candidate requires payments:write");
  const cand = await deps.store.candidates.get(candidate_id);
  if (!cand) return err(ctx, 404, "not_found", "candidate not found");
  if (config.requireEmailVerification && !cand.email_verified)
    return err(ctx, 403, "email_not_verified", "please verify your email before reserving a seat");

  const { currency } = config.payments;
  // Tiered deposit: a candidate with any school affiliation pays the preferred
  // access rate ($75). Otherwise the standard $100. Never marketed as a
  // "discount" — it's preferred access for students/alumni of eligible schools.
  const depositAmountCents = await depositAmountForCandidate(deps, candidate_id);
  const payment = await deps.store.payments.create({
    candidate_id,
    kind: "commitment_deposit",
    amount_cents: depositAmountCents,
    currency,
    status: "pending",
    processor: deps.payments.name,
    processor_ref: "pending",
  });

  const successUrl = `${config.publicAppUrl}/#/academy/account?deposit=success`;
  const cancelUrl = `${config.publicAppUrl}/#/academy/account?deposit=cancelled`;
  let checkout;
  try {
    checkout = await deps.payments.createCheckout({
      paymentId: payment.id,
      candidateId: candidate_id,
      amountCents: depositAmountCents,
      currency,
      successUrl,
      cancelUrl,
    });
  } catch {
    await deps.store.payments.update(payment.id, { status: "failed" });
    return err(ctx, 502, "payment_provider_error", "could not start checkout");
  }
  await deps.store.payments.update(payment.id, { processor_ref: checkout.providerRef });
  ctx.resourceType = "payment";
  ctx.resourceId = payment.id;
  send(ctx, 201, {
    payment_id: payment.id,
    checkout_url: checkout.url,
    provider: deps.payments.name,
    amount_cents: depositAmountCents,
    currency,
  });
}

// Stripe webhook (public; verified by signature). On checkout.session.completed
// the deposit is marked paid and the funnel advances.
async function postStripeWebhook(ctx: ReqCtx, deps: Deps): Promise<void> {
  const sig = typeof ctx.headers["stripe-signature"] === "string" ? ctx.headers["stripe-signature"] : undefined;
  const result = deps.payments.verifyWebhook(ctx.rawBody ?? "", sig);
  if (!result) return err(ctx, 400, "invalid_webhook", "signature verification failed or event ignored");
  if (result.paid) await markDepositPaid(deps, result.paymentId, result.providerRef);
  ctx.resourceType = "payment";
  ctx.resourceId = result.paymentId;
  send(ctx, 200, { received: true });
}

// Dev-only: completes a MOCK checkout (no real money). Disabled when a real
// Stripe provider is configured.
async function postMockComplete(ctx: ReqCtx, deps: Deps): Promise<void> {
  if (!deps.payments.isMock) return err(ctx, 404, "not_found", "not available");
  const id = ctx.params["id"] ?? "";
  ctx.resourceType = "payment";
  ctx.resourceId = id;
  if (!(await deps.store.payments.get(id))) return err(ctx, 404, "not_found", "payment not found");
  await markDepositPaid(deps, id, `mock_paid_${id}`);
  send(ctx, 200, { payment_id: id, status: "paid" });
}

// ── production outcomes (append-only conversion telemetry) ──────────────────
async function createOutcome(ctx: ReqCtx, deps: Deps): Promise<void> {
  const verr = validate(ctx.body, SCHEMAS.outcome);
  if (!verr.ok) return validationError(ctx, verr.errors);
  const candidate_id = str(ctx.body, "candidate_id");
  const kind = str(ctx.body, "kind");
  if (!candidate_id || !kind)
    return err(ctx, 400, "invalid_request", "candidate_id and kind are required");
  if (!OUTCOME_KINDS.includes(kind as OutcomeKind))
    return err(ctx, 400, "invalid_request", "invalid kind");
  if (!(await deps.store.candidates.get(candidate_id)))
    return err(ctx, 400, "invalid_request", "unknown candidate_id");
  const o = await deps.store.outcomes.create({
    candidate_id,
    kind: kind as OutcomeKind,
    status: str(ctx.body, "status"),
    amount_cents: num(ctx.body, "amount_cents"),
    detail: obj(ctx.body, "detail"),
    occurred_at: str(ctx.body, "occurred_at"),
  });
  ctx.resourceType = "outcome_event";
  ctx.resourceId = o.id;
  deps.webhooks.emit("outcome.recorded", o);
  send(ctx, 201, o);
}

async function listOutcomes(ctx: ReqCtx, deps: Deps): Promise<void> {
  if (await underwritingBlocked(ctx, deps))
    return err(ctx, 403, "underwriting_consent_required", "candidate has not consented to underwriting use");
  const { cursor, limit } = pagination(ctx.query);
  send(ctx, 200, await deps.store.outcomes.list(ctx.query.get("candidate_id") ?? undefined, cursor, limit));
}

async function getOutcomeFunnel(ctx: ReqCtx, deps: Deps): Promise<void> {
  ctx.resourceType = "outcome_funnel";
  send(ctx, 200, await deps.store.outcomes.funnel());
}

// ── University Affiliate Network ────────────────────────────────────────────
// K-anonymity floor for per-school reports — server-side enforced. Below this,
// the report carries participation counts only (no demographic breakdown).
const K_ANON_FLOOR = 10;
const ELIGIBLE_DEPOSIT_CENTS = 7_500;
const STANDARD_DEPOSIT_CENTS = 10_000;

function publicSchoolView(s: School) {
  // Public listing fields ONLY — no contact data, no internal outreach status,
  // no logo-use flag, no email-domain hints. Slug + name + country + tier + city
  // + programs are enough to power the signup picker.
  return {
    slug: s.slug,
    name: s.name,
    country: s.country,
    tier: s.tier,
    ...(s.city && { city: s.city }),
    ...(s.programs && { programs: s.programs }),
  };
}

async function listSchoolsPublic(ctx: ReqCtx, deps: Deps): Promise<void> {
  // No auth — this is the public eligible-school directory the signup picker reads.
  const all = await deps.store.schools.list();
  const data = all.filter((s) => s.tier !== "eligible" || true).map(publicSchoolView);
  send(ctx, 200, { data });
}

async function createSchool(ctx: ReqCtx, deps: Deps): Promise<void> {
  const verr = validate(ctx.body, SCHEMAS.school);
  if (!verr.ok) return validationError(ctx, verr.errors);
  const slug = (str(ctx.body, "slug") ?? "").toUpperCase();
  const name = str(ctx.body, "name");
  const country = str(ctx.body, "country");
  if (!slug || !name || !country)
    return err(ctx, 400, "invalid_request", "slug, name, country are required");
  if (await deps.store.schools.get(slug))
    return err(ctx, 409, "conflict", "a school with that slug already exists");
  const s = await deps.store.schools.create({
    slug,
    name,
    country,
    city: str(ctx.body, "city"),
    programs: arr<string>(ctx.body, "programs"),
    tier: str(ctx.body, "tier") as SchoolTier | undefined,
    logo_use_granted: bool(ctx.body, "logo_use_granted"),
    email_domains: arr<string>(ctx.body, "email_domains"),
    outreach_status: str(ctx.body, "outreach_status") as OutreachStatus | undefined,
    contact_email: str(ctx.body, "contact_email"),
  });
  ctx.resourceType = "school";
  ctx.resourceId = slug;
  send(ctx, 201, s);
}

async function patchSchool(ctx: ReqCtx, deps: Deps): Promise<void> {
  const slug = (ctx.params["slug"] ?? "").toUpperCase();
  ctx.resourceType = "school";
  ctx.resourceId = slug;
  const verr = validate(ctx.body, SCHEMAS.schoolPatch);
  if (!verr.ok) return validationError(ctx, verr.errors);
  const next = await deps.store.schools.patch(slug, {
    name: str(ctx.body, "name"),
    country: str(ctx.body, "country"),
    city: str(ctx.body, "city"),
    programs: arr<string>(ctx.body, "programs"),
    tier: str(ctx.body, "tier") as SchoolTier | undefined,
    logo_use_granted: bool(ctx.body, "logo_use_granted"),
    email_domains: arr<string>(ctx.body, "email_domains"),
    outreach_status: str(ctx.body, "outreach_status") as OutreachStatus | undefined,
    contact_email: str(ctx.body, "contact_email"),
  });
  if (!next) return err(ctx, 404, "not_found", "school not found");
  send(ctx, 200, next);
}

async function getSchoolAdmin(ctx: ReqCtx, deps: Deps): Promise<void> {
  const slug = (ctx.params["slug"] ?? "").toUpperCase();
  ctx.resourceType = "school";
  ctx.resourceId = slug;
  const s = await deps.store.schools.get(slug);
  if (!s) return err(ctx, 404, "not_found", "school not found");
  send(ctx, 200, s);
}

// Candidate attests they're a student/alumna of a school. Self-attested by default;
// auto-upgrades to email_domain when the candidate's verified email matches.
async function postAffiliation(ctx: ReqCtx, deps: Deps): Promise<void> {
  const id = ctx.params["id"] ?? "";
  ctx.resourceType = "candidate_school_affiliation";
  ctx.resourceId = id;
  if (!boundOk(ctx, id))
    return err(ctx, 403, "forbidden", "token is bound to a different candidate");
  const verr = validate(ctx.body, SCHEMAS.affiliation);
  if (!verr.ok) return validationError(ctx, verr.errors);
  const school_slug = (str(ctx.body, "school_slug") ?? "").toUpperCase();
  const role = str(ctx.body, "role") as AffiliationRole | undefined;
  if (!school_slug || !role) return err(ctx, 400, "invalid_request", "school_slug + role required");
  const cand = await deps.store.candidates.get(id);
  if (!cand) return err(ctx, 404, "not_found", "candidate not found");
  const school = await deps.store.schools.get(school_slug);
  if (!school) return err(ctx, 400, "invalid_request", "unknown school_slug");

  // v1 verification: if the candidate's email is verified AND its domain matches
  // one of the school's email_domains, upgrade automatically.
  let verification: AffiliationVerification = "self_attested";
  if (cand.email_verified && cand.email && (school.email_domains?.length ?? 0) > 0) {
    const dom = cand.email.split("@")[1]?.toLowerCase();
    if (dom && school.email_domains!.some((d) => d.toLowerCase() === dom)) {
      verification = "email_domain";
    }
  }
  const a = await deps.store.affiliations.upsert({
    candidate_id: id, school_slug, role, verification,
  });
  send(ctx, 201, a);
}

async function listMyAffiliations(ctx: ReqCtx, deps: Deps): Promise<void> {
  const id = ctx.params["id"] ?? "";
  ctx.resourceType = "candidate_school_affiliation";
  ctx.resourceId = id;
  if (!boundOk(ctx, id))
    return err(ctx, 403, "forbidden", "token is bound to a different candidate");
  send(ctx, 200, { data: await deps.store.affiliations.listByCandidate(id) });
}

/** Pick the deposit amount for a candidate: $75 if any verified-tier affiliation, else $100. */
async function depositAmountForCandidate(deps: Deps, candidateId: string): Promise<number> {
  const affs = await deps.store.affiliations.listByCandidate(candidateId);
  return affs.length > 0 ? ELIGIBLE_DEPOSIT_CENTS : STANDARD_DEPOSIT_CENTS;
}

// K-anonymized per-school report. ANY caller with schools:read sees it; the K
// floor protects against re-identification of small cohorts.
async function getSchoolReport(ctx: ReqCtx, deps: Deps): Promise<void> {
  const slug = (ctx.params["slug"] ?? "").toUpperCase();
  ctx.resourceType = "school_report";
  ctx.resourceId = slug;
  const school = await deps.store.schools.get(slug);
  if (!school) return err(ctx, 404, "not_found", "school not found");
  const affs = await deps.store.affiliations.listBySchool(slug);
  const candidateIds = [...new Set(affs.map((a) => a.candidate_id))];
  const verified = affs.filter((a) => a.verification !== "self_attested").length;
  const paidDepositCount = (
    await Promise.all(
      candidateIds.map(async (cid) => {
        const pays = await deps.store.payments.list(cid, undefined, 50);
        return pays.data.some((p) => p.kind === "commitment_deposit" && p.status === "paid");
      }),
    )
  ).filter(Boolean).length;

  // BELOW K: counts only.
  if (candidateIds.length < K_ANON_FLOOR) {
    send(ctx, 200, {
      school: publicSchoolView(school),
      k_floor: K_ANON_FLOOR,
      suppressed_for_privacy: true,
      participation: { affiliated: candidateIds.length, verified, paid_deposits: paidDepositCount },
    });
    return;
  }

  // AT OR ABOVE K: gather snapshots and report bands (ranges when 10–24, exact 25+).
  const snapshots = [];
  for (const cid of candidateIds) {
    const results = await allAssessments(deps, cid);
    const progress = await deps.store.progress.listByCandidate(cid);
    snapshots.push(computeReadiness({ candidateId: cid, results, progress }));
  }
  const useRanges = candidateIds.length < 25;
  const bandRaw: Record<string, number> = { none: 0, red: 0, orange: 0, yellow: 0, green: 0 };
  for (const s of snapshots) bandRaw[s.band] += 1;
  const denom = snapshots.length;
  const toPct = (n: number) => {
    if (!useRanges) return Math.round((n / denom) * 1000) / 10;
    const pct = (n / denom) * 100;
    const lo = Math.max(0, Math.floor(pct / 10) * 10);
    return `${lo}–${lo + 20}%`;
  };
  const band_distribution = Object.fromEntries(
    Object.entries(bandRaw).map(([k, v]) => [k, useRanges ? toPct(v) : v]),
  );

  // Top gaps (lowest mean client-need scores).
  const needTotals = new Map<string, { sum: number; n: number }>();
  for (const s of snapshots) {
    if (!s.by_client_need) continue;
    for (const [need, score] of Object.entries(s.by_client_need)) {
      const t = needTotals.get(need) ?? { sum: 0, n: 0 };
      t.sum += score; t.n += 1;
      needTotals.set(need, t);
    }
  }
  const top_gaps = [...needTotals.entries()]
    .map(([client_need, t]) => ({ client_need, mean_score: Math.round((t.sum / t.n) * 1000) / 1000 }))
    .sort((a, b) => a.mean_score - b.mean_score)
    .slice(0, 3);

  send(ctx, 200, {
    school: publicSchoolView(school),
    k_floor: K_ANON_FLOOR,
    suppressed_for_privacy: false,
    ranges_mode: useRanges,
    participation: { affiliated: candidateIds.length, verified, paid_deposits: paidDepositCount },
    band_distribution,
    top_gaps,
  });
}

// Internal ops "Ready for outreach" list — schools with a real conversion signal.
async function listOutreachReady(ctx: ReqCtx, deps: Deps): Promise<void> {
  const all = await deps.store.schools.list();
  const out = [];
  for (const s of all) {
    const affs = await deps.store.affiliations.listBySchool(s.slug);
    if (affs.length < 10) continue;
    const ids = [...new Set(affs.map((a) => a.candidate_id))];
    let paid = 0;
    let avg = null;
    let assessed = 0;
    let sum = 0;
    for (const cid of ids) {
      const pays = await deps.store.payments.list(cid, undefined, 50);
      if (pays.data.some((p) => p.kind === "commitment_deposit" && p.status === "paid")) paid++;
      const results = await allAssessments(deps, cid);
      const progress = await deps.store.progress.listByCandidate(cid);
      const snap = computeReadiness({ candidateId: cid, results, progress });
      if (snap.readiness != null) {
        assessed++; sum += snap.readiness;
      }
    }
    if (assessed > 0) avg = sum / assessed;
    if (paid >= 3 && (avg ?? 0) >= 0.65) {
      out.push({
        slug: s.slug, name: s.name, country: s.country, tier: s.tier,
        outreach_status: s.outreach_status, affiliated: ids.length,
        paid_deposits: paid, avg_readiness: avg != null ? Math.round(avg * 1000) / 1000 : null,
      });
    }
  }
  send(ctx, 200, { data: out });
}

// ── attendance (Live cohort / Live Lab — append-only) ──────────────────────
async function createAttendance(ctx: ReqCtx, deps: Deps): Promise<void> {
  const verr = validate(ctx.body, SCHEMAS.attendance);
  if (!verr.ok) return validationError(ctx, verr.errors);
  const candidate_id = str(ctx.body, "candidate_id");
  const session_date = str(ctx.body, "session_date");
  const statusRaw = str(ctx.body, "status");
  if (!candidate_id || !session_date || !statusRaw)
    return err(ctx, 400, "invalid_request", "candidate_id, session_date, status required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(session_date))
    return err(ctx, 400, "invalid_request", "session_date must be YYYY-MM-DD");
  if (!(await deps.store.candidates.get(candidate_id)))
    return err(ctx, 400, "invalid_request", "unknown candidate_id");
  const a = await deps.store.attendance.create({
    candidate_id,
    session_date,
    status: statusRaw as "present" | "absent" | "late",
    cohort: str(ctx.body, "cohort"),
    location: str(ctx.body, "location"),
  });
  ctx.resourceType = "attendance_record";
  ctx.resourceId = a.id;
  send(ctx, 201, a);
}

async function listAttendance(ctx: ReqCtx, deps: Deps): Promise<void> {
  const { cursor, limit } = pagination(ctx.query);
  send(ctx, 200, await deps.store.attendance.list(ctx.query.get("candidate_id") ?? undefined, cursor, limit));
}

async function getAttendanceRollup(ctx: ReqCtx, deps: Deps): Promise<void> {
  ctx.resourceType = "attendance_rollup";
  send(ctx, 200, await deps.store.attendance.rollup());
}

// ── partner surfaces (employer + university — education readiness only) ──────
/** A readiness snapshot for every candidate (used by the partner projections). */
async function allCandidateSnapshots(
  deps: Deps,
): Promise<{ candidate: Candidate; snapshot: ReadinessSnapshot }[]> {
  const out: { candidate: Candidate; snapshot: ReadinessSnapshot }[] = [];
  let cursor: string | undefined;
  do {
    const page = await deps.store.candidates.list(cursor, 200);
    for (const candidate of page.data) {
      const results = await allAssessments(deps, candidate.id);
      const progress = await deps.store.progress.listByCandidate(candidate.id);
      out.push({ candidate, snapshot: computeReadiness({ candidateId: candidate.id, results, progress }) });
    }
    cursor = page.next_cursor ?? undefined;
  } while (cursor);
  return out;
}

// ── cohort pass-rate data asset (Initiative 8) ──────────────────────────────
async function allCohortData(deps: Deps): Promise<{
  candidates: { id: string; country?: string }[];
  outcomes: { candidate_id: string; kind: string; status?: string; occurred_at: string }[];
  assessments: { candidate_id: string; readiness?: number; created_at: string }[];
}> {
  const candidates: { id: string; country?: string }[] = [];
  const outcomes: { candidate_id: string; kind: string; status?: string; occurred_at: string }[] = [];
  const assessments: { candidate_id: string; readiness?: number; created_at: string }[] = [];
  let cursor: string | undefined;
  do {
    const page = await deps.store.candidates.list(cursor, 200);
    for (const c of page.data) candidates.push({ id: c.id, ...(c.country ? { country: c.country } : {}) });
    cursor = page.next_cursor ?? undefined;
  } while (cursor);
  cursor = undefined;
  do {
    const page = await deps.store.outcomes.list(undefined, cursor, 200);
    for (const o of page.data) outcomes.push({ candidate_id: o.candidate_id, kind: o.kind, ...(o.status ? { status: o.status } : {}), occurred_at: o.occurred_at });
    cursor = page.next_cursor ?? undefined;
  } while (cursor);
  cursor = undefined;
  do {
    const page = await deps.store.assessmentResults.list(undefined, cursor, 200);
    for (const a of page.data) assessments.push({ candidate_id: a.candidate_id, ...(a.readiness != null ? { readiness: a.readiness } : {}), created_at: a.created_at });
    cursor = page.next_cursor ?? undefined;
  } while (cursor);
  return { candidates, outcomes, assessments };
}

async function getCohortPassRates(ctx: ReqCtx, deps: Deps): Promise<void> {
  const data = await allCohortData(deps);
  const minCell = Math.max(1, Number(ctx.query.get("minCell") ?? 5));
  ctx.resourceType = "cohort_pass_rates";
  send(ctx, 200, { corridors: cohortPassRates({ ...data, minCell }) });
}

async function publishCohortReport(ctx: ReqCtx, deps: Deps): Promise<void> {
  const data = await allCohortData(deps);
  const stats = cohortPassRates({ ...data, minCell: Math.max(1, Number(str(ctx.body, "minCell") ?? "5")) });
  const report = publishedReport(stats, { stampIso: new Date().toISOString() });
  ctx.resourceType = "cohort_report_published"; // audited by the request middleware
  send(ctx, 200, report);
}

async function getEmployerCandidates(ctx: ReqCtx, deps: Deps): Promise<void> {
  const all = await allCandidateSnapshots(deps);
  // Only readiness-cleared candidates who have ALSO consented to employer sharing
  // appear in the partner-facing packet list. Consent revocation removes them.
  const data = all
    .filter((x) => isReadinessCleared(x.snapshot) && x.candidate.consent.employer_sharing === true)
    .map((x) => buildInterviewPacket(x.candidate, x.snapshot));
  ctx.resourceType = "employer_candidates";
  send(ctx, 200, { data });
}

async function postEmployerOffer(ctx: ReqCtx, deps: Deps): Promise<void> {
  const verr = validate(ctx.body, SCHEMAS.employerOffer);
  if (!verr.ok) return validationError(ctx, verr.errors);
  const candidate_id = str(ctx.body, "candidate_id");
  if (!candidate_id) return err(ctx, 400, "invalid_request", "candidate_id is required");
  const cand = await deps.store.candidates.get(candidate_id);
  if (!cand) return err(ctx, 404, "not_found", "candidate not found");
  if (cand.consent.employer_sharing !== true)
    return err(ctx, 403, "employer_consent_required", "candidate has not consented to employer sharing");
  const status = str(ctx.body, "status") ?? "offered";
  const o = await deps.store.outcomes.create({ candidate_id, kind: "employer_offer", status });
  ctx.resourceType = "employer_offer";
  ctx.resourceId = o.id;
  deps.webhooks.emit("employer.offer", { id: o.id, candidate_id, status });
  send(ctx, 201, o);
}

async function getUniversityOverview(ctx: ReqCtx, deps: Deps): Promise<void> {
  const all = await allCandidateSnapshots(deps);
  ctx.resourceType = "university_overview";
  send(ctx, 200, computeUniversityOverview(all.map((x) => x.snapshot)));
}

// ── cohorts (scheduling + rostering) ────────────────────────────────────────
async function listCohorts(ctx: ReqCtx, deps: Deps): Promise<void> {
  const { cursor, limit } = pagination(ctx.query);
  send(ctx, 200, await deps.store.cohorts.list(cursor, limit));
}

/**
 * Public cohorts list — narrow projection for the marketing site.
 *
 * Returns ONLY:
 *   - code, name, starts_at, capacity, seats_remaining, status
 * NEVER returns: instructor_ref, roster, dollars, internal IDs, audit hashes.
 *
 * Filters to status ∈ {scheduled, active} so completed/cancelled cohorts
 * don't show on the public site. seats_remaining = max(0, capacity - enrolled).
 * If capacity is unset, seats_remaining is null and the UI says "open seats".
 */
async function listCohortsPublic(ctx: ReqCtx, deps: Deps): Promise<void> {
  // Pull a generous slice — operators won't realistically schedule >100 at once.
  const page = await deps.store.cohorts.list(undefined, 100);
  const visible = page.data.filter(
    (c) => c.status === "scheduled" || c.status === "active",
  );
  const projected = await Promise.all(
    visible.map(async (c) => {
      const enrollments = await deps.store.enrollments.byCohort(c.code);
      // Don't count withdrawn against capacity — they vacated the seat.
      const filled = enrollments.filter((e) => e.status !== "withdrawn").length;
      const seats_remaining =
        typeof c.capacity === "number" ? Math.max(0, c.capacity - filled) : null;
      return {
        code: c.code,
        name: c.name,
        status: c.status,
        ...(c.starts_at && { starts_at: c.starts_at }),
        ...(typeof c.capacity === "number" && { capacity: c.capacity }),
        ...(typeof c.covered_through_section === "number" && {
          covered_through_section: c.covered_through_section,
        }),
        seats_remaining,
      };
    }),
  );
  // Sort by starts_at ascending (undated cohorts last, in original order).
  projected.sort((a, b) => {
    if (a.starts_at && b.starts_at) return a.starts_at < b.starts_at ? -1 : 1;
    if (a.starts_at) return -1;
    if (b.starts_at) return 1;
    return 0;
  });
  send(ctx, 200, { data: projected });
}
async function createCohort(ctx: ReqCtx, deps: Deps): Promise<void> {
  const verr = validate(ctx.body, SCHEMAS.cohort);
  if (!verr.ok) return validationError(ctx, verr.errors);
  const code = str(ctx.body, "code") ?? "";
  if (await deps.store.cohorts.getByCode(code))
    return err(ctx, 409, "conflict", "a cohort with that code already exists");
  const c = await deps.store.cohorts.create({
    code,
    name: str(ctx.body, "name") ?? "",
    starts_at: str(ctx.body, "starts_at"),
    capacity: num(ctx.body, "capacity"),
    instructor_ref: str(ctx.body, "instructor_ref"),
    status: str(ctx.body, "status") as CohortStatus | undefined,
    covered_through_section: num(ctx.body, "covered_through_section"),
  });
  ctx.resourceType = "cohort";
  ctx.resourceId = c.id;
  send(ctx, 201, c);
}
async function getCohort(ctx: ReqCtx, deps: Deps): Promise<void> {
  const id = ctx.params["id"] ?? "";
  ctx.resourceType = "cohort";
  ctx.resourceId = id;
  const c = await deps.store.cohorts.get(id);
  if (!c) return err(ctx, 404, "not_found", "cohort not found");
  send(ctx, 200, c);
}
async function patchCohort(ctx: ReqCtx, deps: Deps): Promise<void> {
  const id = ctx.params["id"] ?? "";
  ctx.resourceType = "cohort";
  ctx.resourceId = id;
  const verr = validate(ctx.body, SCHEMAS.cohortPatch);
  if (!verr.ok) return validationError(ctx, verr.errors);
  const c = await deps.store.cohorts.patch(id, {
    name: str(ctx.body, "name"),
    starts_at: str(ctx.body, "starts_at"),
    capacity: num(ctx.body, "capacity"),
    instructor_ref: str(ctx.body, "instructor_ref"),
    status: str(ctx.body, "status") as CohortStatus | undefined,
    covered_through_section: num(ctx.body, "covered_through_section"),
  });
  if (!c) return err(ctx, 404, "not_found", "cohort not found");
  send(ctx, 200, c);
}

/**
 * Bump (or reset, with override) the cohort's coverage watermark.
 *
 * The instructor calls this from /instructor after each live class. Normal
 * bumps must go forward only — that's the whole point of the watermark — so
 * we 409 on attempts to lower without `override: true`. The override path
 * exists for honest mistakes (instructor said "covered 7" but actually got
 * through 6); we audit-log both.
 *
 * Either lookup the cohort by code (preferred for instructor UX) or by id.
 */
async function patchCohortCoverage(ctx: ReqCtx, deps: Deps): Promise<void> {
  const key = ctx.params["id"] ?? "";
  ctx.resourceType = "cohort";
  const cohort =
    (await deps.store.cohorts.getByCode(key)) ?? (await deps.store.cohorts.get(key));
  if (!cohort) return err(ctx, 404, "not_found", "cohort not found");
  ctx.resourceId = cohort.id;
  const verr = validate(ctx.body, SCHEMAS.cohortCoverage);
  if (!verr.ok) return validationError(ctx, verr.errors);
  const next = num(ctx.body, "covered_through_section") ?? 0;
  const override = bool(ctx.body, "override") === true;
  const current = cohort.covered_through_section ?? 0;
  if (next < current && !override) {
    return err(
      ctx,
      409,
      "coverage_regression",
      `coverage cannot move from ${current} to ${next} without override:true`,
    );
  }
  const updated = await deps.store.cohorts.patch(cohort.id, {
    covered_through_section: next,
  });
  if (!updated) return err(ctx, 404, "not_found", "cohort not found");
  send(ctx, 200, updated);
}
// Instructor Copilot — deterministic cohort analysis for faculty (read-only).
async function getCohortCopilot(ctx: ReqCtx, deps: Deps): Promise<void> {
  const code = ctx.params["code"] ?? "";
  ctx.resourceType = "cohort_copilot";
  ctx.resourceId = code;
  const enrollments = await deps.store.enrollments.byCohort(code);
  const members = [];
  for (const e of enrollments) {
    const cand = await deps.store.candidates.get(e.candidate_id);
    if (!cand) continue;
    const results = await allAssessments(deps, e.candidate_id);
    const progress = await deps.store.progress.listByCandidate(e.candidate_id);
    const snapshot = computeReadiness({ candidateId: e.candidate_id, results, progress });
    members.push({ candidate_id: e.candidate_id, full_name: cand.full_name, snapshot });
  }
  send(ctx, 200, computeCohortCopilot(code, members));
}

async function getCohortRoster(ctx: ReqCtx, deps: Deps): Promise<void> {
  const key = ctx.params["id"] ?? "";
  ctx.resourceType = "cohort";
  // Accept either cohort id (cohort_…) or cohort code (MNL-2026-07). Instructors
  // think in codes; ops scripts pass ids.
  const cohort =
    (await deps.store.cohorts.get(key)) ?? (await deps.store.cohorts.getByCode(key));
  if (!cohort) return err(ctx, 404, "not_found", "cohort not found");
  ctx.resourceId = cohort.id;
  const enrollments = await deps.store.enrollments.byCohort(cohort.code);
  // Inline candidate name + readiness band so the instructor dashboard can
  // render a useful roster in one round-trip. Names are read-scope already.
  const rows = await Promise.all(
    enrollments.map(async (e) => {
      const cand = await deps.store.candidates.get(e.candidate_id);
      const results = await allAssessments(deps, e.candidate_id);
      const progress = await deps.store.progress.listByCandidate(e.candidate_id);
      const snap = computeReadiness({ candidateId: e.candidate_id, results, progress });
      return {
        enrollment_id: e.id,
        candidate_id: e.candidate_id,
        full_name: cand?.full_name ?? "Unknown",
        ...(cand?.email && { email: cand.email }),
        enrollment_status: e.status,
        readiness_band: snap.band,
        ...(snap.readiness != null && { readiness: snap.readiness }),
        created_at: e.created_at,
      };
    }),
  );
  send(ctx, 200, {
    cohort_id: cohort.id,
    code: cohort.code,
    capacity: cohort.capacity ?? null,
    count: enrollments.length,
    enrollments, // kept for back-compat with the smoke test
    members: rows,
  });
}

// Constant-time login: when an email isn't found we still run one scrypt verify
// against this fixed hash, so response time can't reveal whether an email exists.
const DUMMY_PW_HASH = hashSecret("florence-constant-time-dummy-secret");

const COMMON_PASSWORDS = new Set([
  "password", "password1", "12345678", "123456789", "qwertyui", "qwerty123",
  "11111111", "iloveyou", "abcdefgh", "baseball", "football", "welcome1",
  "letmein1", "admin123", "sunshine",
]);

/** Reject trivially weak passwords (beyond the schema's length check). */
function weakPassword(pw: string): boolean {
  if (pw.length < 8) return true;
  if (/^\d+$/.test(pw)) return true; // all digits
  if (/^(.)\1+$/.test(pw)) return true; // one repeated character
  return COMMON_PASSWORDS.has(pw.toLowerCase());
}

// ── candidate end-user auth (public signup/login → candidate-bound session) ──
async function postSignup(ctx: ReqCtx, deps: Deps): Promise<void> {
  if (!authRateLimitOk(`auth:${ctx.ip}`))
    return err(ctx, 429, "rate_limited", "too many attempts — please wait a moment");
  const verr = validate(ctx.body, SCHEMAS.signup);
  if (!verr.ok) return validationError(ctx, verr.errors);
  const full_name = str(ctx.body, "full_name");
  const emailRaw = str(ctx.body, "email");
  const password = str(ctx.body, "password");
  if (!full_name || !emailRaw || !password)
    return err(ctx, 400, "invalid_request", "full_name, email, password are required");
  if (weakPassword(password))
    return err(ctx, 400, "weak_password", "choose a stronger password (8+ characters, not a common password)");
  const email = emailRaw.trim().toLowerCase();
  if (await deps.store.credentials.getByEmail(email))
    return err(ctx, 409, "email_in_use", "an account with that email already exists");
  // Signing up IS service consent; everything else stays opt-in (false).
  const consent = { service: true, ...(toConsent(obj(ctx.body, "consent")) ?? {}) };
  const cand = await deps.store.candidates.create({
    full_name,
    email,
    country: str(ctx.body, "country"),
    consent,
  });
  await deps.store.credentials.create({
    candidate_id: cand.id,
    email,
    password_hash: hashSecret(password),
  });
  const token = issueCandidateSession(cand.id);
  const email_verification = await sendVerificationEmail(deps, cand);
  ctx.resourceType = "candidate";
  ctx.resourceId = cand.id;
  deps.webhooks.emit("candidate.created", cand);
  send(ctx, 201, { candidate: cand, token, email_verification });
}

// Create a verification token + deliver the link. Returns the dev link only when
// the mock email provider is active (so the local flow can complete with no inbox).
async function sendVerificationEmail(
  deps: Deps,
  candidate: Candidate,
): Promise<{ sent: boolean; dev_url?: string }> {
  if (!candidate.email) return { sent: false };
  const { token } = await deps.store.verifications.create(candidate.id);
  const url = `${config.publicAppUrl}/#/academy/verify?token=${encodeURIComponent(token)}`;
  try {
    await deps.email.send({
      to: candidate.email,
      subject: "Verify your email — Florence Academy",
      text: `Welcome to Florence Academy! Confirm your email address: ${url}`,
      html: `<p>Welcome to Florence Academy!</p><p><a href="${url}">Confirm your email address</a></p>`,
    });
  } catch {
    /* delivery failures must not break signup; the learner can resend */
  }
  return deps.email.isMock ? { sent: true, dev_url: url } : { sent: true };
}

async function postVerifyEmail(ctx: ReqCtx, deps: Deps): Promise<void> {
  const verr = validate(ctx.body, SCHEMAS.verifyEmail);
  if (!verr.ok) return validationError(ctx, verr.errors);
  const token = str(ctx.body, "token");
  if (!token) return err(ctx, 400, "invalid_request", "token is required");
  const candidateId = await deps.store.verifications.consume(token);
  if (!candidateId)
    return err(ctx, 400, "invalid_token", "this verification link is invalid or has expired");
  const c = await deps.store.candidates.markEmailVerified(candidateId);
  if (!c) return err(ctx, 404, "not_found", "candidate not found");
  ctx.resourceType = "candidate";
  ctx.resourceId = candidateId;
  deps.webhooks.emit("candidate.email_verified", { id: candidateId });
  send(ctx, 200, { verified: true, candidate_id: candidateId });
}

async function postResendVerification(ctx: ReqCtx, deps: Deps): Promise<void> {
  const bound = ctx.auth?.candidateId;
  if (!bound) return err(ctx, 400, "invalid_request", "a candidate session is required");
  const cand = await deps.store.candidates.get(bound);
  if (!cand) return err(ctx, 404, "not_found", "candidate not found");
  ctx.resourceType = "candidate";
  ctx.resourceId = bound;
  if (cand.email_verified) return send(ctx, 200, { sent: false, already_verified: true });
  send(ctx, 200, await sendVerificationEmail(deps, cand));
}

async function postLogin(ctx: ReqCtx, deps: Deps): Promise<void> {
  if (!authRateLimitOk(`auth:${ctx.ip}`))
    return err(ctx, 429, "rate_limited", "too many attempts — please wait a moment");
  const verr = validate(ctx.body, SCHEMAS.login);
  if (!verr.ok) return validationError(ctx, verr.errors);
  const emailRaw = str(ctx.body, "email");
  const password = str(ctx.body, "password");
  if (!emailRaw || !password)
    return err(ctx, 401, "invalid_credentials", "email or password is incorrect");
  const email = emailRaw.trim().toLowerCase();

  const locked = loginLockRemaining(email);
  if (locked > 0)
    return err(ctx, 429, "account_locked", `too many failed attempts — try again in ${Math.ceil(locked / 60)} min`);

  const cred = await deps.store.credentials.getByEmail(email);
  // Always run exactly one scrypt verify (real hash or a fixed dummy) so response
  // time can't reveal whether the email exists.
  const ok = verifySecret(password, cred ? cred.password_hash : DUMMY_PW_HASH);
  const cand = cred && ok ? await deps.store.candidates.get(cred.candidate_id) : undefined;
  if (!cred || !ok || !cand) {
    recordLoginFailure(email);
    return err(ctx, 401, "invalid_credentials", "email or password is incorrect");
  }
  clearLoginFailures(email);
  const token = issueCandidateSession(cand.id);
  ctx.resourceType = "candidate";
  ctx.resourceId = cand.id;
  send(ctx, 200, { candidate: cand, token });
}

// Own profile, resolved from the session token's candidate binding.
async function getMe(ctx: ReqCtx, deps: Deps): Promise<void> {
  const bound = ctx.auth?.candidateId;
  if (!bound)
    return err(ctx, 400, "invalid_request", "this endpoint requires a candidate session token");
  const c = await deps.store.candidates.get(bound);
  if (!c) return err(ctx, 404, "not_found", "candidate not found");
  ctx.resourceType = "candidate";
  ctx.resourceId = bound;
  send(ctx, 200, c);
}

/**
 * The candidate's currently-active cohort, with the coverage watermark the
 * Curriculum Navigator gates on. Pick the most-active enrollment:
 *   1. enrollment.status === "attending" wins (in-class right now)
 *   2. else "deposit_paid" (paid + waiting for cohort start)
 *   3. else "registered"
 * Withdrawn/completed enrollments are ignored so a finished candidate doesn't
 * pop back into a closed cohort's view.
 *
 * Returns 204 if no eligible enrollment exists (the SPA falls back to the env
 * watermark for the public/unenrolled browse case).
 */
async function getMyCohort(ctx: ReqCtx, deps: Deps): Promise<void> {
  const bound = ctx.auth?.candidateId;
  if (!bound) return err(ctx, 400, "invalid_request", "candidate session required");
  ctx.resourceType = "candidate";
  ctx.resourceId = bound;
  const enrollments = await deps.store.enrollments.byCandidate(bound);
  const priority: Record<string, number> = {
    attending: 3,
    deposit_paid: 2,
    registered: 1,
  };
  const active = enrollments
    .filter((e) => priority[e.status] !== undefined)
    .sort((a, b) => (priority[b.status] ?? 0) - (priority[a.status] ?? 0))[0];
  if (!active) return send(ctx, 204, null);
  const cohort = await deps.store.cohorts.getByCode(active.cohort);
  if (!cohort) return send(ctx, 204, null);
  // Narrow projection — never leak instructor_ref / internal id to the candidate.
  send(ctx, 200, {
    code: cohort.code,
    name: cohort.name,
    status: cohort.status,
    enrollment_status: active.status,
    ...(cohort.starts_at && { starts_at: cohort.starts_at }),
    covered_through_section: cohort.covered_through_section ?? 0,
  });
}

/** Classify the actor on an audit entry for the candidate-facing display.
 *  Never echoes raw client_ids; buckets to "you", "agent", or "ops" so the
 *  candidate sees plain English on the transparency page. */
function classifyActor(actor: string | undefined): string {
  if (!actor) return "system";
  if (actor === "academy_session") return "you";
  // Known agents go here as we wire them. Everything else with a verified
  // M2M client id is an ops/partner action — bucket as "ops".
  if (/pathway[-_]?agent/i.test(actor)) return "agent";
  return "ops";
}

// "Who has accessed my data?" — FERPA/GDPR-style transparency for the candidate.
async function getMyAudit(ctx: ReqCtx, deps: Deps): Promise<void> {
  const bound = ctx.auth?.candidateId;
  if (!bound) return err(ctx, 400, "invalid_request", "candidate session required");
  const limit = Math.max(1, Math.min(200, Number(ctx.query.get("limit") ?? 100)));
  if (!deps.audit.byResource)
    return send(ctx, 200, { data: [] });
  const data = deps.audit
    .byResource(bound, limit)
    .map((e) => ({
      ts: e.ts,
      actor: classifyActor(e.actor),
      action: e.action,
      outcome: e.outcome,
    }));
  ctx.resourceType = "audit_self";
  ctx.resourceId = bound;
  send(ctx, 200, { data });
}

// ── learner progress + readiness ─────────────────────────────────────────────
async function postProgress(ctx: ReqCtx, deps: Deps): Promise<void> {
  const id = ctx.params["id"] ?? "";
  ctx.resourceType = "candidate_progress";
  ctx.resourceId = id;
  if (!boundOk(ctx, id))
    return err(ctx, 403, "forbidden", "token is bound to a different candidate");
  const verr = validate(ctx.body, SCHEMAS.progress);
  if (!verr.ok) return validationError(ctx, verr.errors);
  const section_slug = str(ctx.body, "section_slug");
  if (!section_slug) return err(ctx, 400, "invalid_request", "section_slug is required");
  if (!(await deps.store.candidates.get(id)))
    return err(ctx, 404, "not_found", "candidate not found");
  const statusRaw = str(ctx.body, "status");
  if (statusRaw && !PROGRESS_STATUSES.includes(statusRaw as ProgressStatus))
    return err(ctx, 400, "invalid_request", "invalid status");
  const rec = await deps.store.progress.upsert({
    candidate_id: id,
    section_slug,
    status: statusRaw as ProgressStatus | undefined,
    percent: num(ctx.body, "percent"),
    last_segment: str(ctx.body, "last_segment"),
  });
  send(ctx, 200, rec);
}

async function getProgress(ctx: ReqCtx, deps: Deps): Promise<void> {
  const id = ctx.params["id"] ?? "";
  ctx.resourceType = "candidate_progress";
  ctx.resourceId = id;
  if (!boundOk(ctx, id))
    return err(ctx, 403, "forbidden", "token is bound to a different candidate");
  send(ctx, 200, {
    candidate_id: id,
    progress: await deps.store.progress.listByCandidate(id),
  });
}

/** Page through every assessment result for one candidate (readiness needs all). */
async function allAssessments(deps: Deps, candidateId: string): Promise<AssessmentResult[]> {
  const out: AssessmentResult[] = [];
  let cursor: string | undefined;
  do {
    const page = await deps.store.assessmentResults.list(candidateId, cursor, 200);
    out.push(...page.data);
    cursor = page.next_cursor ?? undefined;
  } while (cursor);
  return out;
}

async function getReadiness(ctx: ReqCtx, deps: Deps): Promise<void> {
  const id = ctx.params["id"] ?? "";
  ctx.resourceType = "readiness";
  ctx.resourceId = id;
  if (!boundOk(ctx, id))
    return err(ctx, 403, "forbidden", "token is bound to a different candidate");
  const cand = await deps.store.candidates.get(id);
  if (!cand) return err(ctx, 404, "not_found", "candidate not found");
  // Readiness is the learner-facing projection; an underwriting-purposed read of
  // it still requires the candidate's explicit underwriting consent.
  if (ctx.headers["x-purpose"] === "underwriting" && cand.consent.underwriting !== true)
    return err(ctx, 403, "underwriting_consent_required", "candidate has not consented to underwriting use");
  const results = await allAssessments(deps, id);
  const progress = await deps.store.progress.listByCandidate(id);
  send(ctx, 200, computeReadiness({ candidateId: id, results, progress }));
}

// ── Pathway-task projection (Florence Pathway Agent writes; Passport reads) ──
async function postPathwayTask(ctx: ReqCtx, deps: Deps): Promise<void> {
  const id = ctx.params["id"] ?? "";
  ctx.resourceType = "pathway_task";
  ctx.resourceId = id;
  // Session tokens (candidates) can never POST — only the Pathway Agent (M2M with
  // pathway:write scope, enforced by the route table below).
  if (isSessionToken(ctx))
    return err(ctx, 403, "forbidden", "pathway-task writes are operator/agent actions");
  const verr = validate(ctx.body, SCHEMAS.pathwayTask);
  if (!verr.ok) return validationError(ctx, verr.errors);
  const cand = await deps.store.candidates.get(id);
  if (!cand) return err(ctx, 404, "not_found", "candidate not found");
  if (cand.consent.pathway !== true)
    return err(ctx, 403, "pathway_consent_required", "candidate has not consented to pathway processing");
  const kind = str(ctx.body, "kind") as PathwayTaskKind;
  const status = str(ctx.body, "status") as PathwayTaskStatus;
  const e = await deps.store.pathwayTasks.create({
    candidate_id: id, kind, status, note: str(ctx.body, "note"),
  });
  deps.webhooks.emit("pathway_task.recorded", e);
  send(ctx, 201, e);
}

/** Latest-per-kind projection. Input MUST be oldest-first (the store contract). */
function projectLatest(events: { kind: PathwayTaskKind; status: PathwayTaskStatus; note?: string; created_at: string }[]) {
  const latest = new Map<string, typeof events[number]>();
  // Same-millisecond writes tie on created_at; iterating oldest-first and always
  // overwriting means the LAST-written event of a kind wins, which is correct.
  for (const e of events) latest.set(e.kind, e);
  return [...latest.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

async function listPathwayTasks(ctx: ReqCtx, deps: Deps): Promise<void> {
  const id = ctx.params["id"] ?? "";
  ctx.resourceType = "pathway_task";
  ctx.resourceId = id;
  if (!boundOk(ctx, id))
    return err(ctx, 403, "forbidden", "token is bound to a different candidate");
  const cand = await deps.store.candidates.get(id);
  if (!cand) return err(ctx, 404, "not_found", "candidate not found");
  const all = await deps.store.pathwayTasks.listByCandidate(id);
  send(ctx, 200, { latest: projectLatest(all), history: all });
}

// Hand a pathway-ready candidate off to the Florence Pathway Agent (operator
// action — not candidate-triggered). The Academy stops at readiness; the Pathway
// Agent owns university/visa/financing/licensure under AI-drafts → human-QA →
// candidate-attests. Dormant (dry-run) until PATHWAY_AGENT_URL is set.
async function postPathwayHandoff(ctx: ReqCtx, deps: Deps): Promise<void> {
  const id = ctx.params["id"] ?? "";
  ctx.resourceType = "pathway_handoff";
  ctx.resourceId = id;
  if (isSessionToken(ctx))
    return err(ctx, 403, "forbidden", "pathway handoff is an operator action");
  const cand = await deps.store.candidates.get(id);
  if (!cand) return err(ctx, 404, "not_found", "candidate not found");
  if (cand.consent.pathway !== true)
    return err(ctx, 403, "pathway_consent_required", "candidate has not consented to Pathway Agent processing");
  const results = await allAssessments(deps, id);
  const progress = await deps.store.progress.listByCandidate(id);
  const snapshot = computeReadiness({ candidateId: id, results, progress });
  const intake = buildPathwayIntake(cand, snapshot);
  const res = await deps.pathway.sendIntake(intake);
  deps.webhooks.emit("candidate.pathway_handoff", { id, route: snapshot.route });
  send(ctx, res.ok ? 200 : 502, {
    handed_off: res.ok,
    dry_run: res.dryRun,
    route: snapshot.route,
    ...(res.dryRun && { intake }),
  });
}

// ── Leads (Florence core nurse pipeline mirror) ───────────────────────────
/**
 * Batch upsert leads from the operator's pipeline.
 *
 * Body: { source: "csv:2026-06-06", leads: [{ email, ...}] }
 *
 * Idempotent on rerun: each lead is upserted by lower(email). Returns counts
 * (created / updated / unchanged) so the CSV importer can show a real diff.
 * Per-row errors are collected, not fatal — bad rows don't sink the batch.
 *
 * Scope: leads:write (operator-only). The endpoint is INTERNAL and never
 * returned in any public response.
 */
async function postLeadsImport(ctx: ReqCtx, deps: Deps): Promise<void> {
  const verr = validate(ctx.body, SCHEMAS.leadImport);
  if (!verr.ok) return validationError(ctx, verr.errors);
  const source = str(ctx.body, "source") ?? "manual";
  const leads = arr<Record<string, unknown>>(ctx.body, "leads") ?? [];
  const actor = ctx.auth?.clientId ?? "ops";
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  const errors: { index: number; email?: string; message: string }[] = [];
  for (let i = 0; i < leads.length; i++) {
    const row = leads[i];
    try {
      const rowVerr = validate(row, SCHEMAS.lead);
      if (!rowVerr.ok) {
        errors.push({
          index: i,
          email: typeof row?.email === "string" ? row.email : undefined,
          message: rowVerr.errors.map((e) => `${e.field}: ${e.message}`).join("; "),
        });
        continue;
      }
      const res = await deps.store.leads.upsert(
        {
          email: String(row.email),
          external_id: str(row, "external_id"),
          firstname: str(row, "firstname"),
          lastname: str(row, "lastname"),
          fullname: str(row, "fullname"),
          country: str(row, "country"),
          phone: str(row, "phone"),
          job_unit: str(row, "job_unit"),
          type: str(row, "type") as Lead["type"] | undefined,
          nclex_status: str(row, "nclex_status") as Lead["nclex_status"] | undefined,
          application_status: str(row, "application_status") as
            | Lead["application_status"]
            | undefined,
          evaluation_status: str(row, "evaluation_status") as
            | Lead["evaluation_status"]
            | undefined,
          assigned: str(row, "assigned"),
          video_screen: bool(row, "video_screen"),
          signup_at: str(row, "signup_at"),
          school_slug: str(row, "school_slug"),
        },
        source,
        actor,
      );
      if (res.created) created++;
      else if (Object.keys(res.changes).length > 0) updated++;
      else unchanged++;
    } catch (e) {
      errors.push({
        index: i,
        email: typeof row?.email === "string" ? row.email : undefined,
        message: e instanceof Error ? e.message : "unknown error",
      });
    }
  }
  ctx.resourceType = "lead_import";
  send(ctx, 200, {
    source,
    total: leads.length,
    created,
    updated,
    unchanged,
    errors,
  });
}

async function listLeads(ctx: ReqCtx, deps: Deps): Promise<void> {
  const { cursor, limit } = pagination(ctx.query);
  const filters = {
    country: ctx.query.get("country") ?? undefined,
    type: (ctx.query.get("type") ?? undefined) as Lead["type"] | undefined,
    nclex_status: (ctx.query.get("nclex_status") ?? undefined) as
      | Lead["nclex_status"]
      | undefined,
    application_status: (ctx.query.get("application_status") ?? undefined) as
      | Lead["application_status"]
      | undefined,
    q: ctx.query.get("q") ?? undefined,
  };
  send(ctx, 200, await deps.store.leads.list(filters, cursor, limit));
}

async function getLead(ctx: ReqCtx, deps: Deps): Promise<void> {
  const id = ctx.params["id"] ?? "";
  ctx.resourceType = "lead";
  ctx.resourceId = id;
  const lead = await deps.store.leads.get(id);
  if (!lead) return err(ctx, 404, "not_found", "lead not found");
  const events = await deps.store.leads.events.listByLead(id);
  send(ctx, 200, { lead, events });
}

async function getLeadRollup(ctx: ReqCtx, deps: Deps): Promise<void> {
  ctx.resourceType = "lead_rollup";
  send(ctx, 200, await deps.store.leads.rollup());
}

async function listRecentLeadEvents(ctx: ReqCtx, deps: Deps): Promise<void> {
  const since = ctx.query.get("since") ?? undefined;
  const limit = Math.max(1, Math.min(500, Number(ctx.query.get("limit") ?? 100)));
  ctx.resourceType = "lead_events";
  send(ctx, 200, { data: await deps.store.leads.events.listRecent(since, limit) });
}

// ── Drip campaign (Phase 3) ─────────────────────────────────────────────────
function safeSecretEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Build the per-lead template context: name, school-tier join, soonest
 *  cohort label, and the tokenized public URLs. */
async function buildDripContext(deps: Deps, lead: import("./types.ts").Lead): Promise<DripContext> {
  const token = lead.unsubscribe_token ?? "";
  const base = config.publicAppUrl;
  let schoolName: string | undefined;
  let isPartner = false;
  if (lead.school_slug) {
    const school = await deps.store.schools.get(lead.school_slug);
    if (school) {
      schoolName = school.name;
      isPartner = school.tier === "affiliate" || school.tier === "lab_partner";
    }
  }
  // Soonest scheduled/active cohort with a start date → "Manila cohort".
  let cohortLabel: string | undefined;
  const page = await deps.store.cohorts.list(undefined, 100);
  const upcoming = page.data
    .filter((c) => (c.status === "scheduled" || c.status === "active") && c.starts_at)
    .sort((a, b) => (a.starts_at ?? "").localeCompare(b.starts_at ?? ""));
  if (upcoming[0]) {
    const city = upcoming[0].name.split(" · ")[0].trim();
    cohortLabel = `${city} cohort`;
  }
  const firstname = lead.firstname ?? lead.fullname?.split(" ")[0] ?? "";
  return {
    firstname,
    ...(schoolName && { schoolName }),
    isPartnerSchool: isPartner,
    ...(cohortLabel && { cohortLabel }),
    enrichUrl: `${base}/#/enrich?token=${encodeURIComponent(token)}`,
    learnUrl: `${base}/#/`,
    signupUrl: `${base}/#/signup`,
    unsubUrl: `${base}/#/unsubscribe?token=${encodeURIComponent(token)}`,
  };
}

/**
 * Advance the drip by one step for every eligible lead. External-cron
 * triggered; guarded by DRIP_TICK_SECRET (503 when unset, 401 on mismatch).
 * Re-entrant: dedupes by (lead, next_step) via drip_step + the per-stage
 * interval, so a double-firing cron never double-sends.
 */
async function postDripTick(ctx: ReqCtx, deps: Deps): Promise<void> {
  const secret = config.drip.tickSecret;
  if (!secret) return err(ctx, 503, "not_configured", "DRIP_TICK_SECRET not set");
  const provided = typeof ctx.headers["x-drip-secret"] === "string" ? ctx.headers["x-drip-secret"] : "";
  if (!provided || !safeSecretEq(provided, secret))
    return err(ctx, 401, "unauthorized", "bad drip secret");

  const cap = Math.max(1, Math.min(1000, num(ctx.body, "cap") ?? config.drip.sendCapPerTick));
  const scanLimit = Math.min(cap * 5, 3000);
  const active = await deps.store.leads.dripActive(scanLimit);
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  let sent = 0;
  let advanced = 0;
  let suppressed_skipped = 0;
  let consent_skipped = 0;
  let not_due = 0;
  let failed = 0;
  let capped = 0;

  for (const candidate of active) {
    if (sent >= cap) {
      capped++;
      continue;
    }
    // Re-fetch fresh to close the TOCTOU between scan and send.
    const lead = await deps.store.leads.get(candidate.id);
    if (!lead) continue;
    if (lead.unsubscribed_at) {
      suppressed_skipped++;
      continue;
    }
    const stage = lead.lifecycle_stage ?? "new";
    if (stage !== "invited" && stage !== "engaged") continue;
    const nextStep = (lead.drip_step ?? -1) + 1;
    if (nextStep > DRIP_MAX_STEP) continue;
    // Re-permission gate: an "invited" lead only ever receives stage 0.
    if (stage === "invited" && nextStep >= 1) {
      consent_skipped++;
      continue;
    }
    // Per-stage interval (stage 0 has interval 0 → sends immediately on enroll).
    const intervalDays = config.drip.stageIntervalDays[nextStep] ?? 7;
    if (lead.last_contacted_at) {
      const elapsed = nowMs - Date.parse(lead.last_contacted_at);
      if (elapsed < intervalDays * 86_400_000) {
        not_due++;
        continue;
      }
    }
    const dctx = await buildDripContext(deps, lead);
    const email = renderDripStage(nextStep, dctx);
    try {
      await deps.email.send({
        to: lead.email,
        subject: email.subject,
        text: email.text,
        html: email.html,
        headers: { "List-Unsubscribe": `<${dctx.unsubUrl}>` },
      });
    } catch {
      // Relay failed — leave the lead due, retry next tick. No PII logged.
      failed++;
      continue;
    }
    await deps.store.leads.dripRecordSend(lead.id, nextStep, now, stageAdvanceTarget(nextStep));
    sent++;
    advanced++;
  }
  ctx.resourceType = "drip_tick";
  send(ctx, 200, {
    scanned: active.length,
    sent,
    advanced,
    suppressed_skipped,
    consent_skipped,
    not_due,
    failed,
    capped,
  });
}

async function postLeadDripEnroll(ctx: ReqCtx, deps: Deps): Promise<void> {
  const id = ctx.params["id"] ?? "";
  const requireOptin = bool(ctx.body, "require_optin") ?? true;
  ctx.resourceType = "lead";
  ctx.resourceId = id;
  const lead = await deps.store.leads.dripEnroll(id, requireOptin);
  if (!lead) return err(ctx, 404, "not_found", "lead not found");
  send(ctx, 200, lead);
}

async function postLeadDripPause(ctx: ReqCtx, deps: Deps): Promise<void> {
  const id = ctx.params["id"] ?? "";
  ctx.resourceType = "lead";
  ctx.resourceId = id;
  const lead = await deps.store.leads.dripPause(id);
  if (!lead) return err(ctx, 404, "not_found", "lead not found");
  send(ctx, 200, lead);
}

async function postDripEnrollBatch(ctx: ReqCtx, deps: Deps): Promise<void> {
  const filtersRaw = obj(ctx.body, "filters") ?? {};
  const filters = {
    country: str(filtersRaw, "country"),
    type: str(filtersRaw, "type") as Lead["type"] | undefined,
    nclex_status: str(filtersRaw, "nclex_status") as Lead["nclex_status"] | undefined,
    application_status: str(filtersRaw, "application_status") as Lead["application_status"] | undefined,
    q: str(filtersRaw, "q"),
  };
  const requireOptin = bool(ctx.body, "require_optin") ?? true;
  const capRaw = num(ctx.body, "cap") ?? 500;
  const cap = Math.max(1, Math.min(5000, capRaw));
  ctx.resourceType = "drip_enroll_batch";
  send(ctx, 200, await deps.store.leads.dripEnrollBatch(filters, requireOptin, cap));
}

async function getDripOverview(ctx: ReqCtx, deps: Deps): Promise<void> {
  ctx.resourceType = "drip_overview";
  send(ctx, 200, await deps.store.leads.dripOverview());
}

async function postDripPreview(ctx: ReqCtx, deps: Deps): Promise<void> {
  const leadId = str(ctx.body, "lead_id") ?? "";
  const step = Math.max(0, Math.min(DRIP_MAX_STEP, num(ctx.body, "step") ?? 0));
  const lead = await deps.store.leads.get(leadId);
  if (!lead) return err(ctx, 404, "not_found", "lead not found");
  const dctx = await buildDripContext(deps, lead);
  const email = renderDripStage(step, dctx);
  ctx.resourceType = "drip_preview";
  send(ctx, 200, { step, ...email });
}

/** Public one-click opt-out. No auth — the token is the proof. Idempotent. */
async function postDripUnsubscribe(ctx: ReqCtx, deps: Deps): Promise<void> {
  const token = str(ctx.body, "token") ?? ctx.query.get("token") ?? "";
  if (!token) return err(ctx, 400, "invalid_request", "token required");
  const lead = await deps.store.leads.dripUnsubscribeByToken(token);
  if (!lead) return err(ctx, 404, "not_found", "unknown token");
  send(ctx, 200, { unsubscribed: true });
}

/** Public opt-in + school enrichment callback (the stage-0 CTA). Sets consent,
 *  moves the lead to "engaged", and records the school when supplied. */
async function postDripEnrich(ctx: ReqCtx, deps: Deps): Promise<void> {
  const token = str(ctx.body, "token") ?? "";
  const schoolSlug = str(ctx.body, "school_slug");
  if (!token) return err(ctx, 400, "invalid_request", "token required");
  if (schoolSlug && !(await deps.store.schools.get(schoolSlug)))
    return err(ctx, 400, "invalid_request", "unknown school_slug");
  const lead = await deps.store.leads.dripConsentByToken(token, schoolSlug);
  if (!lead) return err(ctx, 404, "not_found", "unknown token");
  send(ctx, 200, { ok: true, lifecycle_stage: lead.lifecycle_stage });
}

// ── Outreach (Lob print + mail) ─────────────────────────────────────────────
async function postOutreachCampaign(ctx: ReqCtx, deps: Deps): Promise<void> {
  const name = str(ctx.body, "name") ?? "";
  const kind = str(ctx.body, "kind") as OutreachKind | undefined;
  const mail_format = str(ctx.body, "mail_format") as OutreachMailFormat | undefined;
  const theme = (str(ctx.body, "theme") as OutreachTheme | undefined) ?? "teal";
  const notes = str(ctx.body, "notes");
  if (!name || !kind || !mail_format)
    return err(ctx, 400, "invalid_request", "name, kind, mail_format required");
  if (!["university", "nursing_association", "employer", "hospital"].includes(kind))
    return err(ctx, 400, "invalid_request", "invalid kind");
  if (!["postcard_6x11", "letter_us"].includes(mail_format))
    return err(ctx, 400, "invalid_request", "invalid mail_format");
  const c = await deps.store.outreach.campaigns.create({
    name,
    kind,
    mail_format,
    theme,
    ...(notes && { notes }),
  });
  ctx.resourceType = "outreach_campaign";
  ctx.resourceId = c.id;
  send(ctx, 201, c);
}
async function listOutreachCampaigns(ctx: ReqCtx, deps: Deps): Promise<void> {
  const data = await deps.store.outreach.campaigns.list();
  send(ctx, 200, { data });
}
async function getOutreachCampaign(ctx: ReqCtx, deps: Deps): Promise<void> {
  const id = ctx.params["id"] ?? "";
  ctx.resourceType = "outreach_campaign";
  ctx.resourceId = id;
  const c = await deps.store.outreach.campaigns.get(id);
  if (!c) return err(ctx, 404, "not_found", "campaign not found");
  const targets = await deps.store.outreach.targets.listByCampaign(id);
  const pieces = await deps.store.outreach.pieces.listByCampaign(id);
  send(ctx, 200, { campaign: c, targets, pieces });
}
async function patchOutreachCampaign(ctx: ReqCtx, deps: Deps): Promise<void> {
  const id = ctx.params["id"] ?? "";
  const status = str(ctx.body, "status") as OutreachCampaignStatus | undefined;
  const notes = str(ctx.body, "notes");
  const name = str(ctx.body, "name");
  const patch: { status?: OutreachCampaignStatus; notes?: string; name?: string } = {};
  if (status) patch.status = status;
  if (notes !== undefined) patch.notes = notes;
  if (name) patch.name = name;
  const c = await deps.store.outreach.campaigns.patch(id, patch);
  if (!c) return err(ctx, 404, "not_found", "campaign not found");
  send(ctx, 200, c);
}

async function postOutreachTargets(ctx: ReqCtx, deps: Deps): Promise<void> {
  const campaign_id = ctx.params["id"] ?? "";
  const campaign = await deps.store.outreach.campaigns.get(campaign_id);
  if (!campaign) return err(ctx, 404, "not_found", "campaign not found");
  const targets = arr<Record<string, unknown>>(ctx.body, "targets") ?? [];
  if (targets.length === 0)
    return err(ctx, 400, "invalid_request", "targets[] required");
  const out = [];
  const errors: { index: number; message: string }[] = [];
  for (let i = 0; i < targets.length; i++) {
    const r = targets[i];
    try {
      const org_name = str(r, "org_name") ?? "";
      const address_line1 = str(r, "address_line1") ?? "";
      const city = str(r, "city") ?? "";
      const postal_code = str(r, "postal_code") ?? "";
      const country = str(r, "country") ?? "";
      if (!org_name || !address_line1 || !city || !postal_code || !country) {
        errors.push({ index: i, message: "org_name, address_line1, city, postal_code, country required" });
        continue;
      }
      const t = await deps.store.outreach.targets.upsert({
        campaign_id,
        org_name,
        school_slug: str(r, "school_slug"),
        recipient_name: str(r, "recipient_name"),
        recipient_title: str(r, "recipient_title"),
        address_line1,
        address_line2: str(r, "address_line2"),
        city,
        state: str(r, "state"),
        postal_code,
        country,
        contact_notes: str(r, "contact_notes"),
      });
      out.push(t);
    } catch (e) {
      errors.push({ index: i, message: e instanceof Error ? e.message : "unknown error" });
    }
  }
  await deps.store.outreach.campaigns.recountTotals(campaign_id);
  send(ctx, 200, { campaign_id, added: out.length, targets: out, errors });
}

async function postOutreachPreview(ctx: ReqCtx, deps: Deps): Promise<void> {
  const campaign_id = ctx.params["id"] ?? "";
  const target_id = str(ctx.body, "target_id") ?? "";
  const tone = (str(ctx.body, "tone") as "quote" | "market" | undefined) ?? "market";
  const campaign = await deps.store.outreach.campaigns.get(campaign_id);
  if (!campaign) return err(ctx, 404, "not_found", "campaign not found");
  const target = await deps.store.outreach.targets.get(target_id);
  if (!target || target.campaign_id !== campaign_id)
    return err(ctx, 404, "not_found", "target not found");
  const rendered = renderMailpiece(campaign.mail_format, {
    target,
    theme: campaign.theme,
    tone,
  });
  send(ctx, 200, {
    campaign_id,
    target_id,
    format: campaign.mail_format,
    activation_url: rendered.activation_url,
    front: rendered.front,
    back: rendered.back,
  });
}

async function postOutreachSend(ctx: ReqCtx, deps: Deps): Promise<void> {
  const campaign_id = ctx.params["id"] ?? "";
  const target_ids = arr<string>(ctx.body, "target_ids") ?? [];
  const api_key = str(ctx.body, "api_key") ?? "";
  const fromAddrRaw = obj(ctx.body, "from") ?? {};
  const tone = (str(ctx.body, "tone") as "quote" | "market" | undefined) ?? "market";
  if (!api_key)
    return err(ctx, 400, "invalid_request", "api_key required");
  if (!target_ids.length)
    return err(ctx, 400, "invalid_request", "target_ids required");
  const campaign = await deps.store.outreach.campaigns.get(campaign_id);
  if (!campaign) return err(ctx, 404, "not_found", "campaign not found");
  const mode = lobKeyMode(api_key);
  const from: LobAddress = {
    name: str(fromAddrRaw, "name") ?? "Florence Academy",
    company: str(fromAddrRaw, "company") ?? "Florence Academy",
    address_line1: str(fromAddrRaw, "address_line1") ?? "",
    address_city: str(fromAddrRaw, "address_city") ?? "",
    address_zip: str(fromAddrRaw, "address_zip") ?? "",
    address_country: str(fromAddrRaw, "address_country") ?? "US",
    ...(str(fromAddrRaw, "address_state") && { address_state: str(fromAddrRaw, "address_state")! }),
  };
  if (!from.address_line1 || !from.address_city || !from.address_zip)
    return err(ctx, 400, "invalid_request", "from.address_line1, address_city, address_zip required");

  const results: Array<{
    target_id: string;
    ok: boolean;
    mail_piece_id?: string;
    lob_id?: string;
    error?: string;
  }> = [];
  for (const target_id of target_ids) {
    const target = await deps.store.outreach.targets.get(target_id);
    if (!target || target.campaign_id !== campaign_id) {
      results.push({ target_id, ok: false, error: "target not found" });
      continue;
    }
    const rendered = renderMailpiece(campaign.mail_format, {
      target,
      theme: campaign.theme,
      tone,
    });
    const to: LobAddress = {
      name: target.recipient_name ?? target.org_name,
      company: target.org_name,
      address_line1: target.address_line1,
      ...(target.address_line2 && { address_line2: target.address_line2 }),
      address_city: target.city,
      ...(target.state && { address_state: target.state }),
      address_zip: target.postal_code,
      address_country: countryToIso2(target.country),
    };
    try {
      const lob = await lobCreate(campaign.mail_format, {
        api_key,
        idempotency_key: lobIdempotencyKey(campaign_id, target_id),
        to,
        from,
        front: rendered.front,
        back: rendered.back,
        metadata: {
          campaign_id,
          target_id,
          activation_code: target.activation_code,
        },
      });
      const piece = await deps.store.outreach.pieces.create({
        target_id,
        campaign_id,
        format: campaign.mail_format,
        mode,
        status: "created",
        lob_id: lob.id,
        ...(lob.url && { preview_url: lob.url }),
        ...(lob.price && { cost_cents: priceDollarsToCents(lob.price) }),
      });
      await deps.store.outreach.targets.patch(target_id, {
        status: "sent",
        sent_at: new Date().toISOString(),
      });
      results.push({ target_id, ok: true, mail_piece_id: piece.id, lob_id: lob.id });
    } catch (e) {
      const msg =
        e instanceof LobError
          ? `${e.message} ${JSON.stringify(e.body).slice(0, 200)}`
          : e instanceof Error
            ? e.message
            : "unknown";
      results.push({ target_id, ok: false, error: msg });
    }
  }
  await deps.store.outreach.campaigns.recountTotals(campaign_id);
  send(ctx, 200, { campaign_id, mode, results });
}

/** Lob webhook receiver. Public route; signature-verified.
 *  Maintains the per-piece status + appends to mail_piece_events. */
async function postLobWebhook(ctx: ReqCtx, deps: Deps): Promise<void> {
  const secret = config.lobWebhookSecret ?? "";
  if (!secret) {
    return err(ctx, 503, "not_configured", "Lob webhook secret not configured");
  }
  const signature = ctx.headers["lob-signature"];
  const timestamp = ctx.headers["lob-signature-timestamp"];
  const raw = ctx.rawBody ?? "";
  const ok = verifyLobSignature({
    secret,
    signature: typeof signature === "string" ? signature : undefined,
    timestamp: typeof timestamp === "string" ? timestamp : undefined,
    rawBody: raw,
  });
  if (!ok) return err(ctx, 400, "invalid_signature", "signature did not verify");
  const evt = ctx.body as {
    id?: string;
    event_type?: { id?: string } | string;
    body?: { id?: string };
    date_created?: string;
  };
  const event_type =
    typeof evt.event_type === "string" ? evt.event_type : evt.event_type?.id ?? "unknown";
  const lob_event_id = evt.id;
  const lob_id = evt.body?.id;
  if (!lob_id) return err(ctx, 400, "invalid_event", "event.body.id missing");
  const piece = await deps.store.outreach.pieces.getByLobId(lob_id);
  if (!piece) {
    // Event arrived before we knew about this piece (or this is for someone
    // else's campaign). Accept 200 so Lob doesn't retry forever.
    send(ctx, 200, { received: true, mapped: false });
    return;
  }
  const occurred_at = evt.date_created ?? new Date().toISOString();
  await deps.store.outreach.events.record({
    mail_piece_id: piece.id,
    ...(lob_event_id && { lob_event_id }),
    event_type,
    payload: evt as unknown as Record<string, unknown>,
    occurred_at,
  });
  // Map event_type → MailPieceStatus where we recognize it.
  const mapped = mapLobEventToStatus(event_type);
  if (mapped) {
    await deps.store.outreach.pieces.patch(piece.id, {
      status: mapped,
      ...(mapped === "delivered" && { delivered_at: occurred_at }),
    });
    // Mirror onto the target's status so the campaign rollup stays right.
    const targetStatus =
      mapped === "delivered"
        ? "delivered"
        : mapped === "returned_to_sender"
          ? "returned"
          : mapped === "in_transit" || mapped === "in_local_area" || mapped === "processed_for_delivery"
            ? "in_transit"
            : undefined;
    if (targetStatus) {
      await deps.store.outreach.targets.patch(piece.target_id, {
        status: targetStatus,
        ...(mapped === "delivered" && { delivered_at: occurred_at }),
      });
      await deps.store.outreach.campaigns.recountTotals(piece.campaign_id);
    }
  }
  send(ctx, 200, { received: true, mapped: !!mapped });
}

function mapLobEventToStatus(
  eventType: string,
): import("./types.ts").MailPieceStatus | null {
  // Lob event types: "postcard.in_transit", "letter.delivered", etc.
  if (eventType.endsWith(".in_transit")) return "in_transit";
  if (eventType.endsWith(".in_local_area")) return "in_local_area";
  if (eventType.endsWith(".processed_for_delivery")) return "processed_for_delivery";
  if (eventType.endsWith(".delivered")) return "delivered";
  if (eventType.endsWith(".re_routed")) return "re_routed";
  if (eventType.endsWith(".returned_to_sender")) return "returned_to_sender";
  return null;
}

/** Public-ish activation lookup. Returns the school + offer for a given code.
 *  No auth — but only emits the offer payload, never internal target details. */
async function getActivation(ctx: ReqCtx, deps: Deps): Promise<void> {
  const code = ctx.params["code"] ?? "";
  const target = await deps.store.outreach.targets.getByCode(code);
  if (!target) return err(ctx, 404, "not_found", "code not found");
  const campaign = await deps.store.outreach.campaigns.get(target.campaign_id);
  if (!campaign) return err(ctx, 404, "not_found", "campaign not found");
  const school = target.school_slug
    ? await deps.store.schools.get(target.school_slug)
    : undefined;
  send(ctx, 200, {
    code,
    org_name: target.org_name,
    ...(school && {
      school: { slug: school.slug, name: school.name, country: school.country, tier: school.tier },
    }),
    campaign_kind: campaign.kind,
    offer: {
      headline: "Florence Academy partner activation",
      alumni_discount_pct: 25,
      // The discount maps to our existing $75 preferred deposit tier.
      preferred_deposit_usd: 75,
      standard_deposit_usd: 100,
      partner_dashboard: true,
      coming_next: ["Branded computer lab", "VR patient-simulation platform"],
    },
    status: target.status,
  });
}

/** Operator confirms an activation: flip the school's tier to "affiliate"
 *  (= alumni qualify for $75 preferred deposit) and stamp the target. */
async function postActivationApprove(ctx: ReqCtx, deps: Deps): Promise<void> {
  const code = ctx.params["code"] ?? "";
  const target = await deps.store.outreach.targets.getByCode(code);
  if (!target) return err(ctx, 404, "not_found", "code not found");
  if (target.school_slug) {
    const school = await deps.store.schools.get(target.school_slug);
    if (school && school.tier !== "lab_partner") {
      await deps.store.schools.patch(target.school_slug, { tier: "affiliate" });
    }
  }
  const now = new Date().toISOString();
  await deps.store.outreach.targets.patch(target.id, {
    status: "activated",
    activated_at: now,
  });
  await deps.store.outreach.campaigns.recountTotals(target.campaign_id);
  send(ctx, 200, { code, status: "activated", activated_at: now });
}

export const routes: Route[] = [
  compile("POST", "/oauth/token", null, false, postToken),
  compile("GET", "/health", null, false, getHealth),
  compile("GET", "/v1/session", null, false, getSession),
  compile("GET", "/v1/live/config", null, false, getLiveConfig),
  compile("POST", "/v1/live/token", null, false, postLiveToken),
  compile("POST", "/v1/live/recording/start", null, false, postRecordingStart),
  compile("POST", "/v1/live/recording/stop", null, false, postRecordingStop),
  compile("POST", "/v1/live/recording/status", null, false, postRecordingStatus),
  compile("POST", "/v1/live/recordings", null, false, postRecordingsList),
  compile("GET", "/v1/audio/manifest", null, false, getAudioManifest),
  compile("GET", "/v1/audio/file/:name", null, false, getAudioFile),
  compile("GET", "/v1/tutor/config", null, false, getTutorConfig),
  compile("POST", "/v1/tutor/session", null, false, postTutorSession),
  compile("POST", "/v1/clients", "clients:manage", true, createClient),
  compile("POST", "/v1/clients/:id/rotate", "clients:manage", true, rotateClient),
  compile("POST", "/v1/tokens/session", "tokens:mint", true, mintSessionToken),
  compile("POST", "/v1/tokens/revoke", null, true, revokeToken),
  compile("POST", "/v1/tokens/introspect", "tokens:mint", true, introspectToken),
  // Candidate end-user auth (public) + own-session helpers.
  compile("POST", "/v1/auth/signup", null, false, postSignup),
  compile("POST", "/v1/auth/login", null, false, postLogin),
  compile("POST", "/v1/auth/logout", null, true, revokeToken),
  compile("POST", "/v1/auth/verify", null, false, postVerifyEmail),
  compile("POST", "/v1/auth/resend", null, true, postResendVerification),
  compile("GET", "/v1/me", "candidates:read", true, getMe),
  // Candidate's currently-active cohort — read by AcademyHome to gate sections.
  compile("GET", "/v1/me/cohort", "candidates:read", true, getMyCohort),
  compile("GET", "/v1/me/audit", "candidates:read", true, getMyAudit),
  compile("GET", "/v1/candidates", "candidates:read", true, listCandidates),
  compile("POST", "/v1/candidates", "candidates:write", true, createCandidate),
  compile("GET", "/v1/candidates/:id", "candidates:read", true, getCandidate),
  compile("PATCH", "/v1/candidates/:id", "candidates:write", true, patchCandidate),
  compile("POST", "/v1/candidates/:id/progress", "performance:write", true, postProgress),
  compile("GET", "/v1/candidates/:id/progress", "candidates:read", true, getProgress),
  compile("GET", "/v1/candidates/:id/readiness", "performance:read", true, getReadiness),
  compile("POST", "/v1/candidates/:id/pathway-handoff", "enrollment:write", true, postPathwayHandoff),
  compile("POST", "/v1/candidates/:id/pathway-tasks", "pathway:write", true, postPathwayTask),
  compile("GET", "/v1/candidates/:id/pathway-tasks", "candidates:read", true, listPathwayTasks),
  compile("GET", "/v1/enrollments", "enrollment:read", true, listEnrollments),
  compile("POST", "/v1/enrollments", "enrollment:write", true, createEnrollment),
  compile("PATCH", "/v1/enrollments/:id", "enrollment:write", true, patchEnrollment),
  compile("GET", "/v1/cohorts", "cohorts:read", true, listCohorts),
  // Public marketing endpoint — narrow projection of scheduled/active cohorts.
  compile("GET", "/v1/public/cohorts", null, false, listCohortsPublic),
  // Instructor: bump the cohort's coverage watermark (one-call-per-class).
  compile("PATCH", "/v1/cohorts/:id/coverage", "cohorts:write", true, patchCohortCoverage),
  compile("POST", "/v1/cohorts", "cohorts:write", true, createCohort),
  compile("GET", "/v1/cohorts/:id", "cohorts:read", true, getCohort),
  compile("PATCH", "/v1/cohorts/:id", "cohorts:write", true, patchCohort),
  compile("GET", "/v1/cohorts/:id/roster", "cohorts:read", true, getCohortRoster),
  compile("GET", "/v1/cohorts/:code/copilot", "cohorts:read", true, getCohortCopilot),
  compile("GET", "/v1/assessment-results", "performance:read", true, listAssessments),
  compile("POST", "/v1/assessment-results", "performance:write", true, createAssessment),
  compile("GET", "/v1/assessment-results/:id", "performance:read", true, getAssessment),
  compile("GET", "/v1/candidates/:id/remediations", "performance:read", true, listRemediations),
  compile("POST", "/v1/candidates/:id/remediations/clear", "performance:write", true, clearRemediation),
  compile("POST", "/v1/candidates/:id/responses", "performance:write", true, recordResponse),
  compile("GET", "/v1/ops/questions/:id/analytics", "performance:read", true, getQuestionAnalytics),
  // Clinical-judgment walkthroughs: learner fetch (approved only) + content QA.
  compile("GET", "/v1/questions/:id/walkthrough", "performance:read", true, getQuestionWalkthrough),
  compile("GET", "/v1/walkthroughs", "content:read", true, listWalkthroughs),
  compile("GET", "/v1/walkthroughs/:qid", "content:read", true, getWalkthroughAdmin),
  compile("POST", "/v1/walkthroughs/:qid/sme-review", "content:write", true, smeReviewWalkthrough),
  compile("POST", "/v1/walkthroughs/:qid/approve", "content:write", true, approveWalkthrough),
  compile("POST", "/v1/walkthroughs/:qid/reject", "content:write", true, rejectWalkthrough),
  compile("PATCH", "/v1/walkthroughs/:qid", "content:write", true, patchWalkthrough),
  compile("GET", "/v1/outcomes/funnel", "outcomes:read", true, getOutcomeFunnel),
  compile("GET", "/v1/ops/cohort-pass-rates", "outcomes:read", true, getCohortPassRates),
  compile("POST", "/v1/ops/cohort-pass-rates/publish", "outcomes:read", true, publishCohortReport),
  compile("POST", "/v1/outcomes", "outcomes:write", true, createOutcome),
  compile("GET", "/v1/outcomes", "outcomes:read", true, listOutcomes),
  compile("GET", "/v1/attendance/rollup", "enrollment:read", true, getAttendanceRollup),
  compile("POST", "/v1/attendance", "enrollment:write", true, createAttendance),
  compile("GET", "/v1/attendance", "enrollment:read", true, listAttendance),
  compile("GET", "/v1/employer/candidates", "employer:read", true, getEmployerCandidates),
  compile("POST", "/v1/employer/offers", "employer:read", true, postEmployerOffer),
  compile("GET", "/v1/university/overview", "university:read", true, getUniversityOverview),
  // Schools directory: public list (no auth) for the signup picker; admin CRUD.
  compile("GET", "/v1/schools", null, false, listSchoolsPublic),
  compile("POST", "/v1/schools", "schools:write", true, createSchool),
  compile("GET", "/v1/schools/:slug", "schools:read", true, getSchoolAdmin),
  compile("PATCH", "/v1/schools/:slug", "schools:write", true, patchSchool),
  // K-anonymized per-school report (ops or eventual school partner).
  compile("GET", "/v1/schools/:slug/report", "schools:read", true, getSchoolReport),
  // Candidate affiliations (signup-time attestation; their own only).
  compile("POST", "/v1/candidates/:id/affiliations", "candidates:write", true, postAffiliation),
  compile("GET", "/v1/candidates/:id/affiliations", "candidates:read", true, listMyAffiliations),
  // Outreach-ready list — internal (kept off /v1/schools/:slug to avoid the
  // routing collision; this is an ops query, not a school resource).
  compile("GET", "/v1/outreach/ready", "schools:read", true, listOutreachReady),
  compile("GET", "/v1/payments", "payments:read", true, listPayments),
  compile("POST", "/v1/payments", "payments:write", true, createPayment),
  compile("POST", "/v1/payments/checkout", null, true, postCheckout),
  compile("POST", "/v1/payments/webhook/stripe", null, false, postStripeWebhook),
  compile("POST", "/v1/payments/:id/mock-complete", null, false, postMockComplete),
  // Leads (Florence core mirror) — operator-only; never returned to candidates.
  compile("POST", "/v1/leads/import", "leads:write", true, postLeadsImport),
  compile("GET", "/v1/leads", "leads:read", true, listLeads),
  compile("GET", "/v1/leads/rollup", "leads:read", true, getLeadRollup),
  compile("GET", "/v1/leads/events/recent", "leads:read", true, listRecentLeadEvents),
  compile("GET", "/v1/leads/:id", "leads:read", true, getLead),
  // Drip campaign (Phase 3). Operator endpoints are leads:read/write-scoped;
  // the tick is secret-guarded (external cron); unsubscribe/enrich are public.
  compile("POST", "/v1/drip/tick", null, false, postDripTick),
  compile("POST", "/v1/drip/enroll-batch", "leads:write", true, postDripEnrollBatch),
  compile("GET", "/v1/drip/overview", "leads:read", true, getDripOverview),
  compile("POST", "/v1/drip/preview", "leads:read", true, postDripPreview),
  compile("POST", "/v1/drip/unsubscribe", null, false, postDripUnsubscribe),
  compile("POST", "/v1/drip/enrich", null, false, postDripEnrich),
  compile("POST", "/v1/leads/:id/drip/enroll", "leads:write", true, postLeadDripEnroll),
  compile("POST", "/v1/leads/:id/drip/pause", "leads:write", true, postLeadDripPause),
  // Outreach (Lob print + mail). Operator-scoped; never returned to candidates.
  compile("POST", "/v1/outreach/campaigns", "outreach:write", true, postOutreachCampaign),
  compile("GET", "/v1/outreach/campaigns", "outreach:read", true, listOutreachCampaigns),
  compile("GET", "/v1/outreach/campaigns/:id", "outreach:read", true, getOutreachCampaign),
  compile("PATCH", "/v1/outreach/campaigns/:id", "outreach:write", true, patchOutreachCampaign),
  compile("POST", "/v1/outreach/campaigns/:id/targets", "outreach:write", true, postOutreachTargets),
  compile("POST", "/v1/outreach/campaigns/:id/preview", "outreach:read", true, postOutreachPreview),
  compile("POST", "/v1/outreach/campaigns/:id/send", "outreach:write", true, postOutreachSend),
  // Lob webhook. Public route (Lob calls it), signature-verified inside.
  compile("POST", "/v1/outreach/webhooks/lob", null, false, postLobWebhook),
  // Public activation lookup + operator approval.
  compile("GET", "/v1/activation/:code", null, false, getActivation),
  compile("POST", "/v1/activation/:code/approve", "outreach:write", true, postActivationApprove),
];
