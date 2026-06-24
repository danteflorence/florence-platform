import { createAuditAlertService } from "../src/auditAlerts.ts";
import { makeAudit } from "../src/audit.ts";
import { redactError, redactForLog } from "../src/classification.ts";
import { createGatewayDispatch } from "../src/gateway/pipeline.ts";
import { compileGw } from "../src/gateway/router.ts";
import { KeyManager } from "../src/keys.ts";
import { createLogger, type StructuredLogEntry } from "../src/logger.ts";
import { buildRoutes } from "../src/routes.ts";
import { MemoryStore, type RoleGrant, type User } from "../src/store.ts";
import { mintUserSession } from "../src/tokens.ts";
import type { Ctx } from "../src/server.ts";
import type { Role } from "../src/roles.ts";

let pass = 0;
let fail = 0;
const ok = (label: string, condition: boolean, extra?: string) => {
  console.log(`${condition ? "✓" : "✗"} ${label}${extra ? ` - ${extra}` : ""}`);
  condition ? pass++ : fail++;
};

const SENSITIVE = {
  passportNumber: "TEST_LOGGING_PASSPORT",
  sevisId: "N0000000001",
  ssn: "123-45-6789",
  dob: "1990-01-01",
  address: "100 Test Way",
  phone: "415-555-0101",
  email: "synthetic.candidate@example.invalid",
  ds160: "AA00998877",
  loan: "loan amount 12000",
  lenderApplicationId: "lk_123456789",
  token: "tok_TEST_LOGGING_SECRET",
  signedUrl: "https://docs.example.test/v1/document-vault/signed/abc123?X-Amz-Signature=secret",
  documentPath: "/private/tmp/restricted-documents/passport.pdf",
};

const logs: StructuredLogEntry[] = [];
const logger = createLogger({
  component: "security-test",
  requestId: "req_logging_test",
  sink: (entry) => logs.push(entry),
  now: () => "2026-06-24T00:00:00.000Z",
});

logger.info("document.access_attempt", {
  safeCount: 1,
  requestBody: SENSITIVE,
  responseBody: SENSITIVE,
  ...SENSITIVE,
});
logger.error("document.access_error", new Error(`passport ${SENSITIVE.passportNumber} failed for ${SENSITIVE.email}`), {
  rawBody: SENSITIVE,
});

const logJson = JSON.stringify(logs);
ok("structured logger emits JSON-compatible records", logs.length === 2 && logs.every((entry) => entry.at && entry.level && entry.event));
ok("structured logger redacts sensitive metadata", !/TEST_LOGGING_PASSPORT|N0000000001|123-45-6789|1990-01-01|100 Test Way|415-555-0101|synthetic\.candidate|AA00998877|12000|lk_123456789|tok_TEST|X-Amz-Signature|restricted-documents/i.test(logJson));
ok("structured logger keeps safe operational metadata", /safeCount/.test(logJson) && /security-test/.test(logJson));

const redactedLog = redactForLog(`SSN 123-45-6789, phone 415-555-0101, documentPath ${SENSITIVE.documentPath}`);
ok("central log redactor covers SSN, phone, and document paths", !/123-45-6789|415-555-0101|restricted-documents/i.test(String(redactedLog)));

const redactedError = redactError(new Error(`DS-160 ${SENSITIVE.ds160} and token ${SENSITIVE.token} failed`));
ok("sensitive API errors do not reveal raw values", !/AA00998877|tok_TEST/i.test(JSON.stringify(redactedError)));

const store = new MemoryStore();
const audit = makeAudit(store);
await audit("user@example.invalid", "auth.login", "user", "user_login", { method: "password" });
await audit("user@example.invalid", "auth.failed_login", "user", "user_login", { email: SENSITIVE.email, reason: "bad_password" });
await audit("ops@example.invalid", "mfa.changed", "user", "user_login", { enabled: true });
await audit("ops@example.invalid", "role.grant", "user", "user_login", { role: "super_admin", email: SENSITIVE.email });
await audit("candidate@example.invalid", "consent.grant", "nurse", "nurse_a", { purpose: "employer_share" });
await audit("candidate@example.invalid", "consent.revoke", "nurse", "nurse_a", { purpose: "employer_share" });
await audit("ops@example.invalid", "document.upload", "restricted_document", "doc_a", { documentPath: SENSITIVE.documentPath });
await audit("ops@example.invalid", "document.download", "restricted_document", "doc_a", {});
await audit("ops@example.invalid", "document.share", "restricted_document", "doc_a", {});
await audit("ops@example.invalid", "document.delete", "restricted_document", "doc_a", {});
await audit("ops@example.invalid", "employer_packet.share", "packet", "pkt_a", {});
await audit("ops@example.invalid", "lender_packet.share", "lender_packet", "lend_a", {});
await audit("ops@example.invalid", "application_gate.check", "nurse", "nurse_a", { failureCodes: ["workflow_unauthorized"] });
await audit("ops@example.invalid", "financing.handoff", "nurse", "nurse_a", { lenderApplicationId: SENSITIVE.lenderApplicationId });
await audit("ops@example.invalid", "lendkey.handoff", "nurse", "nurse_a", { lenderApplicationId: SENSITIVE.lenderApplicationId });
await audit("ops@example.invalid", "sevismate.handoff", "nurse", "nurse_a", {});
await audit("ops@example.invalid", "ats_vms.submission", "nurse", "nurse_a", {});
await audit("webhook@example.invalid", "webhook.received", "webhook", "wh_a", {});
await audit("ops@example.invalid", "export.generated", "export", "export_a", { bulk: true, rowCount: 5000 });
await audit("ops@example.invalid", "admin.override", "nurse", "nurse_a", { reason: "break_glass" });

const rows = await store.allAuditOrdered();
const actions = new Set(rows.map((row) => row.action));
ok("audit events are written for key sensitive actions", [
  "auth.login",
  "auth.login_failed",
  "auth.mfa_change",
  "role.grant",
  "consent.grant",
  "consent.revoke",
  "document.upload",
  "document.download",
  "document.share",
  "document.delete",
  "employer_packet.share",
  "lender_packet.share",
  "application_gate.check",
  "financing.handoff",
  "lendkey.handoff",
  "sevismate.handoff",
  "ats_vms.submission",
  "webhook.received",
  "export.generated",
  "admin.override",
].every((action) => actions.has(action)));
ok("legacy audit action aliases normalize to canonical actions", actions.has("auth.login_failed") && actions.has("auth.mfa_change") && !actions.has("auth.failed_login") && !actions.has("mfa.changed"));
ok("audit details redact sensitive values", !/TEST_LOGGING_PASSPORT|synthetic\.candidate|lk_123456789|restricted-documents|tok_TEST/i.test(JSON.stringify(rows)));

for (let i = 0; i < 5; i++) await audit("attacker@example.invalid", "auth.failed_login", "user", `u_${i}`, {});
for (let i = 0; i < 3; i++) await audit("attacker@example.invalid", "tenant.access_denied", "employer_packet", `pkt_${i}`, { reason: "wrong_tenant" });
for (let i = 0; i < 25; i++) await audit("attacker@example.invalid", "document.download", "restricted_document", `doc_${i}`, {});
for (let i = 0; i < 3; i++) await audit("attacker@example.invalid", "application_gate.bypass_attempt", "nurse", `nurse_${i}`, {});
for (let i = 0; i < 3; i++) await audit("attacker@example.invalid", "webhook.signature_failed", "webhook", `wh_${i}`, {});

const alerts = await createAuditAlertService(store, audit).evaluateSuspiciousActivity("attacker@example.invalid", { windowSec: 300 });
const alertKinds = new Set(alerts.map((alert) => alert.kind));
ok("alerts fire on suspicious patterns", [
  "repeated_failed_auth",
  "cross_tenant_access_denied",
  "unusual_document_download_volume",
  "multiple_gate_bypass_attempts",
  "webhook_signature_failures",
].every((kind) => alertKinds.has(kind as never)));
ok("alerts create security.alert audit rows", (await store.allAuditOrdered()).some((row) => row.action === "security.alert"));

const gatewayStore = new MemoryStore();
const keys = new KeyManager(gatewayStore);
await keys.init();
const gatewayAudit = makeAudit(gatewayStore);
const protectedRoute = compileGw({
  method: "GET",
  pattern: "/v1/audit-protected",
  auth: true,
  scope: "model:run",
  handler: () => ({ status: 200, body: { ok: true } }),
});
const dispatch = createGatewayDispatch([protectedRoute], keys, gatewayStore, gatewayAudit, { rateLimit: { capacity: 1, refillPerSec: 0 } });
const nowIso = () => new Date().toISOString();
const mkUser = (id: string, email: string): User => ({ id, email, status: "active", created_at: nowIso(), updated_at: nowIso() });
const grant = (role: Role): RoleGrant => ({ id: `grant_${role}`, user_id: "user", role, granted_at: nowIso() });
const noScopeToken = mintUserSession(keys, mkUser("user_no_scope", "noscope@example.invalid"), []).token;
const opsToken = mintUserSession(keys, mkUser("user_ops", "ops@example.invalid"), [grant("super_admin")]).token;

function fakeCtx(path: string, token?: string): { ctx: Ctx; body: () => string; status: () => number } {
  let body = "";
  let statusCode = 0;
  const headers: Record<string, string> = {};
  const res = {
    statusCode,
    setHeader(name: string, value: string) { headers[name.toLowerCase()] = value; },
    end(value?: string) { body = value ?? ""; statusCode = Number(this.statusCode ?? 0); },
  };
  const req = { headers: token ? { authorization: `Bearer ${token}` } : {} };
  return {
    ctx: {
      req: req as never,
      res: res as never,
      method: "GET",
      path,
      query: new URLSearchParams(),
      cookies: {},
      body: {},
      rawBody: "",
    },
    body: () => body,
    status: () => statusCode,
  };
}

const unauth = fakeCtx("/v1/audit-protected");
await dispatch(unauth.ctx);
const deniedScope = fakeCtx("/v1/audit-protected", noScopeToken);
await dispatch(deniedScope.ctx);
const allowedOnce = fakeCtx("/v1/audit-protected", opsToken);
await dispatch(allowedOnce.ctx);
const rateLimited = fakeCtx("/v1/audit-protected", opsToken);
await dispatch(rateLimited.ctx);

const gatewayRows = await gatewayStore.allAuditOrdered();
ok("gateway missing/invalid auth is audit logged", unauth.status() === 401 && gatewayRows.some((row) => row.action === "auth.login_failed" && row.entity === "gateway_route"));
ok("gateway insufficient scope is audit logged", deniedScope.status() === 403 && gatewayRows.some((row) => row.action === "auth.insufficient_scope" && (row.detail as Record<string, unknown> | undefined)?.scope === "model:run"));
ok("gateway rate limit is audit logged", allowedOnce.status() === 200 && rateLimited.status() === 429 && gatewayRows.some((row) => row.action === "gateway.rate_limited"));
ok("gateway deny audit rows do not include raw tokens", !JSON.stringify(gatewayRows).includes(opsToken) && !JSON.stringify(gatewayRows).includes(noScopeToken));

const legacyConsentRoute = buildRoutes({ store: gatewayStore, keys, audit: gatewayAudit }).find((route) => route.method === "GET" && route.path === "/v1/consent");
if (!legacyConsentRoute) throw new Error("missing legacy consent route");
const legacyUnauth = fakeCtx("/v1/consent");
await legacyConsentRoute.handler(legacyUnauth.ctx);
const legacyDenied = fakeCtx("/v1/consent", noScopeToken);
await legacyConsentRoute.handler(legacyDenied.ctx);
const legacyRows = await gatewayStore.allAuditOrdered();
ok("legacy missing/invalid auth is audit logged", legacyUnauth.status() === 401 && legacyRows.some((row) => row.action === "auth.login_failed" && row.entity === "legacy_route"));
ok("legacy insufficient scope is audit logged", legacyDenied.status() === 403 && legacyRows.some((row) => row.action === "auth.insufficient_scope" && row.entity === "legacy_route" && (row.detail as Record<string, unknown> | undefined)?.scope === "consent:read"));
ok("legacy deny audit rows do not include raw tokens", !JSON.stringify(legacyRows).includes(noScopeToken));

console.log(`\n${fail ? "LOGGING/AUDIT FAILED" : "LOGGING/AUDIT PASSED"} - ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
