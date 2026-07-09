# Oracle Taleo / Oracle Recruiting Cloud — Provisioning Sheet

**For:** Tenet Healthcare · Kaiser Permanente *(and any target on Taleo or Oracle
Recruiting Cloud).*

Two Oracle platforms, two slightly different setups. Confirm with your team **which one
is the system of record for hiring** — some organizations (e.g. Tenet) run Taleo while
migrating to Oracle Recruiting Cloud, and the career-site host doesn't always tell you.

---

## Path A — Taleo (Enterprise)

### What this enables
FlorenceRN reads open requisitions, creates a candidate and submission on requisitions
you authorize, and reads submission status — via the Taleo REST API.

### What your team provisions
1. **An integration user** in your Taleo zone with a user type granting the functional
   permissions to: view requisitions, create candidates, and submit candidates to
   requisitions (least-privilege; no recruiter UI rights beyond these).
2. Confirm the user can authenticate to the **Taleo REST API** (`/ccx/services/rest/v1`).
3. Sandbox/staging zone access for validation if available.

### What to send us (secure intake — never email secrets)
- [ ] **Zone URL** (e.g. `https://tenet.taleo.net`)
- [ ] **Company / org code** (the `orgCode` used at login)
- [ ] **Integration username** and **password**
- [ ] Confirmation of create-candidate + submit-to-requisition permission

---

## Path B — Oracle Recruiting Cloud (ORC / Fusion HCM)

### What this enables
Same outcome (read reqs, create candidate + job application, read status) via the
Oracle Fusion HCM REST API.

### What your team provisions
1. **An integration user** with a role granting Recruiting REST access — your Oracle
   admin will map a role such as a recruiting integration specialist with create/read on
   candidates and job applications.
2. **Authentication**: either OAuth 2.0 or Basic against the Fusion REST endpoint.
3. A **test/stage** Fusion environment for validation.

### What to send us (secure intake — never email secrets)
- [ ] **Fusion environment base URL** (e.g. `https://<env>.fa.us2.oraclecloud.com`)
- [ ] **Integration user** credentials (or OAuth client ID/secret + token endpoint)
- [ ] Confirmation of create-candidate + create-job-application + read-status permission
- [ ] Stage/test environment details

---

### How we test (both paths: sandbox → production)
Authenticate → read one requisition (read-only) → create **one test candidate +
submission/application** in the non-production environment → read its status. Validate,
then repeat in production and flip to **active**. Revoke the integration user anytime to
cut access.

### Note
Not sure which platform is live, or prefer not to share credentials? **Merge** connects
either one — you authenticate once in a popup and we never see the secret. See the Merge
easy-button sheet.
