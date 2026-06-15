// Spoken-script builders for the three walkthrough audio layers. Designed for the
// ear, not the page. The QUICK rationale layer reuses the existing `rationale` audio
// kind (generated from the bank); here we build the FULL walkthrough (2–4 min) and
// the per-distractor COACHING (30–90s) scripts.

import { CJMM_STEP_BLURBS, ERROR_TYPE_LABEL, type Walkthrough } from "./walkthroughTypes.ts";
import { walkthroughKey, coachingKey } from "./audioStore.ts";

export interface NarrationQuestion {
  topic: string;
  options: string[];
}

const letter = (i: number) => String.fromCharCode(65 + i); // 0 → A

/** The full 6-step NCJMM walkthrough: cues → evaluate, why-correct, why-not-others, teach-back. */
export function walkthroughScript(q: NarrationQuestion, w: Walkthrough): string {
  const cj = w.clinical_judgment;
  const parts: string[] = [];
  parts.push(`Clinical judgment walkthrough. ${q.topic}.`);
  parts.push(`Recognize cues. ${cj.recognize_cues.text}`);
  if (cj.recognize_cues.cues.length) parts.push(`Key cues: ${cj.recognize_cues.cues.join(", ")}.`);
  parts.push(`Analyze cues. ${cj.analyze_cues.text}`);
  parts.push(`Prioritize hypotheses. ${cj.prioritize_hypotheses.text}`);
  parts.push(`Generate solutions. ${cj.generate_solutions.text}`);
  parts.push(`Take action. ${cj.take_action.text}`);
  parts.push(`Evaluate outcomes. ${cj.evaluate_outcomes.text}`);

  const correct = w.answer_choice_analysis.filter((a) => a.isCorrect);
  for (const c of correct) {
    parts.push(`Why ${letter(c.optionIndex)}${q.options[c.optionIndex] ? ` — ${q.options[c.optionIndex]}` : ""} is correct. ${c.why_wrong_or_right}`);
  }
  const distractors = w.answer_choice_analysis.filter((a) => !a.isCorrect);
  if (distractors.length) {
    parts.push("Why not the others.");
    for (const d of distractors) {
      const errTail = d.error_type_if_chosen ? ` If you picked this, that's a ${ERROR_TYPE_LABEL[d.error_type_if_chosen].label.toLowerCase()}.` : "";
      parts.push(`Option ${letter(d.optionIndex)}. ${d.why_wrong_or_right}${errTail}`);
    }
  }
  if (w.teach_back.trim()) parts.push(`Remember: ${w.teach_back}`);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/** Per-distractor coaching, personalized to the option the learner chose. */
export function coachingScript(q: NarrationQuestion, w: Walkthrough, optionIndex: number): string | null {
  const a = w.answer_choice_analysis.find((x) => x.optionIndex === optionIndex);
  if (!a || a.isCorrect) return null; // coaching is for wrong answers
  const parts: string[] = [`Let's talk about option ${letter(optionIndex)}${q.options[optionIndex] ? ` — ${q.options[optionIndex]}` : ""}.`];
  parts.push(a.why_wrong_or_right);
  if (a.error_type_if_chosen) {
    const e = ERROR_TYPE_LABEL[a.error_type_if_chosen];
    parts.push(`This is a ${e.label.toLowerCase()}: ${e.meaning}`);
  }
  if (w.what_to_review_next.trim()) parts.push(`Review next: ${w.what_to_review_next}`);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export interface WalkthroughAudioItem {
  key: string;
  kind: "walkthrough" | "coaching";
  refId: string;
  title: string;
  text: string;
}

/**
 * Build the audio content items (one walkthrough + one coaching per distractor) for
 * a set of APPROVED walkthroughs. `qFor` resolves a question's topic + option text.
 * Shared by the extractor, the verify script, and the test — so the "audio ⊆ approved"
 * invariant is enforced in one place (callers pass only approved walkthroughs).
 */
export function walkthroughAudioItems(
  approved: Walkthrough[],
  qFor: (questionId: string) => NarrationQuestion | undefined,
): WalkthroughAudioItem[] {
  const out: WalkthroughAudioItem[] = [];
  for (const w of approved) {
    const q = qFor(w.question_id);
    if (!q) continue;
    out.push({ key: walkthroughKey(w.question_id), kind: "walkthrough", refId: w.question_id, title: `${q.topic} — walkthrough`, text: walkthroughScript(q, w) });
    for (const a of w.answer_choice_analysis) {
      if (a.isCorrect) continue;
      const text = coachingScript(q, w, a.optionIndex);
      if (text) out.push({ key: coachingKey(w.question_id, a.optionIndex), kind: "coaching", refId: `${w.question_id}#${a.optionIndex}`, title: `${q.topic} — option ${a.optionIndex + 1} coaching`, text });
    }
  }
  return out;
}

export { CJMM_STEP_BLURBS };
