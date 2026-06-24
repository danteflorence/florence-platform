import type { Audit } from "./audit.ts";
import { checkEmployerShareConsent } from "./consent.ts";
import { foldPassport, type Passport } from "./passport.ts";
import { passportView } from "./passportView.ts";
import { recordEvent } from "./nurses.ts";
import type { ApplicationSubmissionLock, ProgramScope, Store, SubmissionChannel } from "./store.ts";
import { id, nowIso } from "./util.ts";

export type ApplicationGateAction =
  | "express_interest"
  | "release_employer_profile"
  | "release_employer_packet"
  | "submit_application"
  | "ats_submission"
  | "vms_submission";

export type ApplicationGateFailureCode =
  | "candidate_not_found"
  | "employer_missing"
  | "missing_consent"
  | "work_authorization_pending"
  | "license_pending"
  | "packet_qa_pending"
  | "job_not_active"
  | "workflow_unauthorized"
  | "duplicate_submission_lock"
  | "packet_not_minimized";

export interface ApplicationGateInput {
  nurseId: string;
  employerId?: string;
  programId?: string;
  jobRequisitionId?: string;
  jobStatus?: string;
  requiredLicenseState?: string;
  channel?: SubmissionChannel;
  action?: ApplicationGateAction;
  /** Internal compatibility only; external callers may not assert gate facts. */
  channelAuthorized?: boolean;
  /** Internal compatibility only; external callers may not assert gate facts. */
  packetQaApproved?: boolean;
  /** Internal compatibility only; external callers may not assert gate facts. */
  dataMinimizedPacketGenerated?: boolean;
  actor?: string;
}

export interface ApplicationGateResult {
  ok: boolean;
  status:
    | "interest_allowed"
    | "ready_to_submit"
    | "missing_consent"
    | "work_authorization_pending"
    | "license_pending"
    | "qa_pending"
    | "job_closed"
    | "workflow_unauthorized"
    | "duplicate_submission"
    | "blocked";
  allowedAction: "express_interest" | "submit_application";
  failureCodes: ApplicationGateFailureCode[];
  reasons: string[];
  subjectTo: string[];
  subjectToMessage: string;
  consentId?: string;
  duplicateLockId?: string;
  employerId?: string;
  programId?: string;
  jobRequisitionId?: string;
  channel: SubmissionChannel;
}

export interface ApplicationSubmissionResult {
  allowed: boolean;
  gate: ApplicationGateResult;
  lock?: ApplicationSubmissionLock;
}

const SUBJECT_TO = [
  "consular_processing",
  "final_work_authorization",
  "credentialing",
  "onboarding",
  "employer_approval",
];
const GATED_EVENT_TYPES = new Set(["ats.packet_submitted", "ats.application_submitted", "vms.packet_submitted", "vms.submitted", "application.submitted", "employer_packet.shared"]);
const APPLICATION_GATE_EVENT_SOURCES = new Set(["core_application_gate", "application_gate"]);

export const SUBJECT_TO_MESSAGE =
  "Interviews, offers, and starts remain subject to consular processing, final work authorization, credentialing, onboarding, and employer approval where applicable.";

export function requiresApplicationGateForEvent(eventType: string): boolean {
  return GATED_EVENT_TYPES.has(eventType);
}

export function isApplicationGateEventSource(source: string): boolean {
  return APPLICATION_GATE_EVENT_SOURCES.has(source);
}

const WORK_AUTH_PASS = new Set(["approved", "work_authorized", "employment_authorized", "not_required", "citizen", "green_card"]);
const LICENSE_PASS = new Set(["issued", "active", "licensed", "approved", "granted"]);
const ACTIVE_JOB = new Set(["open", "active"]);

function norm(s?: string): string {
  return String(s ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

function actionScope(action: ApplicationGateAction, channel: SubmissionChannel): string {
  if (action === "release_employer_profile" || action === "release_employer_packet") return "packet.read";
  if (action === "ats_submission" || channel === "ats") return "ats.submit";
  if (action === "vms_submission" || channel === "vms") return "vms.submit";
  return "application.submit";
}

function hasProgramAction(program: ProgramScope | undefined, action: ApplicationGateAction, channel: SubmissionChannel): boolean {
  if (!program || program.status !== "active") return false;
  const allowed = program.authorized_actions;
  if (allowed.includes("*")) return true;
  return allowed.includes(actionScope(action, channel)) || allowed.includes(`${channel}.submit`);
}

function hasQaApproval(program: ProgramScope | undefined, nurseId: string): boolean {
  return Boolean(program?.approved_packet_nurse_ids.includes(nurseId));
}

function workAuthorizationCleared(passport: Passport): boolean {
  const stage = norm(passport.visa.stage);
  const outcome = norm(passport.visa.outcome);
  return WORK_AUTH_PASS.has(stage) || WORK_AUTH_PASS.has(outcome);
}

function licenseCleared(passport: Passport, requiredState?: string): boolean {
  if (!LICENSE_PASS.has(norm(passport.licensure.status))) return false;
  if (!requiredState) return true;
  return norm(passport.licensure.state) === norm(requiredState);
}

function jobActive(input: ApplicationGateInput, program: ProgramScope | undefined, jobRequisitionId: string | undefined): boolean {
  if (!program || program.status !== "active") return false;
  if (input.jobStatus && !ACTIVE_JOB.has(norm(input.jobStatus))) return false;
  if (!jobRequisitionId) return false;
  const activeJobs = program.active_job_ids ?? [];
  return activeJobs.includes("*") || activeJobs.includes(jobRequisitionId);
}

function duplicateLockApplies(action: ApplicationGateAction): boolean {
  return action === "submit_application" || action === "ats_submission" || action === "vms_submission";
}

function failureStatus(codes: ApplicationGateFailureCode[]): ApplicationGateResult["status"] {
  if (codes.includes("missing_consent")) return "missing_consent";
  if (codes.includes("work_authorization_pending")) return "work_authorization_pending";
  if (codes.includes("license_pending")) return "license_pending";
  if (codes.includes("packet_qa_pending")) return "qa_pending";
  if (codes.includes("job_not_active")) return "job_closed";
  if (codes.includes("workflow_unauthorized")) return "workflow_unauthorized";
  if (codes.includes("duplicate_submission_lock")) return "duplicate_submission";
  return "blocked";
}

async function gateContext(store: Store, input: ApplicationGateInput): Promise<{
  passport?: Passport;
  program?: ProgramScope;
  employerId?: string;
  jobRequisitionId?: string;
}> {
  const nurse = await store.getNurseById(input.nurseId);
  if (!nurse) return {};
  const [refs, events, program] = await Promise.all([
    store.refsByNurse(nurse.id),
    store.eventsByNurse(nurse.id),
    input.programId ? store.getProgramScope(input.programId) : Promise.resolve(undefined),
  ]);
  const passport = foldPassport(nurse, refs, events);
  const employerId = input.employerId ?? program?.employer_org_id ?? program?.owner_org_id ?? passport.placement.employerId;
  const jobRequisitionId = input.jobRequisitionId ?? passport.placement.jobReqId ?? program?.id;
  return { passport, program, employerId, jobRequisitionId };
}

function dataMinimizedPacketAvailable(passport: Passport, employerId: string | undefined, input: ApplicationGateInput): boolean {
  if (!employerId) return false;
  const audience = input.channel === "amn" || input.channel === "ats" || input.channel === "vms" ? "amn_vms_partner" : "employer";
  const view = passportView(passport, { audience, orgId: employerId, purpose: "employer_share", consentOk: true });
  const serialized = JSON.stringify(view.passport);
  return Boolean(
    view.passport &&
    !("visa" in view.passport) &&
    !("documents" in view.passport) &&
    !("billing" in view.passport) &&
    !/passport|ds[-_]?160|underwriting|academy|remediation|financ/i.test(serialized),
  );
}

export async function checkApplicationGate(store: Store, audit: Audit, input: ApplicationGateInput): Promise<ApplicationGateResult> {
  const action = input.action ?? "submit_application";
  const channel = input.channel ?? "direct";
  const actor = input.actor ?? "system";

  if (action === "express_interest") {
    const result: ApplicationGateResult = {
      ok: true,
      status: "interest_allowed",
      allowedAction: "express_interest",
      failureCodes: [],
      reasons: [],
      subjectTo: SUBJECT_TO,
      subjectToMessage: SUBJECT_TO_MESSAGE,
      employerId: input.employerId,
      programId: input.programId,
      jobRequisitionId: input.jobRequisitionId,
      channel,
    };
    await audit(actor, "application_gate.check", "nurse", input.nurseId, {
      action,
      ok: true,
      status: result.status,
      employerId: input.employerId,
      programId: input.programId,
      jobRequisitionId: input.jobRequisitionId,
      channel,
    });
    return result;
  }

  const ctx = await gateContext(store, input);
  const passport = ctx.passport;
  const employerId = ctx.employerId;
  const program = ctx.program;
  const programId = program?.id ?? input.programId;
  const jobRequisitionId = ctx.jobRequisitionId;
  const failureCodes: ApplicationGateFailureCode[] = [];
  const reasons: string[] = [];
  const fail = (code: ApplicationGateFailureCode, reason: string) => {
    failureCodes.push(code);
    reasons.push(reason);
  };

  if (!passport) {
    fail("candidate_not_found", "Candidate was not found in the canonical Nurse Passport.");
  }
  if (!employerId) {
    fail("employer_missing", "Employer context is required for employer-facing release or submission.");
  }

  let consentId: string | undefined;
  if (passport && employerId && programId) {
    const consent = await checkEmployerShareConsent(store, { nurseId: passport.nurseId, employerOrgId: employerId, programId });
    if (!consent.ok) fail("missing_consent", consent.reason ?? "Employer-share consent is missing.");
    else consentId = consent.consentId;
  } else {
    fail("missing_consent", "Employer-share consent cannot be verified without candidate, employer, and program context.");
  }

  if (passport && !workAuthorizationCleared(passport)) {
    fail("work_authorization_pending", `Visa or work authorization is not cleared (${passport.visa.outcome ?? passport.visa.stage ?? "unknown"}).`);
  }
  if (passport && !licenseCleared(passport, input.requiredLicenseState)) {
    fail("license_pending", `RN license is not active for the required role/state (${passport.licensure.status ?? "unknown"}${input.requiredLicenseState ? `/${input.requiredLicenseState}` : ""}).`);
  }
  if (passport && !hasQaApproval(program, passport.nurseId)) {
    fail("packet_qa_pending", "Employer packet QA has not been approved.");
  }
  if (!jobActive(input, program, jobRequisitionId)) {
    fail("job_not_active", `Job, requisition, or program is not active (${jobRequisitionId ?? input.jobStatus ?? program?.status ?? "unknown"}).`);
  }
  const workflowAuthorized = hasProgramAction(program, action, channel);
  if (!workflowAuthorized) {
    fail("workflow_unauthorized", "Employer or channel workflow is not authorized for this action.");
  }

  let duplicateLockId: string | undefined;
  if (passport && employerId && duplicateLockApplies(action)) {
    const duplicate = await store.activeSubmissionLock(passport.nurseId, employerId, channel);
    if (duplicate) {
      duplicateLockId = duplicate.id;
      fail("duplicate_submission_lock", "An active submission lock already exists for this candidate, employer, and channel.");
    }
  }

  if (passport && !dataMinimizedPacketAvailable(passport, employerId, input)) {
    fail("packet_not_minimized", "A data-minimized employer-safe packet was not generated.");
  }

  const ok = failureCodes.length === 0;
  const result: ApplicationGateResult = {
    ok,
    status: ok ? "ready_to_submit" : failureStatus(failureCodes),
    allowedAction: ok ? "submit_application" : "express_interest",
    failureCodes,
    reasons,
    subjectTo: SUBJECT_TO,
    subjectToMessage: SUBJECT_TO_MESSAGE,
    ...(consentId ? { consentId } : {}),
    ...(duplicateLockId ? { duplicateLockId } : {}),
    ...(employerId ? { employerId } : {}),
    ...(programId ? { programId } : {}),
    ...(jobRequisitionId ? { jobRequisitionId } : {}),
    channel,
  };

  await audit(actor, "application_gate.check", "nurse", input.nurseId, {
    action,
    ok,
    status: result.status,
    failureCodes,
    employerId,
    programId,
    jobRequisitionId,
    channel,
  });
  return result;
}

export async function submitApplicationThroughGate(store: Store, audit: Audit, input: ApplicationGateInput): Promise<ApplicationSubmissionResult> {
  const actor = input.actor ?? "system";
  const channel = input.channel ?? "direct";
  await audit(actor, "application_gate.submission_attempt", "nurse", input.nurseId, {
    employerId: input.employerId,
    programId: input.programId,
    jobRequisitionId: input.jobRequisitionId,
    channel,
    action: input.action ?? "submit_application",
  });

  const gate = await checkApplicationGate(store, audit, { ...input, action: input.action ?? "submit_application" });
  if (!gate.ok || !gate.employerId) {
    await audit(actor, "application_gate.submission_blocked", "nurse", input.nurseId, {
      status: gate.status,
      failureCodes: gate.failureCodes,
      employerId: gate.employerId,
      programId: gate.programId,
      jobRequisitionId: gate.jobRequisitionId,
      channel,
    });
    return { allowed: false, gate };
  }

  const now = nowIso();
  const lock: ApplicationSubmissionLock = {
    id: id("sub_lock"),
    nurse_id: input.nurseId,
    employer_id: gate.employerId,
    ...(gate.programId ? { program_id: gate.programId } : {}),
    ...(gate.jobRequisitionId ? { job_requisition_id: gate.jobRequisitionId } : {}),
    channel,
    status: "active",
    locked_at: now,
  };
  const acquired = await store.acquireSubmissionLock(lock);
  if (!acquired.acquired) {
    const duplicateGate: ApplicationGateResult = {
      ...gate,
      ok: false,
      status: "duplicate_submission",
      allowedAction: "express_interest",
      failureCodes: ["duplicate_submission_lock"],
      reasons: ["An active submission lock already exists for this candidate, employer, and channel."],
      duplicateLockId: acquired.existing.id,
    };
    await audit(actor, "application_gate.submission_blocked", "nurse", input.nurseId, {
      status: duplicateGate.status,
      failureCodes: duplicateGate.failureCodes,
      duplicateLockId: acquired.existing.id,
      employerId: gate.employerId,
      programId: gate.programId,
      jobRequisitionId: gate.jobRequisitionId,
      channel,
    });
    return { allowed: false, gate: duplicateGate };
  }

  await recordEvent(store, input.nurseId, {
    type: "ats.packet_submitted",
    source: "core_application_gate",
    at: now,
    data: {
      employerId: gate.employerId,
      jobReqId: gate.jobRequisitionId,
      channel,
      submissionLockId: acquired.lock.id,
    },
  });
  await audit(actor, "application_gate.submission_allowed", "nurse", input.nurseId, {
    employerId: gate.employerId,
    programId: gate.programId,
    jobRequisitionId: gate.jobRequisitionId,
    channel,
    submissionLockId: acquired.lock.id,
  });
  return { allowed: true, gate, lock: acquired.lock };
}

export async function registerEmployerInterest(
  store: Store,
  audit: Audit,
  args: { nurseId: string; jobId?: string; employerId?: string; employer?: string; campaign?: string; actor?: string },
): Promise<{ ok: true; subjectToMessage: string }> {
  await recordEvent(store, args.nurseId, {
    type: "demand.interest_registered",
    source: "core_application_gate",
    data: {
      jobId: args.jobId,
      employerId: args.employerId,
      employer: args.employer,
      campaign: args.campaign,
    },
  });
  await audit(args.actor ?? "system", "application_gate.interest_registered", "nurse", args.nurseId, {
    jobId: args.jobId,
    employerId: args.employerId,
    campaign: args.campaign,
    note: "Interest only; no employer packet, ATS/VMS submission, or formal application released.",
  });
  return { ok: true, subjectToMessage: SUBJECT_TO_MESSAGE };
}
