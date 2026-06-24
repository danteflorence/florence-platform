# FlorenceRN Vendor Risk Register

Status: SOC 2 ready controls in progress. This register is a diligence inventory based on repository references and planned partner flows. It is not proof that contracts, DPAs, BAAs, or security reviews are complete.

## Review Cadence

- Critical and high-risk vendors: before production use and at least annually.
- Medium-risk vendors: before production use and every 18 months.
- Low-risk vendors: before production use and every 24 months.
- Review immediately after material incident, ownership change, new data class, or new integration scope.

## Vendors, Partners, And Processors

| Vendor or partner | Function | Data received | Data classes | Risk | Required controls before production restricted data |
| --- | --- | --- | --- | --- | --- |
| Hosting platform or cloud provider | Runs apps and APIs | Application traffic, logs, encrypted data, metadata | All classes possible | Critical | DPA/BAA if applicable, encryption, IAM, logging, backup, region, incident terms. |
| Managed Postgres provider | Databases | Candidate, consent, audit, learning, pathway, packet, ledger data | All classes possible | Critical | Encryption, backups, access logs, least privilege, DPA/BAA if applicable. |
| Object storage provider | Restricted documents | Encrypted document blobs and metadata | Restricted and secret metadata | Critical | KMS, signed URL controls, retention, access logs, DPA/BAA if applicable. |
| KMS or secrets manager | Key and secret management | Key material references and secrets | SECRET | Critical | HSM/KMS controls, access review, rotation, audit, break-glass. |
| GitHub | Source control and CI | Code, CI logs, dependency metadata, security alerts | INTERNAL, possible SECRET if misused | High | Branch protection, secret scanning, CodeQL, least privilege, no production data. |
| npm registry | Dependency install and audit | Package metadata | PUBLIC/INTERNAL | Medium | Lockfiles, audit, provenance review for critical packages. |
| Terraform providers | Infrastructure provisioning | Infra config and state references | INTERNAL, possible SECRET if misused | High | Remote state encryption, no secrets in state, access control. |
| Stripe or payment processor | Candidate payments | Payment intent metadata, amount, payment status, tokenized payment provider data | CANDIDATE_PERSONAL, payment metadata | High | PCI processor contract, no card storage, webhook signature, minimization. |
| Lob | Print and mail outreach | Recipient mailing information and campaign metadata | CANDIDATE_PERSONAL, address | High | DPA, address minimization, webhook signature, retention limits. |
| HubSpot or CRM | Outreach and partner operations | Lead/contact data, status, campaign metadata | CANDIDATE_PERSONAL, INTERNAL | High | DPA, field minimization, consent, suppression, deletion workflow. |
| ElevenLabs | TTS and voice rendering | Approved audio text, pronunciation dictionary, voice metadata | PUBLIC or approved CANDIDATE_PERSONAL only | High | DPA/data-use terms, no unrestricted tutor prompts, route tutor text through Model Gateway first. |
| Agora | Live classroom audio/video | Live session audio/video transport metadata | CANDIDATE_PERSONAL, learning session metadata | High | DPA, recording controls, access control, retention, no recording by default unless approved. |
| LLM provider | AI model execution | Redacted/minimized prompts and outputs | Depends on Model Gateway task ceiling | Critical | Provider DPA/data-use terms, retention controls, no training, audit, Model Gateway only. |
| LendKey or lender processor | Financing handoff | Consented lender-safe packet and underwriting handoff data | RESTRICTED_FINANCING, PARTNER_RESTRICTED | Critical | Purpose-specific consent, tenant scoping, DPA, lender agreement, adverse-action controls. |
| Lenders | Financing review | Consented lender-safe packet | RESTRICTED_FINANCING | Critical | Named recipient consent, tenant scoping, audit, packet minimization, contract. |
| SEVISmate | I-901 payment support | Minimum I-901 handoff data, SEVIS/payment status | RESTRICTED_IMMIGRATION | Critical | Purpose-specific consent, exact field mapping, audit, DPA or partner agreement, export controls. |
| Universities and schools | Education partnership | Aggregate reports by default, named records only with consent | INTERNAL, RESTRICTED_EDUCATION if named | High | Aggregate default, k-anonymity, DPA, named-student consent. |
| Employers | Hiring and placement | Employer-safe packet, application, offer and start status | RESTRICTED_EMPLOYER_PACKET | Critical | Named consent, Application Gate, tenant scoping, packet QA, contract. |
| AMN or VMS channel partner | Workforce routing and submissions | Employer-safe packets and ATS/VMS routing data | RESTRICTED_EMPLOYER_PACKET, PARTNER_RESTRICTED | Critical | Authorized program scope, tenant scoping, Application Gate, audit, contract. |
| ATS/VMS providers | Application submission and status | Employer-safe packet, application status, requisition data | RESTRICTED_EMPLOYER_PACKET, PARTNER_RESTRICTED | Critical | HMAC webhooks, replay protection, purpose-limited payloads, tenant mapping, contract. |
| Email provider | Transactional and outreach email | Email address, message content, tokens if misused | CANDIDATE_PERSONAL, possible SECRET if misused | High | No secrets in email, token minimization, DPA, suppression list, bounce handling. |
| SMS provider | Notifications | Phone number and minimal message text | CANDIDATE_PERSONAL | High | DPA, opt-in/out, no restricted text in SMS. |
| Monitoring or SIEM provider | Logs and alerts | Redacted logs, metrics, alerts | INTERNAL only by policy | High | Redaction, no PII, access control, retention, DPA. |

## Vendor Data Minimization Rules

- Vendors receive only the fields required for the approved purpose.
- Logs and telemetry vendors must receive redacted metadata only.
- AI vendors must receive minimized, redacted, task-scoped prompts through Model Gateway.
- Payment vendors must receive payment metadata only. FlorenceRN must not store card data.
- Employers must not receive financing, passport number, DS-160 details, internal underwriting, or Academy remediation history.
- Lenders must not receive employer notes or employer packet internals unless explicitly consented and permitted.
- Universities receive aggregate or anonymized views by default.

## Required Vendor Evidence

Before production restricted data exchange, retain:

- Contract owner.
- Business owner.
- Data owner.
- DPA, BAA, MSA, or equivalent contract status.
- Data processing purpose.
- Data classes transferred.
- Region and subprocessors.
- Retention and deletion terms.
- Breach notification terms.
- Security questionnaire or SOC report review.
- Access method and authentication.
- Webhook security design where applicable.
- Last review date and next review date.

## Open Vendor Risks

- Production cloud, KMS, storage, and monitoring providers need final architecture evidence.
- LendKey, SEVISmate, AMN/VMS, employer, lender, and university data processing terms must be finalized before restricted data exchange.
- AI provider live use must remain disabled or constrained until data-use and retention terms are approved.
- Email, SMS, print, and CRM integrations must avoid restricted identifiers in message bodies, URLs, and templates.
