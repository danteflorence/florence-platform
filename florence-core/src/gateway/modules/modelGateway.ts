// Gateway module: Model Gateway. POST /v1/model-gateway/tasks runs a registered AI
// task through the ONE policy/cache/cost seam; GET /v1/model-gateway/costs reports
// the meter + the task registry. Idempotent creates. Mock-by-default.
import { compileGw, type GwRoute } from "../router.ts";
import type { Audit } from "../../audit.ts";
import { runModelTask, modelCosts, type HighStakesAction, type ModelSourceType } from "../modelGateway.ts";
import type { DataClass } from "../../classification.ts";
import { STAFF_ROLES } from "../../roles.ts";
import type { CoreClaims } from "../../crypto.ts";

function canPermitFullPassport(claims: CoreClaims | undefined): boolean {
  const roles = Array.isArray(claims?.roles) ? claims.roles : claims?.role ? [claims.role] : [];
  if (roles.some((role) => (STAFF_ROLES as readonly string[]).includes(role))) return true;
  return claims?.m2m === true && !claims.org_id;
}

export function modelGatewayModule(audit: Audit): GwRoute[] {
  return [
    compileGw({
      method: "POST",
      pattern: "/v1/model-gateway/tasks",
      auth: true,
      scope: "model:run",
      idempotent: true,
      summary: "Run a registered AI task (policy + cache + cost-metered; mock-by-default).",
      handler: async (ctx) => {
        const b = (ctx.body ?? {}) as Record<string, unknown>;
        const task = typeof b.task === "string" ? b.task : undefined;
        if (!task) return { status: 400, body: { error: "task required" } };
        const r = await runModelTask({
          task,
          dataClass: b.data_class as DataClass | undefined,
          dataClasses: Array.isArray(b.data_classes) ? b.data_classes as DataClass[] : undefined,
          input: b.input,
          sourceTypes: Array.isArray(b.source_types) ? b.source_types as ModelSourceType[] : undefined,
          promptVersion: typeof b.prompt_version === "string" ? b.prompt_version : undefined,
          requestedAction: typeof b.requested_action === "string" ? b.requested_action as HighStakesAction : undefined,
          confidence: typeof b.confidence === "number" ? b.confidence : undefined,
          fullNursePassport: b.full_nurse_passport === true,
          fullNursePassportPolicyPermit: b.full_nurse_passport_policy_permit === true && canPermitFullPassport(ctx.claims),
          actor: String(ctx.claims?.email ?? ctx.claims?.sub ?? "service"),
          audit,
        });
        if (!r.ok) return { status: r.status, body: { error: r.reason, task: r.task } };
        return { status: 200, body: r };
      },
    }),
    compileGw({
      method: "GET",
      pattern: "/v1/model-gateway/costs",
      auth: true,
      scope: "model:read",
      summary: "Token + cost meter and the registered task catalog.",
      handler: () => ({ status: 200, body: modelCosts() }),
    }),
  ];
}
