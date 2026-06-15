# FlorenceRN ATS Connect — Security & Data Handling FAQ

Attach this when you send a provisioning sheet. It answers the first round of infosec
questions and shortens the review.

> **Honesty note for the FlorenceRN team (delete before sending):** items marked
> **[product]** are true in the software today and you can stand behind them. Items
> marked **[establish]** are commitments you must actually put in place (policies,
> audits, certifications) before asserting them to a hospital. Do not claim a
> certification you don't yet hold — infosec will ask for the report, and an
> overclaim ends the deal. Fill the bracketed `[…]` values.

---

### What data do you access in our ATS, and why?
**[product]** Only what's needed to do the job: read open requisitions, create a
candidate + application on requisitions we're authorized to fill, and read that
application's status. We request least-privilege scopes (see the per-ATS sheet) — not
broad admin access.

### What candidate data do you send into our ATS?
**[product]** A data-minimized packet: the candidate's professional profile, readiness
summary, and a generated resume PDF. We deliberately **withhold** attributes not lawfully
relevant to a pre-offer hiring decision — nationality, country of education, visa status,
and financing status — consistent with EEO/Title VII guidance. This minimization is
enforced in code, and the withheld fields are documented on every packet.

### On what basis do you submit a candidate to us?
**[product]** Documented candidate consent. We don't submit a candidate to your system
without a recorded consent to share their information with you for that purpose. The
consent gate is enforced in code — a packet cannot be built without it.

### How are our credentials stored?
**[product]** Encrypted at rest (AES-256-GCM) in a dedicated secrets vault, separate from
application records, never written to application logs, and accessible only to the
integration service. With the Merge easy-button path, we never receive your credentials
at all — you authenticate to your own ATS directly.

### Can we revoke access?
**[product]** Yes, unilaterally and immediately — revoke the service account / API key in
your ATS, or disconnect from your connected-apps settings (Merge path). We also
deprovision on contract end within **[30] days**.

### Do you write to production before testing?
**[product]** No. We validate the full flow against your sandbox / implementation tenant
first (read a requisition, create one test candidate, read status), then repeat in
production. The integration only goes "active" after that gate.

### How do you handle the billing-critical events (starts, retention)?
**[product]** We never treat an ATS application status as proof that a nurse started or
was retained. Those milestones come from your HRIS or your attestation (and/or nurse
confirmation). This separation is enforced in code — an ATS status of "started" is
explicitly rejected as a billing event.

### Is every cross-system action auditable?
**[product]** Yes. Each submission and status read is recorded as a sync event with
timestamp, direction, and outcome, available to you on request.

### Where is data hosted? Sub-processors?
**[establish]** Hosting: **[your cloud/region]**. Sub-processors: **[list — e.g. Merge for
the unified-API path; your cloud provider; any others]**. Maintain a current
sub-processor list you can share.

### Do you have SOC 2 / HITRUST? Will you complete a HECVAT?
**[establish]** State your real posture. If a SOC 2 Type II report exists, offer it under
NDA; if it's in progress, say so with a target date. **[We will/within X complete a
HECVAT on request.]** Don't claim a report you can't produce.

### How do you handle a breach?
**[establish]** Reference your incident-response policy and notification commitment
(**[e.g. notify Customer within 72 hours of confirming a breach affecting their data]**).

### PII / HIPAA scope?
**[establish, with counsel]** Recruiting data is generally employment data, not PHI, so a
BAA is typically not required for this integration — but confirm with your counsel and be
ready to state this clearly, because hospital infosec will ask.

---

**Bottom line for reviewers:** least-privilege access, candidate-consented and
data-minimized submissions, encrypted revocable credentials, sandbox-before-production,
and a hard separation between ATS status and billing truth — most of it enforced in the
software itself, not just in policy.
