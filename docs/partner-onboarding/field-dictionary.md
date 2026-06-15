# Field dictionary — Nurse Passport + lender data products

Every field a partner can receive, its data class (`florence-core/src/classification.ts`), and — critically for
lenders — whether it is a **prohibited-basis** field that is **excluded from the credit-decision package by
default** (ECOA / Reg B). The credit-decision package = `CREDIT_DECISION_FIELDS ∩ consent.allowed_fields`, minus
prohibited-basis. Counsel may clear additions via `CREDIT_DECISION_EXTRA_FIELDS` (never a prohibited-basis field).

## Credit-decision package (lender) — permissible underwriting signals
| Field | Meaning | Data class | In credit-data? |
|---|---|---|---|
| `nurseId` | opaque id | internal_business | yes |
| `name` | candidate name | candidate_personal | yes (consent) |
| `readiness.band` / `readiness.passProbability` | NCLEX readiness | candidate_personal | yes |
| `nclex.status` | NCLEX status | candidate_personal | yes |
| `licensure.status` / `licensure.state` | RN license status + state | candidate_personal | yes |
| `billing.subscriptionStartedAt` | start = income begins | restricted_pathway_financial | yes (if consented) |
| `placement.stage` | offer-backed status (no employer identity) | internal_business | yes |
| `retention.retained30dAt/60dAt/90dAt` | still employed/earning | internal_business | yes |
| `retention.termCompleteAt` / `retention.repaymentAt` | term complete / repayment | internal_business / restricted | yes |
| `funnelStage` | canonical pipeline stage | internal_business | yes |

## PROHIBITED-BASIS — excluded from credit decisions by default (ECOA/Reg B)
| Field | Why excluded |
|---|---|
| `visa` / `visa.stage` | immigration status = national-origin proxy |
| `nationality` | national-origin data (Title VII / IRCA / ECOA) |
| `countryOfEducation` | national-origin proxy |
| `currentCountry` | national-origin proxy |
| `arrivalStatus` | national-origin proxy |

> The operational **lender view** (`/v1/nurses/:id/passport?view=lender`) may surface `visa.stage` for
> servicing/start-date context under consent, but the **credit-decision package** (`/v1/nurses/:id/credit-data`)
> strips it. Use credit-data — not the raw lender view — as the underwriting input.

## Never disclosed to a lender (any audience below the lender ceiling)
`documents` (source docs), `readiness.theta` / `readiness.subscaleMastery` (raw scores), `placement.employer`
(tenant isolation), `onboarding` (internal ops), `retention.terminatedAt` (internal ops), and anything an
employer is also denied. No partner ever receives the full internal Passport.

## Loan-performance events (the feed / pool a warehouse bank underwrites)
`ats.started` · `billing.subscription_started` · `ats.retention_30d/60d/90d` · `retention.90_day_confirmed` ·
`ats.term_complete` · `billing.repayment_started` · `credit.decision`.
