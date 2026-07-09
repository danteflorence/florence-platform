# The Easy Button — Connect Your ATS in Minutes (Merge)

**For: everyone.** Offer this first. It covers Workday, iCIMS, UKG, SAP SuccessFactors,
Greenhouse and 20+ other ATSs through **one** flow, and **your IT never hands us any
credentials**.

---

### How it works (for the customer)
1. We send you (or you open in the FlorenceRN portal) a **"Connect your ATS"** button.
2. You pick your ATS and **sign in once** in a secure popup — authenticating to *your own*
   ATS, the same way you'd sign into any app.
3. That's it. Behind the scenes a durable, revocable connection token is created and
   stored encrypted on our side. We never see your username, password, or API secret.

No service account to build, no permissions matrix to configure, no credentials to email.
Most teams are connected in **minutes**, not weeks.

### What it does once connected
Exactly what the native connectors do: read your open RN requisitions, create a candidate
+ application on the ones you authorize, and read application status back — all through
one normalized integration.

### What you (FlorenceRN) provision to enable this
This path requires **a Merge account on the FlorenceRN side** (commercial step you own):
- A Merge organization + API key, billed **per linked account** (each connected customer
  = one linked account). Budget this as a per-customer cost.
- Before evaluating, confirm Merge's **write** support (create candidate + application +
  attachment) is solid for the specific ATSs your targets run — Workday and iCIMS
  especially. If a given tenant's write coverage is thin, fall back to that ATS's native
  one-pager. *(Worth a head-to-head with Kombo on Workday/iCIMS write depth before you
  commit — but Merge is already wired in our code, so it's the default if writes check
  out.)*

### When to use native credentials instead
- The customer's security team prefers to issue a scoped service account they fully
  control (some hospital infosec teams will insist on this).
- The aggregator's write support is thin for that tenant.
- Volume on a single tenant makes a direct connection cheaper than the per-account fee.

### Revocation
The customer can disconnect at any time from their own ATS's connected-apps settings, or
ask us to revoke — the token dies immediately.
