// ───────────────────────────────────────────────────────────────────────────
// Pre-computed vitals time-series for the SVT → adenosine bedside simulation.
// No physiology engine, no GPU, no server: a deterministic builder produces a
// 0-120 s monitor trace that the VitalsMonitor component plays back client-side.
// The clinical shape (stable SVT → vagal → 6 mg → transient asystole → 12 mg →
// longer asystole → conversion to NSR) follows the Hour 7 teaching.
// ───────────────────────────────────────────────────────────────────────────

export interface VitalSample {
  t: number; // seconds
  hr: number; // bpm (0 during asystolic pause)
  sbp: number;
  dbp: number;
  spo2: number;
  rhythm: string;
}

export type PhaseTone = "baseline" | "intervention" | "critical" | "recovery";

export interface SimPhase {
  id: string;
  tStart: number;
  tEnd: number;
  label: string;
  detail: string;
  tone: PhaseTone;
}

export interface SimEvent {
  t: number;
  label: string;
}

export const SIM_DURATION = 120; // seconds

export const SIM_PHASES: SimPhase[] = [
  {
    id: "baseline",
    tStart: 0,
    tEnd: 15,
    label: "Stable SVT, ~190 bpm",
    detail:
      "Narrow-complex, regular tachycardia. The patient is symptomatic (palpitations, mild chest pressure, anxiety) but maintaining blood pressure and mentation - a STABLE presentation. Stable SVT is treated medically, not with electricity.",
    tone: "baseline",
  },
  {
    id: "vagal",
    tStart: 15,
    tEnd: 24,
    label: "Vagal maneuvers (Valsalva)",
    detail:
      "First-line for stable SVT. Ask the patient to bear down (or use a modified Valsalva with leg raise). You may see transient slowing, but here the rhythm does not convert.",
    tone: "intervention",
  },
  {
    id: "prep6",
    tStart: 24,
    tEnd: 30,
    label: "Prepare adenosine 6 mg",
    detail:
      "Two-syringe technique: adenosine in one syringe, 20 mL saline flush in the other, via a proximal large-bore IV. Adenosine's half-life is < 10 seconds. Warn the patient about flushing, chest pressure, and a brief 'pause' before you push.",
    tone: "intervention",
  },
  {
    id: "asystole6",
    tStart: 30,
    tEnd: 37,
    label: "Adenosine 6 mg - transient asystole",
    detail:
      "Rapid IV push + immediate flush. Adenosine briefly blocks the AV node, producing a few seconds of asystole on the monitor. This is EXPECTED - it is the drug working, not an arrest. Do not start CPR for the expected pause.",
    tone: "critical",
  },
  {
    id: "nosvt",
    tStart: 37,
    tEnd: 46,
    label: "No conversion - still SVT",
    detail:
      "The rhythm reorganizes back into SVT: 6 mg did not convert it. Escalate to the second dose.",
    tone: "baseline",
  },
  {
    id: "asystole12",
    tStart: 46,
    tEnd: 60,
    label: "Adenosine 12 mg - transient asystole",
    detail:
      "Second dose, 12 mg rapid IV push + flush. A longer asystolic pause is common before the sinus node resumes control.",
    tone: "critical",
  },
  {
    id: "convert",
    tStart: 60,
    tEnd: 72,
    label: "Conversion to sinus rhythm",
    detail:
      "The sinus node recaptures: the rate organizes and slows. Reassess blood pressure, symptoms, and obtain a 12-lead ECG.",
    tone: "recovery",
  },
  {
    id: "nsr",
    tStart: 72,
    tEnd: 120,
    label: "Stable in normal sinus rhythm",
    detail:
      "HR ~76, BP normalized, SpO₂ 98%. Symptoms resolved. Document the conversion, continue monitoring, and identify triggers.",
    tone: "recovery",
  },
];

export const SIM_EVENTS: SimEvent[] = [
  { t: 15, label: "Vagal" },
  { t: 30, label: "Adenosine 6 mg" },
  { t: 46, label: "Adenosine 12 mg" },
  { t: 62, label: "Conversion" },
];

// Deterministic, reproducible jitter (no RNG) so the trace looks alive but is
// identical on every load.
function jitter(t: number, amp: number, freq: number, phase = 0): number {
  return Math.sin(t * freq + phase) * amp + Math.sin(t * freq * 2.3 + phase) * (amp * 0.4);
}

function buildSamples(): VitalSample[] {
  const out: VitalSample[] = [];
  for (let t = 0; t <= SIM_DURATION; t++) {
    let hr = 0;
    let sbp = 0;
    let dbp = 0;
    let spo2 = 96;
    let rhythm = "";

    if (t < 15) {
      hr = 190 + jitter(t, 3, 1.3);
      sbp = 98 + jitter(t, 2, 0.7);
      dbp = 64 + jitter(t, 1.5, 0.7);
      spo2 = 96;
      rhythm = "SVT ~190";
    } else if (t < 24) {
      // vagal: transient dip then back up, no conversion
      const dip = t >= 17 && t <= 20 ? 16 : 0;
      hr = 188 - dip + jitter(t, 3, 1.3);
      sbp = 100 + jitter(t, 2, 0.7);
      dbp = 65 + jitter(t, 1.5, 0.7);
      spo2 = 96;
      rhythm = "SVT (vagal attempt)";
    } else if (t < 30) {
      hr = 186 + jitter(t, 3, 1.3);
      sbp = 98 + jitter(t, 2, 0.7);
      dbp = 64 + jitter(t, 1.5, 0.7);
      spo2 = 96;
      rhythm = "SVT ~186";
    } else if (t < 37) {
      // adenosine 6 mg → asystolic pause ~32-36
      if (t >= 32 && t <= 36) {
        hr = 0;
        sbp = 78 - (t - 32) * 1.5;
        dbp = 48 - (t - 32);
        spo2 = 95 - (t - 32);
        rhythm = "Asystole (expected pause)";
      } else {
        hr = 150 + jitter(t, 6, 1.1);
        sbp = 88 + jitter(t, 3, 0.7);
        dbp = 56 + jitter(t, 2, 0.7);
        spo2 = 95;
        rhythm = "Reorganizing";
      }
    } else if (t < 46) {
      hr = 184 + jitter(t, 3, 1.3);
      sbp = 96 + jitter(t, 2, 0.7);
      dbp = 62 + jitter(t, 1.5, 0.7);
      spo2 = 96;
      rhythm = "SVT - no conversion";
    } else if (t < 60) {
      // adenosine 12 mg → longer asystolic pause ~50-58
      if (t >= 50 && t <= 58) {
        hr = 0;
        sbp = 74 - (t - 50) * 1.1;
        dbp = 46 - (t - 50) * 0.6;
        spo2 = 94 - Math.min(4, t - 50);
        rhythm = "Asystole (expected pause)";
      } else {
        hr = 140 + jitter(t, 8, 1.0);
        sbp = 86 + jitter(t, 3, 0.7);
        dbp = 54 + jitter(t, 2, 0.7);
        spo2 = 94;
        rhythm = "Reorganizing";
      }
    } else if (t < 72) {
      // conversion: HR glides 120 → 82
      const p = (t - 60) / 12;
      hr = 120 - 38 * p + jitter(t, 2, 0.9);
      sbp = 104 + 14 * p + jitter(t, 2, 0.6);
      dbp = 64 + 10 * p + jitter(t, 1.5, 0.6);
      spo2 = 96 + Math.round(p * 2);
      rhythm = "Converting → NSR";
    } else {
      hr = 76 + jitter(t, 2, 0.5);
      sbp = 120 + jitter(t, 2, 0.4);
      dbp = 76 + jitter(t, 1.5, 0.4);
      spo2 = 98;
      rhythm = "Normal sinus rhythm";
    }

    out.push({
      t,
      hr: Math.max(0, Math.round(hr)),
      sbp: Math.round(sbp),
      dbp: Math.round(dbp),
      spo2: Math.round(spo2),
      rhythm,
    });
  }
  return out;
}

export const VITALS: VitalSample[] = buildSamples();

export function phaseAt(t: number): SimPhase {
  return (
    SIM_PHASES.find((p) => t >= p.tStart && t < p.tEnd) ??
    SIM_PHASES[SIM_PHASES.length - 1]
  );
}
