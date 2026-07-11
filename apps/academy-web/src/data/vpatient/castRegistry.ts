// ───────────────────────────────────────────────────────────────────────────
// Cast registry - the reusable roster of virtual PEOPLE the scenarios draw
// from, decoupled from any one scenario. This is what lets us "switch people
// in and out": a scenario references a personaId, and the same insult
// (sepsis, hemorrhage, ...) plays out differently on a frail 78-year-old than
// on a fit 24-year-old, because each persona carries its own baseline vitals
// and per-system PHYSIOLOGIC RESERVE.
//
// The MetaHuman link: each persona has a `metaHumanId` - the swappable Unreal
// character asset. The manifest cast already emits model hints; when the 3D
// pipeline is live, personaId → metaHumanId picks the actual human on screen.
//
// The physiology binding (physiology.ts) reads `baseline` + `reserve` and the
// BioGears-derived insult signatures (clinicalModel.ts) to PROJECT a
// deterministic vitals trajectory - the same "wire their biological response to
// the insult" idea BioGears does at runtime, precomputed for our screen engine.
// ───────────────────────────────────────────────────────────────────────────

import type { VitalsNumeric } from "./types";

export type Sex = "M" | "F";
export type BodyType = "slim" | "average" | "heavy" | "athletic" | "frail";

/** Physiologic reserve per organ system, 0..1. High reserve (young, fit) means
 *  the person compensates longer and harder before vitals move, and recovers
 *  faster; low reserve (elderly, cardiac, COPD) means earlier, steeper
 *  decompensation. The physiology projector scales BOTH the magnitude and the
 *  onset speed of every insult by the relevant system's reserve. */
export interface PhysioReserve {
  cardiovascular: number;
  respiratory: number;
  neuro: number;
}

export interface Persona {
  id: string;
  /** Generic casting label - NOT a scenario character name. */
  displayName: string;
  age: number;
  sex: Sex;
  bodyType: BodyType;
  /** The swappable MetaHuman asset id (procured from Fab / MetaHuman Creator). */
  metaHumanId: string;
  /** Casting / appearance note for the 3D pipeline + author. */
  appearance: string;
  comorbidities: string[];
  /** Resting vitals for THIS person (age/comorbidity-adjusted). */
  baseline: VitalsNumeric;
  reserve: PhysioReserve;
}

// A deliberately broad roster: ages across the lifespan, both sexes, a range of
// body types and comorbidity burdens, so an author can recast any scenario and
// get a clinically different run. metaHumanId values are stable slots the Fab /
// MetaHuman procurement fills.
export const PERSONAS: Persona[] = [
  {
    id: "p-athlete-m-24",
    displayName: "Adult M, 20s, healthy/athletic",
    age: 24,
    sex: "M",
    bodyType: "athletic",
    metaHumanId: "mh_adult_m_athletic_01",
    appearance: "Fit young man, resting bradycardia is normal for him.",
    comorbidities: [],
    baseline: { hr: 58, sbp: 118, dbp: 74, rr: 13, spo2: 99, tempC: 36.8, pain: 0 },
    // Very high reserve: compensates late and hard - the dangerous 'looks fine
    // until he crashes' young trauma patient.
    reserve: { cardiovascular: 0.95, respiratory: 0.9, neuro: 0.9 },
  },
  {
    id: "p-adult-f-34",
    displayName: "Adult F, 30s, healthy",
    age: 34,
    sex: "F",
    bodyType: "average",
    metaHumanId: "mh_adult_f_average_01",
    appearance: "Healthy adult woman.",
    comorbidities: [],
    baseline: { hr: 74, sbp: 116, dbp: 76, rr: 14, spo2: 98, tempC: 36.9, pain: 0 },
    reserve: { cardiovascular: 0.8, respiratory: 0.8, neuro: 0.85 },
  },
  {
    id: "p-postpartum-f-29",
    displayName: "Postpartum F, late 20s",
    age: 29,
    sex: "F",
    bodyType: "average",
    metaHumanId: "mh_adult_f_postpartum_01",
    appearance: "Recently delivered; watch for postpartum hemorrhage physiology.",
    comorbidities: ["Postpartum day 0"],
    baseline: { hr: 82, sbp: 112, dbp: 70, rr: 16, spo2: 98, tempC: 37.0, pain: 3 },
    // Young reserve, but a bleeding uterus can outrun it fast.
    reserve: { cardiovascular: 0.85, respiratory: 0.85, neuro: 0.85 },
  },
  {
    id: "p-copd-m-63",
    displayName: "Older adult M, 60s, COPD",
    age: 63,
    sex: "M",
    bodyType: "slim",
    metaHumanId: "mh_older_m_copd_01",
    appearance: "Barrel chest, pursed-lip breathing; chronically low-normal SpO2.",
    comorbidities: ["COPD", "Former smoker"],
    baseline: { hr: 88, sbp: 138, dbp: 84, rr: 20, spo2: 92, tempC: 36.7, pain: 0 },
    // Respiratory reserve is the story: he desaturates early and steeply.
    reserve: { cardiovascular: 0.6, respiratory: 0.3, neuro: 0.7 },
  },
  {
    id: "p-hfref-f-68",
    displayName: "Older adult F, 60s, HFrEF",
    age: 68,
    sex: "F",
    bodyType: "average",
    metaHumanId: "mh_older_f_hf_01",
    appearance: "Mild peripheral edema; the recast of the home-health HF patient.",
    comorbidities: ["Heart failure (EF 35%)", "Type 2 diabetes"],
    baseline: { hr: 84, sbp: 132, dbp: 80, rr: 18, spo2: 94, tempC: 36.8, pain: 0 },
    // Poor cardiovascular reserve - fluid and pressure swings hit hard.
    reserve: { cardiovascular: 0.35, respiratory: 0.5, neuro: 0.7 },
  },
  {
    id: "p-frail-f-82",
    displayName: "Frail elder F, 80s",
    age: 82,
    sex: "F",
    bodyType: "frail",
    metaHumanId: "mh_frail_f_82_01",
    appearance: "Thin, frail; low reserve across the board; blunted fever response.",
    comorbidities: ["Chronic kidney disease", "Atrial fibrillation", "Dementia"],
    baseline: { hr: 78, sbp: 128, dbp: 72, rr: 18, spo2: 94, tempC: 36.4, pain: 1 },
    // Lowest reserve: decompensates first, recovers slowest, LOC drops early.
    reserve: { cardiovascular: 0.3, respiratory: 0.35, neuro: 0.4 },
  },
  {
    id: "p-obese-m-52",
    displayName: "Adult M, 50s, obesity/OSA",
    age: 52,
    sex: "M",
    bodyType: "heavy",
    metaHumanId: "mh_adult_m_heavy_01",
    appearance: "High BMI, obstructive sleep apnea; post-op airway/O2 risk.",
    comorbidities: ["Obesity", "Obstructive sleep apnea", "Hypertension"],
    baseline: { hr: 80, sbp: 146, dbp: 90, rr: 16, spo2: 95, tempC: 36.9, pain: 0 },
    reserve: { cardiovascular: 0.55, respiratory: 0.4, neuro: 0.75 },
  },
  {
    id: "p-diabetic-m-45",
    displayName: "Adult M, 40s, T2DM",
    age: 45,
    sex: "M",
    bodyType: "average",
    metaHumanId: "mh_adult_m_average_01",
    appearance: "Middle-aged man; diabetic - blunted symptoms, infection risk.",
    comorbidities: ["Type 2 diabetes"],
    baseline: { hr: 78, sbp: 130, dbp: 82, rr: 15, spo2: 97, tempC: 36.8, pain: 0 },
    reserve: { cardiovascular: 0.65, respiratory: 0.7, neuro: 0.75 },
  },
  {
    id: "p-teen-f-16",
    displayName: "Adolescent F, teens",
    age: 16,
    sex: "F",
    bodyType: "slim",
    metaHumanId: "mh_adolescent_f_01",
    appearance: "Teenager; asthma history - the pediatric/adolescent slot.",
    comorbidities: ["Asthma"],
    baseline: { hr: 84, sbp: 110, dbp: 68, rr: 16, spo2: 97, tempC: 36.9, pain: 0 },
    reserve: { cardiovascular: 0.85, respiratory: 0.45, neuro: 0.85 },
  },
  {
    id: "p-child-m-7",
    displayName: "Child M, ~7",
    age: 7,
    sex: "M",
    bodyType: "slim",
    metaHumanId: "mh_child_m_01",
    appearance: "School-age child; higher baseline HR/RR is normal.",
    comorbidities: [],
    baseline: { hr: 96, sbp: 100, dbp: 62, rr: 22, spo2: 98, tempC: 37.0, pain: 0 },
    // Kids compensate well then crash suddenly - high reserve, sharp cliff.
    reserve: { cardiovascular: 0.8, respiratory: 0.6, neuro: 0.8 },
  },
  {
    id: "p-postop-f-58",
    displayName: "Adult F, 50s, post-op",
    age: 58,
    sex: "F",
    bodyType: "average",
    metaHumanId: "mh_adult_f_postop_01",
    appearance: "Post-operative; the recast slot for hemorrhage/hypovolemia runs.",
    comorbidities: ["Post-op day 0", "Hypertension"],
    baseline: { hr: 82, sbp: 128, dbp: 80, rr: 16, spo2: 96, tempC: 36.7, pain: 3 },
    reserve: { cardiovascular: 0.55, respiratory: 0.6, neuro: 0.75 },
  },
  {
    id: "p-septic-source-m-71",
    displayName: "Older adult M, 70s, immunocompromised",
    age: 71,
    sex: "M",
    bodyType: "slim",
    metaHumanId: "mh_older_m_71_01",
    appearance: "Elderly, immunocompromised; high sepsis risk, blunted fever.",
    comorbidities: ["Chemotherapy (neutropenic)", "Chronic kidney disease"],
    baseline: { hr: 86, sbp: 124, dbp: 74, rr: 18, spo2: 95, tempC: 36.6, pain: 1 },
    reserve: { cardiovascular: 0.4, respiratory: 0.45, neuro: 0.55 },
  },
];

export const PERSONA_BY_ID = new Map(PERSONAS.map((p) => [p.id, p]));

/** Coarse MetaHuman model hint from a persona, mirroring the manifest's own
 *  age/sex banding so casting stays consistent. */
export function personaModelHint(p: Persona): string {
  const band = p.age < 13 ? "child" : p.age < 18 ? "adolescent" : p.age < 65 ? "adult" : "older_adult";
  return `${band}_${p.sex === "F" ? "female" : "male"}`;
}
