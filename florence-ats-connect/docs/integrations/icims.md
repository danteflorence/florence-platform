# iCIMS — Provisioning Sheet

**For:** CommonSpirit Health · BJC HealthCare *(and any target on iCIMS).*

Hand this to your iCIMS System Administrator. **No iCIMS partnership or marketplace
listing is required** — iCIMS supports a *customer-specific* integration that you, the
customer, sponsor directly.

---

### What this enables
FlorenceRN reads your open RN jobs, creates a Person (candidate) and an Applicant
Workflow (application) on the jobs you authorize, and reads that workflow's status back —
through the iCIMS REST API with OAuth 2.0.

### What your team provisions

1. **Request customer-specific API access.** Your iCIMS System Administrator requests
   integration/developer access for FlorenceRN through the iCIMS developer community
   (Customer-Specific path). This does **not** require iCIMS to approve a partnership —
   it's a customer entitlement.
2. **Create API (OAuth 2.0) credentials** — a Client ID and Client Secret scoped to the
   integration (client-credentials grant).
3. **Grant the integration a permission profile** that can: read Jobs, create/read a
   Person, and create/read an Applicant Workflow (i.e., add a candidate to a job and see
   their status). Least-privilege — no broader admin rights needed.
4. **Sandbox/UAT** environment access for validation before production, if available on
   your iCIMS contract.

### What to send us (via our secure intake — never email secrets)

- [ ] **iCIMS Customer ID** (your numeric customer identifier)
- [ ] **API base URL** (e.g. `https://api.icims.com`)
- [ ] **Client ID** and **Client Secret**
- [ ] Confirmation the credential can create a Person + Applicant Workflow and read Jobs
- [ ] UAT/sandbox details if separate from production

### How we test (sandbox → production)
We authenticate, **search/read one open job** (read-only), then in UAT create **one test
Person + Applicant Workflow** and read its status. After that passes we repeat in
production and flip to **active**. You can revoke the credential at any time.

### Notes
- We call People, Jobs, and Applicant Workflows (`/customers/{customerId}/…`). Standard
  iCIMS REST — no custom UNIFi marketplace build needed for a customer-specific
  integration.
- Prefer not to share credentials? We also support **Merge** — you authenticate iCIMS
  once in a popup and we never see the secret. See the Merge easy-button sheet.
