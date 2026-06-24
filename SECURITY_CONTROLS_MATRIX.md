# FlorenceRN Security Controls Matrix

Status: SOC 2 ready controls in progress. This is engineering evidence, not an audit attestation.

## Status Legend

- Implemented: control exists in code and has local verifier evidence.
- Partial: control exists for some surfaces but requires migration, production evidence, or broader coverage.
- Manual required: control is operational or contractual and cannot be proven by repository code alone.
- Open: control is not yet sufficiently implemented.

## Control Matrix

| Area | Control | Status | Repository evidence | Test evidence | Residual work |
| --- | --- | --- | --- | --- | --- |
| Governance | Security rules for future Codex and engineering work | Implemented | `AGENTS.md`, `SECURITY_DOD.md` | Documentation review | Add formal policy owner and review cadence. |
| Governance | Security threat model and attack surface inventory | Implemented | `SECURITY_THREAT_MODEL.md`, `SECURITY_ATTACK_SURFACE.md` | Documentation review | Re-run after each major product launch. |
| Governance | Findings and remediation plan | Implemented | `SECURITY_FINDINGS.md`, `SECURITY_REMEDIATION_PLAN.md` | Documentation review | Track findings in issue system and close only with verifier evidence. |
| Asset inventory | Sensitive data map | Implemented | `SECURITY_DATA_MAP.md`, `DATA_CLASSIFICATION_POLICY.md` | `verify-security` field classification checks | Expand with production datastore inventory. |
| Data classification | Central registry and fail-closed unknown fields | Implemented | `florence-core/src/classification.ts` | `verify-security` | Keep registry updated as schemas change. |
| Data minimization | Recipient-specific serializers | Implemented | `classification.ts`, `passportView.ts` | `verify-security` | Force all app-local partner views through Core. |
| Logging | Structured redaction for logs and errors | Implemented | `classification.ts`, `logger.ts`, `audit.ts` | `verify-logging-audit`, `verify-logging-telemetry-audit` | Connect to production log sinks with restricted fields disabled. |
| Audit | Sensitive reads and writes audit logged | Partial | `audit.ts`, `passportRead.ts`, `documentVault.ts`, `applicationGate.ts` | `verify-security`, `verify-document-vault`, `verify-application-gate` | Ensure every Pathway, Academy, ATS export and packet view uses the same audit standard. |
| Audit integrity | Tamper-evident audit chain | Implemented | `audit.ts`, `auditVerify.ts`, DB trigger | `verify-security`, `verify-audit` | Add multi-instance database locking evidence in production. |
| Access control | Core RBAC and scoped tokens | Implemented | `roles.ts`, `scopes.ts`, `tokens.ts`, `gateway` modules | `verify-gateway`, Academy API tests | Add production MFA and periodic access reviews. |
| Access control | Partner tenant isolation | Implemented in Core, partial fleet-wide | `tenantAccess.ts`, `tenant.ts`, `passportRead.ts` | `verify-tenant-isolation`, `verify-gateway` | Migrate remaining app-local partner surfaces. |
| Candidate privacy | Candidate self-access binding | Implemented in Core policy path | `passportRead.ts`, `policy.ts` | `verify-security`, Academy API candidate session tests | Pathway candidate routes still need full auth lockdown. |
| Consent | Purpose-specific, recipient-specific consent | Implemented in Core, partial fleet-wide | `consent.ts`, `passportRead.ts` | `verify-security`, `verify-tenant-isolation`, Academy API tests | Complete dual-write and Core-deny-wins migration for all app-local shares. |
| Employer sharing | Employer-safe packet projection | Implemented in Core | `passportView.ts`, `classification.ts`, `applicationGate.ts` | `verify-security`, `verify-application-gate`, `verify-gateway` | Verify ATS and Academy partner routes use Core projection. |
| Lender sharing | Lender-safe packet projection | Implemented in Core serializer, partial workflow coverage | `passportView.ts`, `tenantAccess.ts`, `gateway/modules/lender.ts` | `verify-security`, `verify-lender`, `verify-tenant-isolation` | Complete production lender consent and adverse-action controls. |
| University sharing | Aggregate or anonymized by default | Implemented in Core serializer | `classification.ts`, `passportView.ts` | `verify-security`, `verify-university-investor` | Formalize named student consent workflow. |
| Investor reporting | No named candidate data | Implemented in Core serializer | `classification.ts`, `passportView.ts` | `verify-security`, `verify-university-investor` | Add board packet review workflow. |
| Application Gate | Fail-closed application and packet release | Implemented in Core, partial fleet-wide | `applicationGate.ts`, gateway module | `verify-application-gate`, `verify-gateway`, ATS smoke | Require all ATS/VMS submission paths to call Core gate. |
| Document security | Encrypted restricted document vault | Implemented in Core | `documentVault.ts`, `crypto.ts` | `verify-document-vault` | Migrate legacy public document links. |
| Document access | Short-lived signed URL, revocation, tenant revalidation | Implemented in Core | `documentVault.ts` | `verify-document-vault`, ATS document vault smoke | Production storage and KMS evidence required. |
| Webhooks | Signed outbound webhooks | Partial | Core gateway webhooks, Academy webhook HMAC | `verify-gateway`, Academy API tests | Enforce HTTPS, replay windows, tenant-scoped schemas, and payload minimization everywhere. |
| Webhooks | Inbound webhook verification | Partial | Academy and ATS webhook code | Academy API tests | Replace weak shared-secret paths with timestamped HMAC and replay protection. |
| AI safety | Central Model Gateway | Implemented in Core, migration ongoing | `gateway/modelGateway.ts`, `gateway/modules/modelGateway.ts` | `verify-model-gateway`, `verify-gateway` | Production live-provider integration review. |
| AI safety | Prompt redaction and high-stakes blocking | Implemented in Core | `modelGateway.ts`, `classification.ts` | `verify-model-gateway` | Ensure all new AI features route through gateway. |
| Secrets | No committed secrets, env templates only | Implemented as CI gate | `.env.example`, `scripts/security/scan-secrets.mjs` | `security:secrets`, `security:secrets:test` | Production secrets manager evidence needed. |
| Vulnerability management | Dependency audit | Implemented as CI gate | `scripts/security/npm-audit.mjs` | `security:audit` | Add SLA tracking for advisories and container scanning. |
| Static analysis | CodeQL workflow and static gate | Implemented as CI gate | `.github/workflows/ci.yml`, `static-analysis.mjs` | `security:static`, GitHub CodeQL | Review CodeQL results in GitHub Security tab. |
| CI/CD | Clean-clone build contract | Implemented | root `package.json`, `scripts/ci` | `ci:install`, `typecheck`, `test`, `lint`, `build` | Add protected branch and required check evidence. |
| Backups | Backups and restore | Manual required | `BACKUP_AND_RECOVERY_PLAN.md` | Restore drill evidence needed | Implement scheduled cloud backups and documented restore drills. |
| Incident response | IR process | Manual required | `INCIDENT_RESPONSE_PLAN.md` | Tabletop evidence needed | Assign responders and notification matrix. |
| Vendor risk | Vendor inventory and data flows | Manual required | `VENDOR_RISK_REGISTER.md` | Contract review evidence needed | Complete DPAs, BAAs, security reviews, and renewal cadence. |

## Diligence Notes

- Core is the strongest security boundary today. Enterprise partner disclosures should be routed through Core wherever possible.
- Pathway lockdown and app-local partner route migration remain the most important prerequisites before broad external diligence.
- No document in this package should be represented as proof of formal compliance.
