// Scenario registry - the single place the app discovers virtual-patient
// scenarios. Learners only ever see status:"approved" scenarios (the same QA
// gate as walkthroughs); everything else is reachable only in an authoring /
// ops preview context that passes includeDrafts.

import type { VPatientScenario } from "./types";
import { SEPSIS_01 } from "./scenarios/sepsis01";

const ALL: VPatientScenario[] = [SEPSIS_01];

/** Approved scenarios a learner may launch. */
export function approvedScenarios(): VPatientScenario[] {
  return ALL.filter((s) => s.status === "approved");
}

/** All scenarios, drafts included - authoring/ops preview only. */
export function allScenarios(): VPatientScenario[] {
  return ALL;
}

/** Resolve one scenario by id. With includeDrafts=false (default) a
 *  not-yet-approved scenario resolves to undefined - a learner can't deep-link
 *  past the gate. */
export function getScenario(id: string, includeDrafts = false): VPatientScenario | undefined {
  const s = ALL.find((x) => x.id === id);
  if (!s) return undefined;
  if (!includeDrafts && s.status !== "approved") return undefined;
  return s;
}
