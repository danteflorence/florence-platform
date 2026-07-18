// Distance to the door: turn the readiness gap into an honest week range.
//
// The model is deliberately transparent so the number can be defended to a
// learner: cohorts typically move from a 0.50 baseline to the 0.80 green
// threshold over 10 to 14 weeks of steady practice (~150 items/week), which
// brackets the weekly gain at roughly 1.8 to 3.0 readiness points. A learner
// studying more or less than the reference volume scales that rate, clamped
// so the estimate never promises miracles. Always a range, never a date.

import { GREEN_THRESHOLD } from "./readinessView";

const FAST_GAIN_PER_WEEK = 0.03;
const SLOW_GAIN_PER_WEEK = 0.018;
const REFERENCE_ITEMS_PER_WEEK = 150;
const MIN_PACE_SCALE = 0.5;
const MAX_PACE_SCALE = 1.5;
const MAX_DISPLAY_WEEKS = 26;

export interface DoorDistance {
  minWeeks: number;
  maxWeeks: number;
}

/** Week range to reach the green band, or null when there is nothing honest
 *  to say (no assessed readiness yet, or the learner is already green). */
export function estimateWeeksToGreen(
  readiness: number | undefined,
  itemsPerWeek: number = REFERENCE_ITEMS_PER_WEEK,
): DoorDistance | null {
  if (readiness === undefined || !Number.isFinite(readiness)) return null;
  if (readiness >= GREEN_THRESHOLD) return null;
  const distance = GREEN_THRESHOLD - Math.max(readiness, 0);
  const scale = Math.min(
    MAX_PACE_SCALE,
    Math.max(MIN_PACE_SCALE, itemsPerWeek / REFERENCE_ITEMS_PER_WEEK),
  );
  const minWeeks = Math.max(1, Math.round(distance / (FAST_GAIN_PER_WEEK * scale)));
  const maxWeeks = Math.min(
    MAX_DISPLAY_WEEKS,
    Math.max(minWeeks + 1, Math.round(distance / (SLOW_GAIN_PER_WEEK * scale))),
  );
  return { minWeeks, maxWeeks };
}

/** Learner-facing sentence for the estimate. */
export function doorDistancePhrase(d: DoorDistance): string {
  if (d.maxWeeks >= MAX_DISPLAY_WEEKS) {
    return `Distance to the door: a long runway today. Steady weeks of practice close it; your estimate tightens as you study.`;
  }
  return `Distance to the door: about ${d.minWeeks} to ${d.maxWeeks} weeks of steady practice to the green band. An estimate, not a promise; it moves as you study.`;
}
