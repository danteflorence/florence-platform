// Purpose-based access control (ABAC) — the FINE gate that sits behind the COARSE
// RBAC gate (roleScopes / requireScope). RBAC answers "may this token touch the
// passport surface at all?"; this module answers "for THIS role, org, candidate
// relationship, consent state, data class, purpose, and time — is the disclosure
// allowed, and up to which class?".
//
// Purpose is conveyed as a REQUEST PARAM (?purpose=…), validated here against the
// role's allowed purposes — deliberately NOT a token claim, so the existing claim
// contract (crypto.ts CoreClaims) is unchanged and tokens never need re-minting
// per access. Pure + dependency-free. See docs/security/access-control-matrix.md.

import type { DataClass } from "./classification.ts";
import { DATA_CLASS_RANK } from "./classification.ts";
import type { Role } from "./roles.ts";

/** Purposes each role may assert. "*" = any purpose (trusted internal callers). */
export const ROLE_PURPOSES: Record<Role, string[]> = {
  super_admin: ["*"],
  ops: ["*"],
  qa: ["*"],
  rep: ["*"],
  // Internal service (M2M app token) acts as a redaction proxy on behalf of a
  // downstream surface; the requested audience + consent are the real gate.
  service: ["*"],
  instructor: ["education"],
  candidate: ["self"],
  employer: ["employer_share"],
  university: ["education", "aggregate_reporting"],
  lender: ["underwriting"],
};

/** The maximum data class each role may EVER see, before consent narrows it further. */
export const ROLE_MAX_CLASS: Record<Role, DataClass> = {
  super_admin: "regulated_partner",
  ops: "regulated_partner",
  qa: "candidate_personal",
  rep: "internal_business",
  service: "regulated_partner",
  instructor: "candidate_personal",
  candidate: "regulated_partner", // own record
  employer: "candidate_personal", // licensed-RN packet; visa/financing hard-denied
  university: "candidate_personal",
  lender: "restricted_pathway_financial", // financing needs the pathway/financial tier
};

export function isPurposeAllowed(role: Role, purpose: string): boolean {
  const allowed = ROLE_PURPOSES[role] ?? [];
  return allowed.includes("*") || allowed.includes(purpose);
}

export type Relationship = "self" | "org_matched" | "none";

export interface PolicyRequest {
  role: Role;
  orgId?: string;
  cand?: string;
  subjectNurseId: string;
  /** How the caller relates to the subject (self / org-matched partner / none). */
  relationship: Relationship;
  /** Highest data class being requested. */
  classification: DataClass;
  purpose: string;
  /** Whether a live consent exists for (purpose, recipient). */
  consentOk: boolean;
  nowSec: number;
}

export interface PolicyDecision {
  allow: boolean;
  reason: string;
  /** Even when allowed, disclosure is capped at this class. */
  maxClass: DataClass;
}

const STAFF: readonly Role[] = ["super_admin", "ops", "qa", "rep", "instructor", "service"];
/** Partner roles whose access to candidate-personal+ data is consent-gated. */
const CONSENT_GATED: readonly Role[] = ["employer", "university", "lender"];

/**
 * Evaluate an access request. Returns whether it is allowed and the class ceiling
 * to apply. Fail-closed: anything not explicitly permitted is denied.
 */
export function evaluatePolicy(req: PolicyRequest): PolicyDecision {
  const maxClass = ROLE_MAX_CLASS[req.role];

  // 1. Purpose must be one the role may assert.
  if (!isPurposeAllowed(req.role, req.purpose)) {
    return { allow: false, reason: `purpose '${req.purpose}' not permitted for role '${req.role}'`, maxClass };
  }

  // 2. Candidate may only read its own record.
  if (req.role === "candidate") {
    if (req.relationship === "self") return { allow: true, reason: "self-access", maxClass };
    return { allow: false, reason: "candidate may only access own record", maxClass };
  }

  // 3. Internal staff/service: allowed up to their class ceiling, no consent needed
  //    (their reads are still audited, and service acts only as a redaction proxy).
  if (STAFF.includes(req.role)) {
    if (DATA_CLASS_RANK[req.classification] > DATA_CLASS_RANK[maxClass]) {
      return { allow: false, reason: `class '${req.classification}' exceeds ceiling for role '${req.role}'`, maxClass };
    }
    return { allow: true, reason: "staff/service access within ceiling", maxClass };
  }

  // 4. Consent-gated partners (employer/university/lender).
  if (CONSENT_GATED.includes(req.role)) {
    if (req.relationship === "none") {
      return { allow: false, reason: `no relationship between ${req.role} and subject`, maxClass };
    }
    // Disclosure of candidate-personal+ data requires a live consent.
    const needsConsent = DATA_CLASS_RANK[req.classification] >= DATA_CLASS_RANK["candidate_personal"];
    if (needsConsent && !req.consentOk) {
      return { allow: false, reason: `consent required for purpose '${req.purpose}'`, maxClass };
    }
    if (DATA_CLASS_RANK[req.classification] > DATA_CLASS_RANK[maxClass]) {
      return { allow: false, reason: `class '${req.classification}' exceeds ceiling for role '${req.role}'`, maxClass };
    }
    return { allow: true, reason: "consent satisfied within ceiling", maxClass };
  }

  return { allow: false, reason: "no policy matched (default deny)", maxClass };
}
