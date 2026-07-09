import type { Lesson } from "./lessonTypes";

/**
 * Section 6 - Lab Values. Auto-generated from the Florence Academy
 * bootcamp instructor script (expanded draft). Pending nurse-educator review.
 */
export const lesson: Lesson = {
  "meta": {
    "number": 6,
    "title": "Lab Values",
    "durationMin": 60,
    "audience": "Internationally educated nurses - Philippines, UK, Kenya, Ghana",
    "contentWeight": "Roughly one in three NCLEX items involves a lab value in the stem, the answer, or the rationale",
    "tagline": "The numbers behind every clinical decision - learn the range, the meaning of high and low, the common causes, and above all the first nursing action."
  },
  "objectives": [
    "Recite normal reference ranges in US units for sodium, potassium, calcium, magnesium, chloride, phosphate, BUN, creatinine, AST, ALT, total bilirubin, albumin, troponin, BNP, glucose, HbA1c, hemoglobin, hematocrit, white blood cell count, platelets, PT/INR, and aPTT.",
    "Interpret an arterial blood gas using the ROME framework (Respiratory Opposite, Metabolic Equal) and determine compensation status.",
    "Convert between mmol/L and mg/dL for glucose, and between μmol/L and mg/dL for creatinine, bridging UK and US lab reporting.",
    "Identify the first nursing action for each major critical value, applying the priority frameworks from Hour 2.",
    "Connect abnormal lab values to the drugs taught in Hours 3, 4, and 5 (e.g., warfarin to INR, lithium to level, ACE inhibitor to potassium).",
    "Recognize therapeutic drug level ranges for digoxin, lithium, phenytoin, carbamazepine, valproic acid, theophylline, and vancomycin."
  ],
  "timing": [
    {
      "minutes": "0-3",
      "segment": "Frame the clinical block, unit conversion preview",
      "format": "Lecture"
    },
    {
      "minutes": "3-14",
      "segment": "Electrolytes - Na, K, Ca, Mg, Phos, Cl",
      "format": "Lecture + 2 items"
    },
    {
      "minutes": "14-22",
      "segment": "ABGs and the ROME framework",
      "format": "Lecture + interpretation drill"
    },
    {
      "minutes": "22-30",
      "segment": "CBC - WBC, Hgb/Hct, platelets, ANC",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "30-36",
      "segment": "Coagulation studies & therapeutic drug levels",
      "format": "Lecture"
    },
    {
      "minutes": "36-42",
      "segment": "Renal & liver panels",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "42-48",
      "segment": "Cardiac markers - troponin, BNP, CK-MB",
      "format": "Lecture"
    },
    {
      "minutes": "48-54",
      "segment": "Glucose, HbA1c, critical values framework",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "54-58",
      "segment": "Synthesis: linking labs back to Hours 3-5",
      "format": "Case"
    },
    {
      "minutes": "58-60",
      "segment": "Close & homework",
      "format": "Lecture"
    }
  ],
  "practiceItems": {
    "pi_hyperkalemia_first_action": {
      "id": "pi_hyperkalemia_first_action",
      "stem": "A client with chronic kidney disease taking lisinopril and spironolactone presents with a potassium of 7.2 mEq/L. The ECG shows peaked T waves. What is the nurse's first priority intervention?",
      "options": [
        {
          "key": "A",
          "text": "Administer Kayexalate orally."
        },
        {
          "key": "B",
          "text": "Administer IV insulin with dextrose."
        },
        {
          "key": "C",
          "text": "Administer IV calcium gluconate."
        },
        {
          "key": "D",
          "text": "Prepare for emergency dialysis."
        }
      ],
      "answer": "C",
      "rationale": "Peaked T waves plus K+ 7.2 means the cardiac membrane is at risk. Calcium gluconate goes first to stabilize the membrane and buy time while the other interventions are mobilized. Kayexalate works slowly. Insulin and dextrose work in 15 to 30 minutes, but the patient could arrest in that window without membrane stabilization. Dialysis is the definitive treatment but takes time to mobilize. The first action for ECG changes plus elevated potassium is calcium gluconate.",
      "cjmm": "take-actions",
      "reference": "Section 6 · Electrolytes (hyperkalemia)"
    },
    "pi_anc_neutropenic_precautions": {
      "id": "pi_anc_neutropenic_precautions",
      "stem": "A client receiving chemotherapy has a WBC of 1,800/mm³ with 25% neutrophils and 3% bands. What is the absolute neutrophil count, and what precautions are indicated?",
      "options": [
        {
          "key": "A",
          "text": "ANC 504; severe neutropenia - neutropenic precautions indicated."
        },
        {
          "key": "B",
          "text": "ANC 1,800; no precautions needed."
        },
        {
          "key": "C",
          "text": "ANC 252; bleeding precautions indicated."
        },
        {
          "key": "D",
          "text": "ANC 1,260; standard precautions only."
        }
      ],
      "answer": "A",
      "rationale": "ANC = WBC × (% neutrophils + % bands) ÷ 100, so 1,800 × (25 + 3) ÷ 100 = 1,800 × 0.28 = 504. An ANC of 504 is severe neutropenia, since below 500 is the most severe threshold and 504 sits right at the edge. Neutropenic precautions are absolutely indicated - private room, dietary restrictions, strict hand hygiene, no live vaccines, no fresh flowers - because the patient is at risk even from low-virulence organisms.",
      "cjmm": "analyze-cues",
      "reference": "Section 6 · CBC (ANC and neutropenic precautions)"
    },
    "pi_lactulose_expected_outcome": {
      "id": "pi_lactulose_expected_outcome",
      "stem": "A client with cirrhosis is admitted with confusion, asterixis, and ammonia 142 μg/dL. The provider orders lactulose 30 mL PO every 6 hours. The nurse should monitor for which expected outcome?",
      "options": [
        {
          "key": "A",
          "text": "Decreased serum ammonia and increased stooling."
        },
        {
          "key": "B",
          "text": "Increased serum albumin and improved mental status."
        },
        {
          "key": "C",
          "text": "Decreased AST/ALT and weight gain."
        },
        {
          "key": "D",
          "text": "Resolution of the cirrhosis and normalization of liver enzymes."
        }
      ],
      "answer": "A",
      "rationale": "Lactulose traps ammonia in the gut as ammonium and causes osmotic diarrhea, removing ammonia from the body. The expected outcome is soft, frequent stools (often two to three per day) and improvement in mental status. B is wrong because lactulose does not affect albumin. C is wrong because it does not affect the transaminases. D is wrong because lactulose treats the symptom - the hepatic encephalopathy - it does not reverse the underlying cirrhosis.",
      "cjmm": "evaluate-outcomes",
      "reference": "Section 6 · Renal & liver panels (ammonia / lactulose)"
    },
    "pi_dka_symptomatic_glucose": {
      "id": "pi_dka_symptomatic_glucose",
      "stem": "A client receiving IV insulin for DKA has a blood glucose of 78 mg/dL drawn at the bedside. The client is alert but reports feeling \"shaky.\" What is the nurse's first action?",
      "options": [
        {
          "key": "A",
          "text": "Stop the insulin infusion."
        },
        {
          "key": "B",
          "text": "Administer 25 g D50 IV push."
        },
        {
          "key": "C",
          "text": "Provide 4 oz of orange juice."
        },
        {
          "key": "D",
          "text": "Recheck the glucose in 15 minutes."
        }
      ],
      "answer": "C",
      "rationale": "The patient is conscious, alert, and can swallow. The glucose is 78 - technically not yet below the 70 critical threshold, but trending down and symptomatic. The 15-15 rule applies: 15 grams of fast-acting carbohydrate, then recheck in 15 minutes. A is wrong because stopping insulin in DKA prematurely allows ketosis to rebound. B is wrong because D50 is for unconscious or severely symptomatic patients without the ability to swallow. D is wrong because waiting 15 minutes without treating the symptomatic hypoglycemia risks the glucose dropping further. Treat now, recheck in 15.",
      "cjmm": "take-actions",
      "reference": "Section 6 · Glucose & critical values (hypoglycemia / 15-15 rule)"
    }
  },
  "segments": [
    {
      "id": "frame-the-clinical-block",
      "minutes": "0-3",
      "title": "Frame the Clinical Block",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Welcome to Hour 6. We have closed the pharmacology block, and today begins the clinical content - and we start with lab values. The numbers. This hour matters more than its position in the sequence suggests, because roughly one in three NCLEX items has a lab value in the stem, in an answer choice, or in the rationale. If you cannot interpret a sodium of 128, or a potassium of 6.4, or an INR of 5.8, those items are simply unanswerable. So this hour is foundational for every clinical hour that follows."
        },
        {
          "kind": "p",
          "text": "A quick word on units, because it is where internationally educated nurses lose easy points. The NCLEX uses US units: sodium in milliequivalents per liter, glucose in milligrams per deciliter, creatinine in milligrams per deciliter, hemoglobin in grams per deciliter. For the UK-trained nurses in the room, you grew up with millimoles per liter for glucose, micromoles per liter for creatinine, often the same units as the US for sodium and potassium, but very different conventions for glucose in particular. We will give you the conversions as we go. The goal is reflex: when you see glucose 250 mg/dL, your brain should automatically register about 14 mmol/L, clearly diabetic territory, possibly DKA if the patient is acidotic."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "The architecture for every lab",
          "text": "For every value today, learn the normal range, the meaning of high, the meaning of low, the common causes, and - most importantly - the first nursing action when it is abnormal. The first action is the single most testable piece."
        }
      ]
    },
    {
      "id": "electrolytes",
      "minutes": "3-14",
      "title": "Electrolytes",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "There are six electrolytes to know cold - sodium, potassium, calcium, magnesium, phosphate, and chloride - and the four most testable are sodium, potassium, calcium, and magnesium. For each one, anchor on the normal range first, then the picture of too high and too low, and then the nursing response."
        },
        {
          "kind": "h",
          "text": "Sodium (135-145 mEq/L)"
        },
        {
          "kind": "p",
          "text": "Hyponatremia is below 135. Causes include SIADH, thiazide diuretics, heart failure with fluid overload, vomiting and diarrhea, primary polydipsia, and beer potomania. The symptoms are neurologic - confusion, headache, nausea, and at severe lows, seizures. The critical principle here is that you never correct sodium too fast. Rapid correction of chronic hyponatremia causes osmotic demyelination syndrome, also called central pontine myelinolysis - a devastating neurologic injury. The rule is generally no faster than 8 to 10 mEq/L in 24 hours."
        },
        {
          "kind": "p",
          "text": "Hypernatremia is above 145. Causes include dehydration, diabetes insipidus, hypertonic tube feeds, and water loss without replacement. Symptoms are thirst when the patient is conscious, restlessness, weakness, confusion, and seizures at extremes. Correction is also slow, because too-rapid correction in the other direction causes cerebral edema."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Correct sodium slowly - both directions",
          "text": "Too-fast correction of chronic hyponatremia causes osmotic demyelination (central pontine myelinolysis). Too-fast correction of hypernatremia causes cerebral edema. Slow is safe."
        },
        {
          "kind": "h",
          "text": "Potassium (3.5-5.0 mEq/L)"
        },
        {
          "kind": "p",
          "text": "Potassium is the most clinically dangerous electrolyte because of its cardiac effects. Hypokalemia is below 3.5. Causes include loop diuretics like furosemide, thiazide diuretics, vomiting and diarrhea, alkalosis (potassium shifts into cells), insulin therapy, and beta-agonists. Symptoms are muscle weakness, leg cramps, ileus with decreased bowel sounds, U waves on the ECG, and dysrhythmias including ventricular tachycardia."
        },
        {
          "kind": "p",
          "text": "Replacement of potassium is a high-yield safety topic. Give it orally when possible. Intravenous potassium is always given via an infusion pump, never pushed, with a maximum rate in most settings of 10 to 20 mEq/hr and continuous cardiac monitoring at higher rates. Recall Hour 2 - the unsafe new nurse who pushes IV potassium. That patient dies."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Never IV push potassium",
          "text": "IV potassium is always given by pump, never push, max 10-20 mEq/hr in most settings, with cardiac monitoring at higher rates. This connects directly to Hour 5."
        },
        {
          "kind": "p",
          "text": "Hyperkalemia is above 5.0. Causes include acute kidney injury, ACE inhibitors and ARBs and spironolactone (recall Hour 3), acidosis where potassium shifts out of cells, tissue breakdown such as rhabdomyolysis or tumor lysis, and a hemolyzed blood sample, which produces pseudohyperkalemia - always verify before treating. The symptoms follow the ECG: peaked T waves are the earliest sign, and as it worsens you see a widening QRS, bradycardia, eventual sine wave, and asystole, along with muscle weakness and paresthesia."
        },
        {
          "kind": "p",
          "text": "The treatment sequence for hyperkalemia is five interventions in order of urgency, and you must memorize it. One - calcium gluconate IV stabilizes the cardiac membrane; it does not lower potassium, but it buys time, and it is given first when ECG changes are present. Two - insulin plus dextrose IV shifts potassium from blood into cells, with onset in 15 to 30 minutes, and the dextrose prevents hypoglycemia. Three - a beta-agonist nebulizer, typically albuterol, also shifts potassium into cells. Four - sodium polystyrene sulfonate (Kayexalate) or patiromer removes potassium from the body via the GI tract. Five - dialysis, for severe, refractory, or life-threatening cases."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Calcium gluconate FIRST for ECG changes",
          "text": "When there are ECG changes plus elevated potassium, the first action is calcium gluconate to stabilize the cardiac membrane. This is the single highest-frequency lab-pharmacology fact on the exam - memorize it."
        },
        {
          "kind": "h",
          "text": "Calcium (total 8.5-10.5 mg/dL; ionized 4.5-5.5 mEq/L)"
        },
        {
          "kind": "p",
          "text": "Ionized calcium is the physiologically active form. Hypocalcemia causes include hypoparathyroidism, often after a thyroidectomy, vitamin D deficiency, chronic kidney disease, blood transfusion where the citrate preservative binds calcium, pancreatitis, and alkalosis. There are three signs to memorize. Chvostek sign: tap on the facial nerve in front of the ear and the facial muscles twitch - a positive Chvostek means low calcium. Trousseau sign: inflate a blood pressure cuff above systolic for three minutes and the hand spasms into a carpal position - a positive Trousseau means low calcium. Beyond those two, expect tetany, hyperreflexia, paresthesias around the mouth and fingertips, a prolonged QT on the ECG, seizures at severe lows, and laryngospasm in the worst case."
        },
        {
          "kind": "p",
          "text": "Hypercalcemia causes include hyperparathyroidism, malignancy with bone metastases (the most common inpatient cause), prolonged immobility from bone resorption, thiazide diuretics, and vitamin D excess. The classic mnemonic is stones, bones, groans, and psych overtones - kidney stones, bone pain, abdominal pain and constipation, and confusion - plus muscle weakness and a shortened QT. Treatment is aggressive IV hydration with normal saline, then loop diuretics to enhance calcium excretion, plus treatment of the underlying cause."
        },
        {
          "kind": "h",
          "text": "Magnesium (1.5-2.5 mEq/L)"
        },
        {
          "kind": "p",
          "text": "Hypomagnesemia causes include GI losses, alcohol use disorder, proton pump inhibitors, loop diuretics, and malnutrition. Its symptoms look like hypocalcemia - tremor, hyperreflexia, tetany - plus dysrhythmias including torsades de pointes. Hypermagnesemia causes include kidney failure and magnesium therapy in OB. Recall Hour 5: loss of deep tendon reflexes is the first sign, followed by respiratory depression, then hypotension, then decreased level of consciousness, then decreased urine output. The antidote is calcium gluconate."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Magnesium mirrors Hour 5 OB content",
          "text": "Loss of deep tendon reflexes is the first sign of hypermagnesemia, exactly as taught for magnesium therapy in obstetrics, and calcium gluconate is the antidote."
        },
        {
          "kind": "h",
          "text": "Phosphate (2.5-4.5 mg/dL) and Chloride (95-105 mEq/L)"
        },
        {
          "kind": "p",
          "text": "Phosphate is generally inverse to calcium - when calcium goes up, phosphate goes down. The classic phosphate scenario is refeeding syndrome: a malnourished patient starts eating, glucose triggers insulin, phosphate shifts into cells, serum phosphate crashes, and the patient can develop respiratory failure and cardiac arrest. The lesson is to refeed slowly. Chloride generally parallels sodium; it is rarely the primary problem and rarely the test answer."
        }
      ],
      "practiceItemId": "pi_hyperkalemia_first_action"
    },
    {
      "id": "abgs-and-rome",
      "minutes": "14-22",
      "title": "ABGs and the ROME Framework",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Arterial blood gases are the lab values that scare students the most, but the framework is actually simple - five steps and a mnemonic. By the end of this segment you will be able to interpret any ABG in about 30 seconds. Start by anchoring the normal values: pH 7.35-7.45, PaCO2 (the partial pressure of arterial CO2) 35-45 mmHg, bicarbonate (HCO3) 22-26 mEq/L, PaO2 80-100 mmHg, and oxygen saturation 95-100%."
        },
        {
          "kind": "h",
          "text": "The five steps"
        },
        {
          "kind": "list",
          "items": [
            "Step one - look at the pH. Below 7.35 is acidotic, above 7.45 is alkalotic, and between 7.35 and 7.45 is normal. If the pH is normal, the disorder is either absent or fully compensated.",
            "Step two - look at the CO2, the respiratory parameter. The lungs control CO2.",
            "Step three - look at the HCO3, the metabolic parameter. The kidneys control HCO3.",
            "Step four - apply ROME: Respiratory Opposite, Metabolic Equal. If pH and CO2 are moving in opposite directions, the disorder is respiratory; if pH and HCO3 are moving in the same direction, the disorder is metabolic.",
            "Step five - assess compensation by looking at whether the opposing parameter is shifting to bring the pH back toward normal."
          ]
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "ROME - Respiratory Opposite, Metabolic Equal",
          "text": "pH and CO2 moving in OPPOSITE directions means a respiratory disorder. pH and HCO3 moving in the SAME direction means a metabolic disorder. This single rule is the entire interpretation."
        },
        {
          "kind": "h",
          "text": "The four disorders"
        },
        {
          "kind": "p",
          "text": "Respiratory acidosis: the patient is hypoventilating, CO2 builds up, CO2 in water becomes carbonic acid, so acid is up and pH is down - CO2 up and pH down, opposite directions. Classic causes are COPD exacerbation, opioid overdose (recall Hour 5), neuromuscular weakness, sleep apnea, and severe asthma. Respiratory alkalosis: the patient is hyperventilating and blows off CO2, so acid is down and pH is up - CO2 down and pH up, opposite directions. Causes are anxiety, pain, fever, pulmonary embolism, high altitude, and early salicylate toxicity in its central-stimulation phase before metabolic acidosis dominates."
        },
        {
          "kind": "p",
          "text": "Metabolic acidosis: bicarbonate is lost, either consumed by acid as in DKA or lost from the GI tract as in diarrhea, so HCO3 is down and pH is down - same direction. Causes are diabetic ketoacidosis, lactic acidosis (recall the metformin connection from Hour 4), kidney failure with acid retention, diarrhea with bicarbonate loss, and late salicylate toxicity. Metabolic alkalosis: bicarbonate goes up, either gained directly or because acid is lost, so HCO3 is up and pH is up - same direction. Causes are vomiting or nasogastric suction with loss of stomach acid, loop and thiazide diuretics, antacid overuse, and primary hyperaldosteronism."
        },
        {
          "kind": "h",
          "text": "Compensation"
        },
        {
          "kind": "p",
          "text": "The body tries to bring pH back toward normal. In a primary respiratory disorder, the kidneys adjust the HCO3; in a primary metabolic disorder, the lungs adjust ventilation. If the opposing parameter is shifted in the same direction as the primary parameter, compensation is occurring. If the pH is back to normal, that is full compensation. If the pH is still abnormal but the opposing parameter is shifted, that is partial compensation. If the opposing parameter is still normal, the disorder is uncompensated."
        },
        {
          "kind": "h",
          "text": "Worked examples"
        },
        {
          "kind": "p",
          "text": "First: pH 7.28, CO2 60, HCO3 26. The pH 7.28 is acidotic, the CO2 of 60 is high, pH and CO2 are moving in opposite directions so this is respiratory, and the HCO3 of 26 is only high-normal, so it is uncompensated to partial. The diagnosis is uncompensated respiratory acidosis - this patient is hypoventilating, so think opioid overdose, think COPD. Second: pH 7.50, CO2 30, HCO3 24. The pH is alkalotic, the CO2 of 30 is low, opposite directions means respiratory, and the HCO3 is normal, so it is uncompensated respiratory alkalosis - this patient is hyperventilating, so think anxiety, think PE. Third: pH 7.30, CO2 35, HCO3 16. The pH is acidotic, the CO2 is normal, the HCO3 of 16 is low, pH and HCO3 are moving the same direction so this is metabolic acidosis; the CO2 should be low to compensate and is only borderline, suggesting minimal compensation - think DKA, think lactic acidosis."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Read oxygenation separately",
          "text": "PaO2 and SaO2 are separate from the acid-base interpretation. A PaO2 below 60 mmHg or an SaO2 below 90% means the patient needs supplemental oxygen and the provider needs to know."
        }
      ]
    },
    {
      "id": "cbc",
      "minutes": "22-30",
      "title": "CBC - WBC, Hemoglobin/Hematocrit, Platelets",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "The complete blood count has three primary lines you must know cold: the white cells, the red cells (expressed as hemoglobin and hematocrit), and the platelets. Work through each one with its range, its high and low picture, and the precautions that follow."
        },
        {
          "kind": "h",
          "text": "White blood cells (5,000-10,000/mm³, or 5-10 K/μL)"
        },
        {
          "kind": "p",
          "text": "That is the same number in two notations. Leukocytosis, a high white count, is caused by infection (especially bacterial), inflammation, physiological stress, leukemia, and corticosteroid therapy - a WBC of 14,000 in a postoperative patient with fever is bacterial until proven otherwise. Leukopenia, a low white count, is caused by chemotherapy, viral illness, autoimmune disease, and advanced sepsis, in which the immune system can be overwhelmed and counts can drop."
        },
        {
          "kind": "p",
          "text": "The differential is the breakdown of white cell types - neutrophils, lymphocytes, monocytes, eosinophils, and basophils. Neutrophils respond to bacteria, lymphocytes to viruses, and eosinophils to parasites and allergies. The left shift is what happens when the bone marrow is under acute demand from infection and releases immature neutrophils called bands; an elevated band count, or a left-shifted differential, indicates acute bacterial infection."
        },
        {
          "kind": "h",
          "text": "Absolute neutrophil count and neutropenic precautions"
        },
        {
          "kind": "p",
          "text": "The absolute neutrophil count, or ANC, is calculated as total WBC times the percentage of neutrophils plus bands, divided by 100. An ANC below 1,500 is neutropenia, and an ANC below 500 is severe neutropenia. Severe neutropenia requires neutropenic precautions, and you should memorize the components: a private room; no fresh flowers, because they harbor fungi; no raw fruits, raw vegetables, or undercooked foods; no live vaccines; strict hand hygiene; and visitors and staff screened for any infection. The neutropenic patient is at risk even from organisms that would not bother a healthy person."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "ANC formula",
          "text": "ANC = total WBC × (% neutrophils + % bands) ÷ 100. Below 1,500 is neutropenia; below 500 is severe neutropenia and triggers neutropenic precautions. Many cohorts have never had to calculate this - drill it."
        },
        {
          "kind": "h",
          "text": "Hemoglobin and hematocrit"
        },
        {
          "kind": "p",
          "text": "Hemoglobin runs 14-18 g/dL in men and 12-16 g/dL in women, with a critical threshold below 7 g/dL in most adults, at which transfusion is typically indicated. Hematocrit runs 42-52% in men and 37-47% in women, and is roughly three times the hemoglobin - a useful sanity check, so if hemoglobin is 12 the hematocrit should be around 36. Low hemoglobin and hematocrit come from blood loss (acute or chronic), iron deficiency, vitamin B12 or folate deficiency, anemia of chronic disease, hemolysis, and kidney disease with low erythropoietin. Elevated values come from dehydration (a relative rise), polycythemia vera, smoking, COPD with chronic hypoxia, and high altitude."
        },
        {
          "kind": "h",
          "text": "Platelets (150,000-400,000/mm³)"
        },
        {
          "kind": "p",
          "text": "Thrombocytopenia is low platelets, and different thresholds matter at different counts. Below 100,000, start bleeding precautions. Below 50,000, the risk of spontaneous bleeding rises sharply. Below 20,000, there is a high risk of spontaneous bleeding including intracranial. Below 10,000 is critical, and platelet transfusion is typically indicated. Bleeding precautions include a soft toothbrush, an electric razor, no rectal medications or temperatures, avoiding IM injections when possible, applying pressure to venipuncture sites, and no flossing; watch for petechiae, bruising, gum bleeding, hematuria, and melena."
        },
        {
          "kind": "p",
          "text": "Causes of thrombocytopenia include ITP (immune thrombocytopenic purpura), DIC (disseminated intravascular coagulation), drug-induced causes such as chemotherapy, heparin, and some antibiotics, splenic sequestration, and liver disease. Recall Hour 3 for heparin-induced thrombocytopenia (HIT): a drop in platelets 5 to 10 days into heparin therapy with paradoxical thrombosis - stop the heparin immediately."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "HIT - stop the heparin",
          "text": "Heparin-induced thrombocytopenia is a platelet drop 5-10 days into heparin therapy with paradoxical clotting. The action is to stop heparin immediately (recall Hour 3)."
        }
      ],
      "practiceItemId": "pi_anc_neutropenic_precautions"
    },
    {
      "id": "coagulation-and-drug-levels",
      "minutes": "30-36",
      "title": "Coagulation Studies & Therapeutic Drug Levels",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "There are three main coagulation values. PT, the prothrombin time, runs 11-13 seconds and was historically used to monitor warfarin; it has largely been replaced by the INR, a standardized ratio that allows comparison across labs. The INR is below 1.1 normally; the therapeutic range for most warfarin indications is 2-3, and for a mechanical mitral valve it is 2.5-3.5. Above 4 means elevated bleeding risk, and above 5 is a bleeding emergency where vitamin K reversal is considered. Recall Hour 3 - the entire warfarin teaching is built around the INR. The aPTT, the activated partial thromboplastin time, runs 25-35 seconds and is used to monitor IV heparin; the therapeutic range for heparin is 1.5 to 2.5 times control, which usually works out to 60 to 80 seconds depending on the lab (recall Hour 3)."
        },
        {
          "kind": "p",
          "text": "D-dimer is below 0.5 μg/mL normally and is elevated in pulmonary embolism, deep vein thrombosis, DIC, recent surgery, and pregnancy. It is useful as a ruling-out test for venous thromboembolism in low-risk patients - a negative D-dimer essentially excludes PE in low-pretest-probability cases - while a positive D-dimer is nonspecific."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Coag targets",
          "text": "INR therapeutic 2-3 (2.5-3.5 for mechanical mitral valve); INR >5 is a bleeding emergency. aPTT therapeutic for heparin is 1.5-2.5× control, about 60-80 seconds."
        },
        {
          "kind": "h",
          "text": "Therapeutic drug levels"
        },
        {
          "kind": "p",
          "text": "These are the labs you already met in the pharmacology hours, so connect each level back to its drug. Digoxin is 0.5-2.0 ng/mL in the traditional range, with newer evidence supporting 0.5-0.9 for heart failure; anything above 2.0 is toxic (recall Hour 3). Lithium is 0.6-1.2 mEq/L for maintenance and up to 1.5 for acute mania, with above 1.5 being toxic (recall Hour 4). Phenytoin (Dilantin), an anticonvulsant, is 10-20 μg/mL, and toxicity above 20 brings nystagmus, ataxia, slurred speech, and eventual coma. Carbamazepine (Tegretol) is 4-12 μg/mL, also an anticonvulsant and also used for trigeminal neuralgia and bipolar disorder."
        },
        {
          "kind": "list",
          "items": [
            "Digoxin - 0.5-2.0 ng/mL (newer evidence supports 0.5-0.9 for heart failure); above 2.0 is toxic.",
            "Lithium - 0.6-1.2 mEq/L maintenance, up to 1.5 for acute mania; above 1.5 is toxic.",
            "Phenytoin (Dilantin) - 10-20 μg/mL.",
            "Carbamazepine (Tegretol) - 4-12 μg/mL.",
            "Valproic acid (Depakote) - 50-100 μg/mL; hepatotoxic, monitor LFTs.",
            "Theophylline - 10-20 μg/mL; narrow window, toxicity brings seizures, dysrhythmias, GI symptoms.",
            "Vancomycin trough - 15-20 mg/L for serious infections (AUC-based monitoring increasingly preferred)."
          ]
        },
        {
          "kind": "p",
          "text": "Valproic acid (Depakote) is 50-100 μg/mL, an anticonvulsant and mood stabilizer that is hepatotoxic, so monitor the LFTs. Theophylline is 10-20 μg/mL, a bronchodilator with a narrow therapeutic window whose toxicity brings seizures, dysrhythmias, and GI symptoms. Vancomycin trough is 15-20 mg/L for serious infections; AUC-based monitoring is increasingly preferred but the trough is still widely taught (recall Hour 4)."
        }
      ]
    },
    {
      "id": "renal-and-liver-panels",
      "minutes": "36-42",
      "title": "Renal & Liver Panels",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "h",
          "text": "Renal panel"
        },
        {
          "kind": "p",
          "text": "There are two renal values you must know: BUN and creatinine. BUN, the blood urea nitrogen, runs 7-20 mg/dL and is elevated in dehydration, GI bleeding, a high-protein diet, kidney dysfunction, and steroid use. Creatinine runs 0.6-1.2 mg/dL, with slight gender variation - women typically run a little lower because of less muscle mass - and it is a more specific marker of kidney function than BUN."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "UK creatinine conversion",
          "text": "UK creatinine is reported in μmol/L. Multiply mg/dL by 88.4 to get μmol/L: 1.0 mg/dL is about 88 μmol/L and 2.0 mg/dL is about 177 μmol/L. UK reference ranges are roughly 60-110 μmol/L."
        },
        {
          "kind": "p",
          "text": "The BUN-to-creatinine ratio is normally about 10:1, up to 20:1. Above 20:1 suggests prerenal causes, usually dehydration or hypovolemia - the kidneys are working but underperfused. If the creatinine is significantly elevated and the ratio drops below 10:1, that suggests intrinsic renal disease, meaning the kidneys themselves are damaged."
        },
        {
          "kind": "p",
          "text": "The glomerular filtration rate, the eGFR, is estimated from creatinine, age, gender, and sometimes race. Above 90 is normal; 60-89 is mildly reduced and often age-related; 30-59 is moderate CKD; 15-29 is severe CKD; and below 15 is kidney failure, where dialysis is typically needed. This connects straight to pharmacology: metformin is held below an eGFR of 30 (recall Hour 4), DOACs require renal dose adjustment (recall Hour 3), aminoglycosides require careful monitoring (recall Hour 4), and many drugs accumulate in renal failure."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "eGFR drives drug dosing",
          "text": "Metformin is held below eGFR 30, DOACs need renal dose adjustment, and aminoglycosides need monitoring - the renal panel is a pharmacology safety check, not just a number."
        },
        {
          "kind": "h",
          "text": "Liver panel"
        },
        {
          "kind": "p",
          "text": "There are five liver values. AST, aspartate aminotransferase, runs 10-40 U/L. ALT, alanine aminotransferase, runs 7-56 U/L and is more liver-specific than AST, since AST is also found in heart and muscle. For pattern recognition: hepatocellular injury - viral hepatitis, drug-induced liver injury, acetaminophen toxicity - elevates both AST and ALT, typically with ALT higher than AST, whereas alcohol-related liver injury typically shows AST at two times ALT or more. The AST-greater-than-ALT pattern in alcohol use is testable."
        },
        {
          "kind": "p",
          "text": "Alkaline phosphatase runs 44-147 U/L and is elevated in biliary obstruction, bone disease, and pregnancy from a placental source. Total bilirubin runs 0.2-1.2 mg/dL; the direct (conjugated) fraction is elevated in biliary obstruction, while the indirect (unconjugated) fraction is elevated in hemolysis and neonatal jaundice. Albumin runs 3.5-5.0 g/dL, and low albumin reflects malnutrition, liver dysfunction (a failure to synthesize), nephrotic syndrome (renal loss), or chronic illness."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Low albumin means more free drug",
          "text": "Many drugs bind to albumin, so low albumin means less binding, more free drug, more effect, and more toxicity. Phenytoin can read 'normal' while the patient is toxic, because the unbound fraction is high in hypoalbuminemia."
        },
        {
          "kind": "p",
          "text": "Ammonia runs 10-80 μg/dL and is elevated in hepatic encephalopathy - patients with advanced cirrhosis develop confusion and asterixis, a flapping tremor, when ammonia rises. The treatment is lactulose, which traps ammonia in the gut and excretes it via the stool, with a goal of 2 to 3 soft stools per day."
        }
      ],
      "practiceItemId": "pi_lactulose_expected_outcome"
    },
    {
      "id": "cardiac-markers",
      "minutes": "42-48",
      "title": "Cardiac Markers - Troponin, BNP, CK-MB",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "There are three cardiac markers you must know. Troponin is the primary diagnostic marker for myocardial infarction. Troponin I is normal below 0.04 ng/mL, though high-sensitivity troponin assays use different thresholds, often in picograms per milliliter, and any elevation in the setting of ischemic symptoms is significant."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Troponin kinetics",
          "text": "Troponin rises 3-12 hours after myocardial injury, peaks at 24-48 hours, and remains elevated 5-14 days. A negative troponin in the first hour does NOT rule out MI - serial troponins are required, typically at 0, 3-6, and sometimes 12 hours."
        },
        {
          "kind": "p",
          "text": "CK-MB is the cardiac isoform of creatine kinase. It rises 4 to 6 hours after MI, peaks at 12 to 24 hours, and returns to normal in 2 to 3 days. It has mostly been replaced by troponin, but it remains useful for diagnosing reinfarction: once troponin has been elevated for days, a second MI is hard to detect with troponin alone, while CK-MB peaks and returns more quickly."
        },
        {
          "kind": "p",
          "text": "BNP, B-type natriuretic peptide, is released by ventricular myocytes when they are stretched, and it is a marker of heart failure. Below 100 pg/mL essentially rules out heart failure, and above 400 strongly suggests it; the grey zone between 100 and 400 requires clinical correlation. NT-proBNP, a related marker, has different cutoffs that vary by age. Remember that BNP elevation is not exclusive to heart failure - it is also seen in PE, renal failure, sepsis, and mechanical ventilation - so BNP is sensitive and useful for ruling heart failure out, but it is not perfectly specific."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "BNP rules out heart failure",
          "text": "BNP below 100 pg/mL essentially rules out HF; above 400 strongly suggests it. It is sensitive but not specific, since it also rises in PE, renal failure, sepsis, and mechanical ventilation."
        },
        {
          "kind": "p",
          "text": "The lipid panel rounds out the cardiac picture. A total cholesterol under 200 is desirable. LDL targets vary by cardiovascular risk - under 70 for established CAD, under 100 for high risk, under 130 for moderate risk. HDL above 40 in men and above 50 in women is protective, and triglycerides should be under 150. These targets shift with new guidelines, so verify the current recommendations."
        }
      ]
    },
    {
      "id": "glucose-hba1c-critical-values",
      "minutes": "48-54",
      "title": "Glucose, HbA1c, and the Critical Values Framework",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Glucose is the single most commonly checked lab in hospitalized patients. Fasting glucose runs 70-100 mg/dL; impaired fasting glucose, also called prediabetes, is 100-125; and diabetes is diagnosed at 126 or higher on two separate occasions. A random glucose at or above 200 with symptoms of hyperglycemia - polyuria, polydipsia, weight loss - also diagnoses diabetes."
        },
        {
          "kind": "p",
          "text": "HbA1c, glycated hemoglobin, reflects average glucose over approximately three months. Below 5.7% is normal, 5.7-6.4% is prediabetes, and 6.5% or higher is diabetes. The target for most diabetics is under 7%, though older patients and those at high hypoglycemia risk may have a higher target, under 8%."
        },
        {
          "kind": "h",
          "text": "Hypoglycemia and hyperglycemia"
        },
        {
          "kind": "p",
          "text": "Hypoglycemia is below 70 mg/dL, and severe hypoglycemia is below 40. Symptoms are cool, clammy skin, tachycardia, anxiety, hunger, and confusion, progressing to seizure and coma when severe. For treatment, a conscious patient gets the 15-15 rule: 15 grams of fast-acting carbohydrate - 4 ounces of juice, glucose tablets, or regular soda - then recheck in 15 minutes and repeat if still under 70. An unconscious patient gets IV dextrose 50%, typically 25 grams IV push, or IM glucagon if there is no IV access. Hyperglycemia is above 200 routinely; DKA is typically associated with glucose above 250 plus ketosis plus acidosis; and HHS, the hyperosmolar hyperglycemic state, is typically in type 2 diabetics with glucose often above 600, profound dehydration, and minimal ketosis."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "UK glucose conversion - drill this",
          "text": "Multiply mmol/L by 18 to approximate mg/dL: 5 mmol/L ≈ 90 (normal fasting), 7 mmol/L ≈ 126 (diabetes threshold), 10 mmol/L ≈ 180, and 25 mmol/L ≈ 450 (clearly DKA territory)."
        },
        {
          "kind": "h",
          "text": "Critical values and the first-action framework"
        },
        {
          "kind": "p",
          "text": "Critical values are the labs that trigger immediate action regardless of context, and you should memorize them: potassium below 2.5 or above 6.5; sodium below 120 or above 160; glucose below 40 or above 500; magnesium below 1.0 or above 5.0; hemoglobin below 7; platelets below 20,000; any troponin elevation in the right clinical context; INR above 5; and pH below 7.20 or above 7.60."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Critical value first-action framework",
          "text": "Reassess the patient (vitals, mental status, related symptoms) → verify the lab (hemolyzed sample? drawn from a heparin line? repeat if needed) → notify the provider → implement indicated interventions within scope (hold a med, position, start monitoring) → document. Assess first unless ABC is immediately threatened; 'notify the provider' before assessment is a classic wrong answer."
        }
      ],
      "practiceItemId": "pi_dka_symptomatic_glucose"
    },
    {
      "id": "synthesis",
      "minutes": "54-58",
      "title": "Synthesis: Linking Labs Back to Hours 3-5",
      "format": "Case",
      "blocks": [
        {
          "kind": "h",
          "text": "Synthesis case 1 - hyperkalemia on an ACE inhibitor plus spironolactone"
        },
        {
          "kind": "p",
          "text": "A client with hypertension and chronic kidney disease takes lisinopril 20 mg daily and spironolactone 25 mg daily. The morning labs show K+ 6.4 mEq/L, creatinine 2.1 mg/dL, and BUN 38 mg/dL. The client reports nausea and paresthesia, and the ECG shows peaked T waves. What is the nurse's priority action? Apply the frameworks."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Reasoning - case 1",
          "text": "Two potassium-elevating drugs (ACE inhibitor plus aldosterone antagonist, Hour 3) on top of renal impairment that reduces excretion. K+ 6.4 with peaked T waves is critical. The priority action is calcium gluconate IV to stabilize the cardiac membrane, then insulin plus dextrose, then the longer-acting agents - and hold both the ACE inhibitor and the spironolactone. This synthesizes Hour 3 pharmacology, Hour 6 critical values, and Hour 2 priority frameworks. The patient does not arrest if you remember calcium gluconate first."
        },
        {
          "kind": "h",
          "text": "Synthesis case 2 - warfarin plus NSAID with a GI bleed"
        },
        {
          "kind": "p",
          "text": "A client on warfarin for atrial fibrillation has been taking ibuprofen 600 mg three times daily for the past week for back pain. Today's labs: INR 6.2, hemoglobin 9.4 g/dL (down from 12.8 last month), and creatinine 1.4. The client reports dark stools. What is the priority nursing concern?"
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Reasoning - case 2",
          "text": "Warfarin plus an NSAID is a major bleeding interaction (Hour 5). INR 6.2 is in the critical bleeding range, the hemoglobin has dropped from 12.8 to 9.4 indicating significant GI blood loss, and the dark stools are melena pointing to an upper GI source. The priority concern is active GI bleeding with hemodynamic risk and a severely elevated INR. Actions: hold the warfarin, hold the NSAID, give vitamin K, consider FFP or PCC for emergent reversal, type and crossmatch, and prepare for possible endoscopy. This synthesizes Hour 3 anticoagulation, Hour 5 NSAID, Hour 6 labs, and Hour 2 frameworks."
        }
      ]
    },
    {
      "id": "close-and-homework",
      "minutes": "58-60",
      "title": "Close & Homework",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "That is lab values - the numbers behind every clinical decision on the NCLEX. Tonight, review your reference card and test yourself cold. If someone says potassium, you say 3.5 to 5.0. If someone says creatinine, you say 0.6 to 1.2. If someone says HbA1c diabetic threshold, you say 6.5. Memorize the numbers; they are the easiest points on the exam."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Homework",
          "text": "Complete 50 lab-focused practice questions, biased toward critical values and first actions. Log every wrong answer in your journal, and specifically note whether you missed the number, missed the interpretation, or missed the first action."
        },
        {
          "kind": "p",
          "text": "Hour 7 is cardiac clinical content - myocardial infarction, heart failure, arrhythmias, hypertensive crisis, and valvular disease. It is the hour where Hours 3 through 6 come together: beta blockers and ACE inhibitors and anticoagulants and INR and BNP and troponin and acid-base, all in one patient. The clinical hours start to build on each other from here forward. See you Hour 7."
        }
      ]
    }
  ]
};
