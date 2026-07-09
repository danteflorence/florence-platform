// ───────────────────────────────────────────────────────────────────────────
// NGN unfolding case - six items, full Clinical Judgment Measurement Model.
// 62-year-old man, substernal chest pain while shoveling snow → inferior STEMI.
// Each item is a discriminated union the NgnCase component renders + scores.
// ───────────────────────────────────────────────────────────────────────────

export type CjmmStep =
  | "Recognize Cues"
  | "Analyze Cues"
  | "Prioritize Hypotheses"
  | "Generate Solutions"
  | "Take Action"
  | "Evaluate Outcomes";

interface BaseItem {
  id: string;
  index: number; // 1..6
  type: "highlight" | "matrix" | "dropdown" | "bowtie" | "extended" | "trend";
  step: CjmmStep;
  title: string;
  prompt: string;
  rationale: string;
}

export interface HighlightItem extends BaseItem {
  type: "highlight";
  /** intro line shown before the selectable note */
  noteLead: string;
  findings: { id: string; text: string; critical: boolean }[];
}

export interface MatrixItem extends BaseItem {
  type: "matrix";
  columns: string[]; // e.g. ["Consistent with MI", "Consistent with PE", "Either / both"]
  rows: { id: string; finding: string; answer: number }[]; // answer = column index
}

export interface DropdownItem extends BaseItem {
  type: "dropdown";
  /** sentence split into text + blanks, in order */
  template: string; // use {{0}} and {{1}} as blank placeholders
  blanks: { options: string[]; answer: number }[];
}

export interface BowtieItem extends BaseItem {
  type: "bowtie";
  center: string;
  actions: { options: { id: string; text: string; correct: boolean }[]; pick: number };
  monitors: { options: { id: string; text: string; correct: boolean }[]; pick: number };
}

export interface ExtendedItem extends BaseItem {
  type: "extended";
  options: { id: string; text: string; correct: boolean; note?: string }[];
}

export interface TrendRow {
  time: string;
  bp: string;
  hr: number;
  troponin: number;
}
export interface TrendItem extends BaseItem {
  type: "trend";
  data: TrendRow[];
  classifications: {
    id: string;
    parameter: string;
    options: string[];
    answer: number;
  }[];
}

export type NgnItem =
  | HighlightItem
  | MatrixItem
  | DropdownItem
  | BowtieItem
  | ExtendedItem
  | TrendItem;

export const NGN_BACKGROUND =
  "A 62-year-old man arrives in the ED at 0900. Chief complaint: chest pain that began 90 minutes ago while shoveling snow. History: hypertension on lisinopril, hyperlipidemia on atorvastatin, 30-year smoker, no prior cardiac history. Family history: father died of MI at age 58.";

export const NGN_ITEMS: NgnItem[] = [
  {
    id: "ngn1",
    index: 1,
    type: "highlight",
    step: "Recognize Cues",
    title: "Highlight the findings that require immediate follow-up",
    prompt:
      "Select every finding in the nurse's initial assessment note that requires immediate follow-up.",
    noteLead: "Initial nurse's note -",
    findings: [
      { id: "f1", text: "Substernal chest pain rated 8/10", critical: true },
      { id: "f2", text: "radiates to left jaw and arm", critical: true },
      { id: "f3", text: "diaphoretic", critical: true },
      { id: "f4", text: "mildly short of breath", critical: true },
      { id: "f5", text: "BP 156/92", critical: false },
      { id: "f6", text: "HR 102, irregular", critical: true },
      { id: "f7", text: "RR 22", critical: false },
      { id: "f8", text: "SpO₂ 96% on room air", critical: false },
      { id: "f9", text: "reports nausea", critical: true },
      { id: "f10", text: "skin cool and clammy", critical: true },
      { id: "f11", text: "lung sounds clear bilaterally", critical: false },
      { id: "f12", text: "no peripheral edema", critical: false },
    ],
    rationale:
      "The cardinal cues are the chest-pain pattern plus the autonomic features: chest pain 8/10, radiation to jaw and arm, diaphoresis, shortness of breath, cool/clammy skin, nausea, and an irregular HR of 102 (possible AF or PVCs). Together they form an MI pattern. The clear lungs and SpO₂ 96% are reassuring; BP 156/92 is elevated but not yet emergent - monitor, don't prioritize.",
  },
  {
    id: "ngn2",
    index: 2,
    type: "matrix",
    step: "Analyze Cues",
    title: "Classify each finding",
    prompt:
      "For each finding, classify it as more consistent with MI, more consistent with pulmonary embolism (PE), or consistent with either.",
    columns: ["Consistent with MI", "Consistent with PE", "Either / both"],
    rows: [
      { id: "m1", finding: "Sudden onset chest pain", answer: 2 },
      { id: "m2", finding: "Diaphoresis", answer: 2 },
      { id: "m3", finding: "Hypoxia", answer: 2 },
      { id: "m4", finding: "Hemoptysis", answer: 1 },
      { id: "m5", finding: "ST elevation", answer: 0 },
      { id: "m6", finding: "Tachycardia", answer: 2 },
    ],
    rationale:
      "Hemoptysis is PE-specific; ST elevation is MI-specific. Chest pain, diaphoresis, hypoxia, and tachycardia can occur in either (hypoxia is typically more prominent in PE). This patient's cluster - chest pain with radiation, diaphoresis, autonomic features, ECG changes, and no hemoptysis - points to MI, not PE.",
  },
  {
    id: "ngn3",
    index: 3,
    type: "dropdown",
    step: "Prioritize Hypotheses",
    title: "Complete the priority statement",
    prompt: "Select the option that best completes each blank.",
    template:
      "The client's priority problem is {{0}} because the ECG shows {{1}}.",
    blanks: [
      {
        options: [
          "acute myocardial infarction",
          "pulmonary embolism",
          "panic attack",
          "aortic dissection",
        ],
        answer: 0,
      },
      {
        options: [
          "ST elevation in leads II, III, aVF",
          "sinus tachycardia",
          "T-wave inversion in V1",
          "ST elevation in V1 through V4",
        ],
        answer: 0,
      },
    ],
    rationale:
      "The priority problem is acute myocardial infarction. For this patient the ECG shows ST elevation in II, III, and aVF - an inferior MI. (ST elevation in V1-V4 would indicate an anterior MI; this case is inferior, which is why right-ventricular involvement and the nitroglycerin contraindication matter downstream.)",
  },
  {
    id: "ngn4",
    index: 4,
    type: "bowtie",
    step: "Take Action",
    title: "Build the bowtie",
    prompt:
      "Center is the priority condition. Choose the two priority actions and the two parameters to monitor.",
    center: "Acute inferior STEMI",
    actions: {
      pick: 2,
      options: [
        { id: "a1", text: "Administer aspirin 325 mg chewable", correct: true },
        { id: "a2", text: "Activate the cath lab (door-to-balloon <90 min)", correct: true },
        { id: "a3", text: "Administer sublingual nitroglycerin", correct: false },
        { id: "a4", text: "Administer IV furosemide", correct: false },
        { id: "a5", text: "Lay the patient flat and elevate both legs", correct: false },
      ],
    },
    monitors: {
      pick: 2,
      options: [
        { id: "p1", text: "Cardiac rhythm, continuously", correct: true },
        { id: "p2", text: "Blood pressure", correct: true },
        { id: "p3", text: "Daily weight", correct: false },
        { id: "p4", text: "Urine ketones", correct: false },
        { id: "p5", text: "Deep tendon reflexes", correct: false },
      ],
    },
    rationale:
      "Priority actions: aspirin 325 mg chewable and cath-lab activation for primary PCI. Monitor cardiac rhythm continuously and blood pressure. Note the trap - nitroglycerin is contraindicated in this inferior MI with likely RV involvement, so it is NOT a priority action.",
  },
  {
    id: "ngn5",
    index: 5,
    type: "extended",
    step: "Generate Solutions",
    title: "Select all appropriate medications",
    prompt: "From the list of eight, select every medication appropriate for this patient now.",
    options: [
      { id: "e1", text: "Aspirin", correct: true },
      { id: "e2", text: "Nitroglycerin sublingual", correct: false, note: "Contraindicated - likely inferior MI with RV involvement and borderline BP." },
      { id: "e3", text: "Morphine", correct: true, note: "Appropriate for refractory pain." },
      { id: "e4", text: "Ticagrelor", correct: true, note: "P2Y12 inhibitor for dual antiplatelet therapy." },
      { id: "e5", text: "Atorvastatin", correct: true, note: "High-intensity statin." },
      { id: "e6", text: "Metoprolol IV", correct: false, note: "Conditional - appropriate in selected patients, but caution with bradycardia or hypotension. Not a 'select-all' answer here." },
      { id: "e7", text: "Furosemide", correct: false, note: "Not indicated - no signs of heart failure." },
      { id: "e8", text: "Heparin", correct: true, note: "Anticoagulation in ACS." },
    ],
    rationale:
      "Appropriate: aspirin, ticagrelor, atorvastatin, heparin, and morphine (refractory pain). Metoprolol IV is conditional, not a default select. Nitroglycerin is contraindicated given the likely inferior/RV MI and borderline BP. Furosemide is not indicated - there are no signs of heart failure.",
  },
  {
    id: "ngn6",
    index: 6,
    type: "trend",
    step: "Evaluate Outcomes",
    title: "Evaluate the trend",
    prompt:
      "Vital signs and troponin at four time points. Classify each parameter.",
    data: [
      { time: "0900", bp: "156/92", hr: 102, troponin: 0.08 },
      { time: "1000", bp: "138/82", hr: 88, troponin: 2.4 },
      { time: "1200", bp: "124/76", hr: 76, troponin: 12.6 },
      { time: "1500", bp: "120/72", hr: 72, troponin: 8.4 },
    ],
    classifications: [
      {
        id: "c_bp",
        parameter: "Blood pressure",
        options: ["Improving", "Worsening", "Stable / unchanged"],
        answer: 0,
      },
      {
        id: "c_hr",
        parameter: "Heart rate",
        options: ["Improving", "Worsening", "Stable / unchanged"],
        answer: 0,
      },
      {
        id: "c_trop",
        parameter: "Troponin",
        options: [
          "Steadily worsening - treatment failing",
          "Expected rise-then-fall after successful reperfusion",
          "Stable / unchanged",
        ],
        answer: 1,
      },
    ],
    rationale:
      "Blood pressure and heart rate are improving toward normal. Troponin rises after the infarct, peaks at 12.6 (1200), then declines to 8.4 (1500) - the natural troponin curve after successful reperfusion, not a sign of deterioration. The overall pattern is consistent with successful PCI and hemodynamic recovery.",
  },
];
