# Florence Education System Of Record Map

Last updated: 2026-06-25

## Purpose

This map defines which service owns each sensitive platform domain today and where the target Florence OS ownership must land. It is intentionally strict: downstream services may keep workflow data and rebuildable projections, but Core must own the canonical records that govern identity, consent, documents, Application Gate decisions, audit, and Production Ledger truth.

## Canonical Ownership

| Domain | Current owner | Target owner | Current evidence | Readiness |
| --- | --- | --- | --- | --- |
| Identity, SSO, roles, scopes, sessions | Core | Core | `users`, `orgs`, `role_grants`, `sessions`, JWKS/OAuth routes. | Ready for staging |
| Partner tenant scoping | Core plus module checks | Core as policy source, modules enforce locally too | `tenant_scopes`, `program_scopes`, partner keys, downstream tenant checks. | Partially ready |
| Nurse Passport | Core | Core | `nurses`, `nurse_refs`, `nurse_events`, `/v1/nurse/passport`. | Partially ready |
| Consent | Core | Core | Consent grant/revoke APIs and downstream consent mirrors. | Partially ready |
| Document Vault | Core | Core | `/v1/document-vault/*`, signed URL routes, downstream document-vault bridge. | Partially ready |
| Application Gate | Core | Core | `/v1/applications/gate` and `/v1/applications/submit`; Employer Connect Core gate client. | Partially ready |
| Audit | Core for platform audit; modules retain local audit logs | Core canonical plus module-local operational audit | Core `audit_log`; Academy, Pathway, and Employer local audit tables. | Partially ready |
| Production Ledger | Core target; Employer Connect can be local canonical unless configured | Core | Core `/v1/events` and `/v1/ledger`; Employer `LEDGER_CANONICAL=core` mode. | Blocked until enforced |
| Academy learning records | Academy | Academy operational, Core readiness events | Academy API schema and event writer. | Partially ready |
| Pathway workflow state | Pathway | Pathway operational, Core sensitive canonical decisions | Pathway workflow and QA tables; Core Passport writes. | Partially ready |
| Employer demand and packet workflow | Employer Connect | Employer operational, Core consent/docs/gate/ledger | Employer schema, packet builder, Application Gate client, ledger writer. | Partially ready |
| Grants and fee coverage | App shell plus Academy sponsor tables | Dedicated Grants module or Academy-owned workflow with Core events | `/grants` UI and Academy sponsor/coverage tables. | Not complete |
| Workforce economics | Workforce Economist | Economist operational, Core quote/proposal events | Stateless API and Core event writer. | Partially ready |

## Core-Owned Records

Core should remain the authoritative service for:

- User identity and staff/partner role grants.
- Organization and partner tenant scopes.
- Nurse Passport references and cross-app candidate identity resolution.
- Consent state, revocation, sharing purpose, recipient, and audit trail.
- Restricted document metadata, access policy, signed URL issuance, revocation, and document access audit.
- Application Gate decisions and fail-closed submission control.
- Tamper-evident audit events.
- Production Ledger events, corrections, verification status, and billing-critical event truth.
- AI governance metadata for sensitive workflows, including purpose, model/source, input class, output class, reviewer, and final human action.

## Module Projections

| Module | Allowed local data | Must write or check Core | Data that should not become local canonical truth |
| --- | --- | --- | --- |
| Academy | Enrollments, cohorts, assessments, learning resources, sponsorship workflow, payment references where encrypted/minimized. | Identity, readiness and education events, consent where sharing occurs, audit-safe event references. | Cross-platform identity, unrestricted document vault records, final pathway readiness truth. |
| Pathway | Workflow state, QA reviews, appointments, deficiencies, local operational form drafts. | Passport events, consent updates, document controls, Application Gate prerequisites, sensitive audit. | Final visa/work authorization, licensure, or application-submission truth without Core governance. |
| Employer Connect | Requisitions, matches, local packet projections, ATS/VMS sync status, demand planning. | Consent, employer-safe packet authorization, Document Vault signed URLs, Application Gate, Production Ledger. | Billing-grade starts/retention from unverified ATS data, unrestricted candidate packets, lender/immigration data. |
| Grants | Review queue and fee coverage workflow once formalized. | Grant decision events, consent/audit, funding-safe projections. | Credit underwriting, lender-sensitive records, unrestricted financial data. |
| Workforce Economist | Quote inputs, facility/system aggregates, proposals. | Quote/proposal events to Core. | Nurse PII, high-stakes placement, financing, or immigration decisions. |

## Migration Rules

1. Do not move sensitive canonical data out of Core.
2. Do not let module-local ledger rows be the production source of truth when Core can be reached.
3. Treat local SQLite, PGlite, in-memory stores, and JSON files as local-development-only unless a file is explicitly a static fixture with synthetic data.
4. Use opaque Core ids and event ids across services. Do not pass passports, SEVIS IDs, DS-160 fields, credit data, document text, or packet contents in URLs, logs, events, or prompts.
5. Every event write to Core must include source system, actor or service identity, tenant/program scope where applicable, timestamp, verification status where applicable, and an idempotency key.

## Required Follow-Up

- Enforce Core-required event modes for Academy, Pathway, Employer Connect, and Workforce Economist in staging and production.
- Add a Grants owner service decision and Core event writer.
- Remove or fence local canonical ledger fallback outside local development.
- Add release checks that fail if production services are configured with local-only database adapters.
- Add recurring audits that compare module projections against Core event and ledger state.
