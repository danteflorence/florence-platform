# FlorenceRN — Lender Data API + GCP hosting / CI-CD / partner onboarding (build report)

**Date:** 2026-06-15. Connects warehouse/partner banks to live, continuous, **consented** per-nurse data for
loan underwriting (architected so FlorenceRN's own future bank is just another `lender` org on the same API),
and operationalizes the platform on real cloud infra. Everything in-repo, additive, mock-by-default, fail-closed;
all suites green on both backends. Decisions: GCP Cloud Run · florencern.com · self-hosted Core (M2M) · all 4 workstreams.

## WS-L — Lender Data API (verify-lender 21/21)
- **Partner-bank M2M → lender binding:** `ApiClient.org_id` (both backends + schema); `issueClientToken` emits
  `org_id`; the gateway maps an org-bound service token requesting the lender view → `lender` role
  (relationship `org_matched` + consent gate); org-bound **lender keys** provisioned via `partnerKeys` with a
  lender-safe scope set (`passport:read:lender`, `credit:read`, `credit:decide`, `lender:portfolio:read`).
- **Fair-lending credit-decision package** (`src/creditDecision.ts` + `GET /v1/nurses/:id/credit-data`): a
  default-deny allowlist that **excludes visa/nationality/country-of-education/current-country/arrival-status**
  (ECOA/Reg B) — even an env override can't re-add a prohibited-basis field. Closes the **allowed_fields gap**:
  the package = `consent.allowed_fields ∩ allowlist`, prohibited-basis stripped, fail-closed.
- **Underwriting consent** (reuses Core consent: `purpose=underwriting`, `recipient_org_id` per bank,
  `allowed_fields`, revocable) — no live consent ⇒ 403.
- **Credit decisions + adverse-action + disputes** (`credit_decisions` + `data_disputes`, both backends + schema):
  `POST /v1/credit-decisions` (a **denial requires reason_codes** — ECOA/FCRA adverse action; stamps
  `adverse_action_at`), `/adverse-action`, list; **candidate data-dispute** `POST /v1/disputes` (FCRA accuracy;
  staff-or-self). Decisions emit a `credit.decision` ledger event.
- **Continuous feed:** `GET /v1/lender/events` (pull) + consent-scoped **webhooks** (a sub bound to `org_id` +
  `consent_purpose` only delivers a nurse's events if that nurse consented to it). Loan-performance events:
  started → retained_30/60/90 → term_complete → repayment.
- **Warehouse pool report:** `GET /v1/lender/portfolio` (aggregate cohort performance, **k-anonymized** ≥5) +
  `GET /v1/lender/loan-tape` (per-consented-nurse rows, no prohibited-basis).
- **Proven:** credit-data omits visa + enforces allowed_fields; a lender **cannot escalate** to the internal
  Passport (403); consent-revoke ⇒ 403; denial-without-reasons ⇒ 400; feed excludes unconsented nurses; portfolio
  k-anon; loan-tape carries no visa/nationality.

## WS-D — GCP Cloud Run hosting + CI/CD (authored; operator provisions)
- **Terraform** `infra/` — Cloud Run services + Cloud SQL Postgres + GCS+CMEK + Secret Manager + Pub/Sub +
  Artifact Registry + domain mappings for `id./api./ats./pathway./api.academy./developers./partners.florencern.com`;
  four envs (`infra/envs/*.tfvars`, separate projects); images by convention + `image_tag`. Dockerfiles reused.
- **CI/CD** `.github/workflows/` — `ci.yml` (typecheck + ALL smokes both backends + `terraform validate` + dep
  audit) gates `deploy.yml` (build → Artifact Registry → **staging auto** → **manual approval** → production; WIF, no keys).
- **Health/observability:** public `GET /v1/health`; `docs/PRODUCTION_READINESS.md` launch checklist.
- **Pathway-on-Cloud-Run** (`docs/PATHWAY_CLOUD_RUN.md`): pathway's store is **synchronous node:sqlite**; Postgres
  needs a sync→async refactor — documented with two safe paths (deferred to a focused PR; does NOT block the
  lender flow, which is all in Core).

## WS-O — Partner onboarding + Developer Portal
- `developers.florencern.com` portal (`gateway/portal.ts`) now has getting-started/auth/versioning + base URLs +
  the lender no-visa note, over the live aggregated OpenAPI.
- `docs/partner-onboarding/`: onboarding **README** (who-sees-what, M2M auth, lender quick-start, checklist),
  a **field dictionary** (every field + data class + **prohibited-basis flags**), and the CSV bridge guide.

## WS-C — CSV / SFTP enterprise bridge (csv-bridge-smoke 5/5)
`server/csvBridge.ts` — "jobs in" (idempotent by `external_req_id`, bad rows flagged) + "status out" (IDs + status
only, **no candidate PII**); schemas in `docs/partner-onboarding/csv-bridge.md`. SFTP/GCS transport operator-provisioned.

## Verification (toolchain Node 24; both backends; mock-by-default, no secrets)
Core typecheck clean · verify-gateway 43 · **verify-lender 21** · verify-security 36 · control-tower 29 · audit ✓.
ATS typecheck + build clean · 8 suites × sqlite+PGlite (platform-api 32, application-gate 26, demand 78, opportunity
48, longtail 34, program 21, reservations 13, onboarding 6) · component-sdk 10 · pii-url 8 · csv-bridge 5.
Pathway typecheck + pathway-v1 9 · Academy api + fe typecheck. CI workflows parse-clean; Terraform validated by operator.

## Compliance held (code-enforced)
ECOA/Reg B: credit decisions exclude national-origin/visa by default (hard guard). FCRA: dispute/correction +
adverse-action reason codes + consent-revoke fail-closed. Consent-gated, per-bank, field-minimized; no partner ever
gets the full internal Passport; no lender escalation to internal. Visa internal-only everywhere; no PII in URLs;
idempotency on creates; audit + tamper-evident chain; FICA customer-side; mock-by-default.

## Operator + counsel-owned (NOT code)
GCP project/billing/DNS/secrets + the `terraform apply` + SOC 2 audit. **Counsel-gated before any underwriting use:**
the fair-lending field-eligibility review (gates the allowlist), GLBA safeguards + per-bank DPA, FCRA program, and —
for the own-bank path — charter/BSA-AML/SR 11-7 (a separate corporate track). Live providers (real webhook endpoints,
Model-Gateway LLM, Component-SDK publish) flip on when creds are provisioned. Pathway Postgres refactor = a focused PR.
