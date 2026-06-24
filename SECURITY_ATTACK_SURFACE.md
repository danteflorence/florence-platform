# FlorenceRN Security Attack Surface

## Public and Anonymous Surfaces

### Florence Pathway

Critical anonymous exposure was found in `florence-pathway-agent/server/routes/index.ts`.

- The middleware only staff-gates `/admin` and `/qa`.
- Candidate binding blocks mismatched authenticated candidate tokens, but unauthenticated requests continue.
- Publicly reachable internal routes include candidate listing and reads, candidate views, required actions, chat, notifications, document metadata upload, workflow create/read/run/answer/attest/review-sign, DS-160 confirmation capture, NCLEX/ATT routes, and visa appointment routes.

This is the highest priority attack surface because it can expose or mutate immigration, licensure, document, and workflow state without authentication.

### Florence ATS Connect

Public surfaces include:

- Public job links and interest flows under `/api/public/...`.
- Candidate reference based fit, bucket, basket, and compare flows.
- Public resume downloads under `/api/p/:token/resume.pdf`.
- ATS provider webhooks under `/api/webhooks/ats/:provider`.
- Public health, metadata, and OpenAPI routes.

Authenticated but overbroad surfaces include:

- `/api/ops` routes where many GET endpoints are available to employer users unless specifically blocked.
- `/api/ledger`, which can return all ledger events when no candidate or employer filter is supplied.
- `/v1/nurses/:id/passport`, where employer Passport view lacks local tenant and consent enforcement when Core is not used.

### Florence Academy

Public or semi-public surfaces include:

- Health, live config, public cohorts, activation GET, unsubscribe, mock/testing helpers, auth signup/login/verify flows, Stripe webhook, Lob webhook, audio file and audio manifest routes, and tutor config surfaces.
- Dev verification response can return token-bearing verification URLs when mock email is enabled.

Authenticated partner surfaces include:

- Employer candidate views and employer offer routes based on category-wide candidate consent rather than tenant-specific consent.
- University overview, which is aggregate and lower risk by design.

### Florence Core

Public surfaces include:

- Health, OpenAPI, OIDC/JWKS, auth, and token-related endpoints.

Restricted surfaces with security gaps include:

- Candidate Passport reads where candidate self relationship is not tied to the resolved nurse id.
- Partner Passport views where category-wide consent can match any recipient organization and `org_matched` depends on caller-supplied org presence.
- Lender credit decisions, adverse-action updates, and decision listing.
- Webhook subscription management and delivery.
- Legacy server error responses and `/me` token response.

### Workforce / Labor Economics Tooling

The labor economics tooling includes local and API modes with development defaults:

- Streamlit auth can fall back to local auth or unauthenticated local operation depending on environment.
- Pricing API auth is optional and CORS defaults are permissive.
- Local OTP delivery writes email and one-time-password body content to an outbox log.
- Lob webhook verification is disabled when no webhook secret is configured.

These surfaces should not be internet-reachable without production-grade Core auth, rate limits, CORS restrictions, webhook signatures, and audit logging.

## Partner Surfaces

| Partner | Surface | Risk |
| --- | --- | --- |
| Employers | ATS packets, Core employer Passport, Academy employer candidate view, job interest flows | Cross-tenant reads, employer-safe packet bypass, public resume tokens |
| Lenders | Core credit decisions, adverse action, lender Passport, financing packet handoff | Credit data exposure, decisions without consent, cross-lender reads |
| Universities | Academy aggregate views, Core university Passport | Candidate-level exposure if not aggregate or anonymized |
| SEVISmate | I-901 guided handoff and reconciliation export | Full SEVIS/contact export, missing sensitive-read audit |
| LendKey | Financing handoff and status data | Loan/credit data sharing without purpose-specific consent |
| ATS/VMS providers | Inbound status webhooks and outbound submissions | Webhook spoofing, replay, status tampering, packet overexposure |
| Lob/Stripe | Payment/outreach webhooks and provider calls | Unsigned or weakly signed webhooks, provider errors with address/payment details |
| LLM providers | Tutor, copilot, pathway guide, model gateway | PII in prompts, output misuse for high-stakes decisions |

## Document and Export Surfaces

- ATS resume PDFs are served through public bearer tokens without short-lived signed URL semantics.
- Pathway document metadata and I-901 receipts are exposed through candidate/staff APIs that need authentication, authorization, and sensitive-read audit on every read/export.
- Consular payment CSV exports include full SEVIS and contact data.
- Employer packets and lender packets must be generated only after consent, tenant, packet QA, and Application Gate checks pass.

## Webhook Surfaces

- Core outbound webhook subscriptions allow `http` URLs, optional tenant and consent scoping, and wildcard event types.
- Academy webhook delivery can send full event bodies and logs configured URLs on failure.
- ATS inbound webhooks use a static shared-secret approach without HMAC timestamp and replay protection.
- Labor economics Lob webhook accepts unsigned events when no secret is configured.

Webhook requirements:

- HTTPS only.
- HMAC signature with timestamp and replay window.
- Tenant-scoped subscriptions.
- Event allowlist by tenant and purpose.
- Redacted payloads by data class.
- Rate limits and idempotency.
- Audit delivery and failure metadata without logging secrets, full URLs with tokens, or restricted payloads.

## Rate Limit Gaps

- Academy has centralized request rate limiting in its main server.
- Core gateway has rate-limit primitives, but high-risk partner and webhook operations need stricter per-route policies.
- Pathway internal APIs do not show sufficient route-level rate limiting for sensitive candidate, workflow, document, and consular operations.
- ATS public flows and webhooks need tighter rate limits beyond selective public interest handling.
- Labor economics pricing and webhook APIs need production-only enforced auth and rate limits.

## Missing Test Coverage To Add

- Candidate token cannot read another candidate's Core Passport by id, email, or reference.
- Anonymous Pathway requests cannot read or mutate candidate, workflow, DS-160, visa, document, licensure, or payment state.
- Employer, lender, university, SEVISmate, LendKey, and ATS/VMS partners cannot read outside their tenant.
- Purpose-specific consent is required for every external share and partner packet.
- Every sensitive read, write, export, packet view, document view, and document download emits an audit event.
- Public document URLs expire, are scoped to the intended document and recipient, and are not reusable after revocation.
- Webhooks reject missing, weak, stale, or replayed signatures.
- AI prompts redact restricted identifiers and AI outputs cannot finalize visa, credit, employment, application, eligibility, or licensure decisions.
- Application Gate fails closed when visa/work authorization, license, consent, packet QA, or workflow gates are missing.
- Logs, errors, analytics, telemetry, prompts, seed data, and fixtures are scanned for restricted data patterns.
