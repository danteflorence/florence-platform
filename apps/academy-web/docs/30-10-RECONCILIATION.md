# The 30/10 Reconciliation — layer architecture (live summary)

> **📜 Executed strategy brief.** The full original (build-state tables, 4-week
> sequencing, fundraising narrative — written before Track A) is archived
> verbatim at `docs/archive/2026-07/academy-30-10-RECONCILIATION.md`. Its
> sequencing is long past and its "not yet built" claims are stale (candidate
> identity/persistence, readiness passport, Control Tower, outcome ingestion,
> purpose-based consent, and the employer/university portals have all since
> shipped). What survives here is the **layer model**, which is still how the
> platform is organized.

## The five layers (still the operating architecture)

1. **Academy** — readiness intake: curriculum, adaptive banks, virtual-patient
   sims, readiness scoring. The top of the production funnel.
2. **Pathway** — visa/licensure admin automation (F-1 forward; never back-end
   work-visa filings). AI drafts → human QA → candidate signs.
3. **Core** — identity, consent, Passport views, audit, the Production Ledger.
   The security boundary; every cross-product read goes through it.
4. **Employer / ATS + VMS Connect** — demand side: reqs in, gated packets out,
   starts/retention back to the ledger.
5. **Capital** — deposits and financing seams (lender API; ISA counsel-gated).

## Compliance guardrails fixed by the brief (still binding)

- **Public-surface language rule:** no tax / FICA / visa / immigration /
  financing language anywhere a learner can see.
- **Layer isolation:** financing, underwriting, visa workflow, ARR never render
  in the Academy app.
- **Credit + immigration decisions are never automated** — AI drafts, qualified
  humans decide, candidates self-sign; nothing auto-submits to government
  portals. Enforced in code (application gate, passport views) and `AGENTS.md`.

North-star metric unchanged: **monthly RN starts and collections.**
