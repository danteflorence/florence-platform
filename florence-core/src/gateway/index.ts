// FlorenceRN Platform API gateway — assembly point. Builds the capability module
// routes + the aggregated OpenAPI route, and exposes the dispatcher mounted ahead
// of Core's legacy exact routes in server.ts. New capability modules (consent,
// ledger, opportunities, academy, pathway, …) register here as they move behind
// the gateway during the strangler migration.

import type { Audit } from "../audit.ts";
import type { KeyManager } from "../keys.ts";
import type { Store } from "../store.ts";
import { compileGw, type GwRoute } from "./router.ts";
import { createGatewayDispatch, type GatewayOpts } from "./pipeline.ts";
import { gatewayOpenapi } from "./openapi.ts";
import { devPortalHtml } from "./portal.ts";
import { nursesModule } from "./modules/nurses.ts";
import { ledgerModule } from "./modules/ledger.ts";
import { modelGatewayModule } from "./modules/modelGateway.ts";
import { webhooksModule } from "./modules/webhooks.ts";
import { partnerKeysModule } from "./modules/partnerKeys.ts";
import { lenderModule } from "./modules/lender.ts";
import { programsModule } from "./modules/programs.ts";
import { applicationsModule } from "./modules/applications.ts";
import { documentVaultModule } from "./modules/documentVault.ts";

export interface GatewayDeps {
  store: Store;
  keys: KeyManager;
  audit: Audit;
}

/** All gateway capability routes (auth'd) + the public OpenAPI contract route. */
export function buildGatewayRoutes(deps: GatewayDeps): GwRoute[] {
  const modules: GwRoute[] = [...nursesModule(deps.store, deps.audit), ...programsModule(deps.store, deps.audit), ...applicationsModule(deps.store, deps.audit), ...documentVaultModule(deps.store, deps.audit), ...ledgerModule(deps.store, deps.audit), ...modelGatewayModule(deps.audit), ...webhooksModule(deps.store, deps.audit), ...partnerKeysModule(deps.store, deps.audit), ...lenderModule(deps.store, deps.audit)];
  const openapiRoute = compileGw({
    method: "GET",
    pattern: "/v1/openapi.json",
    auth: false,
    summary: "Public OpenAPI 3.1 contract for the Platform API gateway.",
    handler: () => ({ status: 200, body: gatewayOpenapi(modules) }),
  });
  const docsRoute = compileGw({
    method: "GET",
    pattern: "/v1/docs",
    auth: false,
    summary: "Developer Portal — self-contained docs that render the OpenAPI contract.",
    handler: () => ({ status: 200, body: devPortalHtml(), contentType: "text/html" }),
  });
  const healthRoute = compileGw({
    method: "GET",
    pattern: "/v1/health",
    auth: false,
    summary: "Liveness/readiness probe (no auth).",
    handler: () => ({ status: 200, body: { ok: true, service: "florencern-core", env: process.env.FLORENCE_ENV ?? "local" } }),
  });
  return [...modules, openapiRoute, docsRoute, healthRoute];
}

/** The dispatcher to mount in createApp(...) — returns true iff it handled the request. */
export function createGateway(deps: GatewayDeps, opts: GatewayOpts = {}): (ctx: import("../server.ts").Ctx) => Promise<boolean> {
  return createGatewayDispatch(buildGatewayRoutes(deps), deps.keys, deps.store, deps.audit, opts);
}
