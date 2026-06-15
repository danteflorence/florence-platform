// OAuth2 client-credentials: token issuance + bearer verification with scope
// sets. Clients live in the Store (api_clients in Postgres), so partner
// credentials can be created/rotated at runtime. JWT verification is pure
// (self-contained token), so authenticate() stays synchronous.

import { randomUUID } from "node:crypto";
import type { ApiClient, Scope } from "./types.ts";
import { ALL_SCOPES, NON_DELEGABLE_SCOPES, isScope } from "./types.ts";
import { config } from "./config.ts";
import { hashSecret, signJwt, verifyJwt, verifySecret } from "./crypto.ts";
import { verifyCoreToken, principalFromRequest } from "./coreAuth.ts";
import type { Store } from "./store.ts";

/** Seed the demo partner client (idempotent) so the service works out of the box. */
export async function seedDemoClient(store: Store): Promise<void> {
  if (await store.clients.get(config.demoClientId)) return;
  await store.clients.create({
    client_id: config.demoClientId,
    name: "Demo CRM",
    secret_hash: hashSecret(config.demoClientSecret),
    allowed_scopes: [...ALL_SCOPES],
    active: true,
  });
}

export interface TokenResult {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope: string;
}

export type IssueResult =
  | { ok: true; token: TokenResult }
  | { ok: false; status: number; error: string };

export async function issueToken(
  store: Store,
  clientId: string,
  clientSecret: string,
  requestedScope?: string,
): Promise<IssueResult> {
  const client = await store.clients.get(clientId);
  if (!client || !client.active)
    return { ok: false, status: 401, error: "invalid_client" };
  if (!verifySecret(clientSecret, client.secret_hash))
    return { ok: false, status: 401, error: "invalid_client" };

  let granted: Scope[];
  if (requestedScope && requestedScope.trim()) {
    const req = requestedScope.split(/\s+/).filter(isScope);
    granted = req.filter((s) => client.allowed_scopes.includes(s));
    if (granted.length === 0)
      return { ok: false, status: 400, error: "invalid_scope" };
  } else {
    granted = [...client.allowed_scopes];
  }

  const now = Math.floor(Date.now() / 1000);
  const access_token = signJwt(
    {
      iss: config.jwtIssuer,
      aud: config.jwtAudience,
      sub: clientId,
      iat: now,
      exp: now + config.tokenTtlSec,
      jti: randomUUID(),
      scope: granted.join(" "),
    },
    config.jwtSecret,
  );
  return {
    ok: true,
    token: {
      access_token,
      token_type: "Bearer",
      expires_in: config.tokenTtlSec,
      scope: granted.join(" "),
    },
  };
}

export interface AuthContext {
  clientId: string;
  scopes: Set<Scope>;
  /** Subject-binding from a session token — restricts access to this candidate. */
  candidateId?: string;
  /** Token id + expiry — used for revocation (denylist). */
  jti: string;
  exp: number;
}

/**
 * Mint a short-lived, downscoped, candidate-BOUND child token from an already
 * authenticated parent (which must hold `tokens:mint`). The child can only:
 *   • carry scopes the parent has, minus non-delegable ones, and
 *   • touch the one candidate it's bound to (enforced at the routes).
 * Safe to hand to a browser: a leak exposes one candidate's own data, briefly.
 */
export function issueSessionToken(
  parent: AuthContext,
  candidateId: string,
  requestedScopes: string[],
  ttlSec: number,
): IssueResult {
  const child = requestedScopes
    .filter(isScope)
    .filter((s) => parent.scopes.has(s) && !NON_DELEGABLE_SCOPES.includes(s));
  if (child.length === 0) return { ok: false, status: 400, error: "invalid_scope" };
  const ttl = Math.max(60, Math.min(3600, Math.floor(ttlSec) || 600));
  const now = Math.floor(Date.now() / 1000);
  const access_token = signJwt(
    {
      iss: config.jwtIssuer,
      aud: config.jwtAudience,
      sub: parent.clientId,
      iat: now,
      exp: now + ttl,
      jti: randomUUID(),
      scope: child.join(" "),
      cand: candidateId,
    },
    config.jwtSecret,
  );
  return {
    ok: true,
    token: { access_token, token_type: "Bearer", expires_in: ttl, scope: child.join(" ") },
  };
}

/**
 * Scopes carried by a candidate END-USER session (browser, after login). Every
 * one is harmless when bound to a single candidate: the routes enforce that a
 * `cand`-bound token may only read/write its OWN candidate. Deliberately EXCLUDES
 * payments:write (deposits are created server-side from the processor webhook,
 * never by the browser) and every non-delegable/admin scope.
 */
export const CANDIDATE_SESSION_SCOPES: Scope[] = [
  "candidates:read",
  "candidates:write",
  "enrollment:read",
  "enrollment:write",
  "performance:read",
  "performance:write",
  "payments:read",
  "cohorts:read",
];

/** Principal id stamped on candidate session tokens (audit actor). */
export const ACADEMY_SESSION_PRINCIPAL = "academy_session";

/**
 * Mint a candidate-BOUND session token directly from a verified login (no parent
 * M2M token needed — the password check IS the proof). Bound to one candidate and
 * carrying only CANDIDATE_SESSION_SCOPES; safe to hand to the browser.
 */
export function issueCandidateSession(candidateId: string, ttlSec = 28_800): TokenResult {
  const ttl = Math.max(300, Math.min(86_400, Math.floor(ttlSec) || 28_800));
  const now = Math.floor(Date.now() / 1000);
  const scope = CANDIDATE_SESSION_SCOPES.join(" ");
  const access_token = signJwt(
    {
      iss: config.jwtIssuer,
      aud: config.jwtAudience,
      sub: ACADEMY_SESSION_PRINCIPAL,
      iat: now,
      exp: now + ttl,
      jti: randomUUID(),
      scope,
      cand: candidateId,
    },
    config.jwtSecret,
  );
  return { access_token, token_type: "Bearer", expires_in: ttl, scope };
}

export type AuthResult =
  | { ok: true; ctx: AuthContext }
  | { ok: false; error: string };

// FlorenceRN Core SSO cookie name (shared across the fleet).
const CORE_COOKIE = process.env.COOKIE_NAME ?? "fl_session";

// Throttle the "Core auth unavailable" warning so a sustained outage doesn't flood
// logs (at most once per minute).
let lastCoreWarnMs = 0;
function warnCoreUnavailable(e: unknown): void {
  const now = Date.now();
  if (now - lastCoreWarnMs < 60_000) return;
  lastCoreWarnMs = now;
  console.warn("[auth] Core SSO verification unavailable — falling back to legacy token path:", (e as Error)?.message ?? e);
}

/**
 * principalFromRequest that never throws to a 500. The vendored coreAuth helper
 * throws on operational failures (Core unconfigured, or JWKS unreachable during an
 * outage); the Express middleware in coreAuth already .catch()es to 401, but the
 * Academy handlers that call principalFromRequest directly (GET /v1/session, the
 * live/tutor routes) did not. Route those through this so a Core outage degrades
 * to "anonymous" (clean 401 / authenticated:false) instead of an opaque 500.
 */
export async function safePrincipal(
  req: Parameters<typeof principalFromRequest>[0],
): Promise<Awaited<ReturnType<typeof principalFromRequest>>> {
  try {
    return await principalFromRequest(req);
  } catch (e) {
    warnCoreUnavailable(e);
    return null;
  }
}

function bearerToken(h?: string): string | undefined {
  return h && h.startsWith("Bearer ") ? h.slice(7).trim() : undefined;
}

function cookieValue(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const pair of header.split(";")) {
    const i = pair.indexOf("=");
    if (i > -1 && pair.slice(0, i).trim() === name) return decodeURIComponent(pair.slice(i + 1).trim());
  }
  return undefined;
}

/**
 * Authenticate a request. Now async: it first tries the FlorenceRN Core RS256
 * SSO token (from `Authorization: Bearer` OR the shared `fl_session` cookie),
 * verified via Core's JWKS; the Core role→scope derivation means the existing
 * scope checks below still apply unchanged. Falls back to the legacy HS256 path
 * (demo/M2M clients, locally-minted candidate sessions) during migration.
 */
export async function authenticate(authHeader?: string, cookieHeader?: string): Promise<AuthResult> {
  // 1) FlorenceRN Core SSO (RS256 via JWKS) — bearer or shared cookie.
  const coreToken = bearerToken(authHeader) ?? cookieValue(cookieHeader, CORE_COOKIE);
  if (coreToken) {
    // Core verification is best-effort: an invalid/expired token returns null, but
    // an OPERATIONAL failure (Core unconfigured, or its JWKS unreachable during an
    // outage) throws. Never let that 500 the request — degrade to the legacy HS256
    // path so M2M/legacy tokens keep working, and a real SSO token simply gets a
    // clean 401 rather than a 500. Warn (throttled) so a Core outage stays visible.
    let p: Awaited<ReturnType<typeof verifyCoreToken>> = null;
    try {
      p = await verifyCoreToken(coreToken);
    } catch (e) {
      warnCoreUnavailable(e);
    }
    if (p) {
      const scopes = new Set<Scope>([...p.scopes].filter(isScope));
      const ctx: AuthContext = {
        clientId: p.userId,
        scopes,
        jti: p.jti ?? `core:${p.userId}`,
        exp: p.exp,
      };
      if (p.cand) ctx.candidateId = p.cand;
      return { ok: true, ctx };
    }
  }

  // 2) Legacy HS256 fallback (Academy-minted tokens) — removed after full cutover.
  const token = bearerToken(authHeader);
  if (!token) return { ok: false, error: "missing bearer token" };
  const res = verifyJwt(token, config.jwtSecret, Math.floor(Date.now() / 1000));
  if (!res.ok) return { ok: false, error: res.error };
  if (res.payload.aud !== config.jwtAudience || res.payload.iss !== config.jwtIssuer)
    return { ok: false, error: "bad audience/issuer" };
  const scopes = new Set<Scope>(res.payload.scope.split(/\s+/).filter(isScope));
  const ctx: AuthContext = {
    clientId: res.payload.sub,
    scopes,
    jti: res.payload.jti,
    exp: res.payload.exp,
  };
  if (res.payload.cand) ctx.candidateId = res.payload.cand;
  return { ok: true, ctx };
}

export function hasScope(ctx: AuthContext, scope: Scope): boolean {
  return ctx.scopes.has(scope);
}

/** Build a client record from a management request (secret hashed here). */
export function buildClient(
  clientId: string,
  name: string,
  secret: string,
  scopes: Scope[],
): ApiClient {
  return {
    client_id: clientId,
    name,
    secret_hash: hashSecret(secret),
    allowed_scopes: scopes,
    active: true,
  };
}
