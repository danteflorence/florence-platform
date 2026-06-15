# FlorenceRN ATS Connect — Integration Enablement Kit

Everything you hand a health system to get FlorenceRN connected to their ATS — so
the connector goes live the day they say yes, instead of stalling in their IT queue.

There are two documents per deal:

1. **The contract clause** ([`contract-integration-clause.md`](contract-integration-clause.md)) — drop into the
   Order Form / MSA. It obligates the customer to provision API access and a sandbox
   within a defined window, and states *our* reciprocal security & data commitments.
   Without this clause, every integration waits behind the hospital's IT backlog with
   no deadline. **This is the single highest-leverage thing on our side.**

2. **The ATS provisioning one-pager** — the exact "here's what to create and what to
   send us" sheet you hand their IT / HRIS team. One per platform below.

---

## The two ways a system can connect

Offer the **easy button first** — most teams will take it.

| Path | What the customer does | Time to live | When to use |
|---|---|---|---|
| **Merge easy button** ([`merge-easy-button.md`](merge-easy-button.md)) | Clicks "Connect your ATS," signs into their own ATS once in a popup. No credentials handed to us. | Minutes | Default offer to everyone. Covers Workday, iCIMS, UKG, SF, etc. through one flow. |
| **Native credentials** (per-ATS one-pagers below) | Their IT provisions a service account / API client and sends us the credentials. | 1–3 weeks | When they want a direct integration, the aggregator's write support is thin for their tenant, or volume makes a native connection worth it. |

Both land in the same place in our system: encrypted in the vault, connector flips
`not_started → credentials_pending → sandbox → active`.

---

## Your 16 targets → which one-pager to send

| Health system | ATS (researched) | One-pager | Confidence |
|---|---|---|---|
| Tenet Healthcare | Taleo (+ Oracle Recruiting Cloud migrating) | [oracle-taleo](oracle-taleo.md) | Confirmed — verify which tenant |
| Kaiser Permanente | Taleo | [oracle-taleo](oracle-taleo.md) | Confirmed |
| CommonSpirit Health | iCIMS | [icims](icims.md) | Confirmed |
| BJC HealthCare | iCIMS | [icims](icims.md) | Confirmed |
| Sutter Health | Workday (+ iCIMS subsets) | [workday](workday.md) | Confirmed |
| Trinity Health (Novi, MI) | Workday | [workday](workday.md) | Confirmed |
| Advocate Health | Workday | [workday](workday.md) | Confirmed |
| Sharp HealthCare | Workday | [workday](workday.md) | Probable |
| Providence | confirm at permission time | [merge easy button](merge-easy-button.md) first | Unknown |
| Cedars-Sinai | confirm (careers.cshs.org front end) | [merge easy button](merge-easy-button.md) first | Unknown |
| Scripps Health | confirm (careers.scripps.org front end) | [merge easy button](merge-easy-button.md) first | Unknown |
| Ascension | confirm (Phenom front end) | [merge easy button](merge-easy-button.md) first | Unknown |
| Adventist Health | confirm at permission time | [merge easy button](merge-easy-button.md) first | Unknown |
| CHRISTUS Health | likely Infor (no native connector yet) | [merge easy button](merge-easy-button.md) | Probable |
| Baylor Scott & White | confirm (Phenom front end) | [merge easy button](merge-easy-button.md) first | Unknown |
| Grady Health System | confirm at permission time | [merge easy button](merge-easy-button.md) first | Unknown |

For the "Unknown" rows, lead with the Merge easy button (it discovers and connects
their ATS for you) or send the one-line discovery question in
[`discovery-note.md`](discovery-note.md) to find out what to provision.

> A career-site host (e.g. `*.myworkdayjobs.com`, `*.icims.com`, `*.taleo.net`) names
> the front-end ATS but **not always the system of record for hiring** — large systems
> run more than one and migrate between them. Always confirm the live tenant before we
> build. Our connectors run in **mock mode** until a real tenant is confirmed and tested.

---

## The lifecycle (what each `integrationStatus` means)

```
not_started ──► credentials_pending ──► sandbox ──► active
   (seeded)      (signed; awaiting        (creds in   (validated against a real
                  their IT to provision)   vault;      requisition; native submit
                                           testing)    + status sync turned on)
```

We never write a real candidate into a production ATS until we've validated the same
flow against a **sandbox / implementation tenant** first. The contract clause asks for
sandbox access precisely so this gate exists.

---

## Security review (it will come up)

Hospital infosec will ask before they provision anything. The reusable answers —
data minimization, candidate consent, least-privilege scopes, deprovisioning, the
SOC 2 / HECVAT posture — are in [`security-faq.md`](security-faq.md). Attach it to the
one-pager when you send it; it shortcuts the first round of questions.
