# FlorenceRN API-first re-platform to Core — Phase 1 build report

**Date:** 2026-06-15. **Scope:** Phase 1 (the de-risking slice) of the "Core becomes the single canonical
Platform API" program. Everything additive, flag-gated, mock-by-default; no deploys/secrets. All suites green.

## What Phase 1 proves
"One nurse, one passport, read THROUGH the gateway." The slice touches every load-bearing part of the
re-platform once, on the lowest-risk object (a read already mirrored to Core), and lands the one genuinely-new
storage piece (durable idempotency):
1. A **Platform API gateway inside Core** (zero-dep node:http) with regex routing + auth + scope gate + audit.
2. The **Core-canonical Passport read path** behind it — one redactor, one audit point.
3. The **ats `/v1` passport read flips to Core** (strangler-fig, with a local fallback circuit-breaker).
4. The first **embeddable React Component SDK** widget (NursePassport) consuming the typed SDK.

## Delivered

### Durable idempotency (replaces the in-memory Map)
- ats dual-store: `idempotency_keys` table + `store.idempotency.{get,put}` in `server/store/{types,sqlite,postgres}.ts`;
  `server/api/v1/index.ts` `idempotent()` is now async + store-backed, caller-scoped (`user:method:path:key`),
  persists only 2xx. Tested by `platform-api-smoke` (one ledger row on replay) on **sqlite + PGlite**.
- Core gateway carries an idempotency hook (in-process for P1; the durable Core table lands with the first
  gateway WRITE module — no P1 gateway route writes, so no untested schema added).

### Core gateway (`florence-core/src/gateway/`)
- `router.ts` — regex/path-param router (ported from Academy's `api/src/http.ts` matcher) + `GwCtx`/`GwResult`.
- `pipeline.ts` — `createGatewayDispatch`: authenticate (Core RS256 cookie/Bearer) → static scope gate →
  handler → send; returns false on no-match so legacy exact routes / 404 still work.
- `scopes.ts` — the ONE unified scope catalog (`UNIFIED_SCOPES`) + `SCOPE_SUPERSETS` + `SCOPE_ALIASES` +
  `scopeSatisfies` (a broad grant satisfies narrower needs; legacy names keep working). No TS enums.
- `modules/nurses.ts` — `GET /v1/nurses/:id/passport?view=…` over the canonical read path; `view`→audience map.
- `openapi.ts` — aggregates gateway routes into one **OpenAPI 3.1** doc; served public at `GET /v1/openapi.json`.
- `index.ts` — assembles modules + the dispatcher. Mounted in `src/server.ts` (`createApp(routes, gateway?)` —
  legacy exact routes first, then the gateway) and wired in `src/index.ts`.

### One canonical read path (`florence-core/src/passportRead.ts`)
Extracted the audience-derivation helpers + the consent-gate + ABAC policy + redaction + tamper-evident
read-audit into `readPassportView(...)`. BOTH the legacy `GET /v1/nurse/passport` handler (`routes.ts`, now a
thin wrapper) AND the gateway nurses module call it — a single redactor + single audit point. `passportView.ts`
is untouched; the employer audience still withholds visa/nationality/financing (Title VII/IRCA).

### ats passport read → Core-canonical (strangler-fig)
`server/passport.ts` gains `getCorePassportView(sel, view)` (view→audience+purpose). `server/api/v1/index.ts`
`GET /nurses/:id/passport` reads from Core when `READ_VIA_CORE` includes `passport` AND the spine is configured,
else falls back to the local projection. **Default OFF** → mock-by-default + every suite stays Core-free + green.

### Embeddable Component SDK (`florence-ats-connect/sdk/components/`)
- `passportCardModel.ts` — pure view-model with render-layer **defense-in-depth**: `NEVER_RENDER` drops
  visa/nationality/financing/SSN even on a non-redacted payload.
- `NursePassportCard.tsx` — React widget consuming the typed SDK (`sdk/florencern.ts`), `client`-injectable for
  embedding/SSR/testing. Workspace-internal (published as `@florencern/components` in a later phase).
- `index.ts` — barrel export.

## Verification (toolchain Node 24; both backends; mock-by-default, no secrets)

| Suite | Result |
|---|---|
| **NEW** Core `verify-gateway` (read-through end-to-end) | **15/15** — employer read from Core OMITS visa/financing; internal carries visa; no audience escalation; no-scope ⇒ 403; no token ⇒ 401; OpenAPI 3.1 public; passport.read audit + chain verifies; consent-revoke ⇒ 403 fail-closed |
| **NEW** ats `component-sdk-smoke` | 6/6 — model drops visa/financing/nationality/SSN; SDK→model renders band, no visa; widget importable |
| ats `platform-api-smoke` | 32/32 sqlite + PGlite (now durable idempotency) |
| ats demand/opportunity/longtail/application-gate/program/reservations/onboarding | 78·48·34·26·21·13·6 — sqlite + PGlite |
| ats typecheck + production build | clean |
| Core typecheck · verify-security · verify-control-tower · verify-audit · verify-retention · verify-onboarding-risk · verify-university-investor | clean · 36 · 29 · ok · 16 · 27 · 11 |
| Academy api + frontend typecheck · Pathway typecheck | clean |

Real-process boots earlier in the session confirmed Core serves `/v1/openapi.json` publicly + 401s authed `/v1`.

## Compliance held (code-enforced)
Visa/financing never on the employer surface (employer view + the component's `NEVER_RENDER` both drop them);
fail-closed (consent-revoke ⇒ 403; no token ⇒ 401; no scope ⇒ 403); audit on every disclosure + tamper-evident
chain; idempotency on creates (now durable); financing stays OUT (no endpoints; Core's latent `lender` audience
left untouched); mock-by-default (full suite green with no secrets, gateway in-process).

## Next phases (staged roadmap — see the plan file)
- **P2:** flip remaining capability reads to Core; **Pathway /v1 module**; unify the scope catalog across apps
  (kill the hand-synced copies); Developer Portal v0 (static OpenAPI render).
- **P3:** unify the Production Ledger (Core `nurse_events` canonical; ats ledger → projection); Component SDK
  publish (Vite library mode); Dev Portal v1 (API keys over Core M2M); outbound webhooks; **Model Gateway**.
- **P4:** external-partner hardening (Core horizontal-scale, per-client rate limits, sandbox, partner onboarding).
Financing remains permanently staged-out.
