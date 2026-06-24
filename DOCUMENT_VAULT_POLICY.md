# FlorenceRN Document Vault Policy

Status: SOC 2 ready controls in progress. This is repository evidence and target policy, not an audit attestation.

## Purpose

Restricted documents must be encrypted, tenant-scoped, consent-gated where applicable, served only through short-lived signed URLs, and audited on every access.

## Restricted Document Types

Restricted documents include:

- Passport and identity documents.
- I-20.
- DS-160 confirmation or draft evidence.
- SEVIS I-901 receipt.
- Transcript.
- Credential evaluation.
- NCLEX and license records.
- Financing packet.
- Lender document.
- Employer packet.
- ATS/VMS submission packet.
- Other uploaded documents that contain restricted candidate data.

## Storage Rules

- Documents must be encrypted at rest.
- Raw restricted documents must not be stored in logs, audit details, analytics, prompts, fixtures, or public folders.
- Filenames must be sanitized and must not include passport numbers, SEVIS IDs, dates of birth, credit values, or secrets.
- Document metadata must be classified and minimized.
- Deletion and retention lifecycle fields must be recorded.

## Signed URL Rules

Signed URLs must:

- Be short-lived.
- Be opaque.
- Contain no candidate IDs, document IDs, passport data, SEVIS IDs, names, emails, or restricted identifiers.
- Be scoped to document, recipient, purpose, actor, tenant, and action.
- Be revocable.
- Revalidate tenant policy at redemption time.
- Fail closed after expiration or document revocation.

## Access Rules

| Recipient | Allowed document access |
| --- | --- |
| Candidate | Own candidate-safe documents only. |
| Internal operations | Restricted internal view when role and purpose allow. |
| Employer | Employer packet and ATS/VMS packet only, with consent, tenant, license, QA, and gate checks. |
| AMN/VMS partner | Employer-safe ATS/VMS packet only for authorized program and tenant. |
| Lender | Financing packet and lender document only with underwriting consent and tenant match. |
| University | Transcript, credential, NCLEX, or license document only when aggregate default is not sufficient and explicit consent exists. |
| Investor/board | No restricted document access. |

## Upload Rules

- Unknown document types are rejected.
- Unsafe content types are rejected.
- Malware scanner hooks must be enabled before production document ingestion.
- Candidate upload is limited to own records.
- Partner upload requires tenant and workflow authorization.
- Every upload creates an audit event.

## Audit Requirements

Audit events are required for:

- Document upload.
- Document share or signed URL creation.
- Document view.
- Document download.
- Access denied.
- Revocation.
- Deletion lifecycle action.

Audit details must include safe metadata only.

## Legacy Links

Legacy public bearer links for resumes, packets, or other restricted documents must be disabled, migrated, or fronted by the Document Vault. Public document tokens without expiry, recipient binding, revocation, and audit are not allowed.

## Verification

Current repository evidence:

- `florence-core npm run verify-document-vault`
- `florence-ats-connect npm run document-vault-smoke`
- `florence-core npm run verify-gateway`

## Residual Risk

Production deployment still needs cloud storage encryption evidence, KMS evidence, malware scanning configuration, retention job evidence, and migration of legacy public document flows.
