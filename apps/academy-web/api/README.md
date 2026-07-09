# Florence Academy Data API

The data plane that moves **enrollment, performance, and financial** records
between Florence and external systems (CRMs today; underwriting/financing
partners later). Designed to be robust and secure because some of this data may
inform a lending decision - see **[SECURITY.md](./SECURITY.md)** for the full
design and **[openapi.yaml](./openapi.yaml)** for the v1 contract.

This directory is a **runnable reference**: Node + TypeScript, **zero runtime
dependencies** (Node built-ins only), in-memory storage. It demonstrates the
real request lifecycle - OAuth2 client-credentials, scoped JWTs, idempotency,
append-only performance records, signed webhooks, and an append-only audit log.
Production swaps the in-memory store for Postgres (`db/schema.sql`,
`src/store.postgres.ts`) and HS256 for KMS-backed RS256.

## Run it

Requires Node ≥ 22.6 (this repo's toolchain is Node 24, which runs `.ts`
directly). From `api/`:

```bash
npm start        # starts on http://localhost:8088, prints a dev client secret
npm test         # end-to-end smoke test (token → write → idempotency → audit)
npm run typecheck
```

(Older Node: `node --experimental-strip-types src/index.ts`.)

## Try it

```bash
# 1) Get a scoped token (client-credentials)
curl -s localhost:8088/oauth/token \
  -d grant_type=client_credentials \
  -d client_id=demo-crm -d client_secret=<printed-at-startup> \
  -d 'scope=candidates:write performance:write'

# 2) Create a candidate (idempotent)
curl -s localhost:8088/v1/candidates \
  -H "authorization: Bearer <token>" \
  -H "idempotency-key: $(uuidgen)" \
  -H "content-type: application/json" \
  -d '{"full_name":"Maria Santos","country":"PH"}'

# 3) Append an immutable performance result (emits a signed webhook)
curl -s localhost:8088/v1/assessment-results \
  -H "authorization: Bearer <token>" -H "content-type: application/json" \
  -d '{"candidate_id":"cand_…","kind":"timed","readiness":0.78,"items_completed":75}'
```

## Endpoints (v1)

| Method | Path | Scope |
|---|---|---|
| POST | `/oauth/token` | - (client-credentials) |
| GET | `/health` | - |
| GET/POST | `/v1/candidates` | `candidates:read` / `candidates:write` |
| GET/PATCH | `/v1/candidates/{id}` | `candidates:read` / `candidates:write` |
| GET/POST | `/v1/enrollments` | `enrollment:read` / `enrollment:write` |
| PATCH | `/v1/enrollments/{id}` | `enrollment:write` |
| GET/POST | `/v1/cohorts` | `cohorts:read` / `cohorts:write` |
| GET/PATCH | `/v1/cohorts/{id}` | `cohorts:read` / `cohorts:write` |
| GET | `/v1/cohorts/{id}/roster` | `cohorts:read` (enrollments + capacity/count) |
| GET/POST | `/v1/assessment-results` | `performance:read` / `performance:write` (append-only) |
| GET/POST | `/v1/payments` | `payments:read` / `payments:write` (tokens only) |
| POST | `/v1/clients`, `/v1/clients/{id}/rotate` | `clients:manage` (partner registry) |
| POST | `/v1/tokens/session` | `tokens:mint` (browser-safe candidate-bound token) |
| POST | `/v1/tokens/revoke` | any auth (logout); other `jti` needs `tokens:mint` |
| POST | `/v1/tokens/introspect` | `tokens:mint` (RFC 7662 - active + claims) |

All write bodies are schema-validated: a malformed request gets `400` with
`error.code = "validation_error"` and a `fields[]` list of what failed.

Reads tagged `X-Purpose: underwriting` for a specific `candidate_id` require
that candidate's explicit `underwriting` consent (else `403`).

**Browser reporting.** The SPA never holds a client secret. A trusted backend
(with `tokens:mint`) calls `POST /v1/tokens/session {candidate_id, scopes:
["performance:write"]}` and hands the returned short-lived, candidate-bound
token to the browser as `VITE_API_TOKEN`. That token can only write/read its own
candidate, for minutes - so an XSS leak exposes one student's own data, briefly.

## Production adapters & integrations

- **Postgres store** (`src/store.postgres.ts`) - implements the async `Store`
  against `db/schema.sql` with keyset pagination and **AES-256-GCM column
  encryption** for phone + payment refs (`makeFieldCrypto`). Wire it with
  `new PostgresStore(await createPgClient(DATABASE_URL), makeFieldCrypto(key))`;
  it talks to a `SqlClient` so it's testable without a live DB.
- **Webhook delivery** - `WebhookEmitter` POSTs signed events to subscriptions
  with retries, backoff, and a dead-letter list. Point the API at a receiver:
  `WEBHOOK_URL=http://localhost:8099 npm start`.
- **Partner client registry** - `POST /v1/clients` / `…/rotate` issue and
  rotate per-partner credentials with least-privilege scopes (stored in
  `api_clients`).
- **HubSpot connector** (`connectors/`) - verifies the Florence webhook
  signature, maps events to HubSpot contact properties (`florence_readiness`,
  `florence_enrollment_status`, …), and upserts by email. Runs in **dry-run**
  with no `HUBSPOT_TOKEN`:
  ```bash
  WEBHOOK_SECRET=<same-as-api> FLORENCE_API_URL=http://localhost:8088 \
  FLORENCE_API_TOKEN=<FLORENCE_API_TOKEN> \
  node connectors/hubspot-server.ts
  ```

## Files

```
openapi.yaml             v1 contract (OpenAPI 3.1)
SECURITY.md              security & compliance design
db/schema.sql            Postgres DDL (append-only + audit + grants)
src/                     reference service (auth, store, audit, webhooks, routes)
src/store.postgres.ts    Postgres adapter (SqlClient + column encryption)
connectors/hubspot.ts    HubSpot field-mapping + connector
test/                    smoke + integration + hubspot suites (run via `npm test`)
```

## Before production

- KMS-backed RS256/ES256 JWT signing (the `kid` header is ready) and a KMS data
  key for `makeFieldCrypto` (not the dev passphrase).
- Run `db/schema.sql`, set `DATABASE_URL`, select `PostgresStore` in index.ts.
- A real OIDC path for human/admin access; persist webhook subscriptions +
  deliveries (tables are in the schema).
- Deploy behind a TLS terminator + WAF; pick the data-residency region.
- Legal review of consent text, retention windows, and lending disclosures.

None of the above change the public contract in `openapi.yaml`.
