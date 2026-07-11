# FlorenceRN — Autonomous Build Report

> **UPDATE (2026-06-14, post-build):** Per operator decision, the **Phase 4 ISA / financing module was REMOVED**
> (the platform isn't offering ISA financing). Deleted: Core `isaTerms.ts`/`isaUnderwriting.ts`/`verify-financing.ts`,
> the `Passport.financing` facet + `financing.*` events + lender financing disclosure + financing classification +
> the ledgerStages financing OR-clauses; ATS `server/finance/*`, `shared/finance-types.ts`, the 3 finance tables/repos
> (both backends), the finance routes, `getLenderView`, and `financing-smoke`. **Preserved** (independent of the ISA
> product): the retention-tail `repayment`/`term_complete` canonical stages (Phase 1) and the pre-existing
> employer-packet financing-data redaction (`packet.ts`/`slate.ts`). Re-verified green — Core: typecheck · spine 14 ·
> security 36 · control-tower 29 · retention 16 · onboarding 27 · university-investor 11; ATS: typecheck · build · demand 53
> · program 21 · reservations 13 · onboarding 6 (both backends); production-loop 22. (Also confirmed: there is **no
> individual nurse-shift tracking** in the platform — the only "shift" is a day/night tag on job postings, kept as-is.)
> The Phase 4 section below is retained for history but **that module no longer exists in the codebase.**



**Window:** started 2026-06-14 (operator away ~16h). **Mode:** autonomous, additive, mock-by-default.
This file is the live record of what landed while you were away — newest status at the top of each phase.

## Guardrails held the entire run (not crossed autonomously)
- No deploys, no secrets entered, no account creation, no partner/outward-facing actions, no real payments.
- Additive only; every existing suite kept green (Core spine 14 / security 32 / control-tower 16; ATS smoke 17 / demand 49 / program 13, both backends; production-loop 20).
- Revenue = subscription fee only; FICA stays customer-side; started/retention only via verified attestation (hris/employer_attestation/nurse_confirmation, never bare ATS).
- No PII in links; consent before disclosure; partners get only redacted passportView; AI drafts → human QA.
- No claim that any feature raises NCLEX pass rates until measured.

## Phase plan
| # | Phase | Status |
|---|-------|--------|
| 1 | Retention & Revenue Tail (completes the Definition of Done) | ✅ done + verified |
| 2 | Retention / Onboarding-Risk Engine | ✅ done + verified |
| 3 | Demand Reservations | ✅ done + verified |
| 4 | Financing / ISA (software only, mock) | ❌ REMOVED (operator decision — not offering ISA) |
| 5 | University Affiliate + Investor/Board reporting | ✅ done + verified |

## Definition of Done (per phase)
Each phase: design → implement → adversarial review → verify (all suites green on both backends) → logged here.

---

## Binding cross-phase decisions (from the design + completeness-critic pass)
These are enforced across all 5 phases to keep the green suites intact:
1. **Stage-vocabulary ownership:** Phase 1 is the sole owner of the canonical `retained_60d`/`term_complete`/`repayment`
   stages — the `ledgerStages.ts` RULES, the `rankForEvent` rung bump (90d 11→12, term_complete=13, repayment=14) with the
   matching `FUNNEL_STAGES` insert, and the ATS `LedgerStage` union members. Phase 4 **OR-widens** the repayment/term_complete
   predicates onto its `financing` facet — it never re-declares them.
2. **Filename collision:** Phase 1 keeps `florence-core/src/retention.ts` (revenue tail). Phase 2's playbook lives in
   `retentionPlaybook.ts`.
3. **`verify-control-tower` stays 16/16** (not 19 — that was a stale artifact). All additions seed NEW bundles; existing
   exact-equality assertions (MRR 1750, annualized 21000, employerReadyCount 3, licensedAvailable 1) stay byte-exact.
4. **Dual-store parity** for every new table (Phase 3/4 ATS; Phase 5 Core) — both backends + `counts()` + indexes, run on
   sqlite AND PGlite.
5. **`verify-production-loop.sh` (20/20)** is added to the DoD of Phase 1 and Phase 4 + the final sweep (it exercises the
   ledger/stage vocabulary these phases touch).
6. **Negative tests added:** bare-ATS `retention_60d`/`term_complete` must be rejected 409 (HRIS-grade gate); mock HRIS
   double-sync must not double-bill (cumulative verifiedStarts unchanged).

## Phase 1 — Retention & Revenue Tail ✅
**Shipped (additive, mock-by-default):**
- **Core stage vocabulary:** wired `retained_60d` + `term_complete` + `repayment` as event-sourced canonical stages
  (`ledgerStages.ts` RULES, `passport.ts` `rankForEvent` 90d→12/term=13/repayment=14 with matching `FUNNEL_STAGES` insert,
  new `Passport.retention` facet folded from `ats.retention_60d`/`ats.term_complete`/`billing.repayment_started` +
  timestamp-stamping the existing 30/90d cases). Retention out-ranks billing in `canonicalStage` (retention is the higher rung).
- **Core revenue tail:** new pure [`retention.ts`](florence-work/florence-core/src/retention.ts) — cohort rows, retention
  curve + churn%, and a 24-month recurring tail with `lifetimeBookedUsd` (labelled BOOKED, not revenue-recognized). Wired into
  the Control Tower (same single fold, no N+1) + new audited `GET /v1/control-tower/retention` route.
- **Security:** `passportView` discloses retention only to internal_ops/self, own-placement employer, and lender (positive
  milestone status; termination withheld); investor/instructor/university withhold it. Classified in `classification.ts`.
- **ATS:** `LedgerStage` + HRIS `EmploymentEventType` extended; mock HRIS now derives 30/60/90d from elapsed days
  (idempotent — re-sync never double-bills); `billing.ts` rollup is now 24-month recurring (gross = active-RN × fee, FICA
  never in revenue); wave tracker + scorecard gain `retained60`.
- **Riskiest decision (handled):** billing NEVER reads 60d — cohorts anchor only on a billing-grade verified `started`;
  retention milestones are analytics/verification facts. `repayment`/`term_complete` are foldable+tested but their active
  emitters are intentionally NOT shipped (counsel/finance-owned).

**Verified (all green):** Core typecheck · verify-spine 14 · verify-security **36** (32+4) · verify-control-tower **26**
(16+10) · verify-retention **16** (NEW). ATS typecheck · build · smoke 17 · demand-smoke 49 · program-smoke **21** (13+8) —
each on **sqlite AND PGlite**. End-to-end **verify-production-loop 21/21** (now includes the attested 30/60/90d tail folding
into Core). Negative/edge guards: bare-ATS retention is HRIS-grade-gated; mock-HRIS double-sync idempotent; FICA never in
`grossUsd`/`lifetimeBookedUsd`; `verify-control-tower` exact-equality (MRR 1750 / ARR 21000 / employerReady 3) unchanged.

**User-owned (flagged, not built):** Finch HRIS go-live; employer-attestation / nurse-confirmation inbound channels;
repayment program semantics + active emitter; revenue-recognition policy (booked→earned); invoice artifacts; lender
retention-disclosure sign-off.

## Phase 2 — Onboarding-Risk Engine ✅
**Shipped (additive, mock-by-default):**
- **Core engine:** new pure [`onboardingRisk.ts`](florence-work/florence-core/src/onboardingRisk.ts) (`stratify` →
  risk band/score/reasonCodes from the readiness band baseline + weakest-first NCJMM subscale gaps; start-signals
  ESCALATE only, never de-escalate) + [`retentionPlaybook.ts`](florence-work/florence-core/src/retentionPlaybook.ts)
  (`playbookFor` → prioritized actions, one remediation-nudge per gap; contentRefs are opaque keys, no clinical copy).
- **Passport:** 4 new folded events (`academy.readiness_band_changed`, `pathway.readiness_gate_applied`,
  `onboarding.start_signal`, `onboarding.risk_assessed`), all rank −1 (funnel unchanged); now folds the previously-dropped
  `readiness.subscaleMastery`; new internal-only `onboarding` facet.
- **Control Tower:** `onboardingRisks` (band distribution, highest-risk count, recommended actions by band) +
  PII-gated `atRiskRoster` (only high/critical, behind `?roster=1`).
- **Security:** onboarding facet classified `internal_business`, subscaleMastery `candidate_personal`; `passportView`
  withholds onboarding from ALL external audiences (employer/lender/instructor/university/investor), present only for
  internal_ops/self.
- **App emitters (fire-and-forget, mock-safe):** Academy emits `readiness_band_changed` only on an actual band change;
  Pathway's shadow-mode gate now emits `readiness_gate_applied`; ATS `emitStartSignal` (minimal payload, no PII/clinical text).

**Verified (all green):** Core typecheck · spine 14 · security 36 · control-tower 26 · retention 16 · **onboarding-risk 27
(NEW)**. ATS typecheck · build · smoke 17 · demand 49 · program 21 · **onboarding-risk-smoke 6 (NEW, both backends)**.
Academy typecheck + tests (81+9+6+3+9). Pathway typecheck. **production-loop 22/22** (now proves ATS→Core onboarding
start-signal emit→fold end-to-end — closes the critic's cross-repo seam gap). Filename-collision avoided
(`retentionPlaybook.ts`); `verify-control-tower` stays 16 originals + additive.

**User-owned (flagged):** risk-band cut-points + start-signal escalation weights ship as conservative env-overridable
placeholders (calibrate against real pilot/NCLEX outcomes — no unmeasured pass-rate claims); the actual nudge/check-in/
manager-outreach copy (opaque contentRefs here); no scheduler/cron (risk computed on-read, no auto-enroll).

## Phase 3 — Demand Reservations ✅ (ATS-only; Core untouched)
**Shipped (additive, mock-by-default):** SOFT, priced, cancellable demand commitments. New
[`server/demand/reservations.ts`](florence-work/florence-ats-connect/server/demand/reservations.ts)
(`createReservation`/`cancelReservation`/`markReservationFilled`/`reservationCockpit`); `DemandReservation` type +
dual-backend `demand_reservations` table (sqlite + PGlite, indexes + `counts()`); 4 ops routes
(`/ops/demand/reservations`, `/reservations/cockpit`, `/jobs/:id/reserve`, `/reservations/:id/cancel`).
- **Critic-driven correctness:** the reserved-vs-filled cockpit is an **ATS-side aggregator** (Core's `controlTower`
  folds Passports only and must not import from the ATS — so Core stays byte-untouched, control-tower 26/26 still green).
  Reservations write to `attribution_events` only — **no Core passport bridge** (the reducer has no `demand.reservation_*`
  case, so an emit would be a silent no-op).
- **Invariants:** soft (no nurse exclusivity — a candidate reserved for Job-A can reserve Job-B); fee **snapshotted** at
  reserve time (market shifts don't mutate it); cancel is a **tombstone** (status→cancelled, never deleted); pricing-api
  down → fallback $1750; **no nurse PII** in the reservation; reservations **never** touch the ledger/billing/payment.

**Verified (both backends):** ATS typecheck · build · **reservations-smoke 13 (NEW)** · demand-smoke **53** (49+4) ·
program-smoke 21 · onboarding-risk-smoke 6. Core control-tower 26 (untouched).

**User-owned (flagged):** real demand→capacity reservation pricing policy + TTL defaults; any employer-facing reservation
surface (this is internal demand intel only); converting a reservation to a real commitment/contract.

## Phase 4 — Financing / ISA (software-only, mock-by-default) ✅
**Shipped (additive, mock-by-default):** an ISA engine underwritten by readiness (θ as default-risk proxy) + employer
pre-commit + underwriting consent.
- **Core:** pure [`isaTerms.ts`](florence-work/florence-core/src/isaTerms.ts) (capped, no-debt-trap schedule) +
  [`isaUnderwriting.ts`](florence-work/florence-core/src/isaUnderwriting.ts) (theta-gated decision, thresholds passed in);
  `Passport.financing` facet + 5 `financing.*` events (rank −1, funnel unchanged); lender `passportView` surfaces a
  **redacted** ISA status (never raw θ/employer/docs); classified `restricted_pathway_financial`.
- **Critic-driven correctness:** Phase 4 **OR-widens** Phase 1's `repayment`/`term_complete` ledgerStages RULES onto the
  financing facet (no duplicate RULES); LedgerStage union members already exist from Phase 1 (not re-declared);
  `getLenderView` is mock-safe-null when the spine is off.
- **ATS:** vendored `isaMath.ts` (cross-package boundary — can't import Core); `server/finance/{isa,ledger,preCommit}.ts`;
  3 dual-backend tables (`financing_ledger`/`employer_pre_commits`/`isa_offers`); 9 ops routes; `getLenderView` seam;
  `docs/financing/README.md` + env knobs.
- **Invariants:** repayment is a **modeled obligation, NEVER subscription revenue** (`rollupProgramInvoices` byte-unchanged
  across a full ISA lifecycle); fail-closed lender packet (throws `ConsentRequiredError` w/o consent); no-debt-trap cap;
  every issue attempt (approved + rejected) logs θ + thresholds (auditable); `FINANCING_MOCK` on → no lender network call.

**Verified (all green):** Core typecheck · spine 14 · security **42** · control-tower 26 · retention 16 · onboarding 27 ·
**financing 14 (NEW)**. ATS typecheck · build · demand 53 · program 21 · reservations 13 · onboarding 6 ·
**financing-smoke 12 (NEW)** — each on **sqlite AND PGlite**. production-loop 22.

**User-owned (flagged):** real ISA terms/disclosures/servicing + counsel + state regulatory filings; lender onboarding +
live lender integration; deferral-vs-forgiveness semantics; payroll→lender reconciliation; calibrating θ→default-risk
thresholds against real outcomes (currently a conservative placeholder — no claims).

## Phase 5 — University Affiliate + Investor/Board reporting ✅ (Core read-APIs)
**Shipped (additive, Core-only, zero-PII):**
- **Investor/board report:** new pure [`investorReport.ts`](florence-work/florence-core/src/investorReport.ts) — strips the
  Control Tower summary to a **zero-PII** board rollup (totals, stage distribution, MRR/ARR, retention curve, onboarding-risk
  distribution; no roster/names/ids). `GET /v1/investor/report` (scope `investor:read`, audited `investor.read`).
- **University affiliate report:** new pure [`universityReport.ts`](florence-work/florence-core/src/universityReport.ts) —
  **k-anonymized** cohort outcomes by licensure state (cells with n < `minCell`=5 suppressed: counts + rates null).
  `GET /v1/university/cohorts` (scope `university:read`, audited `university.read`).
- Scopes added to ops/super_admin + the demo M2M client; `university:read` already on the university role.

**Critic-honored scope:** Core's `controlTower`/`verify-control-tower` left **byte-untouched** (still 16 originals);
the reports are read-only projections over the existing fold. Per the critic's Postgres-parity flag, this phase is
**Core read-APIs only** — the Academy `InvestorDashboard` frontend, `nurses.programs` migration, the Academy M2M
cohort-pass-rate route, `mrrBySource` attribution, and `seed-app-clients` provisioning are **deferred / user-owned**
(frontend + deploy + a real Postgres parity harness Core doesn't have today).

**Verified (all green):** Core typecheck · **verify-university-investor 7 (NEW)** · control-tower **26** (16 originals
intact). Live authz: no-scope → **403**, `investor:read`/`university:read` → **200**, both reads **audited**. Zero-PII
asserted on both reports; k-anon suppression asserted (n<5 → suppressed).

---

## Phase 6 — Deferred items + capstone (in progress)
**Done + verified (additive, mock-by-default):**
- **Revenue-by-source (`mrrBySource`):** new `universityRouting.ts` (`demandSourceForPassport`) + `university.*` spine
  events (employer-backed only); Control Tower `forecast.mrrBySource` (university/employer/internal, sums exactly to MRR);
  surfaced in the investor report. verify-university-investor extended → **11/11**; control-tower still 26.
- **Reporting M2M clients:** `seed-app-clients.ts` now provisions `florence-investor` (`investor:read`+`control-tower:read`)
  and `florence-university-portal` (`passport:read:university_staff`+`university:read`), idempotent, secrets env-or-generated.
- (Phase 5 already shipped the zero-PII investor report + k-anon university cohort routes, both scope-gated + audited.)

**Remaining buildable — NOT done this run (a follow-up session; each is a multi-file dual-store change or a frontend, and
I chose not to risk the doubly-verified build by cramming them into a deep context):**
- `nurses.programs` annotation + `setNursePrograms`/`listUniversities`/`aggregateForUniversity` (Core dual-store across
  nurses.ts + store.postgres.ts + schema migration) → the `university_staff` de-identified browse audience +
  `/v1/universities/:id/metrics`. (Note: Core has no Postgres parity harness — the Postgres path is typecheck-only.)
- Academy `InvestorDashboard.tsx` + `investorApi.ts` + Academy M2M `GET /v1/cohort/pass-rates` route.
- Core `academyClient.ts` + `cohortReport.ts` → fold k-anon cohort pass-rates into the investor report.
- ATS employer-attestation / nurse-confirmation inbound channels (the ledger already accepts these `verifiedVia` grades —
  this is just a dedicated inbound surface; low marginal value).

**Genuinely user-owned — cannot be built without you (need real secrets / counsel / data / a deploy):**
Finch HRIS go-live (real token + employer data); real ISA contract terms + lender onboarding + state regulatory filings
(counsel); revenue-recognition policy (finance/legal); threshold calibration against real NCLEX/cohort outcomes; the
actual Render/Cloudflare deploy + entering secrets + creating accounts.

**Capstone — DONE (adversarial multi-agent review, 13 agents, 5 dimensions):** verdict "phases 1-6 fundamentally sound —
no fabricated revenue, no PII leaks, no dual-store breaks." **5 confirmed findings, all fixed + re-verified:**
1. *(high)* `employer_ready_packet` was a dead canonical stage (declared + weighted but no derivation rule) → gave it a
   correct, distinct rule (licensed + credential packet present, not yet matched) so it's reachable without cannibalizing
   `licensed_rn`. Added a **reachability guard** (every stage must be derivable / default / explicitly reserved) that also
   surfaced + documented `qualified_screened`/`offer_accepted`/`start_scheduled` as the intentional reserved set.
2. *(med)* lender view omitted `financing.maxTotalRepaymentUsd` (the ISA cap — the key underwriting term) → disclosed + asserted.
3. *(med)* `counts()` omitted `raw_jobs` on both backends → added to both.
4. *(med)* duplicate/contradictory `billing.repayment_started` vocab doc → deduped + clarified the funnel-advancement distinction.
5. *(low)* readinessGate emit comment lacked the mock-safe guarantee → tightened.
Plus 3 coverage-gap tests added (the capstone's "missing" thread): canonical-stage **reachability guard**,
**FUNNEL_STAGES↔rank alignment**, and the **financing.* vs billing.repayment_started** funnel-advancement distinction.
Re-verified green: Core control-tower **29**, financing **15**, security **42**; ATS program 21 / demand 53 / financing 12;
production-loop 22.

---

# ✅ AUTONOMOUS RUN — 5 phases + Phase-6 partial shipped + verified
**Full green matrix (mock-by-default, additive, both store backends where applicable):**
- **Core:** typecheck · verify-spine 14 · verify-security 42 · verify-control-tower 26 · verify-retention 16 ·
  verify-onboarding-risk 27 · verify-financing 14 · verify-university-investor 7 · investor/university authz+audit.
- **ATS:** typecheck · build · smoke 17 · demand-smoke 53 · program-smoke 21 · reservations-smoke 13 ·
  onboarding-risk-smoke 6 · financing-smoke 12 — each on **sqlite AND PGlite**.
- **Academy:** typecheck + tests (108). **Pathway:** typecheck.
- **End-to-end:** `verify-production-loop.sh` **22/22** (one nurse → 3 apps → one Passport → Control Tower, incl.
  retention tail + onboarding signal emit→fold).

**Guardrails held the entire run:** no deploys, secrets, account creation, partner/outward actions, or real payments;
revenue = subscription fee only (FICA customer-side; financing repayment never revenue); started/retention only via
verified attestation; no PII in links/reports; consent before disclosure; AI drafts → human QA; no unmeasured pass-rate
claims (risk + financing thresholds ship as conservative, env-overridable placeholders to be calibrated on real outcomes).
