# NASHP HCT Update Pipeline

The Workforce Economist uses public aggregate NASHP Hospital Cost Tool data for hospital spend trendlines. This data is not candidate, nurse, passport, immigration, financing, employer packet, or other restricted Florence record data.

## Source Of Truth

- Official source page: `https://nashp.org/hospital-cost-tool-and-resources/`
- Current generated artifact: `src/generated/nashp-hct.generated.json`
- Offline importer: `scripts/import-nashp-hct.py`
- Update wrapper: `scripts/update-nashp-hct.mjs`
- Validation gate: `scripts/validate-nashp-hct.mjs`
- Freshness check: `scripts/check-nashp-source.mjs`

The source page is checked before each normal update. The artifact records:

- NASHP page `Updated On` date
- source check timestamp
- source page SHA-256
- NASHP workbook SHA-256
- variable-definition DOCX SHA-256
- ZIP-to-CBSA crosswalk SHA-256
- import run id
- row count, year range, and MSA enrichment coverage

## Update Command

Use explicit file inputs. Do not hard-code operator download paths into production config.

```bash
NASHP_PYTHON=/path/to/python-with-openpyxl-and-python-docx \
npm --prefix packages/economist-api run data:nashp:update -- \
  --hct-xlsx "/path/to/NASHP 2011-2024 HCT Data 2025 Dec.xlsx" \
  --definitions-docx "/path/to/NASHP HCT Data Variable Definitions 2025 October.docx" \
  --zip-cbsa-csv "/path/to/zip_cbsa.csv"
```

The update wrapper:

1. Verifies Python can import `openpyxl` and `python-docx`.
2. Fetches the official NASHP source page and extracts `Updated On`.
3. Imports the workbook into a temporary artifact.
4. Validates the temporary artifact.
5. Copies the previous artifact to `tmp/nashp-hct-backups/`.
6. Atomically replaces `src/generated/nashp-hct.generated.json`.
7. Validates the final artifact again.

## Freshness Monitor

Run this from a scheduler or release gate:

```bash
npm --prefix packages/economist-api run data:nashp:freshness -- --strict
```

Strict mode fails if the live NASHP page `Updated On` date differs from the date recorded in the generated artifact, or if the artifact has not recorded an official page check.

## Validation

Run this in CI and before deploys:

```bash
npm --prefix packages/economist-api run data:nashp:validate
```

The validation gate checks:

- generated schema version and required columns
- source hashes and source URL
- minimum row count
- 2011 baseline and expected max year
- MSA coverage
- metric definitions and numeric value shape
- canary latest-year aggregates for hospital, health system, MSA, and state
- no restricted Florence sensitive-data terms in artifact metadata

Optional environment gates:

- `NASHP_EXPECTED_MAX_YEAR=2024`
- `NASHP_MIN_ROWS=60000`
- `NASHP_MIN_MSA_COVERAGE=0.6`
- `NASHP_REQUIRE_SOURCE_CHECK=1`
- `NASHP_SOURCE_MAX_AGE_DAYS=14`

## Rollback

Each update writes a local ignored backup under:

```text
tmp/nashp-hct-backups/
```

To roll back, copy the desired backup over `packages/economist-api/src/generated/nashp-hct.generated.json`, then run:

```bash
npm --prefix packages/economist-api run data:nashp:validate
npm --prefix packages/economist-api test
```

## Known Limitation

The current production-safe pipeline verifies the official NASHP source page and imports explicit operator-provided workbook files. It does not silently scrape workbook downloads because the public source page currently presents the interactive Hospital Cost Tool as the canonical resource, not a stable versioned workbook API contract. If NASHP publishes a stable downloadable data URL, add it to the wrapper as a checked source and keep the same hash, temp-file, validation, and rollback gates.
