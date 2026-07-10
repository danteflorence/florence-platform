// ───────────────────────────────────────────────────────────────────────────
// Clinical model reference - the palette of physiological insults and
// interventions our screen-based virtual-patient scenarios draw from.
//
// PROVENANCE: the parameter model (which insults, their parameters, ranges,
// units, anatomical compartments, and severity scales) is DERIVED FROM the
// BioGears Physiology Engine's action set (Apache License 2.0,
// github.com/BioGearsEngine). We do NOT embed or run the BioGears engine (it
// is native C++). Instead we transcribe its clinically-grounded parameter
// vocabulary into TypeScript and pair each insult with a plain
// "effect signature" - which vitals move and in which direction - so our own
// deterministic deltas-and-ramps engine (src/lib/vpatient/engine.ts) stays
// screen-based and mobile-friendly while speaking the same clinical language a
// full physiology engine would. See NOTICE.md for the Apache-2.0 attribution.
//
// This is a REFERENCE for scenario authors and a future scenario generator,
// not runtime physiology: an author reads "Bacterial Infection, severity
// Moderate → HR up, SBP down, temp up, RR up" and writes the matching phases +
// rules. The vitals a real BioGears run would produce inform the ramp targets.
// ───────────────────────────────────────────────────────────────────────────

import type { NumericVitalKey } from "./types";

/** Direction a parameter pushes a numeric vital as severity increases. */
export type EffectDirection = "up" | "down";

export interface VitalEffect {
  key: NumericVitalKey;
  direction: EffectDirection;
  /** Author-facing note on magnitude/onset at high severity. */
  note?: string;
}

export interface ClinicalParam {
  name: string;
  kind: "severity01" | "severityEnum" | "scale010" | "rate" | "dose" | "concentration" | "enum" | "fraction";
  /** Numeric range [min, max] for numeric kinds. */
  range?: [number, number];
  unit?: string;
  /** Options for enum/severityEnum kinds (ordinal, least→most severe). */
  options?: string[];
  description: string;
}

export type InsultCategory =
  | "hemorrhage"
  | "respiratory"
  | "cardiac"
  | "infection"
  | "neuro"
  | "metabolic"
  | "pain"
  | "environmental";

export interface ClinicalInsult {
  id: string;
  /** BioGears action name this is transcribed from (attribution + traceability). */
  bioGearsAction: string;
  label: string;
  category: InsultCategory;
  params: ClinicalParam[];
  /** How the insult moves vitals - the ramp signature an author encodes. */
  effects: VitalEffect[];
  /** Categorical consequences (LOC, rhythm) at high severity. */
  textEffects?: string[];
  /** NCLEX teaching hook: what the learner must recognize/do. */
  nursingFocus: string;
}

export interface ClinicalIntervention {
  id: string;
  bioGearsAction: string;
  label: string;
  params: ClinicalParam[];
  /** How the intervention moves vitals when correctly applied. */
  effects: VitalEffect[];
  /** Whether an RN needs a provider order first (drives requiresFlag in scenarios). */
  requiresOrder: boolean;
  nursingFocus: string;
}

// ── Insults (things that go wrong) ───────────────────────────────────────────

export const INSULTS: ClinicalInsult[] = [
  {
    id: "hemorrhage",
    bioGearsAction: "Hemorrhage",
    label: "Hemorrhage",
    category: "hemorrhage",
    params: [
      { name: "rate", kind: "rate", range: [0, 500], unit: "mL/min", description: "Bleeding rate." },
      {
        name: "compartment",
        kind: "enum",
        options: ["Aorta", "Vena Cava", "Spleen", "Small Intestine", "Large Intestine", "Left Arm", "Right Arm", "Left Leg", "Right Leg", "Muscle", "Skin"],
        description: "Bleeding site (drives severity of the volume loss).",
      },
    ],
    effects: [
      { key: "sbp", direction: "down", note: "Falls as circulating volume drops; late, precipitous in class III-IV." },
      { key: "dbp", direction: "down" },
      { key: "hr", direction: "up", note: "Compensatory tachycardia is the EARLY sign, before pressure falls." },
      { key: "rr", direction: "up" },
      { key: "spo2", direction: "down", note: "Late - after significant loss." },
    ],
    textEffects: ["LOC → confused then lethargic as perfusion fails", "rhythm → sinus tachycardia, thready"],
    nursingFocus: "Recognize compensated shock (HR up, narrowing pulse pressure) BEFORE hypotension; control bleeding, large-bore access, fluids/blood, escalate.",
  },
  {
    id: "tension_pneumothorax",
    bioGearsAction: "TensionPneumothorax",
    label: "Tension pneumothorax",
    category: "respiratory",
    params: [
      { name: "severity", kind: "severity01", range: [0, 1], description: "Air-leak severity." },
      { name: "side", kind: "enum", options: ["Left", "Right"], description: "Affected side." },
      { name: "type", kind: "enum", options: ["Open", "Closed"], description: "Open (sucking chest wound) vs closed." },
    ],
    effects: [
      { key: "spo2", direction: "down", note: "Rapid desaturation." },
      { key: "rr", direction: "up" },
      { key: "hr", direction: "up" },
      { key: "sbp", direction: "down", note: "Obstructive shock as mediastinum shifts and venous return falls." },
    ],
    textEffects: ["LOC → anxious then obtunded"],
    nursingFocus: "Recognize absent breath sounds + tracheal deviation + hypotension; this is a needle-decompression emergency, not a wait-and-see.",
  },
  {
    id: "asthma_attack",
    bioGearsAction: "AsthmaAttack",
    label: "Acute asthma attack",
    category: "respiratory",
    params: [{ name: "severity", kind: "severity01", range: [0, 1], description: "Bronchoconstriction severity." }],
    effects: [
      { key: "spo2", direction: "down" },
      { key: "rr", direction: "up" },
      { key: "hr", direction: "up", note: "Also driven by beta-agonist rescue meds." },
    ],
    textEffects: ["patient: audible wheeze, tripod positioning, one-word answers when severe"],
    nursingFocus: "Positioning + high-flow O2 + inhaled bronchodilator; a silent chest is deterioration, not improvement.",
  },
  {
    id: "ards",
    bioGearsAction: "AcuteRespiratoryDistress",
    label: "Acute respiratory distress (ARDS)",
    category: "respiratory",
    params: [{ name: "severity", kind: "severity01", range: [0, 1], description: "Diffuse alveolar injury severity." }],
    effects: [
      { key: "spo2", direction: "down", note: "Refractory to supplemental O2 - the tell." },
      { key: "rr", direction: "up" },
      { key: "hr", direction: "up" },
    ],
    nursingFocus: "Hypoxemia that does not correct with O2; escalate for advanced support; monitor work of breathing.",
  },
  {
    id: "airway_obstruction",
    bioGearsAction: "AirwayObstruction",
    label: "Airway obstruction",
    category: "respiratory",
    params: [{ name: "severity", kind: "severity01", range: [0, 1], description: "Degree of obstruction." }],
    effects: [
      { key: "spo2", direction: "down" },
      { key: "rr", direction: "up", note: "Then falls as the patient tires." },
    ],
    textEffects: ["patient: stridor, accessory muscle use"],
    nursingFocus: "Airway is always first - position, suction, escalate; recognize a failing airway before arrest.",
  },
  {
    id: "cardiac_arrest",
    bioGearsAction: "CardiacArrest",
    label: "Cardiac arrest",
    category: "cardiac",
    params: [],
    effects: [
      { key: "sbp", direction: "down", note: "No effective output." },
      { key: "spo2", direction: "down" },
    ],
    textEffects: ["rhythm → asystole / VF / PEA", "LOC → unresponsive"],
    nursingFocus: "Recognize pulselessness/unresponsiveness; call, compress, defibrillate - the ACLS sequence.",
  },
  {
    id: "infection_sepsis",
    bioGearsAction: "Infection",
    label: "Bacterial infection / sepsis",
    category: "infection",
    params: [
      { name: "severity", kind: "severityEnum", options: ["None", "Mild", "Moderate", "Severe"], description: "Infection burden (drives the SIRS/sepsis picture)." },
      { name: "location", kind: "enum", options: ["Gut", "Skin", "Wound", "Lung"], description: "Source." },
      { name: "mic", kind: "concentration", range: [0, 512], unit: "ug/mL", description: "Minimum inhibitory concentration (antibiotic sensitivity)." },
    ],
    effects: [
      { key: "hr", direction: "up", note: "Early SIRS sign." },
      { key: "tempC", direction: "up", note: "Fever/rigors (can be hypothermia when severe)." },
      { key: "rr", direction: "up" },
      { key: "sbp", direction: "down", note: "Distributive shock in severe sepsis; the late, dangerous sign." },
      { key: "spo2", direction: "down", note: "Late." },
    ],
    textEffects: ["LOC → confused as perfusion drops (an organ-dysfunction cue)"],
    nursingFocus: "Recognize sepsis early (fever + tachycardia + source); Surviving Sepsis hour-1 bundle: lactate, cultures BEFORE antibiotics, broad-spectrum antibiotics, 30 mL/kg crystalloid for hypotension.",
  },
  {
    id: "tbi",
    bioGearsAction: "TraumaticBrainInjury",
    label: "Traumatic brain injury",
    category: "neuro",
    params: [{ name: "severity", kind: "severity01", range: [0, 1], description: "Injury severity." }],
    effects: [
      { key: "sbp", direction: "up", note: "Cushing response: hypertension WITH bradycardia = rising ICP." },
      { key: "hr", direction: "down", note: "Cushing triad." },
      { key: "rr", direction: "down", note: "Irregular; the third of the Cushing triad." },
    ],
    textEffects: ["LOC → declining (falling GCS)", "pupils unequal at high severity"],
    nursingFocus: "Cushing triad (hypertension, bradycardia, irregular respirations) = rising ICP emergency; protect airway, elevate HOB, escalate immediately.",
  },
  {
    id: "burn",
    bioGearsAction: "BurnWound",
    label: "Burn injury",
    category: "environmental",
    params: [{ name: "tbsa", kind: "fraction", range: [0, 1], description: "Total body surface area burned (fraction)." }],
    effects: [
      { key: "hr", direction: "up", note: "Burn shock: massive fluid shifts." },
      { key: "sbp", direction: "down", note: "Hypovolemia from capillary leak." },
    ],
    nursingFocus: "Airway first (inhalation injury), then fluid resuscitation by TBSA (Parkland); watch for compartment syndrome.",
  },
  {
    id: "pain",
    bioGearsAction: "PainStimulus",
    label: "Acute pain",
    category: "pain",
    params: [
      { name: "intensity", kind: "scale010", range: [0, 10], description: "Pain intensity, 0-10 self-report." },
      { name: "location", kind: "enum", options: ["Abdomen", "Chest", "Head", "Left Arm", "Right Arm", "Left Leg", "Right Leg"], description: "Pain site." },
    ],
    effects: [
      { key: "hr", direction: "up" },
      { key: "sbp", direction: "up" },
      { key: "rr", direction: "up" },
      { key: "pain", direction: "up" },
    ],
    nursingFocus: "Assess pain as the fifth vital sign; distinguish expected post-op pain from a new deteriorating picture (e.g. chest pain, rigid abdomen).",
  },
];

// ── Interventions (what the nurse does) ──────────────────────────────────────

export const INTERVENTIONS: ClinicalIntervention[] = [
  {
    id: "drug_administration",
    bioGearsAction: "DrugAdministration",
    label: "Administer a drug",
    params: [
      { name: "route", kind: "enum", options: ["IV Bolus", "IV Infusion", "Oral", "Transmucosal", "Intramuscular"], description: "Administration route." },
      { name: "dose", kind: "dose", range: [0, 1000], unit: "mL or ug", description: "Dose." },
      { name: "concentration", kind: "concentration", range: [0, 10000], unit: "ug/mL", description: "Concentration (for volume-based routes)." },
      { name: "rate", kind: "rate", range: [0, 1000], unit: "mL/min", description: "Infusion rate." },
    ],
    effects: [],
    requiresOrder: true,
    nursingFocus: "Five rights; the RN needs a provider order (or protocol); route + concentration matter clinically.",
  },
  {
    id: "fluid_resuscitation",
    bioGearsAction: "CompoundInfusion",
    label: "IV fluid / crystalloid bolus",
    params: [
      { name: "rate", kind: "rate", range: [0, 1000], unit: "mL/min", description: "Infusion rate." },
      { name: "volume", kind: "dose", range: [0, 3000], unit: "mL", description: "Total volume (e.g. 30 mL/kg for sepsis)." },
    ],
    effects: [
      { key: "sbp", direction: "up", note: "Restores preload in hypovolemic/distributive shock." },
      { key: "dbp", direction: "up" },
      { key: "hr", direction: "down", note: "Tachycardia settles as perfusion improves." },
    ],
    requiresOrder: true,
    nursingFocus: "Reverses hypovolemic/distributive hypotension; reassess after the bolus - fluid responsiveness is the evaluation step.",
  },
  {
    id: "transfusion",
    bioGearsAction: "Transfusion",
    label: "Blood transfusion",
    params: [
      { name: "product", kind: "enum", options: ["Packed RBC", "Whole Blood", "Fresh Frozen Plasma", "Platelets"], description: "Blood product." },
      { name: "volume", kind: "dose", range: [0, 1000], unit: "mL", description: "Volume." },
    ],
    effects: [
      { key: "sbp", direction: "up" },
      { key: "hr", direction: "down" },
      { key: "spo2", direction: "up", note: "Restores oxygen-carrying capacity." },
    ],
    requiresOrder: true,
    nursingFocus: "Type/crossmatch + two-nurse verification; monitor for transfusion reactions in the first 15 minutes.",
  },
  {
    id: "needle_decompression",
    bioGearsAction: "NeedleDecompression",
    label: "Needle decompression",
    params: [{ name: "side", kind: "enum", options: ["Left", "Right"], description: "Affected side." }],
    effects: [
      { key: "spo2", direction: "up", note: "Rapid recovery when it relieves a tension pneumothorax." },
      { key: "sbp", direction: "up" },
      { key: "hr", direction: "down" },
    ],
    requiresOrder: true,
    nursingFocus: "Emergency relief of tension pneumothorax; recognize the indication and the anatomical landmark.",
  },
  {
    id: "tourniquet",
    bioGearsAction: "Tourniquet",
    label: "Apply a tourniquet",
    params: [
      { name: "limb", kind: "enum", options: ["Left Arm", "Right Arm", "Left Leg", "Right Leg"], description: "Limb." },
      { name: "application", kind: "enum", options: ["Applied", "Misapplied"], description: "Correct vs incomplete application." },
    ],
    effects: [{ key: "sbp", direction: "up", note: "Only when correctly applied to a bleeding limb." }],
    requiresOrder: false,
    nursingFocus: "Extremity hemorrhage control; a misapplied tourniquet fails to stop arterial flow - technique matters.",
  },
  {
    id: "supplemental_oxygen",
    bioGearsAction: "AnesthesiaMachine/Inhaler",
    label: "Supplemental oxygen",
    params: [{ name: "flow", kind: "rate", range: [0, 15], unit: "L/min", description: "O2 flow rate." }],
    effects: [{ key: "spo2", direction: "up", note: "Corrects hypoxemia EXCEPT in shunt physiology (ARDS) - a diagnostic clue." }],
    requiresOrder: false,
    nursingFocus: "First-line for hypoxemia; failure to correct with O2 points to shunt (ARDS, large PE) and escalation.",
  },
];

/** Look up an insult/intervention by id (author + generator convenience). */
export const INSULT_BY_ID = new Map(INSULTS.map((i) => [i.id, i]));
export const INTERVENTION_BY_ID = new Map(INTERVENTIONS.map((i) => [i.id, i]));
