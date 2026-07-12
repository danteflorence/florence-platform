// ───────────────────────────────────────────────────────────────────────────
// recast.ts - "run it again with a different patient." Pure transform that
// swaps WHO the patient is (name, age, sex, and therefore which voice/model
// the presence layer shows) while the clinical content stays identical. The
// point is bias-resistant judgment: sepsis has to be recognized on a 24-year-
// old athlete as fast as on a 78-year-old - learners must anchor on cues,
// not demographics.
//
// Deliberately identity-only in v1: vitals/phases/rubric are untouched, so a
// recast run scores on exactly the same rubric. (Physiology-true recasts -
// persona reserve reshaping the ramps - happen at authoring time through the
// generator, where an SME reviews the result.)
// ───────────────────────────────────────────────────────────────────────────

import type { VPatientScenario } from "../../data/vpatient/types";
import { PERSONAS, type Persona } from "../../data/vpatient/castRegistry";

// Sex-matched, deliberately international name pools - the patients our
// nurses will actually meet in a US hospital.
const NAMES_F = [
  "Maria Santos", "Aisha Okafor", "Elena Vasquez", "Grace Kim", "Fatima Hassan",
  "Priya Sharma", "Rosa Mendoza", "Amara Johnson", "Linh Nguyen", "Sarah Miller",
];
const NAMES_M = [
  "James Carter", "Miguel Torres", "Kwame Mensah", "David Chen", "Omar Farouk",
  "Rajesh Patel", "Luis Herrera", "Marcus Williams", "Tuan Pham", "Robert Hayes",
];

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
}

/** Deterministic character name for a persona (stable across runs/devices). */
export function characterNameFor(persona: Persona): string {
  const pool = persona.sex === "F" ? NAMES_F : NAMES_M;
  return pool[hash(persona.id) % pool.length];
}

/** Personas eligible to recast a scenario: different from the current patient
 *  and adults for adult scenarios (rough age-band guard: within 30 years). */
export function recastOptions(scenario: VPatientScenario): Persona[] {
  return PERSONAS.filter(
    (p) => Math.abs(p.age - scenario.patient.age) <= 30 && p.sex !== undefined,
  ).filter((p) => characterNameFor(p) !== scenario.patient.name);
}

/** Word-boundary replace of every token of the original name (+ honorifics). */
function swapNames(text: string, from: string, to: string, toSex: string): string {
  const toParts = to.split(" ");
  const toLast = toParts[toParts.length - 1] ?? to;
  const toFirst = toParts[0];
  const honorific = /^f/i.test(toSex) ? "Ms." : "Mr.";
  let out = text.split(from).join(to);
  const fromTokens = from.split(/\s+/).filter((t) => t.length > 2);
  const fromLast = fromTokens[fromTokens.length - 1];
  if (fromLast) {
    // "Mr./Mrs./Ms. <Last>" first, so the honorific matches the new patient.
    out = out.replace(new RegExp(`\\b(Mr|Mrs|Ms|Miss)\\.?\\s+${fromLast}\\b`, "g"), `${honorific} ${toLast}`);
  }
  for (const tok of fromTokens) {
    const replacement = tok === fromLast ? toLast : toFirst;
    out = out.replace(new RegExp(`\\b${tok}\\b`, "g"), replacement);
  }
  return out;
}

/**
 * The recast run: same clinical scenario, different human. Patient-spoken
 * audio clips are dropped (they were rendered in the ORIGINAL persona's
 * voice); narrator clips keep playing. Text is name-swapped everywhere the
 * learner reads it.
 */
export function recastScenario(scenario: VPatientScenario, persona: Persona): VPatientScenario {
  const name = characterNameFor(persona);
  const from = scenario.patient.name;
  const sub = (t: string) => swapNames(t, from, name, persona.sex);

  return {
    ...scenario,
    patient: {
      ...scenario.patient,
      name,
      age: persona.age,
      sex: persona.sex === "F" ? "female" : "male",
      chart: scenario.patient.chart.map((tab) => ({ ...tab, body: sub(tab.body) })),
    },
    setting: sub(scenario.setting),
    phases: scenario.phases.map((p) => ({
      ...p,
      cues: p.cues?.map((c) => ({ ...c, text: sub(c.text) })),
      patientLine: p.patientLine
        ? { ...p.patientLine, text: sub(p.patientLine.text), audioId: undefined }
        : p.patientLine,
    })),
    narration: scenario.narration.map((n) => ({ ...n, text: sub(n.text) })),
    patientResponses: scenario.patientResponses.map((r) => ({
      ...r,
      text: sub(r.text),
      audioId: undefined,
    })),
    debrief: {
      ...scenario.debrief,
      outcomeSummaries: Object.fromEntries(
        Object.entries(scenario.debrief.outcomeSummaries).map(([k, v]) => [k, sub(v)]),
      ) as VPatientScenario["debrief"]["outcomeSummaries"],
    },
  };
}
