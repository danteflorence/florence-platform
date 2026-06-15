/**
 * Per-subscale mastery model — the foundation of the closed-loop pass-rate engine.
 *
 * The CAT engine (`cat.ts`) estimates ONE overall ability θ. But the NCLEX gap
 * for internationally-educated nurses is concentrated in specific Client Needs
 * (e.g. physiological adaptation, pharmacology) and specific NGN clinical-judgment
 * steps (the NCJMM layers). To remediate precisely we need a θ PER subscale, not
 * just one number.
 *
 * This reuses `estimateAbility` per partition of the response set, so the same
 * validated Rasch/EAP math gives a per-Client-Need and per-CJMM-step ability with
 * its own standard error and pass-probability. `masteryGaps` is the structured
 * successor to the string-only `focus_areas` — it returns weakest-first subscales
 * so the gate + remediation dispatch (P-T2) can act on them.
 *
 * Pure; no React, no I/O.
 */

import type { CjmmStep, ClientNeed } from "../types/question";
import { estimateAbility, type CatResponse } from "./cat";

export type SubscaleDim = "client_need" | "cjmm";

export interface Subscale {
  dim: SubscaleDim;
  key: ClientNeed | CjmmStep;
}

export interface SubscaleMastery {
  dim: SubscaleDim;
  key: ClientNeed | CjmmStep;
  /** Posterior-mean ability for this subscale (logits). */
  theta: number;
  /** Standard error — wide when few items have been seen in this subscale. */
  se: number;
  /** Projected pass probability for this subscale. */
  passProb: number;
  /** Items answered in this subscale (confidence proxy). */
  items: number;
}

/**
 * Mastery thresholds (logits). Default 0.0 = the NCLEX passing standard the CAT
 * engine uses as `passTheta`. Env-overridable; deliberately NOT a hidden constant
 * (the readiness gate calibrates these against real outcomes — see P-T4 + the
 * cohort data asset). The minimum item count guards against acting on a θ that is
 * really just prior + noise.
 */
export const MASTERY_THRESHOLD = {
  clientNeed: 0.0,
  cjmm: 0.0,
  /** Below this many items, a subscale is "insufficient evidence", not a gap. */
  minItems: 4,
};

function masteryFor(dim: SubscaleDim, key: ClientNeed | CjmmStep, subset: CatResponse[], passTheta: number): SubscaleMastery {
  const a = estimateAbility(subset, passTheta);
  return { dim, key, theta: a.theta, se: a.se, passProb: a.passProb, items: subset.length };
}

/**
 * Per-subscale ability across BOTH dimensions (Client Need + CJMM step). Only
 * subscales with at least one response are returned.
 */
export function subscaleMastery(responses: CatResponse[], passTheta = MASTERY_THRESHOLD.clientNeed): SubscaleMastery[] {
  const out: SubscaleMastery[] = [];

  // Client-Need subscales
  const byNeed = new Map<ClientNeed, CatResponse[]>();
  for (const r of responses) {
    const arr = byNeed.get(r.clientNeed) ?? [];
    arr.push(r);
    byNeed.set(r.clientNeed, arr);
  }
  for (const [key, subset] of byNeed) out.push(masteryFor("client_need", key, subset, passTheta));

  // CJMM subscales (only items tagged with a clinical-judgment step)
  const byCjmm = new Map<CjmmStep, CatResponse[]>();
  for (const r of responses) {
    if (!r.cjmm) continue;
    const arr = byCjmm.get(r.cjmm) ?? [];
    arr.push(r);
    byCjmm.set(r.cjmm, arr);
  }
  for (const [key, subset] of byCjmm) out.push(masteryFor("cjmm", key, subset, passTheta));

  return out;
}

/**
 * Subscales below threshold with enough evidence to act on, weakest (lowest θ)
 * first. Subscales with too few items are treated as "not yet assessed", not gaps.
 */
export function masteryGaps(
  ms: SubscaleMastery[],
  threshold = MASTERY_THRESHOLD,
): SubscaleMastery[] {
  return ms
    .filter((m) => m.items >= threshold.minItems)
    .filter((m) => m.theta < (m.dim === "cjmm" ? threshold.cjmm : threshold.clientNeed))
    .sort((a, b) => a.theta - b.theta);
}

/** Compact per-dimension mean maps for the assessment summary / dashboards. */
export function masteryMeans(ms: SubscaleMastery[]): { by_client_need: Record<string, number>; by_cjmm: Record<string, number> } {
  const by_client_need: Record<string, number> = {};
  const by_cjmm: Record<string, number> = {};
  for (const m of ms) {
    if (m.dim === "client_need") by_client_need[m.key] = m.passProb;
    else by_cjmm[m.key] = m.passProb;
  }
  return { by_client_need, by_cjmm };
}
