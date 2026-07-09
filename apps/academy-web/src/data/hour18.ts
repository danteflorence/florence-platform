import type { Lesson } from "./lessonTypes";

/**
 * Section 18 - Full Simulation. Auto-generated from the Florence Academy
 * bootcamp instructor script (expanded draft). Pending nurse-educator review.
 */
export const lesson: Lesson = {
  "meta": {
    "number": 18,
    "title": "Full Simulation",
    "durationMin": 60,
    "audience": "Internationally educated nurses - Philippines, UK, Kenya, Ghana",
    "contentWeight": "Mixed-content endurance simulation - 75 questions spanning every NCLEX category, distributed to match NCLEX category weighting",
    "tagline": "Ninety minutes, seventy-five questions, no rescue - today is the diagnostic dress rehearsal that tells you exactly what to drill before test day."
  },
  "objectives": [
    "Sustain test-taking focus for 90 continuous minutes - the actual NCLEX runs up to 5 hours, but a 90-minute block builds endurance and surfaces your personal fatigue patterns.",
    "Apply CJMM and prioritization frameworks under time pressure across all content areas simultaneously, the way the real exam mixes them.",
    "Identify your personal content gaps so Hour 19 can be targeted review instead of scattershot study.",
    "Practice NGN item-type recognition and response strategy - bowtie, cloze/drop-down, and multiple-response items.",
    "Develop pacing intuition: know when to commit to an answer and when to flag, move on, and protect your time for the questions you can win."
  ],
  "timing": [
    {
      "minutes": "0-3",
      "segment": "Welcome & frame the simulation as diagnostic",
      "format": "Lecture"
    },
    {
      "minutes": "3-8",
      "segment": "Pacing, strategy, flagging, and NGN approach",
      "format": "Lecture"
    },
    {
      "minutes": "8-13",
      "segment": "Rules, logistics, and finishing-early discipline",
      "format": "Lecture"
    },
    {
      "minutes": "13-15",
      "segment": "Settle, breathe, and start",
      "format": "Lecture"
    },
    {
      "minutes": "15-30",
      "segment": "Simulation block 1 - Pharmacology (Q1-12)",
      "format": "Case"
    },
    {
      "minutes": "30-48",
      "segment": "Simulation block 2 - Cardiovascular, Respiratory, Labs (Q13-27)",
      "format": "Case"
    },
    {
      "minutes": "48-66",
      "segment": "Simulation block 3 - Endocrine, Renal, GI, Neuro, MSK (Q28-42)",
      "format": "Case"
    },
    {
      "minutes": "66-78",
      "segment": "Simulation block 4 - Maternity & Pediatrics (Q43-52)",
      "format": "Case"
    },
    {
      "minutes": "78-84",
      "segment": "Simulation block 5 - Mental Health (Q53-57)",
      "format": "Case"
    },
    {
      "minutes": "84-93",
      "segment": "Simulation block 6 - Infection Control & Safety (Q58-65)",
      "format": "Case"
    },
    {
      "minutes": "93-105",
      "segment": "Simulation block 7 - Management of Care (Q66-75)",
      "format": "Case"
    },
    {
      "minutes": "105-120",
      "segment": "Scoring framework & self-scoring",
      "format": "Lecture"
    },
    {
      "minutes": "120-150",
      "segment": "Debrief - content gap vs reasoning error, cohort patterns, close",
      "format": "Lecture"
    }
  ],
  "practiceItems": {
    "pi_lithium_thiazide": {
      "id": "pi_lithium_thiazide",
      "stem": "A client with bipolar disorder is taking lithium 600 mg BID. The client is admitted to the ED with confusion, ataxia, slurred speech, and coarse tremor. The client recently started which medication that most likely contributed?",
      "options": [
        {
          "key": "A",
          "text": "Acetaminophen for headaches"
        },
        {
          "key": "B",
          "text": "Hydrochlorothiazide for hypertension"
        },
        {
          "key": "C",
          "text": "Loratadine for seasonal allergies"
        },
        {
          "key": "D",
          "text": "Melatonin for sleep"
        }
      ],
      "answer": "B",
      "rationale": "Thiazide diuretics cause lithium retention and toxicity. The clinical picture - confusion, ataxia, slurred speech, coarse tremor - is progressive lithium toxicity. The nursing response is to hold the lithium, discontinue the thiazide, and check a lithium level.",
      "cjmm": "analyze-cues",
      "reference": "Section 18 · Pharmacology (Q1-12)"
    },
    "pi_warfarin_vitamin_k": {
      "id": "pi_warfarin_vitamin_k",
      "stem": "A client on warfarin therapy reports the following dietary intake. Which item indicates a need for further teaching?",
      "options": [
        {
          "key": "A",
          "text": "I eat a small spinach salad most days for lunch."
        },
        {
          "key": "B",
          "text": "I take my warfarin at the same time every evening."
        },
        {
          "key": "C",
          "text": "I use an electric razor for shaving."
        },
        {
          "key": "D",
          "text": "I have my INR checked every 4 weeks."
        }
      ],
      "answer": "A",
      "rationale": "Daily large intake of vitamin K-rich foods (spinach, kale, broccoli) reduces the warfarin effect. The teaching point is consistency of vitamin K intake, not avoidance. A small daily spinach salad is fine if intake is consistent, but the concern is whether the patient understands the consistency principle, so the dietary item without that context is the answer that needs further teaching. B, C, and D all reflect correct warfarin self-management.",
      "cjmm": "evaluate-outcomes",
      "reference": "Section 18 · Pharmacology (Q1-12)"
    },
    "pi_heparin_aptt": {
      "id": "pi_heparin_aptt",
      "stem": "A client receiving heparin infusion has a baseline aPTT of 30 seconds. The therapeutic aPTT target on heparin is approximately:",
      "options": [
        {
          "key": "A",
          "text": "1.5-2.5 times the control value"
        },
        {
          "key": "B",
          "text": "Less than the control value"
        },
        {
          "key": "C",
          "text": "4-5 times the control value"
        },
        {
          "key": "D",
          "text": "The same as the control value"
        }
      ],
      "answer": "A",
      "rationale": "Therapeutic aPTT on heparin is 1.5-2.5 times the control. For a baseline of 30 seconds, that puts the target at 45-75 seconds.",
      "cjmm": "recognize-cues",
      "reference": "Section 18 · Pharmacology (Q1-12)"
    },
    "pi_ssri_black_box": {
      "id": "pi_ssri_black_box",
      "stem": "Which client receiving an SSRI requires the closest monitoring for increased suicidal ideation due to the black box warning?",
      "options": [
        {
          "key": "A",
          "text": "A 65-year-old man with depression"
        },
        {
          "key": "B",
          "text": "A 19-year-old woman starting fluoxetine for depression"
        },
        {
          "key": "C",
          "text": "A 45-year-old man with anxiety on sertraline"
        },
        {
          "key": "D",
          "text": "A 55-year-old woman with OCD on paroxetine"
        }
      ],
      "answer": "B",
      "rationale": "The SSRI black box warning applies to patients under 25, especially in the first weeks of treatment. The 19-year-old just starting fluoxetine fits the highest-risk category on both counts - young age and early in therapy.",
      "cjmm": "prioritize-hypotheses",
      "reference": "Section 18 · Pharmacology (Q1-12)"
    },
    "pi_mag_toxicity_first_action": {
      "id": "pi_mag_toxicity_first_action",
      "stem": "A preeclamptic client on magnesium sulfate infusion shows the following: RR 11, absent patellar reflexes, urine output 20 mL/hr. What is the FIRST nursing action?",
      "options": [
        {
          "key": "A",
          "text": "Increase the magnesium infusion rate"
        },
        {
          "key": "B",
          "text": "Administer naloxone IV"
        },
        {
          "key": "C",
          "text": "Stop the magnesium infusion and prepare to administer calcium gluconate"
        },
        {
          "key": "D",
          "text": "Administer additional IV fluid bolus"
        }
      ],
      "answer": "C",
      "rationale": "Magnesium toxicity signs are present: loss of DTRs is first, RR <12 is respiratory depression, and UOP <30 is decreased renal output. Stop the magnesium immediately; calcium gluconate is the antidote.",
      "cjmm": "take-actions",
      "reference": "Section 18 · Pharmacology (Q1-12)"
    },
    "pi_tramadol_serotonin": {
      "id": "pi_tramadol_serotonin",
      "stem": "A client with chronic back pain is prescribed tramadol and is also taking fluoxetine 40 mg daily for depression. Which adverse effect is the nurse MOST concerned about?",
      "options": [
        {
          "key": "A",
          "text": "Constipation"
        },
        {
          "key": "B",
          "text": "Serotonin syndrome"
        },
        {
          "key": "C",
          "text": "Hypoglycemia"
        },
        {
          "key": "D",
          "text": "Hypertensive crisis"
        }
      ],
      "answer": "B",
      "rationale": "Tramadol has serotonergic activity. Combined with fluoxetine (an SSRI), there is significant risk of serotonin syndrome. Monitor for the triad: autonomic instability, mental status changes, and neuromuscular hyperactivity (hyperreflexia, clonus).",
      "cjmm": "analyze-cues",
      "reference": "Section 18 · Pharmacology (Q1-12)"
    },
    "pi_phenytoin_level": {
      "id": "pi_phenytoin_level",
      "stem": "A client on phenytoin for seizure disorder has the following lab result: phenytoin level 25 mcg/mL. Which finding would the nurse expect?",
      "options": [
        {
          "key": "A",
          "text": "The level is below therapeutic; expect breakthrough seizures."
        },
        {
          "key": "B",
          "text": "The level is therapeutic; no action needed."
        },
        {
          "key": "C",
          "text": "The level is supratherapeutic; expect signs of toxicity such as ataxia and nystagmus."
        },
        {
          "key": "D",
          "text": "The level is dangerously low; expect status epilepticus."
        }
      ],
      "answer": "C",
      "rationale": "Therapeutic phenytoin level is 10-20 mcg/mL, so a level of 25 is supratherapeutic. Toxicity signs include ataxia, nystagmus, slurred speech, and confusion.",
      "cjmm": "analyze-cues",
      "reference": "Section 18 · Pharmacology (Q1-12)"
    },
    "pi_digoxin_hypokalemia": {
      "id": "pi_digoxin_hypokalemia",
      "stem": "A client taking digoxin for atrial fibrillation reports nausea, anorexia, and seeing yellow halos around lights. Which lab result would be MOST concerning for digoxin toxicity?",
      "options": [
        {
          "key": "A",
          "text": "Sodium 140 mEq/L"
        },
        {
          "key": "B",
          "text": "Potassium 2.8 mEq/L"
        },
        {
          "key": "C",
          "text": "Calcium 9.5 mg/dL"
        },
        {
          "key": "D",
          "text": "Glucose 110 mg/dL"
        }
      ],
      "answer": "B",
      "rationale": "Hypokalemia potentiates digoxin toxicity. The classic symptoms - anorexia, nausea, and visual disturbances including yellow-green halos - combined with a low potassium of 2.8 represent dangerous digoxin toxicity. Replace potassium and consider a digoxin level.",
      "cjmm": "analyze-cues",
      "reference": "Section 18 · Pharmacology (Q1-12)"
    },
    "pi_ace_cough": {
      "id": "pi_ace_cough",
      "stem": "A client recently started on lisinopril for hypertension reports a persistent dry cough. Which is the BEST response by the nurse?",
      "options": [
        {
          "key": "A",
          "text": "This is a serious side effect; stop the medication immediately."
        },
        {
          "key": "B",
          "text": "Try cough drops or honey for symptom management."
        },
        {
          "key": "C",
          "text": "Dry cough is a common side effect of ACE inhibitors. I will notify your provider as switching to an ARB may be appropriate."
        },
        {
          "key": "D",
          "text": "This is not related to the medication; you may have a viral infection."
        }
      ],
      "answer": "C",
      "rationale": "A dry, persistent cough is a well-known ACE inhibitor side effect from bradykinin accumulation. Switching to an ARB, which does not affect bradykinin, typically resolves it. The best nursing response acknowledges the side effect, notifies the provider, and explains the likely course - without telling the patient to stop the drug on their own (A) or dismissing it (D).",
      "cjmm": "take-actions",
      "reference": "Section 18 · Pharmacology (Q1-12)"
    },
    "pi_lispro_peak": {
      "id": "pi_lispro_peak",
      "stem": "A client with type 1 diabetes administers insulin lispro at 0730 with breakfast. When should the nurse expect peak insulin action?",
      "options": [
        {
          "key": "A",
          "text": "0745 to 0800"
        },
        {
          "key": "B",
          "text": "0830 to 0900"
        },
        {
          "key": "C",
          "text": "1100 to 1200"
        },
        {
          "key": "D",
          "text": "1400 to 1500"
        }
      ],
      "answer": "B",
      "rationale": "Rapid-acting insulin (lispro, aspart, glulisine) has an onset of 15 minutes, a peak of 1-2 hours, and a duration of 3-4 hours. A peak at 0830-0900 corresponds to 1-1.5 hours after the 0730 dose - the window to watch for hypoglycemia.",
      "cjmm": "recognize-cues",
      "reference": "Section 18 · Pharmacology (Q1-12)"
    },
    "pi_maoi_tyramine": {
      "id": "pi_maoi_tyramine",
      "stem": "A client taking phenelzine (MAOI) for depression reports eating which food at dinner. Which would put the client at risk for hypertensive crisis?",
      "options": [
        {
          "key": "A",
          "text": "Grilled chicken with rice"
        },
        {
          "key": "B",
          "text": "Aged cheddar cheese on crackers"
        },
        {
          "key": "C",
          "text": "Apple slices with almond butter"
        },
        {
          "key": "D",
          "text": "Steamed broccoli with olive oil"
        }
      ],
      "answer": "B",
      "rationale": "Tyramine-containing foods - aged cheese, cured meats, fermented foods, draft beer, red wine, soy sauce, and fava beans - combined with MAOIs cause hypertensive crisis. Aged cheddar is high in tyramine.",
      "cjmm": "evaluate-outcomes",
      "reference": "Section 18 · Pharmacology (Q1-12)"
    },
    "pi_kcl_administration_1": {
      "id": "pi_kcl_administration_1",
      "stem": "A client with severe hypokalemia (K+ 2.6 mEq/L) is ordered KCl 40 mEq IV. Which administration method is correct?",
      "options": [
        {
          "key": "A",
          "text": "IV push over 5 minutes through a central line"
        },
        {
          "key": "B",
          "text": "IV push over 10 minutes through a peripheral line"
        },
        {
          "key": "C",
          "text": "Diluted in 100 mL of normal saline, infused via pump over 1 hour through a central line"
        },
        {
          "key": "D",
          "text": "Rapid IV bolus through a peripheral line"
        }
      ],
      "answer": "C",
      "rationale": "KCl is NEVER given IV push under any circumstances - it is always diluted and given by continuous infusion via pump. A central line can tolerate a higher concentration; the peripheral maximum is typically 10 mEq/hr.",
      "cjmm": "take-actions",
      "reference": "Section 18 · Pharmacology (Q1-12)"
    },
    "pi_atypical_mi": {
      "id": "pi_atypical_mi",
      "stem": "A 78-year-old woman with type 2 diabetes presents to the ED with fatigue, mild shortness of breath, and vague abdominal discomfort. Which test would the nurse anticipate FIRST?",
      "options": [
        {
          "key": "A",
          "text": "Abdominal CT scan"
        },
        {
          "key": "B",
          "text": "12-lead ECG and serum troponin"
        },
        {
          "key": "C",
          "text": "Upper GI endoscopy"
        },
        {
          "key": "D",
          "text": "Blood glucose only"
        }
      ],
      "answer": "B",
      "rationale": "Elderly women and diabetic patients often present with atypical MI symptoms - fatigue, dyspnea, abdominal or back pain, jaw pain - rather than classic crushing chest pain. Obtain an ECG and troponin to rule out acute coronary syndrome first.",
      "cjmm": "recognize-cues",
      "reference": "Section 18 · Cardiovascular, Respiratory, Labs (Q13-27)"
    },
    "pi_door_to_balloon": {
      "id": "pi_door_to_balloon",
      "stem": "A client with STEMI is transported directly to the cardiac catheterization lab. The goal door-to-balloon time is:",
      "options": [
        {
          "key": "A",
          "text": "Less than 30 minutes"
        },
        {
          "key": "B",
          "text": "Less than 90 minutes"
        },
        {
          "key": "C",
          "text": "Less than 4 hours"
        },
        {
          "key": "D",
          "text": "Less than 12 hours"
        }
      ],
      "answer": "B",
      "rationale": "The goal door-to-balloon time for STEMI is less than 90 minutes for primary PCI. Time is myocardium.",
      "cjmm": "recognize-cues",
      "reference": "Section 18 · Cardiovascular, Respiratory, Labs (Q13-27)"
    },
    "pi_left_heart_failure": {
      "id": "pi_left_heart_failure",
      "stem": "A client with heart failure presents with crackles in the lungs, pink frothy sputum, and JVD. Which type of heart failure is most likely?",
      "options": [
        {
          "key": "A",
          "text": "Right-sided heart failure only"
        },
        {
          "key": "B",
          "text": "Left-sided heart failure with pulmonary congestion"
        },
        {
          "key": "C",
          "text": "Biventricular failure with cor pulmonale"
        },
        {
          "key": "D",
          "text": "Diastolic dysfunction only"
        }
      ],
      "answer": "B",
      "rationale": "Crackles and pink frothy sputum indicate pulmonary congestion from left-sided failure. JVD also suggests biventricular involvement, but the primary presenting features are pulmonary and reflect left-sided failure.",
      "cjmm": "analyze-cues",
      "reference": "Section 18 · Cardiovascular, Respiratory, Labs (Q13-27)"
    },
    "pi_afib_anticoagulation": {
      "id": "pi_afib_anticoagulation",
      "stem": "A client newly diagnosed with atrial fibrillation has a CHA2DS2-VASc score of 4. Which intervention is most appropriate for stroke prevention?",
      "options": [
        {
          "key": "A",
          "text": "Daily aspirin 81 mg only"
        },
        {
          "key": "B",
          "text": "Oral anticoagulation with warfarin or DOAC"
        },
        {
          "key": "C",
          "text": "Beta blocker only for rate control"
        },
        {
          "key": "D",
          "text": "Cardioversion without anticoagulation"
        }
      ],
      "answer": "B",
      "rationale": "A CHA2DS2-VASc score of 2 or more in men (or 3 or more in women) indicates anticoagulation for stroke prevention, and a score of 4 strongly indicates it. Aspirin alone is insufficient for stroke prevention in atrial fibrillation.",
      "cjmm": "generate-solutions",
      "reference": "Section 18 · Cardiovascular, Respiratory, Labs (Q13-27)"
    },
    "pi_hypertensive_emergency": {
      "id": "pi_hypertensive_emergency",
      "stem": "A client presents with BP 220/130, severe headache, and blurred vision. Which is the priority nursing action?",
      "options": [
        {
          "key": "A",
          "text": "Encourage oral fluids"
        },
        {
          "key": "B",
          "text": "Establish IV access and prepare to administer IV antihypertensive medications as ordered"
        },
        {
          "key": "C",
          "text": "Reposition the client supine"
        },
        {
          "key": "D",
          "text": "Administer oral antihypertensive medication immediately"
        }
      ],
      "answer": "B",
      "rationale": "Hypertensive emergency with end-organ symptoms (severe headache, blurred vision) requires IV antihypertensives - labetalol, nicardipine, or hydralazine - for controlled BP reduction. The goal is a reduction of 10-20% in the first hour, then gradual lowering, which oral dosing cannot deliver reliably.",
      "cjmm": "take-actions",
      "reference": "Section 18 · Cardiovascular, Respiratory, Labs (Q13-27)"
    },
    "pi_dvt_prevention": {
      "id": "pi_dvt_prevention",
      "stem": "A post-operative client is at high risk for DVT. Which intervention is MOST effective for prevention?",
      "options": [
        {
          "key": "A",
          "text": "Bed rest for the first 48 hours after surgery"
        },
        {
          "key": "B",
          "text": "Early ambulation, mechanical compression (SCDs), and pharmacologic prophylaxis (LMWH) as ordered"
        },
        {
          "key": "C",
          "text": "Massage of the legs to promote circulation"
        },
        {
          "key": "D",
          "text": "Limiting fluid intake to prevent edema"
        }
      ],
      "answer": "B",
      "rationale": "DVT prevention combines early ambulation, mechanical methods (SCDs/TEDs), and pharmacologic prophylaxis (LMWH) - all three together are most effective. Bed rest promotes stasis, and leg massage can dislodge a clot, so both are inappropriate.",
      "cjmm": "generate-solutions",
      "reference": "Section 18 · Cardiovascular, Respiratory, Labs (Q13-27)"
    },
    "pi_postop_pe": {
      "id": "pi_postop_pe",
      "stem": "A post-op day 3 client suddenly develops shortness of breath, tachycardia, and chest pain. Which is the MOST likely diagnosis?",
      "options": [
        {
          "key": "A",
          "text": "Anxiety attack"
        },
        {
          "key": "B",
          "text": "Pulmonary embolism"
        },
        {
          "key": "C",
          "text": "Pneumonia"
        },
        {
          "key": "D",
          "text": "Costochondritis"
        }
      ],
      "answer": "B",
      "rationale": "PE is the most concerning diagnosis. Post-op patients are at peak DVT/PE risk on POD 3-5, and sudden dyspnea, tachycardia, and chest or pleuritic pain are classic. Workup includes D-dimer and CT-PE, with anticoagulation if indicated.",
      "cjmm": "prioritize-hypotheses",
      "reference": "Section 18 · Cardiovascular, Respiratory, Labs (Q13-27)"
    },
    "pi_copd_abg": {
      "id": "pi_copd_abg",
      "stem": "A client with COPD comes to the ED with severe dyspnea, productive cough with thick yellow sputum, and confusion. ABG: pH 7.28, PaCO2 68, HCO3 31. Which is the primary disturbance?",
      "options": [
        {
          "key": "A",
          "text": "Metabolic acidosis with respiratory compensation"
        },
        {
          "key": "B",
          "text": "Respiratory acidosis with metabolic compensation"
        },
        {
          "key": "C",
          "text": "Respiratory alkalosis"
        },
        {
          "key": "D",
          "text": "Mixed acid-base disorder"
        }
      ],
      "answer": "B",
      "rationale": "The pH is low (acidemia), the PaCO2 is elevated (so respiratory acidosis is the cause), and the HCO3 is elevated (metabolic compensation). This is acute-on-chronic respiratory acidosis from a COPD exacerbation.",
      "cjmm": "analyze-cues",
      "reference": "Section 18 · Cardiovascular, Respiratory, Labs (Q13-27)"
    },
    "pi_tension_pneumothorax": {
      "id": "pi_tension_pneumothorax",
      "stem": "A trauma patient develops sudden tracheal deviation away from the affected side, absent breath sounds, and hemodynamic instability. Which is the priority intervention?",
      "options": [
        {
          "key": "A",
          "text": "Immediate chest X-ray"
        },
        {
          "key": "B",
          "text": "Needle decompression of the affected chest, then chest tube"
        },
        {
          "key": "C",
          "text": "Endotracheal intubation"
        },
        {
          "key": "D",
          "text": "Bilateral chest tube placement"
        }
      ],
      "answer": "B",
      "rationale": "Tension pneumothorax is a clinical diagnosis. Perform immediate needle decompression (2nd intercostal space, midclavicular line, or 4th-5th ICS in newer guidelines), then a chest tube. Do NOT wait for imaging.",
      "cjmm": "take-actions",
      "reference": "Section 18 · Cardiovascular, Respiratory, Labs (Q13-27)"
    },
    "pi_tb_pyridoxine": {
      "id": "pi_tb_pyridoxine",
      "stem": "A client diagnosed with active pulmonary TB is started on isoniazid, rifampin, pyrazinamide, and ethambutol. What additional medication is essential?",
      "options": [
        {
          "key": "A",
          "text": "Vitamin B6 (pyridoxine) to prevent peripheral neuropathy from isoniazid"
        },
        {
          "key": "B",
          "text": "Vitamin C to support immune function"
        },
        {
          "key": "C",
          "text": "Iron to prevent anemia"
        },
        {
          "key": "D",
          "text": "Calcium for bone health"
        }
      ],
      "answer": "A",
      "rationale": "Isoniazid causes peripheral neuropathy by depleting B6. Pyridoxine 25-50 mg daily is the standard supplementation given alongside therapy.",
      "cjmm": "generate-solutions",
      "reference": "Section 18 · Cardiovascular, Respiratory, Labs (Q13-27)"
    },
    "pi_respiratory_alkalosis": {
      "id": "pi_respiratory_alkalosis",
      "stem": "A client presents with the following ABG: pH 7.51, PaCO2 28, HCO3 24. What is the primary disturbance?",
      "options": [
        {
          "key": "A",
          "text": "Metabolic acidosis"
        },
        {
          "key": "B",
          "text": "Metabolic alkalosis"
        },
        {
          "key": "C",
          "text": "Respiratory alkalosis"
        },
        {
          "key": "D",
          "text": "Respiratory acidosis"
        }
      ],
      "answer": "C",
      "rationale": "Using the ROME framework: the pH is high (alkalemia), the PaCO2 is low (which matches alkalosis, so the cause is respiratory), and the HCO3 is normal (uncompensated). Common causes include anxiety/hyperventilation, salicylate toxicity, fever, hypoxia, and pregnancy.",
      "cjmm": "analyze-cues",
      "reference": "Section 18 · Cardiovascular, Respiratory, Labs (Q13-27)"
    },
    "pi_hyperkalemia_calcium": {
      "id": "pi_hyperkalemia_calcium",
      "stem": "A client with chronic kidney disease has K+ 7.2 mEq/L. The ECG shows peaked T waves. Which is the FIRST intervention?",
      "options": [
        {
          "key": "A",
          "text": "IV calcium gluconate to stabilize the cardiac membrane"
        },
        {
          "key": "B",
          "text": "Oral kayexalate"
        },
        {
          "key": "C",
          "text": "Loop diuretic IV"
        },
        {
          "key": "D",
          "text": "Hemodialysis emergent setup"
        }
      ],
      "answer": "A",
      "rationale": "Hyperkalemia with ECG changes is a cardiac emergency. Give calcium gluconate FIRST to stabilize the cardiac membrane (it does not lower potassium). Then shift potassium intracellularly (insulin + glucose, albuterol), then remove it (kayexalate, dialysis).",
      "cjmm": "take-actions",
      "reference": "Section 18 · Cardiovascular, Respiratory, Labs (Q13-27)"
    },
    "pi_siadh_hypertonic": {
      "id": "pi_siadh_hypertonic",
      "stem": "A client with SIADH presents with serum sodium 118 mEq/L, mental status changes, and seizure. Which IV fluid is most appropriate?",
      "options": [
        {
          "key": "A",
          "text": "0.9% normal saline at maintenance rate"
        },
        {
          "key": "B",
          "text": "D5W at 200 mL/hr"
        },
        {
          "key": "C",
          "text": "3% hypertonic saline at carefully controlled rate"
        },
        {
          "key": "D",
          "text": "Lactated Ringer's at 250 mL/hr"
        }
      ],
      "answer": "C",
      "rationale": "Severe symptomatic hyponatremia (Na <120 with neurologic symptoms) requires 3% hypertonic saline given carefully - correct slowly to avoid osmotic demyelination, no more than 8 mEq/L in 24 hours. Fluid restriction is also part of SIADH management.",
      "cjmm": "generate-solutions",
      "reference": "Section 18 · Cardiovascular, Respiratory, Labs (Q13-27)"
    },
    "pi_anaphylaxis_epinephrine": {
      "id": "pi_anaphylaxis_epinephrine",
      "stem": "A client experiencing anaphylaxis from peanut exposure presents with hives, wheezing, and BP 78/40. Which is the FIRST intervention?",
      "options": [
        {
          "key": "A",
          "text": "Diphenhydramine 50 mg IV"
        },
        {
          "key": "B",
          "text": "Epinephrine 0.3-0.5 mg IM in the lateral thigh"
        },
        {
          "key": "C",
          "text": "Methylprednisolone IV"
        },
        {
          "key": "D",
          "text": "Albuterol nebulizer"
        }
      ],
      "answer": "B",
      "rationale": "Epinephrine IM is the first-line treatment for anaphylaxis. The 0.3 mg adult dose IM in the lateral thigh reverses bronchoconstriction, vasodilation, and edema. Antihistamines and steroids are adjunctive but slower.",
      "cjmm": "take-actions",
      "reference": "Section 18 · Cardiovascular, Respiratory, Labs (Q13-27)"
    },
    "pi_chest_tube_tidaling": {
      "id": "pi_chest_tube_tidaling",
      "stem": "A client with a chest tube to water-seal drainage system has tidaling in the water-seal chamber that suddenly stops. Bubbling has also stopped. Which is the MOST likely cause?",
      "options": [
        {
          "key": "A",
          "text": "Lung re-expansion"
        },
        {
          "key": "B",
          "text": "Tubing kink or obstruction"
        },
        {
          "key": "C",
          "text": "Air leak in the system"
        },
        {
          "key": "D",
          "text": "Inadequate suction"
        }
      ],
      "answer": "B",
      "rationale": "Sudden cessation of tidaling without confirmed lung re-expansion suggests obstruction - a kink or clot. Assess the tubing immediately. If tidaling resumes with manipulation, address the obstruction. True lung re-expansion produces a gradual decrease, not sudden cessation.",
      "cjmm": "analyze-cues",
      "reference": "Section 18 · Cardiovascular, Respiratory, Labs (Q13-27)"
    },
    "pi_dka_potassium_first": {
      "id": "pi_dka_potassium_first",
      "stem": "A client in DKA has glucose 580, K+ 3.0, pH 7.18. Which is the priority FIRST nursing action?",
      "options": [
        {
          "key": "A",
          "text": "Start insulin infusion immediately"
        },
        {
          "key": "B",
          "text": "Administer sodium bicarbonate"
        },
        {
          "key": "C",
          "text": "Replace potassium before starting insulin"
        },
        {
          "key": "D",
          "text": "Give D5W bolus"
        }
      ],
      "answer": "C",
      "rationale": "A K+ below 3.3 requires potassium replacement BEFORE starting insulin. Insulin drives potassium intracellularly, which would cause dangerous hypokalemia and arrhythmias. First replace the potassium, then start the insulin.",
      "cjmm": "prioritize-hypotheses",
      "reference": "Section 18 · Endocrine, Renal, GI, Neuro, MSK (Q28-42)"
    },
    "pi_thyroid_storm": {
      "id": "pi_thyroid_storm",
      "stem": "A client presents with hyperthermia 41°C, tachycardia 160, agitation, and recent history of poorly controlled hyperthyroidism. Which condition does the nurse suspect?",
      "options": [
        {
          "key": "A",
          "text": "Myxedema coma"
        },
        {
          "key": "B",
          "text": "Thyroid storm"
        },
        {
          "key": "C",
          "text": "Sepsis"
        },
        {
          "key": "D",
          "text": "Neuroleptic malignant syndrome"
        }
      ],
      "answer": "B",
      "rationale": "Thyroid storm is acute decompensation of hyperthyroidism - hyperthermia, tachycardia, agitation, hypertension. The treatment sequence is a beta blocker (propranolol) and a thionamide (PTU or methimazole) FIRST, then iodine 1 or more hours later, plus glucocorticoids and supportive care.",
      "cjmm": "analyze-cues",
      "reference": "Section 18 · Endocrine, Renal, GI, Neuro, MSK (Q28-42)"
    },
    "pi_iatrogenic_cushings": {
      "id": "pi_iatrogenic_cushings",
      "stem": "A client with long-term oral corticosteroid use for rheumatoid arthritis has a moon face, central obesity, thin skin, and easy bruising. Which condition does the nurse recognize?",
      "options": [
        {
          "key": "A",
          "text": "Addison's disease"
        },
        {
          "key": "B",
          "text": "Cushing's syndrome (iatrogenic)"
        },
        {
          "key": "C",
          "text": "Hyperthyroidism"
        },
        {
          "key": "D",
          "text": "Hypothyroidism"
        }
      ],
      "answer": "B",
      "rationale": "This is iatrogenic Cushing's syndrome from chronic exogenous corticosteroid use, with symptoms resulting from elevated cortisol. Key patient teaching: NEVER abruptly discontinue chronic steroids (this risks adrenal crisis); taper as ordered.",
      "cjmm": "recognize-cues",
      "reference": "Section 18 · Endocrine, Renal, GI, Neuro, MSK (Q28-42)"
    },
    "pi_diabetes_insipidus": {
      "id": "pi_diabetes_insipidus",
      "stem": "A client with traumatic brain injury develops urine output 800 mL/hr, serum sodium 152 mEq/L, urine specific gravity 1.001. Which condition is most likely?",
      "options": [
        {
          "key": "A",
          "text": "SIADH"
        },
        {
          "key": "B",
          "text": "Diabetes insipidus (DI)"
        },
        {
          "key": "C",
          "text": "DKA"
        },
        {
          "key": "D",
          "text": "Cushing's"
        }
      ],
      "answer": "B",
      "rationale": "DI presents with excessive dilute urine output plus hypernatremia, and central DI is common after TBI. Treatment is desmopressin (DDAVP) and fluid replacement to match losses. Contrast this with SIADH, which has concentrated urine, hyponatremia, and fluid restriction.",
      "cjmm": "analyze-cues",
      "reference": "Section 18 · Endocrine, Renal, GI, Neuro, MSK (Q28-42)"
    },
    "pi_prerenal_aki": {
      "id": "pi_prerenal_aki",
      "stem": "A client with acute kidney injury has a BUN/creatinine ratio of 30:1 and FENa <1%. Which type of AKI is most likely?",
      "options": [
        {
          "key": "A",
          "text": "Prerenal (decreased perfusion)"
        },
        {
          "key": "B",
          "text": "Intrinsic (ATN)"
        },
        {
          "key": "C",
          "text": "Postrenal (obstruction)"
        },
        {
          "key": "D",
          "text": "Chronic kidney disease"
        }
      ],
      "answer": "A",
      "rationale": "A BUN/Cr ratio above 20:1 with a FENa below 1% indicates prerenal AKI from decreased perfusion (hypovolemia, hypotension, heart failure). The kidneys are functioning but underperfused, so the treatment is restoring perfusion.",
      "cjmm": "analyze-cues",
      "reference": "Section 18 · Endocrine, Renal, GI, Neuro, MSK (Q28-42)"
    },
    "pi_av_fistula_teaching": {
      "id": "pi_av_fistula_teaching",
      "stem": "A client with chronic kidney disease has an AV fistula in the left arm. Which is appropriate teaching?",
      "options": [
        {
          "key": "A",
          "text": "Take blood pressures from the left arm only"
        },
        {
          "key": "B",
          "text": "Avoid all BP measurements, IV insertions, and blood draws from the left arm; check for thrill and bruit daily"
        },
        {
          "key": "C",
          "text": "Lift heavy objects with the left arm to strengthen it"
        },
        {
          "key": "D",
          "text": "Apply tight bandages or jewelry to the left arm"
        }
      ],
      "answer": "B",
      "rationale": "AV fistula precautions are: no BP, no IV, and no blood draws on the fistula arm; no constrictive jewelry or tight clothing; check the thrill (palpable buzz) and bruit (audible whoosh) daily; and avoid heavy lifting.",
      "cjmm": "generate-solutions",
      "reference": "Section 18 · Endocrine, Renal, GI, Neuro, MSK (Q28-42)"
    },
    "pi_lactulose_effective": {
      "id": "pi_lactulose_effective",
      "stem": "A client with end-stage liver disease and hepatic encephalopathy is receiving lactulose. Which finding indicates the medication is effective?",
      "options": [
        {
          "key": "A",
          "text": "Reduced ammonia level and improved mental status"
        },
        {
          "key": "B",
          "text": "Increased serum potassium"
        },
        {
          "key": "C",
          "text": "Decreased bowel sounds"
        },
        {
          "key": "D",
          "text": "Constipation 4 days"
        }
      ],
      "answer": "A",
      "rationale": "Lactulose works by acidifying the colon, trapping ammonia as ammonium, and increasing bowel motility for excretion. The goal is 2-3 soft stools per day, a reduced ammonia level, and improved mentation.",
      "cjmm": "evaluate-outcomes",
      "reference": "Section 18 · Endocrine, Renal, GI, Neuro, MSK (Q28-42)"
    },
    "pi_pancreatitis_pain": {
      "id": "pi_pancreatitis_pain",
      "stem": "A client with acute pancreatitis describes the pain. Which description is most characteristic?",
      "options": [
        {
          "key": "A",
          "text": "Sharp pain in the right lower quadrant that worsens with palpation"
        },
        {
          "key": "B",
          "text": "Severe epigastric pain radiating to the back, worsened by lying flat, improved with leaning forward"
        },
        {
          "key": "C",
          "text": "Dull aching pain in the right upper quadrant after fatty meals"
        },
        {
          "key": "D",
          "text": "Burning chest pain relieved by antacids"
        }
      ],
      "answer": "B",
      "rationale": "This is the classic pancreatitis pain pattern. The most common causes are gallstones and alcohol. Workup includes amylase, lipase, and abdominal imaging, and management is NPO, IV fluids, and pain control.",
      "cjmm": "recognize-cues",
      "reference": "Section 18 · Endocrine, Renal, GI, Neuro, MSK (Q28-42)"
    },
    "pi_stroke_bp_tpa": {
      "id": "pi_stroke_bp_tpa",
      "stem": "A 65-year-old man arrives in ED with sudden right-sided weakness and aphasia. Last known well 90 minutes ago. CT shows no hemorrhage. BP 198/110, INR 1.2. The patient is otherwise stable. Which is the priority nursing action?",
      "options": [
        {
          "key": "A",
          "text": "Initiate heparin drip"
        },
        {
          "key": "B",
          "text": "Begin IV labetalol to lower BP below 185/110 to prepare for possible tPA"
        },
        {
          "key": "C",
          "text": "Administer aspirin 325 mg PO"
        },
        {
          "key": "D",
          "text": "Place a Foley catheter"
        }
      ],
      "answer": "B",
      "rationale": "The patient is within the tPA window and the INR of 1.2 is below 1.7, so the barrier to treatment is the BP above 185/110. Lowering the BP is required for tPA eligibility. After the tPA decision, aspirin may follow.",
      "cjmm": "take-actions",
      "reference": "Section 18 · Endocrine, Renal, GI, Neuro, MSK (Q28-42)"
    },
    "pi_cushings_triad": {
      "id": "pi_cushings_triad",
      "stem": "A client with TBI shows the following changes: BP 168/74 (from 138/82), HR 52, irregular respirations, decreased LOC. Which condition does the nurse recognize?",
      "options": [
        {
          "key": "A",
          "text": "Septic shock"
        },
        {
          "key": "B",
          "text": "Cushing's triad indicating increased ICP and impending herniation"
        },
        {
          "key": "C",
          "text": "Cardiogenic shock"
        },
        {
          "key": "D",
          "text": "Neurogenic shock"
        }
      ],
      "answer": "B",
      "rationale": "Cushing's triad - hypertension with a widened pulse pressure, bradycardia, and irregular respirations - indicates brainstem compression. This calls for immediate ICP-lowering interventions and provider notification.",
      "cjmm": "recognize-cues",
      "reference": "Section 18 · Endocrine, Renal, GI, Neuro, MSK (Q28-42)"
    },
    "pi_status_epilepticus": {
      "id": "pi_status_epilepticus",
      "stem": "A client has been seizing for 8 minutes. Status epilepticus protocol is initiated. Which is the first-line medication?",
      "options": [
        {
          "key": "A",
          "text": "Phenytoin IV"
        },
        {
          "key": "B",
          "text": "Lorazepam IV (or midazolam IM if no IV access)"
        },
        {
          "key": "C",
          "text": "Propofol infusion"
        },
        {
          "key": "D",
          "text": "Phenobarbital IV"
        }
      ],
      "answer": "B",
      "rationale": "First-line for status epilepticus is an IV benzodiazepine - lorazepam, typically 4 mg IV, or midazolam 10 mg IM if there is no IV. Second-line agents are fosphenytoin or levetiracetam; third-line are anesthetic infusions.",
      "cjmm": "take-actions",
      "reference": "Section 18 · Endocrine, Renal, GI, Neuro, MSK (Q28-42)"
    },
    "pi_autonomic_dysreflexia": {
      "id": "pi_autonomic_dysreflexia",
      "stem": "A client with T4 spinal cord injury reports severe pounding headache, flushing above the injury level, BP 220/118. Which is the FIRST nursing action?",
      "options": [
        {
          "key": "A",
          "text": "Administer IV labetalol immediately"
        },
        {
          "key": "B",
          "text": "Raise the head of the bed and check for bladder distension"
        },
        {
          "key": "C",
          "text": "Lay the client flat to improve cerebral perfusion"
        },
        {
          "key": "D",
          "text": "Provide pain medication"
        }
      ],
      "answer": "B",
      "rationale": "This is autonomic dysreflexia. The FIRST action is to sit the client up, which drops the BP via gravity, then identify and remove the noxious stimulus - check the bladder first, as it is the most common trigger. An antihypertensive is used only if the BP remains dangerously elevated after the stimulus is removed.",
      "cjmm": "take-actions",
      "reference": "Section 18 · Endocrine, Renal, GI, Neuro, MSK (Q28-42)"
    },
    "pi_cholinergic_crisis": {
      "id": "pi_cholinergic_crisis",
      "stem": "A client with myasthenia gravis presents with sudden weakness, drooling, watery eyes, diarrhea, and pinpoint pupils. The client took an extra pyridostigmine dose this morning. Which is the priority intervention?",
      "options": [
        {
          "key": "A",
          "text": "Administer another dose of pyridostigmine"
        },
        {
          "key": "B",
          "text": "Administer IV atropine; hold pyridostigmine"
        },
        {
          "key": "C",
          "text": "Administer IVIG"
        },
        {
          "key": "D",
          "text": "Increase pyridostigmine schedule"
        }
      ],
      "answer": "B",
      "rationale": "This is cholinergic crisis from excess cholinesterase inhibitor (the extra pyridostigmine), with SLUDGE symptoms present. Atropine reverses the muscarinic effects. Stop the pyridostigmine and provide ventilatory support as needed.",
      "cjmm": "take-actions",
      "reference": "Section 18 · Endocrine, Renal, GI, Neuro, MSK (Q28-42)"
    },
    "pi_compartment_syndrome": {
      "id": "pi_compartment_syndrome",
      "stem": "A client with a tibial fracture in a long-leg splint reports pain 10/10, much worse than yesterday, especially with passive movement of the toes. Pulses are still palpable. Which is the priority concern?",
      "options": [
        {
          "key": "A",
          "text": "Inadequate pain management; increase analgesia"
        },
        {
          "key": "B",
          "text": "Compartment syndrome - split the splint and notify the surgeon immediately"
        },
        {
          "key": "C",
          "text": "Anxiety; provide reassurance"
        },
        {
          "key": "D",
          "text": "Normal post-injury pain pattern"
        }
      ],
      "answer": "B",
      "rationale": "Pain out of proportion, worsened by passive stretch, is the earliest and most reliable sign of compartment syndrome. Palpable pulses do NOT rule it out - pulselessness is a late sign. Split or bivalve the splint, notify the surgeon urgently, and prepare for fasciotomy.",
      "cjmm": "take-actions",
      "reference": "Section 18 · Endocrine, Renal, GI, Neuro, MSK (Q28-42)"
    },
    "pi_fat_embolism": {
      "id": "pi_fat_embolism",
      "stem": "A patient with a closed femur fracture from a motor vehicle accident develops, on hospital day 2, sudden dyspnea, confusion, petechiae on the chest and conjunctiva, SpO2 88%. Which condition is most likely?",
      "options": [
        {
          "key": "A",
          "text": "Pulmonary embolism"
        },
        {
          "key": "B",
          "text": "Fat embolism syndrome"
        },
        {
          "key": "C",
          "text": "Pneumonia"
        },
        {
          "key": "D",
          "text": "ARDS"
        }
      ],
      "answer": "B",
      "rationale": "This is the classic fat embolism triad: hypoxia/dyspnea plus petechiae (chest, axillae, conjunctiva) plus altered mental status, with onset 24-72 hours after a long-bone fracture. Treatment is supportive.",
      "cjmm": "analyze-cues",
      "reference": "Section 18 · Endocrine, Renal, GI, Neuro, MSK (Q28-42)"
    },
    "pi_mag_stop_infusion": {
      "id": "pi_mag_stop_infusion",
      "stem": "A client at 34 weeks with severe preeclampsia is on magnesium sulfate infusion. Which finding requires the nurse to STOP the infusion immediately?",
      "options": [
        {
          "key": "A",
          "text": "BP 158/96"
        },
        {
          "key": "B",
          "text": "Patellar reflexes present 2+ bilaterally"
        },
        {
          "key": "C",
          "text": "Respiratory rate 10, urine output 22 mL in past hour, absent DTRs"
        },
        {
          "key": "D",
          "text": "Fetal heart rate baseline 140 with moderate variability"
        }
      ],
      "answer": "C",
      "rationale": "Multiple magnesium toxicity signs are present: RR <12, UOP <30 mL/hr, and absent DTRs. Stop the magnesium, administer calcium gluconate (10% solution, 10 mL IV slow push), and notify the provider. The other findings are reassuring or expected.",
      "cjmm": "evaluate-outcomes",
      "reference": "Section 18 · Maternity & Pediatrics (Q43-52)"
    },
    "pi_late_decelerations": {
      "id": "pi_late_decelerations",
      "stem": "During labor, the fetal monitor shows decelerations beginning AFTER the contraction starts, with nadir AFTER the peak, returning to baseline AFTER the contraction ends. The mother is receiving oxytocin augmentation. Which is the FIRST nursing action?",
      "options": [
        {
          "key": "A",
          "text": "Document the early decelerations and continue monitoring"
        },
        {
          "key": "B",
          "text": "Stop the oxytocin infusion"
        },
        {
          "key": "C",
          "text": "Increase the oxytocin rate"
        },
        {
          "key": "D",
          "text": "Apply external fetal scalp electrode"
        }
      ],
      "answer": "B",
      "rationale": "The pattern described is LATE decelerations, indicating uteroplacental insufficiency. Use the SPFON intervention sequence: Stop oxytocin first, then Position left lateral, give a Fluid bolus, apply Oxygen, and Notify the provider.",
      "cjmm": "take-actions",
      "reference": "Section 18 · Maternity & Pediatrics (Q43-52)"
    },
    "pi_placenta_previa": {
      "id": "pi_placenta_previa",
      "stem": "A 28-week pregnant client presents with painless bright red vaginal bleeding. Ultrasound is pending. Which action is contraindicated?",
      "options": [
        {
          "key": "A",
          "text": "Establish IV access and type and crossmatch"
        },
        {
          "key": "B",
          "text": "Perform a digital vaginal examination to assess cervical dilation"
        },
        {
          "key": "C",
          "text": "Monitor fetal heart rate continuously"
        },
        {
          "key": "D",
          "text": "Administer Rho(D) immune globulin if Rh-negative"
        }
      ],
      "answer": "B",
      "rationale": "Painless bright red bleeding suggests placenta previa. A digital vaginal exam can disrupt the placenta and cause catastrophic hemorrhage, so it is contraindicated - WAIT for the ultrasound before any vaginal exam. The other actions are appropriate.",
      "cjmm": "take-actions",
      "reference": "Section 18 · Maternity & Pediatrics (Q43-52)"
    },
    "pi_uterine_atony": {
      "id": "pi_uterine_atony",
      "stem": "Two hours after vaginal delivery, a client has saturated three perineal pads in 30 minutes. The fundus is boggy and displaced to the right. BP 96/58, HR 112. Which is the FIRST nursing action?",
      "options": [
        {
          "key": "A",
          "text": "Administer IV oxytocin per standing order"
        },
        {
          "key": "B",
          "text": "Perform fundal massage while supporting the lower uterine segment"
        },
        {
          "key": "C",
          "text": "Notify the provider"
        },
        {
          "key": "D",
          "text": "Empty the bladder via catheterization"
        }
      ],
      "answer": "B",
      "rationale": "A boggy uterus indicates atony - the number-one cause of postpartum hemorrhage. The first action is fundal massage. Then empty the bladder, which is displacing the uterus and preventing it from contracting, then give uterotonics (oxytocin first-line).",
      "cjmm": "take-actions",
      "reference": "Section 18 · Maternity & Pediatrics (Q43-52)"
    },
    "pi_neonatal_jaundice": {
      "id": "pi_neonatal_jaundice",
      "stem": "A 12-hour-old newborn has yellowing of the face and chest. Which is the most appropriate response?",
      "options": [
        {
          "key": "A",
          "text": "This is normal physiologic jaundice; no action needed"
        },
        {
          "key": "B",
          "text": "Jaundice in the first 24 hours is pathologic; notify provider for evaluation"
        },
        {
          "key": "C",
          "text": "Encourage early breastfeeding to prevent further jaundice"
        },
        {
          "key": "D",
          "text": "Position the infant in direct sunlight"
        }
      ],
      "answer": "B",
      "rationale": "Jaundice in the first 24 hours is ALWAYS pathologic until proven otherwise. Causes include hemolysis, sepsis, and internal hemorrhage. It warrants an urgent workup - bilirubin, Coombs, hemoglobin, blood type, and sepsis evaluation.",
      "cjmm": "recognize-cues",
      "reference": "Section 18 · Maternity & Pediatrics (Q43-52)"
    },
    "pi_toddler_speech": {
      "id": "pi_toddler_speech",
      "stem": "Which developmental finding in a 24-month-old child requires further evaluation?",
      "options": [
        {
          "key": "A",
          "text": "Walking with slightly unsteady gait"
        },
        {
          "key": "B",
          "text": "Saying only single words; no two-word phrases yet"
        },
        {
          "key": "C",
          "text": "Pointing to body parts on request"
        },
        {
          "key": "D",
          "text": "Stranger anxiety with unfamiliar adults"
        }
      ],
      "answer": "B",
      "rationale": "By 24 months, two-word phrases should be present, and their absence is a developmental red flag warranting evaluation (speech-language, autism screening). A slightly unsteady gait may still be normal at 24 months, and pointing to body parts and stranger anxiety are both appropriate.",
      "cjmm": "recognize-cues",
      "reference": "Section 18 · Maternity & Pediatrics (Q43-52)"
    },
    "pi_inhaled_steroid_vaccine": {
      "id": "pi_inhaled_steroid_vaccine",
      "stem": "A 12-month-old child is scheduled for MMR and varicella vaccines. The child takes inhaled corticosteroids for asthma. Which is most appropriate?",
      "options": [
        {
          "key": "A",
          "text": "Defer the vaccines because of corticosteroid use"
        },
        {
          "key": "B",
          "text": "Administer the vaccines as scheduled; inhaled corticosteroids are not a contraindication"
        },
        {
          "key": "C",
          "text": "Defer until the child has been off corticosteroids for 1 month"
        },
        {
          "key": "D",
          "text": "Give MMR only, defer varicella"
        }
      ],
      "answer": "B",
      "rationale": "Inhaled corticosteroids at typical doses do not cause systemic immunosuppression and are not a contraindication to live vaccines. The contraindication is severe immunocompromise - high-dose systemic steroids, chemotherapy, or HIV.",
      "cjmm": "generate-solutions",
      "reference": "Section 18 · Maternity & Pediatrics (Q43-52)"
    },
    "pi_epiglottitis": {
      "id": "pi_epiglottitis",
      "stem": "A 4-year-old presents with sudden high fever, drooling, muffled voice, and sits forward in tripod position. Which is the FIRST priority action?",
      "options": [
        {
          "key": "A",
          "text": "Obtain a throat swab for strep testing"
        },
        {
          "key": "B",
          "text": "Keep the child calm with the parent and notify ENT/anesthesia for controlled airway management"
        },
        {
          "key": "C",
          "text": "Place the child supine and administer racemic epinephrine"
        },
        {
          "key": "D",
          "text": "Lower the head of the bed"
        }
      ],
      "answer": "B",
      "rationale": "This is an epiglottitis presentation. It is critical to NOT examine the throat, NOT lay the child supine, and NOT agitate the child. Keep the child calm in a position of comfort and call ENT and anesthesia for controlled intubation in the OR.",
      "cjmm": "take-actions",
      "reference": "Section 18 · Maternity & Pediatrics (Q43-52)"
    },
    "pi_sickle_cell_hydration": {
      "id": "pi_sickle_cell_hydration",
      "stem": "A 6-year-old with sickle cell disease arrives in ED in vaso-occlusive crisis with pain 10/10, T 38.4°C, HR 132, SpO2 95%, dehydration signs. Which is the FIRST priority?",
      "options": [
        {
          "key": "A",
          "text": "Administer IV morphine"
        },
        {
          "key": "B",
          "text": "Initiate IV fluids (normal saline)"
        },
        {
          "key": "C",
          "text": "Apply supplemental oxygen"
        },
        {
          "key": "D",
          "text": "Obtain blood cultures"
        }
      ],
      "answer": "B",
      "rationale": "Hydration is FIRST in sickle cell crisis - it dilutes the blood, reduces viscosity, and reduces sickling. Pain medication follows. Oxygen is given if the patient is hypoxic (an SpO2 of 95% is borderline and lower priority), and antibiotics are given for fever because of functional asplenia.",
      "cjmm": "prioritize-hypotheses",
      "reference": "Section 18 · Maternity & Pediatrics (Q43-52)"
    },
    "pi_pediatric_late_hypotension": {
      "id": "pi_pediatric_late_hypotension",
      "stem": "A 6-month-old with severe dehydration shows: HR 178, BP 88/54, capillary refill 4 sec, sunken fontanelle, lethargic, mottled extremities. Which interpretation is correct?",
      "options": [
        {
          "key": "A",
          "text": "The normal BP is reassuring; mild dehydration"
        },
        {
          "key": "B",
          "text": "The findings overall indicate severe dehydration with impending shock; BP is a late sign and the maintained BP is the last compensatory mechanism"
        },
        {
          "key": "C",
          "text": "The capillary refill is unrelated to dehydration severity"
        },
        {
          "key": "D",
          "text": "Mottling is normal in dehydrated infants"
        }
      ],
      "answer": "B",
      "rationale": "Pediatric BP appears 'normal' until decompensated shock. The HR of 178, capillary refill of 4 seconds, sunken fontanelle, mottling, and lethargy all indicate severe dehydration with impending decompensation. Hypotension is a LATE sign.",
      "cjmm": "analyze-cues",
      "reference": "Section 18 · Maternity & Pediatrics (Q43-52)"
    },
    "pi_therapeutic_validate_invite": {
      "id": "pi_therapeutic_validate_invite",
      "stem": "A client diagnosed with stage IV pancreatic cancer says quietly, 'I don't know how I'm going to tell my children.' Which response is therapeutic?",
      "options": [
        {
          "key": "A",
          "text": "Don't worry, your children will understand"
        },
        {
          "key": "B",
          "text": "You should ask the social worker to help with that conversation"
        },
        {
          "key": "C",
          "text": "That sounds like a difficult conversation to face. Tell me what you're thinking"
        },
        {
          "key": "D",
          "text": "Why are you worried? They're adults, aren't they?"
        }
      ],
      "answer": "C",
      "rationale": "The therapeutic answer validates and invites. A is false reassurance plus a cliche, B is giving advice, and D is a 'why' question that puts the client on the defensive. C uses the validation-plus-open-ended pattern.",
      "cjmm": "take-actions",
      "reference": "Section 18 · Mental Health (Q53-57)"
    },
    "pi_sudden_mood_improvement": {
      "id": "pi_sudden_mood_improvement",
      "stem": "A hospitalized client with severe depression and suicidal ideation has been tearful for 4 days. This morning the client appears cheerful, well-groomed, and reports 'I feel so much better. I figured everything out.' Which is the nurse's priority action?",
      "options": [
        {
          "key": "A",
          "text": "Document improvement and reduce observation frequency"
        },
        {
          "key": "B",
          "text": "Maintain close observation and notify provider; sudden mood improvement may indicate decision to act"
        },
        {
          "key": "C",
          "text": "Encourage the client to share what they figured out"
        },
        {
          "key": "D",
          "text": "Begin discharge planning"
        }
      ],
      "answer": "B",
      "rationale": "Sudden mood improvement in a previously suicidal patient is a WARNING SIGN - the patient may have decided on suicide and is experiencing relief from resolved ambivalence. Maintain close observation and notify the provider.",
      "cjmm": "evaluate-outcomes",
      "reference": "Section 18 · Mental Health (Q53-57)"
    },
    "pi_schizophrenia_hallucination": {
      "id": "pi_schizophrenia_hallucination",
      "stem": "A client with schizophrenia is admitted and appears to be responding to internal stimuli. The client says, 'The voices are telling me you are going to poison my food.' Which response is most therapeutic?",
      "options": [
        {
          "key": "A",
          "text": "The voices are not real. No one is going to poison your food"
        },
        {
          "key": "B",
          "text": "I understand. I won't come near your food"
        },
        {
          "key": "C",
          "text": "I don't hear the voices you're hearing, but I can see they are frightening you. What are the voices saying?"
        },
        {
          "key": "D",
          "text": "Why do you think the voices are saying that?"
        }
      ],
      "answer": "C",
      "rationale": "The therapeutic answer acknowledges the patient's experience as real to them without validating the hallucination as real, and it assesses for command hallucinations, especially harm-related ones. A argues with the patient, B colludes with the delusion, and D is a 'why' question.",
      "cjmm": "take-actions",
      "reference": "Section 18 · Mental Health (Q53-57)"
    },
    "pi_delirium_tremens": {
      "id": "pi_delirium_tremens",
      "stem": "A 54-year-old client with chronic alcohol use disorder stopped drinking 3 days ago and is admitted with confusion, hallucinations, tremor, T 38.4, HR 132, BP 168/98. Glucose 68. Which is the FIRST priority intervention?",
      "options": [
        {
          "key": "A",
          "text": "Administer IV D50 for hypoglycemia"
        },
        {
          "key": "B",
          "text": "Administer IV thiamine BEFORE giving glucose"
        },
        {
          "key": "C",
          "text": "Administer IV lorazepam"
        },
        {
          "key": "D",
          "text": "Apply physical restraints"
        }
      ],
      "answer": "B",
      "rationale": "This is delirium tremens. Give IV thiamine BEFORE glucose to prevent Wernicke encephalopathy in alcoholic patients. Then give glucose, then benzodiazepines for withdrawal management.",
      "cjmm": "prioritize-hypotheses",
      "reference": "Section 18 · Mental Health (Q53-57)"
    },
    "pi_serotonin_vs_nms": {
      "id": "pi_serotonin_vs_nms",
      "stem": "A 72-year-old client on chronic sertraline started tramadol yesterday. Today presents with T 38.9, HR 124, BP 168/102, agitation, confusion, clonus, hyperreflexia. Which condition is most likely?",
      "options": [
        {
          "key": "A",
          "text": "Neuroleptic malignant syndrome (NMS)"
        },
        {
          "key": "B",
          "text": "Serotonin syndrome"
        },
        {
          "key": "C",
          "text": "Anticholinergic toxicity"
        },
        {
          "key": "D",
          "text": "Septic shock"
        }
      ],
      "answer": "B",
      "rationale": "This is the classic serotonin syndrome triad - autonomic instability, mental status changes, and neuromuscular hyperactivity with CLONUS and hyperreflexia - caused by sertraline (an SSRI) plus tramadol (serotonergic). NMS, by contrast, has lead-pipe rigidity instead of clonus and requires antipsychotic exposure.",
      "cjmm": "analyze-cues",
      "reference": "Section 18 · Mental Health (Q53-57)"
    },
    "pi_ppe_doffing": {
      "id": "pi_ppe_doffing",
      "stem": "A nurse is leaving the room of a patient on contact and droplet precautions wearing gown, gloves, mask, and goggles. Which sequence of PPE removal is correct?",
      "options": [
        {
          "key": "A",
          "text": "Mask, goggles, gown, gloves, hand hygiene"
        },
        {
          "key": "B",
          "text": "Gloves, goggles, gown, mask, hand hygiene"
        },
        {
          "key": "C",
          "text": "Gown, gloves, mask, goggles, hand hygiene"
        },
        {
          "key": "D",
          "text": "Hand hygiene, gloves, mask, goggles, gown"
        }
      ],
      "answer": "B",
      "rationale": "The PPE doffing principle is most contaminated first: gloves (most contaminated, touched patient and surfaces), then goggles, then gown, then mask (least contaminated, near the face), then hand hygiene.",
      "cjmm": "take-actions",
      "reference": "Section 18 · Infection Control & Safety (Q58-65)"
    },
    "pi_cdiff_handwashing": {
      "id": "pi_cdiff_handwashing",
      "stem": "Which hand hygiene method is required after caring for a patient with Clostridioides difficile?",
      "options": [
        {
          "key": "A",
          "text": "Alcohol-based hand sanitizer alone"
        },
        {
          "key": "B",
          "text": "Soap and water"
        },
        {
          "key": "C",
          "text": "Either alcohol-based or soap and water"
        },
        {
          "key": "D",
          "text": "Bleach solution"
        }
      ],
      "answer": "B",
      "rationale": "Alcohol does NOT kill C. diff spores, so soap and water hand hygiene is required. Environmental cleaning uses bleach or other sporicidal agents.",
      "cjmm": "take-actions",
      "reference": "Section 18 · Infection Control & Safety (Q58-65)"
    },
    "pi_varicella_isolation": {
      "id": "pi_varicella_isolation",
      "stem": "A 6-year-old with chickenpox is admitted. Which type of isolation is required?",
      "options": [
        {
          "key": "A",
          "text": "Contact precautions only"
        },
        {
          "key": "B",
          "text": "Droplet precautions only"
        },
        {
          "key": "C",
          "text": "Airborne precautions only"
        },
        {
          "key": "D",
          "text": "Airborne plus contact precautions"
        }
      ],
      "answer": "D",
      "rationale": "Varicella requires AIRBORNE plus CONTACT precautions - the lesions spread by contact and the disease also spreads via airborne route. Use a negative pressure room, an N95, and gown and gloves. The same applies to disseminated zoster.",
      "cjmm": "generate-solutions",
      "reference": "Section 18 · Infection Control & Safety (Q58-65)"
    },
    "pi_restraints_last_resort": {
      "id": "pi_restraints_last_resort",
      "stem": "An 82-year-old client with delirium is pulling at the IV. Bed alarm and proximity to nursing station are in place; family is unavailable. Which is the BEST next action?",
      "options": [
        {
          "key": "A",
          "text": "Apply soft wrist restraints immediately"
        },
        {
          "key": "B",
          "text": "Administer haloperidol as chemical restraint without order"
        },
        {
          "key": "C",
          "text": "Assess for treatable causes of delirium (pain, hypoxia, urinary retention, infection, medications) and continue less restrictive interventions"
        },
        {
          "key": "D",
          "text": "Apply vest restraint and obtain a provider order within 1 hour"
        }
      ],
      "answer": "C",
      "rationale": "Less restrictive alternatives must be exhausted before restraints, and treatable causes of the delirium must be addressed. Restraints are a last resort, and chemical restraint without an order is never appropriate.",
      "cjmm": "generate-solutions",
      "reference": "Section 18 · Infection Control & Safety (Q58-65)"
    },
    "pi_kcl_administration_2": {
      "id": "pi_kcl_administration_2",
      "stem": "A client with serum potassium 2.6 mEq/L is ordered KCl 40 mEq. Which administration is correct?",
      "options": [
        {
          "key": "A",
          "text": "IV push over 1 minute"
        },
        {
          "key": "B",
          "text": "IV push over 5 minutes through central line"
        },
        {
          "key": "C",
          "text": "Diluted in 1 L IV fluid, infused via pump over 4 hours"
        },
        {
          "key": "D",
          "text": "Rapid IV bolus through peripheral line"
        }
      ],
      "answer": "C",
      "rationale": "KCl is NEVER given IV push under any circumstance - it is always diluted and given via continuous pump infusion. The peripheral maximum is 10 mEq/hr, and the central maximum is higher per institution.",
      "cjmm": "take-actions",
      "reference": "Section 18 · Infection Control & Safety (Q58-65)"
    },
    "pi_incident_report_charting": {
      "id": "pi_incident_report_charting",
      "stem": "After a fall event, the nurse documents in the patient's medical record. Which entry is INCORRECT?",
      "options": [
        {
          "key": "A",
          "text": "Patient found on floor at 0230, alert and oriented, denies head injury"
        },
        {
          "key": "B",
          "text": "Vital signs stable; assessment performed; provider notified"
        },
        {
          "key": "C",
          "text": "Incident report completed"
        },
        {
          "key": "D",
          "text": "Family notified at 0245 per their request"
        }
      ],
      "answer": "C",
      "rationale": "NEVER document 'incident report completed' in the patient's chart. Incident reports are internal quality-improvement documents separate from the medical record, and documenting them in the chart compromises their legal protection. The other entries are objective and appropriate.",
      "cjmm": "take-actions",
      "reference": "Section 18 · Infection Control & Safety (Q58-65)"
    },
    "pi_anticoag_fall_ct": {
      "id": "pi_anticoag_fall_ct",
      "stem": "A 78-year-old client on apixaban for AFib has an unwitnessed fall in the bathroom with a small forehead abrasion. Alert and oriented, denies head injury, stable vitals. Which is the FIRST priority?",
      "options": [
        {
          "key": "A",
          "text": "Help client back to bed and document"
        },
        {
          "key": "B",
          "text": "Notify provider and prepare for CT head"
        },
        {
          "key": "C",
          "text": "Apply ice to the abrasion"
        },
        {
          "key": "D",
          "text": "Reassess in 4 hours"
        }
      ],
      "answer": "B",
      "rationale": "An anticoagulated patient with a head impact needs an urgent CT to rule out intracranial hemorrhage, even when the injury is minor and the patient appears asymptomatic. Anticoagulation plus head injury is the key pattern.",
      "cjmm": "prioritize-hypotheses",
      "reference": "Section 18 · Infection Control & Safety (Q58-65)"
    },
    "pi_tb_room_placement": {
      "id": "pi_tb_room_placement",
      "stem": "A patient with active tuberculosis is admitted. Which room placement is required?",
      "options": [
        {
          "key": "A",
          "text": "Standard private room"
        },
        {
          "key": "B",
          "text": "Positive pressure room with HEPA-filtered air"
        },
        {
          "key": "C",
          "text": "Negative pressure room with door kept closed"
        },
        {
          "key": "D",
          "text": "Shared room with cohort if not contagious"
        }
      ],
      "answer": "C",
      "rationale": "TB requires airborne precautions in a negative pressure room with the door kept closed, and an N95 respirator is required for entry. Positive pressure rooms are for immunocompromised patients (protective environment), not infectious patients.",
      "cjmm": "generate-solutions",
      "reference": "Section 18 · Infection Control & Safety (Q58-65)"
    },
    "pi_delegate_uap": {
      "id": "pi_delegate_uap",
      "stem": "Which task is most appropriate to delegate to the unlicensed assistive personnel (UAP)?",
      "options": [
        {
          "key": "A",
          "text": "Initial assessment of a newly admitted patient with chest pain"
        },
        {
          "key": "B",
          "text": "Administration of oral metoprolol to a stable patient"
        },
        {
          "key": "C",
          "text": "Vital signs on a stable 2-day post-op patient"
        },
        {
          "key": "D",
          "text": "Reinforcement of diabetes teaching"
        }
      ],
      "answer": "C",
      "rationale": "A UAP can take vital signs on stable patients. A is RN-only (initial assessment), B is medication administration (LPN/RN), and D is teaching reinforcement (an LPN can, a UAP cannot).",
      "cjmm": "generate-solutions",
      "reference": "Section 18 · Management of Care (Q66-75)"
    },
    "pi_delegate_lpn": {
      "id": "pi_delegate_lpn",
      "stem": "Which assignment is most appropriate to delegate to the LPN?",
      "options": [
        {
          "key": "A",
          "text": "Newly admitted patient requiring initial assessment"
        },
        {
          "key": "B",
          "text": "Patient receiving IV push morphine for pain"
        },
        {
          "key": "C",
          "text": "Stable patient needing routine urinary catheter insertion for surgery"
        },
        {
          "key": "D",
          "text": "Patient requiring discharge teaching for new diabetes diagnosis"
        }
      ],
      "answer": "C",
      "rationale": "Catheter insertion in a stable patient is within LPN scope. A (initial assessment) is RN-only, B (IV push) is typically RN-only, and D (initial teaching) is RN-only.",
      "cjmm": "generate-solutions",
      "reference": "Section 18 · Management of Care (Q66-75)"
    },
    "pi_cannot_delegate_assessment": {
      "id": "pi_cannot_delegate_assessment",
      "stem": "Which task can NOT be delegated by the RN to either LPN or UAP?",
      "options": [
        {
          "key": "A",
          "text": "Vital signs on a stable patient"
        },
        {
          "key": "B",
          "text": "Initial patient assessment of a newly admitted patient"
        },
        {
          "key": "C",
          "text": "Oral medication administration"
        },
        {
          "key": "D",
          "text": "Bed bath"
        }
      ],
      "answer": "B",
      "rationale": "Initial assessment requires nursing judgment and cannot be delegated. The mnemonic A PIE T captures what cannot be delegated: Assessment, Planning, Implementation requiring judgment, Evaluation, and initial Teaching.",
      "cjmm": "generate-solutions",
      "reference": "Section 18 · Management of Care (Q66-75)"
    },
    "pi_assess_first_priority": {
      "id": "pi_assess_first_priority",
      "stem": "A nurse begins shift with four patients. Which should be assessed FIRST?",
      "options": [
        {
          "key": "A",
          "text": "78-year-old admitted yesterday with pneumonia awaiting discharge teaching, stable"
        },
        {
          "key": "B",
          "text": "56-year-old post-op day 1 from TKR with pain 7/10"
        },
        {
          "key": "C",
          "text": "65-year-old post-op day 1 abdominal surgery reporting new shortness of breath and chest tightness"
        },
        {
          "key": "D",
          "text": "48-year-old admitted yesterday with DKA, glucose now 180, stable on insulin drip"
        }
      ],
      "answer": "C",
      "rationale": "New shortness of breath and chest tightness in a post-op patient is unexpected - possible PE. This patient is unstable, unexpected, and an ABC concern, which outranks the stable patient awaiting teaching (A), the expected post-op pain (B), and the actively managed stable patient (D).",
      "cjmm": "prioritize-hypotheses",
      "reference": "Section 18 · Management of Care (Q66-75)"
    },
    "pi_informed_consent_witness": {
      "id": "pi_informed_consent_witness",
      "stem": "A pre-operative patient about to sign surgical consent says, 'My doctor mentioned a tumor, but I don't really understand what they're going to remove or what the risks are.' Which is the nurse's priority action?",
      "options": [
        {
          "key": "A",
          "text": "Explain the procedure and risks to the patient"
        },
        {
          "key": "B",
          "text": "Reassure the patient the surgeon is experienced"
        },
        {
          "key": "C",
          "text": "Notify the surgeon that the patient needs further explanation before consent"
        },
        {
          "key": "D",
          "text": "Have the patient sign withdrawal of consent"
        }
      ],
      "answer": "C",
      "rationale": "The nurse is the WITNESS to consent, not the provider of medical information about the procedure. Notify the provider for re-explanation. Without understanding, the consent is not valid.",
      "cjmm": "take-actions",
      "reference": "Section 18 · Management of Care (Q66-75)"
    },
    "pi_social_media_hipaa": {
      "id": "pi_social_media_hipaa",
      "stem": "A nurse posts on personal social media: 'Tough day. Lost a patient - heart attack while we were doing CPR. So sad for the family.' No names are used. Which statement is correct?",
      "options": [
        {
          "key": "A",
          "text": "Acceptable because no names are used"
        },
        {
          "key": "B",
          "text": "Acceptable because no medical record information is shared"
        },
        {
          "key": "C",
          "text": "May still be a HIPAA violation if details could identify the patient"
        },
        {
          "key": "D",
          "text": "Acceptable because the post is on a personal account"
        }
      ],
      "answer": "C",
      "rationale": "Even without explicit names, the post may be a violation if the combination of details - time, location, mechanism, demographics - could allow identification. The 'no names' defense does not protect against a HIPAA violation.",
      "cjmm": "evaluate-outcomes",
      "reference": "Section 18 · Management of Care (Q66-75)"
    },
    "pi_full_code_default": {
      "id": "pi_full_code_default",
      "stem": "A 68-year-old patient with no documented advance directive collapses with cardiac arrest in the hospital. What is the team's appropriate response?",
      "options": [
        {
          "key": "A",
          "text": "Wait to ask family about the patient's wishes before starting CPR"
        },
        {
          "key": "B",
          "text": "Do not resuscitate; assume patient would not want aggressive care at age 68"
        },
        {
          "key": "C",
          "text": "Initiate full code resuscitation"
        },
        {
          "key": "D",
          "text": "Perform comfort care only"
        }
      ],
      "answer": "C",
      "rationale": "The default is FULL CODE in the absence of a documented DNR or other limitation. Family wishes or assumed preferences do not limit resuscitation without orders.",
      "cjmm": "take-actions",
      "reference": "Section 18 · Management of Care (Q66-75)"
    },
    "pi_elder_abuse_reporting": {
      "id": "pi_elder_abuse_reporting",
      "stem": "A 70-year-old woman is brought to ED by her son with multiple bruises in various stages of healing, poor hygiene, malnutrition, and disorientation. The son explains all bruises as 'falls.' Which is the nurse's responsibility?",
      "options": [
        {
          "key": "A",
          "text": "Document findings and discharge home with the son after medical clearance"
        },
        {
          "key": "B",
          "text": "Report suspected elder abuse to Adult Protective Services and notify provider"
        },
        {
          "key": "C",
          "text": "Confront the son about the suspicious findings"
        },
        {
          "key": "D",
          "text": "Wait to gather more evidence before any reporting"
        }
      ],
      "answer": "B",
      "rationale": "Nurses are mandatory reporters of suspected elder abuse, and reasonable suspicion is the threshold. Adult Protective Services receives the report, and documentation must be objective. The nurse does not wait for proof or confront the suspected abuser.",
      "cjmm": "take-actions",
      "reference": "Section 18 · Management of Care (Q66-75)"
    },
    "pi_stop_the_line": {
      "id": "pi_stop_the_line",
      "stem": "A nurse believes a physician's order is unsafe for the patient (medication overdose). The nurse should:",
      "options": [
        {
          "key": "A",
          "text": "Administer the medication as ordered to avoid conflict"
        },
        {
          "key": "B",
          "text": "Document the concern in the chart but administer the medication"
        },
        {
          "key": "C",
          "text": "Stop, contact the provider to clarify, and not administer if the concern is not resolved"
        },
        {
          "key": "D",
          "text": "Have another nurse administer the medication"
        }
      ],
      "answer": "C",
      "rationale": "This is 'stop the line' - the nurse who believes an order is unsafe must verify with the provider and not administer if the concern is unresolved. Patient safety supersedes hierarchy. Document the clarification process, and if it remains unresolved, use the chain of command.",
      "cjmm": "take-actions",
      "reference": "Section 18 · Management of Care (Q66-75)"
    },
    "pi_ngn_bowtie": {
      "id": "pi_ngn_bowtie",
      "stem": "On an NGN bowtie item, the patient condition appears in the center with predisposing factors/cues on one side and interventions on the other. What is the best test-taking approach?",
      "options": [
        {
          "key": "A",
          "text": "Work both sides simultaneously, balancing them"
        },
        {
          "key": "B",
          "text": "Work each side independently, then verify the diagnosis in the middle ties them together"
        },
        {
          "key": "C",
          "text": "Focus only on the interventions side"
        },
        {
          "key": "D",
          "text": "Skip and come back later"
        }
      ],
      "answer": "B",
      "rationale": "Independent evaluation of each side, with diagnosis verification, ensures comprehensive reasoning. Apply CJMM throughout. Bowtie items test the integration of cues with appropriate actions.",
      "cjmm": "generate-solutions",
      "reference": "Section 18 · Management of Care (Q66-75)"
    }
  },
  "segments": [
    {
      "id": "welcome-frame",
      "minutes": "0-3",
      "title": "Welcome & frame the simulation as diagnostic",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Welcome to Hour 18. This is the full simulation: seventy-five questions, ninety minutes, mixed content, with NGN and standard items together. This hour is built differently from every lecture hour you've done so far. My job at the start is to frame what's coming, then to monitor silently while you work, and to debrief with you at the end. The real substance of this hour is the simulation itself and the answer key with rationales that we'll walk through together afterward."
        },
        {
          "kind": "p",
          "text": "Before we start, let me name what some of you are feeling, which is anxiety, and tell you plainly that it is normal. This simulation matters far less than your actual test day, because it is practice. You are not being graded against pass-fail criteria here. The entire point of today is to identify the areas you need to focus on in Hour 19 and to build the endurance and confidence you'll carry into the real exam."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Today is information, not a verdict",
          "text": "If you do poorly today, that is INFORMATION, not a failure. We use that information tomorrow to fix the gaps. Many learners discover today exactly what they need to drill, and they end up doing better on the real exam precisely because of today's simulation. Treat it as diagnostic, not as a judgment on whether you'll pass."
        }
      ]
    },
    {
      "id": "pacing-strategy",
      "minutes": "3-8",
      "title": "Pacing, strategy, flagging, and NGN approach",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "h",
          "text": "Pacing"
        },
        {
          "kind": "p",
          "text": "Let's talk about pacing first, because it's the muscle this simulation is really training. The actual NCLEX gives you about 5 hours for up to 150 questions, which works out to roughly 2 minutes per question on average. Today we have 90 minutes for 75 questions, which is about 72 seconds per question. That is deliberately tighter than the real exam, because the pressure is the point. If you can land good answers at 72 seconds per question today, you will feel comfortable at 2 minutes per question on test day."
        },
        {
          "kind": "h",
          "text": "Reading strategy"
        },
        {
          "kind": "p",
          "text": "Your strategy on each item is simple and repeatable. Read the question stem first to identify exactly what is being asked. Then read the options. Eliminate the answers that are clearly wrong. Make your best choice from what remains, and move on. Do not re-read the stem five times; identify the ask, work the options, commit."
        },
        {
          "kind": "h",
          "text": "Flagging"
        },
        {
          "kind": "p",
          "text": "You are going to see questions you don't know, and that is expected. When you hit one, pick your best answer based on principles - usually safety, ABC, or therapeutic communication patterns - then flag it and move on. The discipline here is what protects your score."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Never burn 3 minutes on one question",
          "text": "Do NOT spend 3 minutes on a single question. If you do, you will run out of time on questions you actually could have answered. Pick a principled best answer, flag it, and keep moving. Time spent stuck is time stolen from winnable items."
        },
        {
          "kind": "h",
          "text": "NGN item types"
        },
        {
          "kind": "p",
          "text": "For NGN items, the format may feel unfamiliar, but the reasoning is the same reasoning you've practiced all bootcamp. Apply the clinical judgment measurement model: recognize cues, analyze cues, prioritize hypotheses, generate solutions, take action, and evaluate outcomes. The shell of the item changes; the thinking does not."
        },
        {
          "kind": "list",
          "items": [
            "Multiple-response items: evaluate each option independently against the question's criterion. Do not assume there is a specific number of correct answers.",
            "Cloze and drop-down items: read the full sentence first, then evaluate each drop-down independently rather than guessing from the first one."
          ]
        }
      ]
    },
    {
      "id": "rules-logistics",
      "minutes": "8-13",
      "title": "Rules, logistics, and finishing-early discipline",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "h",
          "text": "Rules"
        },
        {
          "kind": "p",
          "text": "Here are the rules for the next 90 minutes. No talking. No looking at anyone else's test. No phones - they are off and out of sight. Water and tissues are at the back of the room. Restroom breaks are one at a time: raise your hand and wait for me to acknowledge you before you go. The clock is on the wall, and when the timer hits zero, pencils down."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "If you finish early, stay seated and keep working",
          "text": "If you finish before time is called, do not get up. Review your flagged questions. Check your answer sheet for missed bubbles. If you still have time, recheck a sampling of your answers. Do not leave until the timer hits zero - the extra minutes are yours to use."
        },
        {
          "kind": "p",
          "text": "After the simulation we'll take a 10-minute break and then come back together for the debrief. In the debrief we'll go through the questions the cohort most often missed, identify the patterns behind those misses, and plan tomorrow's targeted review. Bring your answer sheets to the debrief, because you'll be marking your own."
        }
      ]
    },
    {
      "id": "settle-start",
      "minutes": "13-15",
      "title": "Settle, breathe, and start",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Take a breath. You have done the work to get here. Trust your preparation. When you're in doubt, pick the safest answer. And when two answers both seem right, pick the one that addresses the most immediate need - that single rule resolves a surprising number of hard items."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Two decision rules to carry through all 75 items",
          "text": "When in doubt, choose the SAFEST answer. When two answers seem right, choose the one that addresses the MOST IMMEDIATE need. Keep both rules in your back pocket for every question where you feel stuck."
        },
        {
          "kind": "p",
          "text": "Question booklets and answer sheets on your desk. Pencils up. The timer starts when I say go. Ninety minutes. Good luck."
        }
      ]
    },
    {
      "id": "sim-pharmacology",
      "minutes": "15-30",
      "title": "Simulation block 1 - Pharmacology (Q1-12)",
      "format": "Case",
      "blocks": [
        {
          "kind": "p",
          "text": "This is the pharmacology block of the simulation, questions 1 through 12. Work it silently and at pace. The items in this block are calibrated to moderate-to-hard NCLEX difficulty and they cluster around the high-yield drug-safety patterns this bootcamp has emphasized: drug interactions that drive toxicity, the antidotes and the order of actions when toxicity appears, black box warnings, therapeutic drug levels and their toxicity signs, and the never-events of medication administration."
        },
        {
          "kind": "list",
          "items": [
            "Lithium toxicity precipitated by a thiazide diuretic - confusion, ataxia, slurred speech, coarse tremor.",
            "Warfarin teaching and the consistency principle for vitamin K-rich foods.",
            "Therapeutic aPTT on heparin: 1.5-2.5 times the control.",
            "The SSRI black box warning in patients under 25, early in treatment.",
            "Magnesium toxicity in preeclampsia: stop the infusion, calcium gluconate is the antidote.",
            "Serotonin syndrome risk from tramadol plus an SSRI.",
            "Supratherapeutic phenytoin (therapeutic 10-20 mcg/mL) with ataxia and nystagmus.",
            "Digoxin toxicity potentiated by hypokalemia, with yellow halos.",
            "ACE inhibitor dry cough and the ARB switch.",
            "Rapid-acting insulin (lispro) peak at 1-2 hours.",
            "MAOI plus tyramine-containing foods and hypertensive crisis.",
            "KCl is NEVER given IV push - always diluted, always by pump."
          ]
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Reason through the block, then check against the key",
          "text": "For each item, identify the ask, apply the safety or toxicity principle, eliminate, and commit at pace. The full rationale for every question in this block is in the practice item attached to this segment and in the answer key you'll use during the debrief."
        }
      ],
      "practiceItemId": "pi_lithium_thiazide"
    },
    {
      "id": "sim-cardio-resp-labs",
      "minutes": "30-48",
      "title": "Simulation block 2 - Cardiovascular, Respiratory, Labs (Q13-27)",
      "format": "Case",
      "blocks": [
        {
          "kind": "p",
          "text": "This is the cardiovascular, respiratory, and lab-values block, questions 13 through 27 - the largest single block at fifteen questions. It leans heavily on recognizing emergencies and acting in the right order: atypical MI presentations, time-critical goals like door-to-balloon, the SPFON-style priority sequences, acid-base interpretation using ROME, and the cardiac emergencies where the first move stabilizes the membrane before anything else."
        },
        {
          "kind": "list",
          "items": [
            "Atypical MI in an elderly diabetic woman - ECG and troponin first.",
            "STEMI door-to-balloon goal under 90 minutes.",
            "Left-sided heart failure: crackles, pink frothy sputum, JVD.",
            "CHA2DS2-VASc of 4 - anticoagulation, not aspirin alone.",
            "Hypertensive emergency with end-organ symptoms - IV antihypertensives.",
            "DVT prevention bundle: ambulation, SCDs, LMWH together.",
            "Post-op day 3 PE - sudden dyspnea, tachycardia, chest pain.",
            "COPD ABG: respiratory acidosis with metabolic compensation.",
            "Tension pneumothorax - needle decompression before imaging.",
            "TB therapy needs pyridoxine (B6) to prevent INH neuropathy.",
            "ABG respiratory alkalosis via ROME.",
            "Hyperkalemia with peaked T waves - calcium gluconate first.",
            "Severe symptomatic hyponatremia in SIADH - 3% hypertonic saline, corrected slowly.",
            "Anaphylaxis - epinephrine IM first.",
            "Chest tube tidaling that suddenly stops - suspect obstruction."
          ]
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "First action items reward the membrane-stabilizing or life-saving move",
          "text": "Across this block, the 'FIRST action' questions reward the intervention that prevents imminent death or arrest - calcium gluconate to stabilize the cardiac membrane in hyperkalemia, needle decompression in tension pneumothorax, epinephrine IM in anaphylaxis - not the slower adjunct or the confirmatory test."
        }
      ],
      "practiceItemId": "pi_atypical_mi"
    },
    {
      "id": "sim-endo-renal-gi-neuro-msk",
      "minutes": "48-66",
      "title": "Simulation block 3 - Endocrine, Renal, GI, Neuro, MSK (Q28-42)",
      "format": "Case",
      "blocks": [
        {
          "kind": "p",
          "text": "This is the endocrine, renal, GI, neuro, and musculoskeletal block, questions 28 through 42 - another fifteen-question block spanning physiological adaptation across systems. It is dense with sequence-of-action items and look-alike conditions you have to distinguish: which step comes first in DKA, the contrasting pictures of DI versus SIADH, the neuro emergencies where the first action is positional, and the orthopedic complications where the earliest sign is the one you must not miss."
        },
        {
          "kind": "list",
          "items": [
            "DKA with K+ 3.0 - replace potassium BEFORE insulin.",
            "Thyroid storm - beta blocker and thionamide first, iodine later.",
            "Iatrogenic Cushing's from chronic steroids; never stop abruptly.",
            "Diabetes insipidus after TBI - dilute urine, hypernatremia.",
            "Prerenal AKI - BUN/Cr >20:1, FENa <1%.",
            "AV fistula precautions and daily thrill/bruit checks.",
            "Lactulose effectiveness: reduced ammonia, improved mentation, 2-3 soft stools/day.",
            "Acute pancreatitis pain - epigastric, radiating to back, better leaning forward.",
            "Acute ischemic stroke - lower BP below 185/110 for tPA eligibility.",
            "Cushing's triad - hypertension with widened pulse pressure, bradycardia, irregular respirations.",
            "Status epilepticus - IV benzodiazepine first-line.",
            "Autonomic dysreflexia (T4) - sit up, check the bladder first.",
            "Cholinergic crisis from excess pyridostigmine - atropine, hold the drug.",
            "Compartment syndrome - pain with passive stretch is earliest; pulses present don't rule it out.",
            "Fat embolism - hypoxia, petechiae, altered mentation 24-72 hr after long-bone fracture."
          ]
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Distinguish the look-alikes by their cues",
          "text": "Several items in this block hinge on telling apart conditions that share features: DI (dilute urine, high sodium) versus SIADH (concentrated urine, low sodium); thyroid storm versus its mimics; cholinergic crisis (SLUDGE, pinpoint pupils, recent extra dose) as the cause of weakness in myasthenia gravis. Let the specific cues, not the broad category, drive your answer."
        }
      ],
      "practiceItemId": "pi_dka_potassium_first"
    },
    {
      "id": "sim-maternity-peds",
      "minutes": "66-78",
      "title": "Simulation block 4 - Maternity & Pediatrics (Q43-52)",
      "format": "Case",
      "blocks": [
        {
          "kind": "p",
          "text": "This is the maternity and pediatrics block, questions 43 through 52. It tests the obstetric emergencies where the first action and the contraindicated action are both being assessed, plus the pediatric red flags that separate normal development and reassuring vitals from impending decompensation. Watch especially for the items where the 'normal-looking' finding is actually the trap."
        },
        {
          "kind": "list",
          "items": [
            "Magnesium toxicity in preeclampsia - stop infusion, calcium gluconate antidote.",
            "Late decelerations on oxytocin - SPFON, stop the oxytocin first.",
            "Painless bright red bleeding (placenta previa) - NO digital vaginal exam.",
            "Postpartum hemorrhage from a boggy uterus - fundal massage first.",
            "Jaundice in the first 24 hours is always pathologic.",
            "No two-word phrases at 24 months - developmental red flag.",
            "Inhaled corticosteroids are not a contraindication to live vaccines.",
            "Epiglottitis - keep calm, do not examine the throat, call ENT/anesthesia.",
            "Sickle cell vaso-occlusive crisis - hydration first.",
            "Severe pediatric dehydration - a 'normal' BP is a late, ominous sign."
          ]
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Beware the reassuring-looking finding",
          "text": "Two items in this block deliberately dangle a normal-appearing finding to test whether you know the rule: in the dehydrated infant, the maintained BP is the LAST compensatory mechanism and hypotension is a late sign; and in epiglottitis, the urge to examine the throat or lay the child down is exactly what you must NOT do. Recognize the late-hypotension rule and the do-not-agitate rule."
        }
      ],
      "practiceItemId": "pi_mag_stop_infusion"
    },
    {
      "id": "sim-mental-health",
      "minutes": "78-84",
      "title": "Simulation block 5 - Mental Health (Q53-57)",
      "format": "Case",
      "blocks": [
        {
          "kind": "p",
          "text": "This is the mental health block, questions 53 through 57. It centers on therapeutic communication patterns and on two safety recognitions that the exam loves: the warning sign of sudden mood improvement in a suicidal patient, and the medical emergencies hiding inside psychiatric presentations, including delirium tremens and serotonin syndrome."
        },
        {
          "kind": "list",
          "items": [
            "Therapeutic response: validate plus invite, not false reassurance, advice, or 'why' questions.",
            "Sudden cheerfulness in a previously suicidal patient - a warning sign, maintain close observation.",
            "Schizophrenia hallucination - acknowledge the experience without validating it; assess for command hallucinations.",
            "Delirium tremens - thiamine BEFORE glucose.",
            "Serotonin syndrome (clonus, hyperreflexia) versus NMS (lead-pipe rigidity)."
          ]
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "The validate-plus-invite pattern",
          "text": "For therapeutic communication items, the right answer almost always validates the patient's feeling and then opens the door with an invitation to say more. Eliminate false reassurance, cliches, advice-giving, and 'why' questions - those distractors are written to feel kind but are not therapeutic."
        }
      ],
      "practiceItemId": "pi_therapeutic_validate_invite"
    },
    {
      "id": "sim-infection-safety",
      "minutes": "84-93",
      "title": "Simulation block 6 - Infection Control & Safety (Q58-65)",
      "format": "Case",
      "blocks": [
        {
          "kind": "p",
          "text": "This is the infection control and safety block, questions 58 through 65. It covers PPE doffing order, the spore-specific hand hygiene and isolation rules, restraints as a last resort, the documentation and legal-protection points around incident reports, and the anticoagulation-plus-head-injury pattern. For our internationally educated nurses, much of the infection control here will feel familiar from home practice, but pay attention to the US-specific documentation and isolation conventions."
        },
        {
          "kind": "list",
          "items": [
            "PPE doffing: gloves first, mask last - most contaminated first.",
            "C. difficile requires soap and water; alcohol does not kill spores.",
            "Varicella requires airborne PLUS contact precautions.",
            "Restraints are a last resort; assess treatable causes of delirium first.",
            "KCl is NEVER given IV push - always diluted, by pump.",
            "Never chart 'incident report completed' in the medical record.",
            "Anticoagulated patient with a head impact - urgent CT.",
            "Active TB - negative pressure room, door closed, N95."
          ]
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Doffing principle: most contaminated comes off first",
          "text": "Gloves are the most contaminated and come off first; the mask is least contaminated and comes off last, followed by hand hygiene. The same 'protect what's clean' logic explains why C. diff needs soap and water and why the incident report stays out of the chart to preserve its legal protection."
        }
      ],
      "practiceItemId": "pi_ppe_doffing"
    },
    {
      "id": "sim-management-of-care",
      "minutes": "93-105",
      "title": "Simulation block 7 - Management of Care (Q66-75)",
      "format": "Case",
      "blocks": [
        {
          "kind": "p",
          "text": "This is the final block, management of care, questions 66 through 75. It is built on delegation, prioritization, informed consent, mandatory reporting, the full-code default, the 'stop the line' duty, and NGN bowtie strategy. This is precisely the block where IENs from every cohort tend to feel the US scope-of-practice framework is unfamiliar, so reason it from the rules rather than from home-country habit."
        },
        {
          "kind": "h",
          "text": "Delegation - the two-filter rule"
        },
        {
          "kind": "p",
          "text": "Delegation questions 66 through 68 all run on the same logic: a task can be delegated only when it is within the receiver's scope AND the patient is stable. UAP can take vitals on stable patients but cannot assess, medicate, or do initial teaching. LPNs can do tasks like catheter insertion in a stable patient but not initial assessment, IV push medications, or initial teaching. Anything requiring nursing judgment stays with the RN."
        },
        {
          "kind": "h",
          "text": "Prioritization, consent, and advocacy"
        },
        {
          "kind": "p",
          "text": "The rest of the block tests the management principles that protect patients and protect you: assess the unstable, unexpected, ABC-threatening patient first; the nurse is the witness to consent, not the explainer, so notify the provider when a patient doesn't understand; full code is the default without a documented DNR; nurses are mandatory reporters of suspected elder abuse on reasonable suspicion; and the nurse who believes an order is unsafe must stop the line and not administer until the concern is resolved."
        },
        {
          "kind": "list",
          "items": [
            "UAP: vitals on stable patients only.",
            "LPN: catheter insertion in a stable patient; not initial assessment, IV push, or initial teaching.",
            "Cannot delegate (A PIE T): Assessment, Planning, judgment-based Implementation, Evaluation, initial Teaching.",
            "Assess first: new SOB and chest tightness post-op (possible PE) outranks stable and expected findings.",
            "Informed consent: the nurse is the witness; notify the surgeon to re-explain.",
            "Social media: details can still identify a patient - 'no names' is not a defense.",
            "Cardiac arrest, no advance directive: full code by default.",
            "Suspected elder abuse: mandatory report to Adult Protective Services.",
            "Unsafe order: stop, clarify, do not administer if unresolved; use the chain of command.",
            "NGN bowtie: work each side independently, then verify the central diagnosis."
          ]
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "The two-filter delegation rule",
          "text": "Delegate only when BOTH filters are satisfied: the task is within the delegatee's scope AND the patient is stable. Anything requiring nursing judgment - assessment, planning, judgment-based implementation, evaluation, and initial teaching - cannot be delegated. This single rule answers the entire delegation cluster."
        }
      ],
      "practiceItemId": "pi_delegate_uap"
    },
    {
      "id": "scoring-framework",
      "minutes": "105-120",
      "title": "Scoring framework & self-scoring",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "After the simulation, you'll self-score your answer sheet and then calculate two things: your overall percentage and your percentage in each content area. The reason we break it out by category is that an overall number hides where your real gaps are - you might be strong overall but weak in exactly the area that sinks you on test day, and the category view is what makes Hour 19 targeted instead of scattershot."
        },
        {
          "kind": "h",
          "text": "Suggested category breakdown and bootcamp targets"
        },
        {
          "kind": "list",
          "items": [
            "Pharmacology (Q1-12): 12 questions, target 9/12 (75%).",
            "Cardio/Resp/Labs (Q13-27): 15 questions, target 11/15 (73%).",
            "Endo/Renal/GI/Neuro/MSK (Q28-42): 15 questions, target 11/15 (73%).",
            "Maternity & Pediatrics (Q43-52): 10 questions, target 7/10 (70%).",
            "Mental Health (Q53-57): 5 questions, target 4/5 (80%).",
            "Infection Control & Safety (Q58-65): 8 questions, target 6/8 (75%).",
            "Management of Care (Q66-75): 10 questions, target 7/10 (70%).",
            "TOTAL: 75 questions, target 55/75 (73%)."
          ]
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "These are bootcamp goals, not pass/fail thresholds",
          "text": "Learners hitting 73%+ overall and 70%+ in every category are in good shape. If you're below in any category, that category becomes a Hour 19 priority. The targets are there to direct your review, not to tell you whether you'll pass - the real NCLEX is adaptive and scored differently."
        }
      ]
    },
    {
      "id": "debrief-close",
      "minutes": "120-150",
      "title": "Debrief - content gap vs reasoning error, cohort patterns, close",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Welcome back. Let's debrief. Some of you scored above 73 percent and feel confident, and some scored below and feel discouraged. Both reactions are completely normal. Remember the point of the simulation is not to determine pass or fail - it is to identify what needs focused work tomorrow. We still have one focused review hour and one exam-readiness hour before the real exam, so there is real runway left."
        },
        {
          "kind": "h",
          "text": "Sort every miss: content gap or reasoning error"
        },
        {
          "kind": "p",
          "text": "Take 10 minutes now and look at your missed questions. For each one, ask yourself a single diagnostic question: is this a content gap, meaning I didn't know the material, or a reasoning error, meaning I knew the content but misread or mis-prioritized the question? Mark each one in your journal under the right category. This distinction matters enormously, because the fix for each is completely different - a content gap means go learn the material, while a reasoning error means drill the question-reading and prioritization skill."
        },
        {
          "kind": "h",
          "text": "Surface the cohort's highest-frequency misses"
        },
        {
          "kind": "p",
          "text": "Now we'll go through the questions the cohort missed most often - the ones where more than about 30 percent of the room got it wrong. For each one we re-read the question, re-read the rationale, name the test pattern, and name the content area, and you add it to your journal. We are not going to review all 75 questions; we're hunting patterns, because patterns are what generalize to the real exam."
        },
        {
          "kind": "list",
          "items": [
            "Delegation items (66-68): the two-filter rule - within scope AND patient stable - is the framework. Drill the scope lists in Hour 19.",
            "Therapeutic communication (53): the validate-plus-invite pattern is the framework. Practice 20 items overnight.",
            "Magnesium toxicity (43): memorize the sequence order - DTRs first, then respiratory, then BP, then LOC, then UOP.",
            "PPE doffing (58): gloves first, mask last - most contaminated first. Drill it.",
            "Informed consent (70): the nurse is the WITNESS, not the explainer. Notify the provider when the patient doesn't understand."
          ]
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Cohort-specific patterns we tend to see",
          "text": "These are tendencies, not rules about you. The Filipino cohort often does well on direct clinical questions (cardiac, respiratory, sepsis, sickle cell) and may need extra work on delegation, therapeutic communication, and HIPAA scenarios. The UK cohort often does well on infection control, metric-unit pharmacology, and standard clinical items, and may need work on NGN format and US-specific medication doses that differ from UK practice. The African cohort often does well on infectious disease (TB, sepsis, sickle cell), maternal-fetal complications, and pediatric emergencies, and may need work on delegation, mental health therapeutic communication, and the HIPAA framework."
        },
        {
          "kind": "h",
          "text": "Name your two weakest categories and close"
        },
        {
          "kind": "p",
          "text": "Identify your two weakest categories from today and mark them as your priorities. Tomorrow's Hour 19 is targeted review, and we will go deep on the categories that need it most, so bring those two priorities with you. One more thing before we close: the clock is now your friend. If you can sustain focus for 90 minutes today, you can sustain it for 5 hours on test day with breaks. Pacing is muscle memory now - trust it."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "What to leave Hour 18 with",
          "text": "Each of you should walk out of today with three things: a self-scored answer sheet, a journal of your missed questions categorized as content gap versus reasoning error, and your two weakest categories identified. Hour 19 builds directly on this analysis. See you there - bring water, bring notes, bring questions."
        }
      ]
    }
  ]
};
