/**
 * Content-mastery gates — the "you must master the prerequisite" layer of the
 * closed-loop pass-rate engine. This sits ON TOP of the existing coverage
 * watermark (which answers "has the candidate been taught this section?"). The
 * gate answers "has the candidate demonstrated mastery of the section's primary
 * Client Need?" — and blocks progression only when there is DEMONSTRATED weakness
 * (a measured sub-threshold θ with enough evidence). No evidence ⇒ no block; the
 * candidate learns first, the gate engages once they've been assessed.
 *
 * Pure; no React, no I/O.
 */

import type { SectionSpec } from "../data/blueprint";
import type { SubscaleMastery } from "./mastery";
import { MASTERY_THRESHOLD } from "./mastery";

export interface GateResult {
  open: boolean;
  /** Subscales that are below threshold and blocking (empty when open). */
  blockedBy: SubscaleMastery[];
  reason: string;
}

/**
 * Gate a section on mastery of its primary Client Need. Open when there is no
 * evidence yet (the candidate hasn't been assessed in this need) or when θ clears
 * the threshold; closed when θ is below threshold with sufficient evidence.
 */
export function sectionGate(section: SectionSpec, ms: SubscaleMastery[], threshold = MASTERY_THRESHOLD): GateResult {
  const m = ms.find((x) => x.dim === "client_need" && x.key === section.primaryNeed);
  if (!m || m.items < threshold.minItems) {
    return { open: true, blockedBy: [], reason: "no mastery evidence yet — learn first" };
  }
  if (m.theta < threshold.clientNeed) {
    return { open: false, blockedBy: [m], reason: `mastery of ${section.primaryNeed} below the passing standard` };
  }
  return { open: true, blockedBy: [], reason: "mastery demonstrated" };
}

/** Gate the readiness to SIT the NCLEX on overall pass probability (advisory input to the hard gate). */
export function readinessSit(passProbability: number | undefined, min = 0.8): { ready: boolean; passProbability: number; reason: string } {
  const p = passProbability ?? 0;
  return {
    ready: p >= min,
    passProbability: p,
    reason: p >= min ? "at or above the readiness standard" : `pass probability ${Math.round(p * 100)}% below the ${Math.round(min * 100)}% standard`,
  };
}
