# FlorenceRN Backup And Recovery Plan

Status: SOC 2 ready controls in progress. Repository code includes persistence patterns, but production backup evidence must be provided by operations.

## Purpose

FlorenceRN must preserve availability and recoverability for identity, consent, audit, document, Academy, Pathway, ATS/VMS, lender, and Production Ledger data while protecting restricted data during backup and restore.

## Recovery Objectives

Initial targets, subject to production architecture approval:

| System | RPO target | RTO target | Notes |
| --- | --- | --- | --- |
| Core identity, consent, audit, Passport, Application Gate | 15 minutes | 4 hours | Highest priority due to access, disclosure, and audit dependency. |
| Document Vault metadata and encrypted blobs | 15 minutes | 8 hours | Restore must preserve encryption keys and signed URL revocation state. |
| Production Ledger | 15 minutes | 4 hours | Append-only events must preserve ordering and idempotency. |
| Academy learning data | 1 hour | 8 hours | Candidate-facing continuity and instruction dashboards. |
| Pathway and consular data | 1 hour | 8 hours | Visa and licensure workflow continuity. |
| ATS/VMS connector data | 1 hour | 8 hours | Employer submission and status continuity. |
| Analytics and aggregate reporting | 24 hours | 24 hours | Lower priority if source systems are intact. |

## Backup Requirements

- Backups must be encrypted.
- Backup keys must be managed through approved KMS or secrets manager.
- Backups must not be exported to local developer machines.
- Backup access must be role-limited and audit logged.
- Backups must include database schema, data, migration history, audit logs, document metadata, encrypted document blobs, and key identifiers.
- Backups must not break audit hash-chain verification.
- Backups must preserve consent revocation and document revocation state.

## Restore Requirements

Every restore drill must verify:

- Application can boot against restored data.
- Authentication keys and JWKS state are valid or intentionally rotated.
- Consent lookups return expected results.
- Audit chain verifies.
- Document Vault can decrypt permitted documents.
- Expired or revoked signed URLs remain unusable.
- Application Gate still fails closed.
- Webhook idempotency and ledger idempotency are preserved.
- Sensitive fields remain encrypted where expected.

## Environments

| Environment | Backup stance |
| --- | --- |
| Production | Scheduled encrypted backups, retention policy, access audit, restore drills. |
| Staging | Synthetic or masked data only. Backups allowed only if encrypted and access-controlled. |
| Development | Synthetic data only. No production backup restores. |
| Local | No production data. Local backups are not compliance evidence. |

## Retention Targets

Initial targets, pending legal/compliance approval:

- Daily backups retained for 35 days.
- Monthly backups retained for 12 months.
- Audit logs retained according to security and legal requirements.
- Document retention follows candidate, partner, legal, and contractual requirements.
- Deleted or revoked documents must follow documented retention and deletion policy.

## Manual Controls Required

- Configure managed database backups for each production datastore.
- Configure encrypted object storage backups for documents.
- Store backup encryption keys in KMS or approved secrets manager.
- Perform quarterly restore drills.
- Record restore evidence, time to restore, data integrity checks, and issues found.
- Review backup access quarterly.
- Include backups in incident response and disaster recovery tabletops.

## Current Repository Evidence

- Core audit chain verifier exists.
- Document Vault encryption and download controls have tests.
- Postgres stores exist for Core and Academy.
- CI verifies build and security behavior but does not prove production backup readiness.

## Known Gaps

- No production backup configuration evidence in this repository.
- No completed restore drill evidence in this repository.
- No cloud KMS evidence in this repository.
- No immutable backup or write-once audit storage evidence in this repository.
