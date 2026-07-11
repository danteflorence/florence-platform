// ───────────────────────────────────────────────────────────────────────────
// Care-setting taxonomy - every unit a real US academic medical center runs,
// plus outpatient and community care. Scenarios tag a careSettingId; the
// library organizes by it, and the Unreal manifest maps each to a 3D
// environment + its typical equipment. This is the "all the units a Cedars /
// UCLA would have, including outpatient and home health" backbone.
// ───────────────────────────────────────────────────────────────────────────

export type CareCategory = "acute_inpatient" | "critical_care" | "procedural" | "womens_childrens" | "outpatient" | "community";

export interface CareSetting {
  id: string;
  label: string;
  category: CareCategory;
  /** Unreal environment asset key (the render loads this set). */
  unrealEnvironmentKey: string;
  /** Equipment/props a scenario in this setting can reference + the render places. */
  typicalEquipment: string[];
  blurb: string;
}

export const CARE_SETTINGS: CareSetting[] = [
  // ── Critical care ─────────────────────────────────────────────────────────
  { id: "micu", label: "Medical ICU (MICU)", category: "critical_care", unrealEnvironmentKey: "env_icu_bay", typicalEquipment: ["ventilator", "multi-parameter monitor", "IV pumps", "central line", "crash cart"], blurb: "Critically ill medical patients; vents, pressors, continuous monitoring." },
  { id: "sicu", label: "Surgical ICU (SICU)", category: "critical_care", unrealEnvironmentKey: "env_icu_bay", typicalEquipment: ["ventilator", "monitor", "IV pumps", "surgical drains", "crash cart"], blurb: "Post-operative critical care; drains, hemodynamics, early mobility." },
  { id: "cvicu", label: "Cardiovascular ICU (CVICU)", category: "critical_care", unrealEnvironmentKey: "env_icu_bay", typicalEquipment: ["monitor", "arterial line", "pacing wires", "IABP", "IV pumps"], blurb: "Post-cardiac-surgery and advanced heart failure; drips titrated to hemodynamics." },
  { id: "ed", label: "Emergency Department", category: "critical_care", unrealEnvironmentKey: "env_ed_trauma_bay", typicalEquipment: ["monitor", "crash cart", "defibrillator", "ultrasound", "trauma stretcher"], blurb: "Undifferentiated acuity; rapid triage, resuscitation, disposition." },

  // ── Acute inpatient ───────────────────────────────────────────────────────
  { id: "med_surg", label: "Medical-Surgical", category: "acute_inpatient", unrealEnvironmentKey: "env_medsurg_room", typicalEquipment: ["monitor (spot)", "IV pump", "call light", "bedside commode"], blurb: "The bread-and-butter floor; deterioration recognition and escalation." },
  { id: "telemetry", label: "Telemetry / Step-down", category: "acute_inpatient", unrealEnvironmentKey: "env_medsurg_room", typicalEquipment: ["continuous telemetry", "monitor", "IV pump", "crash cart nearby"], blurb: "Continuous cardiac monitoring; arrhythmia and post-ICU step-down." },
  { id: "oncology", label: "Oncology", category: "acute_inpatient", unrealEnvironmentKey: "env_medsurg_room", typicalEquipment: ["chemo pump", "central line", "neutropenic precautions cart", "monitor"], blurb: "Chemotherapy, neutropenic fever, oncologic emergencies." },
  { id: "ortho", label: "Orthopedics", category: "acute_inpatient", unrealEnvironmentKey: "env_medsurg_room", typicalEquipment: ["CPM machine", "traction", "IV pump", "SCDs"], blurb: "Post-operative joints and fractures; DVT/PE and neurovascular checks." },
  { id: "neuro", label: "Neuroscience", category: "acute_inpatient", unrealEnvironmentKey: "env_medsurg_room", typicalEquipment: ["monitor", "ICP setup", "neuro checks flowsheet", "IV pump"], blurb: "Stroke, TBI, seizures; frequent neuro assessment and ICP awareness." },
  { id: "behavioral", label: "Behavioral Health", category: "acute_inpatient", unrealEnvironmentKey: "env_behavioral_room", typicalEquipment: ["ligature-safe fixtures", "observation setup"], blurb: "Psychiatric acuity; safety, de-escalation, therapeutic communication." },

  // ── Procedural ────────────────────────────────────────────────────────────
  { id: "or", label: "Operating Room", category: "procedural", unrealEnvironmentKey: "env_operating_room", typicalEquipment: ["anesthesia machine", "OR table", "electrosurgery", "monitor"], blurb: "Perioperative team roles, counts, time-outs, sterile field." },
  { id: "pacu", label: "PACU (Recovery)", category: "procedural", unrealEnvironmentKey: "env_pacu_bay", typicalEquipment: ["monitor", "O2/suction", "warming device", "IV pump"], blurb: "Immediate post-anesthesia; airway, hemodynamics, pain, hand-off." },
  { id: "dialysis", label: "Dialysis Unit", category: "procedural", unrealEnvironmentKey: "env_dialysis_bay", typicalEquipment: ["dialysis machine", "recliner", "monitor", "access supplies"], blurb: "Hemodialysis; fluid/electrolyte shifts, access, hypotension." },

  // ── Women's & children's ──────────────────────────────────────────────────
  { id: "labor_delivery", label: "Labor & Delivery", category: "womens_childrens", unrealEnvironmentKey: "env_ldr_room", typicalEquipment: ["fetal monitor", "delivery table", "warmer", "crash cart"], blurb: "Intrapartum; fetal monitoring, hemorrhage, emergent delivery." },
  { id: "nicu", label: "NICU", category: "womens_childrens", unrealEnvironmentKey: "env_nicu_bay", typicalEquipment: ["isolette", "ventilator (neonatal)", "monitor", "phototherapy"], blurb: "Neonatal critical care; thermoregulation, respiratory support." },
  { id: "picu", label: "PICU", category: "womens_childrens", unrealEnvironmentKey: "env_picu_bay", typicalEquipment: ["ventilator (peds)", "monitor", "weight-based dosing", "crash cart (peds)"], blurb: "Pediatric critical care; weight-based everything, rapid deterioration." },
  { id: "pediatrics", label: "Pediatrics (acute)", category: "womens_childrens", unrealEnvironmentKey: "env_peds_room", typicalEquipment: ["monitor", "IV pump", "weight-based dosing", "family space"], blurb: "General pediatric floor; family-centered care, weight-based dosing." },

  // ── Outpatient ────────────────────────────────────────────────────────────
  { id: "primary_care", label: "Primary Care Clinic", category: "outpatient", unrealEnvironmentKey: "env_clinic_exam_room", typicalEquipment: ["exam table", "vitals station", "point-of-care testing"], blurb: "Ambulatory primary care; screening, chronic disease, triage decisions." },
  { id: "specialty_clinic", label: "Specialty Clinic", category: "outpatient", unrealEnvironmentKey: "env_clinic_exam_room", typicalEquipment: ["exam table", "vitals station", "procedure tray"], blurb: "Cardiology/endocrine/etc. ambulatory follow-up and teaching." },
  { id: "infusion_center", label: "Infusion Center", category: "outpatient", unrealEnvironmentKey: "env_infusion_bay", typicalEquipment: ["infusion chair", "IV pump", "monitor", "reaction kit"], blurb: "Ambulatory infusions; reactions, access, patient education." },
  { id: "ambulatory_surgery", label: "Ambulatory Surgery", category: "outpatient", unrealEnvironmentKey: "env_asc_bay", typicalEquipment: ["monitor", "recovery recliner", "O2/suction"], blurb: "Same-day surgery pre/post; screening, recovery, discharge readiness." },

  // ── Community ─────────────────────────────────────────────────────────────
  { id: "home_health", label: "Home Health", category: "community", unrealEnvironmentKey: "env_home_living_room", typicalEquipment: ["portable vitals kit", "home meds", "phone", "wound supplies"], blurb: "Solo visit in the patient's home; independent judgment, phone escalation." },
  { id: "hospice", label: "Hospice", category: "community", unrealEnvironmentKey: "env_home_bedroom", typicalEquipment: ["comfort kit", "portable vitals", "phone"], blurb: "End-of-life comfort care in the home; symptom management, family support." },
  { id: "snf", label: "Skilled Nursing Facility", category: "community", unrealEnvironmentKey: "env_snf_room", typicalEquipment: ["monitor (spot)", "IV pump", "call light"], blurb: "Sub-acute/rehab; deterioration recognition with fewer on-site resources." },
];

export const CARE_SETTING_BY_ID = new Map(CARE_SETTINGS.map((s) => [s.id, s]));

export const CARE_CATEGORY_LABEL: Record<CareCategory, string> = {
  critical_care: "Critical Care",
  acute_inpatient: "Acute Inpatient",
  procedural: "Procedural",
  womens_childrens: "Women's & Children's",
  outpatient: "Outpatient",
  community: "Community & Home",
};
