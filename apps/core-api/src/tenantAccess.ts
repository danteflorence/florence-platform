import type { Audit } from "./audit.ts";
import type { DataClass } from "./classification.ts";
import { DATA_CLASS_RANK } from "./classification.ts";
import type { CoreClaims } from "./crypto.ts";
import type { GwCtx } from "./gateway/router.ts";
import { isRole, STAFF_ROLES, type Role } from "./roles.ts";

export type PartnerOrgKind =
  | "amn"
  | "employer"
  | "lender"
  | "university"
  | "ats_vms"
  | "internal";

export interface PartnerOrg {
  id: string;
  name: string;
  kind: PartnerOrgKind;
  status: "active" | "paused" | "disabled";
  parentOrgId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantScope {
  tenantId: string;
  partnerOrgId: string;
  role?: Role;
  partnerOrgKind?: PartnerOrgKind;
  allowedProgramIds?: readonly string[];
  allowedEmployerOrgIds?: readonly string[];
  allowedLenderOrgIds?: readonly string[];
  allowedUniversityOrgIds?: readonly string[];
  allowedAtsVmsOrgIds?: readonly string[];
  allowedPurposes?: readonly string[];
  expiresAt?: string;
}

export interface ProgramScope {
  id?: string;
  programId?: string;
  tenantId?: string;
  ownerOrgId: string;
  kind?: "employer_direct" | "amn_channel" | "university_channel" | "lender_channel" | "ats_vms";
  employerOrgId?: string;
  authorizedOrgIds?: readonly string[];
  lenderOrgIds?: readonly string[];
  universityOrgIds?: readonly string[];
  atsVmsOrgIds?: readonly string[];
  status?: "active" | "paused" | "closed";
}

export type AccessResourceType =
  | "program"
  | "employer_packet"
  | "lender_packet"
  | "university_cohort"
  | "university_named_student"
  | "ats_requisition"
  | "ats_submission"
  | "vms_submission"
  | "production_ledger"
  | "restricted_document";

export type AccessAction = "read" | "write" | "share" | "export" | "download" | "submit";

export interface AccessActor {
  id: string;
  role: Role;
  roles?: readonly Role[];
  orgId?: string;
  partnerOrgKind?: PartnerOrgKind;
}

export interface AccessResource {
  type: AccessResourceType;
  id?: string;
  ownerOrgId?: string;
  programId?: string;
  dataClass?: DataClass;
  consentOk?: boolean;
  packetApproved?: boolean;
  licensedRn?: boolean;
  aggregate?: boolean;
  anonymized?: boolean;
  allowedPartnerOrgIds?: readonly string[];
  includesEmployerPacketFields?: boolean;
  workflowGateOk?: boolean;
  allowedInternalRoles?: readonly Role[];
}

export interface AccessPolicyRequest {
  actor: AccessActor;
  action: AccessAction;
  purpose: string;
  resource: AccessResource;
  tenantScope?: TenantScope;
  programScope?: ProgramScope;
  now?: string;
}

export interface AccessPolicyDecision {
  allow: boolean;
  reason: string;
  code: "allowed" | "missing_tenant" | "wrong_tenant" | "missing_consent" | "not_approved" | "wrong_role" | "forbidden";
  auditRequired: boolean;
}

export type AccessPolicyBuilder = (ctx: GwCtx) => AccessPolicyRequest | Promise<AccessPolicyRequest>;

const EXTERNAL_ROLES: readonly Role[] = ["employer", "lender", "university"];

function has(items: readonly string[] | undefined, value: string | undefined): boolean {
  return Boolean(value && items?.includes(value));
}

function roleFromClaims(claims?: CoreClaims): Role {
  const r = String(claims?.role ?? "");
  return isRole(r) ? r : "candidate";
}

function kindFor(actor: AccessActor): PartnerOrgKind | undefined {
  if (actor.partnerOrgKind) return actor.partnerOrgKind;
  if (actor.role === "employer") return "employer";
  if (actor.role === "lender") return "lender";
  if (actor.role === "university") return "university";
  if (actor.role === "service" && actor.orgId) return "ats_vms";
  return undefined;
}

function isStaff(role: Role, roles?: readonly Role[]): boolean {
  return (STAFF_ROLES as readonly Role[]).includes(role) || Boolean(roles?.some((r) => (STAFF_ROLES as readonly Role[]).includes(r)));
}

export function actorFromClaims(claims: CoreClaims | undefined, fallbackId = "service"): AccessActor {
  const roles = Array.isArray(claims?.roles)
    ? claims.roles.filter((r): r is Role => isRole(r))
    : undefined;
  const role = roleFromClaims(claims);
  return {
    id: String(claims?.email ?? claims?.sub ?? fallbackId),
    role,
    ...(roles && roles.length ? { roles } : {}),
    ...(claims?.org_id ? { orgId: claims.org_id } : {}),
  };
}

export function denyByDefault(reason = "no matching access policy"): AccessPolicyDecision {
  return { allow: false, reason, code: "forbidden", auditRequired: true };
}

function allow(reason: string): AccessPolicyDecision {
  return { allow: true, reason, code: "allowed", auditRequired: true };
}

function deny(code: AccessPolicyDecision["code"], reason: string): AccessPolicyDecision {
  return { allow: false, reason, code, auditRequired: true };
}

function ownerMatches(req: AccessPolicyRequest, orgId: string): boolean {
  const owner = req.resource.ownerOrgId;
  const programAuthorized = programIncludesOrg(req.programScope, orgId, kindFor(req.actor));
  if (owner && owner !== orgId && !has(req.resource.allowedPartnerOrgIds, orgId) && !programAuthorized) return false;
  if (req.tenantScope) {
    if (req.tenantScope.partnerOrgId !== orgId) return false;
    if (req.resource.programId && req.tenantScope.allowedProgramIds && !has(req.tenantScope.allowedProgramIds, req.resource.programId)) return false;
    if (owner) {
      const scoped =
        has(req.tenantScope.allowedEmployerOrgIds, owner) ||
        has(req.tenantScope.allowedLenderOrgIds, owner) ||
        has(req.tenantScope.allowedUniversityOrgIds, owner) ||
        has(req.tenantScope.allowedAtsVmsOrgIds, owner);
      const noOwnerLists =
        !req.tenantScope.allowedEmployerOrgIds &&
        !req.tenantScope.allowedLenderOrgIds &&
        !req.tenantScope.allowedUniversityOrgIds &&
        !req.tenantScope.allowedAtsVmsOrgIds;
      if (!noOwnerLists && owner !== orgId && !scoped) return false;
    }
    if (req.tenantScope.allowedPurposes && !has(req.tenantScope.allowedPurposes, req.purpose)) return false;
  }
  return true;
}

function programIncludesOrg(program: ProgramScope | undefined, orgId: string, kind: PartnerOrgKind | undefined): boolean {
  if (!program) return false;
  if (kind === "amn") return program.ownerOrgId === orgId;
  if (program.ownerOrgId === orgId || program.employerOrgId === orgId) return true;
  if (has(program.authorizedOrgIds, orgId)) return true;
  if (kind === "lender") return has(program.lenderOrgIds, orgId);
  if (kind === "university") return has(program.universityOrgIds, orgId);
  if (kind === "ats_vms") return has(program.atsVmsOrgIds, orgId);
  return false;
}

function classAtMost(actual: DataClass | undefined, ceiling: DataClass): boolean {
  if (!actual) return true;
  return DATA_CLASS_RANK[actual] <= DATA_CLASS_RANK[ceiling];
}

function externalActorRequiresTenant(actor: AccessActor): boolean {
  return (EXTERNAL_ROLES as readonly Role[]).includes(actor.role) || (actor.role === "service" && Boolean(actor.orgId));
}

export function authorizeTenantAccess(req: AccessPolicyRequest): AccessPolicyDecision {
  const actorOrgId = req.actor.orgId;
  const role = req.actor.role;
  const kind = kindFor(req.actor);

  if (role === "super_admin" || req.actor.roles?.includes("super_admin")) {
    return allow("super_admin explicit bypass");
  }

  if (isStaff(role, req.actor.roles)) {
    if (!req.purpose) return deny("forbidden", "internal access requires a purpose");
    if (req.resource.allowedInternalRoles && !req.resource.allowedInternalRoles.includes(role)) {
      return deny("wrong_role", "internal role is not allowed for this resource");
    }
    if (!req.resource.allowedInternalRoles) {
      return deny("wrong_role", "internal access requires an explicit role allowlist");
    }
    return allow("internal role and purpose allowed");
  }

  if (externalActorRequiresTenant(req.actor) && !actorOrgId) {
    return deny("missing_tenant", "external partner access requires tenant context");
  }
  if (!actorOrgId) return denyByDefault("missing tenant context");
  if (!ownerMatches(req, actorOrgId)) return deny("wrong_tenant", "resource is outside the caller tenant scope");

  switch (req.resource.type) {
    case "program":
      if (!programIncludesOrg(req.programScope, actorOrgId, kind)) return deny("wrong_tenant", "program is outside the caller tenant scope");
      return allow("program is in tenant scope");

    case "employer_packet":
      if (role !== "employer" && kind !== "amn" && kind !== "ats_vms") return deny("wrong_role", "only employer or authorized ATS/VMS partners may read employer packets");
      if (!req.resource.consentOk) return deny("missing_consent", "employer packet requires purpose-specific consent");
      if (!req.resource.packetApproved) return deny("not_approved", "employer packet requires packet QA approval");
      if (!req.resource.licensedRn) return deny("not_approved", "employer packet requires licensed RN status");
      if (!classAtMost(req.resource.dataClass, "RESTRICTED_EMPLOYER_PACKET")) return deny("forbidden", "employer packet data class exceeds employer-safe ceiling");
      return allow("approved employer-safe packet in tenant scope");

    case "lender_packet":
      if (role !== "lender" && kind !== "lender") return deny("wrong_role", "only the consented lender may read lender packets");
      if (!req.resource.consentOk) return deny("missing_consent", "lender packet requires underwriting consent");
      if (req.resource.includesEmployerPacketFields) return deny("forbidden", "lender packet cannot include employer packet fields");
      if (!classAtMost(req.resource.dataClass, "PARTNER_RESTRICTED")) return deny("forbidden", "lender packet data class exceeds partner ceiling");
      return allow("consented lender packet in tenant scope");

    case "university_cohort":
      if (role !== "university" && kind !== "university") return deny("wrong_role", "only university tenant may read university cohorts");
      if (!req.resource.aggregate || !req.resource.anonymized) return deny("forbidden", "university cohort view must be aggregate and anonymized");
      return allow("aggregate anonymized university cohort");

    case "university_named_student":
      if (role !== "university" && kind !== "university") return deny("wrong_role", "only university tenant may read named student records");
      if (!req.resource.consentOk) return deny("missing_consent", "named student university view requires explicit consent");
      if (!classAtMost(req.resource.dataClass, "RESTRICTED_EDUCATION")) return deny("forbidden", "named student view exceeds education-safe ceiling");
      return allow("consented named student view in tenant scope");

    case "ats_requisition":
    case "ats_submission":
    case "vms_submission":
      if (kind !== "ats_vms" && kind !== "amn" && role !== "employer") return deny("wrong_role", "ATS/VMS access requires an authorized partner or employer tenant");
      if (req.programScope && !programIncludesOrg(req.programScope, actorOrgId, kind)) return deny("wrong_tenant", "program is outside ATS/VMS tenant scope");
      if (req.resource.workflowGateOk === false) return deny("not_approved", "ATS/VMS workflow gate is not satisfied");
      return allow("ATS/VMS resource is in tenant scope");

    case "production_ledger":
    case "restricted_document":
      if (!req.resource.consentOk) return deny("missing_consent", "restricted resource requires consent or approved workflow gate");
      if (req.resource.workflowGateOk === false) return deny("not_approved", "workflow gate is not satisfied");
      return allow("restricted resource is in tenant scope");
  }

  return denyByDefault();
}

export async function auditAccessDecision(audit: Audit, req: AccessPolicyRequest, decision: AccessPolicyDecision): Promise<void> {
  if (!decision.auditRequired) return;
  await audit(req.actor.id, decision.allow ? "access_policy.allow" : "access_policy.deny", req.resource.type, req.resource.id, {
    role: req.actor.role,
    orgId: req.actor.orgId,
    purpose: req.purpose,
    action: req.action,
    programId: req.resource.programId ?? req.programScope?.id,
    reason: decision.reason,
    code: decision.code,
  });
}

export async function authorizeTenantAccessWithAudit(audit: Audit, req: AccessPolicyRequest): Promise<AccessPolicyDecision> {
  const decision = authorizeTenantAccess(req);
  await auditAccessDecision(audit, req, decision);
  return decision;
}

export function tenantScopeFromClaims(
  claims: CoreClaims | undefined,
  opts: { role?: Role; partnerKind?: PartnerOrgKind } = {},
): TenantScope | undefined {
  if (!claims?.org_id) return undefined;
  return {
    tenantId: claims.tenant_id ?? claims.org_id,
    partnerOrgId: claims.org_id,
    ...(opts.role ? { role: opts.role } : {}),
    ...(opts.partnerKind ? { partnerOrgKind: opts.partnerKind } : {}),
  };
}

export function accessDeniedBody(decision: AccessPolicyDecision): Record<string, unknown> {
  return { error: "tenant_scope_denied", reason: decision.reason, code: decision.code };
}

type LegacyResource =
  | "ledger_events"
  | "lender_packet"
  | "credit_decision"
  | "university_aggregate";

interface LegacyAccessInput {
  scope?: TenantScope;
  resource: LegacyResource;
  purpose: string;
  resourceId?: string;
  resourceOrgId?: string;
  program?: ProgramScope;
  consentOk?: boolean;
}

function legacyResourceType(resource: LegacyResource): AccessResourceType {
  if (resource === "ledger_events") return "production_ledger";
  if (resource === "university_aggregate") return "university_cohort";
  return "lender_packet";
}

export async function accessPolicyMiddleware(
  audit: Audit,
  actorId: string,
  input: LegacyAccessInput,
): Promise<AccessPolicyDecision> {
  const scope = input.scope;
  const resourceType = legacyResourceType(input.resource);
  const req: AccessPolicyRequest = {
    actor: {
      id: actorId,
      role: scope?.role ?? (scope?.partnerOrgKind === "lender" ? "lender" : scope?.partnerOrgKind === "university" ? "university" : "service"),
      ...(scope?.partnerOrgId ? { orgId: scope.partnerOrgId } : {}),
      ...(scope?.partnerOrgKind ? { partnerOrgKind: scope.partnerOrgKind } : {}),
    },
    action: "read",
    purpose: input.purpose,
    resource: {
      type: resourceType,
      id: input.resourceId,
      ownerOrgId: input.resourceOrgId,
      programId: input.program?.id ?? input.program?.programId,
      consentOk: input.consentOk ?? input.resource === "credit_decision",
      aggregate: input.resource === "university_aggregate",
      anonymized: input.resource === "university_aggregate",
    },
    ...(scope ? { tenantScope: scope } : {}),
    ...(input.program ? { programScope: input.program } : {}),
  };
  return authorizeTenantAccessWithAudit(audit, req);
}
