# Florence Design System Usage

## Purpose

Use `@florence/design-system` for shared Florence Education / Florence OS visual language across Academy, Pathway, Core admin, Employer Connect, and future workforce economist surfaces.

## Tokens

The source of truth is `packages/design-system/src/tokens.css`.

- `--florence-tiffany`: primary field color, `#0ABAB5`
- `--florence-tiffany-dark`: primary hover and text color, `#067F7B`
- `--florence-purple`: strategic accent color, `#7340C4`
- `--florence-purple-dark`: accent hover and text color, `#4A2490`
- `--florence-ink`: body and heading ink, `#101828`
- `--florence-slate`: secondary text, `#475467`
- `--florence-ivory`: warm page or panel field, `#FFFDF7`
- `--florence-mist`: cool quiet surface, `#F7FAFA`
- `--florence-lavender`: soft purple accent field, `#F1ECFB`
- `--florence-line`: dividers and borders, `#E4E7EC`
- `--florence-success`: success state, `#16A34A`
- `--florence-warning`: warning state, `#D97706`
- `--florence-danger`: danger state, `#DC2626`

## App Setup

Import tokens once at the app entrypoint before app-local CSS:

```ts
import "@florence/design-system/tokens.css";
```

Import components from the package:

```tsx
import { Button, Card, StatusPill } from "@florence/design-system";
```

For links that need button styling, use `buttonClassName`:

```tsx
import { buttonClassName } from "@florence/design-system";

<Link className={buttonClassName({ variant: "accent", size: "lg" })} to="/academy/practice">
  Start practice
</Link>
```

## Component Rules

- Use `Button` for commands and `buttonClassName` for route links.
- Use `Card`, `MetricCard`, `DocumentCard`, and `ProfileCard` instead of new local card styles.
- Use `Badge` and `StatusPill` for labels and workflow state.
- Use `AlertBanner` for workflow messages, warnings, and security/privacy notices.
- Use `FormField` and `FileUpload` for new forms and upload surfaces.
- Use `DataTable`, `StageStepper`, and `Timeline` for operational workflows.
- Use `LegalDisclaimer` on healthcare, immigration, financing, AI, employer, and partner surfaces.

## First Rollout

- Academy now imports shared tokens and components.
- Five Academy pages are included in the first component rollout: Curriculum Navigator, Signup, Practice, Clinical Tutor, and Account.
- Pathway and Employer Connect import shared tokens and use the shared legal disclaimer in their app footers.
- Core admin has a migration TODO because its admin surface is server-rendered and should be converted with a separate narrow change.

## Security And Privacy

The design system is presentation-only. Tenant scope, consent, audit logging, signed URLs, redaction, AI review, and fail-closed workflow gates must remain in app and service code. Do not add real candidate, passport, SEVIS, visa, loan, employer packet, or credential data to previews, examples, tests, screenshots, or docs.
