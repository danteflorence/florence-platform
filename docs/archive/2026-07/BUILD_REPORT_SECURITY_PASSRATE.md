# Build report — Security Spine + Pass-Rate Engine (2026-06-14)

Two converging tracks, built and **verified locally** (mock-by-default; no deploys,
no external calls, no accounts/keys). Plan: `.claude/plans/delegated-wondering-locket.md`.
Security architecture/policy: `florence-core/docs/security/` + `docs/security/`.

---

## Track A — Security Spine (florence-core as the security boundary)

Turns Core into the one place that owns identity + consent + classification +
redaction + audit, so no product reads sensitive data directly and every partner
gets a minimum-necessary view. Directly implements the security feedback's #1 item:
**the Nurse Passport is a permissions-controlled VIEW, not a record anyone can read.**

| Phase | What | Status |
|---|---|---|
| P-S1 | Data-classification model (`src/classification.ts`, 5 classes + per-field map, fail-closed) + ABAC policy engine (`src/policy.ts`, purpose-based) | ✅ |
| P-S2 | `src/passportView.ts` — per-audience redactor (self/internal_ops/instructor/employer/lender/university/investor) + per-audience scopes | ✅ |
| P-S3 | Canonical **Consent Service** (`consents` table both backends + `src/consent.ts` + `/v1/consent/grant\|revoke`) | ✅ |
| P-S4 | Wired passportView + policy + consent + **read-audit** into `GET /v1/nurse/passport` | ✅ |
| P-S5 | **Tamper-evident** hash-chained audit (`src/audit.ts`, `auditVerify.ts`) + DB append-only trigger + read logging + bulk-read alerts | ✅ |
| P-S6 | App consumption — ATS dual-writes consent to Core (fail-closed) + SDK `getView`/`grantConsent` in all 3 vendored copies | ✅ |
| P-S7 | `verify-security-spine.ts` (32 checks) + 8 program/policy docs (NIST CSF 2.0 / SOC2 TSC / OWASP ASVS) | ✅ |

**Key behaviors proven live:** employer view shows readiness *band only* (no
visa/financing/raw-theta); lender view is a stub without `underwriting` consent and
unlocks with it; investor view is de-identified; employer can't see another
employer's placement (tenant isolation); `employer` asserting `underwriting` purpose
→ 403; audit chain verifies and a falsified row is **detected**; consent dual-write
is fail-closed (only failure mode is under-disclosure).

**Verification:** `npm run verify-security` (32/32) · `npm run verify-spine` (14/14,
regression-clean) · `npm run verify-audit` (chain intact). Core typecheck clean.

**Riskiest decision (handled):** Core-canonical consent with 3 apps keeping local
records → **dual-write, Core-deny-wins, never Core-grant-wins** + nightly
reconcile (planned). Disclosure only when Core affirmatively holds a live consent.

---

## Track B — Near-term strategy initiatives (the closed-loop pass-rate engine)

The mission lever: raise IEN NCLEX first-time pass rates toward US parity. Built on
the existing CAT/IRT engine — net-new is the per-subscale mastery model, gates,
automated remediation, the cohort data asset, and the readiness gate.

| Phase | What | Status |
|---|---|---|
| P-T1 | Per-subscale mastery model (`src/lib/mastery.ts`) — per-Client-Need + per-CJMM θ via `estimateAbility`; `by_cjmm`/`mastery` threaded through summary → API → spine | ✅ |
| P-T2 | Mastery **gates** (`gates.ts`) + automated **remediation** builder (`remediation.ts`) + API auto-dispatch + `candidate_remediations` (both backends) + routes + frontend `RemediationCard` | ✅ |
| P-T3 | **Cohort pass-rate data asset** (`cohortStats.ts`) — first-time pass rate by corridor (NCSBN doesn't break these out), k-anonymized published report + ops routes | ✅ |
| P-T4 | **Hard readiness gate** in Pathway (`readinessGate.ts`) — reads readiness through the SECURED passportView; **shadow-first** + staff override + audit + mock-by-default | ✅ |
| P-T5 (start) | IEN English/NGN — `lens`/`corridor` tags on `QuestionMeta` + a curated **US drug-naming** module (India corridor); per-NCJMM-layer θ via P-T1 | ✅ |
| P-T6 (start) | Throughput — `pnleHistory` intake (readiness-banding input) + `pipelineLag` (graduation→ATT/licensure days + **FEN-refresher tripwire**) | ✅ |

**The closed loop, proven:** a candidate weak in a Client Need → `masteryGaps` flags
it → `sectionGate` closes the section → remediation **auto-dispatched** (queue shows
it; items match the need; voice-tutor prompt attached) → on mastery it clears → the
**readiness gate flips blocked→allowed** reading the readiness back through Core's
secured Passport view (verified live: passProb 0.5 blocks, 0.92 allows).

**Verification:** Academy vitest 80/80 (incl. mastery/gates/remediation) · api
`verify-remediation` 9/9 · `verify-cohort` 8/8 · integration 9/9 · Pathway
`verify-readiness-gate` 8/8 (+ live cross-app gate e2e). All typechecks + Academy build clean.

**Riskiest decision (handled):** the θ→pass-probability threshold is uncalibrated
today → the gate **ships shadow/advisory first**; the cohort data asset (P-T3) is the
calibration instrument; thresholds are env-configurable + audited + overridable —
never hardcoded. Flip `READINESS_GATE_ENFORCE=1` once calibrated.

---

## Touched (high level)
- **florence-core:** `src/{classification,policy,passportView,consent,auditVerify,auditAlerts}.ts` (new); `src/{routes,roles,audit,store,store.postgres,m2m}.ts` + `db/schema.sql` (extended); `scripts/verify-{security-spine,audit}.ts`; `sdk/coreAuth.ts` (getView/consent); `docs/security/*`.
- **florence-academy:** `src/lib/{mastery,gates,remediation}.ts` (new) + tests; `src/lib/{cat,useCatSession,academyApi,academyAuth}.ts`, `src/pages/Account.tsx`, `src/data/questionBank.ts`, `src/types/question.ts`; `api/src/{cohortStats}.ts` (new) + `api/src/{types,store,store.postgres,routes,coreAuth}.ts` + `api/db/schema.sql`; `api/scripts/verify-{remediation,cohort}.ts`.
- **florence-ats-connect:** `server/{passport,routes,coreAuth}.ts`, `shared/{types,packet}.ts` (consent dual-write + getView seam).
- **florence-pathway-agent:** `server/{readinessGate,passport,coreAuth}.ts`, `server/routes/index.ts`, `server/views.ts`, `shared/{types,schema}.ts`; `server/verify-readiness-gate.ts`.

## Deferred (documented follow-ups — not built this round)
- Academy partner routes (`partners.ts`) migrate to Core `getView` (SDK seam shipped; per-candidate call perf to design).
- KMS-backed key wrapping + rotation; SIEM/EDR/SOC2 audit/pen-test/MFA/BAAs (ops/cert — user-owned, see `docs/security/hardening-30-60-90.md`).
- Cohort/lag metrics surfaced in the ops ControlTower UI (endpoints + pure logic done).
- Full OET clinical-English content authoring; Pathway workflow parallelization + per-state FEN rules.
- Strategy I5/I6/I7 (demand reservations, retention engine, ISA financing) — need the secured spine (now in place) + partner contracts + counsel.

## A pre-existing issue surfaced AND fixed (2026-06-14)
`florence-academy/api` `test/smoke.ts` was failing on candidate creation (500) — confirmed
pre-existing (introduced by the Phase-2 Academy↔Core wiring, fails identically with a pristine
coreAuth). **Root cause:** `authenticate()` called `verifyCoreToken()`, which *throws* (not
returns null) when coreAuth is unconfigured — and `createServer` (used by the smoke) didn't run
the `configureCoreAuthFromEnv()` startup step that production's `index.ts` does. Every
authenticated request 500'd; the same latent 500 affected the 7 `principalFromRequest`
SSO/live/tutor routes.

**Fix (none touching the vendored coreAuth.ts):**
1. `server.ts createServer` now calls `configureCoreAuthFromEnv()` (idempotent) → coreAuth is
   configured on every boot path; closes the unconfigured-throw for `authenticate` AND all
   `principalFromRequest` routes.
2. `auth.ts authenticate` wraps `verifyCoreToken` in try/catch → degrades to the legacy HS256
   path on a Core outage (JWKS unreachable) instead of 500, with a throttled warn.
3. `auth.ts safePrincipal()` wrapper routes all 7 direct `principalFromRequest` call sites in
   `routes.ts` through a try/catch → those routes (e.g. `GET /v1/session`, hit on every SPA load)
   now return a clean `401`/`authenticated:false` during a Core outage instead of 500.
4. `server.ts` dispatch catch-all now logs the 5xx server-side (the old bare `catch {}` swallowed
   the stack — why this was invisible).

**Adversarially reviewed** (3-lens workflow): AUTH BYPASS = safe (no key-confusion/downgrade; the
HS256 fallback provably can't accept a forged token); REGRESSION = safe (idempotent, no cycle);
COMPLETENESS finding (JWKS-unreachable on the 7 routes) → fixed by #3 above and proven (a
`/v1/session` request during a simulated JWKS outage now returns `200 {authenticated:false}`).
**Verified:** `npm test` green (smoke 81 + integration 9 + hubspot 6 + TLS 3); typecheck clean.

## Things that still need YOU
- Review `docs/security/enterprise-security-packet.md` + fill the ⛔ ops/cert items before infosec/AMN/Kaiser/lender diligence (SOC2, pen test, MFA, BAAs, vendor program).
- Decide when to flip the readiness gate from shadow → enforce (after corridor calibration data accrues).
- Verify the published drug-name pairings + cohort national baselines against current sources before external use.
