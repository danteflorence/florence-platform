// Gateway module: outbound webhook subscriptions. Partners register an endpoint +
// the event types they want; the canonical event stream fans out to them (signed,
// idempotent — see webhooks.ts). Scoped to webhooks:manage. The signing secret is
// returned ONCE on create.
import { randomBytes } from "node:crypto";
import { compileGw, type GwRoute } from "../router.ts";
import type { Store } from "../../store.ts";
import type { Audit } from "../../audit.ts";
import { id, nowIso } from "../../util.ts";

export function webhooksModule(store: Store, audit: Audit): GwRoute[] {
  return [
    compileGw({
      method: "POST",
      pattern: "/v1/webhooks",
      auth: true,
      scope: "webhooks:manage",
      idempotent: true,
      summary: "Register an outbound webhook subscription (url + event types). Returns the signing secret once.",
      handler: async (ctx) => {
        const b = (ctx.body ?? {}) as Record<string, unknown>;
        const url = typeof b.url === "string" ? b.url : undefined;
        if (!url || !/^https?:\/\//.test(url)) return { status: 400, body: { error: "a valid https url is required" } };
        const eventTypes = Array.isArray(b.event_types) ? (b.event_types as unknown[]).filter((x): x is string => typeof x === "string") : ["*"];
        const secret = randomBytes(24).toString("base64url");
        // Optional consent-scoped binding (lenders): org_id + consent_purpose → events
        // are delivered only for nurses with a live consent for that (purpose, org).
        const orgId = typeof b.org_id === "string" && b.org_id.trim() ? b.org_id.trim() : undefined;
        const consentPurpose = typeof b.consent_purpose === "string" && b.consent_purpose.trim() ? b.consent_purpose.trim() : undefined;
        // Tenant boundary: an org-bound partner caller may only subscribe to ITS OWN org's
        // (consent-scoped) stream — never another tenant's. (Partners don't hold
        // webhooks:manage today; enforce regardless, defense-in-depth.)
        const callerOrg = typeof ctx.claims?.org_id === "string" ? ctx.claims.org_id : undefined;
        if (ctx.claims?.role === "service" && callerOrg && orgId && orgId !== callerOrg) {
          return { status: 403, body: { error: "webhook org_id must match the caller's org" } };
        }
        const sub = { id: id("whk"), url, secret, event_types: eventTypes.length ? eventTypes : ["*"], ...(orgId ? { org_id: orgId } : {}), ...(consentPurpose ? { consent_purpose: consentPurpose } : {}), active: true, created_at: nowIso() };
        await store.insertWebhookSub(sub);
        await audit(String(ctx.claims?.email ?? ctx.claims?.sub ?? "service"), "webhook.subscribe", "webhook", sub.id, { url, event_types: sub.event_types });
        return { status: 201, body: { id: sub.id, url: sub.url, event_types: sub.event_types, active: sub.active, secret } };
      },
    }),
    compileGw({
      method: "GET",
      pattern: "/v1/webhooks",
      auth: true,
      scope: "webhooks:manage",
      summary: "List webhook subscriptions (secrets are never returned here).",
      handler: async () => {
        const subs = (await store.listWebhookSubs()).map((s) => ({ id: s.id, url: s.url, event_types: s.event_types, active: s.active, created_at: s.created_at }));
        return { status: 200, body: { subscriptions: subs } };
      },
    }),
  ];
}
