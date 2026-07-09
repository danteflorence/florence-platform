import type { Lesson } from "./lessonTypes";

/**
 * Section 19 - Targeted Review. Auto-generated from the Florence Academy
 * bootcamp instructor script (expanded draft). Pending nurse-educator review.
 */
export const lesson: Lesson = {
  "meta": {
    "number": 19,
    "title": "Targeted Review",
    "durationMin": 60,
    "audience": "Internationally educated nurses - Philippines, UK, Kenya, Ghana",
    "contentWeight": "Highest-yield miss categories - delegation, medication safety, and rapid-fire pharmacology",
    "tagline": "Yesterday's simulation surfaced your gaps; this hour is the focused fix that moves scores up on exam day."
  },
  "objectives": [
    "Apply the highest-yield delegation rules cold - the 5 rights of delegation, the five tasks that cannot be delegated (A PIE T), and the LPN vs UAP scope distinctions.",
    "Apply the therapeutic communication validate-plus-invite pattern reflexively when reading question stems.",
    "Recall the magnesium toxicity sequence and the lithium toxicity signs without prompting.",
    "Recite key drug facts in rapid-fire format - therapeutic levels, signature adverse effects, critical patient teaching points, and contraindications.",
    "Match major drug overdoses and toxicities with their antidotes.",
    "Recall the absolute 'never-do' safety rules - KCl IV push, abrupt beta blocker stop, abrupt steroid stop, MAOI tyramine, and the rest."
  ],
  "timing": [
    {
      "minutes": "0-3",
      "segment": "Frame the targeted review hour",
      "format": "Lecture"
    },
    {
      "minutes": "3-13",
      "segment": "Block 1 - delegation & therapeutic communication",
      "format": "Drill"
    },
    {
      "minutes": "13-23",
      "segment": "Block 2 - medication safety & high-alert callbacks",
      "format": "Drill"
    },
    {
      "minutes": "23-33",
      "segment": "Pharmacology rapid-fire part 1 - cardiac/anticoag/endocrine",
      "format": "Rapid-fire"
    },
    {
      "minutes": "33-43",
      "segment": "Pharmacology rapid-fire part 2 - psych/abx/pain/other",
      "format": "Rapid-fire"
    },
    {
      "minutes": "43-50",
      "segment": "Antidotes rapid-fire + absolute safety rules",
      "format": "Rapid-fire"
    },
    {
      "minutes": "50-55",
      "segment": "Cohort-specific gap drill",
      "format": "Drill"
    },
    {
      "minutes": "55-58",
      "segment": "Final mental rehearsal & confidence build",
      "format": "Lecture"
    },
    {
      "minutes": "58-60",
      "segment": "Close & preview Hour 20",
      "format": "Lecture"
    }
  ],
  "practiceItems": {
    "pi_iv_push_morphine": {
      "id": "pi_iv_push_morphine",
      "stem": "The charge nurse is assigning tasks for the shift. Which task can be delegated to a licensed practical nurse (LPN)?",
      "options": [
        {
          "key": "A",
          "text": "Initial assessment of a newly admitted patient"
        },
        {
          "key": "B",
          "text": "IV push morphine for a postoperative patient"
        },
        {
          "key": "C",
          "text": "Foley catheter insertion in a stable patient"
        },
        {
          "key": "D",
          "text": "Discharge teaching for a new diagnosis of heart failure"
        }
      ],
      "answer": "C",
      "rationale": "Foley (urinary catheter) insertion in a stable patient is within LPN scope, along with oral meds, IM/SQ injections, maintaining an established IV, tracheostomy care, wound care on stable wounds, and reinforcing teaching the RN already initiated. Initial assessment of a new patient (A) and initial teaching of a new diagnosis (D) are RN-only - both fall under A PIE T. IV push medications (B) cannot be given by the LPN in most institutions. Run each task through the two filters: is it within the delegatee's scope, and is the patient stable? Only catheter insertion passes both.",
      "cjmm": "generate-solutions",
      "reference": "Section 19 · Delegation & therapeutic communication"
    },
    "pi_mag_toxicity": {
      "id": "pi_mag_toxicity",
      "stem": "A preeclamptic patient is receiving an IV magnesium sulfate infusion. On assessment the nurse notes absent deep tendon reflexes and a respiratory rate of 10. What is the nurse's priority action?",
      "options": [
        {
          "key": "A",
          "text": "Increase the magnesium infusion rate to control blood pressure"
        },
        {
          "key": "B",
          "text": "Stop the magnesium and prepare to administer calcium gluconate"
        },
        {
          "key": "C",
          "text": "Administer naloxone for the respiratory depression"
        },
        {
          "key": "D",
          "text": "Document the findings and recheck reflexes in one hour"
        }
      ],
      "answer": "B",
      "rationale": "Loss of deep tendon reflexes followed by respiratory depression below 12 are the first two steps of the magnesium toxicity sequence (DTRs, then respiratory depression, then hypotension, then decreased LOC, then decreased urine output below 30 mL/hr). The nurse must recognize toxicity immediately, STOP the magnesium, give the antidote calcium gluconate, and notify the provider. Increasing the rate (A) worsens toxicity. Naloxone (C) reverses opioids, not magnesium. Documenting and waiting (D) delays a life-threatening intervention.",
      "cjmm": "take-actions",
      "reference": "Section 19 · Medication safety & high-alert callbacks"
    },
    "pi_lithium_thiazide": {
      "id": "pi_lithium_thiazide",
      "stem": "A patient who has been stable on lithium for two years is started on hydrochlorothiazide for hypertension. Two weeks later they present with nausea, a fine tremor, and new confusion. Which interpretation is correct?",
      "options": [
        {
          "key": "A",
          "text": "These are expected side effects of starting a thiazide and require no action"
        },
        {
          "key": "B",
          "text": "The thiazide has lowered the lithium level, causing withdrawal symptoms"
        },
        {
          "key": "C",
          "text": "The thiazide has increased the lithium level, producing lithium toxicity"
        },
        {
          "key": "D",
          "text": "The symptoms indicate the lithium is no longer therapeutic and the dose should be raised"
        }
      ],
      "answer": "C",
      "rationale": "This is the classic NCLEX lithium pattern - a patient on lithium starts a thiazide and develops toxicity. Thiazides, NSAIDs, and ACE inhibitors all INCREASE lithium levels, and low sodium also increases retention. Nausea and fine tremor are early toxicity signs; confusion is progressive. Lithium is therapeutic at 0.6-1.2 mEq/L, toxic above 1.5, and severe above 2.5. The thiazide raised the level, not lowered it, ruling out B and D. These findings are not benign (A) - the nurse should hold the lithium, provide IV hydration, and anticipate dialysis if severe.",
      "cjmm": "analyze-cues",
      "reference": "Section 19 · Medication safety & high-alert callbacks"
    },
    "pi_kcl_iv_push": {
      "id": "pi_kcl_iv_push",
      "stem": "A provider's verbal order is overheard as 'give the potassium chloride IV push now.' What is the nurse's correct response?",
      "options": [
        {
          "key": "A",
          "text": "Administer the KCl by slow IV push over two minutes"
        },
        {
          "key": "B",
          "text": "Refuse to push it; KCl must be diluted and given as a controlled pump infusion"
        },
        {
          "key": "C",
          "text": "Give it IV push but only through a central line"
        },
        {
          "key": "D",
          "text": "Dilute it and give it as a rapid IV bolus over five minutes"
        }
      ],
      "answer": "B",
      "rationale": "Potassium chloride is NEVER given IV push - it is fatal. It must always be diluted, always given by pump infusion, with a peripheral maximum of 10 mEq per hour. KCl is one of the high-alert concentrated electrolytes. No route or rate (A, C, D) makes an IV push or bolus acceptable. The safe answer is to decline the push and administer KCl only as a diluted, controlled pump infusion.",
      "cjmm": "take-actions",
      "reference": "Section 19 · Medication safety & high-alert callbacks"
    },
    "pi_digoxin_hypokalemia": {
      "id": "pi_digoxin_hypokalemia",
      "stem": "A patient on digoxin and furosemide reports seeing yellow-green halos around lights. Which laboratory value most likely contributed to this finding?",
      "options": [
        {
          "key": "A",
          "text": "Serum potassium 2.9 mEq/L"
        },
        {
          "key": "B",
          "text": "Serum potassium 5.8 mEq/L"
        },
        {
          "key": "C",
          "text": "Serum sodium 148 mEq/L"
        },
        {
          "key": "D",
          "text": "Serum calcium 8.2 mg/dL"
        }
      ],
      "answer": "A",
      "rationale": "Yellow-green halos are the classic visual symptom of digoxin toxicity, and digoxin toxicity is worsened by hypokalemia and dehydration. Furosemide is a loop diuretic that causes hypokalemia, so a potassium of 2.9 mEq/L (low) potentiates the toxicity. Digoxin's therapeutic range is 0.5-2.0 ng/mL and the antidote is Digibind (digoxin immune Fab). A high potassium (B), high sodium (C), and low-normal calcium (D) are not the driver of the visual symptoms described here.",
      "cjmm": "analyze-cues",
      "reference": "Section 19 · Pharmacology rapid-fire part 1"
    },
    "pi_levothyroxine_teaching": {
      "id": "pi_levothyroxine_teaching",
      "stem": "Which instruction is correct for a patient newly prescribed levothyroxine for hypothyroidism?",
      "options": [
        {
          "key": "A",
          "text": "Take it at bedtime with your evening calcium supplement"
        },
        {
          "key": "B",
          "text": "Take it in the morning on an empty stomach, 30-60 minutes before food"
        },
        {
          "key": "C",
          "text": "Take it only on the days you feel fatigued"
        },
        {
          "key": "D",
          "text": "Stop the medication once your energy returns to normal"
        }
      ],
      "answer": "B",
      "rationale": "Levothyroxine is taken in the MORNING on an EMPTY STOMACH, 30-60 minutes before food, with no calcium or iron within 4 hours, and it is lifelong. Taking it with calcium (A) impairs absorption. It is not a PRN drug for symptomatic days (C), and because hypothyroidism is chronic the patient must not stop when they feel better (D) - therapy continues for life.",
      "cjmm": "evaluate-outcomes",
      "reference": "Section 19 · Pharmacology rapid-fire part 1"
    },
    "pi_maoi_tyramine": {
      "id": "pi_maoi_tyramine",
      "stem": "A patient taking phenelzine (an MAOI) asks which foods to avoid. Which menu choice is safe for this patient?",
      "options": [
        {
          "key": "A",
          "text": "Aged cheddar with cured salami"
        },
        {
          "key": "B",
          "text": "A draft beer with soy sauce stir-fry"
        },
        {
          "key": "C",
          "text": "Grilled chicken breast with steamed rice"
        },
        {
          "key": "D",
          "text": "Fava beans and a glass of red wine"
        }
      ],
      "answer": "C",
      "rationale": "MAOIs require a TYRAMINE-FREE diet because tyramine-rich foods can trigger a hypertensive crisis. Aged cheese, cured meat, draft beer, wine, soy sauce, and fava beans are all high in tyramine, which makes A, B, and D unsafe. Grilled chicken with steamed rice contains no aged or fermented tyramine sources and is the safe choice. Patients also need a 2-week washout before and after other antidepressants.",
      "cjmm": "evaluate-outcomes",
      "reference": "Section 19 · Pharmacology rapid-fire part 2"
    },
    "pi_vancomycin_red_man": {
      "id": "pi_vancomycin_red_man",
      "stem": "Shortly after a vancomycin infusion is started, a patient develops flushing and an erythematous rash over the face and upper body. What is the most appropriate nursing action?",
      "options": [
        {
          "key": "A",
          "text": "Stop the drug permanently and document a true penicillin allergy"
        },
        {
          "key": "B",
          "text": "Slow the infusion; this is red man syndrome from rapid infusion"
        },
        {
          "key": "C",
          "text": "Administer epinephrine for anaphylaxis immediately"
        },
        {
          "key": "D",
          "text": "Increase the infusion rate to finish the dose faster"
        }
      ],
      "answer": "B",
      "rationale": "Red man syndrome is caused by rapid infusion of vancomycin and is managed by slowing the infusion over 1-2 hours - it is an infusion-rate reaction, not a true drug allergy. Vancomycin also requires trough monitoring (15-20 mcg/mL for serious infections) and carries ototoxicity and nephrotoxicity risk. It is not a penicillin allergy (A), and a rate-related flushing reaction is not the same as anaphylaxis requiring epinephrine (C). Increasing the rate (D) would worsen the reaction.",
      "cjmm": "take-actions",
      "reference": "Section 19 · Pharmacology rapid-fire part 2"
    },
    "pi_acetaminophen_antidote": {
      "id": "pi_acetaminophen_antidote",
      "stem": "A patient is admitted after an intentional acetaminophen overdose. Which antidote should the nurse anticipate administering?",
      "options": [
        {
          "key": "A",
          "text": "Naloxone"
        },
        {
          "key": "B",
          "text": "Flumazenil"
        },
        {
          "key": "C",
          "text": "N-acetylcysteine"
        },
        {
          "key": "D",
          "text": "Vitamin K"
        }
      ],
      "answer": "C",
      "rationale": "The antidote for acetaminophen overdose is N-acetylcysteine (NAC), which protects against the hepatotoxicity that acetaminophen causes in overdose. The maximum dose is 4 g/day in healthy adults and 2-3 g/day in liver disease. Naloxone (A) reverses opioids, flumazenil (B) reverses benzodiazepines, and vitamin K (D) reverses warfarin - none treat acetaminophen toxicity.",
      "cjmm": "generate-solutions",
      "reference": "Section 19 · Antidotes & safety rules"
    },
    "pi_autonomic_dysreflexia": {
      "id": "pi_autonomic_dysreflexia",
      "stem": "A patient with a T4 spinal cord injury suddenly develops a pounding headache and a blood pressure of 210/110. After sitting the patient upright, what should the nurse assess FIRST?",
      "options": [
        {
          "key": "A",
          "text": "Check for a distended or blocked bladder"
        },
        {
          "key": "B",
          "text": "Check the bowel for impaction"
        },
        {
          "key": "C",
          "text": "Inspect the skin for pressure or irritation"
        },
        {
          "key": "D",
          "text": "Lay the patient flat and elevate the legs"
        }
      ],
      "answer": "A",
      "rationale": "This is autonomic dysreflexia - a spinal cord injury at T6 or above with severe hypertension. The sequence is to sit the patient up first (to lower blood pressure), then check the bladder FIRST as the most common trigger, then the bowel, then the skin. Bowel (B) and skin (C) come after the bladder. Laying the patient flat (D) is wrong - that raises an already dangerously high blood pressure; the patient must stay upright.",
      "cjmm": "prioritize-hypotheses",
      "reference": "Section 19 · Antidotes & safety rules"
    }
  },
  "segments": [
    {
      "id": "frame-the-hour",
      "minutes": "0-3",
      "title": "Frame the targeted review hour",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Welcome to Hour 19 - targeted review and pharmacology rapid-fire. Yesterday's simulation surfaced your gaps, and today is the focused fix. These 60 minutes are reserved for the things most likely to move scores up on exam day, so nothing here is filler. If some of you walked in anxious after seeing your results, that is exactly the energy we are going to redirect into structured drilling."
        },
        {
          "kind": "p",
          "text": "Here is how the hour is structured. We open with two targeted review blocks - delegation and medication safety, because those are the two highest-frequency miss categories in nearly every IEN cohort. Then we run two pharmacology rapid-fire blocks, an antidote drill, a cohort-specific gap drill, and we finish with mental rehearsal to settle you before the test."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Format for today",
          "text": "Rapid, high-energy, callback-style. I name a topic; you respond as a cohort. There is no silent processing time today - this is muscle memory drilling. If you do not know the answer when I call on you, you will know it by the end of the hour."
        }
      ]
    },
    {
      "id": "delegation-therapeutic-communication",
      "minutes": "3-13",
      "title": "Delegation & Therapeutic Communication",
      "format": "Drill",
      "blocks": [
        {
          "kind": "h",
          "text": "The delegation two-filter rule"
        },
        {
          "kind": "p",
          "text": "Delegation comes down to two filters, and if you memorize them you have most delegation questions handled. Filter one - is the task WITHIN THE SCOPE of the person being delegated to? Filter two - is the patient STABLE? Both yes means you delegate; either no means the RN does it. That is the entire framework, and you should run every task you see through it."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Two filters",
          "text": "Within scope of the delegatee? AND patient stable? Both YES = delegate. Either NO = RN does it."
        },
        {
          "kind": "h",
          "text": "UAP scope"
        },
        {
          "kind": "p",
          "text": "The unlicensed assistive personnel - the UAP - can do vital signs on stable patients, ADLs, ambulation of stable patients, positioning, intake and output recording, specimen collection from a continent patient, and applying compression stockings. What the UAP CANNOT do is medications, assessment, teaching, sterile procedures, or care of unstable patients. The pattern to hold onto is simple: anything requiring nursing judgment is off-limits for the UAP."
        },
        {
          "kind": "h",
          "text": "LPN scope"
        },
        {
          "kind": "p",
          "text": "The licensed practical nurse - the LPN - can give oral medications, IM and SQ injections, insert a urinary catheter, maintain an established IV, perform tracheostomy care including suctioning, do wound care on stable wounds, and REINFORCE teaching the RN already initiated. The LPN CANNOT do the initial assessment of a new patient, IV push medications in most institutions, blood administration in most institutions, initial teaching of a new diagnosis, or care of unstable patients."
        },
        {
          "kind": "h",
          "text": "What the RN cannot delegate - A PIE T"
        },
        {
          "kind": "p",
          "text": "Memorize the mnemonic A PIE T for the five things the RN can never hand off. A is Assessment, the initial one. P is Planning. I is Implementation requiring judgment. E is Evaluation. T is Teaching, the initial teaching. These five are RN-only, period - and recognizing them lets you eliminate wrong delegation options instantly."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "A PIE T - RN only",
          "text": "Assessment (initial), Planning, Implementation requiring judgment, Evaluation, Teaching (initial). These five can never be delegated."
        },
        {
          "kind": "h",
          "text": "The five rights of delegation"
        },
        {
          "kind": "list",
          "items": [
            "Right Task",
            "Right Circumstance",
            "Right Person",
            "Right Direction",
            "Right Supervision"
          ]
        },
        {
          "kind": "p",
          "text": "Now drill it. I call out a task; you call out 'UAP,' 'LPN,' or 'RN only,' and we move fast - five to ten seconds per item. Vital signs on a stable patient is UAP. Initial assessment of a newly admitted patient is RN only. Foley catheter insertion in a stable patient is LPN. IV push morphine is RN only. Reinforcing diabetes teaching from yesterday's RN session is LPN. Helping a patient ambulate to the bathroom on POD 3 is UAP. Discharge teaching for a new diagnosis of heart failure is RN only. A bed bath on a stable patient is UAP. Administering oral metoprolol to a stable hypertensive patient is LPN. Blood transfusion administration is RN only. Tracheostomy care on a stable patient is LPN. Caring for an unstable septic patient on vasopressors is RN only."
        },
        {
          "kind": "h",
          "text": "Therapeutic communication - validate plus invite"
        },
        {
          "kind": "p",
          "text": "Now therapeutic communication. The pattern is VALIDATE PLUS INVITE - name the feeling, then invite dialogue. Almost every NCLEX therapeutic communication question rewards this pattern, so train yourself to look for the option that does both. When you read a stem, name the patient's feeling, eliminate the distractors, and pick the validate-plus-invite option."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "The reflexive pattern",
          "text": "Validate plus invite: name the feeling, then open the dialogue. Practice it until it is automatic."
        },
        {
          "kind": "h",
          "text": "The eight non-therapeutic categories"
        },
        {
          "kind": "p",
          "text": "Usually three distractors are present in the options, and they come from eight non-therapeutic categories you should memorize. Advice ('you should'). False reassurance ('don't worry'). Cliche ('time heals'). Defending ('the doctor was just doing his job'). Judgment or approval ('that's good' or 'that's wrong'). Belittling ('lots of people feel that way'). Why questions ('why do you feel that way?'). And subject change. If an option fits any of these eight, eliminate it."
        },
        {
          "kind": "list",
          "items": [
            "Advice - 'you should…'",
            "False reassurance - 'don't worry'",
            "Cliche - 'time heals'",
            "Defending - 'the doctor was just doing his job'",
            "Judgment/approval - 'that's good' or 'that's wrong'",
            "Belittling - 'lots of people feel that way'",
            "Why questions - 'why do you feel that way?'",
            "Subject change"
          ]
        },
        {
          "kind": "p",
          "text": "Listen to how the pattern stays consistent across cases. Patient says, 'I just got my biopsy results. It's cancer.' Validate plus invite - 'That must be devastating news. Tell me what you're thinking right now.' Patient says, 'My husband is going to leave me when he finds out about this surgery.' Validate plus invite - 'It sounds like you're worried about how he'll respond. Tell me more about your concern.' Patient says, 'I just can't keep up with these insulin injections. I'm going to fail.' Validate plus invite - 'It sounds like you're feeling overwhelmed by all this. What feels most difficult?' The structure never changes, so practice it until it is reflexive."
        }
      ],
      "practiceItemId": "pi_iv_push_morphine"
    },
    {
      "id": "medication-safety-high-alert",
      "minutes": "13-23",
      "title": "Medication Safety & High-Alert Callbacks",
      "format": "Drill",
      "blocks": [
        {
          "kind": "h",
          "text": "The ten rights, two identifiers, three checks"
        },
        {
          "kind": "p",
          "text": "Medication safety starts with the ten rights - patient, medication, dose, route, time, documentation, reason, response, to refuse, and education. Use two identifiers every time: name plus date of birth, or name plus medical record number, and NEVER the room number. And perform three checks - when you obtain the medication, when you prepare it, and at the bedside. The bedside check is the most important one of the three."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Identifier rule",
          "text": "Two identifiers - name + DOB, or name + MRN. NEVER use the room number to identify a patient."
        },
        {
          "kind": "h",
          "text": "High-alert medications"
        },
        {
          "kind": "p",
          "text": "Certain medications require special precautions because the consequences of an error are severe. Memorize this group: insulin, heparin, opioids, concentrated electrolytes - especially KCl - chemotherapy, and neuromuscular blockers. When you see any of these in a stem, your safety radar should go up automatically."
        },
        {
          "kind": "h",
          "text": "Magnesium toxicity sequence"
        },
        {
          "kind": "p",
          "text": "This is a key callback from the simulation, and you must memorize the ORDER. One - loss of deep tendon reflexes. Two - respiratory depression below 12. Three - hypotension. Four - decreased level of consciousness. Five - decreased urine output below 30 mL per hour. The antidote is calcium gluconate. If you see a preeclamptic patient on magnesium and the stem mentions any combination of these signs, recognize toxicity immediately: stop the magnesium, give calcium gluconate, notify the provider."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Magnesium toxicity - memorize the order",
          "text": "DTRs lost → respiratory depression (RR <12) → hypotension → decreased LOC → urine output <30 mL/hr. Antidote: calcium gluconate. Stop the mag and notify the provider."
        },
        {
          "kind": "h",
          "text": "Lithium toxicity"
        },
        {
          "kind": "p",
          "text": "Lithium is therapeutic at 0.6 to 1.2 mEq/L, toxic above 1.5, and severe above 2.5. The key interactions all INCREASE lithium levels - thiazides, NSAIDs, and ACE inhibitors - and low sodium also increases levels by causing retention. The classic NCLEX pattern is a patient stable on lithium who starts a thiazide and develops toxicity symptoms. Early signs are nausea, vomiting, diarrhea, and a fine tremor; progressive signs are confusion, ataxia, slurred speech, coarse tremor, and seizures. Treatment is to hold the lithium, give IV hydration, and use dialysis for severe toxicity."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Lithium interactions",
          "text": "Thiazides, NSAIDs, ACE inhibitors, and low sodium all INCREASE lithium levels. Therapeutic 0.6-1.2; toxic >1.5; severe >2.5."
        },
        {
          "kind": "h",
          "text": "Insulin, heparin, and warfarin callbacks"
        },
        {
          "kind": "p",
          "text": "Insulin requires an independent double-check for the dose - two nurses verify independently, and you do not assume the calculation, you calculate it independently. Heparin is therapeutic at an aPTT of 1.5 to 2.5 times control, and its antidote is protamine. Warfarin targets an INR of 2 to 3 for most indications and 2.5 to 3.5 for mechanical valves; the antidote is vitamin K for slow reversal, with PCC or FFP for emergent reversal. For the newer oral anticoagulants, apixaban and rivaroxaban - the factor Xa inhibitors - are reversed with andexanet alfa when available, and dabigatran is reversed with idarucizumab."
        },
        {
          "kind": "h",
          "text": "Two never-forget safety absolutes"
        },
        {
          "kind": "p",
          "text": "KCl is NEVER given IV push - it is fatal. It must always be diluted, always given by pump infusion, with a peripheral maximum of 10 mEq per hour. And remember warfarin plus a head injury: an anticoagulated patient with any head impact, even a minor one, needs an urgent CT to rule out an intracranial bleed. Do not be reassured by how well they appear."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Two absolutes",
          "text": "KCl is NEVER IV push - diluted pump infusion only, peripheral max 10 mEq/hr. And any anticoagulated patient with head impact needs urgent CT, even if minor and asymptomatic."
        }
      ],
      "practiceItemId": "pi_mag_toxicity"
    },
    {
      "id": "pharm-rapid-fire-part-1",
      "minutes": "23-33",
      "title": "Pharmacology Rapid-Fire Part 1 - Cardiac, Anticoagulant, Endocrine",
      "format": "Rapid-fire",
      "blocks": [
        {
          "kind": "p",
          "text": "Pharmacology rapid-fire part one - cardiac, anticoagulant, and endocrine. I name the drug, you name the key fact, then I confirm. Keep the pace tight at ten to fifteen seconds per item; the goal is rapid recall, not a lecture."
        },
        {
          "kind": "h",
          "text": "Cardiac"
        },
        {
          "kind": "p",
          "text": "Digoxin is therapeutic at 0.5-2.0 ng/mL; toxicity is worsened by hypokalemia and dehydration; the antidote is Digibind (digoxin immune Fab); and yellow-green halos are the classic visual symptom. Beta blockers (the '-olol' drugs) are held for a heart rate below 60 or a systolic below 100, must NEVER be stopped abruptly because of rebound hypertension and MI risk, mask hypoglycemia symptoms in diabetics, and are avoided in asthma if non-selective. ACE inhibitors (the '-pril' drugs) cause a dry cough, hyperkalemia, and angioedema, are teratogenic and contraindicated in pregnancy, and are switched to an ARB if the cough is intolerable."
        },
        {
          "kind": "p",
          "text": "ARBs (the '-sartan' drugs) are the alternative to ACE inhibitors when the cough develops, carry the same teratogenic warning, and share the hyperkalemia risk. Calcium channel blockers (the '-dipine' drugs) cause peripheral edema, headache, and gingival hyperplasia, must avoid grapefruit, and the non-dihydropyridines verapamil and diltiazem are used for AFib rate control. Statins (the '-statin' drugs) carry a muscle pain warning and the risk of rhabdomyolysis with dark urine; teach patients to report muscle aches, monitor LFTs, and remember they are teratogenic."
        },
        {
          "kind": "p",
          "text": "Nitroglycerin SL is dosed as 3 doses 5 minutes apart, and if there is no relief after the first dose or the pain is worsening, call 911; never use it with PDE5 inhibitors such as sildenafil because of severe hypotension. Furosemide is a loop diuretic causing hypokalemia, hypomagnesemia, ototoxicity (so avoid rapid IV push), and photosensitivity - monitor electrolytes. Hydrochlorothiazide (HCTZ) is a thiazide causing hypokalemia, hyponatremia, hypercalcemia, hyperglycemia, and hyperuricemia - the 3 H's and 3 hypers - and it INCREASES lithium levels, a major interaction. Spironolactone is potassium-sparing, so its signature risk is HYPERKALEMIA (the opposite of the other diuretics), and it can cause gynecomastia."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "HCTZ pearl",
          "text": "Hydrochlorothiazide = 3 H's and 3 hypers (hypokalemia, hyponatremia, hypercalcemia; hyperglycemia, hyperuricemia) and it INCREASES lithium levels."
        },
        {
          "kind": "h",
          "text": "Anticoagulants"
        },
        {
          "kind": "p",
          "text": "Heparin is therapeutic at an aPTT 1.5-2.5x control, the antidote is protamine, and HIT (heparin-induced thrombocytopenia) is a complication, so monitor platelets. Enoxaparin, a LMWH, needs no routine aPTT monitoring, is given subcutaneously, is only partially reversed by protamine, and is preferred for outpatient bridging. Warfarin targets an INR of 2-3 for most indications and 2.5-3.5 for mechanical valves, has vitamin K as its antidote, requires consistent dietary vitamin K intake, and has many drug interactions."
        },
        {
          "kind": "p",
          "text": "Apixaban, a DOAC, needs no routine monitoring; remember that idarucizumab is for dabigatran, NOT apixaban, while andexanet alfa reverses the Xa inhibitors when available - and do NOT stop it without a bridge. Dabigatran is a direct thrombin inhibitor whose antidote is idarucizumab and which is renally cleared, so use caution in CKD. Aspirin is an antiplatelet (not an anticoagulant) with GI bleed risk, and because of Reye syndrome it must be AVOIDED in children with viral illness. Clopidogrel (Plavix) is an antiplatelet used for dual antiplatelet therapy after stenting, and its effect lasts 5-7 days after stopping."
        },
        {
          "kind": "h",
          "text": "Endocrine - insulins"
        },
        {
          "kind": "p",
          "text": "Rapid-acting insulin (lispro, aspart, glulisine) has an onset of 15 minutes, peak at 1-2 hours, and duration of 3-4 hours, and is given with meals. Regular insulin has an onset of 30 minutes, peak at 2-4 hours, and duration of 6-8 hours, and it is the only insulin that can be given IV. NPH insulin is intermediate-acting with an onset of 1-2 hours, peak at 4-12 hours, and duration of 12-18 hours, and it has a cloudy appearance. Glargine (Lantus) is long-acting with NO PEAK, dosed once daily, and you do NOT mix it with other insulins."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Insulin facts that get tested",
          "text": "Regular is the only insulin given IV. Glargine has NO peak and is never mixed. NPH is cloudy."
        },
        {
          "kind": "h",
          "text": "Endocrine - oral and injectable agents"
        },
        {
          "kind": "p",
          "text": "Metformin is first-line for type 2 diabetes; HOLD it 48 hours before and after IV contrast because of lactic acidosis risk; it causes GI side effects, and you should check kidney function. Sulfonylureas (glipizide, glyburide) stimulate insulin release, so their risk is HYPOGLYCEMIA, and they can cause weight gain. SGLT2 inhibitors (the '-gliflozin' drugs) cause glucose excretion via the kidneys, are cardiac and renal protective, and carry a risk of euglycemic DKA and UTIs. GLP-1 agonists (the '-glutide' drugs) provide weight loss benefit, are mostly once-weekly injections, cause GI side effects, and carry pancreatitis risk."
        },
        {
          "kind": "p",
          "text": "Levothyroxine for hypothyroidism is taken in the MORNING on an EMPTY STOMACH, 30-60 minutes before food, with no calcium or iron within 4 hours, and it is lifelong. Glucocorticoids such as prednisone must NEVER be stopped abruptly because of adrenal crisis; take them with food, monitor blood glucose, blood pressure, and weight, and watch for the long-term effects of osteoporosis, immune suppression, and Cushingoid features."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Metformin + contrast",
          "text": "HOLD metformin 48 hours before and after IV contrast - lactic acidosis risk."
        }
      ],
      "practiceItemId": "pi_digoxin_hypokalemia"
    },
    {
      "id": "pharm-rapid-fire-part-2",
      "minutes": "33-43",
      "title": "Pharmacology Rapid-Fire Part 2 - Psych, Antibiotics, Pain, Maternity, Other",
      "format": "Rapid-fire",
      "blocks": [
        {
          "kind": "p",
          "text": "Pharmacology rapid-fire part two - psychiatric, antibiotics, pain, maternity, and other high-yield drugs. Same format, same tight pace. Go."
        },
        {
          "kind": "h",
          "text": "Psychiatric"
        },
        {
          "kind": "p",
          "text": "Lithium is therapeutic at 0.6-1.2 and toxic above 1.5; sodium loss, dehydration, thiazides, NSAIDs, and ACE inhibitors all increase levels; it is teratogenic (Ebstein anomaly); and it has a narrow therapeutic window. SSRIs (fluoxetine, sertraline) are first-line for depression and anxiety, take 4-6 weeks for full effect, cause sexual dysfunction, carry a BLACK BOX WARNING for suicidal ideation under 25, and increase bleeding risk with anticoagulants. TCAs (amitriptyline) cause anticholinergic side effects and are CARDIOTOXIC in overdose - even a small overdose can be fatal, which makes them dangerous in suicidal patients. MAOIs (phenelzine) require a TYRAMINE-FREE diet (aged cheese, cured meat, draft beer, wine, soy sauce, fava beans), need a 2-week washout before and after other antidepressants, and carry hypertensive crisis risk."
        },
        {
          "kind": "p",
          "text": "Bupropion (Wellbutrin) is an atypical antidepressant with SEIZURE RISK, contraindicated in eating disorders and seizure history, and also used for smoking cessation. Typical antipsychotics (haloperidol) cause EPS - acute dystonia (treat with benztropine), akathisia, parkinsonism, and tardive dyskinesia - and NMS, which is hyperthermia plus lead-pipe rigidity plus altered mental status plus autonomic instability; avoid them in Parkinson's. Atypical antipsychotics (the '-pine' and '-done' drugs) cause less EPS but it is still possible, and their hallmark is METABOLIC syndrome - weight gain, diabetes, dyslipidemia - so monitor metabolic labs. Clozapine is for treatment-resistant schizophrenia and causes AGRANULOCYTOSIS, requiring a weekly CBC for 6 months then biweekly, plus seizures, myocarditis, severe constipation, and sialorrhea."
        },
        {
          "kind": "p",
          "text": "Benzodiazepines (lorazepam) treat anxiety, alcohol withdrawal, and seizures, but carry addiction risk and respiratory depression when combined with opioids; the antidote is flumazenil, which is avoided in chronic users. Two syndromes get confused, so separate them by the muscle finding. Serotonin syndrome shows HYPERREFLEXIA AND CLONUS - the muscles are hyper-active - is triggered by an SSRI plus an MAOI, tramadol, or St. John's wort, and is treated by discontinuing the agents, supportive care, and cyproheptadine if severe. NMS shows LEAD-PIPE RIGIDITY - the muscles are stiff and slow - is triggered by antipsychotics, and is treated by stopping the antipsychotic, supportive care, dantrolene, and bromocriptine."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Serotonin syndrome vs NMS",
          "text": "Serotonin syndrome = hyperreflexia and clonus (muscles hyper-active), from serotonergic drugs. NMS = lead-pipe rigidity (muscles stiff and slow), from antipsychotics."
        },
        {
          "kind": "h",
          "text": "Antibiotics"
        },
        {
          "kind": "p",
          "text": "Penicillins carry anaphylaxis risk if the patient is allergic, with low but possible cross-reactivity with cephalosporins. Vancomycin requires trough monitoring (15-20 mcg/mL for serious infections), causes red man syndrome from rapid infusion (so infuse slowly over 1-2 hours), and carries ototoxicity and nephrotoxicity. Aminoglycosides (gentamicin) have a peak of 5-10 and a trough below 2, cause ototoxicity and nephrotoxicity, and produce neuromuscular blockade - use caution in myasthenia gravis. Fluoroquinolones (the '-floxacin' drugs) cause tendon rupture (especially the Achilles), QT prolongation, and photosensitivity, and are avoided in pregnancy and children unless necessary."
        },
        {
          "kind": "p",
          "text": "Tetracyclines cause photosensitivity and tooth discoloration in children under 8 and in pregnancy, and are taken on an empty stomach but not with dairy or antacids. Sulfonamides cause Stevens-Johnson syndrome, require G6PD deficiency caution, and cause kernicterus in newborns. The TB drugs each have a signature: isoniazid causes peripheral neuropathy (give B6, pyridoxine) and hepatotoxicity; rifampin causes orange-red body fluids - urine, sweat, tears - and many drug interactions as a CYP inducer; pyrazinamide causes hyperuricemia and hepatotoxicity; and ethambutol causes optic neuritis with visual acuity changes, requiring monthly eye exams."
        },
        {
          "kind": "h",
          "text": "Pain & anesthesia"
        },
        {
          "kind": "p",
          "text": "Acetaminophen has a maximum of 4 g/day in healthy adults and 2-3 g/day in liver disease, causes hepatotoxicity in overdose, and its antidote is N-acetylcysteine. NSAIDs cause GI bleed, renal injury, and increased cardiovascular risk; avoid them in CKD and use caution with anticoagulants. Opioids (morphine, hydromorphone) cause respiratory depression, constipation, and sedation; the antidote is naloxone, and you will see pinpoint pupils in intoxication and dilated pupils in withdrawal. Tramadol is a weak opioid that is also serotonergic, so it carries serotonin syndrome risk with SSRIs and lowers the seizure threshold. Naloxone reverses opioids but has a short half-life, so it may need repeat dosing for long-acting opioids, and it can precipitate acute withdrawal."
        },
        {
          "kind": "h",
          "text": "Maternity"
        },
        {
          "kind": "p",
          "text": "Magnesium sulfate is used for preeclampsia and eclampsia, is therapeutic at 4-7 mEq/L, follows the toxicity sequence of DTRs, respiratory, BP, LOC, then UOP, and its antidote is calcium gluconate. Oxytocin is used for induction, augmentation, and postpartum hemorrhage; for late decelerations remember SPFON - Stop oxytocin, Position, Fluids, Oxygen, Notify. Methylergonovine (Methergine) treats PPH from atony but is AVOIDED in hypertension or preeclampsia because of hypertensive crisis risk. Carboprost (Hemabate) also treats PPH from atony but is AVOIDED in asthma because of bronchospasm risk. Misoprostol is used for PPH or labor induction (cervical ripening) and is more cross-condition tolerant. Terbutaline is used for tocolysis to slow contractions and causes cardiovascular effects, tachycardia, and hyperglycemia. Betamethasone is an antenatal corticosteroid for fetal lung maturity in preterm birth under 34 weeks (some protocols to 36+6), given as 2 doses IM 24 hours apart."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "PPH drug contraindications",
          "text": "Methylergonovine - avoid in HTN/preeclampsia. Carboprost - avoid in asthma. Match the patient's history to the safe uterotonic."
        },
        {
          "kind": "h",
          "text": "Other high-yield"
        },
        {
          "kind": "p",
          "text": "Phenytoin (Dilantin) is therapeutic at 10-20 mcg/mL, causes gingival hyperplasia, is teratogenic, must be given IV in NS only with a slow push because of cardiac toxicity, and has many drug interactions. Bisphosphonates (alendronate) for osteoporosis are taken in the MORNING on an EMPTY STOMACH with a FULL GLASS OF WATER, and the patient must REMAIN UPRIGHT 30+ minutes to prevent esophagitis. Theophylline has a narrow therapeutic range of 10-20, with toxicity causing seizures and arrhythmias, and many drug interactions. Pyridostigmine (Mestinon) is used for myasthenia gravis and can cause cholinergic crisis if overdosed (SLUDGE symptoms), with atropine as the antidote for the cholinergic effects. Donepezil (Aricept) is a cholinesterase inhibitor for dementia, causing GI side effects and bradycardia."
        }
      ],
      "practiceItemId": "pi_maoi_tyramine"
    },
    {
      "id": "antidotes-safety-rules",
      "minutes": "43-50",
      "title": "Antidotes & Safety Rules",
      "format": "Rapid-fire",
      "blocks": [
        {
          "kind": "p",
          "text": "Antidotes rapid-fire. I name the drug or toxidrome, you name the antidote. Go."
        },
        {
          "kind": "h",
          "text": "Drug-antidote pairings"
        },
        {
          "kind": "list",
          "items": [
            "Heparin overdose → protamine sulfate",
            "Warfarin overdose (slow) → vitamin K",
            "Warfarin overdose (emergent) → PCC (prothrombin complex concentrate) or FFP",
            "Dabigatran → idarucizumab",
            "Factor Xa inhibitors (apixaban, rivaroxaban) → andexanet alfa (when available); PCC",
            "Acetaminophen overdose → N-acetylcysteine (NAC)",
            "Opioid overdose → naloxone",
            "Benzodiazepine overdose → flumazenil (avoid in chronic users)",
            "Magnesium toxicity → calcium gluconate",
            "Iron overdose → deferoxamine",
            "Lead poisoning → succimer (oral), dimercaprol (BAL), EDTA",
            "Beta-blocker overdose → glucagon",
            "Calcium channel blocker overdose → calcium, glucagon, high-dose insulin",
            "Digoxin toxicity → digoxin immune Fab (Digibind)",
            "Cholinergic crisis (excess ACh) → atropine",
            "Anticholinergic toxicity → physostigmine (rarely used)",
            "Organophosphate poisoning → atropine + pralidoxime",
            "Methanol / ethylene glycol → fomepizole (or ethanol)",
            "Cyanide poisoning → hydroxocobalamin",
            "Hypoglycemia (insulin overdose) → glucose IV (D50); glucagon if no IV"
          ]
        },
        {
          "kind": "h",
          "text": "Three sequenced management pearls"
        },
        {
          "kind": "p",
          "text": "A few antidotes come with an order you must respect. For hyperkalemia with ECG changes, give calcium gluconate FIRST for membrane stabilization, then shift the potassium (insulin plus glucose, albuterol), then remove it (kayexalate, dialysis). For serotonin syndrome, discontinue the serotonergic agents, give benzodiazepines for agitation, and use cyproheptadine if severe. For NMS, discontinue the antipsychotic, provide supportive care, and use dantrolene and bromocriptine. And in alcohol withdrawal with DTs, treat with lorazepam or chlordiazepoxide and always give THIAMINE BEFORE GLUCOSE."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Order matters",
          "text": "Hyperkalemia with ECG changes: calcium gluconate FIRST (stabilize membrane), then shift K, then remove K. Alcohol withdrawal: thiamine BEFORE glucose."
        },
        {
          "kind": "h",
          "text": "Absolute never-do rules"
        },
        {
          "kind": "p",
          "text": "Now the absolute never-do rules - memorize these, because the exam loves a single wrong action that kills the patient. Potassium chloride is NEVER IV push; always dilute it in IV fluid, use a pump infusion, peripheral max 10 mEq/hr. Beta blockers are NEVER stopped abruptly (rebound hypertension, MI risk). Chronic corticosteroids are NEVER stopped abruptly (adrenal crisis). Anti-epileptics are NEVER stopped abruptly (breakthrough seizures, status epilepticus risk). Phenytoin IV is NEVER mixed with dextrose because it precipitates - always NS, slow push. And typical antipsychotics are avoided in Parkinson's because they worsen the disease."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "The 'never stop abruptly' family",
          "text": "Beta blockers, chronic corticosteroids, and anti-epileptics must NEVER be stopped abruptly. KCl is NEVER IV push. Phenytoin IV is NEVER mixed with dextrose."
        },
        {
          "kind": "p",
          "text": "A few more safety absolutes round this out. Live vaccines - MMR, varicella, rotavirus, intranasal flu, yellow fever - are contraindicated in immunocompromise and pregnancy. With suspected epiglottitis, do NOT examine the throat because of laryngospasm risk; keep the child calm and get ENT and anesthesia for controlled intubation. With suspected placenta previa, NO digital vaginal exam because of hemorrhage risk - wait for the ultrasound. With a suspected tension pneumothorax, do NOT wait for an X-ray - needle decompression then chest tube. For C. difficile, use soap and water because alcohol does NOT kill spores, and bleach for environmental cleaning."
        },
        {
          "kind": "p",
          "text": "Three more high-yield judgment rules. A spinal cord injury at T6 or above with severe hypertension is autonomic dysreflexia - sit the patient up, check the bladder FIRST, then bowel, then skin. An anticoagulated fall patient with head impact needs an urgent head CT even if minor and asymptomatic. A sudden mood improvement in a suicidal patient is a WARNING SIGN, not relief - increase observation and notify the provider, because the patient may have decided on a plan. And for a hallucinating patient, acknowledge the experience as real to the patient but do not validate it as real, redirect, and assess for command hallucinations."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Sudden calm in a suicidal patient",
          "text": "A sudden mood improvement in a suicidal patient is a warning sign, not relief. Increase observation and notify the provider."
        }
      ],
      "practiceItemId": "pi_autonomic_dysreflexia"
    },
    {
      "id": "cohort-specific-gap-drill",
      "minutes": "50-55",
      "title": "Cohort-Specific Gap Drill",
      "format": "Drill",
      "blocks": [
        {
          "kind": "p",
          "text": "Now a brief drill of the gaps observed in your specific cohort during the simulation. Find your group, and lock in your highest-yield items."
        },
        {
          "kind": "h",
          "text": "For the Filipino cohort"
        },
        {
          "kind": "p",
          "text": "In therapeutic communication, when the patient names a feeling, name it back and invite more - do not redirect to family, do not offer practical solutions, and do not minimize. In delegation, remember the UAP cannot do anything that requires nursing judgment, including assessment, and the LPN cannot do initial assessment, IV push, blood, or initial teaching; reinforce the A PIE T mnemonic for what the RN cannot delegate. And on mandatory reporting, the nurse is a mandatory reporter for child abuse, elder abuse, gunshot wounds, and certain communicable diseases - reasonable suspicion is the threshold, not certainty."
        },
        {
          "kind": "h",
          "text": "For the UK cohort"
        },
        {
          "kind": "p",
          "text": "On US-specific medication doses, verify familiar drug doses in US conventions if you trained primarily in metric - insulin is in units worldwide, and acetaminophen max is 4 g/day on US labels (paracetamol is the UK terminology). On the NGN format, apply the CJMM systematically and do not be intimidated by unfamiliar item formats, because the reasoning is the same one you already know. And on therapeutic communication, US norms favor more explicit feeling-naming than UK practice - the 'tell me how you're feeling about this' style is what the test rewards."
        },
        {
          "kind": "h",
          "text": "For the African cohort (Kenya, Ghana)"
        },
        {
          "kind": "p",
          "text": "On delegation, the US RN/LPN/UAP tiered structure differs from home practice, so memorize the two-filter rule - within scope plus stable. On restraints, know the strict time limits - 4 hours for adults, 2 hours for children 9-17, and 1 hour for under 9 for behavioral restraints - that less restrictive alternatives must be tried first, and that restraints are tied to the bed frame, not the side rail. On HIPAA, even without explicit names a post can violate it, so the safest rule is to never post anything work-related involving patients. And in mental health therapeutic communication, secular feelings-focused responses are expected on the exam rather than spiritual framing, even when spiritual framing is culturally appropriate in your real practice."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Restraint time limits",
          "text": "Behavioral restraints: 4 hours adults, 2 hours children 9-17, 1 hour under 9. Try less restrictive alternatives first; tie to the bed frame, not the side rail."
        }
      ]
    },
    {
      "id": "mental-rehearsal",
      "minutes": "55-58",
      "title": "Final Mental Rehearsal & Confidence Build",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Take a breath. We have drilled hard for the last 50 minutes, and now I want you to slow down and rehearse mentally. Close your eyes if you want. Picture yourself walking into the testing center - you have checked in, you have been seated at your computer, and the test is starting."
        },
        {
          "kind": "p",
          "text": "The first question appears. Take a breath. Read the stem. Identify what is being asked. Read the options. Eliminate the wrong ones. Pick your best answer. Move on. Go question by question and do not dwell. If you do not know, pick your best answer using principles - safety first, ABC, therapeutic communication, the two-filter delegation rule - then flag it and move on. Take breaks when allowed: drink water, use the restroom, reset."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "When you finish, you will feel uncertain - that is normal",
          "text": "The CAT format adapts to your performance, and many candidates feel they did poorly when they passed and feel they did well when they didn't. The feeling is not reliable. Trust the work you have put in."
        },
        {
          "kind": "p",
          "text": "You have done the work. You have drilled the patterns. You have learned the cohort-specific gaps. Tomorrow, in Hour 20, we address logistics and final readiness - but the content work, the studying, is done. From here, your job is to rest, eat well, and trust your preparation."
        }
      ]
    },
    {
      "id": "close-preview-hour-20",
      "minutes": "58-60",
      "title": "Close & Preview Hour 20",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Final homework - light review only. Do NOT cram tonight. Review your journal: the cohort-wide patterns and the cohort-specific gaps, 15 to 20 minutes maximum. Then sleep, eat, and hydrate. The brain needs rest to consolidate what you have learned, and last-minute cramming the night before typically reduces performance through fatigue and anxiety."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Do not cram tonight",
          "text": "Light review under 30 minutes is fine. Sleep, hydration, and nutrition are higher priorities now - the studying is already done."
        },
        {
          "kind": "p",
          "text": "Hour 20 is exam day readiness. We cover CAT pacing strategy, anxiety management techniques, and logistics - what to bring, what time to arrive, and what to expect when you sit down at the computer - along with when to expect results and what to do the night before. See you in Hour 20. You're almost there."
        }
      ]
    }
  ]
};
