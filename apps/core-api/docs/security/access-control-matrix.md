# Access-Control Matrix (RBAC + ABAC)

**Status:** ✅ implemented — RBAC in `roles.ts`, ABAC in `policy.ts`, redaction in `passportView.ts`, enforced at `routes.ts GET /v1/nurse/passport`
**Maps to:** NIST CSF 2.0 PR.AA-05 (least privilege) · SOC 2 CC6.1–CC6.3 · OWASP ASVS 5.0 V4 (Access Control)

Access is decided in two layers:

1. **RBAC (coarse gate).** Does the token carry the required scope? Human sessions
   derive scopes from their highest role (`roleScopes`); M2M tokens carry their
   client's `allowed_scopes`. The passport read route requires `passport:read`
   (staff/service) or an audience-pinned `passport:read:<audience>` (partners).
2. **ABAC (fine gate).** `evaluatePolicy()` decides allow/deny + a class ceiling
   from: role, org/tenant, candidate relationship, **consent status**, data
   classification, **purpose**, and time. Purpose is a request param validated
   against `ROLE_PURPOSES` (NOT a token claim — keeps the claim contract stable).

## Audience derivation

The route maps the caller's role → an audience for `passportView`:

- Staff/service (`super_admin`, `ops`, `qa`, `service`) → may request **any**
  audience (`?audience=`), defaulting to `internal_ops` (full). This lets an app's
  M2M token act as a **redaction proxy** (e.g. ATS requests `audience=employer`).
- `instructor`, `rep` → pinned to `instructor`.
- `employer` → `employer`; `university` → `university`; `lender` → `lender`;
  `candidate` → `self`. **Partners cannot escalate their audience.**

## The matrix

| Role | Scope (passport) | Audience | Max class | Allowed purposes | Consent-gated? |
|---|---|---|---|---|---|
| `super_admin` / `ops` | `passport:read` | any (default internal_ops) | regulated_partner | `*` | no |
| `qa` | `passport:read` | any (default internal_ops) | candidate_personal | `*` | no |
| `service` (M2M app) | `passport:read` | any (proxy) | regulated_partner | `*` | no (proxy; disclosure still consent-gated in `passportView`) |
| `instructor` | (staff) | instructor | candidate_personal | education | no |
| `rep` | (staff) | instructor | internal_business | `*` | no |
| `candidate` | `passport:read:self` | self | regulated_partner (own) | self | n/a (self) |
| `employer` | `passport:read:employer` | employer | candidate_personal | employer_share | **yes** (employer_share) |
| `university` | `passport:read:university` | university | candidate_personal | education, aggregate_reporting | **yes** (education, named) |
| `lender` | `passport:read:lender` | lender | restricted_pathway_financial | underwriting | **yes** (underwriting) |

## Field-level outcomes by audience (passportView)

| Field | self / internal_ops | instructor | employer | lender | university | investor |
|---|---|---|---|---|---|---|
| name / email | ✓ | name | name (post-consent) | name | name | ✗ |
| readiness.band | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| readiness.theta (raw) | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| nclex / licensure | ✓ | ✓ | status | status | status | ✗ |
| visa | ✓ | ✗ | ✗ | stage (timing) | ✗ | ✗ |
| documents | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| billing / financing | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ |
| placement (employer identity) | ✓ | ✗ | own org only | stage only | ✗ | ✗ |
| funnelStage | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

`✗` fields removed pre-offer for employers carry documented legal reasons
(Title VII / IRCA for nationality/visa) in the `withheld[]` list.

## Enforcement points (code)
- `routes.ts` `GET /v1/nurse/passport` — scope check → audience → consent lookup → `evaluatePolicy` → `passportView` → **audit read** → respond.
- Purpose mismatch (`employer` asserting `underwriting`) → `403` before any fold.
- Missing consent for a consent-gated audience → minimal stub (funnel only), never the data.
- Tenant isolation — an employer never sees a placement at another employer.

## Verification
`npm run verify-security` asserts: purpose denial, consent gating, tenant
isolation, class ceilings, and field-level redaction for every audience.
