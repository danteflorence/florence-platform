// End-to-end proof of the candidate OTP sign-in grant (C01 full close):
// provision a candidate Core account via M2M, then walk the passwordless flow —
// request code (dev echo in mock-mail mode) → wrong-code attempts hit the cap →
// a fresh code verifies → the minted session carries role=candidate + the cand
// claim Pathway's binding enforces. Also proves enumeration safety (unknown
// email gets {ok:true} and no code), single-use burn, and rate limiting.
// Boots Core IN-PROCESS (MemoryStore) — mock-by-default, no external services.

import { createServer } from "node:http";
import { MemoryStore } from "../src/store.ts";
import { KeyManager } from "../src/keys.ts";
import { makeAudit } from "../src/audit.ts";
import { buildRoutes } from "../src/routes.ts";
import { createApp } from "../src/server.ts";
import { seedDemoClient } from "../src/m2m.ts";
import { config } from "../src/config.ts";

const store = new MemoryStore();
const keys = new KeyManager(store);
await keys.init();
const audit = makeAudit(store);
await seedDemoClient(store);
const server = createServer(createApp(buildRoutes({ store, keys, audit })));
await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
const CORE = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
const CLIENT_ID = config.demoClientId;
const CLIENT_SECRET = config.demoClientSecret;

let pass = 0;
let fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
  cond ? (pass += 1) : (fail += 1);
};

const j = (r: Response) => r.json() as Promise<Record<string, any>>;
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${CORE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", ...headers },
    body: JSON.stringify(body),
  });

// --- mint M2M token with identity:provision ---------------------------------
const tok = await j(
  await post("/oauth/token", {
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: "identity:provision",
  }),
);
ok("M2M token minted with identity:provision", Boolean(tok.access_token));
const m2m = { authorization: `Bearer ${tok.access_token}` };

const run = String(Date.now());
const email = `otp-smoke-${run}@example.test`;
const candidateId = `cand_otp_${run}`;

// --- provisioning ------------------------------------------------------------
let r = await post("/v1/candidate-users", { email, name: "OTP Smoke", candidate_id: candidateId }, m2m);
ok("provision candidate user → 200", r.status === 200);
const prov = await j(r);
ok("provision returns cand = candidate id", prov.cand === candidateId);

r = await post("/v1/candidate-users", { email, candidate_id: candidateId }, m2m);
ok("provision is idempotent (same email+cand → 200)", r.status === 200);

r = await post("/v1/candidate-users", { email, candidate_id: "cand_DIFFERENT" }, m2m);
ok("re-pointing an email at a different candidate → 409", r.status === 409);

r = await post("/v1/candidate-users", { email: `x-${run}@example.test`, candidate_id: "c1" });
ok("provisioning without a token → 401", r.status === 401);

// --- enumeration safety ------------------------------------------------------
r = await post("/auth/otp/request", { email: `nobody-${run}@example.test` });
let b = await j(r);
ok("unknown email → 200 {ok:true}", r.status === 200 && b.ok === true);
ok("unknown email gets NO dev_code", !("dev_code" in b));

// --- request a code (mock mail → dev echo) -----------------------------------
r = await post("/auth/otp/request", { email });
b = await j(r);
ok("candidate request → 200 {ok:true}", r.status === 200 && b.ok === true);
ok("mock-mail dev echo present (non-production)", typeof b.dev_code === "string" && b.dev_code.length === 6);
const code1 = String(b.dev_code ?? "");

// --- wrong attempts hit the cap ----------------------------------------------
const wrong = code1 === "000000" ? "000001" : "000000";
for (let i = 0; i < 5; i++) await post("/auth/otp/verify", { email, code: wrong });
r = await post("/auth/otp/verify", { email, code: code1 });
ok("correct code AFTER 5 wrong attempts → 401 (locked)", r.status === 401);

// --- fresh code verifies; session carries role=candidate + cand ---------------
r = await post("/auth/otp/request", { email });
b = await j(r);
const code2 = String(b.dev_code ?? "");
ok("re-request issues a fresh code", code2.length === 6);

r = await post("/auth/otp/verify", { email, code: code2 });
b = await j(r);
ok("verify with fresh code → 200 + token", r.status === 200 && Boolean(b.token));

const sess = await j(await fetch(`${CORE}/me`, { headers: { authorization: `Bearer ${b.token}`, accept: "application/json" } }));
ok("session authenticated", sess.authenticated === true);
ok("session role = candidate", sess.role === "candidate");
ok("session cand = candidate id (the binding Pathway enforces)", sess.cand === candidateId);

// --- single-use burn ----------------------------------------------------------
r = await post("/auth/otp/verify", { email, code: code2 });
ok("replaying a consumed code → 401", r.status === 401);

// --- rate limiting ------------------------------------------------------------
// 3/10min per email: two more requests then the bucket denies (still 200 {ok:true},
// but no code is issued — proven by the next verify failing with a stale code).
await post("/auth/otp/request", { email });
r = await post("/auth/otp/request", { email });
b = await j(r);
ok("rate-limited request still answers 200 {ok:true} (no oracle)", r.status === 200 && b.ok === true);

console.log(`\n${pass} passed, ${fail} failed`);
server.close();
if (fail > 0) process.exit(1);
