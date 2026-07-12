// ───────────────────────────────────────────────────────────────────────────
// Pacing - English-under-time-pressure is the quiet killer for IEN candidates:
// most NCLEX failures in this population are reading speed and second-guessing
// under the clock, not knowledge. This module turns the per-item `spentMs` the
// CAT session already records into a rolling READING-PACE PROFILE the learner
// can see and train against.
//
// The budget: NCLEX gives ~85 items in up to 5 hours, but the practical target
// every prep program coaches is ~90 seconds per item. We band against that.
// Pure math is exported for tests; a small localStorage window persists the
// last N samples per device (pace is a personal habit signal - device-local is
// exactly right, and it works signed-out).
// ───────────────────────────────────────────────────────────────────────────

export const PACE_BUDGET_MS = 90_000;
const STORE_KEY = "florence.pace.v1";
const MAX_SAMPLES = 300;

export interface PaceSample {
  spentMs: number;
  correct: boolean;
}

export type PaceBand = "unknown" | "fast" | "on-pace" | "slow";

export interface PaceProfile {
  samples: number;
  medianSec: number | null;
  p90Sec: number | null;
  /** Share of items that ran past the 90s budget (0..1). */
  overBudget: number | null;
  /** Accuracy on items answered PAST the budget vs within it - shows whether
   *  slowing down is actually buying correctness. */
  accuracyWithin: number | null;
  accuracyOver: number | null;
  band: PaceBand;
  advice: string;
}

function quantile(sorted: number[], q: number): number {
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[idx];
}

/** Pure profile math over a sample window. <10 samples = not enough signal. */
export function profileFrom(samples: PaceSample[]): PaceProfile {
  const usable = samples.filter((s) => s.spentMs > 500 && s.spentMs < 20 * 60_000);
  if (usable.length < 10) {
    return {
      samples: usable.length,
      medianSec: null,
      p90Sec: null,
      overBudget: null,
      accuracyWithin: null,
      accuracyOver: null,
      band: "unknown",
      advice: "Answer ten more items and your pace profile appears here.",
    };
  }
  const times = usable.map((s) => s.spentMs).sort((a, b) => a - b);
  const median = quantile(times, 0.5);
  const p90 = quantile(times, 0.9);
  const over = usable.filter((s) => s.spentMs > PACE_BUDGET_MS);
  const within = usable.filter((s) => s.spentMs <= PACE_BUDGET_MS);
  const acc = (list: PaceSample[]) =>
    list.length ? list.filter((s) => s.correct).length / list.length : null;

  const band: PaceBand = median > PACE_BUDGET_MS ? "slow" : median < 55_000 ? "fast" : "on-pace";
  const overShare = over.length / usable.length;
  const accWithin = acc(within);
  const accOver = acc(over);

  let advice: string;
  if (band === "slow") {
    advice =
      accOver !== null && accWithin !== null && accOver > accWithin + 0.1
        ? "You're slower than the 90-second budget, and the extra time IS buying accuracy. Train pace gradually: aim for 2 minutes per item this week, then 100 seconds."
        : "You're past the 90-second budget and the extra time is not improving accuracy - that's re-reading, not reasoning. Practice committing after one careful read.";
  } else if (band === "fast") {
    advice =
      accWithin !== null && accWithin < 0.6
        ? "You answer quickly but accuracy is suffering. Slow down: read every option before committing."
        : "Strong pace with headroom. Use timed mode to hold it under exam pressure.";
  } else {
    advice = "You're on the exam's pace. Keep it here with a timed session each week.";
  }

  return {
    samples: usable.length,
    medianSec: Math.round(median / 100) / 10,
    p90Sec: Math.round(p90 / 100) / 10,
    overBudget: Math.round(overShare * 100) / 100,
    accuracyWithin: accWithin === null ? null : Math.round(accWithin * 100) / 100,
    accuracyOver: accOver === null ? null : Math.round(accOver * 100) / 100,
    band,
    advice,
  };
}

function load(): PaceSample[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PaceSample[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Append a finished session's graded items to the rolling device window. */
export function recordPaceSamples(samples: PaceSample[]): void {
  if (samples.length === 0) return;
  try {
    const all = [...load(), ...samples];
    localStorage.setItem(STORE_KEY, JSON.stringify(all.slice(-MAX_SAMPLES)));
  } catch {
    /* storage unavailable - pace stays session-only */
  }
}

/** The device's current pace profile. */
export function paceProfile(): PaceProfile {
  return profileFrom(load());
}
