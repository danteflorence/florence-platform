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
import { consentAllows } from "../../consent.ts";
import { actorFromClaims, authorizeTenantAccessWithAudit, type ProgramScope } from "../../tenantAccess.ts";
import { requiresApplicationGateForEvent } from "../../applicationGate.ts";

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

const actorOf = (ctx: GwCtx): string => String(ctx.claims?.email ?? ctx.claims?.sub ?? "service");

function sensitiveAuditAction(type: string, source: string): string | undefined {
  const value = `${source}.${type}`.toLowerCase();
  if (/lendkey/.test(value)) return "lendkey.handoff";
  if (/sevismate|sevis[_\s-]?mate/.test(value)) return "sevismate.handoff";
  if (/financ|loan|underwriting/.test(value) && /handoff|packet|submitted|sent/.test(value)) return "financing.handoff";
  if (/(ats|vms).*(submi|packet)|packet.*(ats|vms)/.test(value)) return "ats_vms.submission";
  if (/employer[_\s-]?packet.*create/.test(value)) return "employer_packet.create";
  if (/employer[_\s-]?packet.*share/.test(value)) return "employer_packet.share";
  if (/employer[_\s-]?packet.*view/.test(value)) return "employer_packet.view";
  if (/lender[_\s-]?packet.*create/.test(value)) return "lender_packet.create";
  if (/lender[_\s-]?packet.*share/.test(value)) return "lender_packet.share";
  if (/lender[_\s-]?packet.*view/.test(value)) return "lender_packet.view";
  if (/export.*generated|bulk[_\s-]?export/.test(value)) return "export.generated";
  if (/webhook.*received/.test(value) || source.toLowerCase() === "webhook") return "webhook.received";
  return undefined;
}

function programForPassport(passport: ReturnType<typeof foldPassport>): ProgramScope | undefined {
  const ownerOrgId = passport.placement.employerId;
  if (!ownerOrgId) return undefined;
  const id = passport.placement.jobReqId ? `${ownerOrgId}:${passport.placement.jobReqId}` : ownerOrgId;
  return { id, tenantId: ownerOrgId, ownerOrgId, kind: "employer_direct", employerOrgId: ownerOrgId, status: "active" };
}

async function enforceLedgerRead(ctx: GwCtx, store: Store, audit: Audit, nurseId: string): Promise<{ ok: true; passport: ReturnType<typeof foldPassport>; events: Awaited<ReturnType<Store["eventsByNurse"]>> } | { ok: false; status: number; body: unknown }> {
  const [refs, events, consents] = await Promise.all([store.refsByNurse(nurseId), store.eventsByNurse(nurseId), store.consentsByNurse(nurseId)]);
  const passport = foldPassport((await store.getNurseById(nurseId))!, refs, events);
  const orgId = ctx.claims?.org_id;
  const consentOk = Boolean(orgId && (consentAllows(consents, "employer_share", orgId).ok || consentAllows(consents, "underwriting", orgId).ok));
  const program = programForPassport(passport);
  const decision = await authorizeTenantAccessWithAudit(audit, {
    actor: actorFromClaims(ctx.claims),
    action: "read",
    purpose: "employer_share",
    resource: {
      type: "production_ledger",
      id: nurseId,
      ownerOrgId: program?.ownerOrgId ?? orgId,
      ...(program ? { programId: program.id } : {}),
      consentOk,
      workflowGateOk: true,
      allowedInternalRoles: ["super_admin", "ops", "qa"],
    },
    ...(program ? { programScope: program } : {}),
  });
  if (!decision.allow) return { ok: false, status: 403, body: { error: "forbidden", reason: decision.reason } };
  return { ok: true, passport, events };
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
        const source = bstr(b, "source_system") ?? bstr(b, "source") ?? "platform_api";
        if (requiresApplicationGateForEvent(type)) {
          return { status: 409, body: { error: "application_gate_required", detail: "Formal employer application/submission events must be created through /v1/applications/submit." } };
        }
        const ev = await recordEvent(store, nurse.id, { type, source, data });
        await audit(String(ctx.claims?.email ?? ctx.claims?.sub ?? "service"), "v1.event.write", "nurse", nurse.id, { type });
        const sensitiveAction = sensitiveAuditAction(type, source);
        if (sensitiveAction) {
          await audit(actorOf(ctx), sensitiveAction, "nurse", nurse.id, {
            type,
            source,
            eventId: ev.id,
          });
        }
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
        const access = await enforceLedgerRead(ctx, store, audit, nurse.id);
        if (!access.ok) return { status: access.status, body: access.body };
        await audit(actorOf(ctx), "ledger.events.read", "nurse", nurse.id, { count: access.events.length });
        return { status: 200, body: { nurseId: nurse.id, events: access.events } };
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
        const access = await enforceLedgerRead(ctx, store, audit, nurse.id);
        if (!access.ok) return { status: access.status, body: access.body };
        await audit(actorOf(ctx), "ledger.read", "nurse", nurse.id, { currentStage: canonicalStage(access.passport), count: access.events.length });
        return { status: 200, body: { nurseId: nurse.id, currentStage: canonicalStage(access.passport), funnelStage: access.passport.funnelStage, events: access.events.map((e) => ({ type: e.type, at: e.at })) } };
      },
    }),
  ];
}
