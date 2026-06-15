// Aggregate the gateway's module routes into one OpenAPI 3.1 contract, served
// (unauthenticated) at GET /v1/openapi.json. The Core-side companion to ats's
// own /v1/openapi.json; as capability modules move behind the gateway their paths
// aggregate here, so partners read ONE contract.

import { UNIFIED_SCOPES } from "./scopes.ts";
import type { GwRoute } from "./router.ts";

export function gatewayOpenapi(routes: GwRoute[]): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const r of routes) {
    // OpenAPI path templating: /v1/nurses/:id/passport → /v1/nurses/{id}/passport
    const p = r.pattern.replace(/:([A-Za-z_]+)/g, "{$1}");
    const op: Record<string, unknown> = {
      summary: r.summary ?? "",
      responses: { "200": { description: "ok" }, "401": { description: "unauthorized" }, "403": { description: "insufficient scope / forbidden" }, "404": { description: "not found" } },
    };
    if (r.scope) op["x-scope"] = r.scope;
    if (r.idempotent) op.parameters = [{ $ref: "#/components/parameters/IdempotencyKey" }];
    paths[p] = { ...(paths[p] ?? {}), [r.method.toLowerCase()]: op };
  }
  const xScopes: Record<string, string> = {};
  for (const s of UNIFIED_SCOPES) xScopes[s] = s;
  return {
    openapi: "3.1.0",
    info: {
      title: "FlorenceRN Platform API (Core gateway)",
      version: "v1",
      description:
        "Headless nurse-production platform. The Nurse Passport is the central object (permissioned views); the Production Ledger is the system of record; every workflow is an event. Auth: Core RS256 (fl_session cookie or Bearer), scoped per role. The employer audience NEVER receives visa/nationality/financing (Title VII/IRCA).",
    },
    servers: [{ url: "/" }],
    components: {
      securitySchemes: {
        coreCookie: { type: "apiKey", in: "cookie", name: "fl_session" },
        coreBearer: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      parameters: {
        IdempotencyKey: { name: "Idempotency-Key", in: "header", required: false, schema: { type: "string" }, description: "Retry-safe key; a duplicate create returns the original result." },
      },
    },
    security: [{ coreCookie: [] }, { coreBearer: [] }],
    "x-scopes": xScopes,
    paths,
  };
}
