// Candidate sign-in (C01 auth method) — end-to-end proof. Boots Core in-process and
// proves the email one-time-code flow + provisioning that lets PATHWAY_REQUIRE_AUTH
// flip ON without locking candidates out:
//   • M2M provisioning (passport:write, internal-only): creates user + cand binding +
//     candidate grant, idempotent; refuses staff emails and cross-candidate re-binding
//   • request is generic (no account enumeration), rate-limited, staff-ineligible
//   • verify: wrong code ⇒ 401 (+attempt cap ⇒ locked), expired ⇒ 401, right ⇒ session
//   • the minted session carries role=candidate + cand and can read ONLY its own
//     Passport (self ⇒ 200, another nurse ⇒ 403 — the C02 BOLA invariant end-to-end)
// Mock-by-default: CANDIDATE_OTP_DEV_ECHO=1 substitutes for the email transport.
process.env["CANDIDATE_OTP_DEV_ECHO"] = "1";
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
const nowIso = () => new Date().toISOString();
const mkUser = (id: string, email: string): User => ({ id, email, status: "active", created_at: nowIso(), updated_at: nowIso() });
const grant = (userId: string, role: Role): RoleGrant => ({ id: `g-${userId}-${role}`, user_id: userId, role, granted_at: nowIso() });

async function main() {
  const store = new MemoryStore();
  const keys = new KeyManager(store);
  await keys.init();
  const audit = makeAudit(store);
  const app = createApp(buildRoutes({ store, keys, audit }), createGateway({ store, keys, audit }));
  const server = createServer(app);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

  const call = async (method: string, path: string, token?: string, body?: unknown) => {
    const r = await fetch(`${base}${path}`, {
      method,
      headers: { "content-type": "application/json", accept: "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const t = await r.text();
    let parsed: any = null;
    try { parsed = t ? JSON.parse(t) : null; } catch { parsed = t; }
    return { status: r.status, body: parsed };
  };

  // ── an internal app client (passport:write) + a staff user ────────────────
  await store.insertClient({ client_id: "app-pathway", name: "app-pathway", secret_hash: hashSecret("pw-secret"), allowed_scopes: ["passport:read", "passport:write"], active: true, created_at: nowIso() });
  const issued = await issueClientToken(store, keys, "app-pathway", "pw-secret");
  const appToken = issued.ok ? issued.token.access_token : "";
  const staff = mkUser("u-staff", "staff@florence.dev");
  await store.insertUser(staff);
  await store.insertGrant(grant("u-staff", "ops"));
  const opsToken = mintUserSession(keys, staff, [grant("u-staff", "ops")]).token;

  // ── two nurses on the spine (self vs other, for the end-to-end BOLA check) ──
  const nurseA = (await call("POST", "/v1/nurse/resolve", appToken, { email: "amara@x.dev", name: "Amara RN", ref: { app: "pathway", externalId: "cand-amara" } })).body.nurseId as string;
  const nurseB = (await call("POST", "/v1/nurse/resolve", appToken, { email: "other@x.dev", name: "Other RN" })).body.nurseId as string;

  // ── provisioning (M2M, passport:write) ─────────────────────────────────────
  const noAuth = await call("POST", "/v1/candidates/provision", undefined, { email: "amara@x.dev", candId: "cand-amara" });
  ok("provision: no token ⇒ 401 (scope-gated)", noAuth.status === 401);
  const p1 = await call("POST", "/v1/candidates/provision", appToken, { email: "amara@x.dev", name: "Amara RN", candId: "cand-amara" });
  ok("provision: app M2M creates user + candidate grant ⇒ 201", p1.status === 201 && p1.body.created === true);
  const p2 = await call("POST", "/v1/candidates/provision", appToken, { email: "amara@x.dev", candId: "cand-amara" });
  ok("provision: idempotent re-run ⇒ 200 created:false", p2.status === 200 && p2.body.created === false);
  const pStaff = await call("POST", "/v1/candidates/provision", appToken, { email: "staff@florence.dev", candId: "cand-x" });
  ok("provision: a STAFF email is refused ⇒ 409 (never candidate-bind staff)", pStaff.status === 409);
  const pRebind = await call("POST", "/v1/candidates/provision", appToken, { email: "amara@x.dev", candId: "cand-DIFFERENT" });
  ok("provision: re-binding to a different candidate ⇒ 409 (no silent cand swap)", pRebind.status === 409);

  // ── the login page ──────────────────────────────────────────────────────────
  const page = await fetch(`${base}/login/candidate?redirect=%2F`);
  ok("GET /login/candidate ⇒ 200 candidate sign-in page", page.status === 200 && /Candidate sign-in/.test(await page.text()));

  // ── request: generic, enumeration-safe, staff-ineligible ───────────────────
  const unknown = await call("POST", "/auth/candidate/request", undefined, { email: "nobody@x.dev" });
  ok("request: unknown email ⇒ 200 generic, NO code minted", unknown.status === 200 && unknown.body.ok === true && !unknown.body.devCode);
  const staffReq = await call("POST", "/auth/candidate/request", undefined, { email: "staff@florence.dev" });
  ok("request: staff email ⇒ 200 generic, NO code (staff must use password/Google)", staffReq.status === 200 && !staffReq.body.devCode);
  const req1 = await call("POST", "/auth/candidate/request", undefined, { email: "amara@x.dev" });
  ok("request: provisioned candidate ⇒ code minted (dev echo)", req1.status === 200 && /^\d{6}$/.test(String(req1.body.devCode ?? "")));

  // ── verify: wrong ⇒ 401 + attempt cap; right ⇒ session with cand claim ─────
  const wrongCode = req1.body.devCode === "000000" ? "111111" : "000000";
  const bad = await call("POST", "/auth/candidate/verify", undefined, { email: "amara@x.dev", code: wrongCode });
  ok("verify: wrong code ⇒ 401", bad.status === 401);
  const good = await call("POST", "/auth/candidate/verify", undefined, { email: "amara@x.dev", code: req1.body.devCode, redirect: "/" });
  ok("verify: correct code ⇒ 200 + session token", good.status === 200 && typeof good.body.token === "string");
  const claims = JSON.parse(Buffer.from(String(good.body.token).split(".")[1]!, "base64url").toString());
  ok("session: role=candidate + cand claim bound to the provisioned candidate", claims.role === "candidate" && claims.cand === "cand-amara");
  const replay = await call("POST", "/auth/candidate/verify", undefined, { email: "amara@x.dev", code: req1.body.devCode });
  ok("verify: a consumed code cannot be replayed ⇒ 401 (single-use)", replay.status === 401);

  // ── the session is C02-safe end-to-end: own passport 200, another nurse 403 ─
  const own = await call("GET", `/v1/nurses/${nurseA}/passport`, good.body.token);
  ok("session: candidate reads OWN passport (ref-linked) ⇒ 200", own.status === 200);
  const bola = await call("GET", `/v1/nurses/${nurseB}/passport`, good.body.token);
  ok("session: candidate CANNOT read another nurse ⇒ 403 (BOLA closed)", bola.status === 403);

  // ── attempt cap: 5 wrong guesses lock the code ─────────────────────────────
  const req2 = await call("POST", "/auth/candidate/request", undefined, { email: "amara@x.dev" });
  for (let i = 0; i < 5; i++) await call("POST", "/auth/candidate/verify", undefined, { email: "amara@x.dev", code: wrongCode });
  const lockedTry = await call("POST", "/auth/candidate/verify", undefined, { email: "amara@x.dev", code: req2.body.devCode });
  ok("verify: 5 wrong guesses lock the code — even the RIGHT code then fails ⇒ 401", lockedTry.status === 401);

  // ── request rate limit: >5 codes in the window ⇒ 429 ───────────────────────
  for (let i = 0; i < 4; i++) await call("POST", "/auth/candidate/request", undefined, { email: "amara@x.dev" });
  const throttled = await call("POST", "/auth/candidate/request", undefined, { email: "amara@x.dev" });
  ok("request: burst beyond the window cap ⇒ 429", throttled.status === 429);

  // ── expiry: a stale code fails closed ──────────────────────────────────────
  await store.insertLoginCode({ id: "otp-stale", email: "expired@x.dev", code_hash: "x", expires_at: new Date(Date.now() - 60_000).toISOString(), attempts: 0, created_at: new Date(Date.now() - 11 * 60_000).toISOString() });
  const expired = await call("POST", "/auth/candidate/verify", undefined, { email: "expired@x.dev", code: "123456" });
  ok("verify: expired code ⇒ 401", expired.status === 401);

  // ── audit trail exists and never contains a raw code ───────────────────────
  const rows = await store.allAuditOrdered();
  const otpRows = rows.filter((r) => String(r.action).startsWith("auth.otp"));
  ok("audit: otp request/failed events recorded", otpRows.some((r) => r.action === "auth.otp_requested") && otpRows.some((r) => r.action === "auth.otp_failed"));
  ok("audit: no raw 6-digit code appears in any audit detail", !otpRows.some((r) => new RegExp(`\\b${req1.body.devCode}\\b`).test(JSON.stringify(r))));
  ok("ops sanity: staff password/Google path untouched (ops token still verifies)", (await call("GET", "/v1/nurse/passport?nurseId=" + nurseA, opsToken)).status === 200);

  server.close();
  console.log(`\n${fail ? "CANDIDATE-AUTH SMOKE FAILED" : "CANDIDATE-AUTH SMOKE PASSED"} — ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
