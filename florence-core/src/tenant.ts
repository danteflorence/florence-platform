// Tenant isolation policy for partner-facing resources. This is the single
// deny-by-default helper used by gateway route middleware before a handler can
// read a program workspace or partner packet.

import type { Audit } from "./audit.ts";
import type { CoreClaims } from "./crypto.ts";
import type { PartnerOrgKind, ProgramScope, Store } from "./store.ts";

export type TenantResource = "program" | "employer_packet";
export type TenantAction = "program.read" | "packet.read";

export interface AccessPolicyRequest {
  resource: TenantResource;
  action: TenantAction;
  programId?: string;
  nurseId?: string;
  purpose: string;
}

export interface AccessPolicyDecision {
  allow: boolean;
  reason: string;
  status: number;
  orgId?: string;
  tenantId?: string;
  program?: ProgramScope;
}

export function denyByDefault(reason = "no explicit allow rule matched", status = 403): AccessPolicyDecision {
  return { allow: false, reason, status };
}

export function isSuperAdminClaims(claims?: CoreClaims): boolean {
  const roles = Array.isArray(claims?.roles) ? claims.roles : claims?.role ? [claims.role] : [];
  return roles.includes("super_admin");
}

function hasAction(program: ProgramScope, action: TenantAction): boolean {
  return program.authorized_actions.includes("*") || program.authorized_actions.includes(action);
}

function tenantMayUseProgram(programId: string, allowed: readonly string[]): boolean {
  return allowed.includes("*") || allowed.includes(programId);
}

function tenantMayUsePurpose(purpose: string, allowed: readonly string[]): boolean {
  return allowed.includes("*") || allowed.includes(purpose);
}

function partnerKindAllowedForPacket(kind: PartnerOrgKind): boolean {
  return kind === "amn" || kind === "employer" || kind === "ats_vms";
}

function programOwnerMatches(kind: PartnerOrgKind, orgId: string, program: ProgramScope): boolean {
  if (kind === "amn") return program.owner_org_id === orgId;
  if (kind === "employer") return program.owner_org_id === orgId || program.employer_org_id === orgId;
  if (kind === "ats_vms") return program.authorized_partner_org_ids.includes(orgId);
  return false;
}

export async function authorizeTenantAccess(
  store: Store,
  claims: CoreClaims | undefined,
  req: AccessPolicyRequest,
): Promise<AccessPolicyDecision> {
  if (isSuperAdminClaims(claims)) {
    const program = req.programId ? await store.getProgramScope(req.programId) : undefined;
    return { allow: true, reason: "super_admin audited bypass", status: 200, orgId: claims?.org_id, tenantId: claims?.tenant_id, program };
  }

  const orgId = claims?.org_id;
  if (!orgId) return denyByDefault("missing tenant context");

  const tenant = await store.getTenantScopeByOrgId(orgId);
  if (!tenant) return denyByDefault("tenant scope missing");

  const partner = await store.getPartnerOrg(tenant.partner_org_id);
  if (!partner || partner.status !== "active") return denyByDefault("partner org inactive or missing");
  if (tenant.partner_kind !== partner.kind) return denyByDefault("tenant scope kind mismatch");
  if (!tenantMayUsePurpose(req.purpose, tenant.allowed_purposes)) return denyByDefault("purpose not in tenant scope");

  if (!req.programId) return denyByDefault("program scope required");
  if (!tenantMayUseProgram(req.programId, tenant.allowed_program_ids)) return denyByDefault("program not in tenant scope");

  const program = await store.getProgramScope(req.programId);
  if (!program || program.status !== "active") return denyByDefault("program scope missing or inactive");
  if (!hasAction(program, req.action)) return denyByDefault("program action not authorized");
  if (!programOwnerMatches(partner.kind, orgId, program)) return denyByDefault("partner is not authorized for this program");

  if (req.resource === "employer_packet") {
    if (!partnerKindAllowedForPacket(partner.kind)) return denyByDefault("partner kind cannot access employer packets");
    if (!req.nurseId) return denyByDefault("packet subject required");
    if (!program.approved_packet_nurse_ids.includes(req.nurseId)) return denyByDefault("packet is not approved for this program");
  }

  return { allow: true, reason: "tenant scope satisfied", status: 200, orgId, tenantId: tenant.tenant_id, program };
}

export async function auditAccessDecision(
  audit: Audit,
  claims: CoreClaims | undefined,
  req: AccessPolicyRequest,
  decision: AccessPolicyDecision,
): Promise<void> {
  if (decision.allow && decision.reason !== "super_admin audited bypass") return;
  await audit(
    String(claims?.email ?? claims?.sub ?? "unknown"),
    decision.allow ? "tenant.super_admin_access" : "tenant.access_denied",
    req.resource,
    req.programId ?? req.nurseId ?? decision.orgId ?? "unknown",
    {
      action: req.action,
      reason: decision.reason,
      orgId: decision.orgId ?? claims?.org_id,
      tenantId: decision.tenantId ?? claims?.tenant_id,
      programId: req.programId,
      status: decision.status,
    },
  );
}
