# Florence Academy Data API — Security & Compliance Design

Status: **v1 design** for review. Governs the API that moves **enrollment,
performance, and financial** data between Florence and external systems (CRMs,
and later underwriting/financing partners).

This data is sensitive: it identifies real internationally-educated nurses,
records their assessment performance, and tracks payments — and some of it may
later inform a **lending decision**. The bar is therefore "underwriting-grade":
authenticated, least-privilege, encrypted, fully audited, and consent-aware.

---

## 1. Trust boundaries

```
  [ Florence Academy app ]        [ Partner CRM ]      [ Underwriting partner ]
   (computes performance)          (sales pipeline)     (financing decisions)
            │                            │                       │
            │  OAuth2 client-credentials │  + scoped JWT         │ + mTLS (high-trust)
            └──────────────┬─────────────┴───────────┬───────────┘
                           ▼                          ▼
                 ┌─────────────────────────────────────────────┐
                 │  Florence Data API  (TLS 1.2+, this service) │
                 │  authn → scope check → idempotency → handler │
                 │            → audit log (append-only)         │
                 └───────────────────────┬─────────────────────┘
                                         ▼
                 ┌─────────────────────────────────────────────┐
                 │  Postgres (system of record)                 │
                 │  • column-encrypted PII / financial fields   │
                 │  • append-only assessment_results            │
                 │  • append-only audit_log                     │
                 └─────────────────────────────────────────────┘
```

**Ownership.** Florence is the system of record for **performance/readiness**
(it computes it). The CRM is the system of record for **contact/sales
pipeline**. The API syncs the overlap and never double-owns a field. Everything
inbound from a CRM is treated as untrusted input and validated.

---

## 2. Authentication

| Caller | Mechanism |
|---|---|
| Machine-to-machine (CRM, batch jobs) | **OAuth2 client-credentials** → short-lived scoped JWT (default TTL 15 min) |
| High-trust financial / underwriting partner | client-credentials **+ mutual TLS** (client cert pinned per partner) |
| Human admin / ops | OIDC SSO (out of scope for v1 reference; same scope model) |

- One **client per partner** (`client_id` + hashed `client_secret`). Secrets are
  stored only as a salted scrypt hash; the plaintext is shown once at issuance.
- No long-lived static API keys as the primary path. (A scoped key mode exists
  for a first single-CRM integration but is discouraged and audited the same.)
- Reference service signs JWTs with **HS256 + a server secret**. **Production
  must switch to RS256/ES256 with KMS-managed keys** (`kid` header already
  present) so signing keys can rotate and never live in app memory.

## 3. Authorization — least privilege scopes

```
candidates:read   candidates:write
enrollment:read   enrollment:write
performance:read  performance:write
payments:read     payments:write
webhooks:manage
```

- A token only carries scopes that are (a) granted to the client **and**
  (b) requested. A CRM that needs readiness scores gets `performance:read`
  only — never `payments:*`.
- Every route declares the scope it requires; missing scope → `403` (audited).
- **Field-level redaction:** financial fields are omitted from responses unless
  the token holds `payments:read`, even on a shared resource.

## 4. Transport & headers

- TLS 1.2+ only, terminated at the edge; HSTS (`max-age` ≥ 1 year).
- `X-Content-Type-Options: nosniff`, `Cache-Control: no-store` on data routes,
  strict `Content-Type` checks on writes.
- Outbound **webhooks are HMAC-SHA256 signed** and replay-protected with a
  timestamp + nonce; receivers must reject signatures older than 5 minutes.

## 5. Data protection

- **Encryption at rest** via KMS (whole-disk + DB), plus **column-level
  encryption** for the most sensitive fields: phone, payment references,
  financial/underwriting signals. Keys are KMS-managed and rotated.
- **PII minimization.** We store only what a downstream purpose needs.
  Pseudonymous external IDs (`cand_…`, `enr_…`) are used in URLs, webhooks, and
  logs — never the phone/email in a URL or query string.
- **No raw card or bank-account data, ever.** Payments store only a payment
  processor's token + reference IDs. This keeps the service out of PCI-DSS
  cardholder-data scope and is a hard rule.
- **Secrets** come from the environment (`.env` is gitignored); none in the
  repo. OTPs and secrets are never logged.

## 6. Audit — provenance for underwriting

Every authenticated request appends an immutable record to `audit_log`:

```
{ ts, request_id, actor (client_id), action (METHOD route),
  resource_type, resource_id, scope_used, ip, outcome (2xx/4xx/5xx) }
```

- The log records **which fields/resources** were touched, **never the values**
  of PII/financial fields.
- Append-only (no UPDATE/DELETE grant on the table); export for compliance.
- Rationale: if a readiness score or payment status feeds a credit decision, we
  must be able to prove who read or wrote it, when, and under what authority.

## 7. Underwriting-grade performance records

`assessment_results` is **append-only and immutable**: create + read only, no
UPDATE/DELETE. Each row is timestamped, versioned, and carries a content hash so
a score used in a lending decision is **reproducible and tamper-evident**. A
correction is a new row that supersedes (never edits) the prior one. Mutable
CRM-sync fields live on other resources so an underwriting input can't be
silently changed.

## 8. Consent & purpose limitation

- Each candidate carries a **consent record** with explicit, separately-toggled
  purposes: `service` (run the Academy), `crm_sync`, and **`underwriting`**.
- **Using performance/financial data for underwriting requires the
  `underwriting` consent to be present** — it is a distinct secondary purpose,
  not covered by a blanket signup checkbox. Handlers check it; the check is
  audited.
- **Data-subject rights:** export (machine-readable) and deletion/erasure
  endpoints, with the append-only audit + assessment history retained per the
  documented retention policy where law permits.
- Applicable regimes: **PH Data Privacy Act** (Manila pilot), GDPR/CCPA, plus
  US lending rules (e.g., Reg Z) when financing attaches. *This document is an
  engineering design, not legal advice — the consent text, retention windows,
  and lending disclosures need review by counsel before go-live.*

## 9. Abuse & integrity controls

- **Rate limiting** (token-bucket) per client; `429` with `Retry-After`.
- **Idempotency keys** on all writes (`Idempotency-Key` header): a retried
  create returns the original result instead of duplicating a record.
- Request size caps; strict JSON parsing; cursor-based pagination (no deep
  offset scans); structured error model with a `request_id` for support.

## 10. What must be provisioned (not done autonomously)

These need accounts / credentials / infrastructure and are the operator's call:

- Managed **Postgres** + a **KMS** for at-rest + column encryption.
- An **OAuth/OIDC** provider (or run the built-in client-credentials issuer with
  RS256/KMS keys).
- A **payment processor** (for deposit tokens — see the $100 commitment-deposit
  design) so no raw financial instrument data touches this service.
- **Hosting region(s)** — a data-residency decision driven by the Manila pilot
  and US underwriting (may require region split or in-region storage).

## 11. Implemented in the reference

Beyond the request lifecycle, the reference now implements (with tests):

- **Native TLS** (TLS 1.2 floor, modern ECDHE/AEAD ciphers) + optional **mutual
  TLS** — set `TLS_CERT_PATH`/`TLS_KEY_PATH` (+ `TLS_CLIENT_CA_PATH`). No
  external terminator needed to protect data in transit.
- **Strict CORS allowlist** + hardened headers (HSTS+preload, CSP, frame-deny).
- **Envelope field encryption** (per-value DEK wrapped by a KEK) for phone +
  email + payment refs, with **KEK rotation** (old ciphertext still decrypts).
  Encryption runs through a pluggable **`KeyProvider`** — swap `LocalKeyProvider`
  for `KmsKeyProvider` (`src/kms.ts`) to move the KEK into a managed KMS.
- **Candidate-bound session tokens** for browser reporting (downscoped, short
  TTL, subject-pinned) + **token revocation** (jti denylist enforced per request;
  `POST /v1/tokens/revoke`).
- **Hash-chained audit log** — tamper-evident; `verifyChain()` catches edits.

## 12. Reference vs. production — remaining gaps

Still required before real user data (each needs provisioned infrastructure):
a **KMS** holding the KEK (select `KmsKeyProvider`) + **RS256/ES256** JWT
signing keys; a **Postgres** store on encrypted storage with backups; an
**OIDC** path for human admins; a shared revocation store (Redis) for
multi-instance; **WAF + edge DDoS**; **CA-signed certs**; and an independent
**penetration test / security audit**. None change the public contract in
`openapi.yaml`.
