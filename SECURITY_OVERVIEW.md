# Florence Education Security Overview

Last updated: 2026-06-25

## Purpose

This overview documents the security posture required for Florence Education / Florence OS. The platform handles high-sensitivity healthcare, education, immigration, financing, workforce, employer, partner, and learning workflows, so all engineering work must preserve bank-grade and healthcare-grade controls.

This is not a SOC 2, HIPAA, HITRUST, HECVAT, GLBA, FERPA, GDPR, PCI, production, or legal compliance attestation. The accurate status is production-readiness in progress and SOC 2-aligned control preparation, pending external audit and security review.

## Security Scope

In scope:

- Core identity, SSO, roles, scopes, tenant binding, consent, Passport, Application Gate, audit, Document Vault, lender, model, webhook, and ledger controls.
- Academy learning, enrollment, sponsor, Apply CTA, library, payment-reference, and readiness events.
- Pathway visa, NCLEX, licensure, consular, QA, document, and workflow automation.
- Employer Connect demand, packet, ATS/VMS, Application Gate, webhook, and Production Ledger workflows.
- Grants and fee coverage workflows once formalized.
- Workforce Economist quote and proposal workflows.
- Local, CI, staging, and deployment controls.

Out of scope for this repository-only handoff:

- Formal third-party audit.
- External penetration test report.
- Signed vendor, employer, lender, school, university, or processor agreements.
- Cloud IAM evidence, SIEM/EDR evidence, HR controls, production access reviews, or business continuity evidence not stored in this repo.

## Non-Negotiable Controls

- No restricted data in logs, URLs, analytics, telemetry, errors, prompts, fixtures, screenshots, docs, or examples.
- Every sensitive read, write, share, export, packet view, document view, and document download is audit logged.
- Every partner, employer, lender, university, school, channel, vendor, and integration is tenant-scoped.
- Every external share requires explicit, purpose-specific consent.
- Employers see employer-safe packets only.
- Lenders see consented lender-safe packets only.
- Universities see aggregate or anonymized views by default.
- AI output is assistive and must not make final visa, credit, financing, employment, application submission, licensure, eligibility, or pathway approval decisions.
- Application submission fails closed unless authorization, license, consent, packet QA, tenant authorization, and workflow gates all pass.
- Secrets come from approved secret storage, never from committed files.
- Restricted documents are encrypted at rest and accessed only through short-lived signed URLs.
- Security controls must not be weakened to make tests pass.

## Core Security Architecture

Core is the platform policy center. It owns:

- Identity, sessions, roles, scopes, and partner tenant binding.
- Nurse Passport references and cross-app identity resolution.
- Consent records and revocation.
- Document Vault metadata, grants, signed URL issuance, revocation, and audit.
- Application Gate decisions.
- Tamper-evident audit records.
- Production Ledger and event ingestion.
- Model Gateway governance for sensitive AI workflows.

The required sensitive workflow path is:

1. Authenticate caller.
2. Resolve role, scope, tenant, recipient, purpose, and candidate or partner relationship.
3. Verify purpose-specific consent before any external share.
4. Minimize fields and select the recipient-safe projection.
5. Run Application Gate when packet sharing, ATS/VMS submission, or application submission is involved.
6. Serve restricted documents only through short-lived signed URLs.
7. Emit audit and Core event records.
8. Fail closed if a required control is missing or ambiguous.

## Module Security Summary

| Module | Security/data-sharing rules | Tests | Known gaps |
| --- | --- | --- | --- |
| Core | Tenant scopes, role grants, RS256/JWKS, M2M scopes, consent, redaction, Document Vault, Application Gate, audit, lender-safe views, Model Gateway. | Security spine, audit, document vault, Application Gate, gateway, lender, tenant-binding, tenant-isolation, model gateway checks. | External audit and cloud control evidence pending. |
| App Web | Role-aware shell, shared design system, no sensitive persistence, no restricted data in URLs. | Typecheck/build when npm is available. | Some fallback data remains; standalone module UIs need full shared-shell migration. |
| Academy | Encrypted sensitive fields, signed library access, sponsor and university-safe views, Apply CTA safety, Core event emission. | Smoke, integration, TLS, walkthrough, web Vitest. | Core event no-op mode must be forbidden outside local development. |
| Pathway | Candidate binding, staff role checks, human QA gates, no-PII errors, audit redaction, status-only SSN handling, Core Passport writes. | Pathway v1, consular payment, audit redaction, no-PII smokes. | Sensitive JSONB workflow records need Core-governed canonical split over time; Core credentials must be required outside local dev. |
| Employer Connect | Employer-safe packets, purpose-specific consent, Application Gate, submission locks, HMAC webhooks, signed document access, billing-grade verification. | Document vault, platform API, Application Gate, production loop, Core-required, PII URL, audit redaction, webhook signature, no-PII, VMS smokes. | Core canonical ledger mode must be enforced in staging and production. |
| Grants | Funding and fee coverage views must be purpose-limited and avoid lender/credit leakage unless separately consented. | No dedicated Grants backend tests found. | Owner service, Core event writer, consent/audit tests, and schema decision required. |
| Workforce Economist | Aggregate/facility economics only; no nurse PII; Core quote/proposal events required outside local dev. | Smoke script. | Staging should require Core events, matching production behavior. |

## Data Handling

Allowed in tests and docs:

- Synthetic names and emails using safe test domains.
- Synthetic employer, facility, school, and program records.
- Opaque fake ids.
- Coarse readiness/status labels when synthetic.

Not allowed in tests or docs:

- Real passports, dates of birth, addresses, SEVIS IDs, DS-160 data, visa status, transcripts, licensure records, loan or credit data, employer packets, restricted document contents, production ids, real secrets, or copied user records.

## AI And Automation

AI may:

- Draft, summarize, explain, classify, extract, tutor, simulate, remediate, and recommend review.

AI must not:

- Submit applications, transmit packets, approve financing, approve eligibility, reject candidates, make final visa/licensure/employment decisions, or decide pathway approval.

Sensitive AI workflows must record source, purpose, model/version, input category, output category, reviewer, and final human action.

## Current Evidence And Required Refresh

Existing repo evidence includes security docs, control matrices, threat models, gap registers, manual controls, vendor data flow notes, and security test evidence. This final package should be treated as the current engineering handoff, while detailed legacy evidence files remain supporting material.

Before staging sign-off, refresh:

- All-files secret scan.
- Tenant-binding and tenant-isolation tests.
- Consent and data-sharing tests.
- Document Vault tests.
- Application Gate tests.
- Audit redaction and no-PII error tests.
- Webhook signature tests.
- AI/model gateway governance tests.
- Dependency audit and static analysis when tooling/network is available.

## Residual Risk

- No formal external audit or penetration test is complete.
- Staging plan/apply requires authorized cloud credentials and reviewed secrets.
- Grants is not yet a complete Core-event-writing module.
- Some service Core event paths can no-op locally and need staging/prod fail-closed enforcement.
- Some standalone UI surfaces still need full shared design-system migration.
- Production-readiness language must remain conservative until controls are independently verified.
