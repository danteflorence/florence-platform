// The ONE canonical Passport read path: resolve a nurse → fold → consent gate →
// purpose-based ABAC policy → audience redaction → tamper-evident read audit.
// Both the legacy exact route (/v1/nurse/passport in routes.ts) and the new
// Platform-API gateway route (/v1/nurses/:id/passport) call this, so there is a
// single redactor + a single audit point (the "Core is the canonical redactor"
// invariant of the API-first re-platform). Pure of HTTP — returns {status, body}.

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
    const ok: Audience[] = ["self", "internal_ops", "instructor", "employer", "lender", "university", "investor"];
    return requested && (ok as string[]).includes(requested) ? (requested as Audience) : "internal_ops";
  }
  return PINNED_AUDIENCE[role] ?? "investor";
}

/** The canonical access purpose for an audience (used for consent + policy). */
export function purposeForAudience(a: Audience): string {
  switch (a) {
    case "employer": return "employer_share";
    case "lender": return "underwriting";
    case "university": return "education";
    case "instructor": return "education";
    case "self": return "self";
    case "investor": return "aggregate_reporting";
    case "internal_ops": return "internal";
  }
}

/** The highest data class an audience's projection can return (for the policy ceiling check). */
export function classForAudience(a: Audience): DataClass {
  switch (a) {
    case "self":
    case "internal_ops": return "regulated_partner";
    case "lender": return "restricted_pathway_financial";
    case "employer":
    case "university":
    case "instructor": return "candidate_personal";
    case "investor": return "internal_business";
  }
}

/** Map an audience to the consent purpose required to disclose it (or null = no consent gate). */
export function consentPurposeFor(a: Audience): string | null {
  switch (a) {
    case "employer": return "employer_share";
    case "lender": return "underwriting";
    case "university": return "education";
    default: return null; // self/internal_ops/instructor/investor are not consent-gated here
  }
}

/** The required scope for a passport read, given the caller's role + resolved audience. */
export function scopeForPassportRead(role: Role, audience: Audience): string {
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
}
export interface PassportReadResult {
  status: number;
  body: unknown;
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

  const view = passportView(passport, { audience, ...(inp.orgId ? { orgId: inp.orgId } : {}), purpose, consentOk });
  // Read logging: every sensitive disclosure is recorded (who/audience/purpose/classes).
  await audit(inp.actor, "passport.read", "nurse", nurse.id, {
    role: inp.role,
    audience,
    purpose,
    consentOk,
    classes: view.classesReturned,
    withheld: view.withheld.length,
  });
  return { status: 200, body: view.passport };
}
