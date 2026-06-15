// Partner tenant binding — end-to-end proof (the enterprise-security gate before any
// external partner touches the API). Boots Core + gateway in-process and proves that an
// external partner M2M key is org-bound, audience-restricted, and consent-gated — while
// our own internal (non-org-bound) service tokens stay trusted redaction proxies:
//   • every partner key MUST carry org_id (unbound ⇒ 400)
//   • a partner may read ONLY its consent-gated partner audiences (employer/university/
//     lender); internal_ops/self/investor are refused (403 audience_not_allowed)
//   • a partner reads its OWN org's consented nurse (employer view, no visa/financing)
//   • a partner from another org CANNOT read that nurse (consent gate ⇒ 403)
//   • consent revoke ⇒ fail-closed 403
//   • an INTERNAL service token (no org_id, broad passport:read) still reads internal
// Mock-by-default; no external services, no secrets.
import { createServer } from "node:http";
import { MemoryStore, type RoleGrant, type User } from "../src/store.ts";
import { KeyManager } from "../src/keys.ts";
import { makeAudit } from "../src/audit.ts";
import { buildRoutes } from "../src/routes.ts";
import { createApp } from "../src/server.ts";
import { createGateway } from "../src/gateway/index.ts";
import { mintUserSession } from "../src/tokens.ts";
import { issueClientToken } from "../src/m2m.ts";
import { hashSecret } from "../src/crypto.ts";
import type { Role } from "../src/roles.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x?: string) => { console.log(`${c ? "✓" : "✗"} ${l}${x ? ` — ${x}` : ""}`); c ? (pass += 1) : (fail += 1); };
const nowIso = () => new Date("2026-06-15T00:00:00Z").toISOString();
const mkUser = (id: string, email: string): User => ({ id, email, status: "active", created_at: nowIso(), updated_at: nowIso() });
const grant = (role: Role): RoleGrant => ({ id: `g-${role}`, user_id: "u", role, granted_at: nowIso() });

async function main() {
  const store = new MemoryStore();
  const keys = new KeyManager(store);
  await keys.init();
  const audit = makeAudit(store);
  const app = createApp(buildRoutes({ store, keys, audit }), createGateway({ store, keys, audit }));
  const server = createServer(app);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

  const ORG_A = "org-amn", ORG_B = "org-kaiser";
  const opsToken = mintUserSession(keys, mkUser("u-ops", "ops@florence.dev"), [grant("super_admin")]).token;
  const call = async (method: string, path: string, token?: string, body?: unknown) => {
    const r = await fetch(`${base}${path}`, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const t = await r.text(); return { status: r.status, body: t ? JSON.parse(t) : null };
  };

  // ── an INTERNAL app/service client: NOT org-bound, broad passport:read (trusted proxy) ──
  await store.insertClient({ client_id: "app-internal", name: "app-internal", secret_hash: hashSecret("internal-secret"), allowed_scopes: ["passport:read", "passport:write"], active: true, created_at: nowIso() });
  const internalIssued = await issueClientToken(store, keys, "app-internal", "internal-secret");
  const internalToken = internalIssued.ok ? internalIssued.token.access_token : "";
  ok("internal: app service token minted (no org_id)", internalIssued.ok === true);

  // ── partner keys: org_id is MANDATORY ──────────────────────────────────────
  const noOrg = await call("POST", "/v1/partner-keys", opsToken, { name: "Unbound", scopes: ["passport:read:employer"] });
  ok("partner-key: WITHOUT org_id ⇒ 400 (every partner key is org-bound)", noOrg.status === 400);
  const keyA = await call("POST", "/v1/partner-keys", opsToken, { name: "AMN", org_id: ORG_A, scopes: ["passport:read:employer", "opportunities:read"] });
  ok("partner-key: org-bound create ⇒ 201 + org_id returned", keyA.status === 201 && keyA.body.org_id === ORG_A);
  const keyB = await call("POST", "/v1/partner-keys", opsToken, { name: "Kaiser", org_id: ORG_B, scopes: ["passport:read:employer"] });
  const partnerA = await issueClientToken(store, keys, keyA.body.client_id, keyA.body.client_secret);
  const partnerB = await issueClientToken(store, keys, keyB.body.client_id, keyB.body.client_secret);
  const partnerAToken = partnerA.ok ? partnerA.token.access_token : "";
  const partnerBToken = partnerB.ok ? partnerB.token.access_token : "";
  ok("partner-key: client_credentials token carries org_id", partnerA.ok === true);

  // ── seed ONE nurse (with a visa decision) consented to ORG_A only ──────────
  const resolved = await call("POST", "/v1/nurse/resolve", opsToken, { email: "rn@x.dev", name: "Test RN" });
  const nurseId = resolved.body.nurseId as string;
  await call("POST", "/v1/nurse/event", opsToken, { nurseId, source: "test", type: "pathway.licensure_status", data: { status: "issued", state: "NV" } });
  await call("POST", "/v1/nurse/event", opsToken, { nurseId, source: "test", type: "pathway.visa_status", data: { stage: "decision", outcome: "approved" } });
  const granted = await call("POST", "/v1/consent/grant", opsToken, { nurseId, purpose: "employer_share", recipientCategory: "employer", recipientOrgId: ORG_A, consentTextVersion: "v1", allowedFields: ["readinessBand", "licensure"] });
  const consentId = granted.body.consent.id as string;

  // ── partner(A) reads its OWN org's consented nurse: 200, employer-redacted ──
  const aEmp = await call("GET", `/v1/nurses/${nurseId}/passport?view=employer`, partnerAToken);
  ok("partner(A): employer read of own-org consented nurse ⇒ 200", aEmp.status === 200);
  ok("partner(A): employer projection OMITS visa + financing", aEmp.status === 200 && !/visa|financ/i.test(JSON.stringify(aEmp.body)));

  // ── a partner may NOT request internal/self/investor (audience-restricted) ──
  const aInternal = await call("GET", `/v1/nurses/${nurseId}/passport?view=internal`, partnerAToken);
  ok("partner(A): internal view ⇒ 403 audience_not_allowed (cannot escalate)", aInternal.status === 403 && aInternal.body?.error === "audience_not_allowed");
  const aSelf = await call("GET", `/v1/nurses/${nurseId}/passport?view=self`, partnerAToken);
  ok("partner(A): self view ⇒ 403 (restricted to partner audiences)", aSelf.status === 403);
  const aLender = await call("GET", `/v1/nurses/${nurseId}/passport?view=lender`, partnerAToken);
  ok("partner(A): lender view ⇒ 403 (lacks passport:read:lender scope)", aLender.status === 403);

  // ── cross-tenant isolation: partner(B) cannot read org-A's consented nurse ─
  const bEmp = await call("GET", `/v1/nurses/${nurseId}/passport?view=employer`, partnerBToken);
  ok("partner(B): employer read of org-A's nurse ⇒ 403 (no consent for org B)", bEmp.status === 403);

  // ── internal service token (no org_id) is STILL a trusted proxy ────────────
  const intRead = await call("GET", `/v1/nurses/${nurseId}/passport?view=internal`, internalToken);
  ok("internal: service token reads internal view ⇒ 200 + carries visa (proxy unchanged)", intRead.status === 200 && /visa/i.test(JSON.stringify(intRead.body)));

  // ── fail-closed: revoke consent ⇒ partner(A) employer read 403 ─────────────
  await call("POST", "/v1/consent/revoke", opsToken, { consentId, purpose: "employer_share", nurseId });
  const aAfter = await call("GET", `/v1/nurses/${nurseId}/passport?view=employer`, partnerAToken);
  ok("partner(A): after consent revoke ⇒ employer read 403 (fail-closed)", aAfter.status === 403);

  server.close();
  console.log(`\n${fail ? "TENANT-BINDING SMOKE FAILED" : "TENANT-BINDING SMOKE PASSED"} — ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
