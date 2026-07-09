# Data Classification Policy

**Status:** ✅ implemented in `florence-core/src/classification.ts`
**Maps to:** NIST CSF 2.0 ID.AM-05 (resources prioritized by classification) · SOC 2 CC6.1, C1.1 (confidentiality)

Every field, object, API response, export, dashboard, and AI prompt in FlorenceRN
carries a data class. The class is the input to two enforcement points: **redaction**
(which audience may see a field — `passportView.ts`) and **audit** (which classes
were disclosed on a read — `audit.ts` read logging).

## The five classes

| Class | Rank | Examples (FlorenceRN) | Default handling |
|---|---|---|---|
| `public` | 0 | Public job postings, public employer info | Standard logging + access controls |
| `internal_business` | 1 | Pricing models, Workforce Economist outputs, funnel stage, campaign ids, nurse id, refs, consent ledger | Staff-only, role-based, no external sharing |
| `candidate_personal` | 2 | Name, email, readiness band/theta, NCLEX + licensure status | Encrypted, purpose-limited, export-controlled |
| `restricted_pathway_financial` | 3 | Visa/I-20/SEVIS, source documents, loan/financing, billing | Field-level access, enhanced audit, strict consent |
| `regulated_partner` | 4 | Employer-bound placement identity, ATS/lender packet linkage, (future) ePHI | Contract-governed, tenant-isolated, audited, minimum-necessary |

## Per-field map (Nurse Passport)

Encoded in `PASSPORT_FIELD_CLASS` (`classification.ts`). Highlights:

- `readiness.*`, `nclex.*`, `licensure.*` → **candidate_personal**
- `visa.*`, `documents`, `billing.*` → **restricted_pathway_financial**
- `placement.employer / employerId / jobReqId` → **regulated_partner** (the bound partner identity); `placement.stage / startDate` → internal_business
- `consents`, `demand`, `funnel*`, `nurseId`, `refs` → **internal_business**
- `name`, `email` → **candidate_personal**

`classOf(path)` resolves by **longest-prefix match** and **defaults to the most
restrictive class** (`regulated_partner`) for any unmapped path — so a newly added
field is fail-closed (never disclosed) until it is explicitly classified.

## How it drives the product

1. **Redaction.** Each audience profile in `passportView.ts` returns only the
   fields appropriate to its role, and `policy.ts` caps every read at the role's
   maximum class (`ROLE_MAX_CLASS`). Employer reads cap at `candidate_personal`
   AND additionally hard-deny `visa`/`documents`/`billing` with legal reasons.
2. **Audit.** Every passport read records the distinct classes actually returned
   (`classesReturned`), so any `restricted_pathway_financial` /
   `regulated_partner` disclosure is visible in the tamper-evident log.
3. **Engineering rule.** A new Passport field is not "done" until it has an entry
   in `PASSPORT_FIELD_CLASS`. CI guard recommended (see hardening plan).

## Build-safe / partner-safe views (the implication)

Kaiser/AMN see a **licensed-RN packet** (band + license + experience + start
window) — never nationality, visa, or financing. Lenders see a **consented
financing packet**. Universities see **aggregate/k-anonymized** cohort data by
default. Investors see **aggregated metrics, no PII**. These are not hand-built
per surface — they are derived from this classification + the audience profiles.
