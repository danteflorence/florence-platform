# FlorenceRN Data Classification Policy

Status: SOC 2 ready controls in progress. This policy describes repository controls and target operating rules. It is not a formal compliance attestation.

## Purpose

FlorenceRN classifies every sensitive field before data is displayed, exported, logged, shared, audited, or sent to AI systems. Classification is enforced centrally in Core and must be used by all product surfaces.

## Data Classes

| Class | Description | Examples |
| --- | --- | --- |
| PUBLIC | Public or intentionally publishable data. | Public job posting text, public school names, public marketing copy. |
| INTERNAL | Florence operational metadata that is not candidate PII. | Funnel counts, aggregate readiness distribution, safe event counts, internal IDs when not linkable to restricted data. |
| CANDIDATE_PERSONAL | Candidate-level personal and learning data. | Name, email, readiness band, NCLEX status, licensure status, Academy progress. |
| RESTRICTED_IDENTITY | Government identity and highly sensitive identity data. | Passport number, date of birth, address, SSN/ITIN indicator, document IDs. |
| RESTRICTED_IMMIGRATION | Immigration and consular data. | I-20, SEVIS ID, DS-160 fields, visa status, consular appointments, I-901 receipt metadata. |
| RESTRICTED_FINANCING | Financing, credit, underwriting, loan, and lender data. | Credit score, loan amount, underwriting signals, lender application IDs, adverse-action data. |
| RESTRICTED_EMPLOYER_PACKET | Employer packet and application data. | Employer packet contents, ATS/VMS submission data, employer notes, requisition match data. |
| RESTRICTED_EDUCATION | Education and credential data. | Transcripts, school records, credential evaluation, NCLEX/license record details. |
| PARTNER_RESTRICTED | Contract-governed partner linkage data. | Employer tenant IDs, lender handoff data, AMN/VMS routing data, LendKey handoff status. |
| SECRET | Secrets and values that must never be disclosed by normal APIs. | API keys, tokens, signed URLs, raw request bodies, encrypted document paths, private keys. |

## Field Tags

The central registry must tag these fields at minimum:

- Passport, passport number, MRZ data.
- Date of birth.
- Address and phone.
- SEVIS ID.
- I-20.
- DS-160.
- Visa status and consular status.
- Credit, loan, adverse-action, and underwriting fields.
- Employer packet data, employer notes, ATS/VMS submission data.
- School records, transcripts, NCLEX, ATT, and licensure records.
- Document IDs, document paths, storage keys, and signed URLs.
- Raw request bodies, raw response bodies, authorization headers, cookies, tokens, and secrets.

## Central Registry

The authoritative registry is `florence-core/src/classification.ts`.

Required behavior:

- Unknown fields fail closed to `SECRET`.
- Legacy class aliases are normalized to the uppercase data classes above.
- Classification can be derived from explicit fields or nested object paths.
- Recipient serializers use data class allowlists and deny-key patterns.
- Redaction helpers are provided for logs, errors, API responses, exports, analytics, and model inputs.

## Recipient Views

| Recipient | Default access |
| --- | --- |
| candidate | Candidate can see their own candidate view, excluding secrets and platform-only internals. |
| internal_ops | Internal staff can see operational records up to role ceiling, excluding secrets unless a separate approved tool handles them. |
| employer | Employer-safe packet only. No financing, DS-160 details, passport number, internal underwriting, unrelated employer placement, or Academy remediation history. |
| lender | Consented lender-safe financing and readiness view only. No employer notes unless explicitly consented and permitted. |
| university | Aggregate or anonymized by default. Named student data requires explicit authorization and consent. |
| amn_vms_partner | Employer-safe packet and ATS/VMS routing data only. No financing, DS-160, passport number, or Academy remediation history. |
| investor_board_aggregate | Aggregate and de-identified data only. No named candidate data. |

## Redaction Rules

Redaction must be applied server-side before data leaves the trusted service boundary.

Required helpers:

- Logs: redact sensitive keys and sensitive free text.
- Errors: return safe codes and safe messages only.
- API responses: serialize for recipient view.
- Exports: serialize for recipient view and record export manifest.
- Analytics: only coarse event names, non-identifying counters, and safe labels.
- AI prompts: minimum necessary text, redacted or tokenized identifiers, and data class metadata.

## Prohibited Locations For Sensitive Data

PII, passport data, SEVIS IDs, DS-160 data, visa status, credit data, loan data, employer packets, secrets, signed URLs, and restricted document contents must not appear in:

- Logs.
- URLs or query strings.
- UTM parameters.
- Analytics events.
- Error traces.
- Prompt text unless explicitly approved, minimized, and audited.
- Telemetry.
- Test fixtures.
- Seed data.
- Screenshots.
- Documentation examples.

## Verification

Current repository evidence:

- `florence-core npm run verify-security`
- `florence-core npm run verify-logging-audit`
- `florence-core npm run verify-logging-telemetry-audit`
- `florence-ats-connect npm run pii-url-smoke`
- `npm run security:secrets`

## Residual Risk

All new schemas must be registered before production use. App-local serializers must be migrated to Core or proven equivalent before partner launch.
