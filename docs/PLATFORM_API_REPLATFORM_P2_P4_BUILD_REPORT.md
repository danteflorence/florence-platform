# FlorenceRN API-first re-platform to Core — Phases 2–4 build report

**Date:** 2026-06-15 (autonomous run while the operator drafts the pitch deck). Continues the P1 slice
(gateway-in-Core + canonical Passport read). Everything additive, flag-gated, mock-by-default; no deploys,
no secrets, no live partner calls. All suites green on both backends.

## Phase 2 — rest of read-path + Pathway /v1 + unified scopes + Dev Portal v0
- **Pathway /v1 capability module** (`florence-pathway-agent/server/api/v1/`): `GET /v1/pathway/:id/{status,tasks,
  readiness}` + public `/v1/openapi.json`, over the EXISTING handlers (`getDossier`, `nextActions`,
  `checkReadinessGate`). STAFF-or-candidate-self gated (`authFor` via coreAuth); visa stays INTERNAL-only (no
  employer audience exists here). Mounted at `/v1` alongside `/api`. **pathway-v1-smoke 9/9.**
- **ats internal-record flip:** `GET /v1/nurses/:id` now reads Core's canonical view under `READ_VIA_CORE`
  (local fallback), matching the P1 passport flip.
- **Unified scope catalog:** `florence-core/src/gateway/scopes.ts` is the single source; `verify-gateway` now
  carries a **drift guard** asserting every ats / pathway / Academy scope exists in the catalog.
- **Developer Portal v0:** `GET /v1/docs` — a self-contained HTML page (no external CDN) that fetches
  `/v1/openapi.json` and renders the endpoint + scope catalog.

## Phase 3 — Ledger unification + Component SDK + Dev Portal v1 + Webhooks + Model Gateway
- **Production Ledger unification:** Core `nurse_events` is canonical. New gateway WRITE module
  (`src/gateway/modules/ledger.ts`): `POST /v1/events` (idempotent) + `GET /v1/events` + `GET /v1/ledger`
  (canonical-stage timeline). This landed the **durable Core idempotency** table (`idempotency_keys`, both
  backends + schema) wired into the gateway pipeline (replay → one write). ats `recordLedger` gained a
  **write-through inversion** (`LEDGER_CANONICAL=core`: emit to Core first, local row tagged `projectionOf:'core'`);
  default `ats` unchanged → every suite stays green offline.
- **Model Gateway** (`src/gateway/modelGateway.ts` + module): `POST /v1/model-gateway/tasks` + `GET /costs`.
  Task registry (job_description_extract, benefits_extract, employer_brief_draft, candidate_packet_summary,
  ncjmm_rationale_generation, pathway_guidance_draft, sales_email_draft) with **allowed-data-class policy**
  (regulated payloads refused), **content-hash output cache**, **cost meter**, human-QA-required flags, and a
  deterministic **mock-by-default** fallback (no ANTHROPIC key ⇒ reproducible, free).
- **Outbound webhooks** (`src/webhooks.ts` + module): partner subscriptions (`webhook_subscriptions`) + an
  idempotent delivery log (`webhook_deliveries`), both backends + schema. Canonical events fan out HMAC-signed
  (`sha256=…`); mock-by-default records the delivery (no real POST unless `WEBHOOKS_LIVE=1`). Idempotent by
  `(sub, event)`. Scope `webhooks:manage`.
- **Developer Portal v1 — partner API keys** (`src/gateway/modules/partnerKeys.ts`): admin-gated
  `POST/GET /v1/partner-keys` over Core M2M (`api_clients` + `/oauth/token`). Scopes are filtered to a
  **partner-safe allowlist** (read-only employer/opportunity/program/ledger/pricing — never internal passport,
  write, consent, or model). Secret returned once; list never returns secrets; sandbox flag supported.
- **Component SDK expansion** (`florence-ats-connect/sdk/components/`): added `JobTiles`, `ApplicationGate`
  widgets + pure models (`widgetModels.ts`: jobTiles/applicationGate/pricingQuote) with the same render-layer
  defense-in-depth (`NEVER_RENDER`). Vite **library-mode** config + `@florencern/components` package manifest
  (publish is operator-owned — no registry wired).

## Phase 4 — partner hardening
- **Per-principal rate limiting** in the gateway pipeline (closure-local token bucket, config/env-driven;
  429 + Retry-After). `verify-gateway` proves a burst beyond capacity ⇒ 429.
- **No-PII-in-URL/UTM CI gate** (`scripts/pii-url-smoke.ts`, 8/8): functional (a built tracked-link carries
  ONLY `utm_*` + an opaque `frn_click_id`) + source-scan of the link/outreach builders (no PII assembled into
  any URL query).
- **Partner sandbox + data-minimized read:** sandbox partner keys + re-proven employer-audience minimization
  (never visa/financing).

## Verification (toolchain Node 24; both backends; mock-by-default, no secrets)
| Suite | Result |
|---|---|
| Core `verify-gateway` | **43/43** (read-through, ledger write+idempotency, model gateway, webhooks, partner keys, rate-limit, docs, scope drift) |
| Core verify-security / control-tower / audit / retention / onboarding / university-investor | 36 / 29 / ok / 16 / 27 / 11 |
| Core typecheck | clean |
| ats typecheck + build | clean |
| ats platform-api 32 · application-gate 26 · demand 78 · opportunity 48 · longtail 34 · program 21 · reservations 13 · onboarding 6 · component-sdk 10 · pii-url 8 | all green, sqlite + PGlite |
| pathway typecheck + pathway-v1-smoke (9) | clean / 9 |
| Academy api + frontend typecheck | clean |

## Compliance held (code-enforced)
Visa/financing never on an employer/partner surface (employer audience + component `NEVER_RENDER` + partner-safe
scope allowlist all drop them); financing OUT (no endpoints; latent `lender` audience untouched); fail-closed
(consent-revoke ⇒ 403; no token ⇒ 401; no scope ⇒ 403; data-class policy blocks regulated payloads to a model);
idempotency on creates (durable, replay-safe); audit on sensitive reads/writes + tamper-evident chain; no PII in
URLs/UTMs (CI gate); FICA customer-side only; AI mock-by-default (no key ⇒ deterministic); webhooks record-only
unless WEBHOOKS_LIVE.

## Honestly staged / operator-owned (NOT built — need product/ops decisions, not code)
- **Partner M2M → audience binding:** an M2M partner key today carries scopes but no role/org, so reading a
  specific employer's redacted candidates over server-to-server still needs a role/org binding + consent model.
  Deferred deliberately — it's a security-sensitive auth change that needs a real partner + counsel, not an
  unsupervised guess.
- **Core horizontal scale / read-replica / SIEM** — infra/ops, not code.
- **Component SDK publish** (registry/tarball), **live webhook delivery** (real partner endpoints + retries),
  **live Model Gateway provider** (real ANTHROPIC key + durable cache/cost store) — all wired behind flags,
  flipped when the operator provisions creds.
- Deploy/DNS to florenceedu.com / florenceeducation.com remains operator click-ops.

Reports: P1 — `PLATFORM_API_REPLATFORM_P1_BUILD_REPORT.md`; P2–P4 — this file.
