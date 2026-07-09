# FlorenceRN Security Test Evidence

Status: SOC 2 ready controls in progress. This file records repository-level and package-level security verification commands. It is not a formal audit report.

Last updated: 2026-06-25

## Required Evidence Areas

| Security claim | Primary commands |
| --- | --- |
| Partner isolation | `npm --prefix apps/core-api run verify-tenant-binding`; `npm --prefix apps/core-api run verify-tenant-isolation`; `npm --prefix apps/employer-connect-api run platform-api-smoke` |
| Application Gate fail-closed behavior | `npm --prefix apps/core-api run verify-application-gate`; `npm --prefix apps/employer-connect-api run application-gate-smoke`; `npm --prefix apps/employer-connect-api run platform-api-smoke` |
| Redaction and recipient-safe views | `npm --prefix apps/core-api run verify-security`; `npm --prefix apps/core-api run verify-logging-audit`; `npm --prefix apps/core-api run verify-logging-telemetry-audit`; `npm --prefix apps/core-api run verify-university-investor` |
| Document security | `npm --prefix apps/core-api run verify-document-vault`; `npm --prefix apps/employer-connect-api run document-vault-smoke`; `npm --prefix apps/employer-connect-api run platform-api-smoke` |
| Webhook security | `npm --prefix apps/core-api run verify-gateway`; `npm --prefix apps/employer-connect-api run webhook-signature-smoke`; `npm run security:static`; `npm run security:ci:test` |
| AI safety | `npm --prefix apps/core-api run verify-model-gateway`; `npm --prefix apps/academy-web/api test` |
| Secret protection | `npm run security:secrets`; `npm run security:secrets:test` |
| Dependency vulnerability scanning | `npm run security:audit` |
| Audit redaction | `npm --prefix apps/employer-connect-api run audit-redaction-smoke`; `npm --prefix apps/pathway-api run audit-redaction-smoke` |
| Unexpected-error redaction | `npm --prefix apps/employer-connect-api run no-pii-error-smoke`; `npm --prefix apps/pathway-api run no-pii-error-smoke` |
| Clean build and static correctness | `npm run typecheck`; `npm test`; `npm run lint`; `npm run build`; `npm run security:static` |

## Last Local Verification Results

These results were produced locally on 2026-06-25. This shell did not expose `node` or `npm` on `PATH`, so Codex used the bundled Node runtime directly. Loopback-based smoke tests were rerun with local-listener permission after the sandbox blocked them with `listen EPERM 127.0.0.1`.

| Command | Result | Notes |
| --- | --- | --- |
| Core, Employer Connect, and Pathway TypeScript checks | Passed | `tsc --noEmit` passed in `apps/core-api`, `apps/employer-connect-api`, and `apps/pathway-api` |
| Repository secret scan | Passed | Standard tracked-file scan passed; explicit `--all-files` scan passed with 12,345 files checked |
| Repository security gates | Passed | Secret scanner regression, static analysis, and CI workflow security checks passed |
| Core security spine | Passed | 65 checks for classification, redaction, consent, audit chain, and alerting |
| Core tenant isolation | Passed | 30 checks for tenant-scoped access, exact org consent, gateway denials, and audit |
| Core tenant binding | Passed | 25 loopback checks for org-bound partner keys, partner reads, revocation, and service-token proxy behavior |
| Core Document Vault | Passed | 31 checks for encryption, signed URLs, revocation, tenant revalidation, and audit |
| Core Application Gate | Passed | 24 checks for fail-closed visa/work authorization, license, consent, QA, channel, duplicate-lock, and audit behavior |
| Core Model Gateway | Passed | 34 checks for prompt injection handling, high-stakes blocking, data-class ceilings, schema validation, and AI audit |
| Core Gateway smoke | Passed | 45 loopback checks for scopes, redacted partner reads, webhook signatures, partner keys, consent revoke, and rate limits |
| Core Lender smoke | Passed | 21 loopback checks for lender consent, fair-lending minimization, adverse action, disputes, feeds, and k-anonymized portfolio reporting |
| Core logging/audit checks | Passed | `verify-logging-audit`, `verify-logging-telemetry-audit`, and `verify-university-investor` passed |
| Employer Connect security smokes | Passed | Audit redaction, no-PII errors, webhook signatures, Document Vault, Application Gate, platform API, and PII URL checks passed |
| Pathway security smokes | Passed | Audit redaction, no-PII errors, v1 auth/scoping, and consular payment minimization checks passed |

## CI Evidence Required

To close local proof gaps, capture CI output for:

- Full `npm run build` in a clean runner with dependencies installed from lockfiles.
- `npm run security:audit` in a runner with npm registry access.
- GitHub Actions CodeQL/static-analysis results and branch-protection status.
