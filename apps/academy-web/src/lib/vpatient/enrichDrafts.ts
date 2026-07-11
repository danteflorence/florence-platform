// ───────────────────────────────────────────────────────────────────────────
// Draft → seed mapping for batch enrichment. Pure + unit-tested: given a
// skeleton draft (from the purchased-pack conversion), infer the clinical
// insult, the closest MetaHuman persona, and the care setting, so the generator
// (scenarioGen.buildPlayableScenario) can turn it into a playable scenario.
//
// The insult mapping is a HEURISTIC over the title/chart text - it gets the
// deteriorating-patient SHAPE right (recognize → escalate → treat → reassess)
// and a plausible clinical model, but the SME confirms the exact insult during
// review. That's why enriched scenarios stay status "draft".
// ───────────────────────────────────────────────────────────────────────────

import type { ScenarioSeed } from "./scenarioGen";
import { PERSONAS } from "../../data/vpatient/castRegistry";
import type { ClientNeed } from "../../types/question";

export interface RawDraft {
  id: string;
  title: string;
  setting?: unknown;
  clientNeed?: ClientNeed;
  patient?: { age?: unknown; sex?: unknown; history?: unknown; meds?: unknown };
  chart?: unknown;
}

// title/content → BioGears-derived insult id (most specific first). Note the
// deliberately narrow "tension pneumo" - a bare /tension/ would false-match
// "hypertension".
export const INSULT_MAP: [RegExp, string][] = [
  [/pneumothorax|tension pneumo|chest tube|sucking chest/i, "tension_pneumothorax"],
  [/sepsis|septic|infection|meningitis|pneumonia|\buti\b|cellulitis|peritonitis|neutropenic/i, "infection_sepsis"],
  [/hemorrhage|haemorrhage|\bbleed|blood loss|postpartum|\bgi bleed|hypovolem|exsanguin/i, "hemorrhage"],
  [/asthma|copd|bronch|wheez|reactive airway/i, "asthma_attack"],
  [/ards|acute respiratory distress|refractory hypox/i, "ards"],
  [/airway|obstruction|choking|aspiration|stridor|anaphyla/i, "airway_obstruction"],
  [/cardiac arrest|\bcode blue|pulseless|v-?fib|asystole|\bpea\b|acls/i, "cardiac_arrest"],
  [/stroke|brain attack|\btbi\b|head injury|intracranial|increased icp|traumatic brain|subdural|seizure/i, "tbi"],
  [/\bburn|scald|inhalation injury/i, "burn"],
  [/\bpain\b|post-?op pain|analgesi/i, "pain"],
];
export const INSULT_FALLBACK = "infection_sepsis"; // archetypal deteriorating ward patient

export const SETTING_MAP: [RegExp, string][] = [
  [/\bicu\b|critical care|intensive care/i, "micu"],
  [/emergency|\bed\b|\ber\b|trauma bay|triage/i, "ed"],
  [/operating room|\bintra-?op|\bor suite/i, "or"],
  [/pacu|recovery room|post-?anesth/i, "pacu"],
  [/labor|delivery|\bl&d\b|obstetric|postpartum|antepartum/i, "labor_delivery"],
  [/nicu|neonat/i, "nicu"],
  [/\bpicu\b/i, "picu"],
  [/pediatric|peds|paediatric|\bchild\b|adolescent/i, "pediatrics"],
  [/dialysis|hemodialysis/i, "dialysis"],
  [/oncology|chemo|cancer unit/i, "oncology"],
  [/telemetry|cardiac unit|step-?down/i, "telemetry"],
  [/behavioral|psychiatr|mental health/i, "behavioral"],
  [/home health|home visit|community/i, "home_health"],
  [/clinic|outpatient|ambulatory/i, "primary_care"],
  [/\bsnf\b|nursing home|long-?term care|skilled nursing/i, "snf"],
  [/hospice|palliat|end of life/i, "hospice"],
];
export const SETTING_FALLBACK = "med_surg";

export function matchFirst(text: string, table: [RegExp, string][], fallback: string): string {
  for (const [re, v] of table) if (re.test(text)) return v;
  return fallback;
}

/** Closest persona by age within the draft's sex (falls back to any sex). */
export function pickPersonaId(age: number, sex: string): string {
  const s = /^f/i.test(sex) ? "F" : /^m/i.test(sex) ? "M" : "";
  const pool = s ? PERSONAS.filter((p) => p.sex === s) : PERSONAS;
  const list = pool.length ? pool : PERSONAS;
  return list.reduce((best, p) => (Math.abs(p.age - age) < Math.abs(best.age - age) ? p : best), list[0]).id;
}

/** Drop placeholder ("Edit: ...") and empty strings from a draft string array. */
export function cleanStrings(arr: unknown): string[] | undefined {
  if (!Array.isArray(arr)) return undefined;
  const kept = arr.filter((x) => typeof x === "string" && !/^edit[:\s]/i.test(x) && x.trim().length > 0);
  return kept.length ? (kept as string[]) : undefined;
}

export function draftToSeed(draft: RawDraft): ScenarioSeed {
  const blob = [draft.title, draft.setting, JSON.stringify(draft.patient), JSON.stringify(draft.chart)].join(" ");
  const age = Number(draft.patient?.age) || 55;
  const setting = typeof draft.setting === "string" && !/^edit[:\s]/i.test(draft.setting) ? draft.setting : undefined;
  return {
    id: draft.id,
    title: draft.title,
    insultId: matchFirst(blob, INSULT_MAP, INSULT_FALLBACK),
    careSettingId: matchFirst(blob, SETTING_MAP, SETTING_FALLBACK),
    personaId: pickPersonaId(age, typeof draft.patient?.sex === "string" ? draft.patient.sex : ""),
    clientNeed: draft.clientNeed ?? "physiological-adaptation",
    severity: 0.85,
    setting,
    history: cleanStrings(draft.patient?.history),
    meds: cleanStrings(draft.patient?.meds),
  };
}
