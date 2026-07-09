# Pathway Design System TODO

## Current First Pass

- Import `@florence/design-system/tokens.css` at the app entrypoint.
- Keep existing local workflow components for this PR-sized pass.
- Use the shared `LegalDisclaimer` in the app footer.

## Next Migration Steps

- Replace local `Badge`, `Card`, `CardHeader`, `Button`, and `StatCard` with shared design-system primitives.
- Move workflow status labels to `StatusPill`.
- Move candidate and document summary surfaces to `ProfileCard` and `DocumentCard`.
- Keep Pathway-specific security gates, staff auth, candidate attestation, and AI review logic in app code.
