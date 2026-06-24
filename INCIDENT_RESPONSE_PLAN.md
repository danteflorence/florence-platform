# FlorenceRN Incident Response Plan

Status: SOC 2 ready controls in progress. This plan requires operational owner assignment and tabletop validation before it can be treated as production-ready.

## Purpose

This plan defines how FlorenceRN identifies, contains, investigates, communicates, remediates, and learns from security incidents involving healthcare, education, immigration, financing, workforce, AI, documents, and partner data.

## Incident Severity

| Severity | Definition | Examples |
| --- | --- | --- |
| Critical | Restricted data exposure, tenant isolation bypass, auth bypass, unauthorized document access, secret leak, Application Gate bypass, or high-stakes unauthorized action. | Passport or SEVIS exposure, lender data leak, employer packet sent to wrong tenant, public document token leak, production secret in repo. |
| High | Sensitive metadata exposure, webhook spoofing, partner data overshare, AI prompt leakage, compromised staff account, repeated suspicious access. | Webhook replay accepted, model prompt contains restricted identifiers, employer sees out-of-tenant candidate metadata. |
| Medium | Defense-in-depth failure or unsafe configuration with limited exposure. | Missing route-specific rate limit, incomplete audit on lower-risk read, weak staging secret. |
| Low | Documentation, monitoring, or hardening issue with limited direct risk. | Missing evidence owner, outdated vendor review, stale runbook. |

## Response Roles

| Role | Responsibility |
| --- | --- |
| Incident commander | Owns timeline, decisions, and coordination. |
| Security lead | Triage, containment plan, evidence preservation, root cause. |
| Engineering lead | Fix development, deployment, rollback, and validation. |
| Legal/compliance | Notification obligations and regulator or partner communications. |
| Customer/partner lead | Enterprise partner and affected customer coordination. |
| Communications lead | Approved external and internal messaging. |

Named people and escalation contacts must be maintained in the operational incident runbook outside the public repo.

## First Hour Checklist

1. Assign incident commander.
2. Open private incident channel and incident record.
3. Classify severity.
4. Preserve evidence, logs, audit rows, request IDs, deployment version, and timestamps.
5. Stop active exposure if safe to do so.
6. Rotate exposed secrets or disable exposed tokens.
7. Disable affected partner integration, document link, webhook, AI provider path, or submission workflow if needed.
8. Identify affected data classes and recipients.
9. Determine whether legal/compliance notification analysis is required.
10. Set next update time.

## Containment Playbooks

### Secret Exposure

- Revoke or rotate secret immediately.
- Search repository, logs, CI output, prompts, support systems, and docs for copies.
- Invalidate tokens and sessions derived from the secret.
- Confirm replacement secret is stored only in approved secret manager.
- Add scanner regression test when practical.

### Restricted Data Exposure

- Disable the exposed route, export, document link, webhook, or partner account.
- Identify subject records, recipients, fields, data classes, and time window.
- Preserve audit rows and access logs.
- Notify legal/compliance for obligation analysis.
- Patch root cause and add negative tests.

### Tenant Isolation Bypass

- Disable affected partner route or tenant.
- Identify cross-tenant accesses.
- Revoke affected partner tokens.
- Add tenant-scoped regression tests.
- Review all related route handlers.

### Document Access Incident

- Revoke signed URLs and document access grants.
- Rotate document signing keys if needed.
- Validate document download audit rows.
- Disable legacy public document links.
- Review referrer, logs, and partner forwarding risk.

### AI Safety Incident

- Disable affected AI task or provider path.
- Preserve safe hashes, task metadata, prompt version, output schema, and reviewer status.
- Do not store raw restricted prompt text in the incident record.
- Review model provider data-use obligations.
- Add prompt-injection or high-stakes blocking test.

## Investigation Requirements

The incident record must include:

- Summary.
- Severity.
- Detection source.
- Time detected.
- Time contained.
- Systems affected.
- Data classes affected.
- Number of subjects affected, if known.
- External recipients, if any.
- Root cause.
- Corrective actions.
- Preventive tests or controls.
- Residual risk.
- Legal/compliance decision record.

## Communication Rules

- Do not include PII, passport numbers, SEVIS IDs, DS-160 data, credit data, loan data, employer packet contents, document contents, secrets, or raw prompts in incident tickets or chat.
- Use safe event IDs, request IDs, document IDs, tenant IDs, and time windows.
- Legal/compliance approves external notification content.
- Partner communications must be purpose-limited and factual.

## Post-Incident Review

Within 5 business days of containment:

- Complete root cause analysis.
- Add or update tests.
- Update this evidence package if controls changed.
- Review alerting gaps.
- Review vendor and partner obligations.
- Assign owners and deadlines for corrective actions.

## Required Drills

- Annual tabletop for restricted data exposure.
- Annual tabletop for tenant isolation bypass.
- Annual tabletop for secret exposure.
- Annual tabletop for AI prompt leakage or unsafe output.
