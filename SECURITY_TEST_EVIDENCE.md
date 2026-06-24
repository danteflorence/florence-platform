# FlorenceRN Security Test Evidence

Status: SOC 2 ready controls in progress. This file records repository-level and package-level security verification commands. It is not a formal audit report.

Last updated: 2026-06-24

## Required Evidence Areas

| Security claim | Primary commands |
| --- | --- |
| Partner isolation | `npm --prefix florence-core run verify-tenant-binding`; `npm --prefix florence-core run verify-tenant-isolation`; `npm --prefix florence-ats-connect run platform-api-smoke` |
| Application Gate fail-closed behavior | `npm --prefix florence-core run verify-application-gate`; `npm --prefix florence-ats-connect run application-gate-smoke`; `npm --prefix florence-ats-connect run platform-api-smoke` |
| Redaction and recipient-safe views | `npm --prefix florence-core run verify-security`; `npm --prefix florence-core run verify-logging-audit`; `npm --prefix florence-core run verify-logging-telemetry-audit`; `npm --prefix florence-core run verify-university-investor` |
| Document security | `npm --prefix florence-core run verify-document-vault`; `npm --prefix florence-ats-connect run document-vault-smoke`; `npm --prefix florence-ats-connect run platform-api-smoke` |
| Webhook security | `npm --prefix florence-core run verify-gateway`; `npm run security:static`; `npm run security:ci:test` |
| AI safety | `npm --prefix florence-core run verify-model-gateway`; `npm --prefix florence-academy/api test` |
| Secret protection | `npm run security:secrets`; `npm run security:secrets:test` |
| Dependency vulnerability scanning | `npm run security:audit` |
| Clean build and static correctness | `npm run typecheck`; `npm test`; `npm run lint`; `npm run build`; `npm run security:static` |

## Last Local Verification Results

These results were produced in the local Codex sandbox on 2026-06-24. Some checks are environment-blocked because this sandbox cannot open loopback listeners and cannot reach the public npm registry.

| Command | Result | Notes |
| --- | --- | --- |
| `npm run typecheck` | Passed | Core, ATS Connect, Pathway, Academy API, and Academy web typechecks passed |
| `npm run lint` | Passed | Workspace lint passed |
| `npm run security:secrets` | Passed | Secret scan passed, 638 files checked |
| `npm run security:static` | Passed | Static analysis gate passed; CodeQL configured in GitHub Actions |
| `npm --prefix florence-core run verify-logging-telemetry-audit` | Passed | 17 checks passed |
| `npm --prefix florence-core run verify-model-gateway` | Passed | 34 checks passed |
| `npm --prefix florence-core run verify-document-vault` | Passed as part of `npm test` before sandbox stop | 31 checks passed |
| `npm --prefix florence-core run verify-application-gate` | Passed as part of `npm test` before sandbox stop | 24 checks passed |
| `npm --prefix florence-ats-connect run application-gate-smoke` | Passed | 41 checks passed |
| `npm --prefix florence-pathway-agent run consular-payments-smoke` | Blocked locally | Failed at `listen EPERM 127.0.0.1` before HTTP server startup |
| `npm --prefix florence-ats-connect run platform-api-smoke` | Blocked locally | Static OpenAPI checks passed, then failed at `listen EPERM 127.0.0.1` |
| `npm test` | Blocked locally | Passed multiple Core suites, then stopped at `verify-gateway` due `listen EPERM 127.0.0.1` |
| `npm run build` | Blocked locally | Core build passed; ATS Connect Vite/Rolldown native binding failed due local macOS code-signature/native binding issue |
| `npm run security:audit` | Blocked locally | npm registry request failed with `ENOTFOUND registry.npmjs.org` |

## CI Evidence Required

To close local proof gaps, capture CI output for:

- Full `npm test` in an environment that permits loopback listeners.
- Full `npm run build` in a clean runner with dependencies installed from lockfiles.
- `npm run security:audit` in a runner with npm registry access.
- GitHub Actions CodeQL/static-analysis results and branch-protection status.
