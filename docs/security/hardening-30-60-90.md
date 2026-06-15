# 30 / 60 / 90-Day Hardening Plan

Organized on NIST CSF 2.0 (Govern, Identify, Protect, Detect, Respond, Recover).
Legend: ✅ done in the security-spine build · 🟡 partially done / seam ready · ⛔ user/ops/legal-owned.

## Already delivered (the security-spine build)
- ✅ Data-classification model + per-field map (`florence-core/src/classification.ts`).
- ✅ Purpose-based access control (RBAC + ABAC) (`src/policy.ts` + `roles.ts`).
- ✅ Partner-safe redacted Passport views (`src/passportView.ts`) wired into the read route.
- ✅ Canonical consent service + fail-closed dual-write (ATS) (`src/consent.ts`, `consents` table).
- ✅ Tamper-evident, append-only audit log + sensitive-read logging + bulk-read alerts.
- ✅ "No PII in UTMs", IP/UA hashing, interest≠application (Demand Radar) — pre-existing, retained.
- ✅ AI-drafts/humans-QA/candidate-attests enforced in Pathway.
- ✅ Verification: `verify-security` (32), `verify-audit`, `verify-spine` (14, regression-clean).

## Days 0–30 — stop obvious risk
- ⛔ Appoint a security owner.
- 🟡 Adopt the data-classification policy org-wide; add a CI guard that fails a PR
  adding a Passport field without a `PASSPORT_FIELD_CLASS` entry.
- ⛔ Company-wide **MFA + SSO** (Workspace) for all staff/contractors/admins.
- ⛔ Move all production secrets into a secrets manager; rotate any in env files.
- ⛔ Disable production data in staging/dev (seed test data only).
- 🟡 Create the vendor/subprocessor inventory (template in section below).
- ✅ Access matrix authored (`access-control-matrix.md`).
- ✅ Consent-event schema live.
- 🟡 Lock document storage behind KMS + signed URLs (envelope seam ready; KMS = ops).
- ✅ Audit logging for sensitive reads/writes (tamper-evident).
- ⛔ Add secret-scanning + dependency-scanning to CI.
- 🟡 Add the "no PII in UTMs" lint/check to the link builder (behavior already enforced).
- ⛔ Draft the incident-response plan.

## Days 31–60 — build the control layer
- ✅ Core identity + consent service (done).
- ✅ RBAC/ABAC across the passport surface; 🟡 migrate Academy partner routes to Core `getView`.
- ✅ Employer-safe + lender-safe Passport views; 🟡 wire university named-student + investor surfaces.
- 🟡 Audit-log dashboard (data is there; UI pending).
- ⛔ Admin access reviews (monthly while small).
- 🟡 Production DB encryption (field-level done) + backup verification (ops).
- ⛔ DLP rules for documents/exports; ⛔ SIEM / centralized monitoring.
- 🟡 Retention policies (consent + event log substrate exists; policy doc pending).
- ⛔ Start SOC 2 readiness (compliance platform or consultant).
- ✅ Trust-center / security packet drafted (`enterprise-security-packet.md`).

## Days 61–90 — enterprise readiness
- ⛔ External penetration test (before AMN/Kaiser production launch).
- 🟡 Threat-model each app (Academy, Pathway, Financing, ATS Connect, Demand Radar, Ledger).
- ⛔ BAA/DPA templates with counsel.
- ✅ AMN/Kaiser/lender security packet (refine with diligence answers).
- ⛔ IR tabletop; ⛔ backup-restore test.
- ⛔ Vendor risk-review workflow; ⛔ privileged-access management.
- 🟡 Field-level encryption for all restricted fields (rollout using the envelope seam).
- ✅ Tenant-isolation tests (employer cannot see other-employer placement — in `verify-security`).
- ⛔ SOC 2 Type I audit readiness; ⛔ security training for all staff.

## Vendor / subprocessor inventory (template)
| Vendor | Service | Data accessed | Class | Region | SOC2/ISO | DPA/BAA | Retention | Breach terms | Owner | Review date |
|---|---|---|---|---|---|---|---|---|---|---|
| (cloud) | hosting | all | regulated | | | | | | | |
| (LLM) | AI | candidate (redacted) | candidate_personal | | | | | | | |
| (email/SMS) | comms | contact | candidate_personal | | | | | | | |
| (lenders) | financing | financing | restricted | | | | | | | |

## Incident-response runbooks to author (⛔)
Lost laptop · compromised admin account · candidate-document exposure · LLM data
leak · ATS misrouting · wrong employer packet shared · lender packet shared without
consent · university dashboard re-identification · insider bulk export
(the bulk-read alert is the first detector for the last one — ✅).
