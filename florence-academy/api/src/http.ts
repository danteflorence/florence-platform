// Low-level HTTP plumbing over node:http — no framework. Request context,
// response helpers (with security headers), body parsing with a size cap,
// token-bucket rate limiting, idempotency, small validators, and a tiny router.

import type { IncomingMessage, ServerResponse } from "node:http";
import type { Scope } from "./types.ts";
import type { AuthContext } from "./auth.ts";
import type { AuditSink } from "./audit.ts";
import type { Store } from "./store.ts";
import type { WebhookEmitter } from "./webhooks.ts";
import type { Revocations } from "./revocations.ts";
import type { PaymentProvider } from "./payments.ts";
import type { EmailProvider } from "./email.ts";
import type { PathwayClient } from "./pathway.ts";
import { config } from "./config.ts";

export interface Deps {
  store: Store;
  audit: AuditSink;
  webhooks: WebhookEmitter;
  revocations: Revocations;
  payments: PaymentProvider;
  email: EmailProvider;
  pathway: PathwayClient;
}

export interface ReqCtx {
  req: IncomingMessage;
  res: ServerResponse;
  method: string;
  path: string;
  params: Record<string, string>;
  query: URLSearchParams;
  headers: IncomingMessage["headers"];
  body: unknown;
  /** Raw request body string — retained for signature-verified webhooks (Stripe). */
  rawBody?: string;
  auth: AuthContext | null;
  requestId: string;
  ip: string;
  status: number;
  /** The body passed to send() — retained so idempotent writes can be replayed. */
  responseBody?: unknown;
  resourceType?: string;
  resourceId?: string;
}

export type Handler = (ctx: ReqCtx, deps: Deps) => void | Promise<void>;

export interface Route {
  method: string;
  regex: RegExp;
  keys: string[];
  scope: Scope | null;
  requiresAuth: boolean;
  handler: Handler;
}

// ── responses ───────────────────────────────────────────────────────────────
export function send(ctx: ReqCtx, status: number, body?: unknown): void {
  ctx.status = status;
  ctx.responseBody = body;
  const json = body === undefined ? "" : JSON.stringify(body);
  const headers: Record<string, string> = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
    "referrer-policy": "no-referrer",
    "x-frame-options": "DENY",
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
    "permissions-policy": "geolocation=(), microphone=(), camera=()",
    "cross-origin-resource-policy": "same-site",
    "x-request-id": ctx.requestId,
  };
  if (status === 429) headers["retry-after"] = "1";
  ctx.res.writeHead(status, headers);
  ctx.res.end(json);
}

export function err(
  ctx: ReqCtx,
  status: number,
  code: string,
  message: string,
): void {
  send(ctx, status, { error: { code, message, request_id: ctx.requestId } });
}

/** 400 with per-field detail from the schema validator. */
export function validationError(
  ctx: ReqCtx,
  fields: { field: string; message: string }[],
): void {
  send(ctx, 400, {
    error: {
      code: "validation_error",
      message: "request validation failed",
      fields,
      request_id: ctx.requestId,
    },
  });
}

// ── body parsing (capped) ───────────────────────────────────────────────────
const MAX_BODY_BYTES = 1_000_000;

export function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export function parseJson(raw: string): unknown {
  if (!raw) return {};
  return JSON.parse(raw);
}

// ── rate limiting (token bucket, per key) ───────────────────────────────────
const buckets = new Map<string, { tokens: number; last: number }>();

export function rateLimitOk(key: string): boolean {
  const now = Date.now() / 1000;
  const b = buckets.get(key) ?? { tokens: config.rateLimit.capacity, last: now };
  b.tokens = Math.min(
    config.rateLimit.capacity,
    b.tokens + (now - b.last) * config.rateLimit.refillPerSec,
  );
  b.last = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(key, b);
  return true;
}

// ── auth-endpoint hardening ──────────────────────────────────────────────────
// A SEPARATE, much tighter token bucket guards /v1/auth/* against floods, on top
// of the general limiter. Tune lower in production; sized here to allow normal
// use (and the test suite) while throttling automated abuse.
const authBuckets = new Map<string, { tokens: number; last: number }>();
const AUTH_CAPACITY = 30;
const AUTH_REFILL_PER_SEC = 0.5; // ~30/min sustained, burst 30

export function authRateLimitOk(key: string): boolean {
  const now = Date.now() / 1000;
  const b = authBuckets.get(key) ?? { tokens: AUTH_CAPACITY, last: now };
  b.tokens = Math.min(AUTH_CAPACITY, b.tokens + (now - b.last) * AUTH_REFILL_PER_SEC);
  b.last = now;
  if (b.tokens < 1) {
    authBuckets.set(key, b);
    return false;
  }
  b.tokens -= 1;
  authBuckets.set(key, b);
  return true;
}

// Per-identifier (email) failed-login lockout — defeats credential stuffing even
// from rotating IPs. N failures inside a window locks the account for a cooldown.
const loginFails = new Map<string, { count: number; first: number; lockedUntil: number }>();
const LOCK_THRESHOLD = 6;
const LOCK_WINDOW_SEC = 900; // failures reset if spread beyond this
const LOCK_DURATION_SEC = 900; // cooldown once locked

/** Seconds remaining on a lockout, or 0 if not locked. */
export function loginLockRemaining(id: string): number {
  const r = loginFails.get(id);
  if (!r) return 0;
  const now = Date.now() / 1000;
  return r.lockedUntil > now ? Math.ceil(r.lockedUntil - now) : 0;
}

export function recordLoginFailure(id: string): void {
  const now = Date.now() / 1000;
  const r = loginFails.get(id) ?? { count: 0, first: now, lockedUntil: 0 };
  if (now - r.first > LOCK_WINDOW_SEC) {
    r.count = 0;
    r.first = now;
    r.lockedUntil = 0;
  }
  r.count += 1;
  if (r.count >= LOCK_THRESHOLD) r.lockedUntil = now + LOCK_DURATION_SEC;
  loginFails.set(id, r);
}

export function clearLoginFailures(id: string): void {
  loginFails.delete(id);
}

// ── idempotency (per client + key) ──────────────────────────────────────────
const idem = new Map<string, { status: number; body: unknown }>();

export function idemGet(clientId: string, key: string) {
  return idem.get(`${clientId}:${key}`);
}
export function idemPut(
  clientId: string,
  key: string,
  status: number,
  body: unknown,
): void {
  idem.set(`${clientId}:${key}`, { status, body });
}

// ── validators ──────────────────────────────────────────────────────────────
export function str(o: unknown, k: string): string | undefined {
  const v = (o as Record<string, unknown> | null)?.[k];
  return typeof v === "string" ? v : undefined;
}
export function num(o: unknown, k: string): number | undefined {
  const v = (o as Record<string, unknown> | null)?.[k];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}
export function obj(o: unknown, k: string): Record<string, unknown> | undefined {
  const v = (o as Record<string, unknown> | null)?.[k];
  return v && typeof v === "object" ? (v as Record<string, unknown>) : undefined;
}
export function bool(o: unknown, k: string): boolean | undefined {
  const v = (o as Record<string, unknown> | null)?.[k];
  return typeof v === "boolean" ? v : undefined;
}
export function arr<T = unknown>(o: unknown, k: string): T[] | undefined {
  const v = (o as Record<string, unknown> | null)?.[k];
  return Array.isArray(v) ? (v as T[]) : undefined;
}

export function pagination(query: URLSearchParams): {
  cursor: string | undefined;
  limit: number;
} {
  const cursor = query.get("cursor") ?? undefined;
  const raw = Number(query.get("limit") ?? 50);
  const limit = Number.isFinite(raw) ? Math.max(1, Math.min(200, raw)) : 50;
  return { cursor, limit };
}

// ── router ──────────────────────────────────────────────────────────────────
export function compile(
  method: string,
  pattern: string,
  scope: Scope | null,
  requiresAuth: boolean,
  handler: Handler,
): Route {
  const keys: string[] = [];
  const regex = new RegExp(
    "^" +
      pattern.replace(/:[A-Za-z_]+/g, (m) => {
        keys.push(m.slice(1));
        return "([^/]+)";
      }) +
      "/?$",
  );
  return { method, regex, keys, scope, requiresAuth, handler };
}

export function match(
  routes: Route[],
  method: string,
  path: string,
): { route: Route; params: Record<string, string> } | null {
  for (const route of routes) {
    if (route.method !== method) continue;
    const m = route.regex.exec(path);
    if (!m) continue;
    const params: Record<string, string> = {};
    route.keys.forEach((k, i) => {
      params[k] = decodeURIComponent(m[i + 1] ?? "");
    });
    return { route, params };
  }
  return null;
}
