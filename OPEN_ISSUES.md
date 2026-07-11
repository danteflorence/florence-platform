# Florence Education Open Issues

Last updated: 2026-06-26

## Purpose

This register lists the open issues found during the final platform audit. These are not cosmetic. Items marked release blocker should be closed or formally exception-approved with compensating controls before staging or production claims.

## Release Blockers

| Priority | Issue | Impact | Owner area | Acceptance criteria |
| --- | --- | --- | --- | --- |
| P0 | Grants has no dedicated owner service or standalone Core event writer. | Acceptance criterion that Grants writes events to Core is not met. | Product architecture / Grants | Owner service selected, event types defined, Core writes implemented, consent/audit tests added. |
| P0 | Core-required event modes are not uniformly enforced outside local development. | Academy, Pathway, Employer Connect, and Workforce Economist can no-op or fall back in some configurations. | Platform services | Staging/prod configs fail closed when required Core event credentials are missing. |
| P0 | Employer Connect local ledger can remain canonical unless `LEDGER_CANONICAL=core` is set. | Production Ledger truth can diverge from Core. | Employer Connect / Core | Non-local config requires Core canonical ledger and local rows are projections. |
| P0 | Staging Terraform plan/apply requires authorized Google credentials and reviewed environment secrets. | Staging deployment cannot be completed from this host. | Infrastructure | Reviewed plan artifact exists and authorized operator can apply. |

## High-Priority Gaps

| Priority | Issue | Impact | Owner area | Acceptance criteria |
| --- | --- | --- | --- | --- |
| P1 | Standalone Academy, Pathway, and Employer surfaces are not fully migrated into the shared app shell/design system. | User experience can still feel like separate products. | Frontend | Shared navigation, tokens, components, and role-aware shell cover active user workflows. |
| P1 | Production database standard needs enforcement checks. | SQLite/PGlite/local adapters could accidentally be enabled outside local dev. | Platform / CI | Release check fails when production-like env uses local-only persistence. |
| P1 | Pathway sensitive JSONB workflow records remain service-local. | Core governance over sensitive canonical pathway facts is incomplete. | Pathway / Core | Canonical sensitive decisions and references move to Core contracts or documented projections. |
| P1 | Academy Core event writes are optional when Core credentials are missing. | Readiness/grant/application events can be absent from Core. | Academy | Non-local writes require Core event URL/token and fail safely if missing. |
| P1 | Workforce Economist staging config allows optional Core event writes. | Quote/proposal events may be absent from Core in staging. | Economist / Infra | Staging requires Core credentials and `ECONOMIST_CORE_EVENTS_REQUIRED=1`. |
| P1 | Cloud security evidence is not present in repo. | Cannot claim production readiness or audit readiness beyond code controls. | Security / Infrastructure | Cloud IAM, logging, Secret Manager, backup, monitoring, and access review evidence collected outside repo. |

## Medium-Priority Gaps

| Priority | Issue | Impact | Owner area | Acceptance criteria |
| --- | --- | --- | --- | --- |
| P2 | Event payload schemas are not centralized in a shared package. | Cross-service events can drift. | Core / shared packages | Shared event schema package plus synthetic fixtures and contract tests. |
| P2 | Some app shell surfaces still use fallback/synthetic rows. | Staging demos can hide missing API integrations. | App Web | Each production route has an audited API data path or is explicitly marked mock-only. |
| P2 | External security review and penetration test are not complete. | No formal production or compliance claim is supportable. | Security | Third-party review completed and findings tracked. |

## Watch Items

- Keep public domains, cookies, OAuth redirects, CORS, OpenAPI examples, and copy aligned on `florenceedu.com`.
- Keep Apply CTA pointing to `https://www.florenceedu.com/apply`.
- Keep all staging smoke data synthetic.
- Keep generated files, caches, local databases, Terraform state, and logs out of commits.
- Keep AI output assistive and human-reviewed for high-stakes workflows.
- The ISA / income-share financing module was **built then deliberately removed** (June 2026); only the `financing.repayment` ledger event remains. Do not treat archived build reports or the June strategy doc as evidence it exists — reintroduction is counsel-gated.
- Pathway's NCLEX readiness gate runs **shadow-first**: `READINESS_GATE_ENFORCE` (see `apps/pathway-api/server/readinessGate.ts`) stays advisory until the cohort pass-rate data calibrates the threshold. Do not flip to hard-block without that data.
- Academy landing-page **refund policy is still placeholder copy** — needs real wording before paid enrollment marketing (extracted from the June instructor-console session log).
