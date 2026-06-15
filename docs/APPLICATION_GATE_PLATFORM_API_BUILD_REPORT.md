# FlorenceRN — Application Submission Gate + Platform API v1 (overnight build report)

**Run:** 2026-06-15, autonomous ~9h unattended. **Outcome:** all build tasks complete; every suite green
on **both backends** (sqlite + PGlite) + typechecks + production build clean. Mock-by-default throughout —
no deploys, no secrets, no live partner calls.

Three stacked operator directives this run:
- **(A) Application Submission Gate + 3-state model** — *interest is free; submission is hard-gated.* (PRIMARY)
- **(B) Token-efficiency governing philosophy** — *"use tokens to build the machine, not as the machine."*
  The gate is the first concrete artifact of that frame: a pure, inspectable rules function (no LLM),
  fail-closed, cached, writing to the Production Ledger. The broader Orchestrator/Model-Gateway/Rules-
  Engine/Packet-Factory/QA-Workbench/Token-to-Start program is **recorded as roadmap**, not built.
- **(C) API-first Platform API** — every surface becomes a client of one permissioned, versioned,
  idempotent, event-driven `/v1` contract. (SECOND priority)

---

## A. Application Submission Gate (AG0–AG6 + AG0b) — COMPLETE + VERIFIED

**Rule enforced in code:** a nurse may *express interest* in any job (a free internal signal), but FlorenceRN
will not submit an employer application, build an employer-facing packet, or represent a candidate as available
until ALL hard gates clear — **employer-share consent + visa approved + license verified-active + human QA
approved + documents complete + employer/channel authorized + job open + packet data-minimized.** Three states:
**Interest → Application-ready → Submitted.** Interviews/offers/start are labeled *subject to consular processing
+ employer onboarding*; **bill only after a verified start.**

- **Fail-closed:** only `visaStatus ∈ {approved, not_required}` clears the visa clause; `unknown/undefined/
  pending/administrative_processing/refused/expired` ⇒ blocked. Public-interest leads (`visa unknown`) can
  never reach submit.
- **Hard-block + audited override:** `APPLICATION_GATE_ENFORCE` defaults ON; an override needs a reason; the
  **visa-key override is super_admin-only** (ops cannot clear it); every override + block is audited.
- **Visa is INTERNAL-only, everywhere:** never on any employer surface (packet, public card, employer passport
  view). Title VII / IRCA.

**Artifacts (ATS):** `shared/applicationGate.ts` (pure canonical gate + `candidateApplicationReady`),
`server/applicationGateEnforce.ts` (hard-block + `OverrideTicket`/`validApplicationOverride` + audit),
`shared/opportunityState.ts` `effectiveCta`, `shared/statusLabels.ts` (nurse/employer/interview labels, never
exposes visa), `server/candidateProvider.ts` `deriveVisaStatus` (fail-closed), 7 additive `LedgerStage`s +
`server/ledger.ts` maps (`start_cleared` is HRIS/billing-grade), `server/program/slate.ts` `gatePending` bucket,
`GET /ops/application-queue` + `src/surfaces/ops/ApplicationQueue.tsx` (Interest-to-Application Queue).
**Verify:** `scripts/application-gate-smoke.ts` — **26/26 both backends.**

**AG0b — cross-repo visa capture (the deterministic single source), additive:**
- **pathway** `POST /workflows/:id/visa-result` — STAFF-attested (ops/QA; AI never decides, candidate never
  self-reports). Persists `WorkflowInstance.visaOutcome`, records a submission + audit, and emits
  `pathway.visa_status { stage:'decision', outcome }`. Vocab `VISA_OUTCOMES`/`VisaOutcome` +
  `visaResultSchema` (`shared/constants.ts`, `shared/schema.ts`). Only `approved` clears the gate downstream.
- **core** `src/passport.ts` visa facet `{ stage } → { stage, outcome }`; reducer carries `outcome`.
  **`passportView.ts` UNTOUCHED** — the employer audience still withholds the entire visa facet.
- **Verify:** core + pathway typecheck clean; `verify-security` **36/0**, `verify-control-tower` **29/0**;
  in-process check — outcome round-trips through the reducer, employer view omits it, internal_ops carries it;
  pathway boots + the new route is correctly staff-gated (401 without auth).

---

## C. Platform API v1 (API1–API5) — COMPLETE + VERIFIED

A thin, versioned, **scoped + idempotent + event-driven `/v1` layer over the EXISTING handlers** (no rewrite),
mounted alongside the internal `/api/ops/*` routes (which keep working). The **Nurse Passport** is the central
object (permissioned views); the **Production Ledger** is the system of record; every workflow is an event.

- **`server/api/v1/index.ts`** — `apiV1` router; Core-role→scope map (`ROLE_SCOPES`: ops full / employer
  redacted); `requireScope`; in-memory `Idempotency-Key` cache (`idempotent`); `requireAuth` on every route.
  Modules: `GET /` meta, `/nurses/:id` (+ `/passport?view=`, `/next-actions`, `/opportunities`),
  `/opportunities` (+ `/:id`, `/:id/interest`), `/applications/eligibility-check`, `/applications/:packetId/submit`
  (reuses the G2 enforcer → 409 with `missing[]`), `/pricing/quote` (proxies the deterministic Workforce
  Economist; FICA customer-side), `/programs` (+ `/:id`), `/events` (POST/GET → ledger spine), `/ledger`,
  `/ledger/forecast`.
- **`server/api/v1/passportView.ts`** — local audience redactor mirroring Core; the **employer** view withholds
  `visaStatus / nationality / countryOfEducation / currentCountry / financing` (with reasons in `withheld[]`).
- **`server/api/v1/openapi.ts`** + `GET /v1/openapi.json` (public/unauthenticated) — OpenAPI **3.1** contract:
  security schemes (Core cookie + bearer), `x-scopes`, `Idempotency-Key` param, all paths. Documents the
  employer no-visa invariant.
- **`sdk/florencern.ts`** — dependency-free typed TypeScript client over `/v1` (the internal SDK our own
  surfaces + partners build against; cookie or bearer; idempotency-key on creates).
- **Verify:** `scripts/platform-api-smoke.ts` — **32/32 both backends.** Boots the real `/v1` Express app behind
  a self-minted RS256 token (throwaway in-process JWKS server) so `requireAuth` + scope gates + idempotency +
  the actual handlers all run end-to-end (no Core needed), exercised THROUGH the SDK. Asserts: OpenAPI parses +
  documents the invariant; no token ⇒ 401; openapi public ⇒ 200; ops reaches every module; employer is redacted
  (no internal nurse, no submit) ⇒ 403; passport employer view omits visa/financing (withheld[] names them);
  gate endpoint returns express_interest + the missing[] list (visa-unknown ⇒ visa in missing, fail-closed);
  submit hard-gated (409) + idempotent (one ledger row, never double-submits); events idempotent (one
  attribution row); pricing keeps FICA customer-side. Plus a real-process server boot confirms the wiring.

---

## Full verification matrix (toolchain Node 24; both backends)

| Suite | Result |
|---|---|
| ATS typecheck + production build | clean |
| platform-api-smoke | **32/32** sqlite + PGlite |
| application-gate-smoke | 26/26 sqlite + PGlite |
| demand-smoke | 78/78 sqlite + PGlite |
| opportunity-smoke | 48/48 sqlite + PGlite |
| longtail-smoke | 34/34 sqlite + PGlite |
| program-smoke | 21/21 sqlite + PGlite |
| reservations-smoke | 13/13 sqlite + PGlite |
| onboarding-risk-smoke | 6/6 sqlite + PGlite |
| core typecheck · verify-security · verify-control-tower | clean · 36/0 · 29/0 |
| pathway typecheck | clean |

**Not run (environmental, not regressions):** the live `smoke` (ATS) and `verify-spine` (core) are
live-integration harnesses that require a booted Core (+ seeded dev admin) on :8090/:8788. `platform-api-smoke`
(self-minted token) + the AG0b in-process check cover the same `/v1` and visa-fold surfaces without that
dependency; both apps were also boot-probed in a real process.

---

## B. Token-efficiency program — RECORDED as roadmap (NOT built this run)

North-star metric: **token cost per started RN.** Already built across prior arcs: Nurse Passport + Core spine,
Consent service, Production Ledger (event truth), deterministic Pricing API, Demand/Opportunity graph
(rules-based), Packet + per-audience redaction, the walkthrough QA gate, Capacity Outreach (generate-once/
cache), tracked Link Service, Control Tower, security spine. **The Application Gate (this run) is the first
formal Rules-Engine artifact.** Net-new infra sequenced for later passes: Model Gateway (+ Token-to-Start
dashboard), Workflow Definition System + thin Orchestrator, Packet Factory generalization, QA Workbench,
Rules/Prompt/Template registries + content-hash caching, per-workflow Evaluation Harness, Ops Autopilot.

## Staged / recorded for later (API)
API Gateway product, Developer Portal + sandbox + partner API keys, embeddable React component SDK
(NursePassport/JobTiles/ApplicationGate widgets), webhooks (AMN/lenders/ATS), external partner OAuth/mTLS,
financing/university capability APIs, microservice split. Modular-monolith first; contract > microservices.

## Compliance invariants (enforced in code)
Visa/immigration NEVER on any employer surface (Title VII/IRCA); fail-closed gate (unknown ⇒ block);
data-minimized packets (no financing/underwriting/immigration); FICA/payroll-tax stays customer effective-cost,
never FlorenceRN revenue; bill only after a verified (HRIS/attestation) start; interview/offer/start labeled
subject-to-consular/onboarding; AI drafts, humans QA, candidates attest; no autonomous unsupervised submission
into government/ATS/credentialing portals; no PII in URLs; idempotency on creates; audit sensitive reads/writes.

## User-owned / next
Counsel sign-off on the visa-outcome capture + any portal automation; provisioning Core M2M clients + running
the live `verify-spine` / ATS `smoke` against a deployed Core; a durable idempotency store (in-memory now);
wiring the pathway `visaOutcome` into the ATS read-projection so the gate reads the captured decision directly
(the ATS-local ops-set `visaStatus` bridge ships today).
