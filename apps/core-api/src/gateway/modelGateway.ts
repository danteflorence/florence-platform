// Model Gateway: the ONE policy seam for AI calls across FlorenceRN.
// AI can draft, explain, classify, summarize, or tutor; it cannot directly take
// visa, credit, employer-packet, ATS/VMS, legal, clinical pass/fail, or other
// high-stakes actions. The gateway treats all user, uploaded-file, transcript,
// DS-160, and job-posting content as untrusted, redacts/tokenizes model input,
// validates outputs, records audit-safe AI metadata, and routes risky outputs to
// human review.

import { sha256hex } from "../crypto.ts";
import type { Audit } from "../audit.ts";
import {
  classesForValue,
  DATA_CLASS_RANK,
  normalizeDataClass,
  redactForLog,
  type DataClass,
} from "../classification.ts";

export type ModelTaskType =
  | "job_description_extract"
  | "benefits_extract"
  | "employer_brief_draft"
  | "candidate_packet_summary"
  | "transcript_summary"
  | "ds160_draft_review"
  | "lender_packet_summary"
  | "passport_qa_summary"
  | "ncjmm_rationale_generation"
  | "pathway_deficiency_classification"
  | "pathway_guidance_draft"
  | "student_tutor_response"
  | "sales_email_draft";

export type ModelSourceType =
  | "system"
  | "internal_record"
  | "user_message"
  | "uploaded_file"
  | "job_posting"
  | "transcript"
  | "ds160_text";

export type ReviewerStatus =
  | "not_required"
  | "pending_human_qa"
  | "candidate_attestation_required"
  | "human_review_required";

export type HighStakesAction =
  | "visa_eligibility"
  | "ds160_final_submission"
  | "credit_approval"
  | "credit_decline"
  | "employment_application_release"
  | "employer_packet_release"
  | "ats_vms_submission"
  | "clinical_pass_fail"
  | "legal_advice";

const HIGH_STAKES_ACTIONS = new Set<HighStakesAction>([
  "visa_eligibility",
  "ds160_final_submission",
  "credit_approval",
  "credit_decline",
  "employment_application_release",
  "employer_packet_release",
  "ats_vms_submission",
  "clinical_pass_fail",
  "legal_advice",
]);

const UNTRUSTED_SOURCES = new Set<ModelSourceType>([
  "user_message",
  "uploaded_file",
  "job_posting",
  "transcript",
  "ds160_text",
]);

const PROMPT_INJECTION_PATTERNS: Array<{ signal: string; re: RegExp }> = [
  { signal: "reveal_secrets", re: /reveal|print|show|dump/i },
  { signal: "secret_request", re: /secret|api[_ -]?key|token|password|system prompt/i },
  { signal: "ignore_policy", re: /ignore (?:all )?(?:previous|system|developer|policy|instructions)/i },
  { signal: "other_candidate_data", re: /another candidate|other candidate|someone else|different nurse/i },
  { signal: "application_gate_bypass", re: /bypass|override|skip|disable/i },
  { signal: "high_stakes_action_request", re: /submit|release|approve|decline|pass\/fail|final decision|file ds-?160/i },
  { signal: "tool_call_request", re: /call tool|use tool|execute|webhook|send packet|submit to ats|submit to vms/i },
];

const OUTPUT_ACTION_KEYS = [
  "toolCalls",
  "tool_calls",
  "actions",
  "action",
  "submitApplication",
  "releasePacket",
  "sendToAts",
  "sendToVms",
  "approveCredit",
  "declineCredit",
  "submitDs160",
  "finalDecision",
  "clinicalPassFail",
];

const OUTPUT_ACTION_TEXT_PATTERNS: Array<{ signal: string; re: RegExp }> = [
  { signal: "tool_call_request", re: /\b(?:call|use|invoke|execute)\s+(?:the\s+)?(?:tool|function|webhook)\b/i },
  { signal: "ds160_final_submission", re: /\b(?:submit|file|finalize)\s+(?:the\s+)?DS-?160\b/i },
  { signal: "credit_decision", re: /\b(?:approve|decline|deny)\s+(?:the\s+)?(?:credit|loan|financing)\b/i },
  { signal: "employer_packet_release", re: /\b(?:release|send|share)\s+(?:the\s+)?employer packet\b/i },
  { signal: "ats_vms_submission", re: /\bsubmit\s+(?:to|through)\s+(?:ATS|VMS)\b/i },
  { signal: "application_gate_bypass", re: /\b(?:bypass|override|skip)\s+(?:the\s+)?Application Gate\b/i },
  { signal: "clinical_pass_fail", re: /\b(?:pass|fail)\s+(?:the\s+)?(?:student|candidate|clinical)\b/i },
  { signal: "legal_advice", re: /\b(?:legal advice|you are legally eligible|visa eligible)\b/i },
];

const LOW_CONFIDENCE_THRESHOLD = 0.7;
type OutputSchemaName =
  | "job_extract_v1"
  | "benefits_extract_v1"
  | "draft_text_v1"
  | "tutor_rationale_v1"
  | "classification_draft_v1";

export interface TaskSpec {
  /** Max data class this task may ever send to a model. */
  allowedDataClass: DataClass;
  promptVersion: string;
  model: string;
  outputSchema: OutputSchemaName;
  /** Cache the output by content hash. */
  cache: boolean;
  /** Output must be human-QA'd before it is shown to a nurse / sent to a partner. */
  humanQaRequired: boolean;
  candidateAttestationRequired?: boolean;
  allowFullNursePassport?: boolean;
  highRiskOutput?: boolean;
  minConfidence?: number;
}

// The first registered tasks (the build/content/exception-time AI surfaces).
export const TASK_REGISTRY: Record<string, TaskSpec> = {
  job_description_extract: { allowedDataClass: "PUBLIC", promptVersion: "job-extract-v1", model: "claude-haiku-4-5", outputSchema: "job_extract_v1", cache: true, humanQaRequired: false },
  benefits_extract: { allowedDataClass: "PUBLIC", promptVersion: "benefits-extract-v1", model: "claude-haiku-4-5", outputSchema: "benefits_extract_v1", cache: true, humanQaRequired: false },
  employer_brief_draft: { allowedDataClass: "INTERNAL", promptVersion: "employer-brief-v1", model: "claude-sonnet-4-6", outputSchema: "draft_text_v1", cache: true, humanQaRequired: true },
  candidate_packet_summary: { allowedDataClass: "CANDIDATE_PERSONAL", promptVersion: "packet-summary-v1", model: "claude-sonnet-4-6", outputSchema: "draft_text_v1", cache: false, humanQaRequired: true, candidateAttestationRequired: true },
  transcript_summary: { allowedDataClass: "RESTRICTED_EDUCATION", promptVersion: "transcript-summary-v1", model: "claude-sonnet-4-6", outputSchema: "draft_text_v1", cache: false, humanQaRequired: true, candidateAttestationRequired: true, highRiskOutput: true },
  ds160_draft_review: { allowedDataClass: "RESTRICTED_IMMIGRATION", promptVersion: "ds160-draft-review-v1", model: "claude-sonnet-4-6", outputSchema: "draft_text_v1", cache: false, humanQaRequired: true, candidateAttestationRequired: true, highRiskOutput: true },
  lender_packet_summary: { allowedDataClass: "RESTRICTED_FINANCING", promptVersion: "lender-packet-summary-v1", model: "claude-sonnet-4-6", outputSchema: "draft_text_v1", cache: false, humanQaRequired: true, candidateAttestationRequired: true, highRiskOutput: true },
  passport_qa_summary: { allowedDataClass: "PARTNER_RESTRICTED", promptVersion: "passport-qa-summary-v1", model: "claude-sonnet-4-6", outputSchema: "draft_text_v1", cache: false, humanQaRequired: true, candidateAttestationRequired: true, allowFullNursePassport: true, highRiskOutput: true },
  ncjmm_rationale_generation: { allowedDataClass: "PUBLIC", promptVersion: "ncjmm-rationale-v1", model: "claude-opus-4-8", outputSchema: "tutor_rationale_v1", cache: true, humanQaRequired: true, minConfidence: LOW_CONFIDENCE_THRESHOLD },
  pathway_deficiency_classification: { allowedDataClass: "RESTRICTED_EDUCATION", promptVersion: "pathway-deficiency-v1", model: "claude-sonnet-4-6", outputSchema: "classification_draft_v1", cache: false, humanQaRequired: true, candidateAttestationRequired: true },
  pathway_guidance_draft: { allowedDataClass: "CANDIDATE_PERSONAL", promptVersion: "pathway-guidance-v1", model: "claude-sonnet-4-6", outputSchema: "draft_text_v1", cache: false, humanQaRequired: true, candidateAttestationRequired: true },
  student_tutor_response: { allowedDataClass: "PUBLIC", promptVersion: "student-tutor-response-v1", model: "claude-haiku-4-5", outputSchema: "tutor_rationale_v1", cache: true, humanQaRequired: true, minConfidence: LOW_CONFIDENCE_THRESHOLD },
  sales_email_draft: { allowedDataClass: "INTERNAL", promptVersion: "sales-email-v1", model: "claude-sonnet-4-6", outputSchema: "draft_text_v1", cache: true, humanQaRequired: false },
};

export interface ModelTaskInput {
  task: string;
  /** The class of the data being sent (defaults to public). */
  dataClass?: DataClass | string;
  dataClasses?: Array<DataClass | string>;
  /** The task input (string or structured). */
  input: unknown;
  sourceTypes?: ModelSourceType[];
  promptVersion?: string;
  requestedAction?: HighStakesAction | string;
  confidence?: number;
  fullNursePassport?: boolean;
  fullNursePassportPolicyPermit?: boolean;
  providerOutput?: unknown;
  actor?: string;
  audit?: Audit;
}

export interface ModelTaskResult {
  ok: boolean;
  task?: string;
  status: number;
  output?: string;
  structuredOutput?: unknown;
  cached?: boolean;
  model?: string;
  promptVersion?: string;
  dataClassesUsed?: DataClass[];
  outputSchema?: string;
  outputSchemaValid?: boolean;
  reviewerStatus?: ReviewerStatus;
  humanQaRequired?: boolean;
  candidateAttestationRequired?: boolean;
  untrustedSources?: ModelSourceType[];
  promptInjectionSignals?: string[];
  lowConfidence?: boolean;
  costUsd?: number;
  tokens?: number;
  reason?: string;
}

// In-process cache + cost meter (mock-by-default; a durable store + real provider
// are the production path. The seam below is where a live model call would plug in).
const cache = new Map<string, { output: string; tokens: number }>();
const meter = { calls: 0, cachedHits: 0, tokens: 0, costUsd: 0, byTask: {} as Record<string, number> };

function liveModelConfigured(): boolean {
  return Boolean(process.env.MODEL_GATEWAY_LIVE_PROVIDER);
}

/** Deterministic offline output, the mock-by-default heuristic. Real provider plugs
 *  in here behind liveModelConfigured(); the gateway contract is identical either way. */
function heuristicOutput(task: string, spec: TaskSpec, input: unknown): string {
  const text = typeof input === "string" ? input : JSON.stringify(input);
  const preview = text.slice(0, 120);
  return `[${task} · ${spec.promptVersion} · ${spec.model} · mock] ${preview}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function schemaOutput(schema: string, output: string, providerOutput: unknown): unknown {
  if (isRecord(providerOutput)) return providerOutput;
  switch (schema) {
    case "job_extract_v1":
      return { title: "unknown", summary: output, requirements: [] };
    case "benefits_extract_v1":
      return { summary: output, benefits: [] };
    case "draft_text_v1":
      return { draft: output };
    case "tutor_rationale_v1":
      return { rationale: output, clinicalJudgmentSteps: [], humanQaRequired: true };
    case "classification_draft_v1":
      return { classification: "needs_review", rationale: output };
    default:
      return { output };
  }
}

function validateOutputSchema(schema: string, value: unknown): { ok: true } | { ok: false; reason: string } {
  if (!isRecord(value)) return { ok: false, reason: "output_schema_requires_object" };
  switch (schema) {
    case "job_extract_v1":
      return typeof value.summary === "string" && Array.isArray(value.requirements)
        ? { ok: true }
        : { ok: false, reason: "invalid_job_extract_v1" };
    case "benefits_extract_v1":
      return typeof value.summary === "string" && Array.isArray(value.benefits)
        ? { ok: true }
        : { ok: false, reason: "invalid_benefits_extract_v1" };
    case "draft_text_v1":
      return typeof value.draft === "string"
        ? { ok: true }
        : { ok: false, reason: "invalid_draft_text_v1" };
    case "tutor_rationale_v1":
      return typeof value.rationale === "string" && Array.isArray(value.clinicalJudgmentSteps)
        ? { ok: true }
        : { ok: false, reason: "invalid_tutor_rationale_v1" };
    case "classification_draft_v1":
      return typeof value.classification === "string" && typeof value.rationale === "string"
        ? { ok: true }
        : { ok: false, reason: "invalid_classification_draft_v1" };
    default:
      return { ok: false, reason: "unknown_output_schema" };
  }
}

function maxDataClass(classes: DataClass[]): DataClass {
  return classes.reduce((max, item) => DATA_CLASS_RANK[item] > DATA_CLASS_RANK[max] ? item : max, "PUBLIC" as DataClass);
}

function normalizeClasses(inp: ModelTaskInput): DataClass[] {
  const explicit = [
    ...(inp.dataClass ? [inp.dataClass] : []),
    ...(inp.dataClasses ?? []),
  ].map((value) => normalizeDataClass(value)).filter((value): value is DataClass => Boolean(value));
  if (explicit.length > 0) return [...new Set(explicit)];
  if (typeof inp.input === "string") return ["PUBLIC"];
  const derived = classesForValue(inp.input).filter((value): value is DataClass => Boolean(value));
  return derived.length > 0 ? [...new Set(derived)] : ["PUBLIC"];
}

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function promptInjectionSignals(input: unknown): string[] {
  const text = asText(input);
  return [...new Set(PROMPT_INJECTION_PATTERNS.filter(({ re }) => re.test(text)).map(({ signal }) => signal))];
}

function redactForModelInput(input: unknown): unknown {
  return redactForLog(input);
}

function modelInputAfterTrustPolicy(input: unknown, signals: string[]): unknown {
  if (signals.length > 0) {
    return {
      untrustedInput: true,
      policyViolationSignals: signals,
      content: "[UNTRUSTED_CONTENT_REDACTED]",
    };
  }
  return redactForModelInput(input);
}

function containsOutputAction(value: unknown): string | undefined {
  if (typeof value === "string") {
    return OUTPUT_ACTION_TEXT_PATTERNS.find(({ re }) => re.test(value))?.signal;
  }
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    for (const child of value) {
      const found = containsOutputAction(child);
      if (found) return found;
    }
    return undefined;
  }
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (OUTPUT_ACTION_KEYS.includes(key)) return key;
    const found = containsOutputAction(record[key]);
    if (found) return found;
  }
  return undefined;
}

function hasString(record: Record<string, unknown>, key: string): boolean {
  return typeof record[key] === "string" && record[key].trim().length > 0;
}

function validateProviderOutput(schema: OutputSchemaName, value: unknown): { ok: true } | { ok: false; reason: string } {
  if (value === undefined || typeof value === "string") return { ok: true };
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, reason: "output_must_be_object_or_string" };
  const record = value as Record<string, unknown>;
  if (schema === "draft_text_v1") {
    return hasString(record, "text") || hasString(record, "summary") ? { ok: true } : { ok: false, reason: "draft_text_missing_text" };
  }
  if (schema === "job_extract_v1") {
    return ["title", "specialty", "setting", "location", "shift", "summary"].some((key) => key in record)
      ? { ok: true }
      : { ok: false, reason: "job_extract_missing_fields" };
  }
  if (schema === "benefits_extract_v1") {
    return Array.isArray(record.benefits) || hasString(record, "summary")
      ? { ok: true }
      : { ok: false, reason: "benefits_extract_missing_fields" };
  }
  if (schema === "tutor_rationale_v1") {
    return hasString(record, "rationale") || "clinical_judgment" in record || "answer_choice_analysis" in record
      ? { ok: true }
      : { ok: false, reason: "tutor_rationale_missing_fields" };
  }
  if (schema === "classification_draft_v1") {
    return hasString(record, "classification") || hasString(record, "responseDraft")
      ? { ok: true }
      : { ok: false, reason: "classification_missing_fields" };
  }
  return { ok: false, reason: "unknown_output_schema" };
}

function reviewerStatus(spec: TaskSpec, signals: string[], lowConfidence: boolean): ReviewerStatus {
  if (signals.length > 0 || lowConfidence) return "human_review_required";
  if (spec.highRiskOutput) return "human_review_required";
  if (spec.candidateAttestationRequired) return "candidate_attestation_required";
  if (spec.humanQaRequired) return "pending_human_qa";
  return "not_required";
}

async function auditModelEvent(
  inp: ModelTaskInput,
  spec: TaskSpec,
  result: Pick<ModelTaskResult, "status" | "reason" | "cached" | "tokens" | "costUsd" | "dataClassesUsed" | "outputSchema" | "outputSchemaValid" | "reviewerStatus" | "humanQaRequired" | "candidateAttestationRequired" | "untrustedSources" | "promptInjectionSignals">,
): Promise<void> {
  if (!inp.audit) return;
  await inp.audit(inp.actor ?? "model_gateway", "ai.model_call", "model", inp.task, {
    status: result.status,
    reason: result.reason,
    cached: result.cached,
    model: spec.model,
    task: inp.task,
    promptVersion: spec.promptVersion,
    tokenCost: result.tokens ?? 0,
    costUsd: result.costUsd ?? 0,
    dataClassesUsed: result.dataClassesUsed,
    outputSchema: result.outputSchema,
    outputSchemaValid: result.outputSchemaValid,
    reviewerStatus: result.reviewerStatus,
    humanQaRequired: result.humanQaRequired,
    candidateAttestationRequired: result.candidateAttestationRequired,
    untrustedSources: result.untrustedSources,
    promptInjectionSignals: result.promptInjectionSignals,
    inputHash: sha256hex(asText(redactForModelInput(inp.input))),
  });
}

export async function runModelTask(inp: ModelTaskInput): Promise<ModelTaskResult> {
  const spec = TASK_REGISTRY[inp.task];
  if (!spec) return { ok: false, status: 400, reason: `unknown task '${inp.task}'` };

  if (inp.promptVersion && inp.promptVersion !== spec.promptVersion) {
    const result: ModelTaskResult = { ok: false, status: 409, task: inp.task, reason: "prompt_version_mismatch" };
    await auditModelEvent(inp, spec, result);
    return result;
  }

  // Data-class policy: never send data above the task's cleared class to a model.
  const dataClassesUsed = normalizeClasses(inp);
  const reqClass = maxDataClass(dataClassesUsed);
  if (DATA_CLASS_RANK[reqClass] > DATA_CLASS_RANK[spec.allowedDataClass]) {
    const result: ModelTaskResult = { ok: false, status: 403, task: inp.task, dataClassesUsed, reason: `data class '${reqClass}' exceeds task ceiling '${spec.allowedDataClass}'` };
    await auditModelEvent(inp, spec, result);
    return result;
  }

  if (inp.fullNursePassport && (!spec.allowFullNursePassport || !inp.fullNursePassportPolicyPermit)) {
    const result: ModelTaskResult = {
      ok: false,
      status: 403,
      task: inp.task,
      dataClassesUsed,
      reason: spec.allowFullNursePassport ? "full_nurse_passport_policy_not_permitted" : "full_nurse_passport_not_allowed",
    };
    await auditModelEvent(inp, spec, result);
    return result;
  }

  if (inp.requestedAction && HIGH_STAKES_ACTIONS.has(inp.requestedAction as HighStakesAction)) {
    const result: ModelTaskResult = { ok: false, status: 403, task: inp.task, dataClassesUsed, reason: "high_stakes_action_not_allowed" };
    await auditModelEvent(inp, spec, result);
    return result;
  }

  const untrustedSources = (inp.sourceTypes ?? []).filter((source) => UNTRUSTED_SOURCES.has(source));
  const signals = untrustedSources.length > 0 ? promptInjectionSignals(inp.input) : [];
  const lowConfidence = typeof inp.confidence === "number" && inp.confidence < (spec.minConfidence ?? LOW_CONFIDENCE_THRESHOLD);
  const statusForReview = reviewerStatus(spec, signals, lowConfidence);
  const sanitizedInput = modelInputAfterTrustPolicy(inp.input, signals);
  const outputAction = containsOutputAction(inp.providerOutput);
  if (outputAction) {
    const result: ModelTaskResult = {
      ok: false,
      status: 403,
      task: inp.task,
      dataClassesUsed,
      outputSchema: spec.outputSchema,
      outputSchemaValid: false,
      reviewerStatus: "human_review_required",
      humanQaRequired: true,
      candidateAttestationRequired: spec.candidateAttestationRequired,
      untrustedSources,
      promptInjectionSignals: signals,
      reason: "model_output_contains_unauthorized_action",
    };
    await auditModelEvent(inp, spec, result);
    return result;
  }
  const outputValidation = validateProviderOutput(spec.outputSchema, inp.providerOutput);
  if (!outputValidation.ok) {
    const result: ModelTaskResult = {
      ok: false,
      status: 422,
      task: inp.task,
      dataClassesUsed,
      outputSchema: spec.outputSchema,
      reviewerStatus: "human_review_required",
      untrustedSources,
      promptInjectionSignals: signals,
      reason: "model_output_schema_invalid",
    };
    await auditModelEvent(inp, spec, { ...result, reason: outputValidation.reason });
    return result;
  }

  const key = sha256hex(`${inp.task}|${spec.promptVersion}|${spec.model}|${JSON.stringify(sanitizedInput ?? null)}`);
  if (spec.cache && cache.has(key)) {
    meter.cachedHits += 1;
    const c = cache.get(key)!;
    const result: ModelTaskResult = {
      ok: true,
      status: 200,
      task: inp.task,
      output: c.output,
      cached: true,
      model: spec.model,
      promptVersion: spec.promptVersion,
      dataClassesUsed,
      outputSchema: spec.outputSchema,
      outputSchemaValid: true,
      reviewerStatus: statusForReview,
      humanQaRequired: spec.humanQaRequired || statusForReview !== "not_required",
      candidateAttestationRequired: spec.candidateAttestationRequired,
      untrustedSources,
      promptInjectionSignals: signals,
      lowConfidence,
      costUsd: 0,
      tokens: 0,
    };
    await auditModelEvent(inp, spec, result);
    return result;
  }

  // Execute (mock-by-default heuristic; live provider plugs in here when configured).
  const output = typeof inp.providerOutput === "string" ? inp.providerOutput : heuristicOutput(inp.task, spec, sanitizedInput);
  const structuredOutput = schemaOutput(spec.outputSchema, output, inp.providerOutput);
  const schemaValidation = validateOutputSchema(spec.outputSchema, structuredOutput);
  if (!schemaValidation.ok) {
    const result: ModelTaskResult = {
      ok: false,
      status: 422,
      task: inp.task,
      dataClassesUsed,
      outputSchema: spec.outputSchema,
      outputSchemaValid: false,
      reviewerStatus: "human_review_required",
      humanQaRequired: true,
      candidateAttestationRequired: spec.candidateAttestationRequired,
      untrustedSources,
      promptInjectionSignals: signals,
      reason: schemaValidation.reason,
    };
    await auditModelEvent(inp, spec, result);
    return result;
  }
  const tokens = liveModelConfigured() ? Math.ceil(output.length / 4) : 0;
  const costUsd = tokens * 0.000003;
  meter.calls += 1;
  meter.tokens += tokens;
  meter.costUsd += costUsd;
  meter.byTask[inp.task] = (meter.byTask[inp.task] ?? 0) + 1;
  if (spec.cache) cache.set(key, { output, tokens });

  const result: ModelTaskResult = {
    ok: true,
    status: 200,
    task: inp.task,
    output,
    structuredOutput,
    cached: false,
    model: spec.model,
    promptVersion: spec.promptVersion,
    dataClassesUsed,
    outputSchema: spec.outputSchema,
    outputSchemaValid: true,
    reviewerStatus: statusForReview,
    humanQaRequired: spec.humanQaRequired || statusForReview !== "not_required",
    candidateAttestationRequired: spec.candidateAttestationRequired,
    untrustedSources,
    promptInjectionSignals: signals,
    lowConfidence,
    costUsd,
    tokens,
  };
  await auditModelEvent(inp, spec, result);
  return result;
}

export function modelCosts() {
  return {
    ...meter,
    byTask: { ...meter.byTask },
    liveModel: liveModelConfigured(),
    tasks: Object.entries(TASK_REGISTRY).map(([task, spec]) => ({
      task,
      allowedDataClass: spec.allowedDataClass,
      promptVersion: spec.promptVersion,
      model: spec.model,
      outputSchema: spec.outputSchema,
      humanQaRequired: spec.humanQaRequired,
      candidateAttestationRequired: Boolean(spec.candidateAttestationRequired),
      highRiskOutput: Boolean(spec.highRiskOutput),
      allowFullNursePassport: Boolean(spec.allowFullNursePassport),
    })),
  };
}
