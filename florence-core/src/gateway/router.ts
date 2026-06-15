// Regex path-param router for the Platform API gateway (ports the proven matcher
// from florence-academy/api/src/http.ts into Core). Core's legacy routes stay
// exact-match in server.ts; the gateway adds `/v1/nurses/:id/...`-style routes.

import type { Ctx } from "../server.ts";
import type { CoreClaims } from "../crypto.ts";

/** Gateway request context = Core's Ctx + resolved path params + the verified token. */
export interface GwCtx extends Ctx {
  params: Record<string, string>;
  claims?: CoreClaims;
}

/** A handler returns a plain {status, body}; the pipeline sends it (so handlers are
 *  pure of the response object and trivially unit-testable). */
export interface GwResult {
  status: number;
  body: unknown;
  /** Set to "text/html" to send `body` as an HTML string (e.g. the dev portal). */
  contentType?: string;
}
export type GwHandler = (ctx: GwCtx) => Promise<GwResult> | GwResult;

export interface GwRouteDef {
  method: string;
  /** Express-style pattern, e.g. "/v1/nurses/:id/passport". */
  pattern: string;
  /** Whether a valid Core session/M2M token is required. */
  auth: boolean;
  /** A STATIC required scope the pipeline enforces, or null when the handler
   *  self-gates (e.g. the passport read, whose scope depends on the audience). */
  scope?: string | null;
  /** Marks a create route as retry-safe via the Idempotency-Key header. */
  idempotent?: boolean;
  summary?: string;
  handler: GwHandler;
}

export interface GwRoute extends GwRouteDef {
  regex: RegExp;
  keys: string[];
}

export function compileGw(def: GwRouteDef): GwRoute {
  const keys: string[] = [];
  const regex = new RegExp(
    "^" +
      def.pattern.replace(/:[A-Za-z_]+/g, (m) => {
        keys.push(m.slice(1));
        return "([^/]+)";
      }) +
      "/?$",
  );
  return { ...def, regex, keys };
}

export function matchGw(
  routes: GwRoute[],
  method: string,
  path: string,
): { route: GwRoute; params: Record<string, string> } | null {
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
