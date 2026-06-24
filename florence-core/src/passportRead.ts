// The ONE canonical Passport read path: resolve a nurse, fold, consent gate,
// purpose-based ABAC policy, audience redaction, and tamper-evident read audit.
// Both the legacy exact route (/v1/nurse/passport in routes.ts) and the new
// Platform-API gateway route (/v1/nurses/:id/passport) call this, so there is a
// single redactor + a single audit point (the "Core is the canonical redactor"
// invariant of the API-first re-platform). Pure of HTTP, returns {status, body}.

import type { Store } from "./store.ts";
import type { Audit } from "./audit.ts";
import { foldPassport } from "./passport.ts";
import { lookupNurse } from "./nurses.ts";
import { passportView, type Audience } from "./passportView.ts";
import { evaluatePolicy, type Relationship } from "./policy.ts";
import { consentAllows } from "./consent.ts";
import type { DataClass } from "./classification.ts";
import type { Role } from "./roles.ts";
import { nowSec } from "./util.ts";
import { authorizeTenantAccessWithAudit, type AccessResourceType, type PartnerOrgKind, type ProgramScope } from "./tenantAccess.ts";
import { checkApplicationGate, type ApplicationGateInput } from "./applicationGate.ts";

// ── Passport audience derivation ──────────────────────────────────────────────
// Roles that may request ANY audience (trusted internal callers / redaction
// proxies). Partner roles are PINNED to their own audience and cannot escalate.
export const FULL_AUDIENCE_ROLES: readonly Role[] = ["super_admin", "ops", "qa", "service"];
const PINNED_AUDIENCE: Partial<Record<Role, Audience>> = {
  instructor: "instructor",
  rep: "instructor",
  employer: "employer",
  university: "university",
  lender: "lender",
  candidate: "self",
};

export function audienceForClaims(role: Role, requested?: string): Audience {
  if (FULL_AUDIENCE_ROLES.includes(role)) {
    const ok: Audience[] = ["candidate", "self", "internal_ops", "instructor", "employer", "lender", "university", "amn_vms_partner", "investor", "investor_board_aggregate"];
    return requested && (ok as string[]).includes(requested) ? (requested as Audience) : "internal_ops";
  }
  if (role === "employer" && requested === "amn_vms_partner") return "amn_vms_partner";
  return PINNED_AUDIENCE[role] ?? "investor";
}

/** The canonical access purpose for an audience (used for consent + policy). */
export function purposeForAudience(a: Audience): string {
  switch (a) {
    case "candidate":
    case "self": return "self";
    case "employer": return "employer_share";
    case "amn_vms_partner": return "employer_share";
    case "lender": return "underwriting";
    case "university": return "education";
    case "instructor": return "education";
    case "investor": return "aggregate_reporting";
    case "investor_board_aggregate": return "aggregate_reporting";
    case "internal_ops": return "internal";
  }
}

/** The highest data class an audience's projection can return (for the policy ceiling check). */
export function classForAudience(a: Audience): DataClass {
  switch (a) {
    case "self":
    case "candidate": return "PARTNER_RESTRICTED";
    case "internal_ops": return "SECRET";
    case "lender": return "RESTRICTED_FINANCING";
    case "employer":
    case "amn_vms_partner":
      return "RESTRICTED_EMPLOYER_PACKET";
    case "university": return "INTERNAL";
    case "instructor": return "RESTRICTED_EDUCATION";
    case "investor":
    case "investor_board_aggregate": return "INTERNAL";
  }
}

/** Map an audience to the consent purpose required to disclose it (or null = no consent gate). */
export function consentPurposeFor(a: Audience): string | null {
  switch (a) {
    case "employer": return "employer_share";
    case "amn_vms_partner": return "employer_share";
    case "lender": return "underwriting";
    case "university": return null;
    default: return null; // self/internal_ops/instructor/investor are not consent-gated here
  }
}

/** The required scope for a passport read, given the caller's role + resolved audience. */
export function scopeForPassportRead(role: Role, audience: Audience): string {
  if (!FULL_AUDIENCE_ROLES.includes(role) && audience === "candidate") return "passport:read:self";
  if (!FULL_AUDIENCE_ROLES.includes(role) && audience === "amn_vms_partner") return "passport:read:employer";
  return FULL_AUDIENCE_ROLES.includes(role) ? "passport:read" : `passport:read:${audience}`;
}

export interface PassportReadInput {
  selector: { nurseId?: string; email?: string; ref?: string };
  role: Role;
  scopes: string[];
  orgId?: string;
  cand?: string;
  actor: string;
  requestedAudience?: string;
  purpose?: string;
  applicationGate?: Partial<Omit<ApplicationGateInput, "nurseId" | "employerId" | "actor">>;
}
export interface PassportReadResult {
  status: number;
  body: unknown;
}

function partnerKindForAudience(audience: Audience): PartnerOrgKind | undefined {
  switch (audience) {
    case "amn_vms_partner": return "ats_vms";
    case "employer": return "employer";
    case "lender": return "lender";
    case "university": return "university";
    default: return undefined;
  }
}

function resourceForAudience(audience: Audience): AccessResourceType | undefined {
  switch (audience) {
    case "employer":
    case "amn_vms_partner": return "employer_packet";
    case "lender": return "lender_packet";
    case "university": return "university_cohort";
    default: return undefined;
  }
}

function programForPlacement(passport: ReturnType<typeof foldPassport>): ProgramScope | undefined {
  const ownerOrgId = passport.placement.employerId;
  if (!ownerOrgId) return undefined;
  const programId = passport.placement.jobReqId ? `${ownerOrgId}:${passport.placement.jobReqId}` : ownerOrgId;
  return { id: programId, tenantId: ownerOrgId, ownerOrgId, kind: "employer_direct", employerOrgId: ownerOrgId, status: "active" };
}

function hasLicensedRnStatus(status: string | undefined): boolean {
  return ["active", "approved", "issued"].includes(String(status ?? "").toLowerCase());
}

/** Resolve, consent-gate, policy-check, redact, and audit a Passport read. The single
 *  canonical implementation behind every Passport disclosure in the platform. */
export async function readPassportView(store: Store, audit: Audit, inp: PassportReadInput): Promise<PassportReadResult> {
  const audience = audienceForClaims(inp.role, inp.requestedAudience);
  const needScope = scopeForPassportRead(inp.role, audience);
  if (!inp.scopes.includes(needScope)) return { status: 403, body: { error: "insufficient_scope", need: needScope } };

  const nurse = await lookupNurse(store, inp.selector);
  if (!nurse) return { status: 404, body: { error: "nurse_not_found" } };

  const [refs, events] = await Promise.all([store.refsByNurse(nurse.id), store.eventsByNurse(nurse.id)]);
  const passport = foldPassport(nurse, refs, events);

  // Consent gate (employer/lender/university) + purpose-based policy (ABAC).
  const purpose = inp.purpose ?? purposeForAudience(audience);
  const consentPurpose = consentPurposeFor(audience);
  let consentOk = consentPurpose === null;
  if (consentPurpose !== null) {
    const consents = await store.consentsByNurse(nurse.id);
    consentOk = consentAllows(consents, consentPurpose, inp.orgId).ok;
  }

  const tenantResource = resourceForAudience(audience);
  if (tenantResource) {
    const program = programForPlacement(passport);
    const resourceOwnerOrgId = tenantResource === "employer_packet" ? program?.ownerOrgId ?? inp.orgId : inp.orgId;
    if (tenantResource === "employer_packet") {
      const gate = await checkApplicationGate(store, audit, {
        nurseId: nurse.id,
        ...(inp.orgId ? { employerId: inp.orgId } : {}),
        action: inp.applicationGate?.action ?? "release_employer_profile",
        channel: inp.applicationGate?.channel ?? (audience === "amn_vms_partner" ? "amn" : "direct"),
        ...(inp.applicationGate?.programId ? { programId: inp.applicationGate.programId } : program?.id ? { programId: program.id } : {}),
        ...(inp.applicationGate?.jobRequisitionId ? { jobRequisitionId: inp.applicationGate.jobRequisitionId } : program?.id ? {} : passport.placement.jobReqId ? { jobRequisitionId: passport.placement.jobReqId } : {}),
        ...(inp.applicationGate?.jobStatus ? { jobStatus: inp.applicationGate.jobStatus } : {}),
        ...(inp.applicationGate?.requiredLicenseState ? { requiredLicenseState: inp.applicationGate.requiredLicenseState } : {}),
        actor: inp.actor,
      });
      if (!gate.ok) {
        await audit(inp.actor, "passport.read_denied", "nurse", nurse.id, { role: inp.role, audience, purpose, reason: "application_gate_not_cleared", failureCodes: gate.failureCodes });
        return { status: 403, body: { error: "application_gate_not_cleared", status: gate.status, failureCodes: gate.failureCodes, reasons: gate.reasons, subjectToMessage: gate.subjectToMessage } };
      }
    }
    const tenantDecision = await authorizeTenantAccessWithAudit(audit, {
      actor: {
        id: inp.actor,
        role: inp.role,
        ...(inp.orgId ? { orgId: inp.orgId } : {}),
        ...(partnerKindForAudience(audience) ? { partnerOrgKind: partnerKindForAudience(audience) } : {}),
      },
      action: "read",
      purpose,
      resource: {
        type: tenantResource,
        id: nurse.id,
        ownerOrgId: resourceOwnerOrgId,
        ...(program ? { programId: program.id } : {}),
        dataClass: classForAudience(audience),
        consentOk,
        packetApproved: consentOk,
        licensedRn: hasLicensedRnStatus(passport.licensure.status),
        aggregate: audience === "university",
        anonymized: audience === "university",
      },
      ...(program ? { programScope: program } : {}),
    });
    if (!tenantDecision.allow) {
      await audit(inp.actor, "passport.read_denied", "nurse", nurse.id, { role: inp.role, audience, purpose, reason: tenantDecision.reason });
      return { status: 403, body: { error: "forbidden", reason: tenantDecision.reason } };
    }
  }

  const relationship: Relationship =
    inp.role === "candidate"
      ? "self"
      : inp.role === "employer" || inp.role === "university" || inp.role === "lender"
        ? (inp.orgId ? "org_matched" : "none")
        : "self";
  const decision = evaluatePolicy({
    role: inp.role,
    ...(inp.orgId ? { orgId: inp.orgId } : {}),
    ...(inp.cand ? { cand: inp.cand } : {}),
    subjectNurseId: nurse.id,
    relationship,
    classification: classForAudience(audience),
    purpose,
    consentOk,
    nowSec: nowSec(),
  });
  if (!decision.allow) {
    await audit(inp.actor, "passport.read_denied", "nurse", nurse.id, { role: inp.role, audience, purpose, reason: decision.reason });
    return { status: 403, body: { error: "forbidden", reason: decision.reason } };
  }

  const view = passportView(passport, { audience, ...(inp.orgId ? { orgId: inp.orgId } : {}), purpose, consentOk, internalRole: FULL_AUDIENCE_ROLES.includes(inp.role) });
  // Read logging: every sensitive disclosure is recorded (who/audience/purpose/classes).
  await audit(inp.actor, "passport.read", "nurse", nurse.id, {
    role: inp.role,
    audience,
    purpose,
    consentOk,
    classes: view.classesReturned,
    withheld: view.withheld.length,
  });
  if (audience === "employer" || audience === "amn_vms_partner") {
    await audit(inp.actor, "employer_packet.view", "nurse", nurse.id, {
      role: inp.role,
      audience,
      purpose,
      orgId: inp.orgId,
    });
  }
  if (audience === "lender") {
    await audit(inp.actor, "lender_packet.view", "nurse", nurse.id, {
      role: inp.role,
      audience,
      purpose,
      orgId: inp.orgId,
    });
  }
  return { status: 200, body: view.passport };
}
