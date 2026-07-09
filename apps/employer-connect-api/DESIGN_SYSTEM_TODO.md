# Employer Connect Design System TODO

## Current First Pass

- Import `@florence/design-system/tokens.css` at the app entrypoint.
- Keep existing local workflow components for this PR-sized pass.
- Use the shared `LegalDisclaimer` in the app footer.

## Next Migration Steps

- Replace local `Button`, `Card`, `CardHeader`, `Badge`, `Stat`, and workflow chips with shared primitives.
- Move employer packet, requisition, and application gate summaries toward `DocumentCard`, `MetricCard`, `StageStepper`, and `DataTable`.
- Keep consent, employer-safe packet filtering, tenant scope, audit, and fail-closed application gates in app and service code.
