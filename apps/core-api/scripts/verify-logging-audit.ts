import { readFileSync } from "node:fs";
import { makeAudit, makeAuditService } from "../src/audit.ts";
import { createAuditAlertService } from "../src/auditAlerts.ts";
import { redactError } from "../src/classification.ts";
import { verifyAuditChain } from "../src/auditVerify.ts";
import { createLogger, type StructuredLogEntry } from "../src/logger.ts";
import { MemoryStore } from "../src/store.ts";

let pass = 0;
let fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? ` - ${extra}` : ""}`);
  cond ? (pass += 1) : (fail += 1);
};

const sentinelValues = [
  "synthetic.person@example.invalid",
  "202-555-0144",
  "000-00-0000",
  "900-70-0000",
  "N0000000000",
  "PX000000",
  "I20_SYNTHETIC_VALUE",
  "VISA_STATUS_VALUE",
  "DS160_CONFIRMATION_VALUE",
  "CREDIT_SCORE_VALUE",
  "LOAN_PACKET_VALUE",
  "LENDAPP-0001",
  "DEMO_SECRET_VALUE",
  "SIGNED_TOKEN_VALUE",
  "https://signed.example.invalid/file?X-Amz-Signature=SIGNED_TOKEN_VALUE",
  "/vault/documents/passport/PX000000.pdf",
  "123 Synthetic Test Street",
];

function containsSentinel(value: unknown): boolean {
  const text = JSON.stringify(value);
  return sentinelValues.some((sentinel) => text.includes(sentinel));
}

const logEntries: StructuredLogEntry[] = [];
const logger = createLogger({
  now: () => "2026-06-24T00:00:00.000Z",
  sink: (entry) => logEntries.push(entry),
});

logger.info("passport number PX000000 for synthetic.person@example.invalid", {
  component: "security-test",
  event: "redaction",
  email: "synthetic.person@example.invalid",
  phone: "202-555-0144",
  ssn: "000-00-0000",
  itin: "900-70-0000",
  passportNumber: "PX000000",
  sevisId: "N0000000000",
  i20: { documentId: "I20_SYNTHETIC_VALUE" },
  visaStatus: "VISA_STATUS_VALUE",
  dateOfBirth: "1990-01-01",
  address: "123 Synthetic Test Street",
  ds160: { confirmationNumber: "DS160_CONFIRMATION_VALUE" },
  credit: { score: "CREDIT_SCORE_VALUE" },
  loan: { packet: "LOAN_PACKET_VALUE" },
  lenderApplicationId: "LENDAPP-0001",
  secret: "DEMO_SECRET_VALUE",
  token: "SIGNED_TOKEN_VALUE",
  signedUrl: "https://signed.example.invalid/file?X-Amz-Signature=SIGNED_TOKEN_VALUE",
  documentPath: "/vault/documents/passport/PX000000.pdf",
  rawBody: { request: "raw request body value with DS160_CONFIRMATION_VALUE" },
  requestBody: { passportNumber: "PX000000" },
  responseBody: { signedUrl: "https://signed.example.invalid/file?X-Amz-Signature=SIGNED_TOKEN_VALUE" },
  safeCount: 2,
});

const parsedLog = logEntries[0] ?? {};
ok("structured logger emits structured entries", parsedLog.level === "info" && typeof parsedLog.event === "string");
ok("structured logger redacts sensitive values", !containsSentinel(logEntries), JSON.stringify(logEntries));
ok("structured logger preserves safe operations metadata", JSON.stringify(parsedLog).includes("safeCount"));

const loggingSource = [
  "src/index.ts",
  "scripts/seed-admin.ts",
  "scripts/seed-app-clients.ts",
].map((file) => readFileSync(file, "utf8")).join("\n");
ok("startup and seed logs do not echo secret variables", !/console\.log\([^)]*\$\{(?:password|secret|demo\.secret)[^)]*\)/s.test(loggingSource));

const apiError = redactError(
  new Error(
    "passport number PX000000, SEVIS N0000000000, SSN 000-00-0000, token SIGNED_TOKEN_VALUE, and signed URL https://signed.example.invalid/file?X-Amz-Signature=SIGNED_TOKEN_VALUE failed",
  ),
);
ok("sensitive API errors do not reveal raw values", !containsSentinel(apiError), JSON.stringify(apiError));

const auditStore = new MemoryStore();
const auditService = makeAuditService(auditStore);
const requiredActions = [
  "auth.login",
  "auth.login_failed",
  "auth.mfa_change",
  "role.grant",
  "permission.grant",
  "consent.create",
  "consent.revoke",
  "document.upload",
  "document.view",
  "document.download",
  "document.share",
  "document.delete",
  "employer_packet.create",
  "employer_packet.share",
  "employer_packet.view",
  "lender_packet.create",
  "lender_packet.share",
  "lender_packet.view",
  "application_gate.check",
  "financing.handoff",
  "lendkey.handoff",
  "sevismate.handoff",
  "ats_vms.submission",
  "webhook.received",
  "export.generated",
  "bulk_access.detected",
  "admin.override",
];

for (const action of requiredActions) {
  await auditService.record({
    actor: "synthetic.person@example.invalid",
    action,
    entity: action.includes("document") ? "restricted_document" : "nurse",
    entityId: action.includes("document") ? "doc_synthetic" : "nurse_synthetic",
    outcome: action.includes("failed") ? "failure" : "success",
    detail: {
      action,
      passportNumber: "PX000000",
      sevisId: "N0000000000",
      token: "SIGNED_TOKEN_VALUE",
      signedUrl: "https://signed.example.invalid/file?X-Amz-Signature=SIGNED_TOKEN_VALUE",
      safeCount: 1,
    },
  });
}

const auditRows = await auditStore.allAuditOrdered();
ok("audit events are written for required key actions", requiredActions.every((action) => auditRows.some((row) => row.action === action)));
ok("audit events redact sensitive detail and actor emails", !containsSentinel(auditRows) && !/synthetic\.person@example\.invalid/i.test(JSON.stringify(auditRows)));
const auditChain = await verifyAuditChain(auditStore);
ok("audit event chain remains intact", auditChain.ok === true, auditChain.ok ? `${auditChain.checked} rows` : auditChain.reason);

const alertStore = new MemoryStore();
const alertAudit = makeAudit(alertStore);
const alertService = createAuditAlertService(alertStore, alertAudit, {
  repeatedFailedAuth: 2,
  crossTenantDenied: 1,
  documentDownloads: 2,
  bulkExportRows: 10,
  gateBypassAttempts: 2,
  webhookSignatureFailures: 2,
  bulkPassportReads: 2,
});
const suspiciousActor = "suspicious.actor@example.invalid";

for (let i = 0; i < 2; i += 1) await alertAudit(suspiciousActor, "auth.login_failed", "auth", undefined, { reason: "invalid_credentials" });
await alertAudit(suspiciousActor, "tenant.access_denied", "employer_packet", "program_synthetic", { code: "wrong_tenant", reason: "wrong tenant" });
for (let i = 0; i < 2; i += 1) await alertAudit(suspiciousActor, "document.download", "restricted_document", `doc_${i}`, {});
await alertAudit(suspiciousActor, "export.generated", "export", "export_synthetic", {
  rowCount: 100,
  bulk: true,
  signedUrl: "https://signed.example.invalid/file?X-Amz-Signature=SIGNED_TOKEN_VALUE",
});
await alertAudit(suspiciousActor, "role.grant", "user", "user_synthetic", { role: "super_admin" });
for (let i = 0; i < 2; i += 1) {
  await alertAudit(suspiciousActor, "application_gate.submission_blocked", "nurse", `nurse_gate_${i}`, {
    failureCodes: ["workflow_unauthorized"],
  });
}
for (let i = 0; i < 2; i += 1) await alertAudit(suspiciousActor, "webhook.signature_failed", "webhook", `webhook_${i}`, {});
for (let i = 0; i < 3; i += 1) await alertAudit(suspiciousActor, "passport.read", "nurse", `nurse_bulk_${i}`, {});

const findings = await alertService.evaluateSuspiciousActivity(suspiciousActor, { windowSec: 300 });
const kinds = new Set(findings.map((finding) => finding.kind));
ok("alerts fire on repeated failed auth", kinds.has("repeated_failed_auth"));
ok("alerts fire on cross-tenant access denied", kinds.has("cross_tenant_access_denied"));
ok("alerts fire on unusual document download volume", kinds.has("unusual_document_download_volume"));
ok("alerts fire on bulk export", kinds.has("bulk_export"));
ok("alerts fire on admin privilege escalation", kinds.has("admin_privilege_escalation"));
ok("alerts fire on multiple gate bypass attempts", kinds.has("multiple_gate_bypass_attempts"));
ok("alerts fire on webhook signature failures", kinds.has("webhook_signature_failures"));
ok("alerts fire on bulk access", kinds.has("bulk_access"));
const alertRows = (await alertStore.allAuditOrdered()).filter((row) => row.action === "security.alert");
ok("alert events are written to audit", alertRows.length >= 8, `${alertRows.length} alerts`);
ok("alert audit events redact sensitive values", !containsSentinel(alertRows) && !/suspicious\.actor@example\.invalid/i.test(JSON.stringify(alertRows)));
const alertChain = await verifyAuditChain(alertStore);
ok("alert audit chain remains intact", alertChain.ok === true, alertChain.ok ? `${alertChain.checked} rows` : alertChain.reason);

console.log(`\n${fail ? "LOGGING AND AUDIT FAILED" : "LOGGING AND AUDIT PASSED"} - ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
