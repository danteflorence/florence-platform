# Overnight build report — 2026-06-14

Everything below was built, typechecked, and **verified locally** (mock-by-default; no
deploys, no external calls, no accounts created). Two companion documents:
- **`STRATEGY_NEXT_LEVEL.md`** — the strategic report you asked for (NCLEX parity +
  maximizing successful US placements). Generated via a deep multi-agent research workflow.
- **`florence-ats-connect/docs/demand-radar.md`** — the Demand Radar product doc.

---

## 1. FlorenceRN Demand Radar — FULL build (P1–P9 + account ranking)

The pre-ATS demand-intelligence + attribution layer, built as a module **inside ATS Connect**
(reusing its job/connector/matching/packet/consent/ledger/store/dashboard machinery).

| Phase | What | Status |
|---|---|---|
| P1 | Data model + dual-backend store + CSV/manual ingest + RN normalization + dedup | ✅ verified |
| P2 | Public source connectors (Greenhouse board, iCIMS portal, **compliance-gated** career page) + freshness | ✅ verified |
| P3 | Economics via the Workforce Economist `pricing-api` (new `/lookup` + `/price-job`) | ✅ verified |
| P4 | Tracked links + click capture (opaque id, **no PII**, IP hashed) + attribution → Core spine | ✅ verified |
| P5 | Candidate "express interest" + eligibility routing + `demand_radar` consent | ✅ verified |
| P6 | Employer/AMN demand brief (matched supply + economics) → PDF | ✅ verified |
| P7 | CSV/manual reconciliation → Production Ledger (attested start/retention) | ✅ verified |
| P8 | Demand Radar dashboard (funnel, demand, top employers, attribution, CSV import) | ✅ build + full HTTP verified |
| P9 | End-to-end source→start attribution funnel + dashboard rollups | ✅ verified |
| v2 | Account ranking (demand × supply fit × economics → who to approach first) | ✅ verified |

**Verification:** `node --experimental-sqlite --import tsx scripts/demand-smoke.ts` →
**49/49 pass on sqlite AND PGlite**. Full HTTP e2e through the running server passed
(import → dedup → price → tracked link → public `/l/:code` 302 redirect → dashboard → funnel →
brief PDF). **The existing ATS `npm run smoke` still passes** (additive, no regression). SPA builds clean.

**Key invariants held:** no PII in tracked-link URLs (opaque `frn_click_id` only); career-page
crawling refuses until robots/ToS reviewed + `crawlAllowed`; FICA offset is the customer
effective-cost reducer only, never FlorenceRN revenue (`florence_net == fee`, asserted); demand
briefs are DRAFTs pending human review; start/retention recorded only via attestation, never bare ATS status.

**Touched:** `florence-ats-connect/` (shared/demand-types.ts, server/demand/*, server/links.ts,
server/connectors/demand/*, store + routes + resumePdf composePdf export, src/surfaces/ops/DemandRadar.tsx,
src/api.ts, src/App.tsx) · `labor-economics-agent/` (pricing_api.py, new market_lookup.py) ·
`florence-core/src/passport.ts` (demand facet + events) · `florence-pathway-agent/shared/consent.ts`
(demand_radar scope) · `docker-compose.yml` (PRICING_API_URL, LINK_BASE_URL).

**v2 remaining (roadmap, not built):** employer job-feed config; university→job routing; AI SDR
campaign generator; demand-to-capacity reservation; long-tail employer self-serve portal; AMN
partner read API. (Native ATS submission bridge already exists via the ATS connectors + enablement kit.)

---

## 2. Earlier this session (recap — all verified)

- **Nurse Passport spine** in florence-core (canonical nurse identity + append-only event log +
  folded Passport) — built, 14/14 reducer verification, and **wired live into all three apps**
  (ATS funnel, Academy readiness, Pathway licensure/visa) with a 2-app live convergence proof.
- **ATS integration enablement kit** (`docs/integrations/`) — contract clause + per-ATS provisioning
  one-pagers + security FAQ for the 16 target health systems.
- **Academy ElevenLabs audio + the "FlorenceRN" voice agent** — generation pipeline (budget: full
  corpus ≈ 71h ≈ 12% of the StoryHouse grant), player, and the conversational tutor (renamed to
  "FlorenceRN"). Mock-by-default; awaits the grant key.

---

## 3. How to run / verify (toolchain node at ~/florence-work/.toolchain/node/bin)

```bash
# Demand Radar unit/integration smoke (no servers needed):
cd florence-ats-connect && node --experimental-sqlite --import tsx scripts/demand-smoke.ts

# Pricing-api (Python) for live economics:
cd labor-economics-agent && python3 -m uvicorn pricing_api:app --port 8000
#   GET /lookup?state=CA   ·   POST /price-job {state, setting, role}

# Full local platform: docker compose up -d --build  (see DEPLOY_TESTSERVER.md)
```

---

## 4. Things that still need YOU (cannot be automated / decided overnight)
- Claim the ElevenLabs StoryHouse grant (commercial-rights confirm) → set `ELEVENLABS_API_KEY`,
  then `npm run audio:dict` / `audio:generate` / `audio:tutor`.
- Provision per-app Core M2M clients in prod (`npm run seed-app-clients`) + the target health-system
  ATS credentials (per the integration kit) when each says yes.
- Fill the security-FAQ `[establish]` items (SOC 2 / HECVAT / hosting / IR) before sending to infosec;
  counsel review of the contract clause.
- Deploy the test server (VPS + spare-domain DNS) — all artifacts are ready.
- Strategic direction: review `STRATEGY_NEXT_LEVEL.md` and pick the next-level initiatives to fund.
