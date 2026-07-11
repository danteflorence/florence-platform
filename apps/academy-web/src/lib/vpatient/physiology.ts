// ───────────────────────────────────────────────────────────────────────────
// Physiology projector - the deterministic binding between a PERSON (persona,
// with baseline vitals + per-system reserve) and an INSULT (a BioGears-derived
// signature from clinicalModel.ts). It answers the BioGears question - "given
// this injury on this body, where do the vitals go and how fast?" - but as a
// pure, precomputed projection our screen engine can play, not a running C++
// solver.
//
// The whole point of the cast registry is that the SAME insult produces a
// DIFFERENT trajectory per person: a septic hit on the frail 82-year-old
// (low reserve) drops her pressure sooner and steeper than the same hit on the
// fit 24-year-old (high reserve), who compensates and then falls off a cliff.
// Reserve scales both the MAGNITUDE of each vital's move and the ONSET time.
//
// Pure + deterministic: no Date.now, no randomness. Same inputs → same numbers.
// ───────────────────────────────────────────────────────────────────────────

import type { NumericVitalKey, Phase, VitalsNumeric } from "../../data/vpatient/types";
import type { EffectDirection } from "../../data/vpatient/clinicalModel";
import { INSULT_BY_ID, INTERVENTION_BY_ID } from "../../data/vpatient/clinicalModel";
import type { Persona, PhysioReserve } from "../../data/vpatient/castRegistry";

/** Full-severity delta from baseline for a mid-reserve (0.5) patient. The
 *  persona's reserve then scales this up (low reserve) or down (high reserve). */
const CANON_DELTA: Record<NumericVitalKey, number> = {
  hr: 52,
  sbp: 58,
  dbp: 34,
  rr: 16,
  spo2: 20,
  tempC: 2.4,
  pain: 8,
};

/** Physiologic clamps - vitals can't leave the survivable envelope on a ramp. */
const FLOOR: Record<NumericVitalKey, number> = { hr: 24, sbp: 44, dbp: 24, rr: 4, spo2: 55, tempC: 33, pain: 0 };
const CEIL: Record<NumericVitalKey, number> = { hr: 210, sbp: 250, dbp: 150, rr: 46, spo2: 100, tempC: 42, pain: 10 };

/** Which reserve system governs a given vital. */
function systemFor(key: NumericVitalKey): keyof PhysioReserve {
  if (key === "spo2" || key === "rr") return "respiratory";
  if (key === "hr" || key === "sbp" || key === "dbp") return "cardiovascular";
  return "neuro"; // tempC/pain ride the generic (neuro) channel
}

/** Reserve → magnitude multiplier. Low reserve amplifies the hit (up to ~1.4x),
 *  high reserve blunts it (down to ~0.6x). */
function magnitudeFactor(reserve: number): number {
  return 1.4 - 0.8 * clamp01(reserve);
}

/** Reserve + severity → onset multiplier on a base window. Sicker and
 *  lower-reserve = faster onset (shorter overSec). */
function onsetFactor(reserve: number, severity: number): number {
  const bySeverity = 1.25 - 0.55 * clamp01(severity); // 0.7 .. 1.25
  const byReserve = 0.7 + 0.6 * clamp01(reserve); //     0.7 .. 1.3
  return bySeverity * byReserve;
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

export interface InsultProjection {
  /** Baseline vitals for the run (the persona's resting state). */
  initialVitals: VitalsNumeric;
  /** Target vitals the insult drives toward, per moved vital. */
  targets: Partial<VitalsNumeric>;
  /** Seconds over which the drift plays. */
  overSec: number;
  /** Categorical consequences (LOC/rhythm) the author should wire as text. */
  textEffects: string[];
  /** Trace back to the source insult + severity (attribution + debugging). */
  source: { insultId: string; bioGearsAction: string; severity: number };
}

/**
 * Project an insult onto a persona. severity ∈ [0,1]. baseOnsetSec is the
 * mid-reserve onset window (default 240s ≈ a 4-minute deterioration at the
 * ~6:1 teaching compression the scenarios already use).
 */
export function projectInsult(
  persona: Persona,
  insultId: string,
  severity: number,
  baseOnsetSec = 240,
): InsultProjection {
  const insult = INSULT_BY_ID.get(insultId);
  if (!insult) throw new Error(`unknown insult: ${insultId}`);
  const sev = clamp01(severity);

  const targets: Partial<VitalsNumeric> = {};
  for (const eff of insult.effects) {
    const key = eff.key;
    const reserve = persona.reserve[systemFor(key)];
    const delta = CANON_DELTA[key] * sev * magnitudeFactor(reserve);
    const signed = eff.direction === "up" ? delta : -delta;
    const raw = persona.baseline[key] + signed;
    const bounded = Math.min(CEIL[key], Math.max(FLOOR[key], raw));
    // tempC to 0.1, everything else whole numbers.
    targets[key] = key === "tempC" ? round1(bounded) : Math.round(bounded);
  }

  // Onset is governed by the WORST-reserve system this insult touches (the
  // organ that gives out first sets the pace).
  const touchedReserves = insult.effects.map((e) => persona.reserve[systemFor(e.key)]);
  const governingReserve = touchedReserves.length ? Math.min(...touchedReserves) : 0.5;
  const overSec = Math.round(baseOnsetSec * onsetFactor(governingReserve, sev));

  return {
    initialVitals: { ...persona.baseline },
    targets,
    overSec,
    textEffects: insult.textEffects ?? [],
    source: { insultId, bioGearsAction: insult.bioGearsAction, severity: sev },
  };
}

/**
 * Turn a projection into the scenario Phase[] the engine consumes: a baseline
 * phase at t=0 and a drift phase that starts after a grace window. This is the
 * clock-driven "story" an author would otherwise hand-tune.
 */
export function insultPhases(proj: InsultProjection, startSec = 30): Phase[] {
  return [
    { id: "p0-baseline", atSec: 0, cues: [] },
    {
      id: "p1-insult",
      atSec: startSec,
      vitalsDrift: { targets: proj.targets, overSec: proj.overSec },
      cues: [],
    },
  ];
}

export interface InterventionRamp {
  key: NumericVitalKey;
  target: number;
  overSec: number;
}

/**
 * Project a correct intervention as recovery ramps back toward the persona's
 * baseline. Reserve governs recovery too: high reserve recovers faster and more
 * completely, low reserve lags and may not fully return. `effectiveness` ∈ [0,1]
 * lets an author model a partial/late intervention.
 */
export function projectIntervention(
  persona: Persona,
  interventionId: string,
  effectiveness = 1,
  baseRecoverSec = 180,
): InterventionRamp[] {
  const iv = INTERVENTION_BY_ID.get(interventionId);
  if (!iv) throw new Error(`unknown intervention: ${interventionId}`);
  const eff = clamp01(effectiveness);

  const ramps: InterventionRamp[] = [];
  for (const e of iv.effects) {
    const key = e.key;
    const reserve = persona.reserve[systemFor(key)];
    // Recovery returns toward baseline; how far depends on effectiveness and
    // reserve. A frail patient reclaims less of the deficit per unit time.
    const reclaim = eff * (0.55 + 0.45 * clamp01(reserve));
    // We express recovery as a target AT baseline (the engine ramps the current
    // drifted value toward it); reclaim shapes the overSec instead of the target
    // so a correct intervention aims for baseline but a low-reserve (or
    // less-effective) intervention takes longer to get there. Unlike insult
    // onset, recovery does NOT speed up with low reserve - a frail patient
    // reclaims perfusion slowly, so reclaim is the only pace term here.
    const target = clampVital(key, persona.baseline[key]);
    const overSec = Math.round(baseRecoverSec / Math.max(0.3, reclaim));
    ramps.push({ key, target, overSec });
  }
  return ramps;
}

function clampVital(key: NumericVitalKey, v: number): number {
  const bounded = Math.min(CEIL[key], Math.max(FLOOR[key], v));
  return key === "tempC" ? round1(bounded) : Math.round(bounded);
}

/** Direction helper re-export for authors composing custom effects. */
export type { EffectDirection };
