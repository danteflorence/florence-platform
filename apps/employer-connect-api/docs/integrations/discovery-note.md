# ATS Discovery — the one question to ask

For targets where we haven't confirmed the system of record (Providence, Cedars-Sinai,
Scripps, Ascension, Adventist, CHRISTUS, Baylor Scott & White, Grady), send this before
you send a provisioning sheet. A career-site host (`*.icims.com`, `*.myworkdayjobs.com`,
Phenom front ends, etc.) names the *front end* — not always what hiring actually runs on.

---

### The email (to your champion or their TA/HRIS contact)

> Quick technical question so we line up the integration correctly on our side:
>
> 1. **What is your applicant tracking system (ATS) of record for hiring** — e.g.
>    Workday Recruiting, iCIMS, Oracle Taleo / Oracle Recruiting Cloud, Infor, UKG, SAP
>    SuccessFactors, or something else? (If you run more than one, which handles RN
>    requisitions and candidate workflow?)
> 2. Do you have a **sandbox / implementation tenant** we can validate against before
>    touching production?
> 3. Who is the right **technical / HRIS contact** to coordinate API provisioning?
>
> Once we know the ATS, we'll send a one-page sheet listing exactly what your team
> provisions — or, if you prefer, we can connect with no credentials at all via a
> one-click flow.

---

### Reading the answer → which one-pager to send

| They say… | Send |
|---|---|
| Workday | [workday.md](workday.md) |
| iCIMS | [icims.md](icims.md) |
| Taleo / Oracle Recruiting Cloud | [oracle-taleo.md](oracle-taleo.md) |
| Greenhouse | [greenhouse.md](greenhouse.md) |
| Infor, UKG, SAP SuccessFactors, "not sure," or "we'd rather not hand over creds" | [merge-easy-button.md](merge-easy-button.md) |

For **Infor** specifically: we don't have a native connector today, so route it through
the Merge easy button (or the manual bridge until volume justifies a native build).
