# Going live: Payments (Stripe) + Postgres

Both are built and verified locally. The code stays **dormant/mock** until you supply
the secrets below — by design, I don't create accounts, enter API keys, or move money.
Everything here is your half of the handoff.

---

## Postgres (durable persistence)

The API uses Postgres automatically whenever `DATABASE_URL` is set; otherwise it runs
the in-memory adapter (data resets on restart). Same `Store` contract either way.

**Steps**
1. Provision a Postgres (Neon / Supabase / RDS / local) and grab its connection string.
2. In `api/`: `npm i pg` (the adapter lazy-imports it; it's an optional dependency).
3. Apply the schema (idempotent):
   ```bash
   DATABASE_URL=postgres://user:pass@host:5432/florence npm run migrate
   ```
4. Start the API with the same `DATABASE_URL`. The startup log will read
   `[store] Postgres (DATABASE_URL)`.

**Notes**
- PII / financial columns are encrypted app-side before they hit Postgres. Dev derives
  the key from `FIELD_ENC_PASSPHRASE`; for production, supply a KMS-backed data key
  (see `api/src/crypto.ts` / `kms.ts`) and set a strong `FIELD_ENC_PASSPHRASE` (never
  commit it).
- Least-privilege grants for the app DB role are documented at the bottom of
  `api/db/schema.sql`.

---

## Payments (Stripe Checkout — hosted)

Card data never touches our service: checkout happens on Stripe's hosted page; we only
create the session and record the result (session id, encrypted). Until you set a Stripe
secret key, a local **mock** provider drives the whole flow with no money movement.

**Steps**
1. Create a Stripe account (you must do this — I can't create accounts or enter keys).
2. Set these in the API environment:
   - `STRIPE_SECRET_KEY` — start with the **test** key (`sk_test_…`).
   - `STRIPE_WEBHOOK_SECRET` — the signing secret (`whsec_…`) from the webhook you create next.
   - `PUBLIC_APP_URL` — the deployed learner app origin (used for success/cancel return URLs).
3. In the Stripe dashboard, add a webhook endpoint:
   - URL: `https://<your-api-host>/v1/payments/webhook/stripe`
   - Event: `checkout.session.completed`
4. Restart the API. The startup log will read `[payments] Stripe Checkout (live)`, and:
   - `/v1/payments/checkout` now returns a real Stripe URL,
   - the mock checkout page and the dev-only `mock-complete` endpoint **auto-disable**,
   - on payment, the signed webhook marks the deposit paid and advances the candidate
     from `registered` → `deposit_paid` (the Control Tower funnel reflects it).
5. Test end-to-end with Stripe **test mode** (test cards) before switching to live keys.

**What's already wired (no further code needed)**
- Provider abstraction with a real `StripePaymentProvider` (Checkout session create +
  signature-verified webhook) in `api/src/payments.ts`.
- Learner "Reserve your seat — $100" flow on the Account page → hosted checkout → return.
- Deposit amount/currency are env-tunable (`DEPOSIT_AMOUNT_CENTS`, `DEPOSIT_CURRENCY`).

**Stays true in production**
- No card data in our app or database.
- `mock-complete` is refused whenever a real provider is configured.
- The webhook is rejected unless its Stripe signature verifies against `STRIPE_WEBHOOK_SECRET`.

---

## Email verification

Signup issues a single-use, expiring verification token and "sends" it. With no
email provider configured, a **mock** provider logs the message and the signup/
resend responses carry a `dev_url` so the flow completes locally with no inbox.

**Steps to deliver real email**
1. Set `EMAIL_RELAY_URL` to an endpoint that accepts `POST {to, subject, text, html}`
   and relays it via your ESP (SendGrid/Postmark/SES/SMTP bridge). Optionally set
   `EMAIL_RELAY_AUTH` (sent as the `Authorization` header).
2. Restart — the log reads `[email] relay delivery (live)`, and `dev_url` stops
   appearing in responses.
3. Set `PUBLIC_APP_URL` so the verification link points at the deployed app
   (`…/#/academy/verify?token=…`).

**Enforcement (optional)**
- Set `REQUIRE_EMAIL_VERIFICATION=1` to require a verified email before a candidate
  can start the deposit checkout. **Default is off**, so the no-email dev flow keeps
  working; turn it on once real delivery is wired.

**Endpoints**: `POST /v1/auth/verify {token}` (single-use), `POST /v1/auth/resend`
(candidate session). `/v1/me` exposes `email_verified`.

---

## Florence Pathway Agent handoff

The Academy is the **readiness intake layer**; it does not own pathway/visa routing.
When a candidate is pathway-ready, an operator triggers
`POST /v1/candidates/:id/pathway-handoff` (scope `enrollment:write`; never a
candidate session). The API computes the readiness snapshot and **POSTs a
purpose-limited intake** to the Florence Pathway Agent. Dormant by default: with no
`PATHWAY_AGENT_URL` a mock logs a dry-run (the response echoes the `intake` so you can
see the contract).

**To connect the live Pathway Agent**
1. Set `PATHWAY_AGENT_URL` to the Agent's intake endpoint (and optionally
   `PATHWAY_AGENT_AUTH`, sent as `Authorization`).
2. The Agent receives this payload and owns the rest (university/visa/financing/
   licensure) under **AI drafts → human QA → candidate attests**:
   ```json
   {
     "source": "florence-academy",
     "candidate": { "id": "cand_…", "full_name": "…", "email": "…", "country": "…" },
     "readiness": { "band": "green", "route": "interview_ready", "readiness": 0.86,
                    "focus_areas": ["…"], "sections_completed": 14, "sections_total": 20 },
     "consent": { "service": true, "crm_sync": false, "underwriting": false },
     "occurred_at": "…"
   }
   ```
- No financial/ARR fields cross the boundary — only education readiness + consent.
- The Academy's `route` is **readiness** routing (interview-ready / repeat / bridge /
  credential-repair), not pathway routing; the Agent decides the compliant path.
