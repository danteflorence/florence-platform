// Gateway module: Production Ledger + events (Core canonical). The Core nurse_events
// log IS the canonical Production Ledger; this exposes the platform-friendly
// POST /v1/events (idempotent) + GET /v1/events + GET /v1/ledger (canonical stage
// timeline) over it. Apps emit here (write-through) so there is ONE event truth.
import { compileGw, type GwCtx, type GwRoute } from "../router.ts";
import type { Store } from "../../store.ts";
import type { Audit } from "../../audit.ts";
import { lookupNurse, recordEvent, resolveNurse, type ResolveInput } from "../../nurses.ts";
import { foldPassport } from "../../passport.ts";
import { canonicalStage } from "../../ledgerStages.ts";
import { dispatchWebhooks } from "../../webhooks.ts";

function bstr(b: Record<string, unknown>, k: string): string | undefined {
  return typeof b[k] === "string" ? (b[k] as string) : undefined;
}

/** Build a nurse selector from a request body (ref {app,externalId} | flat | candidate_id). */
function inputFromBody(b: Record<string, unknown>): ResolveInput | undefined {
  let ref: { app: string; externalId: string } | undefined;
  const r = b.ref;
  if (r && typeof r === "object") {
    const app = (r as Record<string, unknown>).app;
    const ext = (r as Record<string, unknown>).externalId;
    if (typeof app === "string" && typeof ext === "string") ref = { app, externalId: ext };
  }
  const input: ResolveInput = { nurseId: bstr(b, "nurseId") ?? bstr(b, "candidate_id"), email: bstr(b, "email"), name: bstr(b, "name"), ref };
  if (!input.nurseId && !input.email && !input.ref) return undefined;
  return input;
}

function selectorFromQuery(ctx: GwCtx): { nurseId?: string; email?: string; ref?: string } {
  return {
    nurseId: ctx.query.get("nurseId") ?? ctx.query.get("nurse_id") ?? ctx.query.get("candidate_id") ?? undefined,
    email: ctx.query.get("email") ?? undefined,
    ref: ctx.query.get("ref") ?? undefined,
  };
}

export function ledgerModule(store: Store, audit: Audit): GwRoute[] {
  return [
    compileGw({
      method: "POST",
      pattern: "/v1/events",
      auth: true,
      scope: "ledger:write",
      idempotent: true,
      summary: "Record a platform event (→ the canonical Production Ledger).",
      handler: async (ctx) => {
        const b = (ctx.body ?? {}) as Record<string, unknown>;
        const type = bstr(b, "event_type") ?? bstr(b, "type");
        if (!type) return { status: 400, body: { error: "event_type required" } };
        const input = inputFromBody(b);
        if (!input) return { status: 400, body: { error: "need a nurse selector (nurseId/email/ref/candidate_id)" } };
        const nurse = await resolveNurse(store, input);
        const data = (b.payload && typeof b.payload === "object" ? b.payload : b.data && typeof b.data === "object" ? b.data : {}) as Record<string, unknown>;
        const ev = await recordEvent(store, nurse.id, { type, source: bstr(b, "source_system") ?? bstr(b, "source") ?? "platform_api", data });
        await audit(String(ctx.claims?.email ?? ctx.claims?.sub ?? "service"), "v1.event.write", "nurse", nurse.id, { type });
        // Fan the event out to subscribed partner webhooks (signed, idempotent, mock-by-default).
        const delivered = await dispatchWebhooks(store, { id: ev.id, type, nurseId: nurse.id, data }).catch(() => []);
        return { status: 201, body: { ok: true, eventId: ev.id, nurseId: nurse.id, webhooksDelivered: delivered.length } };
      },
    }),
    compileGw({
      method: "GET",
      pattern: "/v1/events",
      auth: true,
      scope: "ledger:read",
      summary: "Events for a nurse (oldest-first).",
      handler: async (ctx) => {
        const nurse = await lookupNurse(store, selectorFromQuery(ctx));
        if (!nurse) return { status: 404, body: { error: "nurse_not_found" } };
        return { status: 200, body: { nurseId: nurse.id, events: await store.eventsByNurse(nurse.id) } };
      },
    }),
    compileGw({
      method: "GET",
      pattern: "/v1/ledger",
      auth: true,
      scope: "ledger:read",
      summary: "Canonical production-ledger timeline + current stage for a nurse.",
      handler: async (ctx) => {
        const nurse = await lookupNurse(store, selectorFromQuery(ctx));
        if (!nurse) return { status: 404, body: { error: "nurse_not_found" } };
        const [refs, events] = await Promise.all([store.refsByNurse(nurse.id), store.eventsByNurse(nurse.id)]);
        const passport = foldPassport(nurse, refs, events);
        return { status: 200, body: { nurseId: nurse.id, currentStage: canonicalStage(passport), funnelStage: passport.funnelStage, events: events.map((e) => ({ type: e.type, at: e.at })) } };
      },
    }),
  ];
}
