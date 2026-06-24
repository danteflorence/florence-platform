/**
 * Automated remediation builder. Given a mastery gap (a weak Client Need or CJMM
 * step), assemble a targeted module: the most-informative items from the bank for
 * that subscale (selected near the candidate's gap θ, reusing the CAT engine's
 * Fisher-information), an optional NGN case study that exercises the weak layer,
 * and a voice-tutor prompt that walks the rationale. This is what the dispatch
 * (api/) hands a candidate when a topic falls below threshold - closing the loop
 * from "weakness detected" to "targeted practice assigned".
 *
 * Pure; no React, no I/O. Reuses `itemInfo` from cat.ts.
 */

import type { CaseStudy, CjmmStep, ClientNeed, Question } from "../types/question";
import type { SubscaleMastery } from "./mastery";
import { itemInfo } from "./cat";

export interface RemediationModule {
  subscale: { dim: "client_need" | "cjmm"; key: ClientNeed | CjmmStep };
  /** Targeted practice item ids (most-informative near the gap θ). */
  itemIds: string[];
  /** An NGN case study that exercises the weak layer, if one is available. */
  caseStudyId?: string;
  /** A grounded prompt for the FlorenceRN voice tutor to walk the rationale. */
  voiceTutorPrompt: string;
}

function matches(q: Question, gap: SubscaleMastery): boolean {
  return gap.dim === "client_need" ? q.clientNeed === gap.key : q.cjmm === gap.key;
}

export function buildRemediation(
  gap: SubscaleMastery,
  pool: Question[],
  opts?: { count?: number; cases?: CaseStudy[] },
): RemediationModule {
  const count = opts?.count ?? 8;
  const candidates = pool.filter((q) => matches(q, gap));
  // Most informative items AT the candidate's current ability for this subscale -
  // i.e. items right at the edge of what they can do, where learning is fastest.
  const ranked = candidates
    .map((q) => ({ q, info: itemInfo(gap.theta, q.difficulty) }))
    .sort((a, b) => b.info - a.info)
    .slice(0, count)
    .map((r) => r.q.id);

  // A case study that exercises this subscale (shares an item with the matched set).
  const matchedIds = new Set(candidates.map((q) => q.id));
  const caseStudy = opts?.cases?.find((c) => c.questionIds.some((id) => matchedIds.has(id)));

  const label = String(gap.key).replace(/-/g, " ");
  const voiceTutorPrompt =
    gap.dim === "cjmm"
      ? `Coach me on the "${label}" step of clinical judgment. Use the practice items I just missed; explain the cue-to-action reasoning, not just the right answer.`
      : `Tutor me on ${label}. I'm scoring below the passing standard here - walk the rationale for the items I missed and quiz me until I'm consistent.`;

  return {
    subscale: { dim: gap.dim, key: gap.key },
    itemIds: ranked,
    ...(caseStudy ? { caseStudyId: caseStudy.id } : {}),
    voiceTutorPrompt,
  };
}

/** Build remediation modules for every gap, weakest first. */
export function buildRemediationPlan(gaps: SubscaleMastery[], pool: Question[], opts?: { count?: number; cases?: CaseStudy[] }): RemediationModule[] {
  return gaps.map((g) => buildRemediation(g, pool, opts));
}
