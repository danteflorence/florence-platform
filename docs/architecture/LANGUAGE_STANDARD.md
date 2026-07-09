# Florence Education Language Standard

## Current State

Florence Education is converging into one Florence OS platform under the monorepo root. The current platform applications are already primarily TypeScript:

- `apps/core-api`: Node 24, TypeScript, Core identity, consent, audit, Document Vault, gateway, ledger, and application-gate service.
- `apps/academy-web`: React, TypeScript, Vite learner and partner surfaces.
- `apps/academy-web/api`: Node 24, TypeScript, Academy API and integration scripts.
- `apps/employer-connect-api`: Node 24, TypeScript, React/Vite employer and operator surfaces, ATS/VMS bridge services, and smoke tests.
- `apps/pathway-api`: Node 24, TypeScript, React/Vite pathway surfaces, immigration/licensure workflow services, and smoke tests.
- `packages/*`: placeholder TypeScript package boundaries for shared SDKs, configuration, logging, data, events, agent contracts, and synthetic test fixtures.

The repo also contains shell scripts for automation, Terraform for infrastructure, SQL migrations in service folders, and two Python files under `apps/academy-web/scripts`.

## Desired State

Production Florence Education code uses one language and runtime standard:

- TypeScript is the product language for backend, frontend, shared packages, tests, SDKs, connectors, and product automation.
- Node 24 is the production backend runtime.
- React with TypeScript is the frontend standard.
- SQL is allowed for migrations and data definition.
- Terraform remains the infrastructure language.
- Shell is allowed only for small repo, smoke, and deploy automation.
- Python is not allowed for production APIs, production services, request handlers, product workers, or user-facing runtime paths.
- New production languages require a future Architecture Decision Record before adoption.

## Package Management

Npm is the active package manager for this consolidation phase. The root `packageManager` field pins the npm toolchain contract, CI uses `npm ci`, and app-level lockfiles remain in place until the dedicated package-manager migration removes or replaces them.

Future migration to pnpm or another workspace package manager requires an explicit migration plan that preserves clean-runner installs, Docker/Cloud Run deploy paths, lockfile reproducibility, and security scanning.

## Repo Command Contract

Every app package must expose the same npm scripts:

- `dev`: local development entrypoint.
- `typecheck`: TypeScript validation.
- `test`: service-specific test or smoke suite.
- `lint`: static validation, currently TypeScript-backed where no linter is configured.
- `build`: CI/deploy build entrypoint.
- `clean`: removes generated artifacts such as `dist`, `.vite`, `.next`, `coverage`, and `*.tsbuildinfo`.

The root workspace exposes:

- `npm run dev`
- `npm run typecheck`
- `npm test`
- `npm run lint`
- `npm run prettier`
- `npm run build`
- `npm run clean`

## TypeScript Configuration

`tsconfig.base.json` is the shared base. Existing app `tsconfig` files now extend it while keeping app-specific module, JSX, and runtime settings local to each app.

The current base intentionally contains low-risk shared compiler settings only. Future work may tighten shared strictness, but that must be done after each app has a clean migration plan and test pass.

## JavaScript Inventory

JavaScript remains only where it is repo automation or ecosystem configuration:

- `scripts/ci/*.mjs` and `scripts/security/*.mjs`: repo automation. Keep as Node ESM or migrate to TypeScript after the package-manager migration adds a shared script runner.
- `apps/*/scripts/dev.mjs`: local development orchestration. Keep until app dev commands are consolidated.
- `apps/academy-web/server/*.mjs`: live-classroom local/load-test helpers. Future work should classify whether any of these are production runtime paths; production paths must become TypeScript or be wrapped by a TypeScript service boundary.
- `apps/*/tailwind.config.js` and `apps/*/postcss.config.js`: framework configuration. Future work should convert to TypeScript config only where the framework/toolchain supports it without breaking builds.
- Built `dist/assets/*.js`: generated artifacts. These are ignored and removed by `npm run clean`.

No broad JavaScript-to-TypeScript conversion is required in this pass.

## Python Classification

Current Python in the main platform tree:

- `apps/academy-web/scripts/import_content_banks.py`: offline data-import script.
- `apps/academy-web/scripts/import_question_bank.py`: offline data-import script.

These are not production services and must not be deployed as API, worker, or request-path code. Future work should either migrate them to TypeScript importers or isolate them as approved offline tooling with synthetic input guidance and no access to production secrets or candidate data.

`labor-economics-agent` remains an audit input and separate repository. It is not imported into the production Florence OS platform by this language standard.

## Security And Privacy Requirements

Language migrations must preserve the Florence security rules:

- Do not log, print, format, snapshot, or fixture sensitive candidate, passport, immigration, financing, employer-packet, document, or secret values.
- Keep tenant scope, consent checks, audit logging, redaction, signed-url document access, and fail-closed application gates intact.
- Use synthetic data only in tests and examples.
- AI code paths remain assistive and auditable; they must not make final high-stakes decisions.

## Migration Plan

1. Keep Node 24 and TypeScript as the production baseline.
2. Keep current `.mjs` automation until shared package management and script running are consolidated.
3. Convert framework config JavaScript to TypeScript only after the related app build proves the config is supported.
4. Migrate or wrap Academy Python import scripts before any production data pipeline depends on them.
5. Add an ADR for any future production language or runtime exception.

## Risks

- Forcing stricter shared TypeScript options immediately could turn this standardization into a broad app migration.
- Converting framework config files without confirming Vite, Tailwind, and PostCSS support could break local and CI builds.
- Treating offline Python import scripts as production code could create unreviewed data-handling paths.

## Tests Needed

- `npm run workspace:check`
- `npm run lint`
- `npm run prettier`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run security:secrets`

Run `npm run clean` before and after build verification when checking for generated artifacts.

## Acceptance Criteria

- Root commands exist for dev, typecheck, test, lint, prettier, build, and clean.
- Each app package has `dev`, `typecheck`, `test`, `lint`, `build`, and `clean`.
- Existing `tsconfig` files extend `tsconfig.base.json`.
- No production service uses Python.
- Generated build output is ignored and removable by the standard clean command.
- Risky language conversions are documented as future work rather than silently performed.
