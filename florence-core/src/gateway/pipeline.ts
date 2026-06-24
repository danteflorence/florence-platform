// The Platform API gateway pipeline: one front door for every /v1/* request.
// authenticate (Core RS256 cookie or Bearer) → static scope gate → handler → send.
// Lives INSIDE Core (zero-dep node:http) so canonical reads need no extra hop and
// the gateway shares Core's JWKS / roles / audit chain. Returns true if it handled
// the request; false lets server.ts fall through to legacy exact routes / 404.

import { config } from "../config.ts";
import { verifyJwtRS256 } from "../crypto.ts";
import type { Audit } from "../audit.ts";
import type { KeyManager } from "../keys.ts";
import type { Store } from "../store.ts";
import { sendJson, type Ctx } from "../server.ts";
import { auditAccessDecision, authorizeTenantAccess } from "../tenant.ts";
import { nowSec } from "../util.ts";
import { matchGw, type GwCtx, type GwResult, type GwRoute } from "./router.ts";
import { scopeSatisfies } from "./scopes.ts";

function tokenFrom(ctx: Ctx): string | undefined {
  const h = ctx.req.headers.authorization;
  if (h && h.startsWith("Bearer ")) return h.slice(7).trim();
  return ctx.cookies[config.cookieName];
}

function header(ctx: Ctx, name: string): string | undefined {
  const v = ctx.req.headers[name];
  return Array.isArray(v) ? v[0] : v;
}

function emit(ctx: Ctx, result: GwResult): void {
  if (result.contentType === "text/html") {
    ctx.res.statusCode = result.status;
    ctx.res.setHeader("content-type", "text/html; charset=utf-8");
    ctx.res.end(String(result.body));
  } else {
    sendJson(ctx.res, result.status, result.body);
  }
}

function actorFromGateway(ctx: GwCtx): string {
  return String(ctx.claims?.email ?? ctx.claims?.sub ?? "anonymous");
}

export interface GatewayOpts {
  /** Per-principal token bucket. Defaults: capacity 600, refill 50/s (generous;
   *  external-partner keys get tighter limits in a later pass). */
  rateLimit?: { capacity: number; refillPerSec: number };
}

/** Build the gateway dispatcher. Returns a fn that returns true iff it handled the request. */
export function createGatewayDispatch(routes: GwRoute[], keys: KeyManager, store: Store, audit: Audit, opts: GatewayOpts = {}): (ctx: Ctx) => Promise<boolean> {
  const rl = opts.rateLimit ?? {
    capacity: Number(process.env.GATEWAY_RL_CAPACITY ?? 600),
    refillPerSec: Number(process.env.GATEWAY_RL_REFILL ?? 50),
  };
  // Closure-local buckets so multiple gateway instances in one process don't collide.
  const buckets = new Map<string, { tokens: number; last: number }>();
  const allow = (key: string): boolean => {
    const now = nowSec();
    const b = buckets.get(key) ?? { tokens: rl.capacity, last: now };
    b.tokens = Math.min(rl.capacity, b.tokens + (now - b.last) * rl.refillPerSec);
    b.last = now;
    if (b.tokens < 1) { buckets.set(key, b); return false; }
    b.tokens -= 1; buckets.set(key, b); return true;
  };

  return async (ctx) => {
    const m = matchGw(routes, ctx.method, ctx.path);
    if (!m) return false; // not a gateway route — let the caller 404 / try legacy routes

    const gctx = ctx as GwCtx;
    gctx.params = m.params;
    const route = m.route;

    // ── authenticate ────────────────────────────────────────────────────────
    if (route.auth) {
      const tok = tokenFrom(ctx);
      const r = tok
        ? verifyJwtRS256(tok, (kid) => keys.resolveKey(kid), nowSec(), { iss: config.issuer, aud: config.audience })
        : null;
      if (!r || !r.ok) {
        await audit("anonymous", "auth.login_failed", "gateway_route", route.pattern, {
          method: ctx.method,
          route: route.pattern,
          statusCode: 401,
          reason: tok ? "invalid_token" : "missing_token",
        });
        sendJson(ctx.res, 401, { error: "unauthorized" });
        return true;
      }
      gctx.claims = r.payload;
    }

    // ── per-principal rate limit (after auth so the key is the caller, not the IP) ─
    const rlKey = String(gctx.claims?.sub ?? "anon");
    if (!allow(rlKey)) {
      await audit(actorFromGateway(gctx), "gateway.rate_limited", "gateway_route", route.pattern, {
        method: ctx.method,
        route: route.pattern,
        statusCode: 429,
      });
      ctx.res.setHeader("retry-after", "1");
      sendJson(ctx.res, 429, { error: "rate_limited" });
      return true;
    }

    // ── static scope gate (dynamic-scope routes pass scope:null and self-gate) ─
    if (route.scope) {
      const held = String(gctx.claims?.scope ?? "").split(/\s+/).filter(Boolean);
      if (!scopeSatisfies(held, route.scope)) {
        await audit(actorFromGateway(gctx), "auth.insufficient_scope", "gateway_route", route.pattern, {
          method: ctx.method,
          route: route.pattern,
          scope: route.scope,
          statusCode: 403,
        });
        sendJson(ctx.res, 403, { error: "insufficient_scope", need: route.scope });
        return true;
      }
    }

    // ── tenant/program policy gate (deny-by-default + audited denials) ─────
    if (route.accessPolicy) {
      const req = await route.accessPolicy(gctx);
      const decision = await authorizeTenantAccess(store, gctx.claims, req);
      await auditAccessDecision(audit, gctx.claims, req, decision);
      if (!decision.allow) {
        sendJson(ctx.res, decision.status, { error: "tenant_scope_denied", reason: decision.reason });
        return true;
      }
    }

    // ── durable idempotency (create routes) — replay the original 2xx response ─
    const idemKey = route.idempotent ? header(ctx, "idempotency-key") : undefined;
    const scopedKey = idemKey ? `${String(gctx.claims?.sub ?? "anon")}:${ctx.method}:${ctx.path}:${idemKey}` : undefined;
    if (scopedKey) {
      const cached = await store.getIdempotency(scopedKey);
      if (cached) { emit(ctx, cached); return true; }
    }

    // ── handler → send ────────────────────────────────────────────────────────
    const result = await route.handler(gctx);
    if (scopedKey && result.status >= 200 && result.status < 300) {
      await store.putIdempotency(scopedKey, result.status, result.body);
    }
    emit(ctx, result);
    return true;
  };
}
