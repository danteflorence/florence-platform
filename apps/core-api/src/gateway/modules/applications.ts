import type { Audit } from "../../audit.ts";
import {
  checkApplicationGate,
  registerEmployerInterest,
  submitApplicationThroughGate,
  type ApplicationGateAction,
} from "../../applicationGate.ts";
import type { Store, SubmissionChannel } from "../../store.ts";
import { compileGw, type GwCtx, type GwRoute } from "../router.ts";

const CHANNELS = new Set<SubmissionChannel>(["direct", "ats", "vms", "amn", "other"]);
const ACTIONS = new Set<ApplicationGateAction>([
  "express_interest",
  "release_employer_profile",
  "release_employer_packet",
  "submit_application",
  "ats_submission",
  "vms_submission",
]);

const actorOf = (ctx: GwCtx): string => String(ctx.claims?.email ?? ctx.claims?.sub ?? "service");

function str(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function channel(body: Record<string, unknown>): SubmissionChannel | undefined {
  const raw = str(body, "channel");
  return raw && CHANNELS.has(raw as SubmissionChannel) ? raw as SubmissionChannel : undefined;
}

function action(body: Record<string, unknown>, fallback: ApplicationGateAction): ApplicationGateAction {
  const raw = str(body, "action");
  return raw && ACTIONS.has(raw as ApplicationGateAction) ? raw as ApplicationGateAction : fallback;
}

function gateInput(ctx: GwCtx, fallbackAction: ApplicationGateAction) {
  const b = (ctx.body ?? {}) as Record<string, unknown>;
  const nurseId = str(b, "nurseId") ?? str(b, "candidateId");
  if (!nurseId) return { error: "nurseId required" } as const;
  return {
    nurseId,
    employerId: str(b, "employerId") ?? ctx.claims?.org_id,
    programId: str(b, "programId"),
    jobRequisitionId: str(b, "jobRequisitionId") ?? str(b, "requisitionId"),
    jobStatus: str(b, "jobStatus"),
    requiredLicenseState: str(b, "requiredLicenseState"),
    channel: channel(b),
    action: action(b, fallbackAction),
    actor: actorOf(ctx),
  } as const;
}

export function applicationsModule(store: Store, audit: Audit): GwRoute[] {
  const gateCheck = (pattern: string) =>
    compileGw({
      method: "POST",
      pattern,
      auth: true,
      scope: "applications:eligibility",
      summary: "Run the central Application Gate without acquiring a submission lock.",
      handler: async (ctx) => {
        const input = gateInput(ctx, "submit_application");
        if ("error" in input) return { status: 400, body: { error: input.error } };
        const gate = await checkApplicationGate(store, audit, input);
        return { status: 200, body: { gate } };
      },
    });

  return [
    gateCheck("/v1/applications/gate-check"),
    gateCheck("/v1/application-gate/check"),
    compileGw({
      method: "POST",
      pattern: "/v1/applications/submit",
      auth: true,
      scope: "applications:submit",
      idempotent: true,
      summary: "Submit a formal employer application only after the Application Gate clears.",
      handler: async (ctx) => {
        const input = gateInput(ctx, "submit_application");
        if ("error" in input) return { status: 400, body: { error: input.error } };
        const result = await submitApplicationThroughGate(store, audit, input);
        if (!result.allowed) return { status: 409, body: { error: "application_gate_not_cleared", gate: result.gate } };
        return { status: 201, body: { ok: true, gate: result.gate, submissionLockId: result.lock?.id } };
      },
    }),
    compileGw({
      method: "POST",
      pattern: "/v1/opportunities/:id/interest",
      auth: true,
      scope: "opportunities:interest:create",
      idempotent: true,
      summary: "Express interest in an opportunity. This is not an application and releases no employer packet.",
      handler: async (ctx) => {
        const b = (ctx.body ?? {}) as Record<string, unknown>;
        const nurseId = str(b, "nurseId") ?? str(b, "candidateId") ?? ctx.claims?.cand;
        if (!nurseId) return { status: 400, body: { error: "nurseId required" } };
        const result = await registerEmployerInterest(store, audit, {
          nurseId,
          jobId: ctx.params.id,
          employerId: str(b, "employerId") ?? ctx.claims?.org_id,
          employer: str(b, "employer"),
          campaign: str(b, "campaign"),
          actor: actorOf(ctx),
        });
        return { status: 201, body: { ok: result.ok, action: "express_interest", note: "Interest only; no application or employer packet was submitted.", subjectToMessage: result.subjectToMessage } };
      },
    }),
  ];
}
