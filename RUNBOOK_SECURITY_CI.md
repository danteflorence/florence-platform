# Security CI Runbook

## What CI Runs

The main CI workflow runs from a clean checkout with Node 24:

1. `npm ci` at the repository root.
2. `npm run ci:install` to run `npm ci` in each tracked Florence package.
3. `npm run typecheck`.
4. `npm test`.
5. `npm run lint`.
6. `npm run build`.
7. `npm run security:secrets`.
8. `npm run security:secrets:test`.
9. `npm run security:audit`.
10. `npm run security:static`.
11. CodeQL JavaScript/TypeScript analysis.

## Security Checks

- `security:secrets` scans tracked files for committed env files, private keys, API keys, tokens, and high-confidence secret assignments.
- `security:secrets:test` proves the scanner passes on the repo and fails on a synthetic leaked key.
- `security:audit` runs `npm audit --audit-level=high` in each tracked package with a lockfile.
- `security:static` verifies the CI workflow includes the required gates and does not ignore audit failures.
- CodeQL runs in GitHub Actions for static JavaScript/TypeScript analysis.

## Local Use

Use the repository Node 24 toolchain if your shell does not already have Node 24:

```bash
export PATH="$PWD/.toolchain/node/bin:$PATH"
```

Then run:

```bash
npm ci
npm run ci:install
npm run typecheck
npm test
npm run lint
npm run build
npm run security:secrets
npm run security:secrets:test
npm run security:audit
npm run security:static
```

## If A Check Fails

- Secret scan: remove the secret, rotate it if it may have been exposed, and replace examples with placeholders.
- Dependency audit: upgrade or replace the vulnerable production package. Review dev-tool advisories separately and fix them through planned toolchain upgrades.
- Static CI check: restore the required CI command or CodeQL step.
- Build/test/typecheck: fix the package without weakening auth, tenant scoping, consent, audit, validation, or encryption.
