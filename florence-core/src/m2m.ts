// Machine-to-machine tokens (OAuth2 client_credentials). Adapted from
// florence-academy/api/src/auth.ts:issueToken — the florenceos SERVICE_AUTH
// flow — but signed RS256 by the KeyManager. Per-service audience supported.

import { config } from "./config.ts";
import { hashSecret, verifySecret, type CoreClaims } from "./crypto.ts";
import type { KeyManager } from "./keys.ts";
import type { ApiClient, Store } from "./store.ts";
import { id, nowIso, nowSec } from "./util.ts";

export type IssueResult =
  | { ok: true; token: { access_token: string; token_type: "Bearer"; expires_in: number; scope: string } }
  | { ok: false; status: number; error: string };

export async function issueClientToken(
  store: Store,
  keys: KeyManager,
  clientId: string,
  clientSecret: string,
  requestedScope?: string,
  audience?: string,
): Promise<IssueResult> {
  const client = await store.getClient(clientId);
  if (!client || !client.active) return { ok: false, status: 401, error: "invalid_client" };
  if (!verifySecret(clientSecret, client.secret_hash)) return { ok: false, status: 401, error: "invalid_client" };

  let granted = client.allowed_scopes;
  if (requestedScope && requestedScope.trim()) {
    granted = requestedScope.split(/\s+/).filter((s) => client.allowed_scopes.includes(s));
    if (granted.length === 0) return { ok: false, status: 400, error: "invalid_scope" };
  }

  const now = nowSec();
  const claims: CoreClaims = {
    iss: config.issuer,
    aud: audience || client.audience || config.audience,
    sub: client.client_id,
    role: "service",
    roles: ["service"],
    scope: granted.join(" "),
    // Org-bound clients (partner banks / employers) carry their org so the gateway
    // resolves them to an org-scoped, consent-gated audience (e.g. lender).
    ...(client.org_id ? { org_id: client.org_id } : {}),
    m2m: true,
    iat: now,
    exp: now + config.m2mTokenTtlSec,
    jti: id("jti"),
  };
  return {
    ok: true,
    token: {
      access_token: keys.sign(claims),
      token_type: "Bearer",
      expires_in: config.m2mTokenTtlSec,
      scope: granted.join(" "),
    },
  };
}

/** Seed a demo client so the fleet has a working M2M credential out of the box. */
export async function seedDemoClient(store: Store): Promise<{ id: string; secret: string } | undefined> {
  if (!config.demoClientId) return undefined;
  if (await store.getClient(config.demoClientId)) return undefined;
  const c: ApiClient = {
    client_id: config.demoClientId,
    name: "Florence demo client",
    secret_hash: hashSecret(config.demoClientSecret),
    allowed_scopes: [
      "candidates:read",
      "candidates:write",
      "enrollment:read",
      "performance:read",
      "outcomes:read",
      "outcomes:write",
      "leads:read",
      "leads:write",
      "passport:read",
      "passport:write",
      "consent:read",
      "consent:write",
      "control-tower:read",
      "investor:read",
      "university:read",
    ],
    active: true,
    created_at: nowIso(),
  };
  await store.insertClient(c);
  return { id: c.client_id, secret: config.demoClientSecret };
}
