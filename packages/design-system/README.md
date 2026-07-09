# Florence Design System

Shared Florence Education tokens and React primitives for Academy, Pathway, Core admin, Employer Connect, and future Florence OS surfaces.

## Current Scope

- Brand tokens are defined in `src/tokens.css` and `src/index.tsx`.
- Components are source-only React exports so app builds can import them directly while the monorepo migration is in progress.
- The preview surface is exported from `@florence/design-system/preview`.

## Use

Import the token CSS once at the app entrypoint:

```ts
import "@florence/design-system/tokens.css";
```

Import components from the package:

```tsx
import { Button, Card, StatusPill } from "@florence/design-system";
```

Use shared components for new buttons, cards, badges, status chips, layouts, tables, document cards, alerts, modals, form fields, upload blocks, partner logo strips, and legal disclaimers. Keep product-specific workflow logic inside the app.
