// The unified FlorenceRN role hierarchy and the role→scope derivation.
//
// Generalizes labor-economics-agent/rbac.py (rep/ops/admin + bootstrap) and
// florence-ats-connect's ops/employer. Core stamps `role` + `roles[]` on every
// token AND derives a `scope` string from the highest role, so Academy's
// existing scope checks (florence-academy/api/src/types.ts) keep working with
// zero changes. Each app maps the Core role onto its own local authz.

export type Role =
  | "super_admin"
  | "ops"
  | "qa"
  | "instructor"
  | "rep"
  | "candidate"
  | "employer"
  | "university"
  | "lender"
  | "service";

export const ALL_ROLES: readonly Role[] = [
  "super_admin",
  "ops",
  "qa",
  "instructor",
  "rep",
  "candidate",
  "employer",
  "university",
  "lender",
  "service",
];

/** Higher = more privileged. Used to pick the scalar `role` claim from a set. */
export const ROLE_RANK: Record<Role, number> = {
  super_admin: 100,
  ops: 80,
  qa: 60,
  instructor: 55,
  rep: 50,
  university: 32,
  employer: 31,
  lender: 30,
  candidate: 10,
  service: 0,
};

/** Roles that are internal Florence staff (granted via @florenceeducation.com). */
export const STAFF_ROLES: readonly Role[] = ["super_admin", "ops", "qa", "instructor", "rep"];

/** Roles that are external partners/end-users (never auto-granted from a domain). */
export const EXTERNAL_ROLES: readonly Role[] = ["candidate", "employer", "university", "lender"];

export function isRole(s: string): s is Role {
  return (ALL_ROLES as readonly string[]).includes(s);
}

export function highestRole(roles: Role[]): Role {
  if (roles.length === 0) return "candidate";
  return roles.reduce((best, r) => (ROLE_RANK[r] > ROLE_RANK[best] ? r : best), roles[0]!);
}

// ── Academy scope vocabulary (copied from florence-academy/api/src/types.ts) ──
// Core has no compile-time dependency on Academy; we copy the 24-scope universe
// so the derived `scope` claim is always valid Academy input.
const ACADEMY_ALL_SCOPES: readonly string[] = [
  "candidates:read", "candidates:write", "enrollment:read", "enrollment:write",
  "performance:read", "performance:write", "payments:read", "payments:write",
  "outcomes:read", "outcomes:write", "employer:read", "university:read",
  "schools:read", "schools:write", "pathway:write", "webhooks:manage",
  "clients:manage", "tokens:mint", "cohorts:read", "cohorts:write",
  "leads:read", "leads:write", "outreach:read", "outreach:write",
];

// Exactly Academy's CANDIDATE_SESSION_SCOPES (florence-academy/api/src/auth.ts).
const CANDIDATE_SCOPES: readonly string[] = [
  "candidates:read", "candidates:write", "enrollment:read", "enrollment:write",
  "performance:read", "performance:write", "payments:read", "cohorts:read",
];

/**
 * Scopes carried by a human session, derived from the highest role. M2M tokens
 * do NOT use this — their scopes come from the api_client's allowed_scopes.
 */
export function roleScopes(role: Role): string[] {
  switch (role) {
    case "super_admin":
    case "ops":
      return [...ACADEMY_ALL_SCOPES, "passport:read", "passport:write", "documents:read", "documents:write", "consent:read", "consent:write", "control-tower:read", "investor:read", "university:read", "ledger:read", "ledger:write", "pathway:read", "model:run", "model:read", "credit:read", "credit:decide", "lender:portfolio:read", "opportunities:read", "opportunities:interest:create", "applications:eligibility", "applications:submit", "packets:qa", "programs:read"];
    case "qa":
      return ["candidates:read", "performance:read", "enrollment:read", "cohorts:read", "outcomes:read", "passport:read"];
    case "instructor":
      return ["cohorts:read", "cohorts:write", "enrollment:read", "enrollment:write", "performance:read", "candidates:read"];
    case "candidate":
      // Candidates may read their OWN folded Passport (self audience) via Core.
      return [...CANDIDATE_SCOPES, "passport:read:self", "documents:read", "documents:write", "opportunities:interest:create", "applications:eligibility"];
    case "employer":
      // Partner roles get an audience-scoped passport read: the route maps the
      // scope suffix to the redacted view passportView() produces.
      return ["employer:read", "passport:read:employer", "documents:read", "applications:eligibility", "programs:read"];
    case "university":
      return ["university:read", "schools:read", "passport:read:university", "documents:read"];
    case "lender":
      return ["passport:read:lender", "documents:read", "credit:read", "lender:portfolio:read"];
    case "rep":
    case "service":
      return [];
  }
}
