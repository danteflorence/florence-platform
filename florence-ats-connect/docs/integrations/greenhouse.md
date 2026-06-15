# Greenhouse — Provisioning Sheet

**For:** any target on Greenhouse *(uncommon in large hospital systems — more typical of
physician groups, digital-health, and corporate/ambulatory orgs — but it's the easiest
ATS to connect, so it's worth having ready).*

---

### What this enables
FlorenceRN reads your open jobs and ingests a candidate + application (with resume
attached) onto the jobs you authorize, through the Greenhouse **Harvest API** — the same
candidate-ingestion path Greenhouse sourcing partners use. Status reads via Harvest too.

### What your team provisions (≈10 min for a Greenhouse admin)
1. **Create a Harvest API key.** *Configure → Dev Center → API Credential Management →
   Create New API Key*, type **Harvest**.
2. **Grant least-privilege permissions** on the key: Candidates (**GET**, **POST**),
   Applications (**GET**), Jobs (**GET**). POST Candidates is what lets us submit; nothing
   broader is needed.
3. **Identify an "On-Behalf-Of" user** — a Greenhouse user ID candidate ingests are
   attributed to (Harvest requires it on candidate creation).
4. *(Optional, for richer job pull)* your **Job Board token** (public board API) so we
   can read job content/locations.

### What to send us (secure intake — never email secrets)
- [ ] **Harvest API key**
- [ ] **On-Behalf-Of user ID**
- [ ] *(optional)* **Job Board token**
- [ ] Confirmation the key has Candidates GET/POST + Jobs GET

### How we test
Authenticate (`GET /v1/jobs`), then ingest **one test candidate** with a resume onto a
test job via `POST /v1/candidates` and read it back. Validate → flip to **active**. Revoke
the key anytime to cut access.

### Note
Greenhouse is the most API-friendly ATS we support and needs no sandbox tenant or
security-review gate to issue a key — which makes it a good first live integration to
prove the end-to-end flow if any target runs it.
