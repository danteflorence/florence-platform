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

export function selectPaymentProvider(): PaymentProvider {
  const key = config.payments.stripeSecretKey;
  return key
    ? new StripePaymentProvider(key, config.payments.stripeWebhookSecret)
    : new MockPaymentProvider(config.publicAppUrl);
}
