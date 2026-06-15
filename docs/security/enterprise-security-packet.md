# FlorenceRN Enterprise Security Packet

> For AMN, Kaiser Permanente, health-system, university, and lender diligence.
> **This is a controls-and-roadmap document, not a certification.** FlorenceRN does
> not currently hold SOC 2, HECVAT, or HITRUST; the path to SOC 2 is in section 9.

## 1. Summary

FlorenceRN is built as a **regulated-data platform**: one identity system, one
consent system, one audit trail, one data-classification model, one production
ledger, and least-privilege access across every workflow. The architectural moat —
longitudinal data across education, NCLEX readiness, financing, visa, placement,
retention, and repayment — is also the thing we protect most. Security is treated
as a product capability, organized around **NIST CSF 2.0** (Govern, Identify,
Protect, Detect, Respond, Recover) and the **SOC 2 Trust Services Criteria**.

## 2. The core security pattern

**The Nurse Passport is a permissions-controlled VIEW, not a record anyone can
read.** Internally the Passport aggregates sensitive data; externally every
recipient receives a derived, minimum-necessary projection:

- **Kaiser / AMN / employers** — licensed-RN packet (readiness band, license,
  experience, expected start window, human-QA status, candidate-approved docs).
  **Never** nationality, visa, financing, or another employer's pipeline.
- **Lenders** — consented financing packet + readiness summary + offer-backed status.
- **Universities** — aggregate / k-anonymized cohort analytics by default; named
  student data only under a signed agreement + student consent.
- **Investors / board** — aggregated metrics, no raw PII.

No product reads another product's sensitive data directly — every disclosure
flows through FlorenceRN Core's `passportView` redactor and is logged.

## 3. Data classification
Five classes (public → internal-business → candidate-personal → restricted-
pathway-financial → regulated-partner), applied per field; fail-closed default.
See `florence-core/docs/security/data-classification.md`.

## 4. Identity & access
- One RS256 SSO identity (Core) verified everywhere via JWKS; M2M via
  client_credentials. Unified role hierarchy.
- **RBAC + ABAC**: coarse scope gate + purpose-based fine gate (role × org ×
  relationship × consent × class × purpose × time). Partners are pinned to their
  audience and cannot escalate. See `access-control-matrix.md`.
- ⛔ **MFA** for all staff/admin/QA + phishing-resistant MFA for privileged access,
  SSO via Workspace, monthly access reviews, automatic offboarding — **roadmap (ops)**.

## 5. Encryption
AES-256-GCM field-level envelope encryption for restricted fields + signing keys;
scrypt for secrets; RS256/JWKS for tokens; TLS in transit (edge). KMS + automated
rotation on the roadmap. See `encryption.md`.

## 6. Consent
Canonical, versioned, granular, revocable, audited consent in Core; apps dual-write
fail-closed (disclosure requires a live Core consent). See `consent-model.md`.

## 7. Audit & monitoring
Tamper-evident hash-chained audit log (DB append-only), **sensitive reads logged**,
bulk-read anomaly alerts, chain-verification CLI. See `audit-logging.md`.
⛔ SIEM / centralized monitoring / EDR — roadmap (ops).

## 8. Tenant isolation & data minimization
- Each partner is a tenant; employer reads are org-scoped and cannot infer another
  employer's pipeline.
- ATS Connect / Demand Radar: **no PII in URLs/UTMs** (opaque `frn_click_id`),
  IP/UA hashed, candidate interest ≠ application, no unauthorized ATS submission,
  employer packets carry no financing/underwriting data.

## 9. SOC 2 roadmap (Type I → Type II)
NIST CSF 2.0 internal operating model now → SOC 2 Type I (point-in-time) → Type II
(operating-effectiveness over a window). Engineering controls in sections 2–8 are
implemented; remaining items (formal policies sign-off, MFA rollout, vendor-risk
program, pen test, IR tabletop) are in `hardening-30-60-90.md`. ISO/IEC 27001 is
the longer-term ISMS target for global university/lender relationships.

## 10. AI data use
AI is a controlled subsystem: AI drafts, humans QA, candidates attest; no raw
Passport to a model; provider no-train contracts required before sensitive data.
See `ai-data-use.md`.

## 11. Regulatory posture (assume, verify with counsel)
- **GDPR-style** controls for global candidates (Art. 32 measures).
- **FERPA-sensitive** handling for education records + university reporting.
- **GLBA / FTC Safeguards-style** controls for financing data routed to lenders.
- **HIPAA-grade** controls if/when any ePHI or employee-health data is ingested
  (do not ingest occupational-health/medical-clearance data without a BAA analysis,
  data-minimization design, and segregation).
- **PCI DSS** outsourced to the payment processor.
- **State privacy laws** (CA): access/deletion/purpose-limitation workflow (roadmap).

## 12. What we provide on request
Data-flow + architecture diagrams, the policies in this directory, the pen-test
executive summary (when available), the SOC 2 roadmap, DPA/BAA templates (counsel),
the consent model, and the audit-logging summary.

> Items marked ⛔ / roadmap are owned by FlorenceRN operations + counsel and are
> tracked in the 30/60/90 hardening plan. They are not represented as complete.
