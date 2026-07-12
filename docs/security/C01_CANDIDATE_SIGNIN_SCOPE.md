# C01 Full Close — Candidate Sign-In Scope

**Status:** scoping (2026-07-12). C01 is currently **mitigated** by the shadow-first
`PATHWAY_REQUIRE_AUTH` switch (default OFF). This document scopes the work required to
flip it **ON** in staging/prod, which is the full close.

## Why this is the gate

`apps/pathway-api/server/routes/index.ts` already fails closed on anonymous access when
`PATHWAY_REQUIRE_AUTH=1` (401 on `/candidates/:id` + `/workflows/:id`) and already binds a
candidate token to its own record (`p.cand !== req.params.id ⇒ 403`). The switch is OFF
only because **candidates have no way to sign in** — the Candidate Copilot is anonymous, so
turning the gate on today would lock real candidates out of their own dossier. The full
close is therefore a **candidate authentication feature**, not more gate logic.

## What already exists (reuse — do NOT rebuild)

- **Core is the IdP.** `apps/core-api` issues the RS256 `fl_session` cookie, has
  `/auth/password` + `/login` + Google OIDC, and already mints the **`cand` claim**
  (`routes.ts:397,515`) that binds a token to a candidate record.
- **Pathway already trusts Core.** `server/coreAuth.ts` (vendored `packages/auth-sdk`)
  verifies the token via JWKS; the binding middleware + `PATHWAY_REQUIRE_AUTH` gate are in
  place. Nothing on the enforcement side needs to change.
- **Shared-cookie SSO** across the fleet is already proven (staff flow). A candidate who
  signs in at Core gets the same domain-wide cookie every app honors.
- **`app-web`** unified shell + `coreClient.ts` is the natural host for the candidate login
  surface.

## The gap (net-new)

1. **A candidate authentication method** (see decision below) — Google Workspace SSO is
   staff-only; external nurses need their own path.
2. **Candidate account provisioning + `cand` binding.** Each Pathway candidate needs a Core
   user (`role=candidate`) whose `cand` claim equals the Pathway candidate id (or a linked
   ref the existing reconciliation resolves). This must be created at candidate-intake time
   and back-filled for existing candidates.
3. **A sign-in UI** in `app-web`/pathway that redirects unauthenticated candidates to Core
   login (`loginUrl(returnTo)`), then reads `/session` to confirm identity — mirroring the
   staff redirect flow, but with the candidate auth method.
4. **The flip-on rollout** (staging → prod) with `PATHWAY_REQUIRE_AUTH=1`.

## The one decision to make — candidate auth method

| Option | UX for IEN nurses | Build cost | Notes |
|---|---|---|---|
| **Email magic-link / OTP (recommended)** | Best — no password to manage/reset; works on any device abroad | Medium — Core needs an OTP/magic-link grant + an email sender | Avoids storing candidate passwords; aligns with the "don't enter passwords" posture; needs transactional email (operator-provisioned) |
| Email + password | Familiar | Low — Core `/auth/password` already exists | Password reset burden, weaker for a low-frequency consumer flow; more account-recovery support load |
| Delegate to Academy identity | Zero new method **if** the candidate already has an Academy login | Low–Medium — depends on Academy candidate auth maturity + `cand` reconciliation across products | Only viable for candidates who are also Academy learners; not universal |

**Recommendation:** email magic-link/OTP. It is the most usable for an international,
low-login-frequency audience, keeps candidate passwords out of the system, and the `cand`
minting + cookie plumbing already exist — the only genuinely new Core primitive is an
OTP/magic-link grant endpoint + a transactional email hook (mock-by-default like the rest).

## Workstreams (once the method is chosen)

- **Core:** OTP/magic-link grant + verify endpoints that mint an `fl_session` with
  `role=candidate` + the candidate's `cand`; rate-limited; audited; mock email in dev.
- **Provisioning:** create the Core candidate user + `cand` binding at Pathway
  candidate-intake; a one-time back-fill job for existing candidates; reconcile
  `cand ⇔ pathway candidate id` (the C02 ref-matching path already resolves this for
  Passport reads).
- **Frontend (`app-web`/pathway):** candidate login page → Core redirect → `/session`
  gate; "signed in as" state; sign-out.
- **Rollout:** ship behind the existing gate OFF → enable `PATHWAY_REQUIRE_AUTH=1` in
  **staging** → verify → prod.

## Flip-on verification (the C01 close criteria)

With `PATHWAY_REQUIRE_AUTH=1` in staging:
1. Anonymous `GET /candidates/:id` + `/workflows/:id` ⇒ **401** (no lockout of real users
   because sign-in now exists).
2. Candidate token for **their own** record ⇒ **200**.
3. Candidate token for a **different** candidate ⇒ **403** (already proven by
   `pathway-v1-smoke`).
4. Staff token ⇒ **200** (unchanged).

Then update `SECURITY_FINDINGS.md` C01 → Remediated and set `PATHWAY_REQUIRE_AUTH=1` in the
prod Terraform/secrets.

## Effort & risk

- **Effort:** ~1 focused build cycle. Largest piece is the Core OTP/magic-link grant +
  email hook; the frontend redirect and the gate are small (both already half-built).
- **Risk:** the **back-fill** — every existing Pathway candidate must get a Core account +
  `cand` binding before the flip, or they're locked out. Sequence: provision + back-fill →
  verify coverage → flip. Keep the switch reversible (env) as the rollback.
- **Operator-owned:** the transactional email provider (for magic-link), and setting
  `PATHWAY_REQUIRE_AUTH=1` in the deployed env after sign-in ships.
