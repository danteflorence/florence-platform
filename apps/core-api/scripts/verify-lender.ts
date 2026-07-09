// Lender Data API — end-to-end proof. Boots Core + gateway in-process, provisions an
// ORG-BOUND lender M2M key (partner bank), mints its client_credentials token, and
// proves the consent-gated, fair-lending data flow a warehouse partner bank uses (and
// FlorenceRN's own future bank reuses verbatim):
//   • credit-data is consent-gated, EXCLUDES visa/nationality, enforces allowed_fields
//   • a lender CANNOT escalate to the internal Passport
//   • consent revoke ⇒ fail-closed 403
//   • credit decisions: denial requires reason_codes (ECOA/FCRA) + adverse-action stamp
//   • candidate data-dispute (FCRA) round-trips
//   • continuous feed is scoped to consented nurses only
//   • warehouse portfolio is k-anonymized; loan-tape carries no prohibited-basis
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
  const LENDER_ORG = "org-warehouse-bank";

  const opsToken = mintUserSession(keys, mkUser("u-ops", "ops@florence.dev"), [grant("super_admin")]).token;
  const call = async (method: string, path: string, token?: string, body?: unknown) => {
    const r = await fetch(`${base}${path}`, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const t = await r.text(); return { status: r.status, body: t ? JSON.parse(t) : null };
  };

  // ── seed: 5 consented nurses (started + 90d retained) + 1 UNCONSENTED nurse ──
  const ids: string[] = [];
  for (let i = 0; i < 5; i++) {
    const res = await call("POST", "/v1/nurse/resolve", opsToken, { email: `n${i}@x.dev`, name: `RN ${i}` });
    const nid = res.body.nurseId as string; ids.push(nid);
    await call("POST", "/v1/nurse/event", opsToken, { nurseId: nid, source: "test", type: "pathway.licensure_status", data: { status: "issued", state: "NV" } });
    await call("POST", "/v1/nurse/event", opsToken, { nurseId: nid, source: "test", type: "ats.started", data: {} });
    await call("POST", "/v1/nurse/event", opsToken, { nurseId: nid, source: "test", type: "ats.retention_90d", data: {} });
    // nurse[0] also has a visa decision (so the lender view carries visa.stage → credit-data must drop it)
    if (i === 0) await call("POST", "/v1/nurse/event", opsToken, { nurseId: nid, source: "test", type: "pathway.visa_status", data: { stage: "decision", outcome: "approved" } });
    // consent: full allowed_fields EXCEPT nurse[0] which omits 'billing' (tests field-minimization)
    const allowedFields = i === 0 ? ["nurseId", "name", "readiness", "nclex", "licensure"] : ["nurseId", "name", "readiness", "nclex", "licensure", "billing", "placement", "retention", "funnelStage"];
    await call("POST", "/v1/consent/grant", opsToken, { nurseId: nid, purpose: "underwriting", recipientCategory: "lender", recipientOrgId: LENDER_ORG, consentTextVersion: "v1", allowedFields });
  }
  const noConsent = (await call("POST", "/v1/nurse/resolve", opsToken, { email: "noconsent@x.dev", name: "RN X" })).body.nurseId as string;
  await call("POST", "/v1/nurse/event", opsToken, { nurseId: noConsent, source: "test", type: "ats.started", data: {} });

  // ── provision an ORG-BOUND lender key + mint its M2M token ──────────────────
  const key = await call("POST", "/v1/partner-keys", opsToken, { name: "WarehouseBank", org_id: LENDER_ORG, scopes: ["passport:read:lender", "credit:read", "credit:decide", "lender:portfolio:read"] });
  ok("lender key: provisioned org-bound (org_id required + returned)", key.status === 201 && key.body.org_id === LENDER_ORG && typeof key.body.client_secret === "string");
  const noOrg = await call("POST", "/v1/partner-keys", opsToken, { name: "BadBank", scopes: ["passport:read:lender"] });
  ok("lender key: WITHOUT org_id ⇒ 400 (lender keys must be org-bound)", noOrg.status === 400);
  const issued = await issueClientToken(store, keys, key.body.client_id, key.body.client_secret);
  ok("lender token: minted via client_credentials (carries org_id)", issued.ok === true);
  const lenderToken = issued.ok ? issued.token.access_token : "";

  // ── credit-data: consent-gated, fair-lending-scoped, field-minimized ────────
  const cd = await call("GET", `/v1/nurses/${ids[0]}/credit-data`, lenderToken);
  ok("credit-data: lender reads ⇒ 200", cd.status === 200);
  ok("credit-data: EXCLUDES visa/nationality (ECOA/Reg B)", !/visa|nation",|nationality/i.test(JSON.stringify(cd.body.creditData)) && cd.body.excluded.prohibitedBasis.includes("visa"));
  ok("credit-data: readiness/licensure present", !!cd.body.creditData.readiness && !!cd.body.creditData.licensure);
  ok("credit-data: allowed_fields enforced — billing dropped byConsent", !("billing" in cd.body.creditData) && cd.body.excluded.byConsent.includes("billing"));

  // ── escalation impossible: a lender token cannot read the internal Passport ─
  const esc = await call("GET", `/v1/nurses/${ids[0]}/passport?view=internal`, lenderToken);
  ok("escalation: lender token CANNOT read internal passport ⇒ 403", esc.status === 403);

  // ── credit decisions: ECOA/FCRA (denial needs reason codes + adverse action) ─
  const denyNoReason = await call("POST", "/v1/credit-decisions", lenderToken, { nurseId: ids[0], decision: "denied", reason_codes: [] });
  ok("decision: denial WITHOUT reason_codes ⇒ 400 (ECOA adverse-action basis)", denyNoReason.status === 400);
  const deny = await call("POST", "/v1/credit-decisions", lenderToken, { nurseId: ids[0], decision: "denied", reason_codes: ["insufficient_credit_history"] });
  ok("decision: denial WITH reason_codes ⇒ 201 + adverse-action stamped", deny.status === 201 && !!deny.body.adverseActionAt);
  const aa = await call("POST", `/v1/credit-decisions/${deny.body.id}/adverse-action`, lenderToken, {});
  ok("decision: adverse-action notice ⇒ 200 + reason codes", aa.status === 200 && aa.body.reasonCodes.includes("insufficient_credit_history"));
  const decList = await call("GET", `/v1/nurses/${ids[0]}/credit-decisions`, lenderToken);
  ok("decision: list returns the org's decision", decList.status === 200 && decList.body.decisions.some((d: { id: string }) => d.id === deny.body.id));

  // ── candidate data dispute (FCRA accuracy) ─────────────────────────────────
  const disp = await call("POST", "/v1/disputes", opsToken, { nurseId: ids[0], field: "licensure.state", claim: "state is wrong" });
  ok("dispute: staff raises a data-accuracy dispute ⇒ 201", disp.status === 201 && disp.body.status === "open");
  const dispList = await call("GET", `/v1/nurses/${ids[0]}/disputes`, opsToken);
  ok("dispute: list returns it", dispList.status === 200 && dispList.body.disputes.length === 1);
  ok("dispute: lender token (no staff/self) ⇒ 403", (await call("GET", `/v1/nurses/${ids[0]}/disputes`, lenderToken)).status === 403);

  // ── continuous feed: scoped to CONSENTED nurses only ───────────────────────
  const feed = await call("GET", "/v1/lender/events", lenderToken);
  ok("feed: returns loan-performance events for consented nurses", feed.status === 200 && feed.body.events.some((e: { type: string }) => e.type === "ats.started"));
  ok("feed: the UNCONSENTED nurse never appears", !feed.body.events.some((e: { nurseId: string }) => e.nurseId === noConsent));

  // ── warehouse portfolio (k-anon) + loan tape (no prohibited-basis) ─────────
  const pf = await call("GET", "/v1/lender/portfolio", lenderToken);
  ok("portfolio: cohort of 5 ⇒ aggregate returned (≥ k-anon threshold)", pf.status === 200 && pf.body.cohortSize === 5 && !pf.body.suppressed && !!pf.body.byStage);
  ok("portfolio: retention + decisions tallied", typeof pf.body.retention.d90 === "number" && pf.body.decisions.denied >= 1);
  const tape = await call("GET", "/v1/lender/loan-tape", lenderToken);
  ok("loan-tape: a row per consented nurse, NO visa/nationality", tape.status === 200 && tape.body.loans.length === 5 && !/visa|nationality/i.test(JSON.stringify(tape.body.loans)));

  // ── fail-closed: revoke consent ⇒ credit-data 403 ──────────────────────────
  const consents = await call("GET", `/v1/consent?nurseId=${ids[0]}`, opsToken);
  const consentId = consents.body.consents?.[0]?.id ?? consents.body[0]?.id;
  await call("POST", "/v1/consent/revoke", opsToken, { consentId, purpose: "underwriting", nurseId: ids[0] });
  const afterRevoke = await call("GET", `/v1/nurses/${ids[0]}/credit-data`, lenderToken);
  ok("fail-closed: after consent revoke ⇒ credit-data 403", afterRevoke.status === 403);

  server.close();
  console.log(`\n${fail ? "LENDER SMOKE FAILED" : "LENDER SMOKE PASSED"} — ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
