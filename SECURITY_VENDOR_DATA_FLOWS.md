# FlorenceRN Third-Party Data Flow Register

Status: SOC 2 ready controls in progress. Vendor review and DPA status must be verified before production restricted-data sharing.

Last updated: 2026-06-24

## Purpose

This register summarizes third-party vendors and partners and the data each may receive. It is a diligence inventory, not approval to send production data.

## Vendor And Partner Data Flows

| Vendor or partner | Purpose | Data received | Data classes | Required controls |
| --- | --- | --- | --- | --- |
| Employers, including Kaiser, HCA, CommonSpirit, Tenet, and other healthcare employers | Hiring review, interviews, offers, starts | Employer-safe packet, resume, credential/readiness summary, license/NCLEX summary, expected start window, ATS status | CANDIDATE_PERSONAL, RESTRICTED_EMPLOYER_PACKET, minimized RESTRICTED_EDUCATION | Employer tenant scope, purpose consent, packet QA, Application Gate, audit |
| AMN and VMS partners | Channel submissions, VMS packet handoff, status sync | Employer-safe packet, requisition/submission IDs, status milestones | RESTRICTED_EMPLOYER_PACKET, PARTNER_RESTRICTED | Tenant/channel authorization, consent, Application Gate, audit |
| ATS providers and employer ATS systems | Candidate submission and status sync | Employer-ready application packet, attachments or secure packet link, stage/status events | RESTRICTED_EMPLOYER_PACKET, PARTNER_RESTRICTED | Tenant scope, connector authorization, webhook validation, audit |
| Lenders | Financing review and servicing | Consented lender-safe packet, financing fields, education/license facts where permitted | RESTRICTED_FINANCING, CANDIDATE_PERSONAL, RESTRICTED_EDUCATION, limited RESTRICTED_IMMIGRATION | Lender consent, lender tenant scope, human review, audit |
| LendKey | Lender handoff | Consented lender-safe handoff data and lender application metadata | RESTRICTED_FINANCING, PARTNER_RESTRICTED | Underwriting consent, minimized export, audit |
| Universities and schools | Enrollment, student support, outcomes | Aggregate/anonymized views by default; named data only with explicit authorization | INTERNAL by default; RESTRICTED_EDUCATION if named | Aggregate default, consent/authorization, tenant scope |
| SEVISmate | I-901 SEVIS fee workflow | Minimal I-901 handoff fields, receipt/payment metadata where needed | RESTRICTED_IMMIGRATION, CANDIDATE_PERSONAL | Candidate attestation, purpose-specific handoff, no employer/financing data |
| Model provider behind Core Model Gateway | Assistive drafting, classification, summarization, tutoring | Redacted/minimized prompts and model metadata by task | PUBLIC through approved restricted classes by task | Model Gateway policy, provider review, no final high-stakes decisions |
| Agora or AV provider | Live classes/tutoring | Session identifiers and AV metadata | CANDIDATE_PERSONAL, RESTRICTED_EDUCATION metadata | Session auth, minimization, vendor review |
| ElevenLabs or audio provider | Audio generation and voice/tutor features | Script text or audio job metadata | PUBLIC or minimized education content | No restricted PII in prompts/scripts, vendor review |
| Email/SMS providers | Notifications and reminders | Contact details and minimized notification text | CANDIDATE_PERSONAL, INTERNAL | Consent/legitimate purpose, minimization, webhook audit |
| HubSpot or CRM | Outreach and pipeline | Lead/contact metadata | CANDIDATE_PERSONAL, INTERNAL | Consent/purpose limit, vendor review |
| Lob or mail vendor | Physical mail pieces if enabled | Mailing address and mailpiece metadata | RESTRICTED_IDENTITY, CANDIDATE_PERSONAL | Consent/purpose, DPA, audit |
| GitHub and GitHub Actions | Source control and CI | Code, CI logs, scan outputs | INTERNAL; SECRET risk if mishandled | Secret scanning, branch protections, no production data |
| Cloud provider | Runtime, storage, KMS, secrets, backups | Encrypted production data and managed key material | All classes under cloud controls | IAM, KMS, secrets manager, audit logs, backup controls |

## Data Sharing Rules

- This register does not authorize sharing. Each data flow still requires live policy, consent, tenant scope, and audit controls.
- Vendor data flows must be reviewed before production enablement and after material scope changes.
- Restricted document binaries must flow through Document Vault controls, not email attachments or public URLs.
