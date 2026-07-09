import type { Lesson } from "./lessonTypes";

/**
 * Section 17 - NGN Unfolding Cases. Auto-generated from the Florence Academy
 * bootcamp instructor script (expanded draft). Pending nurse-educator review.
 */
export const lesson: Lesson = {
  "meta": {
    "number": 17,
    "title": "NGN Unfolding Cases",
    "durationMin": 60,
    "audience": "Internationally educated nurses - Philippines, UK, Kenya, Ghana",
    "contentWeight": "The NGN centerpiece hour - four full unfolding cases drilling all six CJMM steps; primary client need is management-of-care",
    "tagline": "Four patients deteriorate in real time, and you reason through every step of the Clinical Judgment Measurement Model the way the NGN actually tests you."
  },
  "objectives": [
    "Apply the six-step Clinical Judgment Measurement Model (CJMM) explicitly to unfolding patient scenarios: Recognize Cues, Analyze Cues, Prioritize Hypotheses, Generate Solutions, Take Action, Evaluate Outcomes.",
    "Recognize sepsis using SIRS criteria and subtle early findings (mental status change, family concern, vague 'feeling off'), and apply the 1-hour sepsis bundle.",
    "Apply the ischemic stroke BP and tPA inclusion/exclusion rules in a time-critical case, and recognize when endovascular thrombectomy remains an option even though tPA is contraindicated.",
    "Recognize pediatric DKA, including the K+ pitfall and the cerebral edema complication, and apply weight-based fluid and insulin management.",
    "Recognize serotonin syndrome in an elderly polypharmacy patient and differentiate it from NMS and anticholinergic toxicity.",
    "Identify the major NGN item formats - cloze (drop-down), highlight, matrix/grid, drag-and-drop, extended multiple response, bowtie, trend - and apply a test-taking strategy for each."
  ],
  "timing": [
    {
      "minutes": "0-3",
      "segment": "Frame the NGN drill hour & CJMM review",
      "format": "Lecture"
    },
    {
      "minutes": "3-15",
      "segment": "Case 1 - Sepsis in post-op patient (full CJMM)",
      "format": "Case"
    },
    {
      "minutes": "15-27",
      "segment": "Case 2 - Ischemic stroke with tPA decision (full CJMM)",
      "format": "Case"
    },
    {
      "minutes": "27-39",
      "segment": "Case 3 - Pediatric DKA with K+ pitfall (full CJMM)",
      "format": "Case"
    },
    {
      "minutes": "39-51",
      "segment": "Case 4 - Geriatric polypharmacy serotonin syndrome (full CJMM)",
      "format": "Case"
    },
    {
      "minutes": "51-56",
      "segment": "NGN item types & test-taking strategy review",
      "format": "Lecture"
    },
    {
      "minutes": "56-60",
      "segment": "Close & homework",
      "format": "Lecture"
    }
  ],
  "practiceItems": {
    "pi_sepsis_recognize": {
      "id": "pi_sepsis_recognize",
      "stem": "A 68-year-old man is post-operative day 3 from a sigmoid colectomy. At 0700 his temperature is 38.4°C, HR 108, RR 22, BP 102/64 (down from a POD 2 baseline of 134/82), and SpO2 94% on room air. He says, 'I just feel off - tired and a little confused,' and his daughter says he is not himself. Which finding should the nurse weigh most heavily as an early warning of a serious problem?",
      "options": [
        {
          "key": "A",
          "text": "The SpO2 of 94% on room air"
        },
        {
          "key": "B",
          "text": "The new mental status change with family corroboration"
        },
        {
          "key": "C",
          "text": "The temperature of 38.4°C alone"
        },
        {
          "key": "D",
          "text": "The fact that he is diabetic"
        }
      ],
      "answer": "B",
      "rationale": "The script teaches that a new mental status change ('feeling off,' confused) in an elderly post-op patient is highly significant and is often the first sign of a serious problem such as infection, and that the family's 'he's not himself' corroboration is one of the most reliable subjective findings in healthcare - it calls this 'gold.' The exam rewards recognition of these soft signs, not just abnormal vitals. The SpO2 of 94% and the single temperature are real cues but less specific on their own, and a history of diabetes is background, not the acute warning.",
      "cjmm": "recognize-cues",
      "reference": "Section 17 · Case 1 - Sepsis"
    },
    "pi_sepsis_bundle": {
      "id": "pi_sepsis_bundle",
      "stem": "The nurse recognizes possible sepsis in the post-op patient and prepares the 1-hour sepsis bundle. Which action is the correct sequence point regarding blood cultures and antibiotics?",
      "options": [
        {
          "key": "A",
          "text": "Give broad-spectrum antibiotics first, then draw cultures once the patient stabilizes"
        },
        {
          "key": "B",
          "text": "Draw blood cultures × 2 BEFORE antibiotics, then give broad-spectrum antibiotics within 1 hour"
        },
        {
          "key": "C",
          "text": "Wait for the lactate result before drawing cultures or giving antibiotics"
        },
        {
          "key": "D",
          "text": "Hold antibiotics until the source of infection is confirmed by imaging"
        }
      ],
      "answer": "B",
      "rationale": "The script's 1-hour bundle is: draw a lactate, draw blood cultures × 2 (peripheral and central if a line is present) BEFORE antibiotics, give broad-spectrum antibiotics within 1 hour, give a 30 mL/kg crystalloid bolus for hypotension or lactate ≥4, and add vasopressors (norepinephrine) for MAP <65 not responsive to fluids. Cultures must precede antibiotics so the organism can still be recovered, but antibiotics must not be delayed waiting for the lactate or for imaging-confirmed source - the source workup runs in parallel with treatment.",
      "cjmm": "take-actions",
      "reference": "Section 17 · Case 1 - Sepsis"
    },
    "pi_stroke_tpa": {
      "id": "pi_stroke_tpa",
      "stem": "A 72-year-old woman presents 80 minutes after last known well with expressive aphasia and right-sided weakness. She takes warfarin for atrial fibrillation; her INR is 2.3. BP is 198/110, glucose 138. The non-contrast CT shows no hemorrhage. Why is IV tPA contraindicated for this patient?",
      "options": [
        {
          "key": "A",
          "text": "She is outside the 4.5-hour treatment window"
        },
        {
          "key": "B",
          "text": "Her glucose is too low to give tPA safely"
        },
        {
          "key": "C",
          "text": "Her INR is above 1.7 and her BP exceeds 185/110"
        },
        {
          "key": "D",
          "text": "Atrial fibrillation is an absolute contraindication to tPA"
        }
      ],
      "answer": "C",
      "rationale": "The script teaches the contraindication checklist beats the time window here: at 80 minutes she is well within the 4.5-hour window, but her INR of 2.3 exceeds the tPA threshold of 1.7, and her BP of 198/110 exceeds the tPA threshold of 185/110 - both disqualify her from tPA. Glucose 138 is normal (hypoglycemia is already ruled out), and atrial fibrillation itself is not the contraindication. The instructor specifically warns against selecting tPA just because the time window looks favorable.",
      "cjmm": "analyze-cues",
      "reference": "Section 17 · Case 2 - Stroke"
    },
    "pi_stroke_thrombectomy": {
      "id": "pi_stroke_thrombectomy",
      "stem": "The stroke patient's CT angiography shows a left middle cerebral artery (M1) occlusion; repeat INR is 2.4 and BP is 192/108, so tPA remains contraindicated. What is the appropriate next consideration?",
      "options": [
        {
          "key": "A",
          "text": "Endovascular thrombectomy, because INR is not a contraindication to thrombectomy as it is for tPA"
        },
        {
          "key": "B",
          "text": "Give tPA anyway because a large vessel occlusion is present"
        },
        {
          "key": "C",
          "text": "Aggressively lower the BP to normal before any further intervention"
        },
        {
          "key": "D",
          "text": "Reverse the warfarin immediately and discharge once the INR normalizes"
        }
      ],
      "answer": "A",
      "rationale": "The script teaches that a large vessel occlusion (M1 MCA) makes the patient a candidate for endovascular thrombectomy, and that an elevated INR is NOT a contraindication to thrombectomy the way it is for tPA - the 24-hour thrombectomy window with appropriate imaging applies. tPA stays contraindicated, so option B is wrong. The BP must NOT be aggressively lowered because the ischemic penumbra still needs perfusion (permissive hypertension). Warfarin is held, and reversed only if hemorrhage develops or if needed to bridge to an invasive procedure.",
      "cjmm": "generate-solutions",
      "reference": "Section 17 · Case 2 - Stroke"
    },
    "pi_dka_potassium": {
      "id": "pi_dka_potassium",
      "stem": "A 14-year-old in new-onset DKA (glucose 612 mg/dL, weight 42 kg) is being managed. Regarding the potassium pitfall, when should the IV insulin infusion be started?",
      "options": [
        {
          "key": "A",
          "text": "Immediately, before any fluids, to bring the glucose down fastest"
        },
        {
          "key": "B",
          "text": "After initial fluid resuscitation, and only once the potassium is verified at or above 3.3"
        },
        {
          "key": "C",
          "text": "Only after the glucose has fallen below 250 mg/dL"
        },
        {
          "key": "D",
          "text": "At the same time as a sodium bicarbonate infusion"
        }
      ],
      "answer": "B",
      "rationale": "The script teaches the K+ pitfall: total body potassium is depleted in DKA, but the serum K may be normal or even elevated because of acidosis. When insulin is given, K shifts intracellularly and serum K drops, risking arrhythmia. Therefore insulin (0.05-0.1 units/kg/hr) is started AFTER initial fluid resuscitation AND only once K is confirmed ≥3.3; if K is below 3.3 it must be repleted first. Insulin is not given before fluids, and bicarbonate is actually a risk factor for cerebral edema in pediatric DKA, not a co-infusion partner.",
      "cjmm": "take-actions",
      "reference": "Section 17 · Case 3 - Pediatric DKA"
    },
    "pi_dka_cerebral_edema": {
      "id": "pi_dka_cerebral_edema",
      "stem": "Four hours into treatment, the pediatric DKA patient's glucose has fallen to 312 and pH improved to 7.28, but she suddenly develops a severe headache, becomes more lethargic, vomits, HR drops from 110 to 62, BP rises from 102/64 to 142/82, and her breathing becomes irregular. What is happening and what is the priority response?",
      "options": [
        {
          "key": "A",
          "text": "Hypoglycemia; give a rapid dextrose bolus and increase the insulin rate"
        },
        {
          "key": "B",
          "text": "Cerebral edema with Cushing's triad; elevate the head of bed 30°, give mannitol or hypertonic saline, and reduce the IV fluid rate"
        },
        {
          "key": "C",
          "text": "Septic shock; give a 20 mL/kg fluid bolus and start norepinephrine"
        },
        {
          "key": "D",
          "text": "A panic attack; provide reassurance and continue current management"
        }
      ],
      "answer": "B",
      "rationale": "The script identifies this as cerebral edema, the feared and leading cause of mortality in pediatric DKA. The clinical findings - sudden headache, decreased level of consciousness, vomiting, and Cushing's triad (hypertension with widened pulse pressure, bradycardia, irregular respirations) - are the time-critical warning. The STAT actions are: head of bed up 30°, mannitol 0.5-1 g/kg IV over 20 minutes OR 3% hypertonic saline 5 mL/kg, reduce the IV fluid rate, STAT head CT after stabilization, pediatric ICU, and temporarily discontinue insulin (allowing glucose to rise toward ~250 if needed for cerebral perfusion). The glucose of 312 is not hypoglycemia, and faster fluids or more insulin would worsen the edema.",
      "cjmm": "recognize-cues",
      "reference": "Section 17 · Case 3 - Pediatric DKA"
    },
    "pi_serotonin_differentiate": {
      "id": "pi_serotonin_differentiate",
      "stem": "A 76-year-old on chronic sertraline was started on tramadol yesterday and now has hyperthermia 38.7°C, HR 124, BP 178/104, profuse diaphoresis, agitation, tremor, and hyperreflexia with ankle clonus; pupils are 5 mm and reactive. Which bedside finding best distinguishes serotonin syndrome from NMS and from anticholinergic toxicity?",
      "options": [
        {
          "key": "A",
          "text": "Lead-pipe rigidity with dry skin"
        },
        {
          "key": "B",
          "text": "Hyperreflexia and clonus with diaphoresis (wet skin)"
        },
        {
          "key": "C",
          "text": "Hypothermia with bradycardia"
        },
        {
          "key": "D",
          "text": "Pinpoint pupils with hypoventilation"
        }
      ],
      "answer": "B",
      "rationale": "The script gives two key differentiators. Versus NMS: serotonin syndrome shows hyperreflexia AND clonus (muscles hyper-active), whereas NMS shows lead-pipe rigidity (muscles stiff and slow) - so option A describes NMS. Versus anticholinergic toxicity: anticholinergic toxicity produces dilated pupils with hot, DRY skin (sweating is suppressed), whereas serotonin syndrome produces DIAPHORESIS - the wet-versus-dry skin is the bedside differentiator. The temporal link (symptoms within 24 hours of adding tramadol, a weak serotonergic agent, to an SSRI) and the complete triad - autonomic instability, mental status change, and neuromuscular hyperactivity - confirm serotonin syndrome.",
      "cjmm": "analyze-cues",
      "reference": "Section 17 · Case 4 - Serotonin syndrome"
    },
    "pi_serotonin_rhabdo": {
      "id": "pi_serotonin_rhabdo",
      "stem": "Six hours after stopping the serotonergic medications and giving fluids and lorazepam, the patient is still febrile at 38.4°C; CK returns at 4,200 U/L, urine is dark amber, and repeat potassium is 5.4 (up from 4.0). Which interventions are appropriate? Select all that apply.",
      "options": [
        {
          "key": "A",
          "text": "Aggressive IV normal saline at 200-300 mL/hr or higher to maintain urine output above 200 mL/hr"
        },
        {
          "key": "B",
          "text": "Give calcium gluconate first if there are hyperkalemia ECG changes, then shift potassium with insulin/glucose and albuterol"
        },
        {
          "key": "C",
          "text": "Restart sertraline and tramadol to treat the residual fever"
        },
        {
          "key": "D",
          "text": "Repeat CK and BMP every 4-6 hours and consult nephrology if AKI develops"
        }
      ],
      "answer": "A, B, D",
      "rationale": "The unfolding shows rhabdomyolysis (CK 4,200, dark/myoglobinuric urine, rising potassium) from sustained muscle hyperactivity. The script's management is aggressive IV hydration with normal saline at 200-300 mL/hr or higher to keep urine output >200 mL/hr and flush myoglobin (A); treat hyperkalemia with calcium gluconate FIRST if there are ECG changes to stabilize the membrane, then shift K intracellularly with insulin/glucose and a beta-2 agonist like albuterol, and remove K with a loop diuretic, possibly Kayexalate or dialysis (B); and repeat CK and BMP every 4-6 hours with nephrology consultation if AKI develops (D). Restarting the offending serotonergic drugs (C) is never correct - they caused the syndrome, and the fever is centrally driven, not infectious.",
      "cjmm": "take-actions",
      "reference": "Section 17 · Case 4 - Serotonin syndrome"
    }
  },
  "segments": [
    {
      "id": "frame-and-cjmm-review",
      "minutes": "0-3",
      "title": "Frame the hour & CJMM review",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Welcome to Hour 17 - the NGN centerpiece of this bootcamp. The whole hour is four full unfolding patient cases, and each one walks explicitly through all six steps of the Clinical Judgment Measurement Model. There is deliberately less didactic content here than in other hours and far more case work, because this is where you build the mental habit of reasoning under pressure the way the Next Generation NCLEX actually tests you."
        },
        {
          "kind": "h",
          "text": "The six CJMM steps (recall Hour 1)"
        },
        {
          "kind": "list",
          "items": [
            "Recognize Cues - what stands out?",
            "Analyze Cues - what do these cues mean together?",
            "Prioritize Hypotheses - what is most likely AND most dangerous?",
            "Generate Solutions - what could we do?",
            "Take Action - what do we do, in what order?",
            "Evaluate Outcomes - how do we know it worked?"
          ]
        },
        {
          "kind": "p",
          "text": "Notice the third step says most likely AND most dangerous. That coupling is the heart of NCLEX prioritization: you are not just naming the probable diagnosis, you are also asking which possibility would kill the patient fastest if you missed it, and you act to protect against that in parallel."
        },
        {
          "kind": "p",
          "text": "Every case this hour is built to reward cumulative learning, because each one integrates content from across the bootcamp. The sepsis case ties back to infection control from Hour 15, lab values from Hour 6, and hemodynamics from Hour 7. The stroke case ties to anticoagulation from Hour 3 and neuro from Hour 11. The pediatric DKA case ties to endocrine from Hour 9, pediatrics from Hour 13, and lab and ABG interpretation from Hour 6. The serotonin syndrome case ties to psychiatric medications from Hour 14 and older-adult considerations from Hour 16. Together, these four cases probably integrate fifteen or more of the prior sixteen hours."
        }
      ]
    },
    {
      "id": "case-1-sepsis",
      "minutes": "3-15",
      "title": "Case 1 - Post-op sepsis (full CJMM)",
      "format": "Case",
      "blocks": [
        {
          "kind": "h",
          "text": "The setup"
        },
        {
          "kind": "p",
          "text": "A 68-year-old male is post-operative day 3 from an elective sigmoid colectomy for diverticular disease. His past medical history is hypertension, type 2 diabetes, and hyperlipidemia, and he was stable through POD 2. You are starting your day shift at 0700. His vitals are: temperature 38.4°C, HR 108, RR 22, BP 102/64, SpO2 94% on room air. The patient says, 'I just feel off - tired and a little confused.' His daughter is at the bedside and says, 'He's not himself this morning.'"
        },
        {
          "kind": "h",
          "text": "Step 1 - Recognize Cues"
        },
        {
          "kind": "p",
          "text": "What stands out? A temperature elevation at 38.4, mild tachycardia at 108, mild tachypnea at 22, and a BP of 102/64 that is trending down from his POD 2 baseline of 134/82. Layer on the mental status change - feeling off and confused - and the family concern, because the daughter saying he is not himself is one of the most reliable subjective findings in all of healthcare. And remember the calendar: POD 3 sits squarely within the peak window for post-operative complications."
        },
        {
          "kind": "h",
          "text": "Step 2 - Analyze Cues"
        },
        {
          "kind": "p",
          "text": "Pull the cues together with the SIRS criteria - Systemic Inflammatory Response Syndrome. SIRS requires at least two of the following: temperature above 38 or below 36, HR above 90, RR above 20 or PaCO2 below 32, and WBC above 12,000 or below 4,000 or more than 10% bands. This patient already meets at least three - temperature, heart rate, and respiratory rate - and we do not even have the WBC back yet."
        },
        {
          "kind": "p",
          "text": "The mental status change in an elderly post-op patient is highly significant. Delirium in the older surgical patient is often the very first sign of a serious problem - infection, hypoxia, or a medication effect. That 'feels off' subjective complaint, corroborated by the family, is gold. And POD 3 is the peak window for an anastomotic leak after bowel surgery, surgical site infection, hospital-acquired pneumonia, and urinary tract infection from an indwelling catheter."
        },
        {
          "kind": "h",
          "text": "Step 3 - Prioritize Hypotheses"
        },
        {
          "kind": "p",
          "text": "Sepsis is both the most likely and the most dangerous hypothesis. The possible sources track the surgery: anastomotic leak from the recent bowel surgery, surgical site infection, pneumonia, a UTI from any catheter, or a line-related bloodstream infection. Less likely but worth holding in mind are pulmonary embolism - POD 3 is a high-risk window for DVT and PE - myocardial infarction in an elderly diabetic, and simple dehydration. The leading hypothesis is sepsis, with a source workup running in parallel rather than waiting for one to finish before the other starts."
        },
        {
          "kind": "h",
          "text": "Step 4 - Generate Solutions"
        },
        {
          "kind": "p",
          "text": "The framework here is the sepsis 1-hour bundle from the Surviving Sepsis Campaign, and you should memorize it because it is heavily tested. Within one hour of recognition you accomplish: draw a lactate level; draw blood cultures times two - peripheral and central if a line is present - BEFORE antibiotics; administer broad-spectrum antibiotics; give an IV fluid bolus of 30 mL/kg crystalloid for hypotension or a lactate above 4; and start vasopressors, namely norepinephrine, for a MAP below 65 not responsive to fluids."
        },
        {
          "kind": "p",
          "text": "Alongside the bundle runs the standard workup: CBC with differential, a comprehensive metabolic panel, urinalysis with culture, a chest X-ray, and possible abdominal imaging given the recent bowel surgery. Place two large-bore IVs, set up pulse oximetry and telemetry, notify the provider and likely the surgical team, and activate the rapid response per your institution's policy."
        },
        {
          "kind": "h",
          "text": "Step 5 - Take Action"
        },
        {
          "kind": "p",
          "text": "Now sequence it. One - two large-bore IVs. Two - draw labs simultaneously, including blood cultures, lactate, CBC, CMP, and urinalysis. Three - notify the provider STAT. Four - begin IV fluid resuscitation. Five - antibiotics within one hour of recognition, broad-spectrum, often piperacillin-tazobactam or a carbapenem, plus consideration of MRSA coverage in surgical patients. Six - hourly vital signs and continuous pulse oximetry. Seven - strict intake and output, placing a Foley catheter for accurate hourly urine output if one is not already in place. Eight - increase oxygen if the SpO2 is not maintained above 92%."
        },
        {
          "kind": "h",
          "text": "Step 6 - Evaluate Outcomes"
        },
        {
          "kind": "p",
          "text": "Track whether it is working. The lactate trend should decrease with successful resuscitation. Blood pressure should respond to fluids toward a MAP goal above 65. Urine output should recover toward a goal above 0.5 mL/kg/hr. Watch for mental status improvement, heart rate normalization, and the temperature trend with antibiotics, and work to identify the source through imaging and culture results. Reassess every one to two hours during the initial resuscitation."
        },
        {
          "kind": "h",
          "text": "The unfolding - two hours later"
        },
        {
          "kind": "p",
          "text": "At 0900 the picture has worsened: temperature 39.1, HR 124, RR 28, BP 84/52, SpO2 89% on 2 liters nasal cannula. Urine output is only 30 mL over the past two hours, down from 70 mL/hr the day before. The lactate is back at 4.2 mmol/L - elevated, against a normal of less than 2 - and the WBC is 18,500. The patient is now confused, lethargic, and difficult to arouse."
        },
        {
          "kind": "p",
          "text": "This is septic shock. The definition is sepsis with persistent hypotension requiring vasopressors to maintain a MAP at or above 65 despite adequate volume resuscitation, AND a serum lactate above 2 despite fluids - or, in plain clinical terms, sepsis with hypotension and an elevated lactate at the same time. Mortality rises substantially once a patient is in septic shock, so the response escalates immediately."
        },
        {
          "kind": "p",
          "text": "Now you continue aggressive fluid resuscitation while initiating a norepinephrine infusion to maintain the MAP at or above 65, because norepinephrine is the first-line vasopressor in septic shock. Transfer to the ICU. Pursue source control, likely with an emergent CT of the abdomen to evaluate for an anastomotic leak, and consult the surgical team. Repeat the lactate at two to four hours, continue antibiotic therapy with possible broadening, and prepare for mechanical ventilation if respiratory failure develops."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Memorize the 1-hour sepsis bundle",
          "text": "Lactate; blood cultures × 2 BEFORE antibiotics; broad-spectrum antibiotics within 1 hour; 30 mL/kg crystalloid bolus for hypotension or lactate ≥4; norepinephrine for MAP <65 unresponsive to fluids. The soft early signs - mental status change plus family concern plus borderline vitals - are the recognition pattern the exam loves, and norepinephrine is the first-line pressor in septic shock."
        }
      ],
      "practiceItemId": "pi_sepsis_bundle"
    },
    {
      "id": "case-2-stroke",
      "minutes": "15-27",
      "title": "Case 2 - Acute ischemic stroke with tPA decision (full CJMM)",
      "format": "Case",
      "blocks": [
        {
          "kind": "h",
          "text": "The setup"
        },
        {
          "kind": "p",
          "text": "A 72-year-old female is brought to the ED at 0820 by her family. They state she was fine at breakfast at 0700 but is now unable to speak clearly and has weakness on the right side. She has been on warfarin for atrial fibrillation for five years, and her INR last week at the clinic was 2.3 - therapeutic. Initial vitals: BP 198/110, HR 92 and irregular, RR 16, SpO2 96% on room air, glucose 138, temperature 36.8. She is awake but cannot speak fluently - expressive aphasia - with a right facial droop, right upper extremity drift, and mild right lower extremity weakness. Estimated NIHSS is 11."
        },
        {
          "kind": "h",
          "text": "Step 1 - Recognize Cues"
        },
        {
          "kind": "p",
          "text": "The cues are a sudden onset of focal neurologic deficits - expressive aphasia plus right-sided weakness with facial droop, arm drift, and leg weakness. The time of last known well is 0700, one hour and twenty minutes ago. She is on warfarin with a recent INR of 2.3, her BP is markedly elevated at 198/110, and she has a history of atrial fibrillation, which carries a cardioembolic risk."
        },
        {
          "kind": "h",
          "text": "Step 2 - Analyze Cues"
        },
        {
          "kind": "p",
          "text": "The presentation is consistent with an acute LEFT hemisphere stroke. The right-sided motor deficits combined with expressive aphasia point to the dominant left hemisphere in most people - recall Hour 11. The atrial fibrillation strongly suggests a cardioembolic mechanism, and importantly, AFib can throw clots even when warfarin is therapeutic."
        },
        {
          "kind": "p",
          "text": "On timing she looks favorable - eighty minutes from last known well is well within the 4.5-hour tPA window. But two findings disqualify tPA: the INR of 2.3 is above the tPA threshold of 1.7, and the BP of 198/110 exceeds the tPA threshold of 185/110. This is the trap the exam sets - the clock looks fine, but the contraindication checklist overrides it."
        },
        {
          "kind": "h",
          "text": "Step 3 - Prioritize Hypotheses"
        },
        {
          "kind": "p",
          "text": "Ischemic stroke is most likely given the AFib history and the cardioembolic mechanism, but hemorrhagic stroke must be ruled out before any thrombolytic decision - the non-contrast CT is the first definitive step. Less likely possibilities include a seizure with Todd paralysis, a complicated migraine, hypoglycemia (already ruled out with a glucose of 138), and Bell palsy (which would not explain the limb weakness or aphasia)."
        },
        {
          "kind": "h",
          "text": "Step 4 - Generate Solutions"
        },
        {
          "kind": "p",
          "text": "Order a STAT non-contrast head CT to rule out hemorrhage and STAT labs - CBC, BMP, PT/INR, PTT, troponin, and glucose. Get a 12-lead ECG, place two large-bore IVs, and activate the stroke alert with stroke neurology per protocol. The branch point: if the CT shows no hemorrhage and the INR is below 1.7, the patient might be a tPA candidate; if the INR is elevated, tPA is contraindicated. Even then, endovascular thrombectomy may still be an option for a large vessel occlusion within the 24-hour window with appropriate imaging."
        },
        {
          "kind": "h",
          "text": "Step 5 - Take Action"
        },
        {
          "kind": "p",
          "text": "Sequence it. One - ABCs and protect the airway; although she is breathing adequately now, aspiration precautions are an immediate priority, so she is NPO including water until a swallow assessment. Two - activate the stroke alert. Three - STAT head CT without contrast. Four - two IVs and draw labs. Five - do NOT lower the BP yet, because permissive hypertension is correct in ischemic stroke unless you are preparing for tPA (recall Hour 11). Six - ECG and continuous monitoring. Seven - notify stroke neurology. Eight - hold the next warfarin dose."
        },
        {
          "kind": "h",
          "text": "Step 6 - Evaluate Outcomes"
        },
        {
          "kind": "p",
          "text": "Monitor the CT result, because no hemorrhage means ischemic stroke and a possible thrombolytic candidate, whereas hemorrhage means hemorrhagic stroke and an entirely different management pathway. The INR result confirms or refutes tPA eligibility. Follow the neurologic exam over time with serial NIHSS, watch the vital signs and especially the BP trajectory, and look for a large vessel occlusion on CT angiography that could make her eligible for thrombectomy even when tPA is contraindicated."
        },
        {
          "kind": "h",
          "text": "The unfolding - 0855"
        },
        {
          "kind": "p",
          "text": "The CT is back: no hemorrhage and no large established infarct, but CT angiography shows a left middle cerebral artery M1 occlusion. The lab INR returns at 2.4 - above threshold - and the BP is still 192/108."
        },
        {
          "kind": "p",
          "text": "tPA is contraindicated because the INR of 2.4 exceeds the 1.7 threshold and the BP exceeds 185/110. However, the large vessel occlusion at the M1 MCA makes her a candidate for endovascular thrombectomy, and crucially, an elevated INR is NOT a contraindication to thrombectomy the way it is for tPA. The 24-hour thrombectomy window with appropriate imaging applies."
        },
        {
          "kind": "p",
          "text": "So the actions are: immediate transfer to interventional neuroradiology for thrombectomy; continue the current BP management without aggressively lowering it, because the ischemic territory still has a penumbra that needs perfusion; continue NPO; hold warfarin; and reverse warfarin only if hemorrhage develops or if reversal is required to bridge to the invasive procedure - typically with prothrombin complex concentrate or vitamin K depending on urgency. Perform ongoing neurologic checks every fifteen minutes."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "tPA out, thrombectomy in",
          "text": "When tPA is contraindicated by an elevated INR, a large vessel occlusion still opens the door to endovascular thrombectomy within the 24-hour window with appropriate imaging - because INR is not a contraindication to thrombectomy."
        }
      ],
      "practiceItemId": "pi_stroke_tpa"
    },
    {
      "id": "case-3-pediatric-dka",
      "minutes": "27-39",
      "title": "Case 3 - Pediatric new-onset DKA with the K+ pitfall (full CJMM)",
      "format": "Case",
      "blocks": [
        {
          "kind": "h",
          "text": "The setup"
        },
        {
          "kind": "p",
          "text": "A 14-year-old female is brought to the ED by her mother with four days of polyuria, polydipsia, and weight loss - 5 kg over two weeks. Today she is increasingly drowsy with deep rapid breathing, abdominal pain, and three episodes of vomiting, and she has no prior diagnosis of diabetes. Initial vitals: temperature 37.0, HR 138, RR 32 (deep, with fruity-smelling breath), BP 92/58, SpO2 99% on room air, weight 42 kg. She is lethargic but arousable, with a fingerstick glucose of 612 mg/dL, skin that tents, and a capillary refill of 4 seconds. Her mother reports she has been wetting the bed at night - new for her."
        },
        {
          "kind": "h",
          "text": "Step 1 - Recognize Cues"
        },
        {
          "kind": "p",
          "text": "This is a classic DKA presentation in a previously undiagnosed teenager. The polyuria, polydipsia, and weight loss reflect the osmotic diuresis of hyperglycemia. The deep, rapid Kussmaul respirations are the compensatory respiratory response to the underlying metabolic acidosis - recall the ROME framework and ABG patterns from Hour 6. The fruity breath is acetone, a ketone. The abdominal pain and vomiting are ketosis effects. The glucose of 612 is severe hyperglycemia, and there is tachycardia plus clear dehydration - skin tenting, capillary refill of 4 seconds, and a BP that is low for her age. Even the new bedwetting fits, because the osmotic diuresis exceeded her bladder control."
        },
        {
          "kind": "h",
          "text": "Step 2 - Analyze Cues"
        },
        {
          "kind": "p",
          "text": "This is new-onset Type 1 diabetes presenting in DKA. The recognition criteria are hyperglycemia above 250, a metabolic acidosis with a pH below 7.30 and a bicarbonate below 18, and ketonemia or ketonuria - which we will confirm with the ABG and ketones."
        },
        {
          "kind": "p",
          "text": "Pediatric DKA carries unique risks, and the most important is cerebral edema - the leading cause of mortality in pediatric DKA. The risk factors for cerebral edema include young age, a new diagnosis, severe acidosis, a high BUN, rapid correction of glucose or fluids, and the use of bicarbonate. This case carries multiple of those risk factors, which is exactly why the management has to be careful and deliberate."
        },
        {
          "kind": "h",
          "text": "Step 3 - Prioritize Hypotheses"
        },
        {
          "kind": "p",
          "text": "DKA in new-onset T1DM is the leading diagnosis and the clinical picture is classic, and the severe dehydration requires resuscitation. But the critical caveat is that the fluid resuscitation must be careful, because too-fast fluids risk cerebral edema. Then there is the K+ pitfall - recall Hour 9: total body potassium is depleted in DKA, but the serum K may read normal or even elevated because of the acidosis. Once insulin is given, K shifts intracellularly and the serum K drops, risking arrhythmia - so you must check K and replete it BEFORE starting insulin if it is below 3.3."
        },
        {
          "kind": "h",
          "text": "Step 4 - Generate Solutions"
        },
        {
          "kind": "p",
          "text": "Draw STAT labs: a BMP including bicarbonate, an ABG, magnesium, phosphate, the anion gap, a beta-hydroxybutyrate or urine ketones, an HbA1c, and a urinalysis. Place two IVs. For fluids, give an initial 10 mL/kg normal saline bolus - more conservative than the adult 20 mL/kg precisely because of the cerebral edema risk. Start an insulin infusion, typically 0.05 to 0.1 units/kg/hr, AFTER the initial fluid resuscitation. Replace potassium once K is confirmed below 5.5 - and before starting insulin if K is below 3.3. Use cardiac monitoring, hourly glucose, and electrolytes every two to four hours, and perform neurologic checks for signs of cerebral edema."
        },
        {
          "kind": "h",
          "text": "Step 5 - Take Action"
        },
        {
          "kind": "p",
          "text": "Sequence it. One - ABCs; she is conscious and breathing adequately, but monitor closely. Two - two large-bore IVs. Three - the initial fluid bolus of 10 mL/kg normal saline, slower than for an adult. Four - draw all labs simultaneously. Five - start the insulin infusion only after the initial fluid resuscitation AND only once K is verified above 3.3. Six - cardiac monitor and continuous pulse oximetry. Seven - hourly fingerstick glucose and electrolytes every two to four hours including K. Eight - hourly neurologic checks looking for cerebral edema. Nine - notify the pediatric intensivist and pediatric endocrinology. Ten - strict intake and output."
        },
        {
          "kind": "h",
          "text": "Step 6 - Evaluate Outcomes"
        },
        {
          "kind": "p",
          "text": "The glucose should decline at 50 to 100 mg/dL/hr - not faster, because too-rapid correction can cause cerebral edema. The anion gap should close, the pH should improve, and the bicarbonate should rise. Watch for improving mental status, hemodynamic stability, the absence of cerebral edema signs, and a potassium maintained in the normal range. As the glucose approaches 250 to 300, add dextrose to the IV fluids while continuing insulin, which lets you keep clearing ketones without dropping the glucose too low."
        },
        {
          "kind": "h",
          "text": "The unfolding - four hours into treatment"
        },
        {
          "kind": "p",
          "text": "The numbers are moving the right way: glucose 312, anion gap closing, pH 7.28 improving from 7.15. Then suddenly she develops a severe headache, becomes more lethargic, vomits, her HR drops from 110 to 62, her BP rises from 102/64 to 142/82, and her breathing pattern becomes irregular."
        },
        {
          "kind": "p",
          "text": "This is cerebral edema - the feared complication of pediatric DKA. The clinical findings are a sudden headache, a decreased level of consciousness, vomiting, and Cushing's triad: hypertension with a widened pulse pressure, bradycardia, and irregular respirations (recall Hour 11). Mortality is significant and recognition is time-critical, so you act immediately."
        },
        {
          "kind": "p",
          "text": "The STAT actions: one - elevate the head of bed to 30 degrees. Two - give mannitol 0.5 to 1 g/kg IV over 20 minutes, OR 3% hypertonic saline 5 mL/kg. Three - reduce the IV fluid rate. Four - get a STAT head CT after stabilization. Five - transfer to the pediatric ICU, with likely intubation and ventilation for ICP management. Six - discontinue insulin temporarily, allowing the glucose to rise to approximately 250 if needed for cerebral perfusion. Seven - pursue aggressive ICP management, again recalling Hour 11."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "The two highest-yield pediatric DKA testables",
          "text": "First, the K+ pitfall - do NOT start insulin until K is confirmed at or above 3.3, because insulin drives K intracellularly and can trigger a fatal arrhythmia. Second, cerebral edema - the leading cause of death in pediatric DKA, signaled by sudden headache, decreased LOC, vomiting, and Cushing's triad, and treated with head-of-bed up 30°, mannitol or hypertonic saline, reduced fluids, and temporary insulin hold."
        }
      ],
      "practiceItemId": "pi_dka_potassium"
    },
    {
      "id": "case-4-serotonin-syndrome",
      "minutes": "39-51",
      "title": "Case 4 - Geriatric polypharmacy serotonin syndrome (full CJMM)",
      "format": "Case",
      "blocks": [
        {
          "kind": "h",
          "text": "The setup"
        },
        {
          "kind": "p",
          "text": "A 76-year-old male is brought to the ED by his daughter. His chronic medications are sertraline 100 mg daily for depression for three years, metoprolol 50 mg twice daily for hypertension, atorvastatin 40 mg daily, donepezil 10 mg daily for mild cognitive impairment, and ibuprofen 400 mg as needed. Yesterday his primary care provider started him on tramadol 50 mg every 6 hours for new back pain. Today his daughter noticed he seemed shaky and confused. Initial vitals: temperature 38.7, HR 124, BP 178/104, RR 22, SpO2 96%, glucose 142. On examination he is agitated and mildly confused, with profuse diaphoresis, a generalized muscle tremor, hyperreflexia in the lower extremities with clonus at the ankles, and pupils that are 5 mm and reactive."
        },
        {
          "kind": "h",
          "text": "Step 1 - Recognize Cues"
        },
        {
          "kind": "p",
          "text": "The pivotal cue is a new medication - tramadol - added to an existing serotonergic medication, sertraline, which is an SSRI, with symptoms appearing within 24 hours of the new drug. Then the clinical triad: autonomic instability (hyperthermia at 38.7, tachycardia at 124, hypertension at 178/104, diaphoresis); mental status changes (agitation, confusion); and neuromuscular hyperactivity (tremor, hyperreflexia, and clonus at the ankles)."
        },
        {
          "kind": "h",
          "text": "Step 2 - Analyze Cues"
        },
        {
          "kind": "p",
          "text": "This is serotonin syndrome - the classic triad is present (recall Hour 4 and Hour 14). Tramadol has serotonergic activity, acting as a weak SNRI in addition to its opioid effect, and combined with sertraline it creates excess CNS serotonin. The temporal relationship matters: symptoms within 24 hours of the new medication, a complete clinical triad, and no antipsychotic exposure together point to serotonin syndrome rather than NMS."
        },
        {
          "kind": "p",
          "text": "Hold onto the differentiators. Versus NMS: serotonin syndrome shows hyperreflexia and clonus - muscles that are hyper-active - whereas NMS shows lead-pipe rigidity, muscles that are stiff and slow. Versus anticholinergic toxicity: anticholinergic toxicity gives dilated pupils with hot, dry skin and no sweating because anticholinergic effects suppress sweating, while serotonin syndrome gives diaphoresis. That wet-versus-dry skin distinction is the bedside differentiator."
        },
        {
          "kind": "h",
          "text": "Step 3 - Prioritize Hypotheses"
        },
        {
          "kind": "p",
          "text": "Serotonin syndrome is the leading diagnosis. The differentials to exclude are NMS (no antipsychotic exposure and the wrong neuromuscular finding), anticholinergic toxicity (which would show anhidrotic dry skin and no clonus), malignant hyperthermia (which requires anesthesia exposure, and there is no recent surgery), sympathomimetic toxicity from cocaine or amphetamines (which would need a history and is unlikely in this elderly patient), meningitis (no neck stiffness and no infectious history), and sepsis (less likely without an obvious source, and the serotonin syndrome triad is more specific)."
        },
        {
          "kind": "h",
          "text": "Step 4 - Generate Solutions"
        },
        {
          "kind": "p",
          "text": "First, discontinue BOTH serotonergic medications immediately - sertraline and tramadol. Provide supportive care with IV fluids, cooling measures, and cardiac monitoring. Use benzodiazepines - IV lorazepam - for agitation and autonomic instability, which is first-line in mild-to-moderate cases, and reserve cyproheptadine, a serotonin antagonist, for severe cases. Admit to the ICU for severe cases because of the risk of rhabdomyolysis, DIC, and respiratory failure. And avoid antipsychotics, because they do not help serotonin syndrome and the dopamine blockade can actually worsen confusion in elderly patients."
        },
        {
          "kind": "h",
          "text": "Step 5 - Take Action"
        },
        {
          "kind": "p",
          "text": "Sequence it. One - discontinue sertraline and tramadol immediately. Two - establish IV access and draw labs, including a CK to screen for rhabdomyolysis, plus CBC, BMP, magnesium, and coagulation studies. Three - give IV normal saline for hydration and to support the BP if it becomes labile. Four - apply cooling measures such as cool packs and a cooling blanket, recognizing that antipyretics are typically ineffective because the hyperthermia is centrally driven, not infectious. Five - give IV lorazepam 2 mg for agitation, and repeat as needed. Six - continuous cardiac monitoring. Seven - neurologic checks every one to two hours. Eight - provider notification and likely ICU admission for monitoring."
        },
        {
          "kind": "h",
          "text": "Step 6 - Evaluate Outcomes"
        },
        {
          "kind": "p",
          "text": "Expect resolution of the clinical triad typically over 24 to 72 hours. The temperature should normalize, the vital signs should normalize, the clonus should resolve, and the mental status should clear. The CK should not rise significantly, meaning no rhabdomyolysis, and there should be no complications such as DIC, AKI, or respiratory failure. Going forward, medication reconciliation is essential - document the tramadol-SSRI interaction in the patient's allergies and intolerances and communicate it to all of his providers."
        },
        {
          "kind": "h",
          "text": "The unfolding - six hours later"
        },
        {
          "kind": "p",
          "text": "After discontinuation of the serotonergic medications, IV fluids, and lorazepam, the patient is still febrile at 38.4, with HR 108 and BP 152/88; the tremor is improving and the clonus is diminishing. Then the CK result comes back at 4,200 units per liter against a normal of less than 200, the urine is dark amber, and a repeat BMP shows potassium 5.4, up from 4.0 earlier."
        },
        {
          "kind": "p",
          "text": "Rhabdomyolysis has developed. The CK of 4,200, the dark myoglobin-laden urine, and the rising potassium tell the story - recall Hour 11, where sustained muscle hyperactivity from serotonin syndrome causes muscle breakdown. The released myoglobin damages the kidneys, creating an AKI risk, and the released potassium can be cardiotoxic - recall Hour 6, where hyperkalemia ECG changes are an emergency."
        },
        {
          "kind": "p",
          "text": "The actions are aggressive IV hydration with normal saline at 200 to 300 mL/hr or higher to maintain a urine output above 200 mL/hr, which flushes the myoglobin and protects the kidneys; some institutions add urinary alkalinization with sodium bicarbonate. Treat the hyperkalemia in order: calcium gluconate FIRST if there are ECG changes to stabilize the membrane, then shift potassium intracellularly with insulin plus glucose and a beta-2 agonist like albuterol, then remove potassium from the body with a loop diuretic, possibly Kayexalate, and possibly dialysis. Maintain continuous cardiac monitoring and strict intake and output, repeat the CK and BMP every four to six hours, obtain a nephrology consultation if AKI develops, and consider dialysis if the potassium is refractory or the AKI is severe."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Clonus and wet skin name the diagnosis",
          "text": "Serotonin syndrome = hyperreflexia and clonus with diaphoresis, arising within 24 hours of adding a serotonergic drug (here tramadol) to an SSRI. NMS = lead-pipe rigidity. Anticholinergic toxicity = dilated pupils with hot, DRY skin. The wet-versus-dry skin is the bedside differentiator."
        }
      ],
      "practiceItemId": "pi_serotonin_differentiate"
    },
    {
      "id": "ngn-item-types-review",
      "minutes": "51-56",
      "title": "NGN item types & test-taking strategy review",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "A brief review of the NGN item types to prepare you for tomorrow's full simulation. The point to hold onto throughout is that the clinical reasoning is identical to standard items - only the answer-selection mechanism changes."
        },
        {
          "kind": "h",
          "text": "Cloze (drop-down)"
        },
        {
          "kind": "p",
          "text": "A cloze item is a sentence or paragraph with one or more drop-down menus to fill in - for example, 'The nurse anticipates the patient's lactate will [increase / decrease / remain unchanged] after fluid resuscitation.' The strategy is to read the full sentence first, then evaluate each drop-down independently, because each drop-down is essentially its own multiple-choice question."
        },
        {
          "kind": "h",
          "text": "Highlight"
        },
        {
          "kind": "p",
          "text": "A highlight item asks you to click on the relevant findings within a clinical narrative. Read systematically through the narrative once, then click only the findings that match the criterion - for instance, 'highlight all findings suggesting sepsis.' Do not over-select, because extra clicks are scored wrong, and do not under-select, because missed findings are also wrong."
        },
        {
          "kind": "h",
          "text": "Matrix / grid"
        },
        {
          "kind": "p",
          "text": "A matrix or grid lists multiple findings or actions and asks you to categorize each one - for example, indicated, contraindicated, or non-essential, or effective, ineffective, or unrelated. Work down the list one item at a time and decide each independently. Do not try to balance the distribution; the correct answer might place 7 of 10 items in a single category."
        },
        {
          "kind": "h",
          "text": "Drag and drop"
        },
        {
          "kind": "p",
          "text": "A drag-and-drop item asks you to place actions in sequence or to match items. Read all the options first to see the full set, then place them, and afterward re-read the sequence to verify it makes sense as an order of operations."
        },
        {
          "kind": "h",
          "text": "Extended multiple response"
        },
        {
          "kind": "p",
          "text": "An extended multiple response is a select-all-that-apply item with potentially five to ten options. Evaluate each option independently against the question criterion, and do not assume a specific number of correct answers - sometimes only one is correct and sometimes as many as seven are."
        },
        {
          "kind": "h",
          "text": "Bowtie"
        },
        {
          "kind": "p",
          "text": "A bowtie item places the patient condition in the middle, with predisposing factors or cues on one side and interventions on the other. Work each side independently, then verify that the diagnosis in the middle ties the two sides together."
        },
        {
          "kind": "h",
          "text": "Trend item"
        },
        {
          "kind": "p",
          "text": "A trend item presents a timeline or sequence of vital signs or labs and asks you to identify the trend. Focus on the direction of change rather than the absolute values, and consider which trends signal improvement versus deterioration."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Universal NGN strategy",
          "text": "Do not panic at an unfamiliar format. The clinical reasoning is the same as standard items - the format only changes how you select the answer. Apply the CJMM steps to every case and trust the framework."
        }
      ]
    },
    {
      "id": "close-and-homework",
      "minutes": "56-60",
      "title": "Close & homework",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Successfully walking through these four cases is exactly the preparation you need for Hour 18, because the CJMM framework is the backbone of NGN reasoning, and the explicit walk-through builds the mental habit of applying it under time pressure. Let's lock that in with focused homework tonight."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Homework before Hour 18",
          "text": "Complete 30 NGN-format questions - cloze, highlight, matrix, and bowtie as available in your question bank - plus 50 standard items focused on integration across content areas. Put every wrong answer in your journal."
        },
        {
          "kind": "p",
          "text": "Hour 18 is the full 75-question mixed simulation, timed - five hours of practice testing condensed into 75 high-yield items, designed to resemble the NCLEX experience as closely as possible. Get rest tonight, eat breakfast, and bring water; we will simulate the test environment as closely as we can. See you Hour 18."
        }
      ]
    }
  ]
};
