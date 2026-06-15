// Academy-local LLM seam for drafting clinical-judgment walkthroughs. Mock-by-default:
// with no ANTHROPIC_API_KEY it returns a DETERMINISTIC heuristic draft composed from
// the question's existing rationale + the NCJMM step blurbs + the option text — so the
// whole pipeline (generate → QA → narrate → audio) runs offline and is testable, while
// producing honest (if generic) text rather than fabricated clinical specifics.
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
  readonly mode: "anthropic" | "heuristic";
  readonly model: string;
  draftWalkthrough(input: WalkthroughDraftInput): Promise<WalkthroughDraft>;
}

const blurb = (key: string): string => CJMM_STEP_BLURBS.find((s) => s.key === key)?.blurb ?? "";

/** The deterministic, offline draft — also the test path. Honest + generic, no fabrication. */
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

const SYSTEM = [
  "You are a nurse educator writing an NCLEX clinical-judgment walkthrough.",
  "You are GIVEN the keyed-correct answer(s); never contradict the key.",
  "Explain only relative to the supplied stem + rationale; invent no labs, doses, or facts not implied by the stem.",
  "For each WRONG option, name the cognitive error from this fixed set:",
  "missed_cue, misread_cue, priority_error, scope_error, safety_error, content_gap, over_treatment, under_treatment, distractor_bias, treating_symptom_not_cause, unsafe_delay.",
  "Return STRICT JSON matching the requested shape. Be concise and spoken-friendly.",
].join(" ");

function anthropic(model: string): WalkthroughLlm {
  return {
    mode: "anthropic",
    model,
    draftWalkthrough: async (input) => {
      try {
        const spec = "@anthropic-ai/sdk"; // non-literal so tsc doesn't require the dep
        const mod: any = await import(spec);
        const Anthropic = mod.default ?? mod.Anthropic;
        const client = new Anthropic({ apiKey: process.env["ANTHROPIC_API_KEY"] });
        const user = JSON.stringify({
          topic: input.topic, stem: input.stem, options: input.options,
          correct_option_indices: input.correctIndices, client_need: input.clientNeed,
          cjmm: input.cjmm, rationale: input.rationale,
          required_json_shape: {
            clinical_judgment: { recognize_cues: { text: "", cues: [] }, analyze_cues: { text: "" }, prioritize_hypotheses: { text: "" }, generate_solutions: { text: "" }, take_action: { text: "" }, evaluate_outcomes: { text: "" } },
            answer_choice_analysis: [{ optionIndex: 0, why: "", error_type_if_chosen: "priority_error|null", remediation_tags: [] }],
            teach_back: "", what_to_review_next: "",
          },
        });
        const resp = await client.messages.create({
          model,
          max_tokens: 1500,
          system: SYSTEM,
          messages: [{ role: "user", content: `Draft the walkthrough as STRICT JSON only.\n${user}` }],
        });
        const text = (resp.content ?? []).map((c: any) => c.text ?? "").join("");
        const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as WalkthroughDraft;
        // Defensive: ensure one entry per option; fall back to heuristic on shape mismatch.
        if (!Array.isArray(json.answer_choice_analysis) || json.answer_choice_analysis.length !== input.options.length) {
          return heuristicDraft(input);
        }
        return json;
      } catch (e) {
        console.warn(`[walkthrough] anthropic draft failed (${(e as Error).message}); using heuristic`);
        return heuristicDraft(input);
      }
    },
  };
}

export function getWalkthroughLlm(): WalkthroughLlm {
  if (process.env["ANTHROPIC_API_KEY"]) return anthropic(process.env["ANTHROPIC_MODEL"] ?? "claude-opus-4-8");
  return heuristic();
}

export { heuristicDraft };
