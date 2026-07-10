// ───────────────────────────────────────────────────────────────────────────
// Difficulty transform - a pure function that ratchets a scenario's demand up
// or down WITHOUT changing its clinical content. Instructors (or a student who
// wants a harder rep) pick a level; we scale the timing knobs that make a
// scenario forgiving or unforgiving:
//   • rubric decision windows (how long you have to act)
//   • deterioration ramp speed (how fast the patient crashes when you don't)
//   • escalation deadlines (actionNotTakenBySec)
//
// It ONLY scales existing numbers - it never adds/removes cues, actions, or
// rules - so the output is always a valid scenario (validateScenario still
// passes) and the same clinical story, just more or less patient with you.
// Scaling down is always safe; scaling up is clamped so windows/deadlines
// still fit inside the run.
// ───────────────────────────────────────────────────────────────────────────

import type { VPatientScenario } from "../../data/vpatient/types";

export type Difficulty = "gentle" | "standard" | "harder" | "hardest";

export const DIFFICULTIES: Difficulty[] = ["gentle", "standard", "harder", "hardest"];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  gentle: "Gentle",
  standard: "Standard",
  harder: "Harder",
  hardest: "Hardest",
};

export const DIFFICULTY_BLURB: Record<Difficulty, string> = {
  gentle: "Wider windows and a slower decline - room to think it through.",
  standard: "The scenario as written.",
  harder: "Tighter windows and a faster decline - less room for hesitation.",
  hardest: "Minimal windows, a rapid crash - exam-day pressure.",
};

interface Knobs {
  /** Multiply rubric windowSec + opensAtSec and escalation deadlines by this. */
  time: number;
  /** Multiply deterioration ramp overSec by this (smaller = faster crash). */
  ramp: number;
}

// standard is identity. gentle relaxes; harder/hardest tighten.
const KNOBS: Record<Difficulty, Knobs> = {
  gentle: { time: 1.4, ramp: 1.5 },
  standard: { time: 1, ramp: 1 },
  harder: { time: 0.7, ramp: 0.65 },
  hardest: { time: 0.5, ramp: 0.45 },
};

const clampInt = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round(n)));

export function isDifficulty(v: string | null | undefined): v is Difficulty {
  return v === "gentle" || v === "standard" || v === "harder" || v === "hardest";
}

/**
 * Return a difficulty-adjusted copy of a scenario. `standard` returns an
 * equivalent scenario (identity scaling). The result is a deep-enough copy that
 * the original is never mutated.
 */
export function applyDifficulty(sc: VPatientScenario, level: Difficulty): VPatientScenario {
  const k = KNOBS[level];
  if (level === "standard") return sc;
  const dur = sc.durationSec;

  const rules = sc.rules.map((r) => {
    const when = { ...r.when };
    // Escalation deadlines: harder = sooner. Keep >= a few seconds and < run end.
    if (when.actionNotTakenBySec) {
      when.actionNotTakenBySec = {
        ...when.actionNotTakenBySec,
        sec: clampInt(when.actionNotTakenBySec.sec * k.time, 5, dur - 5),
      };
    }
    const effects = r.effects.map((e) =>
      e.kind === "vitalsRamp"
        ? { ...e, overSec: clampInt(e.overSec * k.ramp, 1, dur) }
        : e,
    );
    return { ...r, when, effects };
  });

  const phases = sc.phases.map((p) =>
    p.vitalsDrift
      ? { ...p, vitalsDrift: { ...p.vitalsDrift, overSec: clampInt(p.vitalsDrift.overSec * k.ramp, 1, dur) } }
      : p,
  );

  const rubric = sc.rubric.map((d) => {
    const next = { ...d };
    if (d.windowSec !== undefined) next.windowSec = clampInt(d.windowSec * k.time, 5, dur);
    // opensAtSec must stay inside the run; scale but clamp below duration.
    if (d.opensAtSec !== undefined) next.opensAtSec = clampInt(d.opensAtSec * k.time, 0, dur - 1);
    return next;
  });

  return { ...sc, phases, rules, rubric };
}
