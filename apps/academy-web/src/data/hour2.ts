import type { Lesson } from "./lessonTypes";

/**
 * Section 2 - Test-Taking Strategy. Auto-generated from the Florence Academy
 * bootcamp instructor script (expanded draft). Pending nurse-educator review.
 */
export const lesson: Lesson = {
  "meta": {
    "number": 2,
    "title": "Test-Taking Strategy",
    "durationMin": 60,
    "audience": "Internationally educated nurses - Philippines, UK, Kenya, Ghana",
    "contentWeight": "Core reasoning skill - the hierarchy that answers the items that decide whether you pass",
    "tagline": "When a question hands you four reasonable answers, this is the hierarchy that picks one."
  },
  "objectives": [
    "Apply the ABC priority framework to select the correct patient or action when multiple options appear viable.",
    "Use Maslow's hierarchy to prioritize between physiologic and psychosocial needs in NCLEX-style scenarios.",
    "Apply the safety-first principle to recognize when a nurse must intervene immediately.",
    "Differentiate between actual and potential, acute and chronic, unstable and stable patients to determine priority.",
    "Eliminate distractors using six test-writer patterns commonly embedded in NCLEX items.",
    "Identify the three to five country-specific reasoning traps most likely to cost points, based on training origin."
  ],
  "timing": [
    {
      "minutes": "0-4",
      "segment": "Welcome back, Hour 1 recap, frame the hour",
      "format": "Lecture"
    },
    {
      "minutes": "4-15",
      "segment": "ABCs - the master framework",
      "format": "Lecture + 3 practice items"
    },
    {
      "minutes": "15-23",
      "segment": "Maslow on the NCLEX",
      "format": "Lecture + 2 practice items"
    },
    {
      "minutes": "23-30",
      "segment": "Safety first - when the nurse must intervene",
      "format": "Lecture + 2 practice items"
    },
    {
      "minutes": "30-37",
      "segment": "Acute/chronic, actual/potential, unstable/stable",
      "format": "Lecture + 2 practice items"
    },
    {
      "minutes": "37-47",
      "segment": "Eliminating distractors - the six test-writer patterns",
      "format": "Lecture + worked examples"
    },
    {
      "minutes": "47-55",
      "segment": "Country-specific traps: PH, UK, KE, GH",
      "format": "Lecture + reflection"
    },
    {
      "minutes": "55-60",
      "segment": "Synthesis item, Q&A, close",
      "format": "Practice + open mic"
    }
  ],
  "practiceItems": {
    "pi_abc_first_client": {
      "id": "pi_abc_first_client",
      "stem": "The nurse is assigned four clients. Which client should the nurse assess first?",
      "options": [
        {
          "key": "A",
          "text": "A client reporting 8/10 abdominal pain after appendectomy."
        },
        {
          "key": "B",
          "text": "A client with new-onset wheezing and SpO2 90%."
        },
        {
          "key": "C",
          "text": "A client with a temperature of 38.6°C two days postop."
        },
        {
          "key": "D",
          "text": "A client refusing to ambulate after hip replacement."
        }
      ],
      "answer": "B",
      "rationale": "New-onset wheezing with an oxygen saturation of 90 percent is a breathing problem. The other three clients are all uncomfortable, but none of them have an A, B, or C issue at this moment. The pain is real, but pain is not ABC. The fever is concerning but not immediately life-threatening. The refusal to ambulate is a teaching opportunity, not an emergency. B wins, every time.",
      "cjmm": "prioritize-hypotheses",
      "reference": "Section 2 · ABCs - the master framework"
    },
    "pi_thyroidectomy_stridor": {
      "id": "pi_thyroidectomy_stridor",
      "stem": "A client is admitted to the post-anesthesia care unit after a thyroidectomy. The nurse notes a respiratory rate of 18, SpO2 96%, and audible stridor. What is the nurse's first action?",
      "options": [
        {
          "key": "A",
          "text": "Notify the surgeon."
        },
        {
          "key": "B",
          "text": "Increase oxygen to 4 L/min."
        },
        {
          "key": "C",
          "text": "Position the client upright and prepare for emergency airway management."
        },
        {
          "key": "D",
          "text": "Loosen the surgical dressing and assess for hematoma."
        }
      ],
      "answer": "C",
      "rationale": "Stridor after a thyroidectomy means the airway is being compressed - most likely by a hematoma in the surgical bed. The temptation is to pick D, loosen the dressing, because that addresses the cause. But the question asks for the first action, and the first action when an airway is threatened is to position the patient to optimize the airway and prepare for emergency airway management. Loosening the dressing comes next, then notifying the surgeon. First action with an airway threat: secure the airway, then look for the cause. D and A are correct interventions here, but they are not first. C is first.",
      "cjmm": "take-actions",
      "reference": "Section 2 · ABCs - the master framework"
    },
    "pi_unresponsive_fall": {
      "id": "pi_unresponsive_fall",
      "stem": "The nurse finds a client unresponsive on the floor after a fall. What is the nurse's first action?",
      "options": [
        {
          "key": "A",
          "text": "Call for help."
        },
        {
          "key": "B",
          "text": "Check the client's airway."
        },
        {
          "key": "C",
          "text": "Assess for injuries."
        },
        {
          "key": "D",
          "text": "Move the client to the bed."
        }
      ],
      "answer": "B",
      "rationale": "This item tests whether you can apply ABC even when another option sounds reasonable. The answer is B, check the airway. Yes, you also call for help, and you absolutely do not move the client until you have assessed them. But the first action in any unresponsive patient is to assess the airway, always. ABC is the order in which you think and the order in which you act.",
      "cjmm": "take-actions",
      "reference": "Section 2 · ABCs - the master framework"
    },
    "pi_depression_self_care": {
      "id": "pi_depression_self_care",
      "stem": "A client with severe depression has not eaten or showered in four days. Which intervention is the priority?",
      "options": [
        {
          "key": "A",
          "text": "Encourage the client to attend group therapy."
        },
        {
          "key": "B",
          "text": "Sit with the client and explore feelings of hopelessness."
        },
        {
          "key": "C",
          "text": "Assist the client with hygiene and a small nutritious meal."
        },
        {
          "key": "D",
          "text": "Notify the psychiatrist that the client is not engaging."
        }
      ],
      "answer": "C",
      "rationale": "Four days without eating is a physiologic emergency. Hydration, nutrition, and hygiene are basic physiologic needs that must be addressed before the depression can be meaningfully treated. The temptation is to pick B, explore feelings, because depression is an emotional condition. But Maslow tells us: body before mind. C first, then the therapy.",
      "cjmm": "generate-solutions",
      "reference": "Section 2 · Maslow on the NCLEX"
    },
    "pi_anorexia_priority": {
      "id": "pi_anorexia_priority",
      "stem": "A client with anorexia nervosa has been admitted with a weight of 75 lb. The client refuses to eat and asks to be left alone. What is the nurse's priority?",
      "options": [
        {
          "key": "A",
          "text": "Respect the client's autonomy and leave the room."
        },
        {
          "key": "B",
          "text": "Initiate nutritional rehabilitation per protocol."
        },
        {
          "key": "C",
          "text": "Refer the client to the psychiatric counselor."
        },
        {
          "key": "D",
          "text": "Educate the client about the dangers of starvation."
        }
      ],
      "answer": "B",
      "rationale": "Anorexia at that weight is physiologic emergency territory. Cardiac arrhythmia, electrolyte collapse, and refeeding syndrome are immediate threats. The patient's preferences and education are downstream. Nutritional rehabilitation per protocol is the priority. Maslow: physiologic before everything else.",
      "cjmm": "prioritize-hypotheses",
      "reference": "Section 2 · Maslow on the NCLEX"
    },
    "pi_psych_plan_means": {
      "id": "pi_psych_plan_means",
      "stem": "A client on the psychiatric unit tells the nurse, \"I have been saving up my medications because I know what I am going to do tonight.\" What is the nurse's priority?",
      "options": [
        {
          "key": "A",
          "text": "Ask the client why they feel that way."
        },
        {
          "key": "B",
          "text": "Notify the psychiatrist."
        },
        {
          "key": "C",
          "text": "Initiate one-to-one observation and search the client's belongings."
        },
        {
          "key": "D",
          "text": "Document the statement and continue rounds."
        }
      ],
      "answer": "C",
      "rationale": "The client has expressed a plan and a means. This is imminent risk. The nurse's first action is to ensure safety: one-to-one observation, removal of the saved medications, and an environmental search for any other means. Notifying the psychiatrist comes after the patient is safe. Asking 'why' before securing safety is a delay that could cost the patient their life. Documentation is not first. Safety first, always.",
      "cjmm": "take-actions",
      "reference": "Section 2 · Safety first - when the nurse must intervene"
    },
    "pi_iv_potassium_bolus": {
      "id": "pi_iv_potassium_bolus",
      "stem": "A new nurse is preparing to administer intravenous potassium chloride. Which action by the new nurse requires the charge nurse to intervene?",
      "options": [
        {
          "key": "A",
          "text": "Verifying the order with a second nurse."
        },
        {
          "key": "B",
          "text": "Checking the client's most recent serum potassium level."
        },
        {
          "key": "C",
          "text": "Preparing to push the medication as an IV bolus."
        },
        {
          "key": "D",
          "text": "Placing the medication on an infusion pump."
        }
      ],
      "answer": "C",
      "rationale": "IV potassium is never given as a push or bolus, ever. It must be given as a controlled infusion via pump, because rapid potassium administration can cause cardiac arrest. The other three options are all correct practice. C is the unsafe action, and the charge nurse must intervene immediately. This is a classic safety question disguised as a procedure question - recognize it as safety.",
      "cjmm": "evaluate-outcomes",
      "reference": "Section 2 · Safety first - when the nurse must intervene"
    },
    "pi_medsurg_see_first": {
      "id": "pi_medsurg_see_first",
      "stem": "The nurse is assigned four clients on a medical-surgical unit. Which client should the nurse see first?",
      "options": [
        {
          "key": "A",
          "text": "A 78-year-old with chronic heart failure whose weight has been stable."
        },
        {
          "key": "B",
          "text": "A 45-year-old day three postoperative with vital signs unchanged."
        },
        {
          "key": "C",
          "text": "A 60-year-old newly admitted with shortness of breath and SpO2 92%."
        },
        {
          "key": "D",
          "text": "A 30-year-old with sickle cell disease scheduled for discharge."
        }
      ],
      "answer": "C",
      "rationale": "A is chronic and stable. B is day three post-op with a stable trend. C is newly admitted with an acute respiratory finding. D is about to be discharged, having demonstrated stability. C is acute, actual, and unstable territory. C first, every time.",
      "cjmm": "prioritize-hypotheses",
      "reference": "Section 2 · Acute, actual, unstable"
    },
    "pi_copd_trend": {
      "id": "pi_copd_trend",
      "stem": "A nurse receives report on four clients. Which client requires immediate assessment?",
      "options": [
        {
          "key": "A",
          "text": "A client with pneumonia whose temperature dropped from 102°F to 101°F."
        },
        {
          "key": "B",
          "text": "A client with COPD whose SpO2 dropped from 92% to 86% over two hours."
        },
        {
          "key": "C",
          "text": "A client postoperative day two with pain rated 6/10."
        },
        {
          "key": "D",
          "text": "A client with diabetes whose blood glucose is 180 mg/dL."
        }
      ],
      "answer": "B",
      "rationale": "The COPD patient is unstable - a saturation dropping six percentage points in two hours is a trend in the wrong direction. The pneumonia patient is improving, with the fever coming down. The post-op pain is expected and manageable. The glucose is elevated but not critical. Trend wins. B is the only one going in the wrong direction. B first.",
      "cjmm": "recognize-cues",
      "reference": "Section 2 · Acute, actual, unstable"
    },
    "pi_diabetes_insulin_communication": {
      "id": "pi_diabetes_insulin_communication",
      "stem": "A client with newly diagnosed Type 2 diabetes asks the nurse, \"Will I always need to take insulin?\" Which response by the nurse is most therapeutic?",
      "options": [
        {
          "key": "A",
          "text": "\"No, you may be able to control your diabetes with diet and oral medications.\""
        },
        {
          "key": "B",
          "text": "\"Don't worry - most patients adjust very well to their treatment.\""
        },
        {
          "key": "C",
          "text": "\"Why are you so concerned about insulin?\""
        },
        {
          "key": "D",
          "text": "\"Tell me more about your concerns regarding your treatment.\""
        }
      ],
      "answer": "D",
      "rationale": "Walk through this with the patterns. Option A gives a yes/no answer and provides clinical information; it is not wrong information, but it is premature reassurance and it closes the conversation - a pattern five issue. Option B is false reassurance plus an absolute, 'most patients adjust very well' - patterns one and five, eliminate. Option C starts with why - pattern five, eliminate. Option D is open-ended and invites the patient to share more; it is therapeutic. D is the answer. We used the elimination patterns to get there without even needing the clinical content.",
      "cjmm": "generate-solutions",
      "reference": "Section 2 · Eliminating distractors"
    }
  },
  "segments": [
    {
      "id": "recap-and-frame",
      "minutes": "0-4",
      "title": "Recap & Frame",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Welcome back. Before we begin, a word for anyone who typed 'no' or 'partial' on the 50-question fundamentals set from Hour 1 - no judgment, but a reminder. The bootcamp is the conversation. The questions are the workout. If you only attend the conversations, you are not getting strong; you are just getting informed. By Hour 3, that homework set is closed."
        },
        {
          "kind": "p",
          "text": "Quick recap of Hour 1. The exam is computerized adaptive - the algorithm hunts for your ability level. NGN has seven item types, with the bowtie carrying the most weight per item. And every single item is built on the Clinical Judgment Measurement Model: six steps from Recognize Cues, to Analyze Cues, Prioritize Hypotheses, Generate Solutions, Take Action, and Evaluate Outcomes. Hour 2 is where we hand you the tools that answer Step 3, Prioritize Hypotheses, and Step 5, Take Action."
        },
        {
          "kind": "p",
          "text": "Here is the truth about NCLEX questions. On the easier items, only one answer is reasonable. But the items that decide whether you pass - the ones at your ability ceiling - usually give you four answers that are all reasonable. All four nursing actions are things you would do for that patient. The question is: which one first. That is what we are training today, the hierarchy that chooses between four right answers."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "The promise of this hour",
          "text": "By the end of this hour, when a question gives you four reasonable answers, you will have a decision tree that picks one. Pull out the handout in your portal labeled 'Priority Decision Tree' and keep it next to you."
        }
      ]
    },
    {
      "id": "abcs-master-framework",
      "minutes": "4-15",
      "title": "ABCs - The Master Framework",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "ABC. Airway, Breathing, Circulation. If you remember nothing else from this hour, you will still pass more questions if you remember ABC. ABC is the master framework. It is the first filter you apply to any priority question on the NCLEX. Let me define each one precisely, because the words themselves can mislead you."
        },
        {
          "kind": "h",
          "text": "Airway - is the airway patent"
        },
        {
          "kind": "p",
          "text": "Airway does not just mean 'is the patient breathing.' Airway means: is the airway patent - is air able to move freely from outside the body into the lungs. So when you see a patient with stridor, that high-pitched harsh sound on inspiration, that is an airway problem because the airway is narrowing. A patient drooling and unable to swallow secretions is an airway problem because the airway is at risk. Anaphylaxis with facial swelling is airway. A decreased level of consciousness without a gag reflex is airway, because the tongue can fall back and the patient cannot protect themselves."
        },
        {
          "kind": "h",
          "text": "Breathing - is gas exchange occurring"
        },
        {
          "kind": "p",
          "text": "Breathing is what happens once the airway is patent: is the patient moving air effectively, and is gas exchange occurring. Look at respiratory rate. Look at oxygen saturation. Look at work of breathing - accessory muscle use, nasal flaring, retractions. Look at breath sounds - wheezing, crackles, diminished, absent. A patient with an oxygen saturation of 87 percent on room air is a B problem. A patient with a respiratory rate of 36 and tripoding posture is a B problem."
        },
        {
          "kind": "h",
          "text": "Circulation - is blood reaching the tissues"
        },
        {
          "kind": "p",
          "text": "Circulation is the cardiovascular system delivering blood to the tissues. Pulse - present, strong, weak, absent. Blood pressure - adequate to perfuse the brain and organs. Skin - pink and warm versus mottled and cold. Capillary refill. Active bleeding. Signs of shock - tachycardia, hypotension, altered mentation, decreased urine output."
        },
        {
          "kind": "h",
          "text": "Three subtleties to internalize"
        },
        {
          "kind": "p",
          "text": "Subtlety one: airway always wins over breathing, and breathing always wins over circulation, even when both are present. A patient with both an airway threat and a blood pressure of 80 over 50 - you address the airway first. Because if the airway closes, no amount of fluids will save them."
        },
        {
          "kind": "p",
          "text": "Subtlety two: subtle airway problems beat dramatic non-airway problems. This is the trap students fall into. The question gives you four patients. Patient one is screaming in pain from a kidney stone. Patient two is post-anesthesia with O2 sat 94 percent and quiet stridor on auscultation. Most students pick the screaming patient because the suffering is visible. But quiet stridor is an airway closing. Pick the stridor, always."
        },
        {
          "kind": "p",
          "text": "Subtlety three: ABC only applies when the situation is physiologic. If you have four psychiatric patients and none of them have an airway, breathing, or circulation issue, ABC does not help you - we move to safety, which we will reach in a few minutes."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "The dramatic-answer trap",
          "text": "Students pick the more dramatic-sounding answer when the airway issue is subtler - quiet stridor versus loud chest pain. Stridor wins. The order is fixed: A over B over C, and a subtle A beats a loud C."
        }
      ]
    },
    {
      "id": "abc-practice-chest-pain-wheezing",
      "minutes": "4-15",
      "title": "ABC Practice - Who First",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Let's do our first practice item. Four clients are assigned; the question is simply who you assess first. Read it, take 30 seconds, and choose A, B, C, or D before checking your reasoning against the rationale."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "How to work it",
          "text": "Scan all four for an A, B, or C threat before anything else. Pain, fever, and refusal to ambulate are real concerns but none of them are ABC at this moment."
        }
      ],
      "practiceItemId": "pi_abc_first_client"
    },
    {
      "id": "abc-practice-thyroidectomy",
      "minutes": "4-15",
      "title": "ABC Practice - First Action, Airway Threat",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "This next one is harder, and in live delivery it typically splits between two options. A client arrives in PACU after a thyroidectomy with stridor. The question asks for the first action, and that wording is doing real work here."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Secure the airway, then find the cause",
          "text": "When an airway is threatened, the first action is always to optimize and secure the airway and prepare for emergency airway management. Treating the underlying cause - loosening a dressing, draining a hematoma, notifying the surgeon - comes after, not first."
        }
      ],
      "practiceItemId": "pi_thyroidectomy_stridor"
    },
    {
      "id": "abc-practice-unresponsive-fall",
      "minutes": "4-15",
      "title": "ABC Practice - Unresponsive After a Fall",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "This item tests whether you can hold to ABC even when another option sounds reasonable. A client is found unresponsive on the floor after a fall. Calling for help and not moving the client are both correct instincts - but the question is asking what comes first."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Pearl",
          "text": "The first action in any unresponsive patient is to assess the airway. ABC is the order in which you think and the order in which you act."
        }
      ],
      "practiceItemId": "pi_unresponsive_fall"
    },
    {
      "id": "maslow-on-nclex",
      "minutes": "15-23",
      "title": "Maslow on the NCLEX",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Maslow's hierarchy of needs. Most of you learned this in nursing school: physiologic at the bottom, then safety, then love and belonging, then esteem, then self-actualization at the top. The principle is that lower needs must be met before higher needs become priorities."
        },
        {
          "kind": "p",
          "text": "On the NCLEX, Maslow shows up in a very specific way. It is the framework that decides between physiologic priorities and psychosocial priorities. The rule is: physiologic before psychosocial, always - unless safety is at immediate stake, in which case safety takes over."
        },
        {
          "kind": "p",
          "text": "Let me make this concrete. Picture a postpartum patient on day two. She is crying because she feels fat and ugly and her partner has not visited. Her blood pressure is 88 over 50, heart rate 118. What is the priority? It is not to sit with her and process her body image distress. The priority is the blood pressure and the heart rate - those are physiologic. Body image is esteem level. You assess for postpartum hemorrhage first; then, when she is stable, you have the body image conversation."
        },
        {
          "kind": "p",
          "text": "Here is where IENs from cultures that emphasize family and emotional support sometimes lose points. The psychosocial answer is not wrong because emotions do not matter - they matter enormously. The psychosocial answer is wrong because the test is asking for the priority, and priority means what addresses the threat first. You can still address the emotion. Just not first."
        },
        {
          "kind": "p",
          "text": "Within physiologic, the hierarchy continues. ABCs are the highest-priority physiologic needs. Below them come nutrition, hydration, elimination, comfort, and sleep. So if a question gives you a patient with O2 sat 90 percent and a patient who has not eaten in twelve hours, you assess the O2 sat patient first. ABC trumps food, every time."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Body before mind",
          "text": "Physiologic before psychosocial - and within physiologic, ABC trumps nutrition, hydration, elimination, comfort, and sleep. The only thing that overrides physiologic is an immediate safety threat."
        }
      ]
    },
    {
      "id": "maslow-practice-depression",
      "minutes": "15-23",
      "title": "Maslow Practice - Severe Depression, Self-Care",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "A client with severe depression has not eaten or showered in four days. The pull here is toward the emotional intervention, because depression is an emotional condition - but Maslow asks you to look at the body first."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Why C, not B",
          "text": "Four days without food is a physiologic emergency. Hygiene, nutrition, and hydration must be addressed before the depression can be meaningfully treated. Explore feelings after the basic physiologic needs are met."
        }
      ],
      "practiceItemId": "pi_depression_self_care"
    },
    {
      "id": "maslow-practice-anorexia",
      "minutes": "15-23",
      "title": "Maslow Practice - Anorexia Nervosa at 75 lb",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "A client with anorexia nervosa is admitted at a weight of 75 lb, refuses to eat, and asks to be left alone. Autonomy, referral, and education all sound reasonable - but at this weight the body is the emergency."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Physiologic emergency territory",
          "text": "At 75 lb, the immediate threats are cardiac arrhythmia, electrolyte collapse, and refeeding syndrome. Nutritional rehabilitation per protocol is the priority; preferences and education are downstream."
        }
      ],
      "practiceItemId": "pi_anorexia_priority"
    },
    {
      "id": "safety-first",
      "minutes": "23-30",
      "title": "Safety First",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Safety is the third framework, and it is the trump card for situations where ABC and Maslow do not quite fit: psychiatric emergencies, environmental hazards, infection control breaches, medication errors, and unsafe nursing actions. Safety shows up on the test in three patterns - memorize these."
        },
        {
          "kind": "h",
          "text": "Pattern one - the unsafe nursing action"
        },
        {
          "kind": "p",
          "text": "'Which action by the newly hired nurse requires intervention by the charge nurse?' This is asking what is unsafe. Look for the wrong nursing action - the one that violates a protocol, breaks sterile technique, gives a wrong dose, or places a patient at risk. These 'requires intervention' items are nearly always safety items, and the answer is the unsafe action."
        },
        {
          "kind": "h",
          "text": "Pattern two - intent to harm self or others"
        },
        {
          "kind": "p",
          "text": "'A psychiatric client states X. What is the priority?' Look for statements indicating intent to harm self or others. 'I have a plan' is the magic phrase. A patient with a plan is at imminent risk, and the priority is safety - one-to-one observation, removal of means, environmental safety. The priority is never to ask 'why do you feel this way' before securing safety."
        },
        {
          "kind": "h",
          "text": "Pattern three - environmental and infection control"
        },
        {
          "kind": "p",
          "text": "An IV pump that is alarming, a bedside rail that is down, a contact-precaution patient with the door open, a medication that was not double-checked. Restraints, fall risk, suicide precautions, medication errors, and infection control breaches all live here. Safety wins."
        },
        {
          "kind": "p",
          "text": "Now, the relationship between ABC and safety. If a safety threat IS an airway, breathing, or circulation threat - like a patient who hung themselves and is now unconscious - ABC applies, and you address the airway first. Safety as a separate framework picks up where ABC does not apply: psychiatric, environmental, falls, infections, medication errors."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Where each framework lives",
          "text": "If the safety threat is itself an A, B, or C threat, ABC wins by default. Safety is the framework for the dangers ABC cannot see: psychiatric risk, environmental hazards, falls, infection control, and medication errors."
        }
      ]
    },
    {
      "id": "safety-practice-saved-meds",
      "minutes": "23-30",
      "title": "Safety Practice - \"I Have a Plan\"",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "A client on the psychiatric unit says they have been saving up their medications because they know what they are going to do tonight. This is the pattern-two item in its purest form: a stated plan and a stated means."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Secure safety before anything else",
          "text": "A plan plus a means equals imminent risk. One-to-one observation and removal of the means come first. Asking 'why' or notifying the psychiatrist before the patient is safe is a delay that could cost a life; documentation is never the first action."
        }
      ],
      "practiceItemId": "pi_psych_plan_means"
    },
    {
      "id": "safety-practice-iv-potassium",
      "minutes": "23-30",
      "title": "Safety Practice - IV Potassium",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "A new nurse is preparing to administer intravenous potassium chloride. The question asks which action requires the charge nurse to intervene - in other words, which action is unsafe. This is a safety item dressed up as a procedure item."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Never push or bolus IV potassium",
          "text": "IV potassium must be given as a controlled infusion via pump - never as a push or bolus - because rapid administration can cause cardiac arrest. Verifying the order, checking the serum level, and using a pump are all correct; pushing it as a bolus is the unsafe action."
        }
      ],
      "practiceItemId": "pi_iv_potassium_bolus"
    },
    {
      "id": "acute-actual-unstable",
      "minutes": "30-37",
      "title": "Acute, Actual, Unstable",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Now we go to the fourth framework, and this one is for the questions where ABC, Maslow, and Safety all apply equally to all the answer choices. When you cannot separate them with the three big frameworks, you reach for these three discriminators - three ways to choose between patients of comparable acuity."
        },
        {
          "kind": "h",
          "text": "Actual over potential"
        },
        {
          "kind": "p",
          "text": "A patient with active bleeding wins over a patient at risk of bleeding. A patient with infection wins over a patient at risk of infection. A patient with pain wins over a patient at risk of pain. The word 'risk' in an answer choice is often a tell - that patient is potential, not actual."
        },
        {
          "kind": "h",
          "text": "Acute over chronic"
        },
        {
          "kind": "p",
          "text": "A new problem wins over an established problem. The patient newly diagnosed in diabetic ketoacidosis wins over the patient with longstanding, well-controlled diabetes. The patient with new chest pain wins over the patient with chronic stable angina they have had for ten years. Acute means new, sudden, recent onset; chronic means established, ongoing, longstanding."
        },
        {
          "kind": "h",
          "text": "Unstable over stable - the trend discriminator"
        },
        {
          "kind": "p",
          "text": "This is the trend discriminator. The patient whose blood pressure has dropped from 130 over 80 to 100 over 60 over four hours is unstable, even though 100 over 60 is technically still adequate. The patient whose blood pressure has been 90 over 60 consistently for two days is stable, even though that number is lower. Trend beats snapshot. Direction beats value."
        },
        {
          "kind": "p",
          "text": "Two practical applications fall out of this. First post-op day wins over fifth post-op day, because day one is when bleeding, anesthesia complications, and infection start. And a newly admitted patient wins over a patient about to be discharged, because the discharge patient has demonstrated stability."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Scary diagnosis vs. scary trend",
          "text": "Students pick the patient with the scariest diagnosis - cancer over new shortness of breath - because cancer sounds worse. But cancer is chronic and shortness of breath is acute. The frightening trend beats the frightening diagnosis. Trend wins."
        }
      ]
    },
    {
      "id": "acute-practice-medsurg",
      "minutes": "30-37",
      "title": "Discriminator Practice - Who First on Med-Surg",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Four med-surg clients, and none of them screams ABC louder than the others on the surface - so reach for the discriminators. Sort each one as acute or chronic, actual or potential, stable or unstable."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Sort each client",
          "text": "Chronic-stable, day-three-stable, and ready-for-discharge all signal demonstrated stability. The newly admitted client with an acute respiratory finding is the one in acute, actual, unstable territory."
        }
      ],
      "practiceItemId": "pi_medsurg_see_first"
    },
    {
      "id": "acute-practice-copd-trend",
      "minutes": "30-37",
      "title": "Discriminator Practice - The Trend Item",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Four clients in report, and the trap here is the number that looks alarming in isolation versus the number that is moving in the wrong direction. Read each value as a direction, not just a snapshot."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Direction beats value",
          "text": "A saturation falling from 92% to 86% over two hours is a trend going the wrong way. A fever coming down is improving, expected post-op pain is stable, and a glucose of 180 is elevated but not critical. The deteriorating trend is the one to see first."
        }
      ],
      "practiceItemId": "pi_copd_trend"
    },
    {
      "id": "eliminating-distractors",
      "minutes": "37-47",
      "title": "Eliminating Distractors - The Six Test-Writer Patterns",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Now I want to flip the perspective. Instead of picking the right answer, let's get good at eliminating the wrong ones. Here is a fact about the NCLEX: if you can eliminate two of the four options, you have raised your probability of correctly guessing from 25 percent to 50 percent. If you can eliminate three, you have it. The test rewards skilled elimination as much as skilled selection. Test-writers use predictable patterns to construct distractors - once you know the patterns, you spot them on sight. Six patterns. Write them down."
        },
        {
          "kind": "h",
          "text": "Pattern 1 - Absolutes"
        },
        {
          "kind": "p",
          "text": "The words always, never, all, none, only, must, every, completely. These words make an answer brittle. Almost nothing in clinical nursing is always or never. So 'the nurse should always restrain the confused patient' is almost certainly wrong, and 'the patient should never eat after midnight before surgery' is brittle and probably wrong. Absolutes are red flags."
        },
        {
          "kind": "h",
          "text": "Pattern 2 - Direct opposites"
        },
        {
          "kind": "p",
          "text": "When two answer choices say opposite things - 'apply heat' versus 'apply cold,' 'elevate the head' versus 'lower the head,' 'increase the rate' versus 'decrease the rate' - one of those two is usually the correct answer. The test-writer is forcing you to pick a direction. The other two options are usually safer-sounding but wrong, because the question requires a choice."
        },
        {
          "kind": "h",
          "text": "Pattern 3 - Equivalent options"
        },
        {
          "kind": "p",
          "text": "When two answer choices say essentially the same thing in different words - 'monitor closely' and 'observe frequently,' for example - neither can be correct, because they would both be right or both wrong, and only one option can be marked correct. Eliminate both. That narrows you to a 50-50."
        },
        {
          "kind": "h",
          "text": "Pattern 4 - Notify the provider"
        },
        {
          "kind": "p",
          "text": "This is the most common distractor pattern, and the most dangerous trap for IENs from physician-deferential training cultures. Notifying the provider is correct only when the nurse cannot intervene independently - when the situation requires an order, a diagnostic decision, or a medication adjustment beyond the nurse's scope. If there is a nursing action that addresses the immediate situation - assess, position, oxygen, IV access, comfort measure - the nursing action is the answer. 'Notify the physician' is the right answer maybe ten percent of the time; the other ninety percent, it is a distractor."
        },
        {
          "kind": "h",
          "text": "Pattern 5 - Closed-ended therapeutic communication"
        },
        {
          "kind": "p",
          "text": "Anything that can be answered with yes or no - 'are you feeling depressed?' Anything that starts with why - 'why do you feel that way?' Anything that gives false reassurance - 'don't worry, everything will be fine.' Anything that gives advice - 'I think you should...' These are all wrong therapeutic communication patterns. We drill these in Hour 14, but recognize them now."
        },
        {
          "kind": "h",
          "text": "Pattern 6 - UAP delegation that requires assessment, teaching, or evaluation"
        },
        {
          "kind": "p",
          "text": "Unlicensed Assistive Personnel - nursing aides, patient care techs - can do measurable, predictable, stable tasks: vital signs on a stable patient, toileting, feeding a stable patient, bathing, position changes. They cannot assess, they cannot teach, and they cannot evaluate effectiveness. So if a question asks which task the RN can delegate to the UAP and one option says 'assess the patient's pain level,' that is wrong; 'teach the patient about insulin' is wrong; 'evaluate the response to medication' is wrong. The correct delegation is something stable, predictable, and measurable. We drill this in Hour 16."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Patterns first, content second",
          "text": "Train yourself to scan for these six patterns before you reason about the clinical content. Often the patterns alone will collapse the four options down to the answer. By Hour 19, this becomes automatic."
        }
      ]
    },
    {
      "id": "distractor-worked-example",
      "minutes": "37-47",
      "title": "Worked Example - Patterns First",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Let's walk through a worked example where three of the patterns appear in the distractors. A client with newly diagnosed Type 2 diabetes asks, 'Will I always need to take insulin?' and we are choosing the most therapeutic response. Notice that we can reach the answer purely by elimination, before we even consider the clinical facts."
        },
        {
          "kind": "list",
          "items": [
            "Option A gives a yes/no answer and clinical information - not wrong information, but premature reassurance that closes the conversation. Pattern 5.",
            "Option B is false reassurance plus an absolute, 'most patients adjust very well.' Patterns 1 and 5. Eliminate.",
            "Option C starts with 'why.' Pattern 5. Eliminate.",
            "Option D is open-ended and invites the patient to share more. Therapeutic - this is the answer."
          ]
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "The point of the exercise",
          "text": "We used the elimination patterns to land on D without needing to know the underlying diabetes content. That is the work: patterns first, content second."
        }
      ],
      "practiceItemId": "pi_diabetes_insulin_communication"
    },
    {
      "id": "country-specific-traps",
      "minutes": "47-55",
      "title": "Country-Specific Traps: PH, UK, KE, GH",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Now we get to the segment that is going to feel personal. I am going to name the specific reasoning traps that come up for nurses trained in each of your countries, and I am going to do it with respect - none of these traps are about poor training; they are about training in a different system. But I am going to name them honestly, because if I soften them, they will cost you points."
        },
        {
          "kind": "h",
          "text": "Filipino-trained nurses - three traps"
        },
        {
          "kind": "p",
          "text": "First, paternalism in therapeutic communication. The cultural script for comforting a worried patient in Filipino practice often includes phrases like 'don't worry, you're going to be fine,' 'the doctors here are very good,' or 'God will take care of everything.' These are kind, professional, human responses. They are also, every single one of them, wrong answers on the NCLEX - the test considers them false reassurance, dismissive of the patient's actual emotional state, and culturally specific in ways that limit therapeutic openness. When you see them in answer options, eliminate them on sight. The right answer is almost always an open-ended invitation to talk more, such as 'tell me more about what's worrying you' or 'it sounds like this is on your mind.'"
        },
        {
          "kind": "p",
          "text": "Second, physician deference. In the Philippines, hierarchical respect for physicians can mean the nurse's instinct is to call the doctor as a first action. NCLEX nursing scope is broader and more autonomous: the nurse assesses first, the nurse intervenes within scope first, and the nurse notifies the provider only when an order or a decision beyond nursing scope is needed. If a question gives you 'notify the physician' as one of four options, your default suspicion should be that it is a distractor unless the question makes clear there is nothing else the nurse can do."
        },
        {
          "kind": "p",
          "text": "Third, family-centered prioritization. Filipino healthcare is deeply family-oriented, and that is a beautiful clinical strength. On the NCLEX, however, the patient is the unit of analysis. If a question gives you 'involve the family' as an option, it is correct only when the question is specifically about discharge planning, education, or emotional support - not when the patient has an acute physiologic priority. Patient's body first, family second."
        },
        {
          "kind": "h",
          "text": "UK-trained nurses - three traps"
        },
        {
          "kind": "p",
          "text": "First, NMC scope versus NCSBN scope. The UK has expanded the scope of nursing in ways the US has not - nurse prescribers, advanced clinical practitioners, and nurse-led discharge are all routine in NHS practice. NCLEX uses US scope, which has a sharper line between RN scope and advanced practice. If a question seems to assume you do not have authority for something you would have done routinely in the UK, the question is right about US scope. Adapt."
        },
        {
          "kind": "p",
          "text": "Second, terminology. Paracetamol is acetaminophen. Adrenaline is epinephrine. GTN - glyceryl trinitrate - is nitroglycerin. Cannula is IV catheter. Plaster is bandage. Theatre is OR. Crash trolley is crash cart. Bank nurse is per diem. These are not just vocabulary curiosities; they appear in distractors. A UK nurse who sees 'epinephrine' and does not immediately translate to adrenaline can lose a critical, seconds-counting decision in an anaphylaxis question. Drill the equivalences."
        },
        {
          "kind": "p",
          "text": "Third, different routine practice. UK paediatric drug dosing follows the BNFc in milligrams per kilogram, and weights are always in kilograms. US practice mixes kilograms and pounds, and the NCLEX will sometimes give you a weight in pounds - be ready to convert, since pounds divided by 2.2 gives kilograms. Also, UK practice typically uses 'every four to six hours' style dosing while US practice is more often a specific interval like 'every six hours.' Read the order carefully."
        },
        {
          "kind": "h",
          "text": "Kenyan and Ghanaian-trained nurses - three traps"
        },
        {
          "kind": "p",
          "text": "First, broader practical scope. In many Kenyan and Ghanaian hospitals, especially outside the major teaching centers, RNs perform tasks that in the US would be physician or advanced-practice roles: independent triage decisions, IV insertion under emergency, minor surgical preparation, even some prescribing in nurse-led clinics. NCLEX scope is narrower. If you trained in a setting where you did it all because staffing demanded it, the test will not reward that. Match your answers to US scope, not your competence."
        },
        {
          "kind": "p",
          "text": "Second, improvisation versus protocol. In resource-limited settings, clinically excellent nursing often involves improvising - using what is available, adapting a procedure when equipment is missing, finding a workaround. NCLEX rewards protocol adherence. If a workaround works clinically but deviates from the documented standard, NCLEX marks it wrong. The answer is always 'per protocol,' 'per policy,' 'follow facility guidelines.' This can feel like the test is rewarding rigidity. It is. Match it."
        },
        {
          "kind": "p",
          "text": "Third, delegation downward. In settings where UAP-equivalent roles are scarce, the habit can be to do the task yourself rather than delegate. NCLEX rewards correct delegation. If you can give the task to a UAP within scope - vital signs on a stable patient, ambulation assistance, intake and output - you should. The test rewards efficient use of the team, not personal heroism."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Translation, not retraining",
          "text": "Some of you may feel this dismisses your training. It does not. Your training is valid in its context. The NCLEX is not measuring whether you are a good nurse - it is measuring whether you can practice within US scope. Hold that frame: translation, not retraining."
        }
      ]
    },
    {
      "id": "synthesis-and-close",
      "minutes": "55-60",
      "title": "Synthesis & Close",
      "format": "Case",
      "blocks": [
        {
          "kind": "p",
          "text": "Last item of the hour - apply everything. The nurse is caring for four clients and must decide who to assess first: (A) a client with chronic schizophrenia refusing morning medications; (B) a newly admitted client with chest pain and SpO2 88%; (C) a postoperative day three client whose family is requesting to speak with the nurse; or (D) a client with longstanding stable hypertension reporting mild headache. Take 45 seconds and run every framework before you decide."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "The answer is B - and here is every framework",
          "text": "ABC: B is a breathing problem at SpO2 88%, and the other three have no ABC concern. Maslow: B is physiologic while the others are mixed psychosocial and chronic physiologic. Safety: B is the immediate threat. Acute over chronic: B is newly admitted; the others are chronic or longstanding. Actual over potential: B has actual hypoxia. Distractor elimination: none of A, C, or D address an ABC threat, so the first framework alone eliminates them. B is the only answer the frameworks select."
        },
        {
          "kind": "p",
          "text": "This is the work. Train the hierarchy: ABC first, then safety, then Maslow, then acute over chronic, then actual over potential, then unstable over stable - layered on top with the distractor patterns. With practice, this becomes a single mental gesture: you look at a question, scan four answers, and the answer surfaces in about twenty seconds."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Homework before Hour 3",
          "text": "Fifty priority-format practice questions. Log every question you get wrong in your journal - topic, your wrong answer, the right answer, and the framework you missed. Bring the journal to Hour 3 so we can see where each of you specifically loses points."
        },
        {
          "kind": "p",
          "text": "Hour 3 is pharmacology - cardiac and anticoagulants: beta blockers, ACE inhibitors, calcium channel blockers, digoxin, statins, heparin, warfarin, and the new oral anticoagulants. Generic names, US conventions. If your generic-to-brand name recognition is weak, review the cardiac drug list in your portal before Hour 3, because we will move fast. Take what you needed today, and we will layer the next set in next session."
        }
      ]
    }
  ]
};
