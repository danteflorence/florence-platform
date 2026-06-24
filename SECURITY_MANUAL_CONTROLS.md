# FlorenceRN Manual Security Controls

Status: SOC 2 ready controls in progress. This is not a formal SOC 2 audit report.

Last updated: 2026-06-24

## Purpose

These manual controls are required to operate FlorenceRN safely as a healthcare, education, immigration, financing, and workforce platform. Automated controls reduce risk, but enterprise diligence will still require people, approvals, records, and recurring evidence.

## Required Manual Controls

| Control | Cadence | Owner | Evidence |
| --- | --- | --- | --- |
| Staff access review | Quarterly and after role changes | Security/operations | User export, reviewer signoff, removals |
| Partner account and API-key review | Quarterly and before each enterprise launch | Security/partner owner | Tenant list, scopes, owner approval |
| Privileged role approval | Before grant and quarterly review | Security/engineering lead | Ticket, role, reason, expiry |
| Vendor security review | Before production data sharing and annually | Security/legal/procurement | Vendor questionnaire, DPA, data inventory |
| Subprocessor review | Before vendor enablement | Legal/security | Approved subprocessor terms |
| Incident tabletop | Annually and after material changes | Security/operations | Scenario, timeline, actions, remediation |
| Secret leak drill | At least annually | Security/platform | Rotation log, lessons learned |
| Backup restore test | Quarterly | Infrastructure/security | Restore log, timing, validation checklist |
| Security training | Onboarding and annually | People/security | Completion roster |
| Change approval for security-sensitive areas | Every security-sensitive release | Engineering/security | PR/release approval record |
| Exception management | As needed, with expiry | Security/executive owner | Risk acceptance, compensating controls |
| AI high-risk human review | Every high-risk AI output | Product/ops | Reviewer, decision, final human action |
| Candidate consent text review | On every consent version change | Legal/product/security | Approved text, hash/version |
| Data retention and legal hold review | At least annually | Legal/security | Retention schedule, legal-hold procedure |
| Production alert review | Weekly during launch, then monthly | Security/operations | Alert queue review, escalations |

## Manual Approval Gates

- New employer, lender, university, ATS/VMS, or vendor integration.
- New external data share or export.
- New restricted document type.
- New Model Gateway task that touches restricted classes.
- Any workflow that affects visa, credit, employment, licensure, eligibility, application submission, or packet release.
- Any security exception involving auth, tenant scope, consent, audit, encryption, webhook, or secrets.

## Evidence Storage Rules

- Store evidence in a controlled folder or GRC system with restricted access.
- Do not include real PII, passport numbers, SEVIS IDs, DS-160 data, credit data, document URLs, or secrets in evidence screenshots.
- Redact tenant names if evidence will be shared outside the relevant diligence room.
