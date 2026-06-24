import { makeAudit } from "../src/audit.ts";
import {
  checkApplicationGate,
  isApplicationGateEventSource,
  registerEmployerInterest,
  requiresApplicationGateForEvent,
  submitApplicationThroughGate,
  type ApplicationGateFailureCode,
} from "../src/applicationGate.ts";
import { grantConsent } from "../src/consent.ts";
import { recordEvent } from "../src/nurses.ts";
import { MemoryStore, type ProgramScope } from "../src/store.ts";

let pass = 0;
let fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? ` - ${extra}` : ""}`);
  cond ? pass++ : fail++;
}

const at = "2026-06-15T00:00:00.000Z";
const EMPLOYER = "emp_gate";
const PROGRAM = "prog_gate";
const NURSE = "nurse_gate";
const REQ = "req_gate";

interface SeedOpts {
  consent?: boolean;
  visaStage?: string;
  licenseStatus?: string;
  licenseState?: string;
  qaApproved?: boolean;
  jobStatus?: string;
  activeJobIds?: string[];
  authorizedActions?: string[];
}

async function seed(opts: SeedOpts = {}) {
  const store = new MemoryStore();
  const audit = makeAudit(store);
  await store.insertNurse({ id: NURSE, email: "gate@example.test", name: "Gate Test", created_at: at, updated_at: at });
  await recordEvent(store, NURSE, { type: "pathway.visa_status", source: "test", at, data: { stage: opts.visaStage ?? "approved" } });
  await recordEvent(store, NURSE, { type: "pathway.licensure_status", source: "test", at, data: { status: opts.licenseStatus ?? "issued", state: opts.licenseState ?? "AZ" } });
  const program: ProgramScope = {
    id: PROGRAM,
    name: "Gate Program",
    owner_org_id: EMPLOYER,
    employer_org_id: EMPLOYER,
    authorized_partner_org_ids: [],
    authorized_actions: opts.authorizedActions ?? ["application.submit", "packet.read"],
    approved_packet_nurse_ids: opts.qaApproved === false ? [] : [NURSE],
    active_job_ids: opts.activeJobIds ?? [REQ],
    status: "active",
    created_at: at,
  };
  await store.upsertProgramScope(program);
  if (opts.consent !== false) {
    await grantConsent(store, audit, {
      nurseId: NURSE,
      purpose: "employer_share",
      recipientCategory: "employer",
      recipientOrgId: EMPLOYER,
      recipientProgramId: PROGRAM,
      allowedFields: ["readiness", "licensure", "nclex"],
      consentTextVersion: "employer-share-v1",
      grantedBy: "candidate_test",
    });
  }
  return { store, audit };
}

function baseInput(patch: Record<string, unknown> = {}) {
  return {
    nurseId: NURSE,
    employerId: EMPLOYER,
    programId: PROGRAM,
    jobRequisitionId: REQ,
    jobStatus: "open",
    requiredLicenseState: "AZ",
    channel: "direct" as const,
    action: "submit_application" as const,
    actor: "gate_test",
    ...patch,
  };
}

async function expectBlocks(label: string, seedOpts: SeedOpts, code: ApplicationGateFailureCode, patch: Record<string, unknown> = {}) {
  const { store, audit } = await seed(seedOpts);
  const gate = await checkApplicationGate(store, audit, baseInput(patch));
  const auditRows = await store.allAuditOrdered();
  ok(label, !gate.ok && gate.failureCodes.includes(code), gate.failureCodes.join(","));
  ok(`${label}: gate check audited`, auditRows.some((r) => r.action === "application_gate.check" && r.entity === "nurse"));
}

await expectBlocks("Missing consent blocks submission", { consent: false }, "missing_consent");
await expectBlocks("Visa/work authorization pending blocks submission", { visaStage: "administrative_processing" }, "work_authorization_pending");
await expectBlocks("Unknown visa/work authorization fails closed", { visaStage: "unknown" }, "work_authorization_pending");
await expectBlocks("License pending blocks submission", { licenseStatus: "submitted" }, "license_pending");
await expectBlocks("Unknown job status fails closed", {}, "job_not_active", { jobStatus: "unknown" });
await expectBlocks("QA pending blocks submission", { qaApproved: false }, "packet_qa_pending");
await expectBlocks("Closed job blocks submission", {}, "job_not_active", { jobStatus: "closed" });
await expectBlocks("Unauthorized channel blocks submission", { authorizedActions: ["packet.read"] }, "workflow_unauthorized");

{
  const { store, audit } = await seed({ qaApproved: false, authorizedActions: ["packet.read"] });
  const gate = await checkApplicationGate(store, audit, baseInput({
    packetQaApproved: true,
    channelAuthorized: true,
    dataMinimizedPacketGenerated: true,
  }));
  ok(
    "Caller-supplied gate assertions cannot bypass trusted Core state",
    !gate.ok && gate.failureCodes.includes("packet_qa_pending") && gate.failureCodes.includes("workflow_unauthorized"),
    gate.failureCodes.join(","),
  );
}

{
  const { store, audit } = await seed();
  const gate = await checkApplicationGate(store, audit, {
    nurseId: NURSE,
    jobStatus: "open",
    requiredLicenseState: "AZ",
    channel: "direct",
    action: "submit_application",
    actor: "gate_test",
  });
  ok("Data-minimized packet generation requires employer context", !gate.ok && gate.failureCodes.includes("packet_not_minimized"));
}

{
  const { store, audit } = await seed();
  await store.acquireSubmissionLock({
    id: "lock_existing",
    nurse_id: NURSE,
    employer_id: EMPLOYER,
    program_id: PROGRAM,
    job_requisition_id: REQ,
    channel: "direct",
    status: "active",
    locked_at: at,
  });
  const gate = await checkApplicationGate(store, audit, baseInput());
  ok("Duplicate submission lock blocks submission", !gate.ok && gate.failureCodes.includes("duplicate_submission_lock"));
}

{
  const { store, audit } = await seed();
  const submit = await submitApplicationThroughGate(store, audit, baseInput());
  const duplicate = await store.activeSubmissionLock(NURSE, EMPLOYER, "direct");
  const events = await store.eventsByNurse(NURSE);
  ok("Fully cleared candidate can submit", submit.allowed && submit.gate.ok && Boolean(duplicate));
  ok("Fully cleared submission writes placement event", events.some((e) => e.type === "ats.packet_submitted"));
}

{
  const store = new MemoryStore();
  const audit = makeAudit(store);
  await store.insertNurse({ id: "nurse_interest", email: "interest@example.test", name: "Interest Test", created_at: at, updated_at: at });
  const interest = await registerEmployerInterest(store, audit, { nurseId: "nurse_interest", jobId: "job_interest", employerId: EMPLOYER, actor: "candidate_interest" });
  const events = await store.eventsByNurse("nurse_interest");
  ok("Interest registration still works before clearance", interest.ok && events.some((e) => e.type === "demand.interest_registered"));
}

{
  const { store, audit } = await seed();
  await checkApplicationGate(store, audit, baseInput({ jobStatus: "closed" }));
  await checkApplicationGate(store, audit, baseInput({ jobStatus: "open" }));
  const rows = await store.allAuditOrdered();
  ok("Every check writes an audit event", rows.filter((r) => r.action === "application_gate.check").length === 2);
}

ok(
  "Formal submission event types are reserved for ApplicationGate",
  requiresApplicationGateForEvent("ats.packet_submitted") &&
    !isApplicationGateEventSource("external_connector") &&
    isApplicationGateEventSource("core_application_gate"),
);

console.log(`\n${fail ? "APPLICATION GATE FAILED" : "APPLICATION GATE PASSED"} - ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
