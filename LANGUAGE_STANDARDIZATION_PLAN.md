# Language Standardization Plan

> **📜 Executed plan (bannered 2026-07-11).** docs/architecture/LANGUAGE_STANDARD.md is the live standard. Read that, not this; this file is kept as the decision record.

Last reviewed: 2026-06-25

## Current State

The production Florence platform is mostly TypeScript and Node 24:

- Core is TypeScript running on Node.
- Academy web is React, Vite, and TypeScript.
- Academy API is TypeScript and Node.
- ATS Connect is React, Express, TypeScript, and Node.
- Pathway is React, Express, TypeScript, and Node.
- Root CI targets Node 24.

There are important Python assets:

- `labor-economics-agent` is Python/Streamlit with additional Python APIs, scripts, data processing, proposal generation, and surveillance jobs.
- `extracted/florenceos` appears to include a Python-heavy service architecture with additional healthcare staffing concepts.

There are also Vite React bundles in `extracted/*`, but they are not production imports.

## Desired State

TypeScript is the primary production language for Florence Education / Florence OS services.

Node 24 is the runtime baseline for production application services, API services, SDKs, shared packages, and CI. Python may remain only for approved offline analysis, data science, migration utilities, or legacy tools until the logic is either ported to TypeScript or wrapped behind a production-approved service contract.

No Python service should become a production system of record for sensitive candidate, document, financing, employer packet, visa, licensure, Academy learning, or Production Ledger data.

## Affected Files And Repos

- All platform `package.json`, TypeScript configs, Dockerfiles, and CI scripts.
- `labor-economics-agent` Python modules, Streamlit app, pricing API, scripts, and data assets.
- Extracted Python services under `extracted/florenceos`.
- Future shared packages under `packages/*`.

## Migration Steps

1. Document every production runtime by service, language, entrypoint, data ownership, and deploy path.
2. Mark production TypeScript/Node 24 as the default for new services.
3. Classify Python modules:
   - Offline analysis retained as Python.
   - Batch jobs retained temporarily with synthetic or public data only.
   - Production API logic to port to TypeScript.
   - Logic to expose through a non-sensitive service contract.
   - Logic to archive.
4. For workforce economics, extract the stable pricing formulas and data contracts first, then choose one of:
   - Port pricing and recommendation logic to a TypeScript package.
   - Keep Python as an offline artifact generator and serve outputs through Core or ATS.
   - Wrap Python behind an internal API with no sensitive candidate data and strict audit/observability.
5. For extracted bundles, reject any service that requires production PII, PHI, immigration, credit, or employer packet access before it is ported to Core-controlled interfaces.
6. Add CI policy that production app packages cannot introduce Python runtime dependencies without explicit architecture approval.
7. Add documentation for approved Python use cases and data boundaries.

## Risks

- A rushed port can change pricing math or workforce recommendations.
- Python batch outputs may contain employer or lead data and need classification before reuse.
- Running Python as production API code can bypass Node/TypeScript security helpers.
- Separate Python dependencies can create untracked vulnerability and deploy surfaces.
- AI or data-processing scripts may accidentally process sensitive data outside approved audit controls.

## Tests Needed

- TypeScript typecheck and tests for every ported module.
- Golden-file tests for pricing or calculation logic using synthetic data.
- Contract tests if Python remains behind an internal API.
- Secret scan and fixture scan for Python repos before importing any artifact.
- Data classification tests proving no restricted candidate, document, financing, or visa fields enter non-Core Python workflows.

## Acceptance Criteria

- New production services are TypeScript/Node 24 by default.
- Every Python component has an explicit classification: offline, temporary batch, wrapped internal service, port candidate, or archived.
- No sensitive workflow depends on unapproved Python runtime code.
- Workforce economics can be consumed by Florence OS without exposing restricted candidate data.
- CI blocks accidental introduction of unreviewed production runtimes.
