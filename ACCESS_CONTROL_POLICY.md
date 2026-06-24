# FlorenceRN Access Control Policy

Status: SOC 2 ready controls in progress. This policy is not a formal audit attestation.

## Purpose

FlorenceRN access control is based on least privilege, tenant isolation, candidate binding, purpose, consent, workflow state, and data class. UI checks are never sufficient by themselves. Server-side enforcement is required.

## Authentication Rules

- Every non-public endpoint must require authentication.
- Candidate endpoints must use candidate-bound tokens or sessions.
- Staff endpoints must require staff role and appropriate scope.
- Partner endpoints must require partner tenant identity and partner-safe scope.
- Service-to-service access must use scoped machine credentials.
- Missing authentication must fail closed.

## Authorization Layers

FlorenceRN uses several layers:

1. RBAC: role and scope gate.
2. ABAC: role, tenant, relationship, data class, purpose, consent, and time.
3. Tenant policy: partner organization must match program, packet, document, or workflow tenant.
4. Recipient serializer: response fields are minimized for recipient.
5. Application Gate: high-risk employer release, packet, application, ATS, and VMS actions require workflow gates.
6. Audit: decisions and sensitive access are logged.

## Roles

| Role | Intent |
| --- | --- |
| super_admin | Break-glass and platform administration. Requires explicit audit and periodic review. |
| ops | Internal operations. May access operational views when needed for workflow support. |
| qa | Quality review. Should have narrower data class ceiling than operations. |
| instructor | Education support. No employer, financing, passport, or immigration internals unless separately approved. |
| candidate | Own records only. Cannot read another candidate by ID, email, reference, or inferred identifier. |
| employer | Own tenant, consented employer-safe packets only. |
| lender | Own tenant, consented lender-safe packets only. |
| university | Aggregate or anonymized by default. Named student views require consent and authorization. |
| service | Scoped machine access. Must be tenant-bound when representing a partner. |

## Partner Tenant Rules

- Every employer, lender, university, school, ATS/VMS partner, AMN channel, and integration must be tenant-scoped.
- Missing tenant context fails closed.
- Category-wide consent cannot unlock named external partner disclosure.
- Partner keys must be org-bound and partner-safe.
- Partners cannot request internal views or model execution scopes.
- Partner access denials must be audit logged.

## Candidate Binding Rules

- Candidate self-access is allowed only when the token-bound candidate identity matches the requested subject.
- Candidate-bound session tokens must not read or write another candidate's assessments, progress, documents, pathway workflows, or Passport.
- Cross-candidate attempts return safe errors and write redacted audit events.

## Internal Access Rules

- Internal access must have a legitimate business purpose.
- Internal roles must be allowlisted for sensitive resources.
- Super-admin bypasses must be exceptional, reason-coded, and audit logged.
- Internal users must not bypass partner-safe serializers when acting on behalf of employers, lenders, universities, or AMN/VMS partners.

## Application Gate

Employer release, employer packet sharing, formal application submission, ATS submission, and VMS submission must fail closed unless these checks pass:

- Candidate consent.
- Visa or work authorization where required.
- License and credential status.
- Packet QA approval.
- Authorized workflow and channel.
- Active job or requisition.
- Employer or partner tenant context.
- Data-minimized packet generation.
- Duplicate submission lock.

Caller-supplied assertions cannot bypass trusted Core state.

## Public Routes

Public routes must be explicitly documented, rate limited, and data minimized. Public routes may include health checks, public metadata, public cohorts, public job interest entry points, and documentation endpoints. Public routes must not expose restricted data.

## Known Gap

Pathway candidate and workflow routes still include an interim open candidate/copilot model. They must be locked down before production exposure of restricted candidate or immigration data.

## Verification

Current repository evidence:

- `florence-core npm run verify-gateway`
- `florence-core npm run verify-tenant-isolation`
- `florence-core npm run verify-application-gate`
- `florence-core npm run verify-security`
- `florence-academy/api npm test`
- `florence-ats-connect npm run platform-api-smoke`
- `florence-ats-connect npm run application-gate-smoke`
