# FlorenceRN Demand Radar

The job-demand intelligence + attribution layer, and the **pre-ATS proof of demand**:
ingest public/partner RN openings → normalize + dedup → price per-RN/month → tracked
links → nurse interest → employer/AMN demand briefs → reconcile outcomes → write
everything to the Production Ledger. North star: **attributed licensed RN starts by
source / employer / specialty / campaign** — optimize for source→start, not traffic.

Built as a module **inside `florence-ats-connect`** (reuses its job/connector/matching/
packet/consent/ledger/store/dashboard machinery). Economics call the Workforce Economist
`pricing-api`; events flow to the Core Nurse Passport spine. Internal demand-intelligence
first — not a public job board, not unauthorized ATS submission, never implies employer
endorsement before a partnership exists.

## The loop
```
public/partner RN job → FlorenceRNJob (normalized, deduped, sources preserved)
  → JobEconomics (per-RN/month fee, FICA offset, effective cost) via pricing-api
  → tracked link (/l/:code, opaque frn_click_id, UTMs, NO PII) → click → nurse interest
  → employer/AMN demand brief (PDF) → reconciliation (CSV/manual) → Production Ledger
  → source→start attribution funnel
```

## Modules (server/demand/ + server/links.ts + connectors/demand/)
- **ingest.ts** — CSV/manual + connector rows → RawJobPosting (dedup by contentHash) →
  normalize → canonical FlorenceRNJob (collapse by fingerprint, preserve every JobSource).
- **normalize.ts** — RN-only; infers specialty/setting/state/shift/employmentType + confidence.
- **fingerprint.ts** — collapse key (shared ATS req-id, else employer+facility+title+location+specialty).
- **connectors/demand/** — `DemandSourceConnector` registry: greenhouse_board (live behind a
  board token), icims_portal (mock), career_page (**compliance-gated: refuses to fetch until
  robots/ToS reviewed + crawlAllowed**). `pull.ts` orchestrates + `refreshStale` ages openings.
- **economics.ts** — calls pricing-api `/price-job` (lookup wage+agency → engine) → JobEconomics.
  FICA offset is the customer effective-cost reducer only; FlorenceRN revenue = fee.
- **links.ts** (+ public `GET /l/:code` in index.ts) — tracked short links (opaque frn_click_id +
  UTMs, **no PII**), first-party click capture (IP hashed), attribution + spine `demand.link_clicked`.
- **interest.ts** — express interest (NOT apply); eligibility routing (licensed → packet-ready,
  passed-NCLEX → near-licensed, else pathway-first); consent-gated; `demand.interest_registered`.
- **brief.ts** — employer/AMN demand brief: demand + matched supply + economics + pilot, as a
  zero-dep PDF; DRAFT until human review; no financing/underwriting data.
- **reconciliation.ts** — CSV/manual/AMN/employer outcome updates → Production Ledger
  (start/retention recorded as **attestation** — the non-ATS source the billing invariant requires).
- **attribution.ts** — the source→start funnel + dashboard rollups.
- **ranking.ts** — account ranking (demand × supply fit × economics) → who to approach first.

## API (ops-gated unless noted)
| Method | Path | Purpose |
|---|---|---|
| POST/GET | `/api/ops/demand/sources` | register/list demand sources (robots/ToS posture) |
| POST | `/api/ops/demand/jobs/import` | ingest CSV (`csv`) or manual (`jobs[]`) |
| POST | `/api/ops/demand/sources/:id/pull` | pull a source via its connector |
| POST | `/api/ops/demand/refresh-stale?days=` | age out unseen openings |
| GET | `/api/ops/demand/jobs[/:id]` | list / detail (sources + economics) |
| POST/GET | `/api/ops/demand/jobs/:id/economics[/run]` · `/economics/run-all` | price |
| POST/GET | `/api/ops/links` · `/api/ops/links/:id/clicks` · `/api/ops/clicks/recent` | tracked links |
| GET (public) | `/l/:code` | click capture → 302 redirect (UTMs + frn_click_id) |
| POST/GET | `/api/ops/demand/jobs/:id/interest[s]` · `/api/ops/demand/candidates/:id/interests` | interest |
| POST | `/api/ops/demand/briefs` · GET `/api/ops/demand/briefs/pdf?employer=` | demand brief (JSON / PDF) |
| POST/GET | `/api/ops/demand/reconciliation[/import]` | outcome reconciliation → ledger |
| GET | `/api/ops/demand/dashboard` · `/attribution/funnel` · `/accounts/ranked` | dashboards |

UI: `src/surfaces/ops/DemandRadar.tsx` (route `/ops/demand`, "Demand Radar" nav tab) — funnel,
demand by state/specialty, top employers + brief generation, attribution by source, CSV import.

## Compliance (enforced)
robots/ToS/crawlAllowed gate per source; "FlorenceRN-matched opportunity" framing (no implied
endorsement); interest ≠ application; **no PII in tracked-link URLs** (opaque frn_click_id only);
IP/UA stored hashed; consent before sharing; financing/underwriting data never in employer briefs;
source+timestamp+URL on every job; stale flagging; demand briefs are DRAFTs pending human review.

## Deploy
docker-compose `ats` service: `PRICING_API_URL` (→ pricing-api container) + `LINK_BASE_URL`
(public link base; point at go.<domain> when DNS is ready). pricing-api gained `/lookup` +
`/price-job` (+ optional Core M2M auth via `PRICING_API_REQUIRE_AUTH`).

## Verify
`node --experimental-sqlite --import tsx scripts/demand-smoke.ts` — 49 checks across P1–P9 +
account ranking, passing on **sqlite and PGlite**. Full HTTP e2e proven through the running
server (import → price → link → click → interest → reconcile → dashboard → funnel → brief PDF),
and the existing ATS `npm run smoke` still passes (additive, no regression).

## Status / v2 remaining
Built + verified: P1–P9 + account ranking. v2 roadmap (not yet built): employer job-feed config,
university→job routing, AI SDR campaign generator, demand-to-capacity reservation, long-tail
employer self-serve portal, AMN partner API. The native ATS submission bridge already exists
(ATS connectors + the integration enablement kit).
