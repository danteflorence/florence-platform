# Fake Staging Seed Data Strategy

Staging and sandbox use synthetic data only. Do not copy production records, documents, packets, passport data, SEVIS data, visa records, loan data, employer packets, or secrets into non-production.

## Current State

- Local development has fake seed paths through `npm run db:seed`.
- Core has admin and app-client seed scripts.
- Pathway and Employer Connect have local synthetic seed scripts.
- CI migration dry-run validates schemas without seeded data.

## Desired State

- Sandbox is the default environment for richer partner demos.
- Staging has the smallest possible fake dataset needed for QA smoke checks.
- Every seeded user, nurse, employer, university, lender, document reference, and ledger event is clearly synthetic.

## Seed Sources

| Area | Seed source |
| --- | --- |
| Core admin and app clients | `apps/core-api/scripts/seed-admin.ts`, `apps/core-api/scripts/seed-app-clients.ts` |
| Pathway fake case | `apps/pathway-api/scripts/seed-local.ts` |
| Employer Connect fake employer/jobs | `apps/employer-connect-api/scripts/seed-local.ts` |
| Local orchestration | `scripts/local/compose-task.mjs` |

## Staging Rules

- Use fake names, fake emails under reserved test domains, fake employer names, and fake document object IDs.
- Never upload restricted documents for staging smoke tests unless they are synthetic files created for that purpose.
- Never seed real lender, credit, passport, visa, transcript, I-20, DS-160, SEVIS, or employer packet data.
- Tag seeded records with an internal synthetic marker where the service schema supports it.
- Log only stable opaque IDs and event IDs.

## Execution Strategy

1. Keep CI seed-free; CI should run migrations and tests only.
2. For staging, run minimal seed commands manually after migrations from an authorized environment.
3. For sandbox, add future Terraform-managed seed Cloud Run Jobs after the staging path is stable.
4. Require `ALLOW_SYNTHETIC_SEED=1` for any cloud seed command that can create demo pathway cases.
5. Review seed logs for redaction before sharing them.

## Acceptance Criteria

- A new engineer can start local fake data with `npm run db:seed`.
- Staging smoke checks can run with fake login and fake records.
- Sandbox can later be expanded for partner demos without changing production data.
- No production secrets or real data are needed locally.
