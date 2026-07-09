import { makeAudit } from "../src/audit.ts";
import { consentAllows } from "../src/consent.ts";
import type { CoreClaims } from "../src/crypto.ts";
import type { ConsentRow } from "../src/store.ts";
import { MemoryStore } from "../src/store.ts";
import {
  auditAccessDecision as auditRouteAccessDecision,
  authorizeTenantAccess as authorizeRouteTenantAccess,
  type AccessPolicyRequest as RouteAccessPolicyRequest,
} from "../src/tenant.ts";
import {
  authorizeTenantAccess,
  authorizeTenantAccessWithAudit,
  type AccessPolicyRequest,
  type ProgramScope,
} from "../src/tenantAccess.ts";

let pass = 0;
let fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? ` - ${extra}` : ""}`);
  cond ? (pass += 1) : (fail += 1);
};

const at = "2026-06-15T00:00:00.000Z";

const program = (patch: Partial<ProgramScope> = {}): ProgramScope => ({
  id: "prog_test",
  tenantId: "tenant_test",
  ownerOrgId: "org_employer_a",
  kind: "employer_direct",
  employerOrgId: "org_employer_a",
  status: "active",
  ...patch,
});

const baseReq = (patch: Partial<AccessPolicyRequest>): AccessPolicyRequest => ({
  actor: { id: "actor_test", role: "employer", orgId: "org_employer_a" },
  action: "read",
  purpose: "employer_share",
  resource: { type: "employer_packet", id: "packet_test", ownerOrgId: "org_employer_a" },
  ...patch,
});

const decision = (req: AccessPolicyRequest) => authorizeTenantAccess(req);

// 1. AMN cannot access non-AMN programs.
const amnDenied = decision(baseReq({
  actor: { id: "actor_amn", role: "employer", orgId: "org_amn", partnerOrgKind: "amn" },
  purpose: "program_ops",
  resource: { type: "program", id: "prog_employer_b", ownerOrgId: "org_employer_b", programId: "prog_employer_b" },
  programScope: program({ id: "prog_employer_b", ownerOrgId: "org_employer_b", employerOrgId: "org_employer_b" }),
}));
ok("AMN cannot access non-AMN programs", amnDenied.allow === false && amnDenied.code === "wrong_tenant");

const amnPacket = decision(baseReq({
  actor: { id: "actor_amn", role: "employer", orgId: "org_amn", partnerOrgKind: "amn" },
  resource: {
    type: "employer_packet",
    id: "packet_amn",
    ownerOrgId: "org_amn",
    consentOk: true,
    packetApproved: true,
    licensedRn: true,
    dataClass: "RESTRICTED_EMPLOYER_PACKET",
  },
}));
ok("AMN can access approved employer-safe packets in its tenant", amnPacket.allow === true);

// 2. Employer A cannot access Employer B packets.
const crossEmployer = decision(baseReq({
  actor: { id: "actor_emp_a", role: "employer", orgId: "org_employer_a" },
  resource: {
    type: "employer_packet",
    id: "packet_b",
    ownerOrgId: "org_employer_b",
    consentOk: true,
    packetApproved: true,
    licensedRn: true,
    dataClass: "RESTRICTED_EMPLOYER_PACKET",
  },
}));
ok("Employer A cannot access Employer B packets", crossEmployer.allow === false && crossEmployer.code === "wrong_tenant");

const ownEmployer = decision(baseReq({
  actor: { id: "actor_emp_a", role: "employer", orgId: "org_employer_a" },
  resource: {
    type: "employer_packet",
    id: "packet_a",
    ownerOrgId: "org_employer_a",
    consentOk: true,
    packetApproved: true,
    licensedRn: true,
    dataClass: "RESTRICTED_EMPLOYER_PACKET",
  },
}));
ok("Employer can access only approved licensed RN packet in its tenant", ownEmployer.allow === true);

const notLicensed = decision(baseReq({
  actor: { id: "actor_emp_a", role: "employer", orgId: "org_employer_a" },
  resource: {
    type: "employer_packet",
    id: "packet_unlicensed",
    ownerOrgId: "org_employer_a",
    consentOk: true,
    packetApproved: true,
    licensedRn: false,
    dataClass: "RESTRICTED_EMPLOYER_PACKET",
  },
}));
ok("Employer packet fails closed without licensed RN status", notLicensed.allow === false && notLicensed.code === "not_approved");

// 3. Lender cannot access employer packet fields.
const lenderEmployerPacket = decision(baseReq({
  actor: { id: "actor_lender", role: "lender", orgId: "org_lender" },
  purpose: "underwriting",
  resource: {
    type: "employer_packet",
    id: "packet_employer",
    ownerOrgId: "org_lender",
    consentOk: true,
    packetApproved: true,
    licensedRn: true,
    dataClass: "RESTRICTED_EMPLOYER_PACKET",
  },
}));
ok("Lender cannot access employer packet resource", lenderEmployerPacket.allow === false && lenderEmployerPacket.code === "wrong_role");

const lenderFields = decision(baseReq({
  actor: { id: "actor_lender", role: "lender", orgId: "org_lender" },
  purpose: "underwriting",
  resource: {
    type: "lender_packet",
    id: "lender_packet",
    ownerOrgId: "org_lender",
    consentOk: true,
    includesEmployerPacketFields: true,
    dataClass: "RESTRICTED_FINANCING",
  },
}));
ok("Lender packet rejects employer packet fields", lenderFields.allow === false && lenderFields.code === "forbidden");

// 4. University cannot access named student data without explicit consent.
const namedStudent = decision(baseReq({
  actor: { id: "actor_uni", role: "university", orgId: "org_university" },
  purpose: "education",
  resource: {
    type: "university_named_student",
    id: "student_view",
    ownerOrgId: "org_university",
    consentOk: false,
    dataClass: "RESTRICTED_EDUCATION",
  },
}));
ok("University cannot access named student data without explicit consent", namedStudent.allow === false && namedStudent.code === "missing_consent");

const cohort = decision(baseReq({
  actor: { id: "actor_uni", role: "university", orgId: "org_university" },
  purpose: "aggregate_reporting",
  resource: {
    type: "university_cohort",
    id: "cohort_view",
    ownerOrgId: "org_university",
    aggregate: true,
    anonymized: true,
    dataClass: "INTERNAL",
  },
}));
ok("University aggregate anonymized cohort view is allowed", cohort.allow === true);

// 5. Missing tenant context fails closed.
const missingTenant = decision(baseReq({
  actor: { id: "actor_missing", role: "employer" },
  resource: {
    type: "employer_packet",
    id: "packet_missing_tenant",
    ownerOrgId: "org_employer_a",
    consentOk: true,
    packetApproved: true,
    licensedRn: true,
    dataClass: "RESTRICTED_EMPLOYER_PACKET",
  },
}));
ok("Missing tenant context fails closed", missingTenant.allow === false && missingTenant.code === "missing_tenant");

// Internal users need an explicit role allowlist and purpose.
const internalWithoutAllowlist = decision(baseReq({
  actor: { id: "actor_ops", role: "ops" },
  purpose: "program_workspace",
  resource: {
    type: "production_ledger",
    id: "ledger_internal",
    ownerOrgId: "org_employer_a",
    consentOk: true,
  },
}));
ok("Internal user access fails closed without an explicit role allowlist", internalWithoutAllowlist.allow === false && internalWithoutAllowlist.code === "wrong_role");

const internalAllowed = decision(baseReq({
  actor: { id: "actor_ops", role: "ops" },
  purpose: "program_workspace",
  resource: {
    type: "production_ledger",
    id: "ledger_internal",
    ownerOrgId: "org_employer_a",
    consentOk: true,
    allowedInternalRoles: ["ops"],
  },
}));
ok("Internal user access requires role and purpose", internalAllowed.allow === true);

// 6. Denied access creates an audit event.
const store = new MemoryStore();
const audit = makeAudit(store);
const auditedDeny = await authorizeTenantAccessWithAudit(audit, baseReq({
  actor: { id: "actor_emp_a", role: "employer", orgId: "org_employer_a" },
  resource: {
    type: "employer_packet",
    id: "packet_emp_b",
    ownerOrgId: "org_employer_b",
    consentOk: true,
    packetApproved: true,
    licensedRn: true,
    dataClass: "RESTRICTED_EMPLOYER_PACKET",
  },
}));
const auditRows = await store.allAuditOrdered();
ok("Denied tenant access creates an audit event", auditedDeny.allow === false && auditRows.some((r) => r.action === "access_policy.deny" && r.entity === "employer_packet"));

const auditedSuperAdmin = await authorizeTenantAccessWithAudit(audit, baseReq({
  actor: { id: "actor_super", role: "super_admin", roles: ["super_admin"] },
  purpose: "break_glass_review",
  resource: {
    type: "restricted_document",
    id: "doc_super",
    ownerOrgId: "org_employer_b",
    consentOk: false,
    workflowGateOk: false,
  },
}));
const superAuditRows = await store.allAuditOrdered();
ok("Shared policy super-admin bypass is explicitly audited", auditedSuperAdmin.allow === true && superAuditRows.some((r) => r.action === "access_policy.allow" && r.entity === "restricted_document"));

// ATS/VMS partners can access only authorized program submissions.
const atsAllowed = decision(baseReq({
  actor: { id: "actor_vms", role: "service", orgId: "org_vms", partnerOrgKind: "ats_vms" },
  action: "submit",
  purpose: "ats_submission",
  resource: { type: "ats_submission", id: "sub_test", ownerOrgId: "org_employer_a", programId: "prog_test", workflowGateOk: true },
  programScope: program({ atsVmsOrgIds: ["org_vms"] }),
}));
ok("ATS/VMS partner can access authorized program submission", atsAllowed.allow === true);

const atsDenied = decision(baseReq({
  actor: { id: "actor_vms_other", role: "service", orgId: "org_vms_other", partnerOrgKind: "ats_vms" },
  action: "submit",
  purpose: "ats_submission",
  resource: { type: "ats_submission", id: "sub_test", ownerOrgId: "org_employer_a", programId: "prog_test", workflowGateOk: true },
  programScope: program({ atsVmsOrgIds: ["org_vms"] }),
}));
ok("ATS/VMS partner cannot access unauthorized program submission", atsDenied.allow === false && atsDenied.code === "wrong_tenant");

// Named-recipient consent: category-wide rows do not unlock org-specific partner shares.
const consentBase: ConsentRow = {
  id: "consent_test",
  nurse_id: "nurse_test",
  purpose: "employer_share",
  recipient_category: "employer",
  allowed_fields: ["readiness"],
  consent_text_version: "v1",
  consent_text_hash: "hash_v1",
  status: "granted",
  granted_at: at,
  granted_by: "actor_test",
};
ok("Category-wide consent does not authorize named employer share", consentAllows([consentBase], "employer_share", "org_employer_a").ok === false);
ok("Exact org consent authorizes only the named employer", consentAllows([{ ...consentBase, recipient_org_id: "org_employer_a" }], "employer_share", "org_employer_a").ok === true);
ok("Exact org consent denies a different employer", consentAllows([{ ...consentBase, recipient_org_id: "org_employer_a" }], "employer_share", "org_employer_b").ok === false);

// Gateway route policy: no-server coverage for AccessPolicy middleware inputs.
const routeClaims = (sub: string, orgId?: string, role = "service", roles: string[] = [role]): CoreClaims => ({
  iss: "tenant-isolation-test",
  aud: "florencern-core",
  sub,
  role,
  roles,
  ...(orgId ? { org_id: orgId, tenant_id: orgId } : {}),
  scope: "programs:read passport:read:employer",
  iat: 0,
  exp: 9999999999,
  jti: `jti_${sub}`,
});

const routeReq = (patch: Partial<RouteAccessPolicyRequest> = {}): RouteAccessPolicyRequest => ({
  resource: "program",
  action: "program.read",
  programId: "prog_route_amn",
  purpose: "program_workspace",
  ...patch,
});

const routeStore = new MemoryStore();
const routeAudit = makeAudit(routeStore);
await routeStore.upsertPartnerOrg({
  id: "org_route_amn",
  kind: "amn",
  name: "Route AMN",
  tenant_id: "org_route_amn",
  status: "active",
  created_at: at,
});
await routeStore.upsertPartnerOrg({
  id: "org_route_employer_a",
  kind: "employer",
  name: "Route Employer A",
  tenant_id: "org_route_employer_a",
  status: "active",
  created_at: at,
});
await routeStore.upsertPartnerOrg({
  id: "org_route_employer_b",
  kind: "employer",
  name: "Route Employer B",
  tenant_id: "org_route_employer_b",
  status: "active",
  created_at: at,
});
await routeStore.upsertPartnerOrg({
  id: "org_route_vms",
  kind: "ats_vms",
  name: "Route VMS",
  tenant_id: "org_route_vms",
  status: "active",
  created_at: at,
});
await routeStore.upsertPartnerOrg({
  id: "org_route_lender",
  kind: "lender",
  name: "Route Lender",
  tenant_id: "org_route_lender",
  status: "active",
  created_at: at,
});
await routeStore.upsertTenantScope({
  id: "ts_route_amn",
  org_id: "org_route_amn",
  tenant_id: "org_route_amn",
  partner_org_id: "org_route_amn",
  partner_kind: "amn",
  allowed_program_ids: ["prog_route_amn"],
  allowed_purposes: ["program_workspace", "employer_share"],
  created_at: at,
});
await routeStore.upsertTenantScope({
  id: "ts_route_employer_a",
  org_id: "org_route_employer_a",
  tenant_id: "org_route_employer_a",
  partner_org_id: "org_route_employer_a",
  partner_kind: "employer",
  allowed_program_ids: ["prog_route_amn"],
  allowed_purposes: ["program_workspace", "employer_share"],
  created_at: at,
});
await routeStore.upsertTenantScope({
  id: "ts_route_employer_b",
  org_id: "org_route_employer_b",
  tenant_id: "org_route_employer_b",
  partner_org_id: "org_route_employer_b",
  partner_kind: "employer",
  allowed_program_ids: ["prog_route_employer_b"],
  allowed_purposes: ["program_workspace", "employer_share"],
  created_at: at,
});
await routeStore.upsertTenantScope({
  id: "ts_route_vms",
  org_id: "org_route_vms",
  tenant_id: "org_route_vms",
  partner_org_id: "org_route_vms",
  partner_kind: "ats_vms",
  allowed_program_ids: ["prog_route_amn"],
  allowed_purposes: ["program_workspace", "employer_share"],
  created_at: at,
});
await routeStore.upsertTenantScope({
  id: "ts_route_lender",
  org_id: "org_route_lender",
  tenant_id: "org_route_lender",
  partner_org_id: "org_route_lender",
  partner_kind: "lender",
  allowed_program_ids: ["prog_route_amn"],
  allowed_purposes: ["underwriting"],
  created_at: at,
});
await routeStore.upsertProgramScope({
  id: "prog_route_amn",
  name: "Route AMN Program",
  owner_org_id: "org_route_amn",
  employer_org_id: "org_route_employer_a",
  authorized_partner_org_ids: ["org_route_vms"],
  authorized_actions: ["program.read", "packet.read"],
  approved_packet_nurse_ids: ["nurse_route_ok"],
  status: "active",
  created_at: at,
});
await routeStore.upsertProgramScope({
  id: "prog_route_employer_b",
  name: "Route Employer B Program",
  owner_org_id: "org_route_employer_b",
  employer_org_id: "org_route_employer_b",
  authorized_partner_org_ids: [],
  authorized_actions: ["program.read", "packet.read"],
  approved_packet_nurse_ids: ["nurse_route_b"],
  status: "active",
  created_at: at,
});

const routeAmnOwn = await authorizeRouteTenantAccess(routeStore, routeClaims("route_amn", "org_route_amn", "service"), routeReq());
ok("Gateway policy allows AMN only for its own program", routeAmnOwn.allow === true);

const routeAmnOther = await authorizeRouteTenantAccess(
  routeStore,
  routeClaims("route_amn", "org_route_amn", "service"),
  routeReq({ programId: "prog_route_employer_b" }),
);
ok("Gateway policy denies AMN access to non-AMN programs", routeAmnOther.allow === false && /program not in tenant scope|partner is not authorized/.test(routeAmnOther.reason));

const routeMissingTenant = await authorizeRouteTenantAccess(routeStore, routeClaims("route_missing"), routeReq());
ok("Gateway policy fails closed when tenant context is missing", routeMissingTenant.allow === false && routeMissingTenant.reason === "missing tenant context");

const routeEmployerPacket = await authorizeRouteTenantAccess(
  routeStore,
  routeClaims("route_employer_a", "org_route_employer_a", "employer"),
  routeReq({ resource: "employer_packet", action: "packet.read", nurseId: "nurse_route_ok", purpose: "employer_share" }),
);
ok("Gateway policy allows employer approved packet in its program", routeEmployerPacket.allow === true);

const routeEmployerOtherPacketReq = routeReq({ resource: "employer_packet", action: "packet.read", nurseId: "nurse_route_ok", purpose: "employer_share" });
const routeEmployerOtherPacket = await authorizeRouteTenantAccess(
  routeStore,
  routeClaims("route_employer_b", "org_route_employer_b", "employer"),
  routeEmployerOtherPacketReq,
);
ok("Gateway policy denies Employer B access to Employer A packets", routeEmployerOtherPacket.allow === false);

const routeUnapprovedPacket = await authorizeRouteTenantAccess(
  routeStore,
  routeClaims("route_employer_a", "org_route_employer_a", "employer"),
  routeReq({ resource: "employer_packet", action: "packet.read", nurseId: "nurse_route_unapproved", purpose: "employer_share" }),
);
ok("Gateway policy denies packets not approved for the program", routeUnapprovedPacket.allow === false && routeUnapprovedPacket.reason === "packet is not approved for this program");

const routeLenderPacket = await authorizeRouteTenantAccess(
  routeStore,
  routeClaims("route_lender", "org_route_lender", "lender"),
  routeReq({ resource: "employer_packet", action: "packet.read", nurseId: "nurse_route_ok", purpose: "employer_share" }),
);
ok("Gateway policy denies lender access to employer packets", routeLenderPacket.allow === false);

const routeVmsProgram = await authorizeRouteTenantAccess(routeStore, routeClaims("route_vms", "org_route_vms", "service"), routeReq());
ok("Gateway policy allows authorized ATS/VMS program access", routeVmsProgram.allow === true);

const routeVmsOtherProgram = await authorizeRouteTenantAccess(
  routeStore,
  routeClaims("route_vms", "org_route_vms", "service"),
  routeReq({ programId: "prog_route_employer_b" }),
);
ok("Gateway policy denies unauthorized ATS/VMS program access", routeVmsOtherProgram.allow === false);

await auditRouteAccessDecision(routeAudit, routeClaims("route_employer_b", "org_route_employer_b", "employer"), routeEmployerOtherPacketReq, routeEmployerOtherPacket);
const routeDeniedRows = await routeStore.allAuditOrdered();
ok("Gateway policy denied access creates a tenant audit event", routeDeniedRows.some((r) => r.action === "tenant.access_denied" && r.entity === "employer_packet"));

const routeSuperAdmin = await authorizeRouteTenantAccess(routeStore, routeClaims("route_super", undefined, "super_admin", ["super_admin"]), routeReq());
await auditRouteAccessDecision(routeAudit, routeClaims("route_super", undefined, "super_admin", ["super_admin"]), routeReq(), routeSuperAdmin);
const routeSuperRows = await routeStore.allAuditOrdered();
ok("Gateway policy super-admin bypass is explicitly audited", routeSuperAdmin.allow === true && routeSuperRows.some((r) => r.action === "tenant.super_admin_access"));

console.log(`\n${fail ? "TENANT ISOLATION FAILED" : "TENANT ISOLATION PASSED"} - ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
