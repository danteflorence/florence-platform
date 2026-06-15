# FlorenceRN Opportunity Graph — Build Report (2026-06-14)

> **UPDATE — Long-Tail Demand Radar shipped (2026-06-14).** A long-tail layer now extends the graph into
> small employers (home health / hospice / SNF / dialysis / clinic / ASC). **Craigslist & local boards are a
> LEAD SIGNAL ONLY — there is ZERO fetching/scraping code** (`craigslist_signal` is a manual-only source type
> with no connector; ToS forbids scraping). Flow: detect a hiring signal → capture nurse interest by market×role →
> invite the employer to **claim** the role via a public token deeplink (`/claim/:token`, certification-gated) →
> claiming mints a **displayable** FlorenceRNJob (`origin:'claimed_signal'`, direct-partner CTA "Apply with packet")
> that flows through the existing graph → sell licensed RN capacity per-RN/month. Two hard invariants: unclaimed
> signals are **never** jobs and have **no candidate route**, plus a **default-deny `displayAllowed` gate** on every
> public read; claimed-signal jobs are **excluded** from the AMN/GTM aggregates (rankAccounts/dashboard/production
> report). Category interest rides a non-funnel event (no double-count). Outreach is **DRAFT-only** (4-step cadence +
> PDF + mailto; no FICA/visa language; no bulk contact export; no programmatic send). New: `shared/market.ts`,
> `server/demand/{longTail,longTailLeads,outreach}.ts`, dual-store tables (hiring_signals / claimed_employer_jobs /
> nurse_market_interest / claim_tokens), surfaces `MarketTiles.tsx` (`/markets`) · `ClaimJob.tsx` (`/claim/:token`) ·
> `LongTailRadar.tsx` (`/ops/longtail`), `scripts/longtail-smoke.ts`. **Verified: longtail-smoke 34/34 + all prior
> suites green on sqlite AND PGlite; typecheck + build clean; live route-gating + browser-rendered candidate pages.**
> Staged/user-owned: any licensed Craigslist data arrangement or career-page crawler (counsel-gated); real employer
> contact + anti-spam review + any outreach *send* transport; lead-tier weight + market-alias calibration; an MSA/CBSA model.


The **Opportunity Graph** is the demand-to-start operating system layered on the Demand Radar inside
`florence-ats-connect`. Built autonomously across the full 4-phase scope the operator approved
("Everything incl. native ATS + forecasting"). Everything is mock-by-default, additive, dual-store
(sqlite + PGlite), and holds the compliance guardrails in code.

> *Demand Radar sees the jobs. Opportunity Graph matches the nurses. ATS Connect moves the packets.
> Production Ledger proves the starts.*

## Verification (all green, both backends)
| Suite | Result |
|---|---|
| ATS `typecheck` | clean |
| ATS `build` (vite) | clean |
| `demand-smoke` (sqlite + PGlite) | **78 / 78** |
| `opportunity-smoke` (sqlite + PGlite) | **48 / 48** |
| `program-smoke` (sqlite + PGlite) | 21 / 21 |
| `reservations-smoke` (sqlite + PGlite) | 13 / 13 |
| `onboarding-risk-smoke` (sqlite + PGlite) | 6 / 6 |
| Live HTTP | public card→interest→fit→bucket→basket happy-path; ops routes 401-gated; public 404/429 |

Core (`florence-core`) was **not touched** — new attribution lives in the ATS attribution table, so
verify-spine / verify-control-tower / verify-security remain valid and green.

## Phase 1 — Demand Radar gaps
- **Listed vs estimated pay** kept strictly distinct (`shared/payDisplay.ts`, `normalize.parsePay` with
  k-suffix/range/sanity-guards, `economics.estimatePayRange` ±12% + specialty/shift differentials; estimate
  written only when no listed pay). **CA pay-transparency flag** on no-pay postings in CA/CO/NY/WA/IL.
- **Benefits** extraction (`extractBenefits`) → dual-store `job_benefits` table (idempotent) + manual override route.
- **Denormalized provenance** (sourceUrl/atsProvider/atsRequisitionId) on the canonical job.
- **Target-employer registry** enrichment (careerSiteUrl/jurisdiction/cadence/priority/channelOwner) + seeded
  HCA / Methodist Le Bonheur / Prime / UHS (ATS unconfirmed → 'verify'/'manual', flagged) + a DemandSource per
  target with the **crawl gate CLOSED**.
- **Partner-feed connector** + pure `parseJobPostingLd` (Schema.org JobPosting → IngestRow; fetcher staged behind the gate).
- **Public candidate job card** `/jobs/:code` (`publicCard.ts`, redacted, no economics) + public rate-limited
  express-interest with explicit consent + opaque frn_click_id (NO PII in URL).

## Phase 2 — Opportunity Marketplace
- **Opportunity STATE + CTA** (`shared/opportunityState.ts`): public / amn_channel / direct_partner / ats_connected;
  "apply with FlorenceRN packet" offered ONLY for direct_partner / ats_connected, else "express interest".
- **Per-job Candidate Fit Score** (`opportunityFit.ts`) reusing the 7-signal `matchCandidateToRequisition`
  against a synthetic requisition view of the job; **eligibility coaching** (licensed_now/near/pathway/not-eligible
  + start feasibility + what-you-need + honest ETA).
- **Opportunity Basket + Compare** (`basket.ts`): nurse-curated buckets on the interest record + side-by-side
  compare (consent-gated) emitting `job.compared`; `/basket/:ref` cockpit.
- **Employer Opportunity Value Score** (`ranking.ts`): facility density × channel availability × specialty depth ×
  repeatability (additive; legacy placement-yield score preserved).

## Phase 3 — ATS Connect / Ledger / AMN Account Radar
- **Packet-view tracking** (`candidate.packet_viewed`) completing the click→interest→packet→view funnel.
- **New funnel events** wired into attribution: job_normalized, tile_viewed, compared, packet_created, packet_viewed.
- **AMN Account Radar** (`AmnRadar.tsx` + `/ops/amn/accounts`): demand × supply × economics × opportunity value,
  ranked, with per-account capacity-brief generation (AMN route).
- **Richer reservations** (specialty/region/volume/startWindow/channel/slateStatus/confidence/gate) + cockpit
  slate-mix + reserved-volume.
- **Weekly production report** (`productionReport.ts`): funnel + by-employer/source/campaign over a window.

## Phase 4 — Native connectors + forecasting + auto-proposals (scaffold/mock, gated)
- **More public connectors**: Lever / Ashby (compensation → listedPay) / SmartRecruiters (mock-by-default).
- **Generalized seam**: `DemandSourceConnector` → `JobSourceConnector` (connectionType / test / refresh; additive —
  existing connectors unchanged).
- **Native ATS write-sync GATE**: `EmployerAccount.atsAuthorized` + `/ops/employers/:id/ats-authorization`. Native
  live-submit requires integration `active` **AND** explicit `atsAuthorized`; otherwise the manual bridge. **No live
  ATS write ships.**
- **Job→start forecast** (`forecast.ts`): probability-weighted expected starts + recurring MRR by month with
  **conservative placeholder** conversion rates (env-overridable), FICA customer-side only.
- **Automated proposals** (`proposal.ts`): DRAFT, human-review-gated, renders a PDF; FICA framing preserved.

## Compliance guardrails (enforced in code)
Mock-by-default · dual-store both backends + `counts()` · NO TS enums · "express interest" for non-partner /
"apply" only when authorized · no PII in links · listed-vs-estimated pay always labeled · consent before any
external share · **FICA/payroll-tax offset stays customer effective-cost, never FlorenceRN revenue** · crawl gate
closed until robots/ToS review · no implied employer partnership until one exists.

## Staged / user-owned
Real connector credentials (Lever/Ashby/SmartRecruiters live, partner feeds); per-employer ATS authorization +
real ATS creds before any live submit; counsel sign-off before career-page crawling or implying partnership;
calibrating forecast conversion rates against real outcomes; pricing-api `/wage-range` percentile endpoint.
