// Gateway module: Model Gateway. POST /v1/model-gateway/tasks runs a registered AI
// task through the ONE policy/cache/cost seam; GET /v1/model-gateway/costs reports
// the meter + the task registry. Idempotent creates. Mock-by-default.
import { compileGw, type GwRoute } from "../router.ts";
import type { Audit } from "../../audit.ts";
import { runModelTask, modelCosts } from "../modelGateway.ts";
import type { DataClass } from "../../classification.ts";

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
        const r = runModelTask({ task, dataClass: b.data_class as DataClass | undefined, input: b.input });
        if (!r.ok) return { status: r.status, body: { error: r.reason, task: r.task } };
        await audit(String(ctx.claims?.email ?? ctx.claims?.sub ?? "service"), "model.task", "model", task, { cached: r.cached, model: r.model, humanQaRequired: r.humanQaRequired });
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
