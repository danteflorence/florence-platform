// End-to-end proof of the Nurse Passport spine: mint an M2M token, then simulate
// all four apps writing to ONE nurse — Academy (enroll + readiness), Pathway
// (NCLEX + licensure + visa + docs), ATS (match → interview → offer →
// start) — resolving by DIFFERENT keys (academy ref, email, ats ref) to prove
// four records converge on one identity. Then read the folded Passport and the
// funnel. Run against a live Core:
//
//   CORE_URL=http://127.0.0.1:8090 DEMO_CLIENT_SECRET=devsecret \
//     node scripts/verify-spine.ts

const CORE = (process.env.CORE_URL ?? "http://127.0.0.1:8090").replace(/\/$/, "");
const CLIENT_ID = process.env.DEMO_CLIENT_ID ?? "florence-core-demo";
const CLIENT_SECRET = process.env.DEMO_CLIENT_SECRET ?? "devsecret";

let pass = 0;
let fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
  cond ? (pass += 1) : (fail += 1);
};

// --- mint M2M token ---------------------------------------------------------
const tokRes = await fetch(`${CORE}/oauth/token`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: "passport:read passport:write",
  }),
});
const tok = (await tokRes.json().catch(() => ({}))) as { access_token?: string; scope?: string };
ok("M2M token minted with passport scopes", tokRes.status === 200 && !!tok.access_token, tok.scope);
const TOKEN = tok.access_token ?? "";

const authed = (path: string, method = "GET", body?: unknown) =>
  fetch(`${CORE}${path}`, {
    method,
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

// --- scope enforcement ------------------------------------------------------
const noTok = await fetch(`${CORE}/v1/nurse/passport?email=x@y.com`);
ok("unauthenticated passport read rejected (401)", noTok.status === 401);

const EMAIL = "maria.santos@example.com";

// --- 1) Academy: resolve by academy ref + email, then emit readiness --------
const r1 = await authed("/v1/nurse/resolve", "POST", { email: EMAIL, name: "Maria Santos", ref: { app: "academy", externalId: "acad-123" } });
const resolved = (await r1.json()) as { nurseId?: string };
ok("resolve created canonical nurse (academy)", r1.status === 200 && !!resolved.nurseId, resolved.nurseId);
const nurseId = resolved.nurseId!;

await authed("/v1/nurse/event", "POST", { nurseId, type: "academy.enrolled", source: "academy", data: { cohort: "2026-Q3" } });
await authed("/v1/nurse/event", "POST", { nurseId, type: "academy.assessment_completed", source: "academy", data: { theta: 0.8, passProbability: 0.88, band: "green" } });

// --- 2) Pathway: resolve by EMAIL (no nurseId) → must hit the SAME nurse ----
await authed("/v1/nurse/event", "POST", { email: EMAIL, type: "pathway.nclex_status", source: "pathway", data: { status: "passed", result: "pass" } });
await authed("/v1/nurse/event", "POST", { email: EMAIL, type: "pathway.licensure_status", source: "pathway", data: { status: "issued", state: "CA" } });
await authed("/v1/nurse/event", "POST", { email: EMAIL, type: "pathway.visa_status", source: "pathway", data: { stage: "ds160_filed" } });
await authed("/v1/nurse/event", "POST", { email: EMAIL, type: "pathway.document_verified", source: "pathway", data: { key: "passport_bio" } });
await authed("/v1/nurse/event", "POST", { email: EMAIL, type: "consent.updated", source: "pathway", data: { scope: "employer_share", status: "granted" } });

// --- 3) ATS: resolve by a NEW ats ref + email → links to the SAME nurse -----
const atsRef = { app: "ats", externalId: "ats-789" };
for (const [type, data] of [
  ["ats.matched", { employer: "Sutter Health", employerId: "emp-1", jobReqId: "REQ-1" }],
  ["ats.interview", {}],
  ["ats.offer", {}],
  ["ats.started", { startDate: "2027-01-15" }],
] as const) {
  await authed("/v1/nurse/event", "POST", { email: EMAIL, ref: atsRef, type, source: "ats", data });
}

// --- 4) read the folded Passport -------------------------------------------
const pRes = await authed(`/v1/nurse/passport?email=${encodeURIComponent(EMAIL)}`);
const passport = (await pRes.json()) as any;
ok("passport readable", pRes.status === 200 && passport.nurseId === nurseId);
ok("identity converged: academy + ats refs on one nurse", (passport.refs ?? []).length === 2, (passport.refs ?? []).map((r: any) => r.app).join("+"));
ok("readiness folded (passProbability 0.88, band green)", passport.readiness?.passProbability === 0.88 && passport.readiness?.band === "green");
ok("NCLEX folded (passed)", passport.nclex?.status === "passed");
ok("licensure folded (CA issued)", passport.licensure?.state === "CA" && passport.licensure?.status === "issued");
ok("visa folded", passport.visa?.stage === "ds160_filed");
ok("document folded", passport.documents?.passport_bio === true);
ok("consent folded", passport.consents?.employer_share === "granted");
ok("placement folded (started @ Sutter)", passport.placement?.stage === "started" && passport.placement?.employer === "Sutter Health");
ok("funnel reached 'started' (rank 9)", passport.funnelStage === "started" && passport.funnelRank === 9, `${passport.funnelStage}/${passport.funnelRank}, ${passport.eventCount} events`);

// --- 5) read by ATS ref → same nurse (convergence proof) --------------------
const byRef = await authed(`/v1/nurse/passport?ref=ats:ats-789`);
const pRef = (await byRef.json()) as any;
ok("passport reachable by ats ref → same nurse", byRef.status === 200 && pRef.nurseId === nurseId);

console.log(`\n${fail ? "SPINE FAILED" : "SPINE PASSED"} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
