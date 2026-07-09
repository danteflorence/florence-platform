# Workforce Economist API

This service is the TypeScript Florence OS Workforce Economist module. It exposes deterministic facility-level pricing, proposal drafts, and Core Production Ledger event emission for quote/proposal creation.

The previous `labor-economics-agent` Python/Streamlit app remains an audit input only. Production logic lives in `packages/economist-api` and this API app.

## Endpoints

- `POST /v1/economist/quote`
- `GET /v1/economist/facility/:id`
- `GET /v1/economist/system/:id`
- `GET /v1/economist/hospital-spend/metadata`
- `GET /v1/economist/hospital-spend/entities?groupBy=health_system&metric=hospital_operating_costs`
- `GET /v1/economist/hospital-spend/trends?groupBy=health_system&id=...&metric=hospital_operating_costs`
- `POST /v1/economist/proposal`
- `POST /price-job` for the current Employer Connect compatibility contract

Quote and proposal writes emit `economist.quote.created` and `economist.proposal.created` to Core `/v1/events` when Core credentials are configured. Set `ECONOMIST_CORE_EVENTS_REQUIRED=1` in environments where missing Core ledger writes must fail closed.

## NASHP Hospital Spend Data

Hospital spend trendlines use public aggregate NASHP Hospital Cost Tool data from `packages/economist-api/src/generated/nashp-hct.generated.json`. The production update runbook is in `packages/economist-api/NASHP_HCT_PIPELINE.md`.
