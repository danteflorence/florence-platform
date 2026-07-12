// End-to-end smoke test for the reference service. Builds the deps in-process
// (so we can inspect the audit + webhook sinks), starts the server, and drives
// it over real HTTP. Run: `node test/smoke.ts` (or `npm test`).

import { strict as assert } from "node:assert";

// Set env BEFORE importing config (dynamic import so it reads these).
process.env["PORT"] = "8099";
process.env["DEMO_CLIENT_ID"] = "smoke-crm";
process.env["DEMO_CLIENT_SECRET"] = "smoke-secret-123";
process.env["API_JWT_SECRET"] = "smoke-jwt-secret-deadbeef";
process.env["CORS_ALLOWED_ORIGINS"] = "https://app.florenceedu.com";
// Headroom so the dense end-to-end sequence isn't throttled by the GENERAL
// limiter. The tighter AUTH limiter + lockout (section 5g) are hardcoded and
// unaffected by these.
process.env["RATE_LIMIT_CAPACITY"] = "2000";
process.env["RATE_LIMIT_REFILL_PER_SEC"] = "2000";
process.env["DRIP_TICK_SECRET"] = "smoke-drip-secret";
process.env["COACH_TICK_SECRET"] = "smoke-coach-secret";
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
const { buildApplyUrl, redactSensitiveLogValue } = await import("../src/sponsoredAccess.ts");

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
const allowedApplyParams = ["campaign", "session_id", "source", "sponsor"].sort();
const forbiddenApplyParams = [
  "name",
  "email",
  "phone",
  "passport",
  "sevis",
  "candidate_id",
  "country",
  "dob",
];

function assertSafeApplyUrl(raw: string, sponsor: string, forbiddenFragments: string[] = []): void {
  const url = new URL(raw);
  assert.equal(url.origin + url.pathname, "https://www.florenceedu.com/apply");
  assert.deepEqual(Array.from(url.searchParams.keys()).sort(), allowedApplyParams);
  assert.equal(url.searchParams.get("source"), "academy");
  assert.equal(url.searchParams.get("sponsor"), sponsor);
  assert.equal(url.searchParams.get("campaign"), "global-live-access");
  assert.match(url.searchParams.get("session_id") ?? "", /^anon_[A-Za-z0-9_-]{8,64}$/);
  for (const key of forbiddenApplyParams) assert.equal(url.searchParams.has(key), false);
  for (const fragment of forbiddenFragments) assert.equal(raw.includes(fragment), false);
}

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
    "candidates:read candidates:write enrollment:read enrollment:write performance:read performance:write payments:read outcomes:read outcomes:write employer:read employer:write university:read schools:read schools:write academy:sponsors:read academy:sponsors:write pathway:write clients:manage tokens:mint cohorts:read cohorts:write library:read library:write",
  );
  assert.equal(full.status, 200);
  assert.ok(full.json.access_token);
  const T: string = full.json.access_token;
  ok("client-credentials grant → scoped token");

  const quote = async (sponsor: string) => {
    const res = await fetch(`${base}/v1/academy/pricing/quote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sponsor, session_id: `anon_${sponsor}1234` }),
    });
    const json = (await res.json()) as any;
    assert.equal(res.status, 200);
    assert.equal(json.product_name, "Florence Academy Global Live NCLEX Access");
    assert.equal(json.list_value_usd, 200);
    assert.equal(json.sponsor_subsidy_usd, 100);
    assert.equal(json.student_price_usd, 100);
    assert.equal(json.budget_mode, "unlimited");
    assert.equal(json.sponsorship_available, true);
    assert.equal(json.budget_exhausted, undefined);
    assertSafeApplyUrl(json.apply_url, sponsor);
    return json;
  };
  assert.equal((await quote("avila")).sponsor_slug, "avila");
  assert.equal((await quote("webster")).sponsor_slug, "webster");
  ok("Avila/Webster quote → $200 value, $100 sponsorship, $100 student price with safe Apply URL");

  const piiLikeSession = "Ana Example learner@example.test TEST_PASSPORT_123 cand_test_123";
  assertSafeApplyUrl(
    buildApplyUrl({ source: "academy", sponsorSlug: "avila", campaignId: "global-live-access", sessionId: piiLikeSession }),
    "avila",
    ["Ana Example", "learner@example.test", "TEST_PASSPORT_123", "cand_test_123"],
  );
  ok("Apply URL builder hashes PII-like session material before adding it to the URL");

  const redacted = redactSensitiveLogValue({
    passport_number: "sample",
    token: "sample",
    nested: { note: "phone=sample" },
    safe: "academy",
  }) as any;
  assert.equal(redacted.passport_number, "[REDACTED]");
  assert.equal(redacted.token, "[REDACTED]");
  assert.equal(redacted.nested.note, "[REDACTED]");
  assert.equal(redacted.safe, "academy");
  ok("sponsored access redaction helper removes sensitive log/error fields");

  // CORS allowlist (preflight): allowed origin → 204 + ACAO; others → 403, no ACAO
  const pf = await fetch(`${base}/v1/candidates`, {
    method: "OPTIONS",
    headers: { origin: "https://app.florenceedu.com", "access-control-request-method": "POST" },
  });
  assert.equal(pf.status, 204);
  assert.equal(pf.headers.get("access-control-allow-origin"), "https://app.florenceedu.com");
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

  // 4b) New assessment kinds: "simulation" (virtual-patient runs) and
  // "live_poll" (persisted classroom polls) enter the same append-only spine.
  // Fresh candidate so these rows never perturb the shared candidate's
  // readiness/remediation assertions later in the suite.
  const simCandRes = await fetch(`${base}/v1/candidates`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ full_name: "Sim Kinds Probe", country: "PH" }),
  });
  const simCand = (await simCandRes.json()) as any;
  assert.equal(simCandRes.status, 201);
  const simPost = await fetch(`${base}/v1/assessment-results`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({
      candidate_id: simCand.id,
      kind: "simulation",
      items_completed: 9,
      by_client_need: { "physiological-adaptation": 0.6, "management-of-care": 0.4 },
      by_cjmm: { "recognize-cues": 0.7, "take-actions": 0.3 },
    }),
  });
  assert.equal(simPost.status, 201);
  const pollPost = await fetch(`${base}/v1/assessment-results`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ candidate_id: simCand.id, kind: "live_poll", readiness: 0.66, items_completed: 12 }),
  });
  assert.equal(pollPost.status, 201);
  ok("kind simulation + live_poll → 201 (sim/classroom results enter the spine)");
  const kindListRes = await fetch(`${base}/v1/assessment-results?candidate_id=${simCand.id}`, { headers: bearer(T) });
  const kindList = (await kindListRes.json()) as any;
  const kindsSeen = new Set((kindList.data ?? []).map((r: any) => r.kind));
  assert.equal(kindListRes.status, 200);
  assert.ok(kindsSeen.has("simulation") && kindsSeen.has("live_poll"));
  ok("listing returns simulation + live_poll rows (no kind-filter regression)");

  // 4c) Band stability: the band derives from the latest result that CARRIES
  // a pass probability. A later readiness-less classroom poll must neither
  // wipe the band to "none" nor move it.
  const timedPost = await fetch(`${base}/v1/assessment-results`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ candidate_id: simCand.id, kind: "timed", readiness: 0.72, theta: 0.4, items_completed: 60 }),
  });
  assert.equal(timedPost.status, 201);
  const latePoll = await fetch(`${base}/v1/assessment-results`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ candidate_id: simCand.id, kind: "live_poll", items_completed: 6, by_cjmm: { "take-actions": 0.5 } }),
  });
  assert.equal(latePoll.status, 201);
  const bandRes = await fetch(`${base}/v1/candidates/${simCand.id}/readiness`, { headers: bearer(T) });
  const band = (await bandRes.json()) as any;
  assert.equal(bandRes.status, 200);
  assert.equal(band.band, "yellow");
  assert.equal(band.readiness, 0.72);
  assert.equal(band.items_completed, 9 + 12 + 60 + 6); // polls still count toward volume
  ok("readiness band survives a later readiness-less live_poll result");

  // 4d) Class sim debrief: aggregates ONLY simulation-kind runs across a
  // cohort into the post-sim projector view (participation + NCJMM mix).
  const enr4d = await fetch(`${base}/v1/enrollments`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ candidate_id: simCand.id, cohort: "SMOKE-SIM-1", status: "attending" }),
  });
  assert.equal(enr4d.status, 201);
  const sdRes = await fetch(`${base}/v1/cohorts/SMOKE-SIM-1/sim-debrief`, { headers: bearer(T) });
  const sd = (await sdRes.json()) as any;
  assert.equal(sdRes.status, 200);
  assert.equal(sd.participants, 1);
  assert.equal(sd.runs, 1); // the timed + live_poll rows are excluded
  assert.equal(sd.by_cjmm["take-actions"], 0.3);
  assert.equal(sd.weakest_steps[0].step, "take-actions"); // weakest first
  assert.equal(sd.by_client_need["management-of-care"], 0.4);
  ok("cohort sim-debrief aggregates simulation runs only, weakest step first");

  // 4e) Reasoning-error loop: error_tags round-trip, and a tag REPEATING
  // across results dispatches dim:"error_type" remediation (one occurrence
  // is an incident, two is a pattern).
  const tagged1 = await fetch(`${base}/v1/assessment-results`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ candidate_id: simCand.id, kind: "simulation", items_completed: 5, by_cjmm: { "take-actions": 0.5 }, error_tags: ["unsafe_delay", "missed_cue"] }),
  });
  assert.equal(tagged1.status, 201);
  const remAfter1 = (await (await fetch(`${base}/v1/candidates/${simCand.id}/remediations`, { headers: bearer(T) })).json()) as any;
  assert.ok(!remAfter1.remediations.some((x: any) => x.dim === "error_type"));
  const tagged2 = await fetch(`${base}/v1/assessment-results`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ candidate_id: simCand.id, kind: "simulation", items_completed: 6, by_cjmm: { "take-actions": 0.6 }, error_tags: ["unsafe_delay"] }),
  });
  const tagged2Json = (await tagged2.json()) as any;
  assert.equal(tagged2.status, 201);
  assert.deepEqual(tagged2Json.error_tags, ["unsafe_delay"]); // round-trips on the row
  const remAfter2 = (await (await fetch(`${base}/v1/candidates/${simCand.id}/remediations`, { headers: bearer(T) })).json()) as any;
  const errRem = remAfter2.remediations.find((x: any) => x.dim === "error_type" && x.key === "unsafe_delay");
  assert.ok(errRem, "repeated tag should dispatch error_type remediation");
  assert.ok(!remAfter2.remediations.some((x: any) => x.dim === "error_type" && x.key === "missed_cue"));
  ok("repeated error tag dispatches dim:error_type remediation; single tag does not");

  // 4f) Top-missed items: lowest pass rate first, with a minimum-evidence bar.
  const respond = (qid: string, correct: boolean, chosen: number) =>
    fetch(`${base}/v1/candidates/${simCand.id}/responses`, {
      method: "POST",
      headers: { "content-type": "application/json", ...bearer(T) },
      body: JSON.stringify({ question_id: qid, correct, chosen_option_index: chosen }),
    });
  // q-hard: 1/3 correct, wrong answers cluster on option 2. q-easy: 3/3. q-thin: 1 attempt.
  await respond("q-hard", false, 2);
  await respond("q-hard", false, 2);
  await respond("q-hard", true, 0);
  await respond("q-easy", true, 1);
  await respond("q-easy", true, 1);
  await respond("q-easy", true, 1);
  await respond("q-thin", false, 3);
  const tmRes = await fetch(`${base}/v1/ops/questions/top-missed?limit=5&min_attempts=3`, { headers: bearer(T) });
  const tm = (await tmRes.json()) as any;
  assert.equal(tmRes.status, 200);
  const ids4f = tm.items.map((x: any) => x.question_id);
  assert.equal(ids4f[0], "q-hard"); // hardest first
  assert.ok(!ids4f.includes("q-thin")); // one attempt is not evidence
  const hard = tm.items[0];
  assert.equal(hard.most_common_wrong, 2); // the wrong-answer magnet
  assert.ok(Math.abs(hard.pass_rate - 1 / 3) < 1e-9);
  ok("top-missed ranks hardest first, honors min_attempts, names the wrong-answer magnet");

  // 4g) Spaced-queue blob: round-trips per candidate; validation rejects junk.
  const sqQueue = { entries: [{ id: "q-hard", box: 2, dueAt: 1, lapses: 0, addedAt: 1 }], streak: 3 };
  const sqPut = await fetch(`${base}/v1/candidates/${simCand.id}/spaced-queue`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ queue: sqQueue }),
  });
  assert.equal(sqPut.status, 200);
  const sqGet = (await (await fetch(`${base}/v1/candidates/${simCand.id}/spaced-queue`, { headers: bearer(T) })).json()) as any;
  assert.deepEqual(sqGet.queue, sqQueue);
  const sqBad = await fetch(`${base}/v1/candidates/${simCand.id}/spaced-queue`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ queue: { entries: "nope" } }),
  });
  assert.equal(sqBad.status, 400);
  ok("spaced-queue blob round-trips per candidate; junk rejected");

  // 4h) PatientVoice proxy: mock provider keyword-matches the scenario's
  // canned lines server-side (no MODEL_GATEWAY_* in the test env).
  const pvBody = {
    persona: { name: "Rosa", age: 58, sex: "F", setting: "Med-surg" },
    revealed: ["Chills reported"],
    canned: [{ match: ["pain", "hurt"], text: "It hurts deep in my belly." }],
  };
  const pv = await fetch(`${base}/v1/sim/patient-voice`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ ...pvBody, question: "How bad is the pain right now?" }),
  });
  const pvj = (await pv.json()) as any;
  assert.equal(pv.status, 200);
  assert.equal(pvj.source, "mock");
  assert.equal(pvj.text, "It hurts deep in my belly.");
  const pvMiss = (await (await fetch(`${base}/v1/sim/patient-voice`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ ...pvBody, question: "What is your favorite color?" }),
  })).json()) as any;
  assert.ok(pvMiss.text.includes("doesn't seem to follow"));
  const pvBad = await fetch(`${base}/v1/sim/patient-voice`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ persona: pvBody.persona }),
  });
  assert.equal(pvBad.status, 400);
  ok("patient-voice proxy answers in mock mode; validation rejects junk");

  // 4i) Sim tutor hint: coaches the NCJMM step (mock mode), never the answer.
  const th = await fetch(`${base}/v1/sim/tutor-hint`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ step: "recognize-cues", criticalCuesRemaining: 2, situation: "Post-op patient, two findings surfaced." }),
  });
  const thj = (await th.json()) as any;
  assert.equal(th.status, 200);
  assert.equal(thj.source, "mock");
  assert.ok(/look|assess/i.test(thj.text)); // a recognize-cues nudge
  assert.ok(/2 key findings/.test(thj.text)); // reflects the remaining-cue count
  const thBad = await fetch(`${base}/v1/sim/tutor-hint`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ step: "not-a-step" }),
  });
  assert.equal(thBad.status, 400);
  ok("sim tutor-hint coaches the NCJMM step in mock mode; bad step rejected");

  // 4i-bis) Spoken tutor: /v1/audio/speak returns a playable cached clip.
  // Mock mode renders a silent mp3, so the shape + caching are fully testable.
  // Unique text per run: the audio store persists on disk across smoke runs,
  // so a fixed line would be a cache HIT on the second-ever run.
  const spText = `Look at the whole picture before you act. (${Date.now()})`;
  const sp1 = await fetch(`${base}/v1/audio/speak`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ text: spText }),
  });
  const sp1j = (await sp1.json()) as any;
  assert.equal(sp1.status, 200);
  assert.ok(typeof sp1j.url === "string" && sp1j.url.includes("/v1/audio/file/"));
  assert.equal(sp1j.cached, false);
  const sp2 = await fetch(`${base}/v1/audio/speak`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ text: spText }),
  });
  const sp2j = (await sp2.json()) as any;
  assert.equal(sp2j.cached, true); // identical text → cache hit, no re-render
  assert.equal(sp2j.url, sp1j.url);
  const spFile = await fetch(`${base}${sp1j.url}`);
  assert.equal(spFile.status, 200);
  assert.equal(spFile.headers.get("content-type"), "audio/mpeg");
  const spBad = await fetch(`${base}/v1/audio/speak`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ text: "" }),
  });
  assert.equal(spBad.status, 400);
  ok("spoken tutor: /v1/audio/speak renders, caches by content, serves audio/mpeg");

  // 4j) Scenario Studio: ingest a doc → draft skeleton; save → list → approve.
  const ing = await fetch(`${base}/v1/sim/ingest`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ title: "Chest Pain Case", text: "Patient Name: John Ray. Age: 61. HR 118 RR 24 BP 88/54 SpO2 90. Male with crushing chest pain." }),
  });
  const ingj = (await ing.json()) as any;
  assert.equal(ing.status, 200);
  assert.equal(ingj.source, "mock");
  assert.equal(ingj.scenario.initialVitals.hr, 118); // regex pulled the HR
  assert.equal(ingj.scenario.initialVitals.sbp, 88);
  assert.equal(ingj.scenario.patient.name, "John Ray");
  assert.ok(Array.isArray(ingj.scenario.rubric) && ingj.scenario.rubric.length >= 1);
  ok("scenario ingest returns an editable skeleton with vitals pulled from text");

  const draft = { ...ingj.scenario, id: "vp-authored-smoke-1", title: "Smoke Authored" };
  const saveDraft = await fetch(`${base}/v1/sim/scenarios`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ scenario: draft }),
  });
  assert.equal(saveDraft.status, 201);
  // Learner list (approved only) does NOT include the draft yet.
  const learnerList = (await (await fetch(`${base}/v1/sim/scenarios`, { headers: bearer(T) })).json()) as any;
  assert.ok(!learnerList.data.some((s: any) => s.id === "vp-authored-smoke-1"));
  // Author list (?all=1, needs cohorts:write) does.
  const authorList = (await (await fetch(`${base}/v1/sim/scenarios?all=1`, { headers: bearer(T) })).json()) as any;
  assert.ok(authorList.data.some((s: any) => s.id === "vp-authored-smoke-1" && s.status === "draft"));
  // Approve it → now visible to learners.
  const appr = await fetch(`${base}/v1/sim/scenarios/vp-authored-smoke-1/status`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ status: "approved" }),
  });
  assert.equal(appr.status, 200);
  const learnerList2 = (await (await fetch(`${base}/v1/sim/scenarios`, { headers: bearer(T) })).json()) as any;
  assert.ok(learnerList2.data.some((s: any) => s.id === "vp-authored-smoke-1"));
  ok("authored scenario: draft hidden from learners until approved, then visible");

  // 4k) Render seam: gated on approval; mock-queues without UNREAL_RENDER_URL.
  const renderBeforeApprove = await fetch(`${base}/v1/sim/scenarios/vp-authored-smoke-1/render`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ manifest: { manifestVersion: 1, scene: { id: "x" } } }),
  });
  // (it was approved in 4j) → allowed. Re-test the gate on a fresh draft:
  await fetch(`${base}/v1/sim/scenarios`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ scenario: { ...draft, id: "vp-authored-render-gate" } }),
  });
  const gate = await fetch(`${base}/v1/sim/scenarios/vp-authored-render-gate/render`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ manifest: { manifestVersion: 1 } }),
  });
  assert.equal(gate.status, 409); // not approved → blocked
  assert.equal(renderBeforeApprove.status, 200); // approved one → queued (no UNREAL_RENDER_URL)
  const rj = (await renderBeforeApprove.json()) as any;
  assert.equal(rj.render_state, "queued");
  ok("render seam: blocked until approved, mock-queues without an Unreal service");

  // 4l) Conversational authoring: a guided interview fills slots turn by turn.
  let authorState: any = { message: "Sepsis recognition", filled: [], draft: null };
  const answers = [
    "Sepsis recognition",
    "Med-surg unit, 0700, post-op day 2",
    "Ana Cruz, 62, female, diabetes",
    "She looks flushed and says she has chills",
    "HR 118 BP 92/54 RR 24 SpO2 90",
    "Recognize sepsis and escalate",
    "Call the provider within 5 minutes or she decompensates",
  ];
  let last: any;
  for (const a of answers) {
    const r = await fetch(`${base}/v1/sim/author-turn`, {
      method: "POST",
      headers: { "content-type": "application/json", ...bearer(T) },
      body: JSON.stringify({ message: a, filled: authorState.filled, draft: authorState.draft }),
    });
    last = (await r.json()) as any;
    assert.equal(r.status, 200);
    authorState = { filled: last.filled, draft: last.draft };
  }
  assert.equal(last.source, "mock");
  assert.equal(last.done, true); // all 7 slots filled
  assert.equal(last.draft.initialVitals.hr, 118); // vitals pulled from the chat
  assert.equal(last.draft.initialVitals.sbp, 92);
  assert.ok(last.draft.title.length > 0);
  ok("conversational author fills all slots and pulls vitals from the chat");

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

  const libraryMint = await fetch(`${base}/v1/tokens/session`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ candidate_id: candId, scopes: ["library:read", "library:write"], ttl_sec: 600 }),
  });
  const libraryMintJson = (await libraryMint.json()) as any;
  assert.equal(libraryMint.status, 201);
  assert.ok(libraryMintJson.scope.includes("library:read"));
  assert.equal(libraryMintJson.scope.includes("library:write"), false);
  const LS: string = libraryMintJson.access_token;

  const studyPdf = "%PDF-1.4\n% Florence Academy sample PDF\n";
  const blockedStudentImport = await fetch(`${base}/v1/academy/library/import`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(LS) },
    body: JSON.stringify({
      kind: "document",
      title: "Student upload attempt",
      visibility: "private",
      file_name: "student.pdf",
      mime_type: "application/pdf",
      content_base64: Buffer.from("%PDF-1.4", "utf8").toString("base64"),
    }),
  });
  assert.equal(blockedStudentImport.status, 403);
  ok("candidate library session cannot upload documents");

  const importedDoc = await fetch(`${base}/v1/academy/library/import`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({
      kind: "document",
      title: "Sepsis review sheet",
      visibility: "private",
      candidate_id: candId,
      file_name: "sepsis-review.pdf",
      mime_type: "application/pdf",
      content_base64: Buffer.from(studyPdf, "utf8").toString("base64"),
      tags: ["sepsis", "priority"],
    }),
  });
  const importedDocJson = (await importedDoc.json()) as any;
  assert.equal(importedDoc.status, 201);
  assert.equal(importedDocJson.kind, "document");
  assert.equal(importedDocJson.visibility, "private");
  assert.equal(importedDocJson.candidate_id, candId);
  assert.equal(JSON.stringify(importedDocJson).includes("content_base64"), false);
  ok("admin imports private library PDF without document body in response");

  const signed = await fetch(`${base}/v1/academy/library/resources/${importedDocJson.id}/signed-access`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(LS) },
  });
  const signedJson = (await signed.json()) as any;
  assert.equal(signed.status, 201);
  assert.match(signedJson.signed_url, /^\/v1\/academy\/library\/access\/lsa_/);
  assert.equal(signedJson.signed_url.includes(candId), false);
  assert.equal(signedJson.signed_url.includes(importedDocJson.id), false);
  for (const key of forbiddenApplyParams) assert.equal(signedJson.signed_url.includes(key), false);
  const opened = await fetch(`${base}${signedJson.signed_url}`);
  const openedJson = (await opened.json()) as any;
  assert.equal(opened.status, 200);
  assert.equal(Buffer.from(openedJson.content_base64, "base64").toString("utf8"), studyPdf);
  assert.ok(deps.audit.byResource?.(importedDocJson.id).some((entry) => entry.action.includes("/v1/academy/library/access/")));
  ok("signed library document access is opaque, short-lived, and audited");

  const otherLibraryMint = await fetch(`${base}/v1/tokens/session`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ candidate_id: candB.id, scopes: ["library:read", "library:write"], ttl_sec: 600 }),
  });
  const otherLibraryToken = ((await otherLibraryMint.json()) as any).access_token as string;
  const crossDoc = await fetch(`${base}/v1/academy/library/resources/${importedDocJson.id}/signed-access`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(otherLibraryToken) },
  });
  assert.equal(crossDoc.status, 403);
  ok("candidate cannot open another student's private library document");

  const unsafeEmbed = await fetch(`${base}/v1/academy/library/import`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({
      kind: "external_embed",
      title: "Unsafe embed",
      visibility: "academy",
      embed_url: "https://evil.example/frame?token=sample",
    }),
  });
  assert.equal(unsafeEmbed.status, 400);
  const safeEmbed = await fetch(`${base}/v1/academy/library/import`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({
      kind: "external_embed",
      title: "BioDigital heart model",
      visibility: "academy",
      embed_url: "https://human.biodigital.com/widget/?model=heart",
    }),
  });
  const safeEmbedJson = (await safeEmbed.json()) as any;
  assert.equal(safeEmbed.status, 201);
  assert.equal(safeEmbedJson.embed.origin, "https://human.biodigital.com");
  ok("library iframe imports reject unapproved origins and accept BioDigital embeds");

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

  // Regression guard - must reject without override:true.
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
  assert.equal(readiness.band, "orange"); // 0.58 → orange band (0.50-0.65)
  assert.equal(readiness.sections_completed, 1);
  assert.equal(readiness.sections_total, 20);
  assert.ok(readiness.focus_areas.includes("pharmacological-therapies")); // weakest need
  ok("readiness snapshot: band + progress rollup + weakest focus area");

  // Daily Coach: the derived plan + the nudge tick.
  const dp = await fetch(`${base}/v1/me/daily-plan`, { headers: bearer(CS) });
  const dpj = (await dp.json()) as any;
  assert.equal(dp.status, 200);
  assert.equal(dpj.active_today, true); // this candidate just posted a result
  assert.ok(dpj.streak_days >= 1);
  assert.equal(dpj.readiness.band, "orange");
  assert.ok(dpj.readiness.focus_areas.includes("pharmacological-therapies"));
  assert.ok(typeof dpj.plan_day_index === "number");
  const ctBad = await fetch(`${base}/v1/ops/coach/tick`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-coach-secret": "wrong" },
    body: "{}",
  });
  assert.equal(ctBad.status, 401);
  const ct = await fetch(`${base}/v1/ops/coach/tick`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-coach-secret": "smoke-coach-secret" },
    body: JSON.stringify({ cap: 50 }),
  });
  const ctj = (await ct.json()) as any;
  assert.equal(ct.status, 200);
  assert.ok(typeof ctj.scanned === "number");
  // This candidate was active seconds ago → never nudged.
  assert.equal(ctj.nudged, 0);
  ok("daily coach: plan derives streak/readiness; tick guards secret + skips active learners");

  // NCLEX self-report: validated, once-only, lands in the outcomes ledger.
  const srBad = await fetch(`${base}/v1/me/nclex-outcome`, {
    method: "POST",
    headers: { ...bearer(CS), "content-type": "application/json" },
    body: JSON.stringify({ status: "maybe" }),
  });
  assert.equal(srBad.status, 400);
  const sr1 = await fetch(`${base}/v1/me/nclex-outcome`, {
    method: "POST",
    headers: { ...bearer(CS), "content-type": "application/json" },
    body: JSON.stringify({ status: "pass", tested_on: "2026-07-01" }),
  });
  const sr1j = (await sr1.json()) as any;
  assert.equal(sr1.status, 201);
  assert.equal(sr1j.kind, "nclex_result");
  assert.equal(sr1j.status, "pass");
  const sr2 = await fetch(`${base}/v1/me/nclex-outcome`, {
    method: "POST",
    headers: { ...bearer(CS), "content-type": "application/json" },
    body: JSON.stringify({ status: "fail" }),
  });
  assert.equal(sr2.status, 409); // one self-report; corrections go through ops
  ok("nclex self-report: validates status, writes the ledger once, 409 on retell");

  // Sim benchmark: K-anonymous - one lone candidate never sees an aggregate.
  const sb = await fetch(`${base}/v1/me/sim-benchmark`, { headers: bearer(CS) });
  const sbj = (await sb.json()) as any;
  assert.equal(sb.status, 200);
  assert.equal(sbj.available, false); // cohort of 1 < K=5
  assert.ok(typeof sbj.my_runs === "number");
  ok("sim benchmark: K-anonymity gate holds below 5 participants");

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

  // 5h) Global Live access checkout (mock provider) -> mock-complete -> paid + funnel advance
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
  const checkout = await fetch(`${base}/v1/academy/access-passes/checkout`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(CS) },
    body: JSON.stringify({ candidate_id: candId, sponsor: "avila", session_id: "anon_checkout1234" }),
  });
  const cj = (await checkout.json()) as any;
  assert.equal(checkout.status, 201);
  assert.equal(cj.provider, "mock");
  assert.equal(cj.amount_cents, 10000);
  assert.ok(String(cj.checkout_url).includes("/checkout/mock"));
  assert.equal(cj.quote.product_name, "Florence Academy Global Live NCLEX Access");
  assert.equal(cj.quote.student_price_usd, 100);
  assertSafeApplyUrl(cj.quote.apply_url, "avila");
  assert.equal((await deps.store.payments.get(cj.payment_id))?.candidate_id, meId);
  ok("candidate starts a $100 Global Live access checkout (mock) -> 201 with hosted URL");

  const complete = await fetch(`${base}/v1/payments/${cj.payment_id}/mock-complete`, { method: "POST" });
  assert.equal(complete.status, 200);
  ok("mock-complete marks Global Live access paid");

  const pays = (await (await fetch(`${base}/v1/payments?candidate_id=${meId}`, { headers: bearer(T) })).json()) as any;
  assert.ok(pays.data.some((p: any) => p.status === "paid" && p.kind === "global_live_access"));
  const passes = (await (await fetch(`${base}/v1/academy/access-passes/me`, { headers: bearer(CS) })).json()) as any;
  assert.ok(passes.data.some((p: any) => p.status === "active" && p.sponsor_id === "avila-university"));
  const feeCoverages = await deps.store.applicationFeeCoverages.list();
  const feeCoverage = feeCoverages.find(
    (f) =>
      f.candidate_id === meId &&
      f.university_id === "avila-university" &&
      f.coverage_type === "florence_paid",
  );
  assert.ok(feeCoverage);
  assert.equal(feeCoverage.status, "eligible");
  assert.equal(feeCoverage.fee_amount_usd, 0);
  const feePatch = await fetch(`${base}/v1/academy/application-fee-coverages/${feeCoverage.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ status: "approved", approved_by: "smoke-operator" }),
  });
  assert.equal(feePatch.status, 200);
  const feePatchJson = (await feePatch.json()) as any;
  assert.equal(feePatchJson.status, "approved");
  const feeList = (await (await fetch(`${base}/v1/academy/application-fee-coverages?candidate_id=${meId}`, { headers: bearer(T) })).json()) as any;
  assert.ok(feeList.data.some((f: any) => f.id === feeCoverage.id && f.status === "approved"));
  ok("paid Global Live access records and updates Application Fee Coverage status");
  const applyCta = (await (await fetch(`${base}/v1/academy/apply-cta?placement=practice&sponsor=avila&session_id=anon_practice1234`)).json()) as any;
  assert.equal(applyCta.label, "Apply to U.S. Partner Programs");
  assert.equal(applyCta.subtext, "Application fees are covered by Florence for eligible applicants.");
  assertSafeApplyUrl(applyCta.destination_url, "avila");
  const ctaView = await fetch(`${base}/v1/academy/apply-cta/view`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ placement: "practice", sponsor: "avila", campaign_id: "global-live-access", session_id: "raw-session" }),
  });
  assert.equal(ctaView.status, 201);
  const ctaClick = await fetch(`${base}/v1/academy/apply-cta/click`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ placement: "practice", sponsor: "avila", campaign_id: "global-live-access", session_id: "anon_click1234" }),
  });
  assert.equal(ctaClick.status, 201);
  const ctaClickJson = (await ctaClick.json()) as any;
  assertSafeApplyUrl(ctaClickJson.destination_url, "avila");
  const academyEvents = await deps.store.academyEvents.list();
  assert.ok(academyEvents.some((e) => e.event_type === "academy.apply_cta_viewed"));
  assert.ok(academyEvents.some((e) => e.event_type === "academy.apply_cta_clicked"));
  assert.ok(academyEvents.some((e) => e.event_type === "academy.application_fee_coverage_created"));
  assert.ok(academyEvents.some((e) => e.event_type === "academy.application_fee_coverage_status_updated"));
  ok("Apply CTA view/click -> safe URL + auditable Academy events");

  // 5h.2) Academy Live residency manager: public schedule, student request, ops status, attendance.
  const residencyListRes = await fetch(`${base}/v1/academy/residencies`);
  assert.equal(residencyListRes.status, 200);
  const residencyList = (await residencyListRes.json()) as any;
  const manilaResidency = residencyList.data.find((r: any) => r.location === "manila");
  const laResidency = residencyList.data.find((r: any) => r.location === "los_angeles");
  assert.ok(manilaResidency);
  assert.ok(laResidency);
  assert.equal(manilaResidency.camps.length, 4);
  assert.ok(manilaResidency.camps.every((camp: any) => camp.contact_hours === 20));
  assert.ok(manilaResidency.camps.some((camp: any) => camp.camp_option === "morning"));
  assert.ok(manilaResidency.camps.some((camp: any) => camp.camp_option === "evening"));
  assert.ok(manilaResidency.camps.every((camp: any) => [50, 75, 100].includes(camp.seat_capacity)));
  const campId = "manila-2026-q4-morning-a";
  const reserveSeat = await fetch(`${base}/v1/academy/residency/reservations`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(CS) },
    body: JSON.stringify({ camp_id: campId }),
  });
  assert.equal(reserveSeat.status, 201);
  const reservation = (await reserveSeat.json()) as any;
  assert.equal(reservation.camp_id, campId);
  assert.equal(reservation.status, "requested");
  const waitlistReservation = await fetch(`${base}/v1/academy/residency/reservations/${reservation.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ status: "waitlisted" }),
  });
  assert.equal(waitlistReservation.status, 200);
  assert.equal(((await waitlistReservation.json()) as any).status, "waitlisted");
  const confirmReservation = await fetch(`${base}/v1/academy/residency/reservations/${reservation.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ status: "confirmed" }),
  });
  assert.equal(confirmReservation.status, 200);
  assert.equal(((await confirmReservation.json()) as any).status, "confirmed");
  const markAttendance = await fetch(`${base}/v1/academy/residency/reservations/${reservation.id}/attendance`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ session_date: "2026-07-06", status: "present" }),
  });
  assert.equal(markAttendance.status, 201);
  const attendanceJson = (await markAttendance.json()) as any;
  assert.equal(attendanceJson.location, "Manila residency");
  assert.equal(attendanceJson.status, "present");
  const cancelReservation = await fetch(`${base}/v1/academy/residency/reservations/${reservation.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ status: "cancelled" }),
  });
  assert.equal(cancelReservation.status, 200);
  assert.equal(((await cancelReservation.json()) as any).status, "cancelled");
  ok("Academy Live residency flow -> request, waitlist, confirm, attendance, cancel");

  // 5h.3) Florence Access Grants: verified gap -> review -> approve -> direct pay -> receipt QA.
  const gapRes = await fetch(`${base}/v1/academy/grants/gaps`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(CS) },
    body: JSON.stringify({
      pathway_stage: "visa_screen",
      estimated_gap_usd: 7200,
      verified_gap_usd: 6200,
      status: "gap_verified",
      documents_required: [],
    }),
  });
  assert.equal(gapRes.status, 201);
  const gapJson = (await gapRes.json()) as any;
  assert.equal(gapJson.gap.eligible_amount_usd, 5000);
  assert.equal(gapJson.eligibility.eligible, true);
  assert.equal(gapJson.grant.status, "eligible_for_review");
  assert.equal(gapJson.grant.requested_amount_usd, 5000);
  assert.equal(gapJson.grant.repayment_required, false);
  assert.equal(gapJson.grant.employment_required, false);
  const grantId = gapJson.grant.id;
  const approveGrant = await fetch(`${base}/v1/academy/grants/${grantId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ status: "approved", approved_amount_usd: 5000 }),
  });
  assert.equal(approveGrant.status, 200);
  const approvedGrant = (await approveGrant.json()) as any;
  assert.equal(approvedGrant.status, "approved");
  assert.equal(approvedGrant.approved_amount_usd, 5000);
  const disbursementRes = await fetch(`${base}/v1/academy/grants/disbursements`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({
      access_grant_id: grantId,
      amount_usd: 5000,
      recipient_type: "school",
      recipient_name: "Synthetic school finance office",
      status: "disbursement_pending",
    }),
  });
  assert.equal(disbursementRes.status, 201);
  const disbursementJson = (await disbursementRes.json()) as any;
  assert.equal(disbursementJson.direct_payment, true);
  assert.equal(disbursementJson.recipient_type, "school");
  const disbursedRes = await fetch(`${base}/v1/academy/grants/disbursements/${disbursementJson.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ status: "disbursed" }),
  });
  assert.equal(disbursedRes.status, 200);
  assert.equal(((await disbursedRes.json()) as any).status, "disbursed");
  const receiptRes = await fetch(`${base}/v1/academy/grants/receipts`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({
      disbursement_id: disbursementJson.id,
      status: "received",
      receipt_ref: "synthetic-receipt-ref",
    }),
  });
  assert.equal(receiptRes.status, 201);
  const receiptJson = (await receiptRes.json()) as any;
  const receiptQa = await fetch(`${base}/v1/academy/grants/receipts/${receiptJson.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ status: "receipt_qa_approved" }),
  });
  assert.equal(receiptQa.status, 200);
  assert.equal(((await receiptQa.json()) as any).status, "receipt_qa_approved");
  const grantList = (await (await fetch(`${base}/v1/academy/grants`, { headers: bearer(CS) })).json()) as any;
  assert.ok(grantList.data.some((grant: any) => grant.id === grantId && grant.status === "receipt_qa_approved"));
  const residencyGrantEvents = await deps.store.academyEvents.list();
  for (const eventType of [
    "academy.residency_seat_requested",
    "academy.residency_reservation_status_updated",
    "academy.residency_attendance_marked",
    "academy.grant_gap_calculated",
    "academy.access_grant_status_updated",
    "academy.grant_disbursement_recorded",
    "academy.grant_receipt_verified",
    "academy.grant_to_pathway",
    "academy.grant_to_start",
  ]) {
    assert.ok(residencyGrantEvents.some((e) => e.event_type === eventType), `missing ${eventType}`);
  }
  ok("Access Grant lifecycle -> gap review, approval, direct disbursement, receipt QA, Production Ledger events");

  const sponsorReportNoAuth = await fetch(`${base}/v1/academy/sponsors/avila/aggregate-report`);
  assert.equal(sponsorReportNoAuth.status, 401);
  const sponsorReportWrongScope = await fetch(`${base}/v1/academy/sponsors/avila/aggregate-report`, {
    headers: bearer(ro.json.access_token),
  });
  assert.equal(sponsorReportWrongScope.status, 403);
  const sponsorReport = await fetch(`${base}/v1/academy/sponsors/avila/aggregate-report`, { headers: bearer(T) });
  assert.equal(sponsorReport.status, 200);
  const sponsorReportJson = (await sponsorReport.json()) as any;
  assert.equal(sponsorReportJson.aggregate_only, true);
  assert.ok(sponsorReportJson.sponsored_activations >= 1);
  assert.ok(sponsorReportJson.apply_cta_views >= 1);
  assert.ok(sponsorReportJson.apply_cta_clicks >= 1);
  const sponsorReportText = JSON.stringify(sponsorReportJson);
  assert.equal(sponsorReportText.includes("candidate_id"), false);
  assert.equal(sponsorReportText.includes("full_name"), false);
  assert.equal(sponsorReportText.includes("email"), false);
  ok("sponsor aggregate report rejects unauth/wrong-scope and exposes aggregate counts only");
  const enrsRes = await fetch(`${base}/v1/enrollments?limit=200`, { headers: bearer(T) });
  const enrs = (await enrsRes.json()) as any;
  if (!enrs.data) throw new Error(`enrollments list: ${enrsRes.status} ${JSON.stringify(enrs)}`);
  const mine = enrs.data.find((e: any) => e.candidate_id === meId && e.cohort === "PAY-COHORT");
  assert.equal(mine.status, "deposit_paid");
  ok("Global Live access paid -> payment recorded, access pass active, enrollment advanced");

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

  // 5h.6) Candidate self-enroll after activating sponsored access.
  // Create a fresh cohort so we can self-enroll cleanly.
  const selfCohort = await fetch(`${base}/v1/cohorts`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(T) },
    body: JSON.stringify({ code: "SELF-ENROLL-1", name: "Self-Enroll Test", status: "scheduled", capacity: 4 }),
  });
  assert.equal(selfCohort.status, 201);

  // Already enrolled in PAY-COHORT - second enrollment in SELF-ENROLL-1 is fine.
  const selfOk = await fetch(`${base}/v1/enrollments`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(CS) },
    body: JSON.stringify({ candidate_id: meId, cohort: "SELF-ENROLL-1", status: "deposit_paid" }),
  });
  assert.equal(selfOk.status, 201);
  ok("candidate self-enrolls into a second cohort after sponsored access is active");

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

  // 5l) Instructor Copilot - cohort analytics (PAY-COHORT has ana, orange band)
  const copilot = (await (await fetch(`${base}/v1/cohorts/PAY-COHORT/copilot`, { headers: bearer(T) })).json()) as any;
  assert.equal(copilot.cohort, "PAY-COHORT");
  assert.ok(copilot.candidates >= 1);
  assert.ok(copilot.routing.bridge.includes(meId)); // orange → bridge route
  assert.ok(copilot.fallers.some((f: any) => f.candidate_id === meId));
  assert.equal(copilot.top_reteach[0].client_need, "pharmacological-therapies"); // weakest need
  ok("instructor copilot: routing draft + fallers + reteach priorities");

  // 5m) Partner surfaces - employer interview packets + university overview
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

  // 5m-H03) Employer TENANT isolation: an org-bound Core partner token sees a
  // candidate only when the candidate NAMED its org in consent — the bare boolean
  // no longer exposes candidates category-wide to org-bound partners. Org-less
  // internal tokens (like T above) keep the boolean behavior.
  {
    const { generateKeyPairSync, createSign } = await import("node:crypto");
    const { configureCoreAuth } = await import("../src/coreAuth.ts");
    const { createServer: createHttp } = await import("node:http");
    const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const kid = "smoke-h03";
    const jwk = { ...(publicKey.export({ format: "jwk" }) as Record<string, unknown>), kid, use: "sig", alg: "RS256" };
    const b64u = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const mintCore = (claims: Record<string, unknown>) => {
      const t = Math.floor(Date.now() / 1000);
      const input = `${b64u({ alg: "RS256", typ: "JWT", kid })}.${b64u({ iss: "florence-auth", aud: "florence", sub: "svc-emp", iat: t, exp: t + 3600, ...claims })}`;
      return `${input}.${createSign("RSA-SHA256").update(input).end().sign(privateKey).toString("base64url")}`;
    };
    const jwks = createHttp((req2, res2) => {
      if (req2.url?.startsWith("/.well-known/jwks.json")) { res2.setHeader("content-type", "application/json"); res2.end(JSON.stringify({ keys: [jwk] })); }
      else { res2.statusCode = 404; res2.end("{}"); }
    });
    await new Promise<void>((r) => jwks.listen(0, "127.0.0.1", () => r()));
    configureCoreAuth({ issuerUrl: `http://127.0.0.1:${(jwks.address() as { port: number }).port}`, issuer: "florence-auth", audience: "florence" });
    const orgA = mintCore({ role: "employer", org_id: "org-a", scope: "employer:read employer:write" });
    const orgB = mintCore({ role: "employer", org_id: "org-b", scope: "employer:read employer:write" });

    // The green candidate has boolean consent only → invisible to org-bound callers.
    const aBefore = (await (await fetch(`${base}/v1/employer/candidates`, { headers: { authorization: `Bearer ${orgA}` } })).json()) as any;
    assert.ok(!aBefore.data.some((p: any) => p.candidate_id === green.id));
    const aOfferBefore = await fetch(`${base}/v1/employer/offers`, {
      method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${orgA}` },
      body: JSON.stringify({ candidate_id: green.id, status: "offered" }),
    });
    assert.equal(aOfferBefore.status, 403);
    ok("H03: boolean-only consent does NOT expose the candidate to an org-bound partner");

    // Name org-a in consent → visible to A, still invisible to B; offers follow.
    await fetch(`${base}/v1/candidates/${green.id}`, {
      method: "PATCH", headers: { "content-type": "application/json", ...bearer(T) },
      body: JSON.stringify({ consent: { employer_sharing: true, employer_org_ids: ["org-a"] } }),
    });
    const aAfter = (await (await fetch(`${base}/v1/employer/candidates`, { headers: { authorization: `Bearer ${orgA}` } })).json()) as any;
    assert.ok(aAfter.data.some((p: any) => p.candidate_id === green.id));
    const bAfter = (await (await fetch(`${base}/v1/employer/candidates`, { headers: { authorization: `Bearer ${orgB}` } })).json()) as any;
    assert.ok(!bAfter.data.some((p: any) => p.candidate_id === green.id));
    const bOffer = await fetch(`${base}/v1/employer/offers`, {
      method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${orgB}` },
      body: JSON.stringify({ candidate_id: green.id, status: "offered" }),
    });
    assert.equal(bOffer.status, 403);
    const aOffer = await fetch(`${base}/v1/employer/offers`, {
      method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${orgA}` },
      body: JSON.stringify({ candidate_id: green.id, status: "offered" }),
    });
    assert.equal(aOffer.status, 201);
    ok("H03: named-org consent — visible + offerable ONLY to the named tenant (A yes, B 403)");

    // Internal org-less token keeps the boolean behavior (trusted proxy).
    const internalStill = (await (await fetch(`${base}/v1/employer/candidates`, { headers: bearer(T) })).json()) as any;
    assert.ok(internalStill.data.some((p: any) => p.candidate_id === green.id));
    ok("H03: internal org-less token unchanged (boolean consent honored)");
    jwks.close();
  }

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

  // Candidate self-attests an affiliation; Global Live access remains $100 under
  // the current sponsored-access model.
  const aff = await fetch(`${base}/v1/candidates/${meId}/affiliations`, {
    method: "POST", headers: { "content-type": "application/json", ...bearer(CS) },
    body: JSON.stringify({ school_slug: "FLR-DEMO-A", role: "student" }),
  });
  assert.equal(aff.status, 201);
  const affJson = (await aff.json()) as any;
  assert.equal(affJson.verification, "self_attested"); // ana's email isn't @demoa.edu
  ok("candidate self-attestation → 201 with verification=self_attested");

  const co = (await (await fetch(`${base}/v1/academy/access-passes/checkout`, {
    method: "POST", headers: { "content-type": "application/json", ...bearer(CS) }, body: JSON.stringify({ sponsor: "webster", session_id: "anon_school1234" }),
  })).json()) as any;
  assert.equal(co.amount_cents, 10000);
  assert.equal(co.quote.sponsor_slug, "webster");
  ok("eligible-school candidate Global Live checkout -> $100 sponsored access");

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
  ok("candidate reads their pathway tasks - latest-per-kind projection");

  // Cross-candidate read blocked.
  const crossPt = await fetch(`${base}/v1/candidates/${candId}/pathway-tasks`, { headers: bearer(CS) });
  assert.equal(crossPt.status, 403);
  ok("candidate session blocked from another candidate's pathway tasks");

  // 5q) Audit transparency - "Who has accessed my data?"
  const myAudit = (await (await fetch(`${base}/v1/me/audit`, { headers: bearer(CS) })).json()) as any;
  assert.ok(Array.isArray(myAudit.data));
  assert.ok(myAudit.data.length > 0);
  // Actor is bucketed (you/ops/agent name) - no raw client ids or field values.
  assert.ok(myAudit.data.every((e: any) => typeof e.actor === "string" && typeof e.action === "string"));
  assert.ok(myAudit.data.some((e: any) => e.actor === "you")); // candidate's own actions
  assert.ok(myAudit.data.some((e: any) => e.actor === "ops")); // T-token ops actions (PATCH consent, etc.)
  ok("GET /v1/me/audit returns the candidate's own access log (actor-classified)");

  // 5r) Drip campaign (Phase 3) - re-permission first, consent-gated, compliant
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

  // Opt in the two non-unsub leads (consent), then advance to the sponsored-access stage.
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
  assert.ok(mp && mp.text.includes("$200 value") && mp.text.includes("$100 university sponsorship") && mp.text.includes("$100 student price"));
  ok("drip tier copy → partner-school lead gets the sponsored Global Live access offer");
  const mb = mockEmail.lastFor("drip-plain@example.com");
  assert.ok(mb && mb.text.includes("$100 student price") && !mb.text.includes("$75"));
  ok("drip tier copy → non-partner lead gets the generic Global Live access offer");

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
  const emDash = String.fromCharCode(0x2014);
  const enDash = String.fromCharCode(0x2013);
  for (const bad of [emDash, enDash, `<${"em"}`, `<${"i"}`, "visa", "fica", "immigration", " tax"])
    assert.ok(!corpus.includes(bad), `drip copy must not contain ${JSON.stringify(bad)}`);
  ok("drip copy brand lint → no forbidden terms / em-dashes / italics");

  // 6) Audit trail
  const audits = deps.audit.recent(2000); // full trail — the H03 section adds requests past the 50-entry default
  assert.ok(audits.length >= 6);
  assert.ok(audits.some((a) => a.action.includes("assessment-results") && a.outcome === 201));
  assert.ok(audits.every((a) => typeof a.request_id === "string"));
  ok("append-only audit trail recorded");

  console.log(`\nPASS - ${passed} checks`);
  server.close();
  process.exit(0);
} catch (e) {
  console.error("\nFAIL:", e);
  server.close();
  process.exit(1);
}
