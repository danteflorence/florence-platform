// ════════════════════════════════════════════════════════════════════════════
// FlorenceRN Core — shared verification SDK (VENDORED)
//
// Canonical source: florence-core/sdk/coreAuth.ts. This file is COPIED into each
// Node app (academy/api/src, pathway/server, ats/server). Edit it HERE and
// re-copy — do not diverge the copies.
//
// Verifies the RS256 session/M2M token Core mints, by fetching Core's JWKS and
// caching public keys by `kid` (ports extracted/florenceos OidcJwtVerifier.php +
// JwksCache.php). Pure node:crypto + global fetch — no npm deps, so even the
// zero-dependency Academy API can use it unchanged.
// ════════════════════════════════════════════════════════════════════════════

import { createPublicKey, createVerify, type KeyObject } from "node:crypto";

export type Role =
  | "super_admin" | "ops" | "qa" | "instructor" | "rep"
  | "candidate" | "employer" | "university" | "lender" | "service";

export interface CorePrincipal {
  userId: string;
  email?: string;
  name?: string;
  /** Highest-privilege role (scalar). */
  role?: Role;
  roles: Role[];
  /** Org scope (employer/university). */
  orgId?: string;
  /** Candidate binding — token may only touch this candidate. */
  cand?: string;
  territory?: string;
  /** Derived scopes — lets Academy reuse its scope checks unchanged. */
  scopes: Set<string>;
  jti?: string;
  exp: number;
  /** True for machine (client_credentials) tokens. */
  isService: boolean;
  /** The raw token, for pass-through. */
  token: string;
}

export interface CoreAuthOptions {
  /** Core's public origin, e.g. https://id.florenceeducation.com */
  issuerUrl: string;
  /** Expected `iss` claim (default "florence-auth"). */
  issuer?: string;
  /** Accepted `aud` claim(s) (default "florence"). */
  audience?: string | string[];
  /** JWKS endpoint (default `${issuerUrl}/.well-known/jwks.json`). */
  jwksUri?: string;
  /** Session cookie name (default "fl_session"). */
  cookieName?: string;
  /** Clock-skew tolerance in seconds (default 60). */
  leewaySec?: number;
  /** JWKS cache TTL in seconds (default 3600). */
  jwksTtlSec?: number;
}

interface ResolvedConfig extends Required<Omit<CoreAuthOptions, "audience">> {
  audiences: string[];
}

let cfg: ResolvedConfig | null = null;
const keyCache = new Map<string, KeyObject>();
let lastFetch = 0;

export function configureCoreAuth(opts: CoreAuthOptions): void {
  const issuerUrl = opts.issuerUrl.replace(/\/$/, "");
  cfg = {
    issuerUrl,
    issuer: opts.issuer ?? "florence-auth",
    audiences: opts.audience ? (Array.isArray(opts.audience) ? opts.audience : [opts.audience]) : ["florence"],
    jwksUri: opts.jwksUri ?? `${issuerUrl}/.well-known/jwks.json`,
    cookieName: opts.cookieName ?? "fl_session",
    leewaySec: opts.leewaySec ?? 60,
    jwksTtlSec: opts.jwksTtlSec ?? 3600,
  };
}

/** Convenience for apps that prefer env over an explicit call. */
export function configureCoreAuthFromEnv(): void {
  const issuerUrl = process.env.CORE_ISSUER_URL ?? process.env.PUBLIC_CORE_URL ?? "http://id.lvh.me:8080";
  configureCoreAuth({
    issuerUrl,
    ...(process.env.TOKEN_ISS && { issuer: process.env.TOKEN_ISS }),
    ...(process.env.TOKEN_AUD && { audience: process.env.TOKEN_AUD }),
    ...(process.env.CORE_JWKS_URL && { jwksUri: process.env.CORE_JWKS_URL }),
    ...(process.env.COOKIE_NAME && { cookieName: process.env.COOKIE_NAME }),
  });
}

function requireCfg(): ResolvedConfig {
  if (!cfg) throw new Error("coreAuth: call configureCoreAuth() (or configureCoreAuthFromEnv()) at startup");
  return cfg;
}

function b64urlJson(part: string): any {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

async function refreshJwks(): Promise<void> {
  const c = requireCfg();
  const res = await fetch(c.jwksUri, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`coreAuth: JWKS fetch failed ${res.status}`);
  const json = (await res.json()) as { keys?: Array<Record<string, unknown>> };
  keyCache.clear();
  for (const jwk of json.keys ?? []) {
    const kid = jwk["kid"] as string | undefined;
    if (!kid) continue;
    try {
      keyCache.set(kid, createPublicKey({ key: jwk as any, format: "jwk" }));
    } catch {
      /* skip unusable key */
    }
  }
  lastFetch = Date.now();
}

async function resolveKey(kid: string): Promise<KeyObject | undefined> {
  const c = requireCfg();
  const stale = Date.now() - lastFetch > c.jwksTtlSec * 1000;
  if (keyCache.size === 0 || stale) await refreshJwks();
  if (!keyCache.has(kid)) await refreshJwks(); // rotation: unknown kid → refetch once
  return keyCache.get(kid);
}

/** Verify a raw token. Returns the principal, or null if invalid/expired. */
export async function verifyCoreToken(token: string): Promise<CorePrincipal | null> {
  const c = requireCfg();
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, b, sig] = parts as [string, string, string];
  let header: { kid?: string; alg?: string };
  try {
    header = b64urlJson(h);
  } catch {
    return null;
  }
  if (header.alg !== "RS256" || !header.kid) return null;
  const key = await resolveKey(header.kid);
  if (!key) return null;
  if (!createVerify("RSA-SHA256").update(`${h}.${b}`).end().verify(key, sig, "base64url")) return null;

  let p: any;
  try {
    p = b64urlJson(b);
  } catch {
    return null;
  }
  const now = Math.floor(Date.now() / 1000);
  if (typeof p.exp !== "number" || p.exp + c.leewaySec < now) return null;
  if (p.iss !== c.issuer) return null;
  if (!c.audiences.includes(p.aud)) return null;

  const roles: Role[] = Array.isArray(p.roles) ? p.roles : p.role ? [p.role] : [];
  return {
    userId: p.sub,
    ...(p.email && { email: p.email }),
    ...(p.name && { name: p.name }),
    ...(p.role && { role: p.role }),
    roles,
    ...(p.org_id && { orgId: p.org_id }),
    ...(p.cand && { cand: p.cand }),
    ...(p.territory && { territory: p.territory }),
    scopes: new Set<string>(typeof p.scope === "string" ? p.scope.split(/\s+/).filter(Boolean) : []),
    ...(p.jti && { jti: p.jti }),
    exp: p.exp,
    isService: p.m2m === true || p.role === "service",
    token,
  };
}

function readCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const pair of cookieHeader.split(";")) {
    const i = pair.indexOf("=");
    if (i < 0) continue;
    if (pair.slice(0, i).trim() === name) return decodeURIComponent(pair.slice(i + 1).trim());
  }
  return undefined;
}

interface ReqLike {
  headers: Record<string, string | string[] | undefined>;
}

/** Extract a token from Authorization: Bearer or the session cookie, and verify. */
export async function principalFromRequest(req: ReqLike): Promise<CorePrincipal | null> {
  const c = requireCfg();
  const auth = req.headers["authorization"];
  const authStr = Array.isArray(auth) ? auth[0] : auth;
  let token: string | undefined;
  if (authStr && authStr.startsWith("Bearer ")) token = authStr.slice(7).trim();
  if (!token) {
    const cookie = req.headers["cookie"];
    token = readCookie(Array.isArray(cookie) ? cookie[0] : cookie, c.cookieName);
  }
  if (!token) return null;
  return verifyCoreToken(token);
}

// ── Role helpers + Express middleware ───────────────────────────────────────
const STAFF: ReadonlySet<Role> = new Set(["super_admin", "ops", "qa", "instructor", "rep"]);

export function isStaff(p: CorePrincipal): boolean {
  return p.roles.some((r) => STAFF.has(r));
}
export function hasRole(p: CorePrincipal, ...roles: Role[]): boolean {
  return roles.some((r) => p.roles.includes(r));
}
export function hasScope(p: CorePrincipal, scope: string): boolean {
  return p.scopes.has(scope);
}

/** Map a Core principal to florence-ats-connect's two-role model. */
export function atsRole(p: CorePrincipal): "ops" | "employer" | null {
  if (hasRole(p, "super_admin", "ops")) return "ops";
  if (hasRole(p, "employer")) return "employer";
  return null;
}

/** Map a Core principal to labor-economics-agent/rbac.py's three-role model. */
export function streamlitRole(p: CorePrincipal): "admin" | "ops" | "rep" | null {
  if (hasRole(p, "super_admin")) return "admin";
  if (hasRole(p, "ops")) return "ops";
  if (hasRole(p, "rep")) return "rep";
  return null;
}

/** URL of Core's login page that returns the user to `returnTo` afterward. */
export function loginUrl(returnTo: string): string {
  const c = requireCfg();
  return `${c.issuerUrl}/login?redirect=${encodeURIComponent(returnTo)}`;
}

/** Core's refresh endpoint — POST to it with credentials to slide the session
 *  (mint a fresh access cookie from the long-lived refresh cookie). */
export function refreshUrl(): string {
  const c = requireCfg();
  return `${c.issuerUrl}/auth/refresh`;
}

// Express-style middleware (used by Pathway + ATS). Typed loosely so the vendored
// file needs no @types/express. Sets req.principal on success.
type Req = any;
type Res = any;
type Next = (err?: unknown) => void;

export function requireCore(): (req: Req, res: Res, next: Next) => void {
  return (req, res, next) => {
    principalFromRequest(req)
      .then((p) => {
        if (!p) {
          res.status(401).json({ error: "authentication required", login: loginUrl("") });
          return;
        }
        req.principal = p;
        next();
      })
      .catch(() => res.status(401).json({ error: "authentication failed" }));
  };
}

export function requireRole(...roles: Role[]): (req: Req, res: Res, next: Next) => void {
  return (req, res, next) => {
    principalFromRequest(req)
      .then((p) => {
        if (!p) {
          res.status(401).json({ error: "authentication required" });
          return;
        }
        if (!hasRole(p, ...roles)) {
          res.status(403).json({ error: "forbidden", need: roles, have: p.roles });
          return;
        }
        req.principal = p;
        next();
      })
      .catch(() => res.status(401).json({ error: "authentication failed" }));
  };
}

export function requireScope(scope: string): (req: Req, res: Res, next: Next) => void {
  return (req, res, next) => {
    principalFromRequest(req)
      .then((p) => {
        if (!p) {
          res.status(401).json({ error: "authentication required" });
          return;
        }
        if (!hasScope(p, scope)) {
          res.status(403).json({ error: "forbidden", need_scope: scope });
          return;
        }
        req.principal = p;
        next();
      })
      .catch(() => res.status(401).json({ error: "authentication failed" }));
  };
}

// ── Passport spine client (emit-side) ────────────────────────────────────────
// For apps that WRITE to the Nurse Passport spine. Holds the app's Core M2M
// client credentials, mints + caches a short-lived service token, and emits
// journey events / reads the folded Passport. Pure global fetch.
//
//   const passport = createPassportClient({ coreUrl, clientId, clientSecret });
//   await passport.emit({ email, ref: { app: "ats", externalId: candidateId } },
//                        "ats.started", { employer, startDate });
//
// The app's M2M client (api_clients in Core) must allow passport:read/write.
export interface PassportClientOptions {
  coreUrl: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
}
export interface PassportRefInput {
  app: string;
  externalId: string;
}
export interface NurseSelector {
  nurseId?: string;
  email?: string;
  name?: string;
  ref?: PassportRefInput;
}

export function createPassportClient(opts: PassportClientOptions) {
  const base = opts.coreUrl.replace(/\/$/, "");
  // Request passport + consent scopes; Core filters down to the client's grant.
  const scope = opts.scope ?? "passport:read passport:write consent:read consent:write";
  let token = "";
  let exp = 0;

  async function getToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (token && now < exp - 30) return token;
    const r = await fetch(`${base}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ grant_type: "client_credentials", client_id: opts.clientId, client_secret: opts.clientSecret, scope }),
    });
    if (!r.ok) throw new Error(`passport: token failed ${r.status}`);
    const j = (await r.json()) as { access_token: string; expires_in?: number };
    token = j.access_token;
    exp = now + (j.expires_in ?? 3600);
    return token;
  }

  async function call(path: string, method: string, body?: unknown): Promise<any> {
    const t = await getToken();
    const r = await fetch(`${base}${path}`, {
      method,
      headers: { authorization: `Bearer ${t}`, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`passport: ${method} ${path} → ${r.status}`);
    return r.json();
  }

  return {
    /** Find-or-create the canonical nurse + link the app ref. */
    resolve: (sel: NurseSelector): Promise<{ nurseId: string; email?: string; name?: string }> =>
      call("/v1/nurse/resolve", "POST", sel),
    /** Append a journey event (resolves the nurse inline by id/email/ref). */
    emit: (sel: NurseSelector, type: string, data?: Record<string, unknown>, at?: string): Promise<{ ok: boolean; nurseId: string }> =>
      call("/v1/nurse/event", "POST", { ...sel, type, data, ...(at ? { at } : {}) }),
    /** Read the folded Passport by nurseId | email | "app:externalId" ref. */
    getPassport: (sel: { nurseId?: string; email?: string; ref?: string }): Promise<unknown> => {
      const q = new URLSearchParams();
      if (sel.nurseId) q.set("nurseId", sel.nurseId);
      if (sel.email) q.set("email", sel.email);
      if (sel.ref) q.set("ref", sel.ref);
      return call(`/v1/nurse/passport?${q.toString()}`, "GET");
    },
    /** Read the AUDIENCE-redacted Passport view (Core is the canonical redactor). */
    getView: (sel: { nurseId?: string; email?: string; ref?: string }, audience: string, purpose?: string): Promise<Record<string, unknown>> => {
      const q = new URLSearchParams();
      if (sel.nurseId) q.set("nurseId", sel.nurseId);
      if (sel.email) q.set("email", sel.email);
      if (sel.ref) q.set("ref", sel.ref);
      q.set("audience", audience);
      if (purpose) q.set("purpose", purpose);
      return call(`/v1/nurse/passport?${q.toString()}`, "GET");
    },
    /** Record a consent grant in Core (the canonical consent store). */
    grantConsent: (input: Record<string, unknown>): Promise<{ ok: boolean; consent: unknown }> =>
      call("/v1/consent/grant", "POST", input),
    /** Revoke a consent in Core by consentId + nurse selector + purpose. */
    revokeConsent: (input: Record<string, unknown>): Promise<{ ok: boolean }> =>
      call("/v1/consent/revoke", "POST", input),
  };
}
