// Payment provider abstraction for sponsored Global Live access.
//
// SECURITY: card data NEVER touches this service - checkout always happens on the
// provider's HOSTED page. We only create a session and record the result. The
// real Stripe provider is DORMANT unless STRIPE_SECRET_KEY is set; otherwise a
// local mock drives the full flow offline with no money movement.

import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "./config.ts";

export interface CheckoutRequest {
  paymentId: string;
  candidateId: string;
  amountCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  productName?: string;
  /** Required by Paystack (receipt + M-Pesa/MoMo flows key off it). */
  customerEmail?: string;
}
export interface CheckoutResult {
  /** Hosted checkout URL to redirect the browser to. */
  url: string;
  /** Provider's session id, stored on the payment for traceability. */
  providerRef: string;
}
export interface WebhookResult {
  paymentId: string;
  paid: boolean;
  providerRef?: string;
}

export interface PaymentProvider {
  readonly name: string;
  readonly isMock: boolean;
  createCheckout(req: CheckoutRequest): Promise<CheckoutResult>;
  /** Verify a provider webhook and extract our payment id + paid status; null if invalid/irrelevant. */
  verifyWebhook(rawBody: string, signature: string | undefined): WebhookResult | null;
}

// ── Mock provider - offline dev/test; default when no Stripe key ─────────────
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";
  readonly isMock = true;
  private appUrl: string;
  constructor(appUrl: string) {
    this.appUrl = appUrl;
  }
  async createCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
    // A hosted-checkout stand-in served by the SPA, carrying our payment id +
    // amount so the mock screen shows the same number the API will charge.
    const url =
      `${this.appUrl}/#/academy/checkout/mock?pid=${encodeURIComponent(req.paymentId)}` +
      `&amt=${req.amountCents}`;
    return { url, providerRef: `mock_${req.paymentId}` };
  }
  verifyWebhook(): WebhookResult | null {
    // The mock flow completes via the explicit (dev-only) mock-complete route.
    return null;
  }
}

// ── Stripe provider - real Checkout; dormant unless a secret key is present ──
export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";
  readonly isMock = false;
  private secretKey: string;
  private webhookSecret: string | undefined;
  constructor(secretKey: string, webhookSecret: string | undefined) {
    this.secretKey = secretKey;
    this.webhookSecret = webhookSecret;
  }

  async createCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
    const form = new URLSearchParams();
    form.set("mode", "payment");
    form.set("success_url", req.successUrl);
    form.set("cancel_url", req.cancelUrl);
    form.set("client_reference_id", req.candidateId);
    form.set("metadata[payment_id]", req.paymentId);
    form.set("line_items[0][quantity]", "1");
    form.set("line_items[0][price_data][currency]", req.currency);
    form.set("line_items[0][price_data][unit_amount]", String(req.amountCents));
    form.set(
      "line_items[0][price_data][product_data][name]",
      req.productName ?? "Florence Academy Global Live NCLEX Access",
    );
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.secretKey}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const j = (await res.json().catch(() => null)) as
      | { id?: string; url?: string; error?: { message?: string } }
      | null;
    if (!res.ok || !j?.url || !j?.id)
      throw new Error(`stripe checkout failed: ${j?.error?.message ?? res.status}`);
    return { url: j.url, providerRef: j.id };
  }

  verifyWebhook(rawBody: string, signature: string | undefined): WebhookResult | null {
    if (!this.webhookSecret || !signature) return null;
    // Stripe-Signature header: "t=<unix>,v1=<hex>"
    const parts = Object.fromEntries(
      signature.split(",").map((kv) => kv.split("=") as [string, string]),
    );
    const t = parts["t"];
    const v1 = parts["v1"];
    if (!t || !v1) return null;
    const expected = createHmac("sha256", this.webhookSecret).update(`${t}.${rawBody}`).digest("hex");
    const a = Buffer.from(v1);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    let evt: { type?: string; data?: { object?: Record<string, unknown> } };
    try {
      evt = JSON.parse(rawBody);
    } catch {
      return null;
    }
    if (evt.type !== "checkout.session.completed") return null;
    const obj = (evt.data?.object ?? {}) as {
      id?: string;
      payment_status?: string;
      metadata?: { payment_id?: string };
    };
    const paymentId = obj.metadata?.payment_id;
    if (!paymentId) return null;
    return { paymentId, paid: obj.payment_status === "paid", providerRef: obj.id };
  }
}

// ── PayMongo - Philippines (GCash / Maya / cards), PHP. Dormant unless keyed ─
// Same posture as Stripe: HOSTED checkout only, we never see wallet or card
// credentials. https://developers.paymongo.com - Checkout Sessions API.
export class PayMongoPaymentProvider implements PaymentProvider {
  readonly name = "paymongo";
  readonly isMock = false;
  private secretKey: string;
  private webhookSecret: string | undefined;
  constructor(secretKey: string, webhookSecret: string | undefined) {
    this.secretKey = secretKey;
    this.webhookSecret = webhookSecret;
  }

  async createCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
    const res = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${this.secretKey}:`).toString("base64")}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        data: {
          attributes: {
            line_items: [
              {
                name: req.productName ?? "Florence Academy Global Live NCLEX Access",
                amount: req.amountCents, // centavos
                currency: req.currency.toUpperCase(), // PHP
                quantity: 1,
              },
            ],
            payment_method_types: ["gcash", "paymaya", "card"],
            success_url: req.successUrl,
            cancel_url: req.cancelUrl,
            reference_number: req.paymentId,
            description: `candidate ${req.candidateId}`,
          },
        },
      }),
    });
    const j = (await res.json().catch(() => null)) as
      | { data?: { id?: string; attributes?: { checkout_url?: string } }; errors?: { detail?: string }[] }
      | null;
    const url = j?.data?.attributes?.checkout_url;
    if (!res.ok || !url || !j?.data?.id)
      throw new Error(`paymongo checkout failed: ${j?.errors?.[0]?.detail ?? res.status}`);
    return { url, providerRef: j.data.id };
  }

  verifyWebhook(rawBody: string, signature: string | undefined): WebhookResult | null {
    if (!this.webhookSecret || !signature) return null;
    // Paymongo-Signature: "t=<unix>,te=<hex>,li=<hex>" (te=test mode, li=live)
    const parts = Object.fromEntries(
      signature.split(",").map((kv) => kv.split("=") as [string, string]),
    );
    const t = parts["t"];
    const sig = parts["li"] || parts["te"];
    if (!t || !sig) return null;
    const expected = createHmac("sha256", this.webhookSecret).update(`${t}.${rawBody}`).digest("hex");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    let evt: {
      data?: { attributes?: { type?: string; data?: { id?: string; attributes?: Record<string, unknown> } } };
    };
    try {
      evt = JSON.parse(rawBody);
    } catch {
      return null;
    }
    const type = evt.data?.attributes?.type;
    if (type !== "checkout_session.payment.paid") return null;
    const session = evt.data?.attributes?.data;
    const attrs = (session?.attributes ?? {}) as { reference_number?: string; payment_intent?: unknown };
    const paymentId = attrs.reference_number;
    if (!paymentId) return null;
    return { paymentId, paid: true, providerRef: session?.id };
  }
}

// ── Paystack - Kenya / Ghana / Nigeria (M-Pesa, MoMo, cards, bank). Stripe-
// owned; settles per-market. Hosted checkout via transaction/initialize. ─────
export class PaystackPaymentProvider implements PaymentProvider {
  readonly name = "paystack";
  readonly isMock = false;
  private secretKey: string;
  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  async createCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
    if (!req.customerEmail) throw new Error("paystack requires the customer email");
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.secretKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: req.customerEmail,
        amount: req.amountCents, // subunits (kobo / cents / pesewas)
        currency: req.currency.toUpperCase(), // KES | GHS | NGN
        reference: req.paymentId,
        callback_url: req.successUrl,
        metadata: {
          candidate_id: req.candidateId,
          product_name: req.productName ?? "Florence Academy Global Live NCLEX Access",
          cancel_action: req.cancelUrl,
        },
      }),
    });
    const j = (await res.json().catch(() => null)) as
      | { status?: boolean; message?: string; data?: { authorization_url?: string; reference?: string } }
      | null;
    const url = j?.data?.authorization_url;
    if (!res.ok || !j?.status || !url)
      throw new Error(`paystack checkout failed: ${j?.message ?? res.status}`);
    return { url, providerRef: j.data?.reference ?? req.paymentId };
  }

  verifyWebhook(rawBody: string, signature: string | undefined): WebhookResult | null {
    if (!signature) return null;
    // x-paystack-signature: HMAC-SHA512 of the raw body with the SECRET KEY.
    const expected = createHmac("sha512", this.secretKey).update(rawBody).digest("hex");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    let evt: { event?: string; data?: { reference?: string; status?: string } };
    try {
      evt = JSON.parse(rawBody);
    } catch {
      return null;
    }
    if (evt.event !== "charge.success") return null;
    const paymentId = evt.data?.reference;
    if (!paymentId) return null;
    return { paymentId, paid: evt.data?.status === "success", providerRef: paymentId };
  }
}

export function selectPaymentProvider(): PaymentProvider {
  const key = config.payments.stripeSecretKey;
  return key
    ? new StripePaymentProvider(key, config.payments.stripeWebhookSecret)
    : new MockPaymentProvider(config.publicAppUrl);
}

// ── Market routing ───────────────────────────────────────────────────────────
// Each regional provider wakes only when its env keys exist; otherwise the
// market falls back to the default provider (Stripe if keyed, else mock) so a
// missing PayMongo account never blocks a Manila signup - it just takes cards.
let regionalCache: Partial<Record<string, PaymentProvider>> | null = null;

function regionalProviders(): Partial<Record<string, PaymentProvider>> {
  if (regionalCache) return regionalCache;
  regionalCache = {};
  const pmKey = process.env["PAYMONGO_SECRET_KEY"] ?? "";
  if (pmKey)
    regionalCache["paymongo"] = new PayMongoPaymentProvider(
      pmKey,
      process.env["PAYMONGO_WEBHOOK_SECRET"] || undefined,
    );
  const psKey = process.env["PAYSTACK_SECRET_KEY"] ?? "";
  if (psKey) regionalCache["paystack"] = new PaystackPaymentProvider(psKey);
  return regionalCache;
}

/** Provider for a market's preferred rail, falling back to the default. */
export function providerForMarket(preferred: string, fallback: PaymentProvider): PaymentProvider {
  return regionalProviders()[preferred] ?? fallback;
}

/** Provider by exact name (webhook dispatch); null when not configured. */
export function providerByName(name: string, fallback: PaymentProvider): PaymentProvider | null {
  if (name === fallback.name || name === "stripe") return fallback;
  return regionalProviders()[name] ?? null;
}

/** Test hook: reset the regional provider cache after env changes. */
export function resetRegionalProviders(): void {
  regionalCache = null;
}
