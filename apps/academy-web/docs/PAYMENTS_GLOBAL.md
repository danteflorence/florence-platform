# Global Payments — Stripe + PayMongo + Paystack

_Status: built + smoke-tested 2026-07-13 (mock rails). Every provider is
DORMANT until its env keys exist; a missing regional account never blocks a
signup — the market falls back to the default provider (Stripe cards) in the
local currency._

## How routing works

The candidate's **country** (collected at signup) picks the market:

| Market | Currency | Preferred rail | Methods shown | Fallback |
|---|---|---|---|---|
| Philippines | PHP ₱ | **PayMongo** | GCash · Maya · Card | Stripe cards in ₱ |
| Kenya | KES KSh | **Paystack** | M-Pesa · Card | Stripe cards in KSh |
| Ghana | GHS GH₵ | **Paystack** | MTN MoMo · Card | Stripe cards in GH₵ |
| Nigeria | NGN ₦ | **Paystack** | Bank transfer · Card · USSD | Stripe cards in ₦ |
| Everyone else | USD $ | **Stripe** | Card | mock (dev) |

- Prices localize from the USD quote via **operator-owned anchors** in
  `api/src/markets.ts` (₱57 / KSh129 / GH₵15.5 / ₦1,540 per USD, rounded to
  clean price tags: $100 → ₱5,700, KSh12,900, GH₵1,550, ₦154,000). No live FX
  feed on purpose — prices must be stable for learners and support. **Review
  quarterly** or when a currency moves >10%.
- The server re-derives market/price/provider at checkout from the candidate
  record; nothing client-sent can change what anyone is charged.
- Card data / wallet credentials NEVER touch our servers — every rail is a
  hosted checkout + signed webhook (Stripe HMAC-SHA256, PayMongo HMAC-SHA256
  `te/li`, Paystack HMAC-SHA512).
- `GET /v1/public/market?country=X&usd_cents=N` powers pre-signup price
  display (₱5,700 · GCash/Maya/Card) with no account.

## What the operator must provision (per rail)

### 1. Stripe — cards worldwide (the default)
- US Stripe account, business verified, payout bank connected.
- Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (endpoint:
  `POST /v1/payments/webhook/stripe`).
- In the dashboard: set the statement descriptor (what learners see on their
  card) and enable the presentment currencies (PHP/KES/GHS/NGN work on US
  accounts; Stripe converts at settlement).

### 2. PayMongo — Philippines (GCash, Maya)
- PayMongo merchant account. ⚠ **Settlement geography**: PayMongo settles to a
  **Philippine bank account** — confirm with counsel whether that requires a
  PH entity/partner before going live. (Alternative with the same adapter
  shape if this blocks: Xendit, or a global aggregator like DLocal that
  settles USD to the US.)
- Env: `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET` (endpoint:
  `POST /v1/payments/webhook/paymongo`; subscribe to
  `checkout_session.payment.paid`).

### 3. Paystack — Kenya, Ghana, Nigeria (M-Pesa, MoMo, bank)
- Paystack merchant account (Stripe-owned). Multi-currency (KES/GHS/NGN) may
  require per-market approval in their dashboard — request all three.
- Env: `PAYSTACK_SECRET_KEY` (webhook signature uses the same secret;
  endpoint: `POST /v1/payments/webhook/paystack`; event `charge.success`).

### Go-live gates (in order)
1. **Deploy the API publicly** — all three webhooks need a reachable URL;
   nothing can confirm as paid until then.
2. Stripe test-mode end-to-end (checkout → webhook → pass activates), then
   live keys.
3. Paystack test keys (they have a full test mode incl. simulated M-Pesa).
4. PayMongo test keys + the settlement/entity decision.
5. Set refund policy + statement descriptors everywhere; support macros for
   "my GCash payment didn't register" (answer: webhooks retry; check
   Control Tower payment status).

## Verification record
- `test/markets.ts` (4 checks): country resolution incl. free-text names,
  provider/currency map, price-anchor math, formatting.
- Smoke: PH candidate's $100 checkout charges ₱5,700 with GCash badge; KE →
  KSh12,900 M-Pesa; public probe ₦115,500 for $75; mock-complete guarded by
  the payment row's own processor.
- Live-mode API calls (PayMongo/Paystack/Stripe) exercise the same code path
  smoke covers in mock; first live transaction per rail must be verified by a
  human before announcing the market.
