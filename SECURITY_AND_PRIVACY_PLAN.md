# Security And Privacy Plan

Last reviewed: 2026-06-25

## Current State

Florence is a high-sensitivity healthcare, education, immigration, financing, and workforce platform. The repo already includes strong policy and implementation evidence:

- Root and repo-level security rules.
- Core data classification, redaction, consent, tenant access, audit, Application Gate, Document Vault, Model Gateway, partner keys, and gateway scopes.
- Academy API audit, auth, field encryption, learner records, outreach controls, library/resource controls, and partner views.
- ATS Connect packet redaction, document vault bridge, Application Gate, submission locks, partner connectors, VMS flows, and no-PII URL smoke.
- Pathway sensitive workflow state, redacted audit details, QA gates, and Core Passport read/write seams.
- Root CI secret scanning, dependency audit, static analysis, CodeQL, and Terraform validation.

Some current app-local audit details and logs still require a dedicated review to ensure metadata contains only safe opaque IDs, event IDs, statuses, counts, and coarse labels.

## Desired State

Security controls are platform defaults, not app-specific conventions:

- No PII, passport, SEVIS, DS-160, visa, credit, loan, employer packet, secret, restricted document, tutor, audio, or sensitive learning data in logs, URLs, analytics, prompts, telemetry, errors, fixtures, screenshots, or examples.
- Every sensitive read, write, share, export, packet view, document view, and document download is audit logged.
- Every partner, employer, lender, university, school, channel, vendor, and integration is tenant-scoped.
- Every external share is purpose-specific, consented, minimized, and audited.
- Employer, lender, university, candidate, partner, and internal projections are separate.
- Restricted documents are encrypted at rest and served only through short-lived signed URLs.
- AI is assistive only and cannot make final visa, credit, financing, employment, licensure, eligibility, application submission, or pathway decisions.
- Application submission fails closed unless authorization, license, consent, packet QA, tenant authorization, and workflow gates pass.
- Secrets come only from approved secret storage.

## Affected Files And Repos

- All services with auth, audit, logging, telemetry, routing, AI, document, packet, partner, export, payment, outreach, or webhook code.
- Root policies, CI security scripts, tests, env examples, and docs.
- Future shared `security` package.
- Infra Secret Manager, KMS, Cloud SQL, GCS, IAM, and logging config.

## Migration Steps

1. Create a security control matrix by workflow:
   - Candidate onboarding.
   - Academy learning and tutor.
   - Document upload, preview, download, export, and packet view.
   - Employer packet and ATS/VMS submission.
   - Lender packet and credit workflow.
   - University reporting.
   - Partner API and webhooks.
   - AI drafting and summarization.
2. Add a safe audit metadata schema and shared helper. Allow only opaque IDs, actor class, tenant/org ID, resource type, event ID, status, purpose, recipient, counts, and non-sensitive reason codes.
3. Replace free-text audit details in sensitive workflows with structured safe metadata.
4. Add shared redaction and no-PII URL helpers.
5. Require Core tenant/consent checks for external shares.
6. Move document access to Core Document Vault contracts.
7. Route sensitive AI tasks through Model Gateway and record required AI metadata.
8. Add security tests beside every changed control.
9. Update docs and examples to use synthetic data only.
10. Keep security controls fail-closed even if it blocks a demo workflow.

## Risks

- Logs and audit details can contain sensitive values if helper APIs accept free text.
- Partner integrations can become cross-tenant if external IDs are trusted without binding.
- Webhooks can be replayed or spoofed without validation and tenant resolution.
- AI prompts can leak sensitive content if data minimization is not enforced.
- Test fixtures can accidentally become real-like sensitive records.
- Signed URLs can become long-lived or leak through browser history/referrers.

## Tests Needed

- Secret scan over repo files.
- Fixture scan for sensitive identifiers and real-looking secrets.
- No-PII URL and UTM tests.
- Tenant isolation tests for every read/write/share/export/webhook/integration.
- Consent-required and consent-revoked tests for all external sharing.
- Audit tests for every sensitive event class.
- Document Vault signed URL expiry, revocation, tenant revalidation, and audit tests.
- AI safety tests for prompt minimization, high-stakes refusal, human review, and audit metadata.
- Application Gate fail-closed tests.

## Acceptance Criteria

- No sensitive data appears in logs, URLs, prompts, telemetry, errors, docs, examples, screenshots, or fixtures.
- Every sensitive action is audited with safe structured metadata.
- External sharing is tenant-scoped, purpose-limited, consent-gated, and minimized.
- High-stakes workflows require human review and auditable gates.
- Security checks run in CI and block regressions.
