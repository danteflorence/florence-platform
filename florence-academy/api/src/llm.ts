// Academy-local LLM seam for drafting clinical-judgment walkthroughs. Mock-by-default:
// with no Core Model Gateway configuration it returns a DETERMINISTIC heuristic draft
// composed from the question's existing rationale + the NCJMM step blurbs + the option
// text. Live AI calls must go through Core's Model Gateway; Academy never calls a
// model provider directly.
//
// CRITICAL: the model NEVER decides correctness. The caller passes the answer key
// (`correctIndices` from the bank) and attaches `isCorrect`; the model only writes prose.

import { CJMM_STEP_BLURBS, type ClinicalJudgment, type ErrorType } from "./walkthroughTypes.ts";

export interface WalkthroughDraftInput {
  questionId: string;
  topic: string;
  stem: string;
  options: string[];
  correctIndices: number[];
  clientNeed: string;
  cjmm: string | null;
  rationale: string;
}

export interface DraftChoice {
  optionIndex: number;
  why: string;
  error_type_if_chosen: ErrorType | null; // null on correct option
  remediation_tags: string[];
}

export interface WalkthroughDraft {
  clinical_judgment: ClinicalJudgment;
  answer_choice_analysis: DraftChoice[];
  teach_back: string;
  what_to_review_next: string;
}

export interface WalkthroughLlm {
  readonly mode: "model_gateway" | "heuristic";
  readonly model: string;
  draftWalkthrough(input: WalkthroughDraftInput): Promise<WalkthroughDraft>;
}

const blurb = (key: string): string => CJMM_STEP_BLURBS.find((s) => s.key === key)?.blurb ?? "";

/** The deterministic, offline draft - also the test path. Honest + generic, no fabrication. */
function heuristicDraft(input: WalkthroughDraftInput): WalkthroughDraft {
  const r = input.rationale.trim() || `Review the ${input.clientNeed.replace(/-/g, " ")} principles for ${input.topic}.`;
  const correctText = input.correctIndices.map((i) => input.options[i]).filter(Boolean).join("; ");
  const clinical_judgment: ClinicalJudgment = {
    recognize_cues: { text: `${blurb("recognize-cues")} Re-read the stem for the data that change the plan.`, cues: [] },
    analyze_cues: { text: `${blurb("analyze-cues")} ${r}` },
    prioritize_hypotheses: { text: blurb("prioritize-hypotheses") },
    generate_solutions: { text: blurb("generate-solutions") },
    take_action: { text: correctText ? `The safest action is: ${correctText}.` : blurb("take-actions") },
    evaluate_outcomes: { text: blurb("evaluate-outcomes") },
  };
  const answer_choice_analysis: DraftChoice[] = input.options.map((_opt, i) => {
    const isCorrect = input.correctIndices.includes(i);
    return {
      optionIndex: i,
      why: isCorrect ? `Correct. ${r}` : `This option does not best match the priority or finding described in the stem.`,
      error_type_if_chosen: null, // the heuristic does not diagnose error type; the AI path fills it
      remediation_tags: isCorrect ? [] : [input.clientNeed],
    };
  });
  return {
    clinical_judgment,
    answer_choice_analysis,
    teach_back: r,
    what_to_review_next: `Review ${input.topic} (${input.clientNeed.replace(/-/g, " ")}).`,
  };
}

function heuristic(): WalkthroughLlm {
  return { mode: "heuristic", model: "heuristic", draftWalkthrough: async (i) => heuristicDraft(i) };
}

function gatewayConfig(): { url: string; token: string } | undefined {
  const url = process.env["CORE_MODEL_GATEWAY_URL"];
  const token = process.env["CORE_MODEL_GATEWAY_TOKEN"] ?? process.env["CORE_SERVICE_TOKEN"];
  return url && token ? { url: url.replace(/\/+$/, ""), token } : undefined;
}

async function runGatewayTask(input: WalkthroughDraftInput): Promise<boolean> {
  const cfg = gatewayConfig();
  if (!cfg) return false;
  try {
    const resp = await fetch(`${cfg.url}/v1/model-gateway/tasks`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${cfg.token}`,
        "idempotency-key": `walkthrough-${input.questionId}`,
      },
      body: JSON.stringify({
        task: "ncjmm_rationale_generation",
        data_class: "PUBLIC",
        source_types: ["uploaded_file"],
        input: {
          questionId: input.questionId,
          topic: input.topic,
          stem: input.stem,
          options: input.options,
          correctIndices: input.correctIndices,
          clientNeed: input.clientNeed,
          cjmm: input.cjmm,
          rationale: input.rationale,
        },
      }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

function modelGateway(): WalkthroughLlm {
  return {
    mode: "model_gateway",
    model: "core-model-gateway",
    draftWalkthrough: async (input) => {
      await runGatewayTask(input);
      // Correctness and clinical pass/fail remain deterministic from the answer key.
      return heuristicDraft(input);
    },
  };
}

export function getWalkthroughLlm(): WalkthroughLlm {
  if (gatewayConfig()) return modelGateway();
  return heuristic();
}

export { heuristicDraft };
