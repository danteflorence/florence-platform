# FlorenceRN Security Overview

Status: SOC 2 ready controls in progress. This package is not a SOC 2, HIPAA, HITRUST, HECVAT, GLBA, FERPA, GDPR, or PCI attestation. No formal audit has been completed.

Last updated: 2026-06-24

## Purpose

This evidence package prepares FlorenceRN for enterprise diligence by AMN, Kaiser, lenders, universities, ATS/VMS partners, employers, and investors. It documents the security posture currently represented in the repository, the controls that have verification evidence, and the gaps that still require remediation or manual operational controls.

FlorenceRN is treated as a bank-grade and healthcare-grade platform because it may process passports, dates of birth, addresses, transcripts, I-20s, SEVIS IDs, DS-160 data, visa status, licensure records, Academy learning data, audio and tutor interactions, credit and underwriting signals, lender handoffs, employer packets, ATS/VMS submissions, and Production Ledger events.

## Scope

In scope:

- Florence Core: identity, SSO, roles, scopes, consent, Passport views, redaction, Model Gateway, webhooks, audit, Application Gate, document vault, lender and ledger modules.
- Florence Academy: candidate learning data, assessments, remediation, tutor and audio, employer and university views, outreach, payments, webhooks.
- Florence ATS Connect: employer packets, applications, ATS/VMS handoffs, document vault bridge, Application Gate, public interest flows, Production Ledger.
- Florence Pathway Agent: visa, I-20, SEVIS, DS-160, NCLEX, licensure, workflow and consular payment workflows.
- CI/CD and local security gates: dependency install, typecheck, tests, build, lint, secret scanning, dependency audit, static analysis, CodeQL workflow.

Out of scope for this repository-only package:

- Formal third-party audit.
- Cloud production environment configuration evidence.
- Signed BAAs, DPAs, MSAs, lender agreements, university agreements, or processor contracts.
- External penetration test report.
- SIEM, EDR, MFA enrollment, HR background-check evidence, security awareness records, and vendor contract files.

## Security Architecture Summary

FlorenceRN uses Core as the policy center. Core owns the canonical identity model, scoped tokens, partner tenant binding, data classification, consent, recipient-specific redaction, audit logging, Application Gate, Model Gateway, document-vault controls, and Production Ledger primitives.

The intended disclosure path is:

1. Authenticate caller.
2. Resolve role, scopes, tenant, recipient, and purpose.
3. Verify candidate relationship or partner tenant relationship.
4. Verify purpose-specific consent when data leaves FlorenceRN.
5. Apply data classification and recipient-safe serializer.
6. Apply Application Gate for employer packet, ATS/VMS, and application actions.
7. Serve documents only through encrypted storage and short-lived signed URLs.
8. Audit every sensitive read, write, share, export, packet view, document view, document download, and AI model event.
9. Fail closed when any required control is missing.

## Evidence Index

| Evidence file | Contents |
| --- | --- |
| `SECURITY_THREAT_MODEL.md` | Existing source-based threat model and high-risk attack paths. |
| `SECURITY_DATA_MAP.md` | Existing sensitive data domains and where data may appear. |
| `SECURITY_ATTACK_SURFACE.md` | Existing public, partner, webhook, document, export, and rate-limit surfaces. |
| `SECURITY_FINDINGS.md` | Existing critical, high, medium, and low findings baseline. |
| `SECURITY_REMEDIATION_PLAN.md` | Existing execution-order remediation plan. |
| `SECURITY_DOD.md` | Existing security definition of done. |
| `SECURITY_CONTROLS_MATRIX.md` | Enterprise controls matrix tied to code evidence, tests, and residual work. |
| `DATA_CLASSIFICATION_POLICY.md` | Data classes, field tags, recipient views, and redaction rules. |
| `ACCESS_CONTROL_POLICY.md` | RBAC, ABAC, tenant isolation, candidate binding, and partner access rules. |
| `CONSENT_AND_DATA_SHARING_POLICY.md` | Purpose-specific consent and external sharing policy. |
| `DOCUMENT_VAULT_POLICY.md` | Restricted document storage, signed URL, and audit policy. |
| `AI_SAFETY_POLICY.md` | Model Gateway, prompt safety, AI output, human review, and high-stakes rules. |
| `INCIDENT_RESPONSE_PLAN.md` | Incident classification, roles, timeline, communications, and evidence handling. |
| `BACKUP_AND_RECOVERY_PLAN.md` | Backup, recovery, RPO/RTO targets, testing, and gaps. |
| `VENDOR_RISK_REGISTER.md` | Vendors, processors, partners, data received, risk, and required diligence. |
| `SOC2_READINESS_CHECKLIST.md` | SOC 2 readiness tracker, tests, manual controls, and residual risks. |
| `SECURITY_GAP_REGISTER.md` | Remaining critical, high, medium, and low security gaps. |
| `SECURITY_MANUAL_CONTROLS.md` | Manual controls still required for enterprise operation. |
| `SECURITY_VENDOR_DATA_FLOWS.md` | Third-party vendors and partners, plus the data each receives. |
| `SECURITY_TEST_EVIDENCE.md` | Test list and latest local verification results for isolation, Application Gate, redaction, document security, webhooks, and AI safety. |

## Implemented And Verified Controls

The repository currently includes code and verifier evidence for:

- Central data classification and fail-closed unknown field handling in Core.
- Recipient-specific serializers for candidate, internal operations, employer, lender, university, AMN/VMS partner, and investor or board aggregate views.
- Redaction helpers for logs, errors, API responses, exports, analytics, and AI model inputs.
- Passport view redaction and withholding reasons for partner views.
- Employer-safe and AMN/VMS-safe packet views that omit passport, DS-160, financing, underwriting, Academy remediation history, and unrelated employer placement data.
- Lender view controls that omit employer notes unless explicitly permitted.
- University and investor views that are aggregate or anonymized by default.
- Core consent records that are purpose-specific, recipient-specific, revocable, and audit logged.
- Partner tenant isolation logic for employer, lender, university, AMN, and ATS/VMS relationships.
- Application Gate fail-closed checks for consent, visa or work authorization, license, packet QA, authorized workflow, job status, data-minimized packet generation, and duplicate submission locks.
- Document Vault encryption, short-lived signed URLs, tenant revalidation at redemption, revocation, document lifecycle hooks, safe document types, malware scanner hook, and document audit events.
- Model Gateway task registry, data class ceilings, prompt versions, output schemas, untrusted-source handling, prompt-injection detection, high-stakes action blocking, AI audit metadata, and full Passport access gating.
- Tamper-evident audit log checks and bulk-read anomaly alerts.
- CI contract for dependency install, typecheck, tests, lint, build, secret scan, dependency audit, static analysis, CodeQL, and Terraform validation.

## Current Registers

- Remaining security gaps are listed in `SECURITY_GAP_REGISTER.md`.
- Manual controls still required are listed in `SECURITY_MANUAL_CONTROLS.md`.
- Third-party vendors and the data each receives are listed in `SECURITY_VENDOR_DATA_FLOWS.md` and summarized in `VENDOR_RISK_REGISTER.md`.
- Tests proving partner isolation, Application Gate, redaction, document security, webhook security, and AI safety are listed in `SECURITY_TEST_EVIDENCE.md`.

## Validation Status

The latest local verification status is recorded in `SECURITY_TEST_EVIDENCE.md` and should be refreshed after every material security change. Do not represent these documents as proof of formal SOC 2 compliance.
