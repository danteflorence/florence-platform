# Consent Model

**Status:** ✅ canonical store implemented in `florence-core` (`consents` table + `src/consent.ts` + `/v1/consent/*`); ATS dual-writes today; Pathway/Academy seam shipped
**Maps to:** SOC 2 Privacy criteria (P-series) · NIST CSF 2.0 GV.PO (policy) · GDPR Art. 6/7 (lawful basis, conditions for consent)

Consent is a **first-class, versioned, granular, revocable, auditable** record —
not a checkbox in terms of service. FlorenceRN Core is the **canonical** consent
store; product surfaces may capture consent in their own UI but **dual-write** to
Core, and disclosure is **fail-closed on a live Core consent**.

## What a consent record captures (`consents` table)

| Field | Purpose |
|---|---|
| `id`, `nurse_id` | canonical subject |
| `purpose` | `employer_share` \| `underwriting` \| `education` \| `visa` \| `demand_radar` |
| `recipient_category` | `employer` \| `lender` \| `university` \| `internal` |
| `recipient_org_id` | the exact recipient org for external shares; null is reserved for internal or aggregate cases |
| `allowed_fields` | the fields the candidate authorized |
| `consent_text_version` + `consent_text_hash` | exact wording the candidate saw |
| `ip_hash`, `device_hash` | provenance (hashed, never raw) |
| `status`, `granted_at`, `granted_by` | grant ledger |
| `revoked_at`, `revoked_by` | revocation ledger |

## Purposes (minimum set, mapped to audiences)

| Purpose | Audience it unlocks | Notes |
|---|---|---|
| `employer_share` | employer view | named employer org required |
| `underwriting` | lender view | financing/visa-timing disclosure |
| `education` | university named-student view | named university org required; aggregates need no per-student consent |
| `visa` | pathway workflow support | |
| `demand_radar` | Demand Radar interest routing | already wired in Pathway consent scopes |

## The fail-closed rule (the riskiest decision, handled)

Core is canonical, but the migration is **dual-write with Core-deny-wins, never
Core-grant-wins**:

- **Grant** is written to both the app's local record AND Core. If the Core mirror
  write fails, the app surfaces *"sharing not yet enabled"* (ATS sets
  `sharingEnabled:false`) rather than disclosing — disclosure happens only when
  Core **affirmatively** holds a live consent.
- **Revoke** propagates to Core synchronously (ATS stores the Core consent id to
  target the revoke) and is honored locally.
- The only possible failure mode is **under-disclosure**, never over-disclosure.
- A nightly `consent-reconcile` job (planned) compares app-local vs Core records
  and raises a `security.alert` on divergence.

## The coarse Passport flag stays in sync

Granting/revoking in Core also emits the legacy `consent.updated` spine event, so
the folded Passport's `consents` map stays populated for existing readers. A
revoke only flips the coarse flag to `revoked` when **no** live consent for that
purpose remains. External disclosures still require an exact named recipient org.

## The gate

`consentAllows(consents, purpose, recipientOrgId)` is the single function
`passportView` / the read route consult. Org-specific requests require an exact
recipient org match; category-wide grants do not unlock named partner disclosures.

## Candidate rights (planned workflow — see hardening plan)
Access, correction, deletion-where-applicable, consent revocation, data export,
processing restriction. The append-only event log + the consent ledger are the
substrate for honoring these.

## Verification
`npm run verify-security`: grant persists + `consentAllows` true for matching
purpose/org and false for a different purpose; after revoke, false. The ATS smoke
exercises the local consent gate; the dual-write path is env-gated (mock-by-default).
