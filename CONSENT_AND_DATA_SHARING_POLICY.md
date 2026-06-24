# FlorenceRN Consent And Data Sharing Policy

Status: SOC 2 ready controls in progress. This is not a formal privacy attestation.

## Purpose

FlorenceRN shares external data only when the share is purpose-specific, recipient-specific, minimized, authorized, and audited. Consent is a control, not a UI checkbox.

## Consent Requirements

Consent must be:

- Explicit.
- Purpose-specific.
- Recipient-specific for external shares.
- Time-aware.
- Revocable.
- Versioned by consent text and hash.
- Stored in the canonical Core consent ledger.
- Checked at the moment of sharing.
- Audit logged.

## Consent Purposes

| Purpose | Recipient | Unlocks |
| --- | --- | --- |
| employer_share | Employer, AMN, ATS/VMS partner | Employer-safe readiness, license, packet, and application data. |
| underwriting | Lender, LendKey-style lender processor | Lender-safe financing, readiness, and timing data. |
| education | University or school | Aggregate reports by default. Named student view only with explicit consent. |
| visa | Pathway or consular workflow support | Candidate pathway support, not unrestricted partner sharing. |
| demand_radar | Employer demand and job interest routing | Opaque interest and routing data, not restricted identity or immigration data. |

## Data Sharing Rules

- Employers may see only employer-safe packets.
- Lenders may see only consented lender-safe packets.
- Universities see aggregate or anonymized views by default.
- AMN/VMS and ATS partners receive only employer-safe data required for authorized submission workflows.
- Investors and board recipients receive only aggregate and de-identified views.
- SEVISmate receives only the minimum I-901 handoff data required for the approved payment workflow.
- LendKey or lender processors receive only the minimum consented underwriting and handoff data.
- No partner receives secrets, raw prompts, full internal notes, unrestricted document links, or full candidate records.

## Fail-Closed Rules

External sharing must fail closed when:

- Consent is missing, expired, revoked, wrong-purpose, wrong-recipient, or not mirrored to Core.
- Recipient tenant is missing or mismatched.
- Application Gate is not cleared.
- Packet QA is not approved.
- Required license or authorization status is missing or pending.
- Export or document access cannot be audited.
- Data class exceeds recipient ceiling.

## Revocation

Revocation must be honored immediately for future reads, packet views, exports, webhooks, and handoffs. Existing partner copies are governed by contract, retention, and deletion terms, which must be documented per partner.

## Sharing Evidence

Every external share must record:

- Subject.
- Actor.
- Recipient organization.
- Recipient category.
- Purpose.
- Consent ID or decision.
- Fields or data classes shared.
- Packet or document ID when applicable.
- Timestamp.
- Outcome.
- Correlation ID.

Audit details must not contain raw PII, passport numbers, SEVIS IDs, DS-160 data, credit data, loan data, employer packet contents, or secrets.

## Manual Controls

- Legal review of consent text versions.
- Contract review for every external recipient.
- Vendor and partner DPA or data-sharing agreement.
- Recipient access review.
- Export manifest approval for new packet types.
- Deletion or revocation handling procedure by partner.

## Verification

Current repository evidence:

- `florence-core npm run verify-security`
- `florence-core npm run verify-tenant-isolation`
- `florence-core npm run verify-gateway`
- `florence-core npm run verify-lender`
- `florence-academy/api npm test`
