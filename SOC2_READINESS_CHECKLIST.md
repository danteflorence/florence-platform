# FlorenceRN SOC 2 Readiness Checklist

Status: SOC 2 ready controls in progress. FlorenceRN has not completed a formal SOC 2 audit. Do not claim SOC 2 compliance.

## Scope

This checklist maps current repository controls to SOC 2 readiness work. It focuses on Security, Availability, Confidentiality, Processing Integrity, and Privacy readiness signals, but it is not a substitute for auditor scoping.

## Trust Services Readiness

| Area | Readiness status | Evidence | Remaining work |
| --- | --- | --- | --- |
| Security | In progress | Auth scopes, tenant isolation, redaction, audit, Application Gate, secret scanning, CI gates | Full Pathway lockdown, production MFA, access reviews, penetration test. |
| Availability | Early | Build/test CI, backup plan draft | Production monitoring, backups, restore drills, incident SLAs. |
| Confidentiality | In progress | Data classification, serializers, document vault, encryption helpers | Production KMS, storage encryption evidence, vendor contracts. |
| Processing Integrity | In progress | Application Gate, idempotency, ledger, audit chain, validation tests | Cross-app gate enforcement and reconciliation dashboards. |
| Privacy | In progress | Consent model, purpose-specific sharing, data minimization | Privacy notice, DSAR workflow, deletion workflow, consent text legal approval. |

## Checklist

| Control | Status | Repository evidence | Test evidence |
| --- | --- | --- | --- |
| Security policy documented | In progress | `AGENTS.md`, `SECURITY_DOD.md`, this package | Documentation review |
| Threat model documented | In progress | `SECURITY_THREAT_MODEL.md` | Documentation review |
| Data classification documented and implemented | In progress | `DATA_CLASSIFICATION_POLICY.md`, `classification.ts` | `verify-security` |
| Access control matrix documented | In progress | `ACCESS_CONTROL_POLICY.md`, `roles.ts`, `policy.ts`, `tenantAccess.ts` | `verify-gateway`, `verify-tenant-isolation` |
| Consent model documented and implemented | In progress | `CONSENT_AND_DATA_SHARING_POLICY.md`, `consent.ts` | `verify-security`, `verify-tenant-isolation` |
| Partner tenant isolation | In progress | `tenantAccess.ts`, `tenant.ts` | `verify-tenant-isolation`, `verify-gateway` |
| Sensitive read audit logging | In progress | `audit.ts`, `passportRead.ts`, `documentVault.ts` | `verify-security`, `verify-document-vault` |
| Tamper-evident audit | In progress | `audit.ts`, `auditVerify.ts` | `verify-security`, `verify-audit` |
| Log and error redaction | In progress | `classification.ts`, `logger.ts` | `verify-logging-audit`, `verify-logging-telemetry-audit` |
| Application Gate fail-closed | In progress | `applicationGate.ts` | `verify-application-gate`, ATS `application-gate-smoke` |
| Document Vault | In progress | `documentVault.ts` | `verify-document-vault`, ATS `document-vault-smoke` |
| Webhook signing | Partial | Core and Academy webhook implementations | `verify-gateway`, Academy API tests |
| AI safety controls | In progress | `modelGateway.ts`, `AI_SAFETY_POLICY.md` | `verify-model-gateway` |
| CI clean-clone install | In progress | `.github/workflows/ci.yml`, `scripts/ci` | `security:ci:test` |
| Secret scanning | In progress | `scan-secrets.mjs` | `security:secrets`, `security:secrets:test` |
| Dependency scanning | In progress | `npm-audit.mjs` | `security:audit` |
| Static analysis | In progress | CodeQL workflow, `static-analysis.mjs` | `security:static`, GitHub CodeQL run |
| Incident response | Manual required | `INCIDENT_RESPONSE_PLAN.md` | Tabletop evidence needed |
| Backup and recovery | Manual required | `BACKUP_AND_RECOVERY_PLAN.md` | Restore drill evidence needed |
| Vendor risk management | Manual required | `VENDOR_RISK_REGISTER.md` | Vendor review evidence needed |
| Change management | Partial | GitHub workflow | Branch protection and approval evidence needed |
| Security training | Manual required | Not in repo | Training records needed |
| HR and background checks | Manual required | Not in repo | HR records needed |
| Formal audit | Open | Not complete | SOC 2 Type I readiness and auditor engagement needed |

## Tests Proving Requested Controls

| Requested proof | Tests |
| --- | --- |
| Partner isolation | `florence-core npm run verify-tenant-isolation`, `florence-core npm run verify-gateway`, `florence-ats-connect npm run platform-api-smoke` |
| Application Gate | `florence-core npm run verify-application-gate`, `florence-ats-connect npm run application-gate-smoke` |
| Redaction | `florence-core npm run verify-security`, `florence-core npm run verify-logging-audit`, `florence-core npm run verify-logging-telemetry-audit`, `florence-ats-connect npm run pii-url-smoke` |
| Document security | `florence-core npm run verify-document-vault`, `florence-ats-connect npm run document-vault-smoke` |
| Webhook security | `florence-core npm run verify-gateway`, `florence-academy/api npm test` |
| AI safety | `florence-core npm run verify-model-gateway` |
| Secret protection | `npm run security:secrets`, `npm run security:secrets:test` |
| Required CI jobs | `npm run security:ci:test` |

## Manual Controls Still Required

- Assign policy owners and review cadence.
- Enforce production MFA and SSO for staff and administrators.
- Complete quarterly access reviews.
- Complete vendor risk reviews and contracts.
- Complete incident response tabletop.
- Complete backup restore drill.
- Complete external penetration test.
- Complete formal SOC 2 readiness assessment.
- Establish vulnerability remediation SLAs.
- Establish production monitoring, alerting, SIEM, and on-call workflow.
- Approve privacy notices, consent text, DSAR, deletion, and retention workflows.

## Current Residual Risks

- Pathway non-public candidate and workflow routes are not fully locked down.
- App-local partner routes need continued migration to Core gates.
- Webhook security is not uniform across all inbound and outbound surfaces.
- Legacy public or semi-public document flows need migration to Document Vault.
- Production KMS, secrets manager, backups, monitoring, and vendor contracts need operational evidence.
- Formal audit has not been completed.
