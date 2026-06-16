// End-to-end smoke test for the reference service. Builds the deps in-process
// (so we can inspect the audit + webhook sinks), starts the server, and drives
// it over real HTTP. Run: `node test/smoke.ts` (or `npm test`).

import { strict as assert } from "node:assert";

// Set env BEFORE importing config (dynamic import so it reads these).
process.env["PORT"] = "8099";
process.env["DEMO_CLIENT_ID"] = "smoke-crm";
process.env["DEMO_CLIENT_SECRET"] = "smoke-secret-123";
process.env["API_JWT_SECRET"] = "smoke-jwt-secret-deadbeef";
process.env["CORS_ALLOWED_ORIGINS"] = "https://app.florence.academy";
// Headroom so the dense end-to-end sequence isn't throttled by the GENERAL
// limiter. The tighter AUTH limiter + lockout (section 5g) are hardcoded and
// unaffected by these.
process.env["RATE_LIMIT_CAPACITY"] = "2000";
process.env["RATE_LIMIT_REFILL_PER_SEC"] = "2000";
process.env["DRIP_TICK_SECRET"] = "smoke-drip-secret";
process.env["DRIP_STAGE_INTERVAL_DAYS"] = "0,0,0,0,0,0"; // no waiting in tests

const { config } = await import("../src/config.ts");
const { MemoryStore } = await import("../src/store.ts");
const { MemoryAuditSink } = await import("../src/audit.ts");
const { WebhookEmitter } = await import("../src/webhooks.ts");
const { createServer } = await import("../src/server.ts");
const { verifyWebhook } = await import("../src/crypto.ts");
const { seedDemoClient } = await import("../src/auth.ts");
const { MemoryRevocations } = await import("../src/revocations.ts");
const { MockPaymentProvider } = await import("../src/payments.ts");
const { MockEmailProvider } = await import("../src/email.ts");
const { MockPathwayClient } = await import("../src/pathway.ts");

const deps = {
  store: new MemoryStore(),
  audit: new MemoryAuditSink(false),
  webhooks: new WebhookEmitter(config.webhookSecret),
  revocations: new MemoryRevocations(),
  payments: new MockPaymentProvider("http://localhost:5174"),
  email: new MockEmailProvider(),
  pathway: new MockPathwayClient(),
};
await seedDemoClient(deps.store);
const server = createServer(deps);
await new Promise<void>((resolve) => server.listen(config.port, resolve));
const base = `http://localhost:${config.port}`;

let passed = 0;
const ok = (label: string) => {
  passed++;
  console.log(`  ✓ ${label}`);
};
const bearer = (t: string) => ({ authorization: `Bearer ${t}` });

async function token(scope?: string, secret = "smoke-secret-123") {
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: "smoke-crm",
    client_secret: secret,
  });
  if (scope) params.set("scope", scope);
  const res = await fetch(`${base}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = (await res.json().catch(() => null)) as any;
  return { status: res.status, json };
}

try {
  // 1) OAuth2 client-credentials
  const wrong = await token(undefined, "wrong-secret");
  assert.equal(wrong.status, 401);
  ok("wrong client secret → 401");

  const full = await token(
    "candidates:read candidates:write enrollment:read enrollment:write performance:read performance:write payments:read outcomes:read outcomes:write employer:read university:read schools:read schools:write pathway:write clients:manage tokens:mint cohorts:read cohorts:write",
  );
  assert.equal(full.status, 200);
  assert.ok(full.json.access_token);
  const T: string = full.json.access_token;
  ok("client-credentials grant → scoped token");

  // CORS allowlist (preflight): allowed origin → 204 + ACAO; others → 403, no ACAO
  const pf = await fetch(`${base}/v1/candidates`, {
    method: "OPTIONS",
    headers: { origin: "https://app.florence.academy", "access-control-request-method": "POST" },
  });
  assert.equal(pf.status, 204);
  assert.equal(pf.headers.get("access-control-allow-origin"), "https://app.florence.academy");
  const pfBad = await fetch(`${base}/v1/candidates`, {
    method: "OPTIONS",
    headers: { origin: "https://evil.example", "access-control-request-method": "POST" },
  });
  assert.equal(pfBad.status, 403);
  assert.equal(pfBad.headers.get("access-control-allow-origin"), null);
  ok("CORS preflight: allowlisted origin → 204, others → 403");

  // 2) Create candidate + idempotency replay
  const makeCandidate = () =>
    fetch(`${base}/v1/candidates`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "idem-1", ...bearer(T) },
      body: JSON.stringify({ full_name: "Maria Santos", country: "PH" }),
    });
  const c1 = await makeCandidate();
  const c1j = (await c1.json()) as any;
  assert.equal(c1.status, 201);
  assert.match(c1j.id, /^cand_/);
  ok("create candidate → 201");
  const c2j = (await (await makeCandidate()).json()) as any;
  assert.equal(c2j.id, c1j.id);
  ok("idempotency-key replay → same record");
  const candId: string = c1j.id;

  // 2b) Request validation: malformed body → 400 validation_error with fields
  const badReq = await fetch(`${base}/v1/assessment-results`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ candidate_id: candId, kind: "bogus", readiness: 2 }),
  });
  const badJson = (await badReq.json()) as any;
  assert.equal(badReq.status, 400);
  assert.equal(badJson.error.code, "validation_error");
  const badFields = (badJson.error.fields ?? []).map((f: any) => f.field);
  assert.ok(badFields.includes("kind") && badFields.includes("readiness"));
  ok("malformed body → 400 validation_error with per-field detail");

  // 3) Scope enforcement
  const ro = await token("candidates:read");
  const denied = await fetch(`${base}/v1/candidates`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(ro.json.access_token) },
    body: JSON.stringify({ full_name: "No Scope" }),
  });
  assert.equal(denied.status, 403);
  ok("write without candidates:write → 403");

  // 4) Append-only assessment result + signed webhook
  const ar = await fetch(`${base}/v1/assessment-results`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ candidate_id: candId, kind: "timed", readiness: 0.78, theta: 0.42, items_completed: 75 }),
  });
  const arj = (await ar.json()) as any;
  assert.equal(ar.status, 201);
  assert.ok(typeof arj.content_hash === "string" && arj.content_hash.length === 64);
  ok("append assessment-result → 201 with content_hash");

  const wh = deps.webhooks.recent().at(-1);
  if (!wh) throw new Error("expected a webhook to be emitted");
  assert.equal(wh.event.type, "assessment_result.created");
  ok("assessment_result.created webhook emitted");
  assert.ok(verifyWebhook(config.webhookSecret, wh.signature, wh.body, Math.floor(Date.now() / 1000)));
  ok("webhook HMAC signature verifies");
  assert.ok(!verifyWebhook(config.webhookSecret, wh.signature, wh.body + "x", Math.floor(Date.now() / 1000)));
  ok("tampered webhook body → signature fails");

  // 5) Purpose limitation: underwriting read needs explicit consent
  const blocked = await fetch(`${base}/v1/assessment-results?candidate_id=${candId}`, {
    headers: { ...bearer(T), "x-purpose": "underwriting" },
  });
  assert.equal(blocked.status, 403);
  ok("underwriting read without consent → 403");

  const patched = await fetch(`${base}/v1/candidates/${candId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ consent: { underwriting: true } }),
  });
  assert.equal(patched.status, 200);
  ok("grant underwriting consent (PATCH) → 200");

  const allowed = await fetch(`${base}/v1/assessment-results?candidate_id=${candId}`, {
    headers: { ...bearer(T), "x-purpose": "underwriting" },
  });
  assert.equal(allowed.status, 200);
  ok("underwriting read with consent → 200");

  // 5b) Partner client registry: create → least-privilege token → rotate
  const created = await fetch(`${base}/v1/clients`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ client_id: "partner-x", name: "Partner X", secret: "ps1-secret", scopes: ["candidates:read"] }),
  });
  assert.equal(created.status, 201);
  ok("create partner client (clients:manage) → 201");

  const partnerTok = async (secret: string) => {
    const res = await fetch(`${base}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: "partner-x", client_secret: secret }),
    });
    return { status: res.status, json: (await res.json().catch(() => null)) as any };
  };
  const pt = await partnerTok("ps1-secret");
  assert.equal(pt.status, 200);
  const pwrite = await fetch(`${base}/v1/candidates`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(pt.json.access_token) },
    body: JSON.stringify({ full_name: "Nope" }),
  });
  assert.equal(pwrite.status, 403);
  ok("partner token honors least-privilege (write → 403)");

  const rot = await fetch(`${base}/v1/clients/partner-x/rotate`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ secret: "ps2-secret" }),
  });
  assert.equal(rot.status, 200);
  assert.equal((await partnerTok("ps1-secret")).status, 401);
  assert.equal((await partnerTok("ps2-secret")).status, 200);
  ok("rotate secret → old revoked, new works");

  // 5c) Session token exchange: downscoped + candidate-bound (browser-safe)
  const candB = (await (
    await fetch(`${base}/v1/candidates`, {
      method: "POST",
      headers: { "content-type": "application/json", ...bearer(T) },
      body: JSON.stringify({ full_name: "Other Candidate" }),
    })
  ).json()) as any;

  const mint = await fetch(`${base}/v1/tokens/session`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ candidate_id: candId, scopes: ["performance:write", "performance:read"], ttl_sec: 600 }),
  });
  const mintJson = (await mint.json()) as any;
  assert.equal(mint.status, 201);
  assert.ok(mintJson.access_token);
  ok("mint candidate-bound session token → 201");
  const S: string = mintJson.access_token;

  const own = await fetch(`${base}/v1/assessment-results`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(S) },
    body: JSON.stringify({ candidate_id: candId, kind: "tutor", readiness: 0.6, items_completed: 10 }),
  });
  assert.equal(own.status, 201);
  ok("session token writes its OWN candidate → 201");

  const cross = await fetch(`${base}/v1/assessment-results`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(S) },
    body: JSON.stringify({ candidate_id: candB.id, kind: "tutor", readiness: 0.6, items_completed: 10 }),
  });
  assert.equal(cross.status, 403);
  const crossRead = await fetch(`${base}/v1/assessment-results?candidate_id=${candB.id}`, { headers: bearer(S) });
  assert.equal(crossRead.status, 403);
  ok("session token blocked from a different candidate (read + write) → 403");

  const reMint = await fetch(`${base}/v1/tokens/session`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(S) },
    body: JSON.stringify({ candidate_id: candId, scopes: ["performance:write"] }),
  });
  assert.equal(reMint.status, 403);
  const noMint = await fetch(`${base}/v1/tokens/session`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(pt.json.access_token) },
    body: JSON.stringify({ candidate_id: candId, scopes: ["performance:write"] }),
  });
  assert.equal(noMint.status, 403);
  ok("token minting requires tokens:mint (session + unscoped client → 403)");

  // 5d) Introspection + revocation (logout)
  const introspect = async (token: string) => {
    const res = await fetch(`${base}/v1/tokens/introspect`, {
      method: "POST",
      headers: { "content-type": "application/json", ...bearer(T) },
      body: JSON.stringify({ token }),
    });
    return (await res.json()) as any;
  };
  const introS = await introspect(S);
  assert.equal(introS.active, true);
  assert.equal(introS.cand, candId);
  ok("introspect active session token → active:true with candidate binding");

  const revoke = await fetch(`${base}/v1/tokens/revoke`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(S) },
    body: "{}",
  });
  assert.equal(revoke.status, 200);
  const afterRevoke = await fetch(`${base}/v1/assessment-results?candidate_id=${candId}`, { headers: bearer(S) });
  assert.equal(afterRevoke.status, 401);
  assert.equal((await introspect(S)).active, false);
  ok("revoke (logout) → token rejected (401) and introspects as inactive");

  // 5e) Multi-cohort: schedule a capped cohort, enforce capacity, read roster
  const cohortRes = await fetch(`${base}/v1/cohorts`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ code: "MNL-CAP2", name: "Manila Capacity 2", capacity: 2, status: "scheduled" }),
  });
  const cohortJson = (await cohortRes.json()) as any;
  assert.equal(cohortRes.status, 201);
  const cohortId: string = cohortJson.id;
  assert.equal(
    (await fetch(`${base}/v1/cohorts`, {
      method: "POST",
      headers: { "content-type": "application/json", ...bearer(T) },
      body: JSON.stringify({ code: "MNL-CAP2", name: "dup", capacity: 5 }),
    })).status,
    409,
  );
  ok("create cohort → 201; duplicate code → 409");

  const enroll = (cid: string) =>
    fetch(`${base}/v1/enrollments`, {
      method: "POST",
      headers: { "content-type": "application/json", ...bearer(T) },
      body: JSON.stringify({ candidate_id: cid, cohort: "MNL-CAP2" }),
    });
  assert.equal((await enroll(candId)).status, 201);
  assert.equal((await enroll(candB.id)).status, 201);
  const overflow = await enroll(candId);
  assert.equal(overflow.status, 409);
  assert.equal(((await overflow.json()) as any).error.code, "cohort_full");
  ok("enroll past cohort capacity → 409 cohort_full");

  const rosterJson = (await (await fetch(`${base}/v1/cohorts/${cohortId}/roster`, { headers: bearer(T) })).json()) as any;
  assert.equal(rosterJson.count, 2);
  assert.equal(rosterJson.capacity, 2);
  // The members[] projection joins candidate names + readiness band so the
  // instructor dashboard renders the roster in one round-trip.
  assert.ok(Array.isArray(rosterJson.members));
  assert.equal(rosterJson.members.length, 2);
  assert.ok(rosterJson.members[0].full_name);
  assert.ok(rosterJson.members[0].readiness_band);
  ok("cohort roster → count reflects enrollments + members[] joined");

  // Bump coverage via the instructor endpoint. Either id or code works.
  const cov1 = await fetch(`${base}/v1/cohorts/${cohortId}/coverage`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ covered_through_section: 3 }),
  });
  assert.equal(cov1.status, 200);
  assert.equal(((await cov1.json()) as any).covered_through_section, 3);
  ok("PATCH coverage by id → 200 with covered_through_section persisted");

  const covByCode = await fetch(`${base}/v1/cohorts/MNL-CAP2/coverage`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ covered_through_section: 5 }),
  });
  assert.equal(covByCode.status, 200);
  ok("PATCH coverage accepts cohort code (instructor UX)");

  // Regression guard — must reject without override:true.
  const regress = await fetch(`${base}/v1/cohorts/${cohortId}/coverage`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ covered_through_section: 2 }),
  });
  assert.equal(regress.status, 409);
  assert.equal(((await regress.json()) as any).error.code, "coverage_regression");
  ok("PATCH coverage regression → 409 coverage_regression");

  // Same regression with override → 200.
  const override = await fetch(`${base}/v1/cohorts/${cohortId}/coverage`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ covered_through_section: 2, override: true }),
  });
  assert.equal(override.status, 200);
  ok("PATCH coverage with override:true allows decrease (mistake recovery)");

  // Public projection includes the watermark.
  const pubAfter = (await (await fetch(`${base}/v1/public/cohorts`)).json()) as any;
  const mnlPub = pubAfter.data.find((c: any) => c.code === "MNL-CAP2");
  assert.equal(mnlPub.covered_through_section, 2);
  ok("public /v1/public/cohorts surfaces covered_through_section");

  // 5f) Candidate end-user auth → progress → readiness (the learner-app substrate)
  const signup = async (email: string, password: string, full_name = "Ana Reyes") => {
    const res = await fetch(`${base}/v1/auth/signup`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ full_name, email, password, country: "PH" }),
    });
    return { status: res.status, json: (await res.json().catch(() => null)) as any };
  };
  const su = await signup("ana@example.com", "supersecret1");
  assert.equal(su.status, 201);
  assert.match(su.json.candidate.id, /^cand_/);
  assert.ok(su.json.token.access_token);
  assert.ok(su.json.token.scope.includes("performance:write"));
  ok("candidate signup → 201 with candidate-bound session token");
  const meId: string = su.json.candidate.id;
  const CS: string = su.json.token.access_token;

  assert.equal((await signup("ana@example.com", "another1pass")).status, 409);
  ok("duplicate email signup → 409");

  const loginBad = await fetch(`${base}/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "ana@example.com", password: "wrongpass" }),
  });
  assert.equal(loginBad.status, 401);
  ok("login with wrong password → 401");

  const login = await fetch(`${base}/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "ANA@example.com", password: "supersecret1" }),
  });
  const loginJson = (await login.json()) as any;
  assert.equal(login.status, 200);
  assert.equal(loginJson.candidate.id, meId);
  ok("login (case-insensitive email) → 200, same candidate");

  const me = await fetch(`${base}/v1/me`, { headers: bearer(CS) });
  const meJson = (await me.json()) as any;
  assert.equal(me.status, 200);
  assert.equal(meJson.id, meId);
  ok("GET /v1/me with session token → own candidate");

  await fetch(`${base}/v1/candidates/${meId}/progress`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(CS) },
    body: JSON.stringify({ section_slug: "section-8-respiratory", status: "in_progress", percent: 40 }),
  });
  const prog2 = await fetch(`${base}/v1/candidates/${meId}/progress`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(CS) },
    body: JSON.stringify({ section_slug: "section-8-respiratory", status: "completed", percent: 100 }),
  });
  assert.equal(prog2.status, 200);
  const progList = (await (await fetch(`${base}/v1/candidates/${meId}/progress`, { headers: bearer(CS) })).json()) as any;
  assert.equal(progList.progress.length, 1); // upsert merged to one row
  assert.equal(progList.progress[0].status, "completed");
  assert.equal(progList.progress[0].percent, 100);
  ok("progress upsert (own) merges to one row + reads back");

  const progCross = await fetch(`${base}/v1/candidates/${candId}/progress`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(CS) },
    body: JSON.stringify({ section_slug: "section-1-orientation", percent: 10 }),
  });
  assert.equal(progCross.status, 403);
  ok("session token blocked from another candidate's progress → 403");

  const arOwn = await fetch(`${base}/v1/assessment-results`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(CS) },
    body: JSON.stringify({
      candidate_id: meId,
      kind: "diagnostic",
      readiness: 0.58,
      theta: -0.1,
      items_completed: 30,
      by_client_need: { "pharmacological-therapies": 0.4, "management-of-care": 0.7 },
    }),
  });
  assert.equal(arOwn.status, 201);
  ok("session token writes its own assessment result → 201");

  const readiness = (await (await fetch(`${base}/v1/candidates/${meId}/readiness`, { headers: bearer(CS) })).json()) as any;
  assert.equal(readiness.band, "orange"); // 0.58 → orange band (0.50–0.65)
  assert.equal(readiness.sections_completed, 1);
  assert.equal(readiness.sections_total, 20);
  assert.ok(readiness.focus_areas.includes("pharmacological-therapies")); // weakest need
  ok("readiness snapshot: band + progress rollup + weakest focus area");

  // 5g) Auth hardening: weak-password rejection + failed-login lockout
  const weak = await fetch(`${base}/v1/auth/signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ full_name: "Weak Pass", email: "weak@example.com", password: "password" }),
  });
  assert.equal(weak.status, 400);
  assert.equal(((await weak.json()) as any).error.code, "weak_password");
  ok("signup rejects a common/weak password → 400 weak_password");

  await signup("lockme@example.com", "supersecret1");
  const tryLogin = (pw: string) =>
    fetch(`${base}/v1/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "lockme@example.com", password: pw }),
    });
  let lastWrong = 0;
  for (let i = 0; i < 6; i++) lastWrong = (await tryLogin("wrongwrong")).status;
  assert.equal(lastWrong, 401); // 6th failure trips the lock but still answers 401
  const locked = await tryLogin("wrongwrong");
  assert.equal(locked.status, 429);
  assert.equal(((await locked.json()) as any).error.code, "account_locked");
  assert.equal((await tryLogin("supersecret1")).status, 429); // correct pw still locked
  ok("6 failed logins → account locked (429); correct password stays locked");

  // 5h) Deposit checkout (mock provider) → mock-complete → paid + funnel advance
  await fetch(`${base}/v1/cohorts`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ code: "PAY-COHORT", name: "Pay Cohort" }),
  });
  await fetch(`${base}/v1/enrollments`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ candidate_id: meId, cohort: "PAY-COHORT", status: "registered" }),
  });
  const checkout = await fetch(`${base}/v1/payments/checkout`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(CS) },
    body: "{}",
  });
  const cj = (await checkout.json()) as any;
  assert.equal(checkout.status, 201);
  assert.equal(cj.provider, "mock");
  assert.equal(cj.amount_cents, 10000);
  assert.ok(String(cj.checkout_url).includes("/checkout/mock"));
  ok("candidate starts a $100 deposit checkout (mock) → 201 with hosted URL");

  const complete = await fetch(`${base}/v1/payments/${cj.payment_id}/mock-complete`, { method: "POST" });
  assert.equal(complete.status, 200);
  ok("mock-complete marks the deposit paid");

  const pays = (await (await fetch(`${base}/v1/payments?candidate_id=${meId}`, { headers: bearer(T) })).json()) as any;
  assert.ok(pays.data.some((p: any) => p.status === "paid" && p.kind === "commitment_deposit"));
  const enrsRes = await fetch(`${base}/v1/enrollments?limit=200`, { headers: bearer(T) });
  const enrs = (await enrsRes.json()) as any;
  if (!enrs.data) throw new Error(`enrollments list: ${enrsRes.status} ${JSON.stringify(enrs)}`);
  const mine = enrs.data.find((e: any) => e.candidate_id === meId && e.cohort === "PAY-COHORT");
  assert.equal(mine.status, "deposit_paid");
  ok("deposit paid → payment recorded + enrollment advanced to deposit_paid");

  // 5h.5) The candidate can see their cohort + its coverage watermark.
  // PAY-COHORT was just created; bump it via the operator token.
  const payCohortGet = (await (await fetch(`${base}/v1/cohorts?limit=200`, { headers: bearer(T) })).json()) as any;
  const payCohort = payCohortGet.data.find((c: any) => c.code === "PAY-COHORT");
  assert.ok(payCohort, "PAY-COHORT not found");
  await fetch(`${base}/v1/cohorts/${payCohort.id}/coverage`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ covered_through_section: 6 }),
  });
  const myCohort = await fetch(`${base}/v1/me/cohort`, { headers: bearer(CS) });
  assert.equal(myCohort.status, 200);
  const mc = (await myCohort.json()) as any;
  assert.equal(mc.code, "PAY-COHORT");
  assert.equal(mc.covered_through_section, 6);
  assert.equal(mc.enrollment_status, "deposit_paid");
  // Belt-and-suspenders: never leak instructor_ref or internal id.
  assert.equal(mc.instructor_ref, undefined);
  assert.equal(mc.id, undefined);
  ok("/v1/me/cohort returns the candidate's enrolled cohort + watermark");

  // 5h.6) Candidate self-enroll (closes the public landing → deposit loop).
  // Create a fresh cohort so we can self-enroll cleanly.
  const selfCohort = await fetch(`${base}/v1/cohorts`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ code: "SELF-ENROLL-1", name: "Self-Enroll Test", status: "scheduled", capacity: 4 }),
  });
  assert.equal(selfCohort.status, 201);

  // Already enrolled in PAY-COHORT — second enrollment in SELF-ENROLL-1 is fine.
  const selfOk = await fetch(`${base}/v1/enrollments`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(CS) },
    body: JSON.stringify({ candidate_id: meId, cohort: "SELF-ENROLL-1", status: "deposit_paid" }),
  });
  assert.equal(selfOk.status, 201);
  ok("candidate self-enrolls into a second cohort with status=deposit_paid (deposit was paid)");

  // Idempotency: a second self-enroll into the same cohort → 409 already_enrolled.
  const selfDup = await fetch(`${base}/v1/enrollments`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(CS) },
    body: JSON.stringify({ candidate_id: meId, cohort: "SELF-ENROLL-1", status: "deposit_paid" }),
  });
  assert.equal(selfDup.status, 409);
  assert.equal(((await selfDup.json()) as any).error.code, "already_enrolled");
  ok("candidate re-enrolls in the same cohort → 409 already_enrolled");

  // A closed cohort refuses self-enrollment with 410.
  await fetch(`${base}/v1/cohorts`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ code: "CLOSED-1", name: "Closed", status: "completed" }),
  });
  const closedTry = await fetch(`${base}/v1/enrollments`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(CS) },
    body: JSON.stringify({ candidate_id: meId, cohort: "CLOSED-1", status: "registered" }),
  });
  assert.equal(closedTry.status, 410);
  assert.equal(((await closedTry.json()) as any).error.code, "cohort_closed");
  ok("candidate self-enroll → 410 cohort_closed when cohort.status=completed");

  // Unknown cohort → 404 not_found.
  const unknownCohort = await fetch(`${base}/v1/enrollments`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(CS) },
    body: JSON.stringify({ candidate_id: meId, cohort: "NOPE-9999", status: "registered" }),
  });
  assert.equal(unknownCohort.status, 404);
  ok("candidate self-enroll → 404 not_found when cohort code is unknown");

  // Status the candidate hasn't earned → 403 forbidden.
  await fetch(`${base}/v1/cohorts`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ code: "FORBID-1", name: "Forbidden", status: "scheduled" }),
  });
  const forbidStatus = await fetch(`${base}/v1/enrollments`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(CS) },
    body: JSON.stringify({ candidate_id: meId, cohort: "FORBID-1", status: "completed" }),
  });
  assert.equal(forbidStatus.status, 403);
  ok("candidate self-enroll with elevated status → 403 forbidden");

  // 5i) Email verification (mock provider surfaces the dev link)
  const devUrl: string = su.json.email_verification?.dev_url ?? "";
  assert.ok(devUrl.includes("/academy/verify?token="));
  ok("signup sends a verification email (mock dev link present)");
  const vtoken = decodeURIComponent(devUrl.split("token=")[1] ?? "");

  const meBefore = (await (await fetch(`${base}/v1/me`, { headers: bearer(CS) })).json()) as any;
  assert.equal(meBefore.email_verified, false);

  const verify = await fetch(`${base}/v1/auth/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: vtoken }),
  });
  assert.equal(verify.status, 200);
  const meAfter = (await (await fetch(`${base}/v1/me`, { headers: bearer(CS) })).json()) as any;
  assert.equal(meAfter.email_verified, true);
  ok("verify token → /v1/me reflects email_verified true");

  const reverify = await fetch(`${base}/v1/auth/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: vtoken }),
  });
  assert.equal(reverify.status, 400);
  ok("verification token is single-use (replay → 400)");

  // 5j) Production outcomes (append-only) + conversion funnel
  const recordOutcome = (kind: string, extra: Record<string, unknown> = {}) =>
    fetch(`${base}/v1/outcomes`, {
      method: "POST",
      headers: { "content-type": "application/json", ...bearer(T) },
      body: JSON.stringify({ candidate_id: meId, kind, ...extra }),
    });
  assert.equal((await recordOutcome("nclex_result", { status: "pass" })).status, 201);
  assert.equal((await recordOutcome("start")).status, 201);
  assert.equal((await recordOutcome("repayment", { status: "active", amount_cents: 5000 })).status, 201);
  ok("record outcomes (nclex pass, start, repayment) → 201 append-only");

  const funnel = (await (await fetch(`${base}/v1/outcomes/funnel`, { headers: bearer(T) })).json()) as any;
  assert.ok(funnel.nclex_pass >= 1 && funnel.start >= 1 && funnel.repayment_active >= 1);
  ok("outcomes funnel rolls up distinct-candidate milestones");

  const ocList = (await (await fetch(`${base}/v1/outcomes?candidate_id=${meId}`, { headers: bearer(T) })).json()) as any;
  assert.ok(ocList.data.length >= 3);
  ok("list outcomes by candidate");

  assert.equal((await fetch(`${base}/v1/outcomes`, { headers: bearer(CS) })).status, 403);
  ok("candidate session cannot read outcomes (missing scope → 403)");

  // 5k) Readiness routing + Pathway Agent handoff (mock dry-run)
  const rd = (await (await fetch(`${base}/v1/candidates/${meId}/readiness`, { headers: bearer(T) })).json()) as any;
  assert.ok(["interview_ready", "repeat", "bridge", "credential_repair", "in_progress"].includes(rd.route));
  assert.ok(typeof rd.next_action === "string" && rd.next_action.length > 0);
  ok("readiness includes a Day-5 route + learner next-best-action");

  const handoffAsSession = await fetch(`${base}/v1/candidates/${meId}/pathway-handoff`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(CS) },
    body: "{}",
  });
  assert.equal(handoffAsSession.status, 403);
  ok("candidate session cannot trigger pathway handoff (operator action → 403)");

  // Without consent.pathway, the handoff is refused.
  const handoffNoConsent = await fetch(`${base}/v1/candidates/${meId}/pathway-handoff`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: "{}",
  });
  assert.equal(handoffNoConsent.status, 403);
  assert.equal(((await handoffNoConsent.json()) as any).error.code, "pathway_consent_required");
  ok("pathway handoff without consent → 403 pathway_consent_required");

  // Grant pathway consent.
  await fetch(`${base}/v1/candidates/${meId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ consent: { pathway: true } }),
  });

  const handoff = (await (
    await fetch(`${base}/v1/candidates/${meId}/pathway-handoff`, {
      method: "POST",
      headers: { "content-type": "application/json", ...bearer(T) },
      body: "{}",
    })
  ).json()) as any;
  assert.equal(handoff.handed_off, true);
  assert.equal(handoff.dry_run, true);
  assert.equal(handoff.intake.source, "florence-academy");
  assert.equal(handoff.intake.candidate.id, meId);
  ok("operator pathway handoff with consent → Pathway Agent intake (mock dry-run)");

  // 5l) Instructor Copilot — cohort analytics (PAY-COHORT has ana, orange band)
  const copilot = (await (await fetch(`${base}/v1/cohorts/PAY-COHORT/copilot`, { headers: bearer(T) })).json()) as any;
  assert.equal(copilot.cohort, "PAY-COHORT");
  assert.ok(copilot.candidates >= 1);
  assert.ok(copilot.routing.bridge.includes(meId)); // orange → bridge route
  assert.ok(copilot.fallers.some((f: any) => f.candidate_id === meId));
  assert.equal(copilot.top_reteach[0].client_need, "pharmacological-therapies"); // weakest need
  ok("instructor copilot: routing draft + fallers + reteach priorities");

  // 5m) Partner surfaces — employer interview packets + university overview
  const green = (await (
    await fetch(`${base}/v1/candidates`, {
      method: "POST",
      headers: { "content-type": "application/json", ...bearer(T) },
      body: JSON.stringify({ full_name: "Ready Grad", country: "PH" }),
    })
  ).json()) as any;
  await fetch(`${base}/v1/assessment-results`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({
      candidate_id: green.id,
      kind: "adaptive_exam",
      readiness: 0.88,
      items_completed: 75,
      by_client_need: { "management-of-care": 0.9, "pharmacological-therapies": 0.6 },
    }),
  });
  // BEFORE granting employer_sharing consent: the candidate must NOT appear,
  // and an offer attempt against them must be refused.
  const empBefore = (await (await fetch(`${base}/v1/employer/candidates`, { headers: bearer(T) })).json()) as any;
  assert.ok(!empBefore.data.some((p: any) => p.candidate_id === green.id));
  const offerBlocked = await fetch(`${base}/v1/employer/offers`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ candidate_id: green.id, status: "offered" }),
  });
  assert.equal(offerBlocked.status, 403);
  assert.equal(((await offerBlocked.json()) as any).error.code, "employer_consent_required");
  ok("no employer_sharing consent → candidate hidden + offer blocked (403)");

  // Grant employer_sharing consent.
  await fetch(`${base}/v1/candidates/${green.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ consent: { employer_sharing: true } }),
  });

  const empCands = (await (await fetch(`${base}/v1/employer/candidates`, { headers: bearer(T) })).json()) as any;
  const packet = empCands.data.find((p: any) => p.candidate_id === green.id);
  assert.ok(packet, "expected the green candidate in employer packets after consent");
  assert.equal(packet.band, "green");
  assert.ok(!("amount_cents" in packet) && !("expected_arr" in packet)); // no financials cross the boundary
  assert.ok(Array.isArray(packet.strengths) && Array.isArray(packet.focus_areas));
  ok("employer sees readiness-cleared interview packets (no financials)");

  const offer = await fetch(`${base}/v1/employer/offers`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ candidate_id: green.id, status: "offered" }),
  });
  assert.equal(offer.status, 201);
  ok("employer issues a contingent offer → outcome recorded");

  const uni = (await (await fetch(`${base}/v1/university/overview`, { headers: bearer(T) })).json()) as any;
  assert.ok(uni.candidates >= 1 && uni.band_counts.green >= 1);
  assert.ok(Array.isArray(uni.top_gaps) && !("expected_arr" in uni)); // education only
  ok("university overview: readiness distribution + gaps (no financials)");

  // 5n) Live Lab attendance (append-only) + rollup
  const recAtt = (cid: string, st: string, location?: string) =>
    fetch(`${base}/v1/attendance`, {
      method: "POST",
      headers: { "content-type": "application/json", ...bearer(T) },
      body: JSON.stringify({
        candidate_id: cid,
        session_date: "2026-06-01",
        status: st,
        cohort: "PAY-COHORT",
        ...(location && { location }),
      }),
    });
  assert.equal((await recAtt(meId, "present", "Manila Hotel")).status, 201);
  assert.equal((await recAtt(green.id, "present", "Manila Hotel")).status, 201);
  assert.equal((await recAtt(candId, "absent")).status, 201);
  const rollup = (await (await fetch(`${base}/v1/attendance/rollup`, { headers: bearer(T) })).json()) as any;
  assert.ok(rollup.total_records >= 3);
  assert.ok(rollup.live_lab_attendees >= 2);
  assert.ok(rollup.by_location.some((l: any) => l.location === "Manila Hotel" && l.attendees >= 2));
  ok("attendance rollup: live-lab attendees + by-location");

  // 5o) Schools directory + affiliations + tiered deposit + K-anon report

  // Public list is no-auth.
  const publicList = await fetch(`${base}/v1/schools`);
  assert.equal(publicList.status, 200);
  ok("public schools list requires no auth");

  // Admin: create three schools (1 with an email_domain).
  await fetch(`${base}/v1/schools`, {
    method: "POST", headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ slug: "FLR-DEMO-A", name: "Demo School A", country: "PH", email_domains: ["demoa.edu"] }),
  });
  await fetch(`${base}/v1/schools`, {
    method: "POST", headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ slug: "FLR-DEMO-B", name: "Demo School B", country: "PH" }),
  });
  assert.equal(
    (await fetch(`${base}/v1/schools`, {
      method: "POST", headers: { "content-type": "application/json", ...bearer(T) },
      body: JSON.stringify({ slug: "FLR-DEMO-A", name: "dup", country: "PH" }),
    })).status, 409);
  ok("admin can create schools; duplicate slug → 409");

  // Public list redacts contact/email/outreach.
  const pub = (await (await fetch(`${base}/v1/schools`)).json()) as any;
  const demoA = pub.data.find((s: any) => s.slug === "FLR-DEMO-A");
  assert.ok(demoA);
  assert.equal(demoA.contact_email, undefined);
  assert.equal(demoA.email_domains, undefined);
  assert.equal(demoA.outreach_status, undefined);
  ok("public schools listing redacts contact + email_domains + outreach status");

  // Candidate self-attests an affiliation; deposit drops from $100 → $75.
  const aff = await fetch(`${base}/v1/candidates/${meId}/affiliations`, {
    method: "POST", headers: { "content-type": "application/json", ...bearer(CS) },
    body: JSON.stringify({ school_slug: "FLR-DEMO-A", role: "student" }),
  });
  assert.equal(aff.status, 201);
  const affJson = (await aff.json()) as any;
  assert.equal(affJson.verification, "self_attested"); // ana's email isn't @demoa.edu
  ok("candidate self-attestation → 201 with verification=self_attested");

  const co = (await (await fetch(`${base}/v1/payments/checkout`, {
    method: "POST", headers: { "content-type": "application/json", ...bearer(CS) }, body: "{}",
  })).json()) as any;
  assert.equal(co.amount_cents, 7500);
  ok("eligible-school candidate deposit → $75 preferred access");

  // K-anonymity: with 1 affiliated candidate (< K=10), report is suppressed.
  const rep1 = (await (await fetch(`${base}/v1/schools/FLR-DEMO-A/report`, { headers: bearer(T) })).json()) as any;
  assert.equal(rep1.suppressed_for_privacy, true);
  assert.equal(rep1.k_floor, 10);
  assert.ok(!("band_distribution" in rep1));
  ok("per-school report K-anon: <10 affiliated → suppressed (counts only)");

  // Cross-candidate guard.
  const xAff = await fetch(`${base}/v1/candidates/${candId}/affiliations`, {
    method: "POST", headers: { "content-type": "application/json", ...bearer(CS) },
    body: JSON.stringify({ school_slug: "FLR-DEMO-A", role: "student" }),
  });
  assert.equal(xAff.status, 403);
  ok("candidate session cannot affiliate another candidate → 403");

  // 5p) Pathway tasks projection (Florence Pathway Agent writes; Passport reads)

  // Candidate session cannot WRITE tasks.
  const candWritesTask = await fetch(`${base}/v1/candidates/${meId}/pathway-tasks`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(CS) },
    body: JSON.stringify({ kind: "nclex_registration", status: "in_progress" }),
  });
  assert.equal(candWritesTask.status, 403);
  ok("candidate session cannot write pathway-tasks (operator/agent only)");

  // Pathway Agent writes a few task updates (M2M with pathway:write).
  for (const ev of [
    { kind: "nclex_registration", status: "in_progress" },
    { kind: "ds160_guidance", status: "awaiting_candidate", note: "Confirm travel history" },
    { kind: "nclex_registration", status: "completed" },
  ]) {
    const r = await fetch(`${base}/v1/candidates/${meId}/pathway-tasks`, {
      method: "POST",
      headers: { "content-type": "application/json", ...bearer(T) },
      body: JSON.stringify(ev),
    });
    assert.equal(r.status, 201);
  }
  ok("Pathway Agent writes a sequence of pathway-task events");

  // Candidate reads only their own tasks; latest-per-kind projection wins.
  const my = (await (await fetch(`${base}/v1/candidates/${meId}/pathway-tasks`, { headers: bearer(CS) })).json()) as any;
  assert.equal(my.history.length, 3);
  const nclex = my.latest.find((t: any) => t.kind === "nclex_registration");
  assert.equal(nclex.status, "completed"); // latest wins, not "in_progress"
  ok("candidate reads their pathway tasks — latest-per-kind projection");

  // Cross-candidate read blocked.
  const crossPt = await fetch(`${base}/v1/candidates/${candId}/pathway-tasks`, { headers: bearer(CS) });
  assert.equal(crossPt.status, 403);
  ok("candidate session blocked from another candidate's pathway tasks");

  // 5q) Audit transparency — "Who has accessed my data?"
  const myAudit = (await (await fetch(`${base}/v1/me/audit`, { headers: bearer(CS) })).json()) as any;
  assert.ok(Array.isArray(myAudit.data));
  assert.ok(myAudit.data.length > 0);
  // Actor is bucketed (you/ops/agent name) — no raw client ids or field values.
  assert.ok(myAudit.data.every((e: any) => typeof e.actor === "string" && typeof e.action === "string"));
  assert.ok(myAudit.data.some((e: any) => e.actor === "you")); // candidate's own actions
  assert.ok(myAudit.data.some((e: any) => e.actor === "ops")); // T-token ops actions (PATCH consent, etc.)
  ok("GET /v1/me/audit returns the candidate's own access log (actor-classified)");

  // 5r) Drip campaign (Phase 3) — re-permission first, consent-gated, compliant
  const mockEmail = deps.email as InstanceType<typeof MockEmailProvider>;
  const DT = (await token("leads:write leads:read schools:write")).json.access_token;
  const dripHdr = { "content-type": "application/json", ...bearer(DT) };
  // A partner (affiliate) school for the $75 tier copy.
  await fetch(`${base}/v1/schools`, {
    method: "POST", headers: dripHdr,
    body: JSON.stringify({ slug: "FLR-DRIP-PARTNER", name: "Drip Partner University", country: "Dripland", tier: "affiliate" }),
  });
  await fetch(`${base}/v1/leads/import`, {
    method: "POST", headers: dripHdr,
    body: JSON.stringify({
      source: "smoke", leads: [
        { email: "drip-partner@example.com", country: "Dripland", firstname: "Pia", school_slug: "FLR-DRIP-PARTNER" },
        { email: "drip-plain@example.com", country: "Dripland", firstname: "Ben" },
        { email: "drip-unsub@example.com", country: "Dripland", firstname: "Uma" },
      ],
    }),
  });
  const findLead = async (q: string) =>
    (await (await fetch(`${base}/v1/leads?q=${encodeURIComponent(q)}`, { headers: bearer(DT) })).json() as any).data[0];

  // Enroll the Dripland segment, re-permission first.
  const batch = await (await fetch(`${base}/v1/drip/enroll-batch`, {
    method: "POST", headers: dripHdr,
    body: JSON.stringify({ filters: { country: "Dripland" }, require_optin: true }),
  })).json() as any;
  assert.equal(batch.enrolled, 3);
  const partnerLead = await findLead("drip-partner@example.com");
  assert.equal(partnerLead.lifecycle_stage, "invited");
  assert.ok(typeof partnerLead.unsubscribe_token === "string" && partnerLead.unsubscribe_token.length > 0);
  ok("drip enroll-batch (re-permission) → 3 leads invited, unsubscribe_token minted");

  // Tick → stage 0 (opt-in) to all 3 invited leads.
  const tick1 = await (await fetch(`${base}/v1/drip/tick`, {
    method: "POST", headers: { "content-type": "application/json", "x-drip-secret": "smoke-drip-secret" }, body: "{}",
  })).json() as any;
  assert.equal(tick1.sent, 3);
  const m0 = mockEmail.lastFor("drip-partner@example.com");
  assert.ok(m0 && m0.subject.includes("NCLEX-RN is the next step"));
  assert.ok(m0!.text.includes("/#/enrich?token=") && m0!.text.includes("/#/unsubscribe?token="));
  ok("drip tick → stage-0 opt-in sent (enrich + unsubscribe URLs present)");

  // Tick again → invited non-clickers are NOT advanced (consent gate proven).
  const tick2 = await (await fetch(`${base}/v1/drip/tick`, {
    method: "POST", headers: { "content-type": "application/json", "x-drip-secret": "smoke-drip-secret" }, body: "{}",
  })).json() as any;
  assert.equal(tick2.sent, 0);
  assert.equal(tick2.consent_skipped, 3);
  ok("drip consent gate → invited leads do not advance without opt-in");

  // Opt in the two non-unsub leads (consent), then advance to the $75 stage.
  for (const email of ["drip-partner@example.com", "drip-plain@example.com"]) {
    const l = await findLead(email);
    const r = await (await fetch(`${base}/v1/drip/enrich`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: l.unsubscribe_token }),
    })).json() as any;
    assert.equal(r.lifecycle_stage, "engaged");
  }
  // Two ticks (intervals are 0 in tests) → engaged leads reach stage 2.
  for (let i = 0; i < 2; i++)
    await fetch(`${base}/v1/drip/tick`, {
      method: "POST", headers: { "content-type": "application/json", "x-drip-secret": "smoke-drip-secret" }, body: "{}",
    });
  const mp = mockEmail.lastFor("drip-partner@example.com");
  assert.ok(mp && mp.subject.includes("$75") && mp.text.includes("25 percent"));
  ok("drip tier copy → partner-school lead gets the $75 / 25 percent offer");
  const mb = mockEmail.lastFor("drip-plain@example.com");
  assert.ok(mb && !mb.text.includes("$75"));
  ok("drip tier copy → non-partner lead gets the generic offer (no $75)");

  // Unsubscribe is honored: the unsub lead gets no further sends.
  const unsubLead = await findLead("drip-unsub@example.com");
  const subjectBefore = mockEmail.lastFor("drip-unsub@example.com")?.subject;
  const unsubRes = await (await fetch(`${base}/v1/drip/unsubscribe`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: unsubLead.unsubscribe_token }),
  })).json() as any;
  assert.equal(unsubRes.unsubscribed, true);
  const afterUnsub = await findLead("drip-unsub@example.com");
  assert.equal(afterUnsub.lifecycle_stage, "suppressed");
  await fetch(`${base}/v1/drip/tick`, {
    method: "POST", headers: { "content-type": "application/json", "x-drip-secret": "smoke-drip-secret" }, body: "{}",
  });
  assert.equal(mockEmail.lastFor("drip-unsub@example.com")?.subject, subjectBefore);
  ok("drip unsubscribe → lead suppressed, no further sends");

  // Secret guard.
  const noSecret = await fetch(`${base}/v1/drip/tick`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  assert.equal(noSecret.status, 401);
  const badSecret = await fetch(`${base}/v1/drip/tick`, {
    method: "POST", headers: { "content-type": "application/json", "x-drip-secret": "wrong" }, body: "{}",
  });
  assert.equal(badSecret.status, 401);
  ok("drip tick → 401 without/with wrong secret");

  // Overview funnel.
  const ov = await (await fetch(`${base}/v1/drip/overview`, { headers: bearer(DT) })).json() as any;
  assert.ok(ov.by_stage.engaged >= 2 && ov.by_stage.suppressed >= 1);
  assert.ok(ov.sends_today > 0);
  ok("drip overview → funnel + send counts");

  // Brand lint: no forbidden language / em-dashes / italics ship in any stage.
  const { allDripCopyForLint } = await import("../src/drip_copy.ts");
  const corpus = allDripCopyForLint().join("\n").toLowerCase();
  for (const bad of ["—", "<em", "<i>", "visa", "fica", "immigration", " tax"])
    assert.ok(!corpus.includes(bad), `drip copy must not contain ${JSON.stringify(bad)}`);
  ok("drip copy brand lint → no forbidden terms / em-dashes / italics");

  // 6) Audit trail
  const audits = deps.audit.recent();
  assert.ok(audits.length >= 6);
  assert.ok(audits.some((a) => a.action.includes("assessment-results") && a.outcome === 201));
  assert.ok(audits.every((a) => typeof a.request_id === "string"));
  ok("append-only audit trail recorded");

  console.log(`\nPASS — ${passed} checks`);
  server.close();
  process.exit(0);
} catch (e) {
  console.error("\nFAIL:", e);
  server.close();
  process.exit(1);
}
