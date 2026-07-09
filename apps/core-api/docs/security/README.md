# FlorenceRN Security Program — engineering controls

This directory documents the **code-enforced** security controls that live in
`florence-core` (the security boundary) and the fleet. It is the engineering
half of the program; the customer- and program-facing material (enterprise
security packet, 30/60/90 plan, AI data-use policy) lives in
`florence-work/docs/security/`.

> **Status legend:** ✅ implemented & verified · 🟡 partial / scaffolded · ⛔ user-owned (ops/cert, cannot be code-built)

## Operating frameworks
- **NIST CSF 2.0** — Govern, Identify, Protect, Detect, Respond, Recover. Used as the internal operating model.
- **SOC 2 Trust Services Criteria** — Security, Availability, Processing Integrity, Confidentiality, Privacy. The diligence target (Type I → Type II).
- **OWASP ASVS 5.0** — application-security verification standard for the apps.
- **OWASP LLM Top 10** — for the AI subsystems (see `ai-data-use.md`).

## The one-line directive
**The Nurse Passport is a permissions-controlled VIEW, not a record everyone can read.**
Identity, consent, classification, redaction, and audit are centralized in
FlorenceRN Core; no product reads another product's sensitive data directly —
every disclosure goes through Core's `passportView` redactor and is logged.

## Documents
| Doc | What | Maps to |
|---|---|---|
| [data-classification.md](data-classification.md) | The 5-class model + per-field map | NIST ID.AM-05; SOC2 CC6.1, C1.1 |
| [access-control-matrix.md](access-control-matrix.md) | role × audience × class × purpose | NIST PR.AA-05; SOC2 CC6.1–6.3; ASVS V4 |
| [consent-model.md](consent-model.md) | Canonical, versioned, revocable consent | SOC2 Privacy (P-series); NIST GV.PO |
| [encryption.md](encryption.md) | At-rest envelope, key handling, TLS | NIST PR.DS-01/02; SOC2 CC6.7; ASVS V6 |
| [audit-logging.md](audit-logging.md) | Tamper-evident chain + read logging | NIST DE.CM, PR.PS-04; SOC2 CC7.2/7.3; ASVS V7 |

## What's implemented (this build)
- ✅ **Data classification** — `src/classification.ts` (5 classes + per-Passport-field map, fail-closed default).
- ✅ **Purpose-based access (ABAC)** — `src/policy.ts` (`evaluatePolicy`, `ROLE_PURPOSES`, class ceilings) layered on the existing RBAC (`roles.ts`).
- ✅ **Per-audience redaction** — `src/passportView.ts` (self / internal_ops / instructor / employer / lender / university / investor), wired into `GET /v1/nurse/passport`.
- ✅ **Canonical consent service** — `consents` table + `src/consent.ts` + `/v1/consent/grant|revoke|read`; apps dual-write (ATS does today), disclosure is fail-closed on a live Core consent.
- ✅ **Tamper-evident audit** — hash-chained `audit_log` (`src/audit.ts` + `src/auditVerify.ts`), DB append-only trigger, **sensitive reads logged** (`passport.read`), bulk-read anomaly alert (`src/auditAlerts.ts`).
- ✅ **Verification** — `npm run verify-security` (32 checks) + `npm run verify-audit` + the existing `npm run verify-spine` (14 checks, regression-clean).

## What remains (tracked, not in this build)
- 🟡 Migrate Academy partner routes (`api/src/partners.ts`) to call Core `getView` per-audience (SDK seam shipped; per-candidate call performance to be addressed).
- 🟡 KMS-backed key wrapping + automated rotation (envelope + rotation status columns exist; KMS integration is ops).
- ⛔ SOC 2 audit, external pen test, MFA rollout, BAAs/DPAs, vendor-risk program, SIEM/EDR procurement, IR tabletop — see `../../../docs/security/hardening-30-60-90.md`.

> **Do not overclaim.** FlorenceRN does **not** currently hold SOC 2, HECVAT, or HITRUST. These docs describe the controls we have built and the roadmap to certification — they are not attestations.
