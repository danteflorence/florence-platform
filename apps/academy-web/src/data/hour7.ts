// ───────────────────────────────────────────────────────────────────────────
// Hour 7 - Cardiac.  Structured, typed content derived from the Florence
// Academy NCLEX-RN bootcamp instructor script (Hour 7).  This is the single
// source of truth the reader page renders; clinical substance is preserved
// faithfully from the source material.
// ───────────────────────────────────────────────────────────────────────────

import type {
  Lesson,
  PracticeItem,
  RhythmCard,
  Segment,
  TimingRow,
} from "./lessonTypes";

// Re-export the shared lesson types so existing importers of `../data/hour7`
// (SlideView, PracticeItem, RhythmDrill, deck) keep working unchanged.
export type {
  CalloutTone,
  ContentBlock,
  PracticeOption,
  PracticeItem,
  RhythmCard,
  Segment,
  TimingRow,
} from "./lessonTypes";

export const HOUR_META = {
  number: 7,
  title: "Cardiac",
  durationMin: 60,
  audience: "Internationally educated nurses - Philippines, UK, Kenya, Ghana",
  contentWeight: "~12-15% of the NCLEX - the single largest content category",
  tagline:
    "The first integrated clinical section: drugs, labs, and a priority framework converge on one patient.",
};

export const OBJECTIVES: string[] = [
  "Recognize myocardial infarction (typical and atypical), interpret ECG and troponin findings, and apply the time-critical management framework.",
  "Differentiate left- from right-sided heart failure, identify the four core HFrEF medications, and apply LMNOP to acute decompensation.",
  "Identify atrial fibrillation, VT, VF, asystole, and the three degrees of heart block on a rhythm strip and apply the correct ACLS sequence.",
  "Distinguish hypertensive urgency from emergency and apply the 25%-in-the-first-hour blood-pressure reduction principle.",
  "Recognize the four classic valvular lesions and the nitroglycerin contraindication in severe aortic stenosis.",
  "Apply pacemaker and ICD discharge teaching, including activity restrictions and MRI considerations.",
  "Walk a six-item NGN unfolding case through all six steps of the Clinical Judgment Measurement Model.",
];

export const TIMING: TimingRow[] = [
  { minutes: "0-3", segment: "Recap & frame: drugs + labs converge in cardiac", format: "Lecture" },
  { minutes: "3-15", segment: "Myocardial infarction - recognition & management", format: "Lecture + item" },
  { minutes: "15-25", segment: "Heart failure - L vs R, HFrEF/HFpEF, LMNOP", format: "Lecture + item" },
  { minutes: "25-35", segment: "Arrhythmias & ACLS rhythms", format: "Lecture + drill" },
  { minutes: "35-40", segment: "Hypertensive crisis - urgency vs emergency", format: "Lecture" },
  { minutes: "40-45", segment: "Valvular disease - stenosis vs regurgitation", format: "Lecture + item" },
  { minutes: "45-50", segment: "Pacemakers & ICDs - teaching", format: "Lecture" },
  { minutes: "50-57", segment: "NGN unfolding case study - six items, full CJMM", format: "Case" },
  { minutes: "57-60", segment: "Close & homework", format: "Lecture" },
];

export const PRACTICE_ITEMS: Record<string, PracticeItem> = {
  pi_mi: {
    id: "pi_mi",
    stem: "A 58-year-old client with a history of inferior MI arrives in the ED reporting recurrent substernal chest pain rated 9/10 that began 30 minutes ago. The ECG shows ST elevation in leads II, III, and aVF. The blood pressure is 92/58, heart rate 56. The provider orders sublingual nitroglycerin. What is the nurse's priority action?",
    options: [
      { key: "A", text: "Administer the nitroglycerin as ordered." },
      { key: "B", text: "Hold the nitroglycerin and contact the provider." },
      { key: "C", text: "Administer aspirin 325 mg chewable." },
      { key: "D", text: "Establish IV access and prepare for transport." },
    ],
    answer: "B",
    rationale:
      "Inferior MI (II, III, aVF) carries a high likelihood of right-ventricular involvement, which is preload-dependent. Nitroglycerin reduces preload and can cause profound hypotension and cardiovascular collapse - and the BP of 92/58 is already borderline. Hold the nitro and contact the provider (likely a fluid bolus to support preload instead). C and D are appropriate actions but not the priority: the immediate question is whether to give a contraindicated medication.",
    cjmm: "take-actions",
    reference: "Section 7 · Myocardial infarction",
  },
  pi_hf: {
    id: "pi_hf",
    stem: "A client with heart failure is being discharged. Which statement by the client indicates a need for further teaching?",
    options: [
      { key: "A", text: '"I will weigh myself every morning before breakfast."' },
      { key: "B", text: '"I will call my doctor if I gain more than 2 pounds in one day."' },
      { key: "C", text: '"I will limit my salt and drink less water."' },
      { key: "D", text: '"I can stop my carvedilol once I feel better."' },
    ],
    answer: "D",
    rationale:
      "Beta blockers are never stopped abruptly - the rebound effect can be dangerous, and in a HF patient rebound sympathetic activity can trigger decompensation. A, B, and C all reflect correct teaching. 'Which statement indicates a need for further teaching' is asking which statement is WRONG - read these stems carefully.",
    cjmm: "evaluate-outcomes",
    reference: "Section 7 · Heart failure",
  },
  pi_valve: {
    id: "pi_valve",
    stem: "A client with severe aortic stenosis presents to the ED with substernal chest pain. The provider orders sublingual nitroglycerin 0.4 mg. What is the nurse's priority action?",
    options: [
      { key: "A", text: "Administer the nitroglycerin as ordered." },
      { key: "B", text: "Hold the medication and contact the provider." },
      { key: "C", text: "Administer aspirin 325 mg first." },
      { key: "D", text: "Establish IV access and prepare for cardiac catheterization." },
    ],
    answer: "B",
    rationale:
      "Severe AS plus nitroglycerin equals potential cardiovascular collapse. These patients are preload-dependent: their fixed, narrow valve needs adequate filling pressure to maintain cardiac output, and preload reduction is dangerous. Hold and clarify. C and D are appropriate but not the priority - the immediate question is whether to give the contraindicated medication.",
    cjmm: "take-actions",
    reference: "Section 7 · Valvular disease",
  },
};

export const RHYTHMS: RhythmCard[] = [
  {
    name: "Sinus bradycardia",
    group: "Sinus",
    recognition: "HR <60, normal P-QRS-T morphology.",
    action:
      "Treat only if symptomatic (hypotension, syncope, AMS): atropine 1 mg IV q3-5 min up to 3 mg; then transcutaneous pacing; then epinephrine or dopamine infusion.",
    shockable: "no",
  },
  {
    name: "Sinus tachycardia",
    group: "Sinus",
    recognition: "HR >100, normal morphology.",
    action: "Treat the underlying cause - pain, fever, dehydration, hypoxia, anemia, hemorrhage. Rate is not the target.",
    shockable: "no",
  },
  {
    name: "Atrial fibrillation",
    group: "Atrial",
    recognition: "Irregularly irregular, no discernible P waves.",
    action:
      "Rate control (beta blocker, diltiazem/verapamil, digoxin); rhythm control if symptomatic (amiodarone, cardioversion); anticoagulate by CHA₂DS₂-VASc (≥2 men / ≥3 women).",
    shockable: "no",
  },
  {
    name: "Atrial flutter",
    group: "Atrial",
    recognition: "Sawtooth flutter waves, often regular ventricular response.",
    action: "Managed like AF; often easier to cardiovert.",
    shockable: "no",
  },
  {
    name: "Supraventricular tachycardia (SVT)",
    group: "Atrial",
    recognition: "Narrow-complex, regular, 150-250 bpm, no visible P waves.",
    action:
      "Stable: vagal maneuvers → adenosine 6 mg rapid IV push (then 12 mg) - expect brief asystole, warn the patient. Unstable: synchronized cardioversion. (See the live monitor below.)",
    shockable: "no",
  },
  {
    name: "Ventricular tachycardia (VT)",
    group: "Ventricular",
    recognition: "Wide-complex tachycardia. Context decides the action.",
    action:
      "Stable + pulse: amiodarone 150 mg IV over 10 min. Unstable + pulse: synchronized cardioversion. Pulseless: defibrillate, CPR, epinephrine, antiarrhythmic.",
    shockable: "yes",
  },
  {
    name: "Ventricular fibrillation (VF)",
    group: "Ventricular",
    recognition: "Chaotic, no organized complexes, no pulse.",
    action: "Immediate defibrillation. CPR between shocks. Epinephrine q3-5 min. Amiodarone 300 mg IV after the second shock.",
    shockable: "yes",
  },
  {
    name: "Asystole",
    group: "Arrest",
    recognition: "Flat line; confirm in two leads.",
    action: "NOT shockable. CPR. Epinephrine q3-5 min. Treat reversible causes (H's & T's).",
    shockable: "no",
  },
  {
    name: "Pulseless electrical activity (PEA)",
    group: "Arrest",
    recognition: "Organized rhythm on the monitor, no palpable pulse.",
    action: "NOT shockable. CPR. Epinephrine. Treat reversible causes (H's & T's).",
    shockable: "no",
  },
  {
    name: "First-degree AV block",
    group: "Block",
    recognition: "PR >0.20 s, every P conducts.",
    action: "Usually asymptomatic - observe.",
    shockable: "n/a",
  },
  {
    name: "Second-degree, Mobitz I (Wenckebach)",
    group: "Block",
    recognition: "Progressive PR lengthening until a beat drops, then resets.",
    action: "Often benign; frequently responds to atropine.",
    shockable: "n/a",
  },
  {
    name: "Second-degree, Mobitz II",
    group: "Block",
    recognition: "Constant PR, occasional dropped beats without warning.",
    action: "Higher risk of progression to complete block - pacemaker often indicated.",
    shockable: "n/a",
  },
  {
    name: "Third-degree (complete) AV block",
    group: "Block",
    recognition: "Complete AV dissociation; atria (~70-80) and ventricles (~30-40) beat independently.",
    action: "Requires pacemaker - temporary, then permanent.",
    shockable: "n/a",
  },
];

export const SEGMENTS: Segment[] = [
  {
    id: "frame",
    minutes: "0-3",
    title: "Frame the convergence",
    format: "Lecture",
    blocks: [
      {
        kind: "p",
        text: "We are now in the clinical sections, and we start with cardiac - the single largest content category on the NCLEX, roughly 12 to 15 percent of items. Investment here pays disproportionately.",
      },
      {
        kind: "p",
        text: "This is the first section where everything we built converges: beta blockers, ACE inhibitors, anticoagulants, and statins from Section 3; magnesium from Section 5; troponin, BNP, INR, aPTT, and ABG interpretation from Section 6; ABC, Maslow, and safety from Section 2.",
      },
      {
        kind: "callout",
        tone: "key",
        title: "The job this hour",
        text: "You are not here to learn new drugs - the drugs are known. Your job is to integrate them into a clinical priority framework on a single patient.",
      },
    ],
    widget: "heart",
  },
  {
    id: "mi",
    minutes: "3-15",
    title: "Myocardial infarction",
    format: "Lecture + item",
    blocks: [
      { kind: "h", text: "Two types" },
      {
        kind: "list",
        items: [
          "STEMI - ST-segment elevation, complete coronary occlusion. The most time-critical cardiac emergency.",
          "NSTEMI - partial occlusion, no ST elevation but troponin positive. Still serious, slightly less acute.",
        ],
      },
      { kind: "h", text: "Classic presentation" },
      {
        kind: "list",
        items: [
          "Crushing substernal chest pain radiating to the left arm, jaw, or back.",
          "Diaphoresis (cold, drenching), dyspnea, nausea, a sense of impending doom.",
          "Pain lasts more than 20 minutes and is not relieved by rest or nitroglycerin.",
        ],
      },
      {
        kind: "callout",
        tone: "warn",
        title: "Atypical presentations - heavily tested",
        text: "Women: fatigue (often the most common symptom), back pain, jaw pain, indigestion-like discomfort, frequently no chest pain. Elderly: silent MI - confusion, a fall, or new heart failure. Diabetics: autonomic neuropathy blunts pain perception. Consider MI even when the picture is not classic.",
      },
      { kind: "h", text: "Diagnosis" },
      {
        kind: "list",
        items: [
          "12-lead ECG within 10 minutes of arrival.",
          "Serial troponins - rise 3-12 h, peak 24-48 h, stay elevated 5-14 days. A negative troponin at 1 hour does NOT rule out MI.",
        ],
      },
      { kind: "h", text: "ECG territory mapping" },
      {
        kind: "list",
        items: [
          "II, III, aVF = inferior",
          "V1-V2 = septal",
          "V3-V4 = anterior",
          "V5-V6, I, aVL = lateral",
        ],
      },
      {
        kind: "callout",
        tone: "key",
        title: "Highest-yield fact in cardiac",
        text: "Inferior MI (II, III, aVF) is often associated with right-ventricular involvement, which is preload-dependent - so nitroglycerin is contraindicated. Memorize the lead-to-territory map and this consequence.",
      },
      { kind: "h", text: "Initial management - MONA, modified by current evidence" },
      {
        kind: "list",
        items: [
          "Aspirin - chewed, 162-325 mg. Fastest absorption; the single most important early medication (reduces mortality).",
          "Nitroglycerin - sublingual q5min ×3. Hold if SBP <90, RV MI, or recent PDE5 inhibitor (sildenafil).",
          "Morphine - refractory pain only; may slow oral antiplatelet absorption and worsen outcomes, so used cautiously.",
          "Oxygen - ONLY if SaO₂ <90%. Routine oxygen in normoxic patients is no longer recommended and may be harmful.",
        ],
      },
      { kind: "h", text: "Time-critical reperfusion" },
      {
        kind: "list",
        items: [
          "STEMI: primary PCI, door-to-balloon <90 minutes (preferred when available).",
          "If PCI is not available within 120 minutes: thrombolytics (alteplase, tenecteplase), door-to-needle <30 minutes.",
        ],
      },
      {
        kind: "callout",
        tone: "warn",
        title: "Thrombolytic contraindications (memorize)",
        text: "Active bleeding · recent stroke (especially hemorrhagic) · recent major surgery · severe uncontrolled hypertension · known intracranial pathology · suspected aortic dissection.",
      },
      { kind: "h", text: "Post-MI discharge - the five pillars" },
      {
        kind: "list",
        items: [
          "Aspirin (lifelong) + a P2Y12 inhibitor (clopidogrel, ticagrelor, prasugrel) - dual antiplatelet therapy ≥12 months.",
          "Beta blocker (post-MI mortality benefit).",
          "ACE inhibitor or ARB.",
          "High-intensity statin.",
          "Nitroglycerin sublingual PRN.",
        ],
      },
      {
        kind: "callout",
        tone: "info",
        title: "Discharge teaching",
        text: "Cardiac rehab. Recognize warning signs (chest pain not relieved by rest or one nitro dose, dyspnea, syncope). Never stop the beta blocker abruptly. Sexual activity is generally safe after 1-2 weeks if the patient can climb two flights of stairs without symptoms. Smoking cessation; Mediterranean/DASH diet; weight management.",
      },
    ],
    practiceItemId: "pi_mi",
  },
  {
    id: "hf",
    minutes: "15-25",
    title: "Heart failure",
    format: "Lecture + item",
    blocks: [
      {
        kind: "callout",
        tone: "key",
        title: "The mental shortcut",
        text: "Left = Lungs (pulmonary congestion). Right = Rest of the body (systemic venous congestion). The backup happens in different places, so the symptoms differ.",
      },
      { kind: "h", text: "Left-sided failure → pulmonary congestion" },
      {
        kind: "list",
        items: [
          "Dyspnea, orthopnea (sleeps on multiple pillows), paroxysmal nocturnal dyspnea.",
          "Crackles, S3 gallop, pink frothy sputum (pulmonary edema), dry cough.",
        ],
      },
      { kind: "h", text: "Right-sided failure → systemic venous congestion" },
      {
        kind: "list",
        items: [
          "Jugular venous distension, peripheral/dependent edema.",
          "Hepatomegaly, ascites, weight gain.",
        ],
      },
      {
        kind: "p",
        text: "Most patients eventually have biventricular failure - left ventricular failure raises pulmonary pressures, which strain and eventually fail the right heart.",
      },
      { kind: "h", text: "Two types by ejection fraction" },
      {
        kind: "list",
        items: [
          "HFrEF - reduced EF (<40%). Systolic failure; the ventricle is weak.",
          "HFpEF - preserved EF (≥50%). Diastolic failure; the ventricle is stiff.",
        ],
      },
      { kind: "h", text: "The four pillars of HFrEF therapy" },
      {
        kind: "list",
        items: [
          "1. ARNI (sacubitril-valsartan) - or ACE inhibitor / ARB.",
          "2. Beta blocker - carvedilol, metoprolol succinate, or bisoprolol (specific agents only).",
          "3. Aldosterone antagonist - spironolactone or eplerenone (watch hyperkalemia, especially with ACE/ARB).",
          "4. SGLT2 inhibitor - dapagliflozin or empagliflozin (now first-line regardless of diabetes status).",
          "Loop diuretic (furosemide) added for symptom control - a symptom agent, not a mortality pillar.",
        ],
      },
      { kind: "h", text: "Acute decompensation - LMNOP" },
      {
        kind: "list",
        items: [
          "L - Lasix (IV furosemide).",
          "M - Morphine (modest preload reduction; used cautiously now).",
          "N - Nitrates (venodilation, reduces preload).",
          "O - Oxygen (target SaO₂ >90%; BiPAP if severe).",
          "P - Position upright, legs dependent - often the FIRST action.",
        ],
      },
      {
        kind: "callout",
        tone: "key",
        title: "The single most important patient-monitored parameter",
        text: "Daily weight - same time, same scale, same clothes. Report >2-3 lb in 24 hours or >5 lb in a week. Fluid retention precedes symptoms by days. Sodium ~2 g/day; fluid 1.5-2 L/day; DASH pattern.",
      },
    ],
    practiceItemId: "pi_hf",
  },
  {
    id: "arrhythmias",
    minutes: "25-35",
    title: "Arrhythmias & ACLS rhythms",
    format: "Lecture + rhythm drill",
    blocks: [
      {
        kind: "p",
        text: "Recognize each rhythm and know the action. Click any card below to focus it.",
      },
      {
        kind: "callout",
        tone: "key",
        title: "Shockable vs. not",
        text: "Shockable: ventricular fibrillation and pulseless VT. NOT shockable: asystole and PEA - these get CPR, epinephrine, and a search for reversible causes (the H's and T's).",
      },
    ],
    widget: "rhythms",
  },
  {
    id: "svt-sim",
    minutes: "25-35",
    title: "SVT → adenosine - at the bedside",
    format: "Interactive simulation",
    blocks: [
      {
        kind: "p",
        text: "A stable patient in supraventricular tachycardia at ~190 bpm. Vagal maneuvers fail; you give adenosine. Watch the monitor: adenosine produces a brief, frightening asystolic pause before the rhythm reorganizes. Play it through and read the clinical narration at each step.",
      },
      {
        kind: "callout",
        tone: "warn",
        title: "Warn the patient first",
        text: "Adenosine 6 mg is a rapid IV push followed immediately by a saline flush (two-syringe technique). Expect a few seconds of asystole and an unpleasant flushing/chest-pressure sensation - tell the patient before you push.",
      },
    ],
    widget: "sim",
  },
  {
    id: "htn",
    minutes: "35-40",
    title: "Hypertensive crisis",
    format: "Lecture",
    blocks: [
      {
        kind: "p",
        text: "Threshold: blood pressure above 180/120 mmHg defines crisis. The distinction that matters is whether there is acute end-organ damage.",
      },
      {
        kind: "list",
        items: [
          "Hypertensive urgency - >180/120 WITHOUT end-organ damage. Oral therapy, gradual reduction over 24-48 h, avoid rapid drops.",
          "Hypertensive emergency - >180/120 WITH end-organ damage (encephalopathy, stroke, papilledema, MI, pulmonary edema, AKI, aortic dissection, eclampsia). ICU, IV antihypertensives.",
        ],
      },
      {
        kind: "callout",
        tone: "key",
        title: "The reduction rule",
        text: "Lower MAP by no more than 25% in the first hour, then to 160/100-110 over the next 2-6 hours. Faster reduction causes cerebral, coronary, or renal hypoperfusion - too-rapid lowering is a recognized iatrogenic injury.",
      },
      {
        kind: "callout",
        tone: "warn",
        title: "Exception - aortic dissection",
        text: "Here you DO reduce rapidly: goal SBP 100-120, HR <60. Critical sequencing: beta blocker FIRST (labetalol or esmolol), then the vasodilator. A vasodilator without rate control increases shear stress and propagates the dissection.",
      },
      {
        kind: "list",
        items: [
          "Common IV agents: nicardipine, clevidipine, labetalol, esmolol, nitroprusside (watch cyanide toxicity), hydralazine.",
        ],
      },
    ],
  },
  {
    id: "valvular",
    minutes: "40-45",
    title: "Valvular disease",
    format: "Lecture + item",
    blocks: [
      { kind: "h", text: "The four classic lesions" },
      {
        kind: "list",
        items: [
          "Mitral stenosis - usually rheumatic; diastolic rumble at the apex; leads to AF, pulmonary HTN, right heart failure.",
          "Mitral regurgitation - holosystolic murmur at the apex radiating to the axilla; left atrial/ventricular dilation.",
          "Aortic stenosis - harsh systolic crescendo-decrescendo murmur at the right upper sternal border, radiates to carotids. Triad SAD: Syncope, Angina, Dyspnea.",
          "Aortic regurgitation - diastolic decrescendo murmur at the left sternal border; wide pulse pressure.",
        ],
      },
      {
        kind: "callout",
        tone: "key",
        title: "Heavily tested - aortic stenosis",
        text: "Severe AS patients are preload-dependent: a stiff, narrow valve needs adequate filling pressure. Avoid nitroglycerin and other preload-reducing agents - they can cause profound, sometimes fatal hypotension. Treatment for severe symptomatic AS is valve replacement (surgical or TAVR).",
      },
      {
        kind: "callout",
        tone: "info",
        title: "Endocarditis prophylaxis",
        text: "Reserved for high-risk procedures (dental work with gingival/mucosal manipulation) in high-risk patients (prosthetic valve, prior endocarditis, certain congenital disease). Amoxicillin 2 g PO 30-60 minutes before the procedure.",
      },
      {
        kind: "callout",
        tone: "info",
        title: "Cohort note",
        text: "Filipino- and African-trained nurses often have strong rheumatic mitral stenosis recognition from regional disease prevalence; the more common gap is the modern HF four-pillar regimen and current ACLS sequencing.",
      },
    ],
    practiceItemId: "pi_valve",
  },
  {
    id: "devices",
    minutes: "45-50",
    title: "Pacemakers & ICDs",
    format: "Lecture",
    blocks: [
      {
        kind: "list",
        items: [
          "Pacemaker indications: symptomatic bradycardia, complete heart block, sick sinus syndrome, certain Mobitz II blocks.",
          "Types: single-chamber, dual-chamber, biventricular (cardiac resynchronization therapy for selected HF patients).",
          "ICD: for high risk of sudden cardiac death - VT/VF arrest survivors, HFrEF with EF <35%, certain inherited arrhythmias.",
        ],
      },
      { kind: "h", text: "Post-implantation activity" },
      {
        kind: "list",
        items: [
          "No lifting the operative-side arm above the shoulder for 4-6 weeks.",
          "No heavy lifting (>10 lb) for the same period; avoid contact sports indefinitely.",
          "Check pulse daily - should match the programmed rate. Report a consistently low rate, hiccups (lead displacement), redness/drainage, dizziness, or syncope.",
          "Cell phone ≥6 inches from the device, opposite ear. MRI traditionally contraindicated; many newer devices are MRI-conditional. Carry the device ID card.",
        ],
      },
      {
        kind: "callout",
        tone: "key",
        title: "ICD shock teaching (testable)",
        text: "Shock + feels fine afterward → notify cardiology within 24 hours; NOT an emergency. Shock + symptoms (chest pain, dyspnea, syncope) or multiple shocks → call 911 immediately.",
      },
    ],
  },
  {
    id: "ngn",
    minutes: "50-57",
    title: "NGN unfolding case study",
    format: "Six items · full Clinical Judgment Measurement Model",
    blocks: [
      {
        kind: "p",
        text: "A 62-year-old man arrives in the ED at 0900 with chest pain that began 90 minutes ago while shoveling snow. History: hypertension on lisinopril, hyperlipidemia on atorvastatin, 30-year smoker, no prior cardiac history; father died of MI at 58. Work the six items below - one patient, all six steps of clinical judgment.",
      },
    ],
    widget: "ngn",
  },
  {
    id: "close",
    minutes: "57-60",
    title: "Close & homework",
    format: "Lecture",
    blocks: [
      {
        kind: "list",
        items: [
          "Homework: 50 cardiac-focused questions, emphasizing MI management sequences and HF discharge teaching. Journal every miss by segment - MI? HF? Arrhythmias? Valves? Devices?",
          "Next - Section 8: respiratory. ARDS, COPD, asthma, pneumonia, TB precautions (a frequent IEN gap), PE, chest tubes, ventilator basics.",
        ],
      },
    ],
  },
];

/** The complete Section 7 lesson, in the canonical format every section uses. */
export const lesson: Lesson = {
  meta: HOUR_META,
  objectives: OBJECTIVES,
  timing: TIMING,
  practiceItems: PRACTICE_ITEMS,
  segments: SEGMENTS,
};
