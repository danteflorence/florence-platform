# ADR 0001: Standardize Product Language And Runtime

## Status

Accepted.

## Context

Florence Education is consolidating Core, Academy, Employer Connect, Pathway, shared packages, infrastructure, and selected audit inputs into one Florence OS platform. The platform handles high-sensitivity education, healthcare, immigration, financing, workforce, partner, and document workflows, so language sprawl increases review cost and security risk.

The current production platform is already mostly TypeScript and Node. Separate Python and JavaScript scripts exist, but the Python files in the main platform tree are offline Academy import helpers and the JavaScript files are generated artifacts, framework config, or repo automation.

## Decision

Use TypeScript as the production product language and Node 24 as the production backend runtime.

Use React with TypeScript for frontend product surfaces.

Allow Terraform for infrastructure and SQL for migrations.

Allow shell scripts only for narrow repo, smoke, and deployment automation.

Allow Python only for approved offline analysis or import tooling until migrated to TypeScript or wrapped behind a non-production tooling boundary.

Require a future ADR before adding any new production language or runtime.

## Consequences

All production APIs, services, workers, integrations, SDKs, shared packages, and user-facing app code should be TypeScript.

Existing app packages must expose consistent `dev`, `typecheck`, `test`, `lint`, `build`, and `clean` commands.

Existing TypeScript projects must extend the root `tsconfig.base.json`, while app-specific module and JSX settings remain local.

Current JavaScript automation and framework config may remain until converting them is safe and verified.

Current Academy Python import scripts may remain only as offline tooling. They must not receive production secrets, production candidate data, real restricted document data, or production identifiers.

Generated artifacts must remain outside source control and be removable through the standard clean command.

## Security Notes

This decision does not loosen any Florence security control. Tenant scoping, consent checks, audit logging, redaction, signed document access, fail-closed gates, secrets-manager usage, and human review for high-stakes AI workflows remain mandatory.

## Follow-Up Work

- Add package-managed Prettier as part of the future package-manager migration.
- Convert compatible framework config files from JavaScript to TypeScript after build verification.
- Decide whether Academy live-classroom `.mjs` helpers are production runtime code; migrate any production path to TypeScript.
- Migrate Academy Python importers to TypeScript or document them as approved offline-only tooling with synthetic-data constraints.
