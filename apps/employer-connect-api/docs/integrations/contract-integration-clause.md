# Integration & Data-Access Clause

Contract language obligating the Customer to provision API access and a sandbox within
a defined window — and stating FlorenceRN's reciprocal security and data commitments.

> **Not legal advice.** This is a starting draft for your counsel to review and adapt to
> your MSA. Bracketed `[…]` items are deal-specific.

---

## Short form — for an Order Form / SOW

> **Integration Enablement.** Customer will, within **[15] business days** of the
> Effective Date, provision FlorenceRN with the API access described in FlorenceRN's
> then-current ATS provisioning sheet for Customer's applicant tracking system
> (including a non-production/sandbox tenant for testing), and designate a technical
> contact to support enablement. FlorenceRN will access only the data necessary to
> submit Customer-authorized candidates and to read the resulting application status,
> will act solely on documented candidate consent, and will store all credentials
> encrypted. Subscription fees begin per the Order Form regardless of integration
> timing; however, FlorenceRN's start/retention obligations are measured only from the
> first validated production submission.

---

## Long form — MSA exhibit

### Exhibit [X]: Integration, Credentials & Data Access

**1. Customer enablement obligations.**
1.1. **Credentials.** Within **[15] business days** of the Effective Date, Customer will
provision and deliver to FlorenceRN, through FlorenceRN's secure intake, the API
credentials and configuration specified in FlorenceRN's provisioning sheet for
Customer's ATS (the "**Provisioning Sheet**"), scoped to the minimum permissions
required to: (a) read open requisitions; (b) create a candidate and application on a
requisition Customer has authorized; and (c) read that application's status/stage.
1.2. **Sandbox.** Customer will provide access to a non-production, implementation, or
sandbox tenant of the ATS for validation prior to any write to the production tenant.
1.3. **Technical contact.** Customer will designate a named technical/HRIS contact and
respond to enablement requests within **[5] business days**.
1.4. **Maintenance.** Customer will keep the credentials valid for the Term and notify
FlorenceRN **[10] business days** before any ATS migration, re-platform, or credential
rotation that would affect the integration.

**2. FlorenceRN data & security commitments.**
2.1. **Least privilege.** FlorenceRN will request and use only the permissions in the
Provisioning Sheet, and will not access Customer data beyond what is necessary to
perform the Services.
2.2. **Consent-gated.** FlorenceRN will submit a candidate to Customer only where the
candidate has given documented consent to share their information with Customer for
that purpose.
2.3. **Data minimization.** Candidate packets exclude attributes not lawfully relevant
to a hiring decision pre-offer (including nationality, country of education, visa, and
financing status), consistent with applicable EEO requirements.
2.4. **Credential handling.** FlorenceRN stores all Customer credentials encrypted at
rest, never in application logs, and accessible only to the integration service.
2.5. **Deprovisioning.** On expiry or termination, or on Customer request, FlorenceRN
will cease using and delete (or return) Customer credentials within **[30] days**, and
Customer may revoke the service account at any time.
2.6. **Auditability.** FlorenceRN maintains a record of each cross-system action
(submission, status read) available to Customer on reasonable request.

**3. Billing independence.** Subscription fees accrue per the Order Form irrespective of
integration timing. Where fees are tied to nurse **starts** or **retention milestones**,
those milestones are evidenced by Customer's HRIS or Customer attestation (and/or nurse
confirmation), **not** by ATS application status alone.

**4. Fallback.** Until native API access is provisioned and validated, FlorenceRN may
deliver Customer-ready candidate packets via a secure document link ("manual bridge")
that Customer's recruiters enter into their ATS — preserving service continuity with no
integration dependency.

---

## Why each piece is here

- **The 15-day clock + named contact** is the whole point — it converts "we'll get to
  it" into a dated obligation, which is the difference between a connector that goes live
  in three weeks and one that never does.
- **Sandbox-first** matches how we actually operate: we never write a real candidate to
  a production ATS until the same flow passes against a test tenant.
- **Billing independence** protects your revenue model — a slow IT department can't
  delay subscription start, and start/retention billing stays anchored to HRIS truth
  (the invariant already enforced in code), not to a recruiter clicking a stage.
- **Fallback** is your honest backstop: the manual bridge means you deliver value from
  day one even before any API exists — and (as of the latest build) that bridge now
  hands the recruiter a real, generated resume PDF, not just a link.
