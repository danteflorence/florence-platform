# Design System Plan

Last reviewed: 2026-06-25

## Current State

Florence apps share some visual intent but not a single enforced design system.

Current design sources:

- Academy uses Tailwind with Florence teal, indigo/purple, ink, slate, mist, and clinical signal colors. Some current worktree changes are active under Academy UI files.
- ATS Connect and Pathway use similar Tailwind ramps around teal `#0ABAB5`, royal purple, ink/slate neutrals, Inter, and display serif fonts.
- `labor-economics-agent` contains `florence_theme.py` and `client-deck/assets/colors_and_type.css`, which are the strongest source for the deck-aligned Florence visual language.
- Extracted Vite apps use shadcn/Radix-style dependencies and may provide UI patterns, but they are not the source of truth.

Current issues:

- Tokens are repeated across app-specific Tailwind configs and Python CSS injection.
- Components are not shared as a first-class package.
- FlorenceRN, Florence Academy, ATS, Pathway, and workforce surfaces do not yet have one shell, navigation, spacing, or state model.
- Some existing palettes use older indigo-heavy or Academy-specific styling.

## Desired State

Florence Education / Florence OS should have one shared design language:

- Primary: Tiffany blue / teal `#0ABAB5`.
- Secondary: royal purple `#7340C4`, used intentionally for capital, financing, document, or secondary emphasis surfaces.
- Neutrals: ink `#101828`, secondary `#475467`, tertiary `#98A2B3`, rule `#E4E7EC`, paper `#FFFFFF`, soft paper `#F7FAFA`.
- Typography: Inter for product UI, Playfair Display or approved Florence display serif for editorial headings, JetBrains Mono for operational numbers and traces.
- Product shell: consistent top-level app frame, account menu, environment indicator, tenant context, audit-safe action states, and role-aware navigation.
- Components: shared buttons, inputs, tables, tabs, badges, empty states, audit event rows, consent panels, document cards, packet cards, Application Gate states, and signed URL controls.

## Affected Files And Repos

- App Tailwind configs and global CSS in Academy, ATS Connect, and Pathway.
- Future `packages/design-system` with tokens, Tailwind preset, CSS variables, and React components.
- Core developer portal and sign-in/admin HTML.
- `labor-economics-agent` theme files if workforce intelligence is brought into Florence OS.
- Extracted Vite UI bundles as reference only.

## Migration Steps

1. Freeze the token source of truth in a new design-system package.
2. Export tokens as:
   - CSS variables.
   - Tailwind preset.
   - TypeScript token object.
   - Optional JSON for non-React or offline renderers.
3. Build shared React primitives for common product UI. Keep them accessible, keyboard-safe, responsive, and compatible with existing Tailwind apps.
4. Migrate one low-risk app surface first, preferably a non-critical dashboard or developer portal.
5. Migrate ATS and Pathway shells next because their token ramps are already close.
6. Migrate Academy carefully, preserving current learner flows and avoiding collisions with active `feat/drip-campaign` UI work.
7. Port workforce economist visual language only after deciding whether it remains Streamlit, becomes a TypeScript app, or becomes an embedded surface.
8. Add visual regression checks for key surfaces after each migration.

## Risks

- Broad visual rewrites can mask security regressions in consent, packet, and document workflows.
- Academy has active WIP, so edits can conflict with user changes.
- A component package can break independent Docker contexts if not wired through the monorepo plan.
- UI changes could accidentally expose internal-only fields or remove consent and audit affordances.
- Overusing purple or teal can make risk and status states unclear.

## Tests Needed

- Typecheck and build for each migrated app.
- Component unit tests for security-critical UI states: consent required, signed URL expired, Application Gate blocked, tenant mismatch, high-stakes review required.
- Accessibility checks for focus order, labels, contrast, keyboard navigation, and reduced motion.
- Visual regression screenshots for desktop and mobile.
- Manual review of employer-safe, lender-safe, university-safe, candidate, and internal views.

## Acceptance Criteria

- Apps consume the same token source instead of copying color scales.
- Shared components do not weaken data-minimization or role-safe projections.
- Every migrated surface preserves tenant context, consent state, audit actions, and fail-closed messaging.
- Florence Education / Florence OS reads as one product across Academy, ATS/VMS, Pathway, Core, and workforce surfaces.
