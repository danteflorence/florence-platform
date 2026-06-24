# FlorenceRN Security Definition of Done

Every feature, fix, partner integration, and data migration touching restricted FlorenceRN data must satisfy this checklist before merge and release.

## Authentication and Authorization

- Every non-public endpoint requires authentication.
- Candidate endpoints are bound to the authenticated candidate id.
- Staff-only actions require staff role and appropriate scope.
- Partner users are tenant-scoped on every read, write, export, packet view, webhook subscription, and handoff.
- Authorization is enforced server-side and covered by negative tests.

## Consent and Purpose

- Every external data share has purpose-specific consent.
- Consent is recipient-specific for employers, lenders, SEVISmate, LendKey, ATS/VMS, universities when candidate-level data is involved, and other partners.
- Missing, expired, revoked, or mismatched consent fails closed.
- Consent checks are audited without logging restricted values.

## Data Minimization

- Employer views include only employer-safe packet fields.
- Lender views include only consented lender-safe fields.
- University views are aggregate or anonymized by default.
- SEVISmate I-901 handoff includes only the minimum required fields.
- AI prompts include only the minimum necessary text and redact or tokenize restricted identifiers.
- API responses and exports are reviewed against a field-level allowlist.

## Audit Logging

Audit logging is required for every:

- Sensitive read.
- Sensitive write.
- External share.
- Export.
- Packet view.
- Document view.
- Document download.
- Partner handoff.
- Consent change.
- High-stakes workflow gate decision.
- AI-assisted recommendation touching restricted data.

Audit entries must include actor, tenant, subject, purpose, action, outcome, timestamp, and correlation id. They must not include PII, passport numbers, SEVIS IDs, DS-160 data, visa status, credit data, loan data, employer packets, secrets, raw prompts, or document contents.

## Documents

- Restricted documents are encrypted at rest.
- Access uses short-lived signed URLs with recipient, purpose, expiry, nonce, and revocation support.
- Document views and downloads are audit logged.
- Filenames and URLs do not contain restricted identifiers.
- Public bearer document links are not allowed.

## Logs, Errors, Analytics, and Telemetry

- No restricted data appears in logs, URLs, UTM parameters, analytics events, traces, prompts, telemetry, fixtures, seed data, or docs.
- Client error responses use safe error codes and correlation ids.
- Server logs use redacted structured metadata.
- CI includes restricted-data and secret scanning.

## AI Safety

- AI may draft, explain, classify, or summarize.
- AI cannot make final decisions about visa, credit, employment, application submission, licensure, or eligibility.
- High-stakes AI output requires human review and a recorded decision maker.
- Prompt and output storage follows restricted-data retention rules.
- Prompt builders and model gateways are tested for data minimization and redaction.

## Application Gate

Application submission and employer/ATS/VMS handoff must fail closed unless all required gates pass:

- Visa or work authorization gate.
- License and credential gate.
- Consent gate.
- Packet QA gate.
- Authorized workflow gate.
- Partner tenant gate.
- Document access gate.

Production Application Gate enforcement cannot be disabled by environment variable. Break-glass overrides require super-admin approval, reason code, expiry, and audit.

## Webhooks

- Inbound webhooks require provider-specific HMAC signature, timestamp, replay protection, idempotency, and rate limiting.
- Outbound webhooks require HTTPS, tenant scoping, event allowlists, purpose scoping, and redacted schemas.
- Webhook URLs, secrets, and payloads are not logged.
- Failed delivery records do not contain restricted payloads.

## Secrets

- Secrets come from a secrets manager in production and staging-like environments.
- No secrets in repo, committed `.env` files, tests, fixtures, logs, prompts, docs, or generated output.
- Production startup fails if secrets are missing, default, weak, or locally generated.
- Scripts must not print secrets, token fragments, or credential material.

## Required Tests

Each relevant change must include tests for:

- Missing authentication.
- Cross-candidate BOLA.
- Cross-tenant partner access.
- Missing, revoked, wrong-purpose, and wrong-recipient consent.
- Audit logging on sensitive read/write/export/document access.
- Document URL expiry, recipient binding, and revocation.
- Webhook missing signature, bad signature, stale timestamp, replay, and rate limit.
- AI prompt redaction and high-stakes decision blocking.
- Application Gate fail-closed behavior.
- Fixture/log/error/telemetry scans for restricted data and secrets.

## Release Evidence

Before final response, PR approval, or release:

- Typecheck passes.
- Unit and integration tests pass.
- Lint passes.
- Relevant security checks pass.
- Security-sensitive tests are not removed or weakened.
- No real production data is used.
- Residual risks and skipped checks are documented.
