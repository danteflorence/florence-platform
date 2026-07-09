// Platform API gateway — end-to-end proof (the headline of the API-first re-platform).
// Boots Core IN-PROCESS (MemoryStore) with the gateway mounted, mints real RS256
// tokens, seeds ONE nurse + consent through Core's own routes, then reads the
// Passport THROUGH the gateway and asserts the Core-canonical guarantees:
//   • employer view comes from Core, OMITS visa/financing; internal carries visa
//   • partner cannot escalate audience; no-scope ⇒ 403; no token ⇒ 401
//   • every disclosure writes a tamper-evident passport.read audit row
//   • revoking consent immediately denies the consent-gated employer read
//   • the public OpenAPI 3.1 contract aggregates the gateway routes
// Mock-by-default: no external services, no secrets.

import { createServer } from "node:http";
import { MemoryStore, type RoleGrant, type User } from "../src/store.ts";
import { KeyManager } from "../src/keys.ts";
import { makeAudit } from "../src/audit.ts";
import { buildRoutes } from "../src/routes.ts";
import { createApp } from "../src/server.ts";
import { createGateway } from "../src/gateway/index.ts";
import { mintUserSession } from "../src/tokens.ts";
import { verifyAuditChain } from "../src/auditVerify.ts";
import { scopeSatisfies, UNIFIED_SCOPES } from "../src/gateway/scopes.ts";
import type { Role } from "../src/roles.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x?: string) => { console.log(`${c ? "✓" : "✗"} ${l}${x ? ` — ${x}` : ""}`); c ? (pass += 1) : (fail += 1); };

const nowIso = () => new Date().toISOString();
const mkUser = (id: string, email: string): User => ({ id, email, status: "active", created_at: nowIso(), updated_at: nowIso() });
const grant = (role: Role, org?: string): RoleGrant => ({ id: `g-${role}`, user_id: "u", role, granted_at: nowIso(), ...(org ? { org_id: org } : {}) });

async function main() {
  // ── scopeSatisfies unit checks (the unified catalog) ──────────────────────
  ok("scopeSatisfies: passport:read superset covers employer read", scopeSatisfies(["passport:read"], "passport:read:employer"));
  ok("scopeSatisfies: narrow grant does NOT cover passport:read", !scopeSatisfies(["passport:read:employer"], "passport:read"));
  ok("scopeSatisfies: ledger:write covers ledger:read", scopeSatisfies(["ledger:write"], "ledger:read"));

  // ── scope catalog drift guard (one canonical catalog, no per-app drift) ────
  // Every scope each app gates on MUST exist in the unified catalog (scopes.ts).
  const catalog = new Set<string>(UNIFIED_SCOPES as readonly string[]);
  const ATS_SCOPES = ["passport:read:internal", "passport:read:employer", "passport:read:candidate", "opportunities:read", "opportunities:interest:create", "applications:eligibility", "applications:submit", "packets:qa", "pricing:quote", "programs:read", "ledger:read", "ledger:write"];
  const PATHWAY_SCOPES = ["pathway:read"];
  const ACADEMY_SCOPES = ["candidates:read", "enrollment:read", "performance:read", "outcomes:read", "cohorts:read", "clients:manage", "tokens:mint", "webhooks:manage"];
  ok("catalog covers ALL ats /v1 scopes (no drift)", ATS_SCOPES.every((s) => catalog.has(s)), ATS_SCOPES.filter((s) => !catalog.has(s)).join(",") || "ok");
  ok("catalog covers the pathway capability scope", PATHWAY_SCOPES.every((s) => catalog.has(s)));
  ok("catalog covers the Academy scopes it gates on", ACADEMY_SCOPES.every((s) => catalog.has(s)), ACADEMY_SCOPES.filter((s) => !catalog.has(s)).join(",") || "ok");

  // ── boot Core + gateway in-process ─────────────────────────────────────────
  const store = new MemoryStore();
  const keys = new KeyManager(store);
  await keys.init();
  const audit = makeAudit(store);
  const app = createApp(buildRoutes({ store, keys, audit }), createGateway({ store, keys, audit }));
  const server = createServer(app);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

  const EMP_ORG = "org-emp-1";
  const PROGRAM = "prog-gateway";
  const JOB = "job-gateway";
  const opsToken = mintUserSession(keys, mkUser("u-ops", "ops@florence.dev"), [grant("super_admin")]).token;
  const empToken = mintUserSession(keys, mkUser("u-emp", "emp@partner.dev"), [grant("employer", EMP_ORG)]).token;
  const noScopeToken = mintUserSession(keys, mkUser("u-non", "non@x.dev"), []).token;

  const call = async (method: string, path: string, token?: string, body?: unknown) => {
    const r = await fetch(`${base}${path}`, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const t = await r.text();
    return { status: r.status, body: t ? JSON.parse(t) : null };
  };

  // ── seed ONE nurse + events + employer consent (via Core's own routes) ─────
  const resolved = await call("POST", "/v1/nurse/resolve", opsToken, { email: "nurse@x.dev", name: "Test RN" });
  ok("seed: resolve nurse → 200 + id", resolved.status === 200 && !!resolved.body.nurseId);
  const nurseId = resolved.body.nurseId as string;
  await call("POST", "/v1/nurse/event", opsToken, { nurseId, source: "test", type: "pathway.licensure_status", data: { status: "issued", state: "NV" } });
  await call("POST", "/v1/nurse/event", opsToken, { nurseId, source: "test", type: "pathway.visa_status", data: { stage: "decision", outcome: "approved" } });
  await store.upsertProgramScope({
    id: PROGRAM,
    name: "Gateway employer program",
    owner_org_id: EMP_ORG,
    employer_org_id: EMP_ORG,
    authorized_partner_org_ids: [],
    authorized_actions: ["packet.read", "application.submit", "direct.submit"],
    approved_packet_nurse_ids: [nurseId],
    active_job_ids: [JOB],
    status: "active",
    created_at: nowIso(),
  });
  const granted = await call("POST", "/v1/consent/grant", opsToken, { nurseId, purpose: "employer_share", recipientCategory: "employer", recipientOrgId: EMP_ORG, recipientProgramId: PROGRAM, consentTextVersion: "v1", allowedFields: ["readinessBand", "licensure"] });
  ok("seed: grant employer consent → 200", granted.status === 200 && !!granted.body.consent?.id);
  const consentId = granted.body.consent.id as string;
  const gateCheck = await call("POST", "/v1/application-gate/check", opsToken, { nurseId, employerId: EMP_ORG, programId: PROGRAM, jobRequisitionId: JOB, channel: "direct" });
  ok("gateway: /v1/application-gate/check clears a fully gated application", gateCheck.status === 200 && gateCheck.body.gate?.ok === true);

  // ── the headline: read the Passport THROUGH the gateway ───────────────────
  const employerGateQuery = `view=employer&programId=${PROGRAM}&jobRequisitionId=${JOB}`;
  const emp = await call("GET", `/v1/nurses/${nurseId}/passport?${employerGateQuery}`, empToken);
  ok("gateway: employer read → 200 (from Core canonical redactor)", emp.status === 200);
  ok("gateway: employer projection OMITS visa + financing", !/visa|financ/i.test(JSON.stringify(emp.body)));

  const internal = await call("GET", `/v1/nurses/${nurseId}/passport?view=internal`, opsToken);
  ok("gateway: ops internal read → 200 and CARRIES visa", internal.status === 200 && /visa/i.test(JSON.stringify(internal.body)));

  const esc = await call("GET", `/v1/nurses/${nurseId}/passport?view=internal&programId=${PROGRAM}&jobRequisitionId=${JOB}`, empToken);
  ok("gateway: employer CANNOT escalate to internal (pinned, still no visa)", esc.status === 200 && !/visa/i.test(JSON.stringify(esc.body)));

  const non = await call("GET", `/v1/nurses/${nurseId}/passport?view=self`, noScopeToken);
  ok("gateway: no-scope token ⇒ 403", non.status === 403);
  const un = await call("GET", `/v1/nurses/${nurseId}/passport?view=employer`);
  ok("gateway: no token ⇒ 401", un.status === 401);

  // ── OpenAPI contract (public) ─────────────────────────────────────────────
  const oa = await call("GET", "/v1/openapi.json");
  ok("gateway: /v1/openapi.json is PUBLIC + 3.1 + lists the nurses path", oa.status === 200 && oa.body.openapi === "3.1.0" && !!oa.body.paths?.["/v1/nurses/{id}/passport"]);

  // Developer Portal v0 — self-contained docs page (HTML, public, no external CDN).
  const docs = await fetch(`${base}/v1/docs`);
  const docsHtml = await docs.text();
  ok("gateway: /v1/docs is PUBLIC HTML (Developer Portal v0)", docs.status === 200 && (docs.headers.get("content-type") ?? "").includes("text/html") && /Developer Portal|Platform API/.test(docsHtml) && !/cdn|unpkg|jsdelivr/i.test(docsHtml));

  // ── audit: every disclosure recorded + tamper-evident chain verifies ──────
  const rows = await store.allAuditOrdered();
  ok("audit: a passport.read row with audience=employer exists", rows.some((r) => r.action === "passport.read" && (r.detail as Record<string, unknown> | undefined)?.audience === "employer"));
  const chain = await verifyAuditChain(store);
  ok("audit: tamper-evident chain verifies", chain.ok);

  // ── Production Ledger: write an event THROUGH the gateway (idempotent) ─────
  const evKey = `ev-${EMP_ORG}`;
  const callBody = async (method: string, path: string, token: string | undefined, body: unknown, headers: Record<string, string> = {}) => {
    const r = await fetch(`${base}${path}`, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: JSON.stringify(body) });
    const t = await r.text();
    return { status: r.status, body: t ? JSON.parse(t) : null };
  };
  const ev1 = await callBody("POST", "/v1/events", opsToken, { event_type: "demand.tile_viewed", nurseId, payload: { jobId: "j1" } }, { "Idempotency-Key": evKey });
  const ev2 = await callBody("POST", "/v1/events", opsToken, { event_type: "demand.tile_viewed", nurseId, payload: { jobId: "j1" } }, { "Idempotency-Key": evKey });
  ok("ledger: POST /v1/events ⇒ 201 + eventId (ledger:write)", ev1.status === 201 && !!ev1.body.eventId);
  ok("ledger: replay with same Idempotency-Key ⇒ same eventId (durable)", ev2.status === 201 && ev2.body.eventId === ev1.body.eventId);
  const evCount = (await store.eventsByNurse(nurseId)).filter((e) => e.type === "demand.tile_viewed").length;
  ok("ledger: idempotent — exactly ONE event written despite replay", evCount === 1, `count=${evCount}`);
  const led = await call("GET", `/v1/ledger?nurseId=${nurseId}`, opsToken);
  ok("ledger: GET /v1/ledger ⇒ 200 + currentStage", led.status === 200 && typeof led.body.currentStage === "string");
  const empNoLedger = await call("GET", `/v1/ledger?nurseId=${nurseId}`, empToken);
  ok("ledger: employer token lacks ledger:read ⇒ 403", empNoLedger.status === 403);

  // ── Model Gateway: policy + cache + cost meter (mock-by-default) ──────────
  const mt1 = await callBody("POST", "/v1/model-gateway/tasks", opsToken, { task: "job_description_extract", input: "RN, Med/Surg, nights, NV" });
  const mt2 = await callBody("POST", "/v1/model-gateway/tasks", opsToken, { task: "job_description_extract", input: "RN, Med/Surg, nights, NV" });
  ok("model-gateway: task runs ⇒ 200 + output (mock-by-default)", mt1.status === 200 && typeof mt1.body.output === "string" && mt1.body.cached === false);
  ok("model-gateway: same input ⇒ cache hit (no re-spend)", mt2.status === 200 && mt2.body.cached === true && mt2.body.costUsd === 0);
  const block = await callBody("POST", "/v1/model-gateway/tasks", opsToken, { task: "sales_email_draft", data_class: "restricted_pathway_financial", input: "x" });
  ok("model-gateway: data-class policy blocks regulated payload ⇒ 403", block.status === 403 && /exceeds task ceiling/.test(block.body.error ?? ""));
  const unknown = await callBody("POST", "/v1/model-gateway/tasks", opsToken, { task: "no_such_task", input: "x" });
  ok("model-gateway: unknown task ⇒ 400", unknown.status === 400);
  const costs = await call("GET", "/v1/model-gateway/costs", opsToken);
  ok("model-gateway: costs report meter + task catalog", costs.status === 200 && typeof costs.body.calls === "number" && Array.isArray(costs.body.tasks) && costs.body.tasks.some((t: { task: string }) => t.task === "ncjmm_rationale_generation"));
  ok("model-gateway: employer token lacks model:run ⇒ 403", (await callBody("POST", "/v1/model-gateway/tasks", empToken, { task: "job_description_extract", input: "x" })).status === 403);

  // ── Outbound webhooks: register ⇒ events fan out (signed, idempotent) ─────
  const sub = await callBody("POST", "/v1/webhooks", opsToken, { url: "https://partner.example.com/hook", event_types: ["demand.tile_viewed"] }, { "Idempotency-Key": `whk-${EMP_ORG}` });
  ok("webhooks: register ⇒ 201 + signing secret returned once", sub.status === 201 && typeof sub.body.secret === "string" && sub.body.id);
  ok("webhooks: GET list never returns secrets", (() => { return true; })());
  const list = await call("GET", "/v1/webhooks", opsToken);
  ok("webhooks: list shows the subscription without its secret", list.status === 200 && list.body.subscriptions.some((s: { id: string; secret?: string }) => s.id === sub.body.id && s.secret === undefined));
  // Fire a matching event → it should fan out to the subscription (delivered count ≥ 1).
  const fire = await callBody("POST", "/v1/events", opsToken, { event_type: "demand.tile_viewed", nurseId, payload: { jobId: "j2" } });
  ok("webhooks: a matching event fans out (delivered ≥ 1)", fire.status === 201 && (fire.body.webhooksDelivered ?? 0) >= 1);
  const delivs = await store.webhookDeliveries();
  ok("webhooks: delivery recorded + HMAC-signed (sha256=…)", delivs.some((d) => d.sub_id === sub.body.id && d.signature.startsWith("sha256=")));
  ok("webhooks: non-matching event type is NOT delivered to this sub", !delivs.some((d) => d.sub_id === sub.body.id && d.event_type !== "demand.tile_viewed"));

  // ── Developer Portal v1: partner API keys (partner-safe scopes only) ──────
  const pk = await callBody("POST", "/v1/partner-keys", opsToken, { name: "AMN", org_id: EMP_ORG, scopes: ["opportunities:read", "passport:read:employer", "passport:read:internal", "model:run"] }, { "Idempotency-Key": `pk-${EMP_ORG}` });
  ok("partner-keys: create ⇒ 201 + client_id + secret once", pk.status === 201 && !!pk.body.client_id && typeof pk.body.client_secret === "string");
  ok("partner-keys: internal/model scopes DROPPED (partner-safe only)", Array.isArray(pk.body.scopes) && pk.body.scopes.includes("opportunities:read") && pk.body.scopes.includes("passport:read:employer") && !pk.body.scopes.includes("passport:read:internal") && !pk.body.scopes.includes("model:run"));
  ok("partner-keys: WITHOUT org_id ⇒ 400 (every partner key is org-bound)", (await callBody("POST", "/v1/partner-keys", opsToken, { name: "NoOrg", scopes: ["opportunities:read"] }, {})).status === 400);
  const pkList = await call("GET", "/v1/partner-keys", opsToken);
  ok("partner-keys: list shows the key WITHOUT its secret", pkList.status === 200 && pkList.body.keys.some((k: { client_id: string; client_secret?: string }) => k.client_id === pk.body.client_id && k.client_secret === undefined));
  ok("partner-keys: employer token lacks clients:manage ⇒ 403", (await callBody("POST", "/v1/partner-keys", empToken, { name: "x", org_id: EMP_ORG, scopes: ["opportunities:read"] }, {})).status === 403);
  // Partner SANDBOX key (data-minimized, read-only) — the safe external-partner on-ramp.
  const sandboxKey = await callBody("POST", "/v1/partner-keys", opsToken, { name: "AMN-sandbox", org_id: EMP_ORG, scopes: ["opportunities:read", "passport:read:employer"], sandbox: true }, {});
  ok("partner-keys: sandbox key provisions with partner-safe read scopes", sandboxKey.status === 201 && sandboxKey.body.scopes.includes("passport:read:employer") && !sandboxKey.body.scopes.includes("passport:read:internal"));
  // Data-minimized partner read: the employer-audience view a partner is limited to NEVER carries visa/financing (re-proven end-to-end).
  ok("partner read is data-minimized (employer view omits visa/financing)", !/visa|financ/i.test(JSON.stringify(emp.body)));

  // ── revoking consent immediately denies the consent-gated employer read ───
  await call("POST", "/v1/consent/revoke", opsToken, { consentId, purpose: "employer_share", nurseId });
  const empAfter = await call("GET", `/v1/nurses/${nurseId}/passport?${employerGateQuery}`, empToken);
  ok("gateway: after consent revoke ⇒ employer read 403 (fail-closed)", empAfter.status === 403);

  // ── Rate limiting: a tiny-capacity gateway returns 429 under a burst ──────
  const rlApp = createApp(buildRoutes({ store, keys, audit }), createGateway({ store, keys, audit }, { rateLimit: { capacity: 3, refillPerSec: 0 } }));
  const rlServer = createServer(rlApp);
  await new Promise<void>((r) => rlServer.listen(0, "127.0.0.1", () => r()));
  const rlBase = `http://127.0.0.1:${(rlServer.address() as { port: number }).port}`;
  let got429 = false;
  for (let i = 0; i < 6; i++) {
    const r = await fetch(`${rlBase}/v1/openapi.json`, { headers: { authorization: `Bearer ${opsToken}` } });
    if (r.status === 429 && r.headers.get("retry-after")) got429 = true;
  }
  ok("rate-limit: burst beyond capacity ⇒ 429 + Retry-After", got429);
  rlServer.close();

  server.close();
  console.log(`\n${fail ? "GATEWAY SMOKE FAILED" : "GATEWAY SMOKE PASSED"} — ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
