// Minimal zero-dependency HTTP plumbing (node:http): cookie parsing, body
// parsing (JSON + form-urlencoded), a credentialed CORS allowlist for the app
// subdomains, Set-Cookie helpers, and an exact-match router. Route handlers live
// in routes.ts and close over the service deps.

import type { IncomingMessage, ServerResponse } from "node:http";
import { config } from "./config.ts";
import { redactError } from "./classification.ts";
import { createLogger, type Logger } from "./logger.ts";

export interface Ctx {
  req: IncomingMessage;
  res: ServerResponse;
  method: string;
  path: string;
  query: URLSearchParams;
  cookies: Record<string, string>;
  body: Record<string, unknown>;
  rawBody: string;
}

export type Handler = (ctx: Ctx) => Promise<void> | void;
export interface Route {
  method: string;
  path: string;
  handler: Handler;
}

export function hostAllowed(host: string): boolean {
  const h = host.toLowerCase();
  return config.redirectHostSuffixes.some((suf) =>
    suf.startsWith(".") ? h === suf.slice(1) || h.endsWith(suf) : h === suf,
  );
}

/** Validate a post-login redirect target (open-redirect guard). */
export function safeRedirect(target?: string | null): string {
  if (!target) return config.publicUrl;
  try {
    const u = new URL(target, config.publicUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") return config.publicUrl;
    return hostAllowed(u.hostname) ? u.toString() : config.publicUrl;
  } catch {
    return config.publicUrl;
  }
}

export function sendJson(res: ServerResponse, status: number, obj: unknown): void {
  const body = JSON.stringify(obj);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(body);
}

export function sendHtml(res: ServerResponse, status: number, html: string): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(html);
}

export function redirect(res: ServerResponse, location: string): void {
  res.statusCode = 302;
  res.setHeader("Location", location);
  res.end();
}

export interface CookieOpts {
  maxAge?: number;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "Lax" | "Strict" | "None";
  path?: string;
}

export function setCookie(res: ServerResponse, name: string, value: string, opts: CookieOpts = {}): void {
  const parts = [`${name}=${value}`, `Path=${opts.path ?? "/"}`];
  if (opts.domain) parts.push(`Domain=${opts.domain}`);
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.httpOnly !== false) parts.push("HttpOnly");
  if (opts.secure) parts.push("Secure");
  parts.push(`SameSite=${opts.sameSite ?? "Lax"}`);
  res.appendHeader("Set-Cookie", parts.join("; "));
}

function parseCookies(header?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const pair of header.split(";")) {
    const i = pair.indexOf("=");
    if (i < 0) continue;
    const k = pair.slice(0, i).trim();
    const v = pair.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function parseBody(contentType: string | undefined, raw: string): Record<string, unknown> {
  if (!raw) return {};
  const ct = contentType ?? "";
  if (ct.includes("application/json")) {
    try {
      const v = JSON.parse(raw);
      return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  if (ct.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(raw));
  }
  return {};
}

function readBody(req: IncomingMessage): Promise<{ raw: string; parsed: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > 1_000_000) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      resolve({ raw, parsed: parseBody(req.headers["content-type"], raw) });
    });
    req.on("error", reject);
  });
}

function applyCors(req: IncomingMessage, res: ServerResponse): void {
  const origin = req.headers.origin;
  if (!origin) return;
  try {
    if (hostAllowed(new URL(origin).hostname)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.appendHeader("Vary", "Origin");
    }
  } catch {
    /* malformed Origin — ignore */
  }
}

/** Optional Platform-API gateway dispatcher: regex/path-param routes tried AFTER the
 *  legacy exact routes. Returns true iff it handled the request. */
export type GatewayDispatch = (ctx: Ctx) => Promise<boolean>;

export function createApp(
  routes: Route[],
  gateway?: GatewayDispatch,
  opts: { logger?: Logger } = {},
): (req: IncomingMessage, res: ServerResponse) => void {
  const logger = opts.logger ?? createLogger({ component: "http" });
  return (req, res) => {
    void (async () => {
      applyCors(req, res);
      const method = req.method ?? "GET";
      if (method === "OPTIONS") {
        res.statusCode = 204;
        res.end();
        return;
      }
      const url = new URL(req.url ?? "/", config.publicUrl);
      let body: Record<string, unknown> = {};
      let raw = "";
      if (method === "POST" || method === "PUT" || method === "PATCH") {
        try {
          const b = await readBody(req);
          body = b.parsed;
          raw = b.raw;
        } catch {
          sendJson(res, 413, { error: "payload_too_large" });
          return;
        }
      }
      const ctx: Ctx = {
        req,
        res,
        method,
        path: url.pathname,
        query: url.searchParams,
        cookies: parseCookies(req.headers.cookie),
        body,
        rawBody: raw,
      };
      try {
        // Legacy exact routes first (back-compat), then the Platform-API gateway.
        const route = routes.find((r) => r.method === method && r.path === ctx.path);
        if (route) {
          await route.handler(ctx);
          return;
        }
        if (gateway && (await gateway(ctx))) return;
        sendJson(res, 404, { error: "not_found" });
      } catch (e) {
        logger.error("request failed", e, {
          method,
          path: ctx.path,
          statusCode: 500,
        });
        sendJson(res, 500, redactError(e));
      }
    })();
  };
}
