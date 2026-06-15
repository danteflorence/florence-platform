// Model Gateway — the ONE seam for AI calls across FlorenceRN ("use tokens to build
// the machine, not run it"). Every task declares: allowed data class, prompt version,
// allowed model, cache policy, and whether human QA is required. The gateway enforces
// a data-class policy (regulated data never goes to a model that isn't cleared for it),
// caches by content hash (input_hash + prompt_version + model → output), and meters
// cost. Mock-by-default: with no ANTHROPIC_API_KEY it returns a deterministic heuristic
// so nothing breaks offline and the suite is reproducible. Pure of HTTP.

import { sha256hex } from "../crypto.ts";
import { DATA_CLASS_RANK, type DataClass } from "../classification.ts";

export interface TaskSpec {
  /** Max data class this task may ever send to a model. */
  allowedDataClass: DataClass;
  promptVersion: string;
  model: string;
  /** Cache the output by content hash. */
  cache: boolean;
  /** Output must be human-QA'd before it is shown to a nurse / sent to a partner. */
  humanQaRequired: boolean;
}

// The first registered tasks (the build/content/exception-time AI surfaces).
export const TASK_REGISTRY: Record<string, TaskSpec> = {
  job_description_extract: { allowedDataClass: "public", promptVersion: "v1", model: "claude-haiku-4-5", cache: true, humanQaRequired: false },
  benefits_extract: { allowedDataClass: "public", promptVersion: "v1", model: "claude-haiku-4-5", cache: true, humanQaRequired: false },
  employer_brief_draft: { allowedDataClass: "internal_business", promptVersion: "v1", model: "claude-sonnet-4-6", cache: true, humanQaRequired: true },
  candidate_packet_summary: { allowedDataClass: "candidate_personal", promptVersion: "v1", model: "claude-sonnet-4-6", cache: false, humanQaRequired: true },
  ncjmm_rationale_generation: { allowedDataClass: "public", promptVersion: "v1", model: "claude-opus-4-8", cache: true, humanQaRequired: true },
  pathway_guidance_draft: { allowedDataClass: "candidate_personal", promptVersion: "v1", model: "claude-sonnet-4-6", cache: false, humanQaRequired: true },
  sales_email_draft: { allowedDataClass: "internal_business", promptVersion: "v1", model: "claude-sonnet-4-6", cache: true, humanQaRequired: false },
};

export interface ModelTaskInput {
  task: string;
  /** The class of the data being sent (defaults to public). */
  dataClass?: DataClass;
  /** The task input (string or structured). */
  input: unknown;
}

export interface ModelTaskResult {
  ok: boolean;
  task?: string;
  status: number;
  output?: string;
  cached?: boolean;
  model?: string;
  promptVersion?: string;
  humanQaRequired?: boolean;
  costUsd?: number;
  tokens?: number;
  reason?: string;
}

// In-process cache + cost meter (mock-by-default; a durable store + real provider
// are the production path — the seam below is where a live model call would plug in).
const cache = new Map<string, { output: string; tokens: number }>();
const meter = { calls: 0, cachedHits: 0, tokens: 0, costUsd: 0, byTask: {} as Record<string, number> };

function liveModelConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Deterministic offline output — the mock-by-default heuristic. Real provider plugs
 *  in here behind liveModelConfigured(); the gateway contract is identical either way. */
function heuristicOutput(task: string, spec: TaskSpec, input: unknown): string {
  const text = typeof input === "string" ? input : JSON.stringify(input);
  const preview = text.slice(0, 120);
  return `[${task} · ${spec.promptVersion} · ${spec.model} · mock] ${preview}`;
}

export function runModelTask(inp: ModelTaskInput): ModelTaskResult {
  const spec = TASK_REGISTRY[inp.task];
  if (!spec) return { ok: false, status: 400, reason: `unknown task '${inp.task}'` };

  // Data-class policy: never send data above the task's cleared class to a model.
  const reqClass: DataClass = inp.dataClass ?? "public";
  if (DATA_CLASS_RANK[reqClass] > DATA_CLASS_RANK[spec.allowedDataClass]) {
    return { ok: false, status: 403, task: inp.task, reason: `data class '${reqClass}' exceeds task ceiling '${spec.allowedDataClass}'` };
  }

  const key = sha256hex(`${inp.task}|${spec.promptVersion}|${spec.model}|${JSON.stringify(inp.input ?? null)}`);
  if (spec.cache && cache.has(key)) {
    meter.cachedHits += 1;
    const c = cache.get(key)!;
    return { ok: true, status: 200, task: inp.task, output: c.output, cached: true, model: spec.model, promptVersion: spec.promptVersion, humanQaRequired: spec.humanQaRequired, costUsd: 0, tokens: 0 };
  }

  // Execute (mock-by-default heuristic; live provider plugs in here when configured).
  const output = heuristicOutput(inp.task, spec, inp.input);
  const tokens = liveModelConfigured() ? Math.ceil(output.length / 4) : 0; // mock = free + reproducible
  const costUsd = tokens * 0.000003;
  meter.calls += 1;
  meter.tokens += tokens;
  meter.costUsd += costUsd;
  meter.byTask[inp.task] = (meter.byTask[inp.task] ?? 0) + 1;
  if (spec.cache) cache.set(key, { output, tokens });

  return { ok: true, status: 200, task: inp.task, output, cached: false, model: spec.model, promptVersion: spec.promptVersion, humanQaRequired: spec.humanQaRequired, costUsd, tokens };
}

export function modelCosts() {
  return { ...meter, byTask: { ...meter.byTask }, liveModel: liveModelConfigured(), tasks: Object.keys(TASK_REGISTRY) };
}
