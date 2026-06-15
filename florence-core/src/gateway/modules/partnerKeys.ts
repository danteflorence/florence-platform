// Gateway module: Developer Portal v1 — partner API-key self-service over Core's
// existing M2M (api_clients + /oauth/token). An admin provisions a partner client
// with a PARTNER-SAFE scope allowlist (read-only employer/opportunity/program/ledger/
// pricing — never internal passport, write, consent, or model scopes), and the
// client_credentials secret is returned ONCE. Audited. Scope: clients:manage.
import { randomBytes } from "node:crypto";
import { compileGw, type GwRoute } from "../router.ts";
import type { Store, ApiClient } from "../../store.ts";
import type { Audit } from "../../audit.ts";
import { hashSecret } from "../../crypto.ts";
import { id, nowIso } from "../../util.ts";

// The ONLY scopes a partner key may hold. Anything else is dropped (fail-closed),
// so a partner can never be granted internal passport / write / consent / model access.
const PARTNER_SAFE_SCOPES = new Set<string>([
  "passport:read:employer", "passport:read:university",
  "opportunities:read", "programs:read", "ledger:read", "pricing:quote",
]);

// Lender keys are MORE sensitive (financing) and MUST be org-bound. They get the
// consent-gated lender read + credit-data + portfolio — never internal passport / write.
const LENDER_SAFE_SCOPES = new Set<string>([
  "passport:read:lender", "credit:read", "credit:decide", "lender:portfolio:read", "ledger:read",
]);

export function partnerKeysModule(store: Store, audit: Audit): GwRoute[] {
  return [
    compileGw({
      method: "POST",
      pattern: "/v1/partner-keys",
      auth: true,
      scope: "clients:manage",
      idempotent: true,
      summary: "Provision a partner/lender M2M API key (read-only scoped). Lender keys are org-bound. Secret returned once.",
      handler: async (ctx) => {
        const b = (ctx.body ?? {}) as Record<string, unknown>;
        const name = typeof b.name === "string" && b.name.trim() ? b.name.trim() : undefined;
        if (!name) return { status: 400, body: { error: "name required" } };
        const orgId = typeof b.org_id === "string" && b.org_id.trim() ? b.org_id.trim() : undefined;
        const requested = Array.isArray(b.scopes) ? (b.scopes as unknown[]).filter((x): x is string => typeof x === "string") : [];
        const granted = requested.filter((s) => PARTNER_SAFE_SCOPES.has(s) || LENDER_SAFE_SCOPES.has(s));
        if (granted.length === 0) return { status: 400, body: { error: "at least one partner-safe scope required", allowed: [...PARTNER_SAFE_SCOPES, ...LENDER_SAFE_SCOPES] } };
        const isLender = granted.some((s) => LENDER_SAFE_SCOPES.has(s));
        // EVERY partner key MUST be org-bound. A partner M2M token is a restricted,
        // org-matched + consent-gated consumer — NOT a trusted internal proxy. Its org is
        // the tenant boundary: without it a partner could neither be scoped to its own
        // nurses/programs nor pass the consent gate. (Internal app clients are never
        // org-bound, so org_id presence is what distinguishes a partner downstream.)
        if (!orgId) return { status: 400, body: { error: "org_id required for a partner key (reads are org-matched + consent-gated)" } };
        const secret = randomBytes(28).toString("base64url");
        const client: ApiClient = {
          client_id: id(isLender ? "lk" : "pk"),
          name: `${isLender ? "lender" : "partner"}:${name}`,
          secret_hash: hashSecret(secret),
          allowed_scopes: granted,
          ...(orgId ? { org_id: orgId } : {}),
          ...(typeof b.sandbox === "boolean" && b.sandbox ? { audience: "sandbox" } : {}),
          active: true,
          created_at: nowIso(),
        };
        await store.insertClient(client);
        await audit(String(ctx.claims?.email ?? ctx.claims?.sub ?? "service"), "partner_key.create", "api_client", client.client_id, { name: client.name, scopes: granted, org_id: orgId });
        return { status: 201, body: { client_id: client.client_id, client_secret: secret, scopes: granted, ...(orgId ? { org_id: orgId } : {}), token_url: "/oauth/token", note: "Use client_credentials at /oauth/token. The secret is shown once." } };
      },
    }),
    compileGw({
      method: "GET",
      pattern: "/v1/partner-keys",
      auth: true,
      scope: "clients:manage",
      summary: "List partner API keys (client_id + scopes; secrets are never returned).",
      handler: async () => {
        const keys = (await store.listClients())
          .filter((c) => c.name.startsWith("partner:"))
          .map((c) => ({ client_id: c.client_id, name: c.name, scopes: c.allowed_scopes, active: c.active, created_at: c.created_at }));
        return { status: 200, body: { keys } };
      },
    }),
  ];
}
