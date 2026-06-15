# FlorenceRN Platform API — partner onboarding

FlorenceRN is API-first. The **Nurse Passport** is the central object (permissioned views), the
**Production Ledger** is the system of record, every workflow is an event, and **every partner gets a
scoped, audited, consent-gated view** — never the full internal Passport.

- **Sandbox:** `https://sandbox-api.florencern.com/v1` (seeded fake data — test here)
- **Production:** `https://api.florencern.com/v1`
- **Docs:** `https://developers.florencern.com` · machine contract: `/v1/openapi.json`
- **Identity:** `https://id.florencern.com` (Core RS256/JWKS)

## Who sees what
| Partner | Gets | Never gets |
|---|---|---|
| AMN | its own programs, licensed slates, employer-safe packets, status/billing events | other partners' data; nurse PII beyond the packet |
| Kaiser (employer) | its program workspace + employer-ready licensed packets | visa / nationality / financing / academy remediation |
| **Lender / warehouse bank** | **consented** credit-decision package, consent-scoped feed, pool/loan-tape | **visa / nationality / country-of-education** (ECOA/Reg B); other employers' data |
| University | aggregate / k-anonymized cohort dashboards | named-student data without an agreement + consent |

## Authentication (M2M, client_credentials)
1. FlorenceRN provisions you an **API key** (`client_id` + `client_secret`, shown once) scoped to your role.
2. Exchange it for a short-lived token:
   ```
   POST https://id.florencern.com/oauth/token
   { "grant_type":"client_credentials", "client_id":"…", "client_secret":"…", "scope":"…" }
   ```
3. Call the API with `Authorization: Bearer <access_token>`. Lender keys are **org-bound** — your token
   carries your `org_id`, and you only ever see nurses who granted **underwriting consent to your org**.

## Lender (warehouse bank) quick start
```
# 1) Fair-lending credit-decision package for one consented nurse (NO visa/nationality):
GET  /v1/nurses/{id}/credit-data
# 2) Record your decision (a denial REQUIRES reason_codes — ECOA/FCRA adverse action):
POST /v1/credit-decisions            { "nurseId":"…","decision":"approved|denied","reason_codes":[…] }
POST /v1/credit-decisions/{id}/adverse-action
# 3) Continuous, consent-scoped feed of loan-performance events (started→retained→repaid):
GET  /v1/lender/events
# 4) Warehouse pool performance (k-anonymized) + loan tape (no prohibited-basis):
GET  /v1/lender/portfolio
GET  /v1/lender/loan-tape
# 5) Subscribe for push (consent-scoped to your org):
POST /v1/webhooks                    { "url":"…","event_types":["*"],"org_id":"…","consent_purpose":"underwriting" }
```
Consent is the gate: no live `underwriting` consent for a nurse × your org ⇒ **403** (fail-closed). A candidate
can revoke at any time, which immediately closes access (FCRA-aligned). Data accuracy is disputable via
`POST /v1/disputes`.

## Integration checklist
1. Get sandbox key → 2. Mint a token → 3. Read a sample credit-data package → 4. Record a sample decision →
5. Pull the portfolio + loan tape → 6. Receive a webhook → 7. Validate with FlorenceRN → 8. Move to production.

## Cross-cutting
- **Versioning:** `/v1` is stable; breaking changes ship as `/v2` with a deprecation window.
- **Idempotency:** send `Idempotency-Key` on creates (decisions, events, webhooks) — retries replay, never double-apply.
- **Rate limits:** per-principal; `429 + Retry-After` on burst.
- **No PII in URLs.** **CSV/SFTP bridge** available for slow HRIS/ATS partners (see `docs/partner-onboarding/csv-bridge.md`).
- See `field-dictionary.md` for every field + its data class + whether it is a prohibited-basis field.
