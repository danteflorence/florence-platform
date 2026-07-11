# Core System Of Record Plan

Last reviewed: 2026-07-10

## Current State

Core already carries the strongest platform controls:

- Identity, SSO, roles, scopes, sessions, API clients, partner keys, and JWKS.
- Nurse Passport and Passport view redaction.
- Consent records and recipient-specific sharing policy.
- Audit logging, tamper-evident verification, and anomaly checks.
- Application Gate logic for submission and employer interest workflows.
- Document Vault metadata, grants, signed URL controls, and document audit events.
- Production Ledger event primitives.
- Model Gateway and AI safety controls.
- Partner tenant binding and scoped gateway routes.
- Lender-safe and partner-safe modules.

Other apps still own or mirror sensitive domain data locally. Academy, ATS, and Pathway have their own stores, audit records, and domain-specific state. This is acceptable for current state but must not remain ambiguous in the consolidated platform.

## Desired State

Core is the canonical system of record for all cross-product sensitive controls and records:

- Canonical Florence identity.
- Canonical Nurse Passport.
- Canonical consent and revocation.
- Canonical tenant and partner bindings.
- Canonical sensitive-read and sensitive-write audit chain.
- Canonical Document Vault metadata and access grants.
- Canonical Production Ledger.
- Canonical Application Gate result and submission locks.
- Canonical AI governance and model-event audit.
- Canonical partner API gateway and scope catalog.

Product apps remain purpose-built surfaces and workflow engines. They may own local operational state, but any external share, high-stakes action, restricted document access, or cross-product record must resolve through Core or a Core-approved contract.

## Affected Files And Repos

- `apps/core-api/src/*`, `apps/core-api/db/schema.sql`, and Core scripts.
- Academy API auth, passport, audit, payments, library, outreach, and partner routes.
- Employer Connect (`apps/employer-connect-api`) packet, document, application gate, VMS, ATS, ledger, and connector flows.
- Pathway workflow, document, QA, visa/licensure, consular payment, and submission flows.
- SDKs and shared packages.
- Docs, OpenAPI contracts, and developer portal copy.

## Migration Steps

1. ✅ Done — the ownership matrix is published as `SYSTEM_OF_RECORD_MAP.md`.
2. Add a service-by-service record classification:
   - Core canonical record.
   - Product-owned local workflow state.
   - Core projection.
   - External/public aggregate.
   - Deprecated duplicate.
3. Move sensitive reads behind Core gateway routes or shared Core clients.
4. Move sensitive writes and cross-product events to Core write APIs with idempotency keys.
5. Replace app-local packet builders with Core-owned or Core-verified role-safe projections for employer, lender, university, candidate, internal, and partner views.
6. Make Application Gate checks and submission locks authoritative in Core.
7. Route document previews, downloads, exports, and packet views through Core Document Vault signed URL flows.
8. Make AI workflows call the Model Gateway for sensitive tasks and record source, purpose, model/version, input category, output category, reviewer, and final human action.
9. Keep app-local audit logs only as operational supplements; Core remains canonical for sensitive audit.
10. Update OpenAPI docs and SDKs after each Core route becomes authoritative.

## Risks

- App-local fallback paths can bypass Core controls if left enabled in production.
- Product teams may treat projections as canonical.
- Partner M2M tokens need strong org and tenant binding before broader external access.
- AI workflows can become high-stakes decision systems if review gates are unclear.
- Moving too much at once can break user-facing Academy or employer workflows.

## Tests Needed

- Core gateway auth, scope, tenant, consent, and redaction tests.
- App integration tests proving sensitive operations call Core or fail closed.
- Application Gate tests for missing consent, license, visa/work authorization, QA, tenant authorization, workflow state, and duplicate submission.
- Document Vault tests for encryption metadata, signed URL expiry, revocation, tenant revalidation, view audit, and download audit.
- AI safety tests for regulated payload refusal, high-stakes action blocking, human-review requirement, and audit metadata.
- Partner isolation tests for employer, lender, university, ATS, and VMS views.

## Acceptance Criteria

- There is no ambiguous owner for any sensitive cross-product record.
- Apps cannot externally share, export, submit, download, or view restricted data without Core controls.
- Core gateway contracts are documented and tested.
- High-stakes decisions remain human-reviewed and auditable.
- External partners receive only purpose-limited, consented, tenant-scoped projections.
