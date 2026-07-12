// ───────────────────────────────────────────────────────────────────────────
// Calibration - the measurement moat. Two pure computations over data the
// platform already collects:
//
//   1. EMPIRICAL ITEM DIFFICULTY from live response data. The bank ships with
//      transparent PRIORS (flagged `calibrated:false`); once an item has
//      enough real attempts, its observed pass rate replaces the prior via
//      the Rasch inversion b = -logit(p). v1 deliberately ignores respondent
//      ability mix (documented simplification: it's a POPULATION-anchored
//      difficulty for OUR IEN population - which is exactly the population we
//      predict for). Nobody else has IEN-specific calibration.
//
//   2. READINESS-CUT VALIDATION against real NCLEX outcomes. For every
//      candidate with a reported nclex_result, pair their last pre-exam
//      readiness band with pass/fail → per-band pass rates + the green-band
//      PPV ("when Florence says ready, how often do they pass?"). This is the
//      number the whole company eventually sells.
//
// Pure + unit-tested; the offline script (scripts/calibrate-items.ts) feeds it
// from the store and writes the report.
// ───────────────────────────────────────────────────────────────────────────

export interface ItemEvidence {
  question_id: string;
  attempts: number;
  pass_rate: number; // 0..1
}

export interface CalibratedItem {
  question_id: string;
  attempts: number;
  pass_rate: number;
  /** Rasch difficulty from the observed pass rate, clamped to ±3 logits. */
  empirical_b: number;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** b = -ln(p/(1-p)), with p clamped away from 0/1 so extremes stay finite. */
export function difficultyFromPassRate(passRate: number): number {
  const p = clamp(passRate, 0.02, 0.98);
  return clamp(-Math.log(p / (1 - p)), -3, 3);
}

/** Items with enough evidence become empirically calibrated. */
export function calibrateItems(evidence: ItemEvidence[], minAttempts = 20): CalibratedItem[] {
  return evidence
    .filter((e) => e.attempts >= minAttempts)
    .map((e) => ({
      question_id: e.question_id,
      attempts: e.attempts,
      pass_rate: Math.round(e.pass_rate * 1000) / 1000,
      empirical_b: Math.round(difficultyFromPassRate(e.pass_rate) * 100) / 100,
    }))
    .sort((a, b) => b.empirical_b - a.empirical_b);
}

export interface OutcomePair {
  band: string; //  the candidate's last readiness band BEFORE the exam
  passed: boolean;
}

export interface BandRow {
  band: string;
  n: number;
  passed: number;
  pass_rate: number;
}

export interface CutValidation {
  pairs: number;
  by_band: BandRow[];
  /** P(pass | band=green) - the promise the readiness gate makes. */
  green_ppv: number | null;
  /** P(pass | band!=green) - what ignoring the gate costs. */
  non_green_pass_rate: number | null;
}

const BAND_ORDER = ["green", "yellow", "orange", "red", "none"];

export function validateCut(pairs: OutcomePair[]): CutValidation {
  const byBand = new Map<string, { n: number; passed: number }>();
  for (const p of pairs) {
    const row = byBand.get(p.band) ?? { n: 0, passed: 0 };
    row.n++;
    if (p.passed) row.passed++;
    byBand.set(p.band, row);
  }
  const rows: BandRow[] = [...byBand.entries()]
    .map(([band, r]) => ({
      band,
      n: r.n,
      passed: r.passed,
      pass_rate: Math.round((r.passed / r.n) * 1000) / 1000,
    }))
    .sort((a, b) => BAND_ORDER.indexOf(a.band) - BAND_ORDER.indexOf(b.band));

  const green = byBand.get("green");
  const nonGreen = pairs.filter((p) => p.band !== "green");
  return {
    pairs: pairs.length,
    by_band: rows,
    green_ppv: green && green.n > 0 ? Math.round((green.passed / green.n) * 1000) / 1000 : null,
    non_green_pass_rate:
      nonGreen.length > 0
        ? Math.round((nonGreen.filter((p) => p.passed).length / nonGreen.length) * 1000) / 1000
        : null,
  };
}
