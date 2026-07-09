/**
 * Normal adult reference ranges (conventional US units).
 *
 * Powers (1) the on-screen "Lab values" drawer in the question runner - the
 * same affordance UWorld gives candidates - and (2) lab-identification practice
 * items. These are factual reference data, not third-party content.
 *
 * Teaching reference only; institutional ranges vary by assay.
 */

export interface LabValue {
  name: string;
  low: number | null;
  high: number | null;
  unit: string;
  /** Human-readable range when it isn't a simple low-high (e.g. therapeutic). */
  display?: string;
  note?: string;
}

export interface LabGroup {
  group: string;
  values: LabValue[];
}

export const LAB_GROUPS: LabGroup[] = [
  {
    group: "Electrolytes",
    values: [
      { name: "Sodium (Na⁺)", low: 135, high: 145, unit: "mEq/L" },
      { name: "Potassium (K⁺)", low: 3.5, high: 5.0, unit: "mEq/L", note: "Critical < 2.5 or > 6.5" },
      { name: "Chloride (Cl⁻)", low: 98, high: 106, unit: "mEq/L" },
      { name: "Calcium, total (Ca²⁺)", low: 9.0, high: 10.5, unit: "mg/dL" },
      { name: "Magnesium (Mg²⁺)", low: 1.3, high: 2.1, unit: "mEq/L" },
      { name: "Phosphorus (PO₄)", low: 3.0, high: 4.5, unit: "mg/dL" },
      { name: "Bicarbonate (HCO₃⁻)", low: 22, high: 26, unit: "mEq/L" },
    ],
  },
  {
    group: "Renal & glucose",
    values: [
      { name: "BUN", low: 10, high: 20, unit: "mg/dL" },
      { name: "Creatinine", low: 0.6, high: 1.2, unit: "mg/dL" },
      { name: "Glucose, fasting", low: 70, high: 100, unit: "mg/dL" },
      { name: "Hemoglobin A1C", low: null, high: 5.7, unit: "%", display: "< 5.7% (diabetes target < 7%)" },
    ],
  },
  {
    group: "Hematology",
    values: [
      { name: "WBC", low: 5000, high: 10000, unit: "/µL" },
      { name: "Hemoglobin", low: 12, high: 18, unit: "g/dL", note: "M 14-18 · F 12-16" },
      { name: "Hematocrit", low: 37, high: 52, unit: "%", note: "M 42-52 · F 37-47" },
      { name: "Platelets", low: 150000, high: 400000, unit: "/µL" },
    ],
  },
  {
    group: "Coagulation",
    values: [
      { name: "PT", low: 11, high: 13.5, unit: "sec" },
      { name: "INR", low: 0.8, high: 1.1, unit: "", display: "0.8-1.1 (warfarin target 2-3)" },
      { name: "aPTT", low: 30, high: 40, unit: "sec", note: "Heparin therapeutic 1.5-2.5×" },
    ],
  },
  {
    group: "Arterial blood gas",
    values: [
      { name: "pH", low: 7.35, high: 7.45, unit: "" },
      { name: "PaCO₂", low: 35, high: 45, unit: "mmHg" },
      { name: "HCO₃⁻", low: 22, high: 26, unit: "mEq/L" },
      { name: "PaO₂", low: 80, high: 100, unit: "mmHg" },
      { name: "SaO₂", low: 95, high: 100, unit: "%" },
    ],
  },
  {
    group: "Cardiac & lipids",
    values: [
      { name: "Troponin I", low: null, high: 0.04, unit: "ng/mL", display: "< 0.04 ng/mL" },
      { name: "BNP", low: null, high: 100, unit: "pg/mL", display: "< 100 pg/mL" },
      { name: "Total cholesterol", low: null, high: 200, unit: "mg/dL", display: "< 200 mg/dL" },
      { name: "LDL", low: null, high: 100, unit: "mg/dL", display: "< 100 mg/dL" },
    ],
  },
  {
    group: "Hepatic",
    values: [
      { name: "ALT", low: 7, high: 56, unit: "U/L" },
      { name: "AST", low: 10, high: 40, unit: "U/L" },
      { name: "Albumin", low: 3.5, high: 5.0, unit: "g/dL" },
      { name: "Total bilirubin", low: 0.3, high: 1.0, unit: "mg/dL" },
      { name: "Ammonia", low: 15, high: 45, unit: "µg/dL" },
    ],
  },
  {
    group: "Therapeutic drug levels",
    values: [
      { name: "Digoxin", low: 0.5, high: 2.0, unit: "ng/mL" },
      { name: "Lithium", low: 0.6, high: 1.2, unit: "mEq/L", note: "Toxic > 1.5" },
      { name: "Phenytoin", low: 10, high: 20, unit: "µg/mL" },
    ],
  },
];

/** Flat list, handy for building lab-identification items. */
export const ALL_LABS: LabValue[] = LAB_GROUPS.flatMap((g) => g.values);
