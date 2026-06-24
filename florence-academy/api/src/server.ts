// Request lifecycle: route match → body parse → authenticate → scope check →
// rate limit → idempotency → handler → append-only audit. The single source of
// truth for the cross-cutting security controls.

import { createServer as createHttpServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import type { IncomingMessage, Server as HttpServer, ServerResponse } from "node:http";
import type { Server as HttpsServer } from "node:https";
import { randomUUID } from "node:crypto";
import { config } from "./config.ts";
import { loadTlsOptions } from "./tls.ts";
import type { Deps, ReqCtx } from "./http.ts";
import {
  err,
  idemGet,
  idemPut,
  match,
  parseJson,
  rateLimitOk,
  readBody,
  send,
} from "./http.ts";
import { authenticate, hasScope } from "./auth.ts";
import { configureCoreAuthFromEnv } from "./coreAuth.ts";
import { routes } from "./routes.ts";

/** Serves HTTPS natively when TLS is configured (cert+key), else plain HTTP. */
export function createServer(deps: Deps): HttpServer | HttpsServer {
  // Guarantee the auth dependency is configured for ANY boot path. The production
  // entrypoint (index.ts) already calls this; doing it here (idempotent, reads env
  // with safe defaults) means tests/embeds that build the server directly don't hit
  // an unconfigured coreAuth - which previously threw and surfaced as a 500 on the
  // first authenticated request (and on every principalFromRequest route).
  configureCoreAuthFromEnv();
  const handler = (req: IncomingMessage, res: ServerResponse) => {
    void dispatch(req, res, deps);
  };
  const tls = loadTlsOptions();
  return tls ? createHttpsServer(tls, handler) : createHttpServer(handler);
}

/** Apply the CORS allowlist. Returns true if the request should stop here (preflight). */
function applyCors(ctx: ReqCtx): boolean {
  const origin = ctx.headers["origin"];
  const allowed = typeof origin === "string" && config.corsOrigins.includes(origin);
  if (allowed) {
    ctx.res.setHeader("access-control-allow-origin", origin);
    // Allow the shared FlorenceRN Core cookie on cross-subdomain XHR (academy → api.academy).
    ctx.res.setHeader("access-control-allow-credentials", "true");
    ctx.res.setHeader("vary", "Origin");
    ctx.res.setHeader("access-control-allow-methods", "GET, POST, PATCH, OPTIONS");
    ctx.res.setHeader(
      "access-control-allow-headers",
      "authorization, content-type, idempotency-key, x-purpose",
    );
    ctx.res.setHeader("access-control-max-age", "600");
  }
  if (ctx.method === "OPTIONS") {
    // Preflight: 204 when the origin is allowed, else 403. Never runs a handler.
    ctx.res.writeHead(allowed ? 204 : 403).end();
    return true;
  }
  return false;
}

async function dispatch(
  req: IncomingMessage,
  res: ServerResponse,
  deps: Deps,
): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost");
  const ctx: ReqCtx = {
    req,
    res,
    method: req.method ?? "GET",
    path: url.pathname,
    params: {},
    query: url.searchParams,
    headers: req.headers,
    body: {},
    auth: null,
    requestId: randomUUID(),
    ip: req.socket.remoteAddress ?? "",
    status: 0,
  };

  if (applyCors(ctx)) return; // CORS preflight handled

  try {
    const matched = match(routes, ctx.method, ctx.path);
    if (!matched) {
      err(ctx, 404, "not_found", "no such route");
      return finalize(ctx, deps);
    }
    ctx.params = matched.params;
    const route = matched.route;

    // Body (writes only).
    if (ctx.method === "POST" || ctx.method === "PATCH" || ctx.method === "PUT") {
      let raw: string | null = null;
      try {
        raw = await readBody(req);
      } catch {
        err(ctx, 413, "payload_too_large", "request body too large");
        return finalize(ctx, deps);
      }
      ctx.rawBody = raw; // retained for signature-verified webhooks (Stripe)
      const ct = (req.headers["content-type"] ?? "").toString();
      try {
        ctx.body = ct.includes("application/x-www-form-urlencoded")
          ? Object.fromEntries(new URLSearchParams(raw))
          : parseJson(raw);
      } catch {
        err(ctx, 400, "invalid_json", "request body is not valid JSON");
        return finalize(ctx, deps);
      }
    }

    // Authentication + scope.
    if (route.requiresAuth) {
      const a = await authenticate(
        req.headers["authorization"]?.toString(),
        req.headers["cookie"]?.toString(),
      );
      if (!a.ok) {
        err(ctx, 401, "unauthorized", a.error);
        return finalize(ctx, deps);
      }
      ctx.auth = a.ctx;
      if (deps.revocations.isRevoked(a.ctx.jti)) {
        err(ctx, 401, "token_revoked", "this token has been revoked");
        return finalize(ctx, deps);
      }
      if (route.scope && !hasScope(a.ctx, route.scope)) {
        err(ctx, 403, "forbidden", `missing required scope: ${route.scope}`);
        return finalize(ctx, deps);
      }
    }

    // Principal key for rate-limiting + idempotency. A candidate session is keyed
    // on its BOUND candidate (not the shared "academy_session" sub), so learners
    // get independent buckets; M2M clients key on client_id; anonymous on IP.
    const principal = ctx.auth
      ? ctx.auth.candidateId
        ? `cand:${ctx.auth.candidateId}`
        : ctx.auth.clientId
      : `ip:${ctx.ip}`;

    // Rate limit.
    if (!rateLimitOk(principal)) {
      err(ctx, 429, "rate_limited", "too many requests");
      return finalize(ctx, deps);
    }

    // Idempotency replay (authenticated writes).
    const idemKey = req.headers["idempotency-key"]?.toString();
    const isWrite = ctx.method === "POST";
    if (isWrite && idemKey && ctx.auth) {
      const prev = idemGet(principal, idemKey);
      if (prev) {
        send(ctx, prev.status, prev.body);
        return finalize(ctx, deps);
      }
    }

    await route.handler(ctx, deps);

    // Persist a successful write under its idempotency key.
    if (
      isWrite &&
      idemKey &&
      ctx.auth &&
      ctx.status >= 200 &&
      ctx.status < 300
    ) {
      idemPut(principal, idemKey, ctx.status, ctx.responseBody);
    }
    return finalize(ctx, deps);
  } catch (e) {
    // Log 5xx server-side (the client still gets only the generic message). The
    // previous bare `catch {}` swallowed the stack, which is why an unconfigured
    // coreAuth surfaced as an opaque 500 with no diagnostic trail.
    console.error(`[dispatch] unhandled error on ${ctx.method} ${ctx.path} (request_id=${ctx.requestId})`, e);
    if (!res.headersSent) err(ctx, 500, "internal_error", "unexpected error");
    return finalize(ctx, deps);
  }
}

function finalize(ctx: ReqCtx, deps: Deps): void {
  if (ctx.path === "/health") return; // don't audit liveness probes
  deps.audit.append({
    ts: new Date().toISOString(),
    request_id: ctx.requestId,
    actor: ctx.auth
      ? ctx.auth.clientId
      : ctx.resourceType === "token"
        ? ctx.resourceId
        : undefined,
    action: `${ctx.method} ${ctx.path}`,
    resource_type: ctx.resourceType,
    resource_id: ctx.resourceId,
    scope_used: ctx.auth ? [...ctx.auth.scopes].join(" ") : undefined,
    ip: ctx.ip,
    outcome: ctx.status,
  });
}
