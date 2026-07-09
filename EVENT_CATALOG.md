# Florence Education Event Catalog

Last updated: 2026-06-25

## Purpose

This catalog documents the current platform event model and the target requirement that Florence OS modules write auditable lifecycle events into Core. Events must be minimized, tenant-scoped, idempotent, and free of restricted raw values.

## Core Event Ingestion

| Endpoint | Purpose | Required behavior |
| --- | --- | --- |
| `POST /v1/nurse/event` | Passport-spine event write for a resolved nurse. | Requires scoped Core credentials, resolves nurse identity, records event against Core `nurse_events`. |
| `POST /v1/events` | General platform event ingestion. | Requires service credentials and an idempotency key; should include `event_type`, source system, subject reference, and minimized payload. |
| `POST /v1/ledger` | Ledger-oriented event/read model path. | Must preserve auditability and verification status for billing-critical or operationally critical events. |

## Event Rules

- Do not place PII, passport numbers, SEVIS IDs, DS-160 data, visa detail, credit data, loan data, employer packet contents, document text, signed URL tokens, or secrets in event payloads.
- Use opaque Core ids, module ids, event ids, and coarse status values.
- Include tenant, partner, employer, program, or recipient scope where relevant.
- Include `source_system`, timestamp, actor/service identity, and verification source where relevant.
- Use idempotency keys for retries.
- Events that drive application submission, billing, starts, retention, packet sharing, financing, or eligibility must fail closed when Core or required verification is unavailable.

## Module Event Summary

| Source module | Event path | Current event examples | Current behavior | Required staging state |
| --- | --- | --- | --- | --- |
| Core | Internal `recordEvent` and gateway modules | `consent.granted`, `consent.revoked`, `application.submitted`, `application.gate_checked`, `credit.decision`, generic `/v1/events` writes. | Core stores canonical events and audit trails. | Keep Core as canonical event spine. |
| Academy | `emitCoreEvent` to Core `/v1/events`; Passport helper for some flows. | `academy.apply_cta_viewed`, `academy.apply_cta_clicked`, `academy.application_fee_coverage_created`, `academy.application_fee_coverage_status_updated`, `academy.global_live_access_activated`, `academy.student_payment_completed`, `academy.sponsored_price_applied`, `academy.library_resource_imported`, `academy.library_signed_access_created`, `academy.grant_gap_calculated`, `academy.access_grant_status_updated`, `academy.grant_to_pathway`, `academy.grant_disbursement_recorded`, `academy.grant_receipt_verified`. | Writes to local `academy_events` and emits to Core when Core event URL/token are configured. | Require Core event configuration for readiness, sponsorship, grant, Apply, and cross-platform writes. |
| Pathway | `emitForCandidate` through Core Passport client. | `pathway.document_verified`, `pathway.licensure_status`, `consent.updated`, `pathway.visa_status`, `pathway.nclex_status`, `pathway.consular_case_status`, `pathway.visa_appointment_prerequisites_updated`, `pathway.readiness_gate_applied`, `consular.i901_receipt_uploaded`, `consular.i901_paid`, `consular.i901_receipt_qa_approved`. | Core writes are no-op when Core client credentials are missing; local workflow and consular payment event tables remain. | Require Core client credentials and fail closed for Core-dependent status updates outside local development. |
| Employer Connect | `recordLedger`, `emitPassport`, Core Application Gate client, local attribution events. | `ats.matched`, `employer_packet.created`, `employer_packet.qa_approved`, `ats.packet_submitted`, `ats.interview`, `ats.offer`, `ats.start_scheduled`, `ats.started`, retention events, `ats.term_complete`, `ats.rejected`, `ats.withdrawn`, `financing.repayment`, `application.work_authorization_cleared`, `application.license_verified`, `application.ready_to_submit`, `billing.subscription_started`, `onboarding.start_signal`, demand attribution events. | Default local ledger is canonical unless `LEDGER_CANONICAL=core`; can mirror to Core when credentials are present. | Set `LEDGER_CANONICAL=core`, require Core credentials, and keep local rows as projections. |
| Grants | Current surface in app shell; related Academy grant and sponsorship event names exist. | Academy grant-related event examples above. | No dedicated Grants service or standalone Grants Core writer was identified. | Define Grants ownership and make grant review/award/coverage events Core-backed. |
| Workforce Economist | `emitCoreEvent` to Core `/v1/events`. | `economist.quote.created`, `economist.proposal.created`. | Throws in production or when required flag is set; no-op mode is allowed locally. | Set Core credentials and require events for staging and production. |

## Billing And Production Ledger Events

Billing-critical events require stronger verification than recruiter-stage or ATS-only signals.

| Event class | Required verification |
| --- | --- |
| Start scheduled | Employer attestation, HRIS, or approved workflow evidence. |
| Started | HRIS, employer attestation, or nurse confirmation; not bare ATS status alone. |
| Retention milestones | HRIS, employer attestation, payroll-equivalent proof, or approved source. |
| Subscription billing | Verified start or approved contract trigger. |
| Repayment/financing | Approved lender or internal financing source of truth. |

## Open Event Gaps

- Grants needs an owner service decision and Core event writer.
- Academy and Pathway should not silently no-op Core writes outside local development.
- Employer Connect should use Core as canonical ledger in staging and production.
- Workforce Economist should require Core event writes in staging, matching production behavior.
- Event payload schemas should be formalized in a shared package with fixtures that contain synthetic data only.
