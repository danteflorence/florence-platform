// ───────────────────────────────────────────────────────────────────────────
// Lab interpretation - pure functions that flag resulted analytes against their
// reference and critical ranges. This is the "read the biology" layer: a
// learner orders a panel, the results post after a turnaround delay (handled in
// the engine), and these helpers tell the UI/debrief which values are abnormal
// or critical - the cue the nurse has to catch (a lactate of 4.8, a K+ of 6.9).
//
// The numbers themselves are authored today and will be Pulse-generated offline
// tomorrow (docs/PULSE_INTEGRATION.md); this interpretation layer is unchanged
// either way.
// ───────────────────────────────────────────────────────────────────────────

import type { LabFlag, LabPanel, LabValue } from "../../data/vpatient/types";

/** Compute the flag for one value from its ranges (explicit `flag` wins). */
export function flagOf(v: LabValue): LabFlag {
  if (v.flag) return v.flag;
  if (typeof v.value !== "number") return "normal";
  const n = v.value;
  if (v.criticalLow !== undefined && n <= v.criticalLow) return "critical-low";
  if (v.criticalHigh !== undefined && n >= v.criticalHigh) return "critical-high";
  if (v.refLow !== undefined && n < v.refLow) return "low";
  if (v.refHigh !== undefined && n > v.refHigh) return "high";
  return "normal";
}

export function isCritical(flag: LabFlag): boolean {
  return flag === "critical-high" || flag === "critical-low";
}
export function isAbnormal(flag: LabFlag): boolean {
  return flag !== "normal";
}

export interface InterpretedValue extends LabValue {
  computedFlag: LabFlag;
}

/** A panel with every value flagged - what the labs view renders. */
export function interpretPanel(panel: LabPanel): InterpretedValue[] {
  return panel.values.map((v) => ({ ...v, computedFlag: flagOf(v) }));
}

/** The critical values in a panel - what a debrief flags as must-catch cues. */
export function criticalValues(panel: LabPanel): InterpretedValue[] {
  return interpretPanel(panel).filter((v) => isCritical(v.computedFlag));
}

/** Human-readable one-liner for a value, e.g. "Lactate 4.8 mmol/L (critical-high)". */
export function describeValue(v: InterpretedValue): string {
  const unit = v.unit ? ` ${v.unit}` : "";
  const flag = v.computedFlag === "normal" ? "" : ` (${v.computedFlag})`;
  return `${v.label} ${v.value}${unit}${flag}`;
}
