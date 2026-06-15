// Outbound webhooks — fan canonical events out to partner endpoints with an HMAC
// signature, idempotently. Mock-by-default: records a signed delivery (no real POST)
// unless WEBHOOKS_LIVE=1, so the suite is reproducible offline and nothing leaves the
// box without explicit opt-in. Never throws into the caller.
import { createHmac } from "node:crypto";
import type { Store, WebhookDelivery } from "./store.ts";
import { consentAllows } from "./consent.ts";
import { nowIso } from "./util.ts";

const WEBHOOKS_LIVE = process.env.WEBHOOKS_LIVE === "1";

/** Standard webhook signature: sha256 HMAC of the raw body, hex, `sha256=`-prefixed. */
export function signPayload(secret: string, body: string): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

export interface DispatchableEvent {
  id: string;
  type: string;
  nurseId: string;
  data?: Record<string, unknown>;
}

/** Fan an event out to matching active subscriptions. Idempotent by (sub, event). */
export async function dispatchWebhooks(store: Store, event: DispatchableEvent): Promise<WebhookDelivery[]> {
  const subs = (await store.listWebhookSubs()).filter(
    (s) => s.active && (s.event_types.includes("*") || s.event_types.includes(event.type)),
  );
  const out: WebhookDelivery[] = [];
  for (const s of subs) {
    // Consent-scoped delivery (lenders): only deliver a nurse's event if a live consent
    // for (consent_purpose, org_id) exists for that nurse. No consent → no delivery.
    if (s.org_id && s.consent_purpose) {
      const ok = consentAllows(await store.consentsByNurse(event.nurseId), s.consent_purpose, s.org_id).ok;
      if (!ok) continue;
    }
    const envelope = JSON.stringify({ id: event.id, type: event.type, nurseId: event.nurseId, data: event.data ?? {} });
    const signature = signPayload(s.secret, envelope);
    const delivery: WebhookDelivery = {
      id: `${s.id}:${event.id}`,
      sub_id: s.id,
      event_id: event.id,
      event_type: event.type,
      status: "recorded",
      signature,
      created_at: nowIso(),
    };
    const fresh = await store.recordWebhookDelivery(delivery);
    if (!fresh) continue; // already delivered for this (sub, event) — idempotent
    if (WEBHOOKS_LIVE) {
      try {
        await fetch(s.url, {
          method: "POST",
          headers: { "content-type": "application/json", "x-florence-signature": signature, "x-florence-event": event.type },
          body: envelope,
        });
        delivery.status = "sent";
      } catch {
        delivery.status = "failed";
      }
    }
    out.push(delivery);
  }
  return out;
}
