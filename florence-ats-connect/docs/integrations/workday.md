# Workday Recruiting — Provisioning Sheet

**For:** Sutter Health · Trinity Health · Advocate Health · Sharp HealthCare *(and any
target on Workday).*

Hand this to your Workday administrator / HRIS integrations team. It lists exactly what
to create and what to send us. Nothing here exposes candidate data to us beyond the
requisitions and applications involved.

---

### What this enables
FlorenceRN reads your open RN requisitions, creates a candidate + job application on
the requisitions you authorize, and reads that application's status back — all through
Workday's REST Recruiting API. No file feeds, no manual re-keying.

### What your team provisions (≈30–60 min for a Workday admin)

1. **Integration System User (ISU).** Task *Create Integration System User*. Set *Do Not
   Allow UI Sessions* and a session timeout of 0. This is the service account we
   authenticate as — it is not a person and has no UI login.
2. **Integration System Security Group (ISSG).** Create an unconstrained (or
   tenant-appropriate constrained) ISSG and add the ISU.
3. **Grant domain security policy permissions** to the ISSG — **Get & Put** on the
   Recruiting domains needed to create candidates and applications and read status
   (your team will recognize these under the *Recruiting* functional area, e.g.
   candidate data, job application data, candidate attachments), plus **Get** on Job
   Requisition data. Then *Activate Pending Security Policy Changes*.
4. **Register an API Client for Integrations.** Task *Register API Client for
   Integrations*; include scopes **Recruiting**, **Staffing**, **Public Data**, and
   **Tenant Non-Configurable**. Use the refresh-token grant and generate a non-expiring
   refresh token for the ISU.
5. **Sandbox first.** Do the above in your **Implementation/Sandbox tenant** so we can
   validate before touching production. Repeat in production once validated.

### What to send us (via our secure intake — never email secrets)

- [ ] **Tenant name** (e.g. `sutterhealth`)
- [ ] **REST API base URL** (your Workday host, e.g. `https://wd1-impl-services1.workday.com`)
- [ ] **OAuth token endpoint** (`https://…/ccx/oauth2/{tenant}/token`)
- [ ] **Client ID** and **Client Secret** (from the API Client registration)
- [ ] **Refresh token** for the ISU
- [ ] Confirmation the ISSG has Recruiting **Get & Put** + Requisition **Get**

### How we test (sandbox → production)
We authenticate, **read one open requisition** (read-only), then submit **one test
candidate** in the sandbox and confirm we can read its status. Only after that passes do
we repeat against production and flip the integration to **active**. You can revoke the
ISU at any time to instantly cut access.

### Notes
- We use the REST Recruiting API (`/ccx/api/recruiting/v4/{tenant}/…`); no custom Workday
  Studio build required on your side.
- If you'd rather not hand over credentials at all, we also support **Merge** — your
  admin signs into Workday once in a popup and we never see the credentials. See the
  Merge easy-button sheet.
