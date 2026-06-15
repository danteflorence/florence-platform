// The Core HTTP API: sign-in (Google + password), session cookie, /me, JWKS +
// discovery, M2M /oauth/token, and the admin console. Handlers close over the
// service deps. Every app in the fleet trusts the token minted here.

import { randomBytes } from "node:crypto";
import type { Audit } from "./audit.ts";
import { config, googleConfigured } from "./config.ts";
import { verifyJwtRS256, type CoreClaims } from "./crypto.ts";
import { exchangeCode, googleAuthUrl, type GoogleProfile } from "./google.ts";
import { adminPage, loginPage } from "./html.ts";
import type { KeyManager } from "./keys.ts";
import { issueClientToken } from "./m2m.ts";
import { ALL_ROLES, isRole, type Role } from "./roles.ts";
import { readPassportView } from "./passportRead.ts";
import {
  redirect,
  safeRedirect,
  sendHtml,
  sendJson,
  setCookie,
  type Ctx,
  type Route,
} from "./server.ts";
import type { Org, Store } from "./store.ts";
import { mintUserSession } from "./tokens.ts";
import {
  bootstrapFirstAdmin,
  createOrg,
  createUser,
  findOrCreateGoogleUser,
  grantRole,
  isStaffEmail,
  sessionFor,
  verifyPassword,
} from "./users.ts";
import { issueRefresh, peekRefresh, revokeRefresh, rotateRefresh } from "./sessions.ts";
import { lookupNurse, recordEvent, resolveNurse, type ResolveInput } from "./nurses.ts";
import { grantConsent, revokeConsentById } from "./consent.ts";
import { controlTower, type ControlTowerSummary } from "./controlTower.ts";
import { investorReport } from "./investorReport.ts";
import { universityCohorts } from "./universityReport.ts";
import { nowSec, nowIso } from "./util.ts";

export interface Deps {
  store: Store;
  keys: KeyManager;
  audit: Audit;
}

function bearerOrCookie(ctx: Ctx): string | undefined {
  const h = ctx.req.headers.authorization;
  if (h && h.startsWith("Bearer ")) return h.slice(7).trim();
  return ctx.cookies[config.cookieName];
}

function verifySession(ctx: Ctx, keys: KeyManager): CoreClaims | undefined {
  const tok = bearerOrCookie(ctx);
  if (!tok) return undefined;
  const r = verifyJwtRS256(tok, (kid) => keys.resolveKey(kid), nowSec(), {
    iss: config.issuer,
    aud: config.audience,
  });
  return r.ok ? r.payload : undefined;
}

/** Gate an M2M (or session) call on a required scope from the token's `scope` claim. */
function requireScope(ctx: Ctx, keys: KeyManager, scope: string): CoreClaims | undefined {
  const claims = verifySession(ctx, keys);
  if (!claims) {
    sendJson(ctx.res, 401, { error: "unauthorized" });
    return undefined;
  }
  const scopes = String(claims.scope ?? "").split(/\s+/).filter(Boolean);
  if (!scopes.includes(scope)) {
    sendJson(ctx.res, 403, { error: "insufficient_scope", need: scope });
    return undefined;
  }
  return claims;
}

const bstr = (b: Record<string, unknown>, k: string): string | undefined =>
  typeof b[k] === "string" ? (b[k] as string) : undefined;

// Passport audience derivation + the canonical consent/policy/redaction/audit read
// path now live in ./passportRead.ts (shared by this legacy route and the gateway).

/** Build a nurse ResolveInput from a request body (ref via {app,externalId} or flat). */
function resolveInputFromBody(b: Record<string, unknown>): ResolveInput | undefined {
  let ref: { app: string; externalId: string } | undefined;
  const r = b.ref;
  if (r && typeof r === "object") {
    const app = (r as Record<string, unknown>).app;
    const ext = (r as Record<string, unknown>).externalId;
    if (typeof app === "string" && typeof ext === "string") ref = { app, externalId: ext };
  } else if (bstr(b, "app") && bstr(b, "externalId")) {
    ref = { app: bstr(b, "app")!, externalId: bstr(b, "externalId")! };
  }
  const input: ResolveInput = { nurseId: bstr(b, "nurseId"), email: bstr(b, "email"), name: bstr(b, "name"), ref };
  if (!input.nurseId && !input.email && !input.ref) return undefined;
  return input;
}

const REFRESH_COOKIE = "fl_refresh";

function sessionCookieOpts(maxAge: number) {
  return {
    ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
    secure: config.cookieSecure,
    httpOnly: true,
    sameSite: "Lax" as const,
    maxAge,
  };
}
// Same attributes as the access cookie; named separately for clarity.
const refreshCookieOpts = sessionCookieOpts;

function wantsJson(ctx: Ctx): boolean {
  return (
    (ctx.req.headers.accept ?? "").includes("application/json") ||
    (ctx.req.headers["content-type"] ?? "").includes("application/json")
  );
}

export function buildRoutes(deps: Deps): Route[] {
  const { store, keys, audit } = deps;

  // Control Tower aggregate is expensive (folds all nurses) — short TTL cache.
  const ctFeeUsd = Number(process.env["CONTROL_TOWER_MONTHLY_FEE_USD"] ?? 1750);
  const ctTtlMs = Number(process.env["CONTROL_TOWER_CACHE_MS"] ?? 30000);
  let ctCache: { at: number; summary: ControlTowerSummary } | null = null;
  const computeControlTower = async (): Promise<ControlTowerSummary> => {
    if (ctCache && Date.now() - ctCache.at < ctTtlMs) return ctCache.summary;
    const bundles = await store.allNurseBundles();
    const summary = controlTower(bundles, { feeUsd: ctFeeUsd, now: nowIso() });
    ctCache = { at: Date.now(), summary };
    return summary;
  };

  // Mint a fresh short-lived access token and set the fl_session cookie.
  const mintAccessAndSet = async (ctx: Ctx, userId: string): Promise<string | null> => {
    const sess = await sessionFor(store, userId);
    if (!sess) return null;
    const { token } = mintUserSession(keys, sess.user, sess.grants);
    setCookie(ctx.res, config.cookieName, token, sessionCookieOpts(config.humanSessionTtlSec));
    return token;
  };
  const setRefreshCookie = (ctx: Ctx, raw: string) =>
    setCookie(ctx.res, REFRESH_COOKIE, raw, refreshCookieOpts(config.refreshTtlSec));
  const clearAuthCookies = (ctx: Ctx) => {
    setCookie(ctx.res, config.cookieName, "", sessionCookieOpts(0));
    setCookie(ctx.res, REFRESH_COOKIE, "", refreshCookieOpts(0));
  };

  const finishLogin = async (ctx: Ctx, userId: string, email: string, via: string, redirectTo: string) => {
    await store.updateUser(userId, { last_login_at: new Date().toISOString() });
    const token = await mintAccessAndSet(ctx, userId);
    if (!token) {
      sendHtml(ctx.res, 500, "session error");
      return;
    }
    setRefreshCookie(ctx, await issueRefresh(store, userId));
    await audit(email, "auth.login", "user", userId, { via });
    if (wantsJson(ctx)) sendJson(ctx.res, 200, { ok: true, token, redirect: redirectTo });
    else redirect(ctx.res, redirectTo);
  };

  const requireAdmin = (ctx: Ctx): CoreClaims | undefined => {
    const claims = verifySession(ctx, keys);
    if (!claims) {
      redirect(ctx.res, `/login?redirect=${encodeURIComponent(`${config.publicUrl}/admin`)}`);
      return undefined;
    }
    if (claims.role !== "super_admin" && claims.role !== "ops") {
      sendHtml(ctx.res, 403, "<div style='font-family:sans-serif;padding:40px'>Forbidden — identity admin is restricted to super_admin / ops.</div>");
      return undefined;
    }
    return claims;
  };

  return [
    { method: "GET", path: "/health", handler: (ctx) => sendJson(ctx.res, 200, { ok: true, service: "florence-core" }) },

    { method: "GET", path: "/", handler: (ctx) => redirect(ctx.res, "/admin") },

    {
      method: "GET",
      path: "/login",
      handler: async (ctx) => {
        const redirectTo = safeRedirect(ctx.query.get("redirect"));
        // Silent sliding SSO: a still-valid refresh cookie re-mints the access
        // cookie and bounces back — no login screen until the refresh expires or
        // is revoked. (peek, not rotate — avoids a multi-tab rotation race.)
        const userId = await peekRefresh(store, ctx.cookies[REFRESH_COOKIE]);
        if (userId && (await mintAccessAndSet(ctx, userId))) {
          redirect(ctx.res, redirectTo);
          return;
        }
        sendHtml(
          ctx.res,
          200,
          loginPage({
            redirect: redirectTo,
            googleEnabled: googleConfigured(),
            ...(config.allowedEmailDomains[0] ? { allowedDomain: config.allowedEmailDomains[0] } : {}),
          }),
        );
      },
    },

    {
      method: "GET",
      path: "/auth/google/start",
      handler: (ctx) => {
        if (!googleConfigured()) {
          sendHtml(ctx.res, 503, "Google sign-in is not configured on this instance.");
          return;
        }
        const redirectTo = safeRedirect(ctx.query.get("redirect"));
        const nonce = randomBytes(16).toString("hex");
        const state = Buffer.from(JSON.stringify({ r: redirectTo, n: nonce })).toString("base64url");
        setCookie(ctx.res, "fl_oauth", nonce, { secure: config.cookieSecure, httpOnly: true, sameSite: "Lax", maxAge: 600 });
        redirect(ctx.res, googleAuthUrl(state));
      },
    },

    {
      method: "GET",
      path: "/auth/google/callback",
      handler: async (ctx) => {
        const code = ctx.query.get("code");
        const stateRaw = ctx.query.get("state");
        if (!code || !stateRaw) {
          sendHtml(ctx.res, 400, "Missing code/state.");
          return;
        }
        let st: { r?: string; n?: string };
        try {
          st = JSON.parse(Buffer.from(stateRaw, "base64url").toString("utf8"));
        } catch {
          sendHtml(ctx.res, 400, "Bad state.");
          return;
        }
        const redirectTo = safeRedirect(st.r);
        if (!st.n || ctx.cookies["fl_oauth"] !== st.n) {
          sendHtml(ctx.res, 400, loginPage({ redirect: redirectTo, googleEnabled: true, error: "Sign-in state expired — please try again." }));
          return;
        }
        let profile: GoogleProfile;
        try {
          profile = await exchangeCode(code);
        } catch {
          sendHtml(ctx.res, 502, loginPage({ redirect: redirectTo, googleEnabled: true, error: "Google sign-in failed. Please try again." }));
          return;
        }
        if (!profile.email || !profile.email_verified) {
          sendHtml(ctx.res, 403, loginPage({ redirect: redirectTo, googleEnabled: true, error: "Your Google email isn't verified." }));
          return;
        }
        if (!isStaffEmail(profile.email, config.allowedEmailDomains)) {
          sendHtml(ctx.res, 403, loginPage({
            redirect: redirectTo,
            googleEnabled: true,
            error: `${profile.email} isn't in an authorized Florence workspace. External partners sign in with email + password.`,
          }));
          return;
        }
        const user = await findOrCreateGoogleUser(store, audit, {
          sub: profile.sub,
          email: profile.email,
          ...(profile.name ? { name: profile.name } : {}),
        });
        await bootstrapFirstAdmin(store, audit, user);
        setCookie(ctx.res, "fl_oauth", "", { secure: config.cookieSecure, httpOnly: true, sameSite: "Lax", maxAge: 0 });
        await finishLogin(ctx, user.id, user.email, "google", redirectTo);
      },
    },

    {
      method: "POST",
      path: "/auth/password",
      handler: async (ctx) => {
        const email = String(ctx.body.email ?? "");
        const password = String(ctx.body.password ?? "");
        const redirectTo = safeRedirect(String(ctx.body.redirect ?? ctx.query.get("redirect") ?? ""));
        const user = await verifyPassword(store, email, password);
        if (!user) {
          if (wantsJson(ctx)) sendJson(ctx.res, 401, { error: "invalid_credentials" });
          else
            sendHtml(ctx.res, 401, loginPage({
              redirect: redirectTo,
              googleEnabled: googleConfigured(),
              error: "Incorrect email or password.",
              ...(config.allowedEmailDomains[0] ? { allowedDomain: config.allowedEmailDomains[0] } : {}),
            }));
          return;
        }
        await finishLogin(ctx, user.id, user.email, "password", redirectTo);
      },
    },

    {
      method: "POST",
      path: "/auth/refresh",
      handler: async (ctx) => {
        // Rotating refresh: revoke the presented token, issue a new one, and mint
        // a fresh access cookie. A reused/revoked/expired token → 401 + clear.
        const r = await rotateRefresh(store, ctx.cookies[REFRESH_COOKIE]);
        if (!r) {
          clearAuthCookies(ctx);
          sendJson(ctx.res, 401, { ok: false, error: "invalid_refresh" });
          return;
        }
        setRefreshCookie(ctx, r.newRaw);
        const token = await mintAccessAndSet(ctx, r.userId);
        sendJson(ctx.res, token ? 200 : 401, token ? { ok: true, token } : { ok: false, error: "user_gone" });
      },
    },

    {
      method: "POST",
      path: "/logout",
      handler: async (ctx) => {
        await revokeRefresh(store, ctx.cookies[REFRESH_COOKIE]); // real server-side revocation
        clearAuthCookies(ctx);
        if (wantsJson(ctx)) sendJson(ctx.res, 200, { ok: true });
        else redirect(ctx.res, safeRedirect(String(ctx.body.redirect ?? ctx.query.get("redirect") ?? "")));
      },
    },

    {
      method: "GET",
      path: "/logout-link",
      handler: async (ctx) => {
        await revokeRefresh(store, ctx.cookies[REFRESH_COOKIE]);
        clearAuthCookies(ctx);
        redirect(ctx.res, "/login");
      },
    },

    {
      method: "GET",
      path: "/me",
      handler: (ctx) => {
        const claims = verifySession(ctx, keys);
        if (!claims) {
          sendJson(ctx.res, 401, { authenticated: false });
          return;
        }
        sendJson(ctx.res, 200, {
          authenticated: true,
          user: { id: claims.sub, email: claims.email ?? null, name: claims.name ?? null },
          role: claims.role ?? null,
          roles: claims.roles ?? [],
          org_id: claims.org_id ?? null,
          cand: claims.cand ?? null,
          territory: claims.territory ?? null,
          scope: claims.scope,
          exp: claims.exp,
          token: bearerOrCookie(ctx) ?? null,
        });
      },
    },

    { method: "GET", path: "/.well-known/jwks.json", handler: (ctx) => sendJson(ctx.res, 200, keys.jwksJson()) },

    {
      method: "GET",
      path: "/.well-known/openid-configuration",
      handler: (ctx) =>
        sendJson(ctx.res, 200, {
          issuer: config.issuer,
          authorization_endpoint: `${config.publicUrl}/auth/google/start`,
          token_endpoint: `${config.publicUrl}/oauth/token`,
          jwks_uri: `${config.publicUrl}/.well-known/jwks.json`,
          userinfo_endpoint: `${config.publicUrl}/me`,
          response_types_supported: ["code"],
          id_token_signing_alg_values_supported: ["RS256"],
          grant_types_supported: ["client_credentials", "authorization_code"],
        }),
    },

    {
      method: "POST",
      path: "/oauth/token",
      handler: async (ctx) => {
        if (String(ctx.body.grant_type ?? "") !== "client_credentials") {
          sendJson(ctx.res, 400, { error: "unsupported_grant_type", detail: "grant_type must be client_credentials" });
          return;
        }
        const r = await issueClientToken(
          store,
          keys,
          String(ctx.body.client_id ?? ""),
          String(ctx.body.client_secret ?? ""),
          ctx.body.scope ? String(ctx.body.scope) : undefined,
          ctx.body.audience ? String(ctx.body.audience) : undefined,
        );
        if (!r.ok) sendJson(ctx.res, r.status, { error: r.error });
        else sendJson(ctx.res, 200, r.token);
      },
    },

    // ── Nurse Passport spine (M2M) ──────────────────────────────────────────
    // Apps resolve their candidate to the canonical nurse, emit journey events,
    // and read the folded Passport. Scope-gated: passport:write / passport:read.
    {
      method: "POST",
      path: "/v1/nurse/resolve",
      handler: async (ctx) => {
        if (!requireScope(ctx, keys, "passport:write")) return;
        const input = resolveInputFromBody(ctx.body);
        if (!input) {
          sendJson(ctx.res, 400, { error: "invalid_request", detail: "need nurseId, email, or ref {app, externalId}" });
          return;
        }
        const nurse = await resolveNurse(store, input);
        await audit("service", "passport.resolve", "nurse", nurse.id, { via: input.ref?.app ?? (input.email ? "email" : "id") });
        sendJson(ctx.res, 200, { nurseId: nurse.id, email: nurse.email, name: nurse.name });
      },
    },
    {
      method: "POST",
      path: "/v1/nurse/event",
      handler: async (ctx) => {
        const claims = requireScope(ctx, keys, "passport:write");
        if (!claims) return;
        const type = bstr(ctx.body, "type");
        if (!type) {
          sendJson(ctx.res, 400, { error: "invalid_request", detail: "type is required" });
          return;
        }
        const input = resolveInputFromBody(ctx.body);
        if (!input) {
          sendJson(ctx.res, 400, { error: "invalid_request", detail: "need nurseId, email, or ref to attach the event" });
          return;
        }
        const nurse = await resolveNurse(store, input);
        const data = ctx.body.data && typeof ctx.body.data === "object" ? (ctx.body.data as Record<string, unknown>) : {};
        const ev = await recordEvent(store, nurse.id, {
          type,
          source: bstr(ctx.body, "source") ?? String(claims.sub ?? "service"),
          at: bstr(ctx.body, "at"),
          data,
        });
        sendJson(ctx.res, 200, { ok: true, nurseId: nurse.id, event: ev });
      },
    },
    {
      method: "GET",
      path: "/v1/nurse/passport",
      handler: async (ctx) => {
        // Thin wrapper over the canonical read path (passportRead.ts) — the same
        // path the Platform-API gateway uses, so there is ONE redactor + audit point.
        const claims = verifySession(ctx, keys);
        if (!claims) {
          sendJson(ctx.res, 401, { error: "unauthorized" });
          return;
        }
        const role: Role = isRole(String(claims.role ?? "")) ? (claims.role as Role) : "candidate";
        const result = await readPassportView(store, audit, {
          selector: {
            nurseId: ctx.query.get("nurseId") ?? undefined,
            email: ctx.query.get("email") ?? undefined,
            ref: ctx.query.get("ref") ?? undefined,
          },
          role,
          scopes: String(claims.scope ?? "").split(/\s+/).filter(Boolean),
          ...(claims.org_id ? { orgId: claims.org_id } : {}),
          ...(claims.cand ? { cand: claims.cand } : {}),
          actor: String(claims.email ?? claims.sub ?? "service"),
          ...(ctx.query.get("audience") ? { requestedAudience: ctx.query.get("audience")! } : {}),
          ...(ctx.query.get("purpose") ? { purpose: ctx.query.get("purpose")! } : {}),
        });
        sendJson(ctx.res, result.status, result.body);
      },
    },
    {
      method: "GET",
      path: "/v1/nurse/events",
      handler: async (ctx) => {
        if (!requireScope(ctx, keys, "passport:read")) return;
        const nurse = await lookupNurse(store, {
          nurseId: ctx.query.get("nurseId") ?? undefined,
          email: ctx.query.get("email") ?? undefined,
          ref: ctx.query.get("ref") ?? undefined,
        });
        if (!nurse) {
          sendJson(ctx.res, 404, { error: "nurse_not_found" });
          return;
        }
        const events = await store.eventsByNurse(nurse.id);
        const limit = Math.max(1, Math.min(500, Number(ctx.query.get("limit") ?? "100")));
        sendJson(ctx.res, 200, { nurseId: nurse.id, events: events.slice(-limit).reverse() });
      },
    },

    // ── Consent service (canonical) ─────────────────────────────────────────
    // Apps (and the candidate-facing surfaces) grant/revoke consent here. The
    // folded Passport's coarse consents map stays in sync via a legacy event.
    {
      method: "POST",
      path: "/v1/consent/grant",
      handler: async (ctx) => {
        const claims = requireScope(ctx, keys, "consent:write");
        if (!claims) return;
        const input = resolveInputFromBody(ctx.body);
        const purpose = bstr(ctx.body, "purpose");
        const recipientCategory = bstr(ctx.body, "recipientCategory");
        const consentTextVersion = bstr(ctx.body, "consentTextVersion");
        if (!input || !purpose || !recipientCategory || !consentTextVersion) {
          sendJson(ctx.res, 400, { error: "invalid_request", detail: "need nurse ref + purpose + recipientCategory + consentTextVersion" });
          return;
        }
        const nurse = await resolveNurse(store, input);
        const allowed = Array.isArray(ctx.body.allowedFields)
          ? (ctx.body.allowedFields as unknown[]).filter((x): x is string => typeof x === "string")
          : undefined;
        const row = await grantConsent(store, audit, {
          nurseId: nurse.id,
          purpose,
          recipientCategory,
          ...(bstr(ctx.body, "recipientOrgId") ? { recipientOrgId: bstr(ctx.body, "recipientOrgId") } : {}),
          ...(allowed ? { allowedFields: allowed } : {}),
          consentTextVersion,
          ...(bstr(ctx.body, "consentTextHash") ? { consentTextHash: bstr(ctx.body, "consentTextHash") } : {}),
          ...(bstr(ctx.body, "ipHash") ? { ipHash: bstr(ctx.body, "ipHash") } : {}),
          ...(bstr(ctx.body, "deviceHash") ? { deviceHash: bstr(ctx.body, "deviceHash") } : {}),
          grantedBy: String(claims.email ?? claims.sub ?? "service"),
        });
        sendJson(ctx.res, 200, { ok: true, consent: row });
      },
    },
    {
      method: "POST",
      path: "/v1/consent/revoke",
      handler: async (ctx) => {
        const claims = requireScope(ctx, keys, "consent:write");
        if (!claims) return;
        const consentId = bstr(ctx.body, "consentId");
        const purpose = bstr(ctx.body, "purpose");
        const input = resolveInputFromBody(ctx.body);
        if (!consentId || !purpose || !input) {
          sendJson(ctx.res, 400, { error: "invalid_request", detail: "need consentId + purpose + nurse ref" });
          return;
        }
        const nurse = await lookupNurse(store, {
          nurseId: input.nurseId,
          email: input.email,
          ref: input.ref ? `${input.ref.app}:${input.ref.externalId}` : undefined,
        });
        if (!nurse) {
          sendJson(ctx.res, 404, { error: "nurse_not_found" });
          return;
        }
        await revokeConsentById(store, audit, { id: consentId, nurseId: nurse.id, purpose, by: String(claims.email ?? claims.sub ?? "service") });
        sendJson(ctx.res, 200, { ok: true });
      },
    },
    {
      method: "GET",
      path: "/v1/consent",
      handler: async (ctx) => {
        if (!requireScope(ctx, keys, "consent:read")) return;
        const nurse = await lookupNurse(store, {
          nurseId: ctx.query.get("nurseId") ?? undefined,
          email: ctx.query.get("email") ?? undefined,
          ref: ctx.query.get("ref") ?? undefined,
        });
        if (!nurse) {
          sendJson(ctx.res, 404, { error: "nurse_not_found" });
          return;
        }
        const consents = await store.consentsByNurse(nurse.id);
        sendJson(ctx.res, 200, { nurseId: nurse.id, consents });
      },
    },

    // ── Production Ledger Control Tower (internal cockpit; aggregate + roster) ──
    {
      method: "GET",
      path: "/v1/control-tower",
      handler: async (ctx) => {
        const claims = requireScope(ctx, keys, "control-tower:read");
        if (!claims) return;
        const summary = await computeControlTower();
        await audit(String(claims.email ?? claims.sub ?? "service"), "control_tower.read", "control_tower", "summary", {
          totalNurses: summary.totalNurses,
          licensedAvailable: summary.licensedAvailable,
          highestRiskCount: summary.onboardingRisks.highestRiskCount,
        });
        // Rosters carry PII — only on explicit ?roster=1; default is aggregate-only.
        const wantRoster = ctx.query.get("roster") === "1";
        sendJson(ctx.res, 200, wantRoster ? summary : { ...summary, roster: undefined, atRiskRoster: undefined });
      },
    },

    {
      method: "GET",
      path: "/v1/control-tower/retention",
      handler: async (ctx) => {
        const claims = requireScope(ctx, keys, "control-tower:read");
        if (!claims) return;
        // Rides the same cached summary fold — no extra aggregation, no N+1.
        const summary = await computeControlTower();
        await audit(String(claims.email ?? claims.sub ?? "service"), "control_tower.retention_read", "control_tower", "retention", {
          startedBillingGrade: summary.retention.startedBillingGrade,
          monthlyRecurringUsd: summary.retention.recurring.monthlyRecurringUsd,
        });
        // Aggregate-only (cohorts/curve/recurring carry no PII).
        const { cohorts, curve, recurring, note } = summary.retention;
        sendJson(ctx.res, 200, { cohorts, curve, recurring, note, generatedAt: summary.generatedAt });
      },
    },

    {
      method: "GET",
      path: "/v1/investor/report",
      handler: async (ctx) => {
        const claims = requireScope(ctx, keys, "investor:read");
        if (!claims) return;
        const summary = await computeControlTower();
        const report = investorReport(summary);
        await audit(String(claims.email ?? claims.sub ?? "service"), "investor.read", "investor", "report", { totalNurses: report.totalNurses, monthlyRecurringUsd: report.forecast.monthlyRecurringUsd });
        sendJson(ctx.res, 200, report); // zero-PII rollup
      },
    },

    {
      method: "GET",
      path: "/v1/university/cohorts",
      handler: async (ctx) => {
        const claims = requireScope(ctx, keys, "university:read");
        if (!claims) return;
        const bundles = await store.allNurseBundles();
        const minCell = Number(ctx.query.get("minCell") ?? "5");
        const report = universityCohorts(bundles, { minCell, now: nowIso() });
        await audit(String(claims.email ?? claims.sub ?? "service"), "university.read", "university", "cohorts", { cohorts: report.cohorts.length, suppressedCells: report.suppressedCells });
        sendJson(ctx.res, 200, report); // k-anonymized, zero-PII
      },
    },

    {
      method: "GET",
      path: "/admin",
      handler: async (ctx) => {
        const me = requireAdmin(ctx);
        if (!me) return;
        const [users, orgs, grants] = await Promise.all([store.listUsers(), store.listOrgs(), store.listGrants()]);
        const rows = users.map((u) => ({ user: u, roles: grants.filter((g) => g.user_id === u.id).map((g) => g.role) }));
        const notice = ctx.query.get("notice");
        sendHtml(ctx.res, 200, adminPage({
          me: { email: me.email ?? "", role: me.role ?? "" },
          users: rows,
          orgs,
          grants,
          roles: ALL_ROLES,
          ...(notice ? { notice } : {}),
        }));
      },
    },

    {
      method: "POST",
      path: "/admin/users",
      handler: async (ctx) => {
        const me = requireAdmin(ctx);
        if (!me) return;
        try {
          await createUser(store, audit, {
            email: String(ctx.body.email ?? ""),
            ...(ctx.body.name ? { name: String(ctx.body.name) } : {}),
            ...(ctx.body.password ? { password: String(ctx.body.password) } : {}),
            actor: me.email ?? "admin",
          });
        } catch (e) {
          redirect(ctx.res, `/admin?notice=${encodeURIComponent(`Create failed: ${(e as Error).message}`)}`);
          return;
        }
        redirect(ctx.res, `/admin?notice=${encodeURIComponent("User created.")}`);
      },
    },

    {
      method: "POST",
      path: "/admin/grant",
      handler: async (ctx) => {
        const me = requireAdmin(ctx);
        if (!me) return;
        const role = String(ctx.body.role ?? "");
        if (!isRole(role)) {
          redirect(ctx.res, `/admin?notice=${encodeURIComponent("Invalid role.")}`);
          return;
        }
        await grantRole(store, audit, {
          userId: String(ctx.body.userId ?? ""),
          role,
          ...(ctx.body.orgId ? { orgId: String(ctx.body.orgId) } : {}),
          ...(ctx.body.territory ? { territory: String(ctx.body.territory) } : {}),
          grantedBy: me.email ?? "admin",
        });
        redirect(ctx.res, `/admin?notice=${encodeURIComponent("Role granted.")}`);
      },
    },

    {
      method: "POST",
      path: "/admin/org",
      handler: async (ctx) => {
        const me = requireAdmin(ctx);
        if (!me) return;
        const kind = String(ctx.body.kind ?? "employer") as Org["kind"];
        await createOrg(store, audit, {
          kind,
          name: String(ctx.body.name ?? ""),
          ...(ctx.body.externalRef ? { externalRef: String(ctx.body.externalRef) } : {}),
          actor: me.email ?? "admin",
        });
        redirect(ctx.res, `/admin?notice=${encodeURIComponent("Org created.")}`);
      },
    },
  ];
}
