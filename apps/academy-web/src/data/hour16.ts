import type { Lesson } from "./lessonTypes";

/**
 * Section 16 - Management of Care. Auto-generated from the Florence Academy
 * bootcamp instructor script (expanded draft). Pending nurse-educator review.
 */
export const lesson: Lesson = {
  "meta": {
    "number": 16,
    "title": "Management of Care",
    "durationMin": 60,
    "audience": "Internationally educated nurses - Philippines, UK, Kenya, Ghana",
    "contentWeight": "Approximately 17-23% of NCLEX items - the largest single category (delegation alone may be 10-15%)",
    "tagline": "The largest single NCLEX category and the second-biggest IEN gap - master delegation, prioritization, and the nurse's true role in consent."
  },
  "objectives": [
    "Differentiate RN, LPN/LVN, and UAP/CNA scope of practice and identify tasks that can or cannot be delegated to each.",
    "Apply the 5 Rights of Delegation - Right Task, Right Circumstance, Right Person, Right Direction, Right Supervision.",
    "Identify the five tasks that CANNOT be delegated by the RN - assessment, planning, evaluation, nursing judgment, and initial teaching.",
    "Apply multi-patient prioritization using ABC, acute over chronic, unstable over stable, and unexpected-findings frameworks.",
    "Distinguish the nurse's role in informed consent (WITNESS) from the provider's role (provider gives information and obtains consent).",
    "Apply HIPAA principles including minimum necessary, need-to-know, and common violations (social media, public discussion, password sharing).",
    "Differentiate advance directive, living will, durable POA for healthcare, POLST/MOLST, and DNR; apply the 'full code by default unless otherwise ordered' principle.",
    "Apply the four core ethical principles - autonomy, beneficence, nonmaleficence, justice - to nursing decisions.",
    "Recognize categories of mandatory reporting beyond child abuse - elder abuse, communicable diseases, suspicious injuries, impaired colleagues."
  ],
  "timing": [
    {
      "minutes": "0-3",
      "segment": "Frame the IEN delegation gap",
      "format": "Lecture"
    },
    {
      "minutes": "3-15",
      "segment": "Scope of practice & delegation",
      "format": "Lecture + 2 items"
    },
    {
      "minutes": "15-22",
      "segment": "Multi-patient prioritization",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "22-30",
      "segment": "Informed consent - nurse vs provider role",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "30-37",
      "segment": "HIPAA & privacy",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "37-44",
      "segment": "Advance directives, DNR, code status",
      "format": "Lecture"
    },
    {
      "minutes": "44-50",
      "segment": "Mandatory reporting (expanded) & ethics",
      "format": "Lecture"
    },
    {
      "minutes": "50-55",
      "segment": "Conflict resolution & advocacy",
      "format": "Lecture"
    },
    {
      "minutes": "55-58",
      "segment": "Synthesis - multi-patient case",
      "format": "Case"
    },
    {
      "minutes": "58-60",
      "segment": "Close & homework",
      "format": "Lecture"
    }
  ],
  "practiceItems": {
    "pi_delegate_to_uap": {
      "id": "pi_delegate_to_uap",
      "stem": "A registered nurse is making assignments on a busy medical-surgical unit. Which task is most appropriate to delegate to the unlicensed assistive personnel (UAP)?",
      "options": [
        {
          "key": "A",
          "text": "Initial assessment of a newly admitted patient with chest pain."
        },
        {
          "key": "B",
          "text": "Administration of oral metoprolol to a stable hypertensive patient."
        },
        {
          "key": "C",
          "text": "Vital signs on a stable 2-day post-op cholecystectomy patient."
        },
        {
          "key": "D",
          "text": "Reinforcement of diabetes teaching for a newly diagnosed patient."
        }
      ],
      "answer": "C",
      "rationale": "Vital signs on a stable post-op patient are within UAP scope. A is initial assessment - RN only. B is medication administration - outside UAP scope (LPN or RN). D is reinforcement of teaching - outside UAP scope (an LPN can reinforce teaching the RN initiated; a UAP cannot teach at all). C passes both filters - the task is within UAP scope AND the patient is stable.",
      "cjmm": "take-actions",
      "reference": "Section 16 · Scope of practice & delegation"
    },
    "pi_delegate_to_lpn": {
      "id": "pi_delegate_to_lpn",
      "stem": "The RN is delegating tasks. Which patient assignment is most appropriate to delegate to the LPN?",
      "options": [
        {
          "key": "A",
          "text": "A newly admitted patient with chest pain requiring initial assessment."
        },
        {
          "key": "B",
          "text": "A patient receiving an IV push of morphine for pain."
        },
        {
          "key": "C",
          "text": "A stable patient who needs a routine indwelling urinary catheter inserted for surgery."
        },
        {
          "key": "D",
          "text": "A patient requiring discharge teaching on a new diabetes diagnosis."
        }
      ],
      "answer": "C",
      "rationale": "Indwelling catheter insertion in a stable patient is within LPN scope in most states. A - initial assessment is RN only. B - IV push is RN only in most institutions. D - initial discharge teaching is RN only. C is the LPN-scope task on a stable patient. The same two filters apply to LPN delegation as to UAP delegation: within scope AND patient stable.",
      "cjmm": "take-actions",
      "reference": "Section 16 · Scope of practice & delegation"
    },
    "pi_who_first": {
      "id": "pi_who_first",
      "stem": "A nurse on a medical-surgical unit has just received report. Which patient should be assessed FIRST?",
      "options": [
        {
          "key": "A",
          "text": "A 72-year-old admitted yesterday with pneumonia, on oral antibiotics, awaiting discharge education."
        },
        {
          "key": "B",
          "text": "A 56-year-old with a hip fracture, scheduled for surgery in 6 hours, currently complaining of pain 6/10."
        },
        {
          "key": "C",
          "text": "A 65-year-old post-op day 1 from abdominal surgery, reporting new shortness of breath and chest tightness."
        },
        {
          "key": "D",
          "text": "A 48-year-old admitted with diabetic ketoacidosis yesterday, glucose now 180, on insulin drip with hourly checks."
        }
      ],
      "answer": "C",
      "rationale": "New shortness of breath and chest tightness in a post-op day 1 patient is highly concerning - possible pulmonary embolism. It is UNEXPECTED, UNSTABLE, and ACUTE, and ABC applies because a breathing concern outranks the others. A is awaiting routine education - lowest priority. B is expected post-op pain - manage but lower urgency. D is being actively managed and is stable on protocol. C combines unexpected, unstable, and an ABC concern. The 'something is wrong' post-op patient is a high-yield NCLEX prioritization scenario.",
      "cjmm": "prioritize-hypotheses",
      "reference": "Section 16 · Multi-patient prioritization"
    },
    "pi_consent_does_not_understand": {
      "id": "pi_consent_does_not_understand",
      "stem": "A nurse is preparing a 67-year-old client for surgical removal of a renal tumor in 1 hour. The surgical consent has been signed. While reviewing the consent, the client says, \"My doctor mentioned a tumor, but I don't really understand what they're going to remove or what the risks are.\" Which is the nurse's priority action?",
      "options": [
        {
          "key": "A",
          "text": "Explain the surgical procedure and the risks to the client."
        },
        {
          "key": "B",
          "text": "Reassure the client that the surgeon is very experienced."
        },
        {
          "key": "C",
          "text": "Notify the surgeon that the client needs further explanation before the procedure."
        },
        {
          "key": "D",
          "text": "Have the client sign a withdrawal of consent form."
        }
      ],
      "answer": "C",
      "rationale": "The patient does not adequately understand the procedure, so the consent process must be paused until understanding is established. The nurse's role is NOT to explain the procedure (A) - that is the provider's responsibility. False reassurance (B) is non-therapeutic. Withdrawing consent (D) is premature; the patient has not said they want to refuse, only that they do not understand. The correct action is to notify the provider for re-explanation.",
      "cjmm": "take-actions",
      "reference": "Section 16 · Informed consent - nurse vs provider role"
    },
    "pi_hipaa_social_media": {
      "id": "pi_hipaa_social_media",
      "stem": "A nurse posts on a personal social media account: \"Tough day at work today. Lost a patient - heart attack while we were doing CPR. So sad for the family.\" The post does not name the patient. Which statement about this post is correct?",
      "options": [
        {
          "key": "A",
          "text": "The post is acceptable because the patient is not named."
        },
        {
          "key": "B",
          "text": "The post is acceptable because it does not include medical record information."
        },
        {
          "key": "C",
          "text": "The post may still be a HIPAA violation if details could identify the patient."
        },
        {
          "key": "D",
          "text": "The post is acceptable because it is on a personal account."
        }
      ],
      "answer": "C",
      "rationale": "Even without explicit identification, the post may be a HIPAA violation if any combination of details - time, location, mechanism, demographics - could allow identification of the patient. The patient's family, coworkers, or community members may recognize who was discussed. The 'no names' defense does not protect against HIPAA violations. A, B, and D all misunderstand HIPAA. The safest rule - never post anything work-related involving patients, period.",
      "cjmm": "evaluate-outcomes",
      "reference": "Section 16 · HIPAA & privacy"
    }
  },
  "segments": [
    {
      "id": "frame-the-ien-gap",
      "minutes": "0-3",
      "title": "Frame the IEN Gap",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Welcome to Hour 16, Management of Care. This is approximately 17 to 23 percent of NCLEX items - the largest single category on the entire exam. Delegation alone may represent 10 to 15 percent of items. So this hour matters disproportionately; the time you invest here pays back across a huge share of the test."
        },
        {
          "kind": "p",
          "text": "This is the second-biggest IEN gap after Hour 14's therapeutic communication, and the reason is structural. Many home countries don't have the formal RN, LPN, and UAP scope distinctions that the US has. In the Philippines, many of the tasks performed by US UAPs and LPNs are routinely done by registered nurses. In the UK, the bands and roles are structured differently. Across much of Africa, the nursing staff structure varies but typically has fewer formal license tiers than the US. The result is that the delegation framework is genuinely new for many of you - and the test will hammer it."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "This is structure, not competence",
          "text": "The US delegation hierarchy is not a comment on your competence as a nurse - it is a regulatory structure that decides who does what. You can do these tasks; the US system simply structures who performs them differently. Learn the structure for the test and for US practice while keeping your dignity intact."
        },
        {
          "kind": "p",
          "text": "Expect heavy callbacks today. Priority frameworks from Hour 2 - ABC, Maslow, acute over chronic. Mandatory reporting from Hour 13 - expanded today beyond child abuse. Restraint orders from Hour 15. Incident reports from Hour 15. Let's start with the centerpiece - scope and delegation."
        }
      ]
    },
    {
      "id": "scope-and-delegation",
      "minutes": "3-15",
      "title": "Scope of Practice & Delegation",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "There are three personnel roles to know in detail, and you must memorize what each one can and cannot do. The test repeatedly asks you to match a task to the right level of staff, so commit the boundaries to memory rather than reasoning them out under time pressure."
        },
        {
          "kind": "h",
          "text": "Registered Nurse (RN)"
        },
        {
          "kind": "p",
          "text": "The RN performs the initial patient assessment, develops the plan of care, delivers initial patient education, and evaluates outcomes - that is, judges whether the intervention actually worked. The RN administers IV push medications in most institutions, administers blood and blood products, and cares for unstable or critical patients. The RN performs sterile procedures, manages central lines, administers TPN and chemotherapy, and does triage in emergency settings. The unifying principle is judgment: any task requiring nursing JUDGMENT is RN-only."
        },
        {
          "kind": "h",
          "text": "Licensed Practical Nurse / Licensed Vocational Nurse (LPN/LVN)"
        },
        {
          "kind": "p",
          "text": "The LPN - or LVN, depending on your state's terminology - works under RN supervision. The LPN can administer most oral medications, give IM and SQ injections, insert urinary catheters in most states, and maintain an established IV (whether the LPN can initiate an IV is state-dependent). The LPN provides tracheostomy care including routine suctioning, wound care for stable wounds, and care of STABLE patients. The LPN can REINFORCE teaching previously initiated by the RN - note the word 'reinforce,' not 'initiate.' Some IV piggyback medications fall within LPN scope, varying by state and institution."
        },
        {
          "kind": "p",
          "text": "Know the LPN limitations just as well as the abilities. The LPN cannot perform the initial assessment of a new patient, cannot administer IV push medications in most institutions, and cannot administer blood in most institutions. The LPN cannot do initial patient teaching - that is RN-only - and has only limited central line care. Care of unstable patients is reserved for the RN."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "LPN: reinforce, never initiate",
          "text": "The LPN can REINFORCE teaching the RN already started, but can NEVER perform INITIAL teaching on a new diagnosis, medication, or procedure. On the exam, 'discharge teaching for a newly diagnosed patient' is RN-only - not an LPN task."
        },
        {
          "kind": "h",
          "text": "Unlicensed Assistive Personnel (UAP) / Certified Nursing Assistant (CNA)"
        },
        {
          "kind": "p",
          "text": "The UAP - also known as a Certified Nursing Assistant, or CNA - holds no nursing license and is trained for specific tasks. The UAP can take vital signs on STABLE patients and perform ADLs, the activities of daily living: bathing, dressing, feeding, and toileting. The UAP ambulates stable patients; positions, turns, and repositions; measures and records intake and output; collects specimens such as urine and stool from a continent patient; applies compression stockings (TEDs or sequential compression devices); and documents vital signs, I&O, and ADLs."
        },
        {
          "kind": "p",
          "text": "The UAP limitations are heavily tested. The UAP cannot administer medications in most institutions and cannot perform any ASSESSMENT. Note this distinction carefully: a UAP can take vital signs, but the INTERPRETATION of those vital signs is the RN's job. The UAP measures the blood pressure; the RN evaluates whether 88/54 is concerning in this particular patient. The UAP cannot teach, cannot interpret data, cannot perform sterile procedures, and cannot care for unstable patients independently."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Measuring is not assessing",
          "text": "A UAP can MEASURE a vital sign but cannot ASSESS it. Taking the BP is delegable; deciding whether 88/54 is dangerous in this patient is nursing judgment and stays with the RN."
        },
        {
          "kind": "h",
          "text": "The Five Rights of Delegation - Memorize"
        },
        {
          "kind": "p",
          "text": "Right one is the RIGHT TASK. The task is within the scope of practice for the person being delegated to, is routine and predictable, and does not require independent nursing judgment."
        },
        {
          "kind": "p",
          "text": "Right two is the RIGHT CIRCUMSTANCE. The patient is stable, the setting is appropriate, and the necessary resources are available."
        },
        {
          "kind": "p",
          "text": "Right three is the RIGHT PERSON. The delegated person is competent, trained, and authorized to perform the task. The RN verifies COMPETENCY, not just job title - a new UAP may not yet be ready for every task that falls within UAP scope."
        },
        {
          "kind": "p",
          "text": "Right four is the RIGHT DIRECTION / COMMUNICATION. The RN gives clear, specific, complete instructions including expected outcomes and reporting parameters. 'Take vitals on Room 12 every 4 hours; report any BP below 100 systolic or HR above 110' is right direction. Simply saying 'Take vitals' is not."
        },
        {
          "kind": "p",
          "text": "Right five is the RIGHT SUPERVISION / EVALUATION. The RN monitors performance, provides feedback, and remains ACCOUNTABLE for outcomes. Delegating a task does not transfer accountability - the RN remains responsible for what happens to the patient."
        },
        {
          "kind": "h",
          "text": "The Five Tasks the RN Cannot Delegate - Memorize"
        },
        {
          "kind": "p",
          "text": "A helpful mnemonic is 'A PIE T' - Assessment (initial), Planning, Implementation requiring judgment, Evaluation, and Teaching (initial). These five always stay with the RN."
        },
        {
          "kind": "list",
          "items": [
            "Assessment - the initial assessment of a new patient, reassessment after an intervention, and anytime nursing judgment is required to interpret data.",
            "Planning - nursing diagnoses, care planning, and setting care priorities.",
            "Implementation that requires JUDGMENT - IV push medications, blood administration, and complex procedures.",
            "Evaluation - whether interventions worked and whether outcomes have been met.",
            "Patient TEACHING - initial education on a new diagnosis, medication, or procedure. Reinforcement of teaching may be delegated to an LPN, but never to a UAP."
          ]
        },
        {
          "kind": "h",
          "text": "Common Testable Delegation Patterns"
        },
        {
          "kind": "list",
          "items": [
            "Stable patient ambulation → UAP.",
            "Vital signs on a stable post-op day 2 patient → UAP.",
            "ADLs → UAP.",
            "Catheter insertion in a stable patient → LPN.",
            "Oral medications on a stable patient → LPN.",
            "IV push of pain medication → RN only.",
            "Initial admission assessment → RN only.",
            "Discharge teaching → RN only.",
            "Blood administration → RN only.",
            "Care of an unstable patient → RN only."
          ]
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "The two-filter rule",
          "text": "Every delegation question reduces to two filters: (1) Is the task within the person's scope? (2) Is the patient stable? If yes to both, delegation is appropriate. Learners most often miss the stability filter - they correctly see that vital signs are within UAP scope but forget that an unstable patient needs RN-only assessment. Drill both filters together."
        },
        {
          "kind": "p",
          "text": "The NCLEX delegation question format is predictable: it gives you a list of patients or tasks and asks which task is APPROPRIATE to delegate to the UAP (or to the LPN). Apply the two filters - is the task within scope, and is the patient stable? If the answer is yes to both, delegation is appropriate."
        }
      ]
    },
    {
      "id": "scope-delegation-item-1",
      "minutes": "11-13",
      "title": "Practice - Delegating to the UAP",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Let's apply the two filters to a UAP delegation question. Read the stem, choose your answer, then check your reasoning against the rationale."
        }
      ],
      "practiceItemId": "pi_delegate_to_uap"
    },
    {
      "id": "scope-delegation-item-2",
      "minutes": "13-15",
      "title": "Practice - Delegating to the LPN",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Now apply the same two filters to an LPN delegation question. The LPN scope is wider than the UAP scope, but the patient-stability filter still governs."
        }
      ],
      "practiceItemId": "pi_delegate_to_lpn"
    },
    {
      "id": "multi-patient-prioritization",
      "minutes": "15-22",
      "title": "Multi-Patient Prioritization",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Here is the classic NCLEX management of care question: 'You have four patients. Who do you see first?' You answer it not by intuition but by applying the prioritization frameworks systematically - recall these from Hour 2. The frameworks layer on top of one another, and the most concerning patient usually triggers several at once."
        },
        {
          "kind": "p",
          "text": "Framework one is ABC - Airway, Breathing, Circulation. Patients with airway or breathing compromise come first. A patient with respiratory distress always outranks a patient with circulatory issues, which in turn always outranks neurologic and other concerns."
        },
        {
          "kind": "p",
          "text": "Framework two is Maslow's hierarchy - physiologic needs before safety, before belongingness, before esteem, before self-actualization. In the hospital this is mostly about physiologic needs: ABC, fluid and electrolyte balance, pain, and rest come before psychosocial concerns."
        },
        {
          "kind": "p",
          "text": "Framework three is ACUTE over CHRONIC. New chest pain in a patient takes precedence over a routine medication administration in a stable chronic patient. The new, acute problem wins."
        },
        {
          "kind": "p",
          "text": "Framework four is UNSTABLE over STABLE. A deteriorating patient comes before a stable patient regardless of diagnosis. The patient whose blood pressure was 130/80 an hour ago and is now 88/52 outranks the patient with chronic hypertension whose BP is 158/96 - because one is moving in the wrong direction and the other is at baseline."
        },
        {
          "kind": "p",
          "text": "Framework five is UNEXPECTED over EXPECTED. A finding that is unexpected for the diagnosis is more concerning than an expected finding. A post-op patient with pain at the incision site is EXPECTED - manage it, but it is lower priority. A post-op patient with chest pain is UNEXPECTED - high priority, possible pulmonary embolism."
        },
        {
          "kind": "p",
          "text": "Framework six is ACTUAL over POTENTIAL. An actual, current problem comes before a potential, future one - current pain before risk for falls."
        },
        {
          "kind": "p",
          "text": "Framework seven addresses NEWLY ADMITTED patients. They often need rapid initial assessment, but they do not automatically come first - apply the other frameworks. A newly admitted stable patient ranks below a deteriorating known patient."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Watch the classic-presentation trap",
          "text": "The 'classic' presentation of a known condition is often LESS concerning than an unusual presentation, because the team is already managing the classic problem. The patient who reports 'feeling like something is wrong' or who has new mental status changes warrants high prioritization even with normal vitals - subjective changes often precede measurable ones."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Don't be pulled by drama",
          "text": "Some learners pick the dramatic post-op pain patient because the pain is vivid. Redirect to the unexpected finding - new chest tightness signals possible PE. Layer the frameworks: ABC plus unstable plus unexpected points you to the right patient."
        }
      ],
      "practiceItemId": "pi_who_first"
    },
    {
      "id": "informed-consent",
      "minutes": "22-30",
      "title": "Informed Consent - Nurse vs Provider Role",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "For consent to be valid, several components must all be present. Memorize them, because the test probes each one and asks you to spot the component that is missing."
        },
        {
          "kind": "h",
          "text": "Components of Valid Consent"
        },
        {
          "kind": "p",
          "text": "One - the patient must be COMPETENT: alert, oriented, and not impaired by medications, alcohol, illness, or mental status changes. A patient who is post-op on morphine within the past few hours is NOT considered competent for consent to a new procedure during that window."
        },
        {
          "kind": "p",
          "text": "Two - the patient must be an ADULT, meaning 18 years or older in most states, OR an emancipated minor (married, in the military, or court-emancipated), OR a minor in specific situations where state law permits minor consent. Common minor-consent exceptions vary by state but often include STD testing and treatment, mental health services, reproductive health and contraception, substance abuse treatment, and prenatal care for pregnant minors."
        },
        {
          "kind": "p",
          "text": "Three - the information must be PROVIDED by the PROVIDER who is performing the procedure. The nurse is NOT the provider. The information must include the NATURE of the procedure, the RISKS, the BENEFITS, the ALTERNATIVES - including the alternative of no treatment - and the RISKS OF REFUSING the procedure."
        },
        {
          "kind": "p",
          "text": "Four - the patient must UNDERSTAND the information. If there is a language barrier, a QUALIFIED MEDICAL INTERPRETER is required - NOT a family member. Family members may modify, omit, or distort information for cultural reasons, so trained medical interpreters are required for sensitive consent discussions."
        },
        {
          "kind": "p",
          "text": "Five - consent must be VOLUNTARY. There can be no coercion, no undue pressure, and no manipulation by family or staff."
        },
        {
          "kind": "h",
          "text": "The Nurse's Role in Informed Consent"
        },
        {
          "kind": "p",
          "text": "This is testable and frequently misunderstood, so be precise. The nurse is the WITNESS to the patient's signature. The nurse confirms that the person signing is the patient and that the signature is genuinely the patient's. That is the nurse's signature role - witnessing, not informing."
        },
        {
          "kind": "p",
          "text": "The nurse is NOT the one providing the medical information about the procedure. That is the provider's responsibility - the surgeon performing the operation, the proceduralist doing the cardiac catheterization, the gastroenterologist doing the colonoscopy. If the provider has not adequately explained the procedure, the nurse does NOT step in to explain - the nurse calls the provider back."
        },
        {
          "kind": "p",
          "text": "The nurse VERIFIES that the patient appears to understand. Open-ended questions help: 'Can you tell me in your own words what surgery you are having tomorrow?' If the patient cannot articulate the basics, they do not understand. And if the patient does NOT understand, the nurse should NOT have them sign - the correct action is to NOTIFY THE PROVIDER for re-explanation. If the patient later changes their mind, the nurse documents the withdrawal of consent and notifies the provider."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Witness and verify - never explain",
          "text": "The nurse-as-witness rule is one of the most consistently misunderstood facts among IEN learners, because many home-country practice patterns have nurses explaining procedures. In the US, the nurse witnesses the signature and verifies understanding but does NOT explain the procedure. When the patient says 'I'm not really sure what they're going to do,' the correct action is to NOTIFY THE PROVIDER - not to explain it yourself, not to have them sign anyway, and not to offer false reassurance."
        },
        {
          "kind": "h",
          "text": "Surrogate Consent, Emergencies, and Special Situations"
        },
        {
          "kind": "p",
          "text": "When a patient cannot consent for themselves, signing authority typically falls in this priority order: the HEALTHCARE POA (durable power of attorney for healthcare, also called a healthcare proxy or surrogate); a COURT-APPOINTED GUARDIAN; a PARENT for a minor (with the exceptions noted above); and, in some states, NEXT OF KIN for incompetent adults without a designated POA - typically spouse, then adult children, then parents, then siblings, in a state-defined order."
        },
        {
          "kind": "p",
          "text": "In emergency situations, IMPLIED consent applies. If a patient requires immediate life-saving care and cannot consent (unconscious or incompetent) AND no surrogate is immediately available, emergency care can proceed under implied consent. The reasoning is that a reasonable person would consent to life-saving care."
        },
        {
          "kind": "p",
          "text": "Know these special situations. Telephone consent - for a surrogate making decisions remotely - usually requires a two-nurse witness. Minor pregnancy varies by state, but pregnant minors often can consent to prenatal care. A Jehovah's Witness who is a competent adult can refuse a blood transfusion for themselves, EVEN if refusal will be fatal; however, they cannot necessarily refuse for their minor children, because courts can override parental refusal in life-threatening pediatric situations."
        }
      ],
      "practiceItemId": "pi_consent_does_not_understand"
    },
    {
      "id": "hipaa-and-privacy",
      "minutes": "30-37",
      "title": "HIPAA & Privacy",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "HIPAA is the Health Insurance Portability and Accountability Act of 1996. Its Privacy Rule protects PHI - Protected Health Information. PHI includes any individually identifiable health information: name, dates of service, medical record number, photographs, and anything that could link to a specific patient."
        },
        {
          "kind": "h",
          "text": "Patient Rights Under HIPAA"
        },
        {
          "kind": "list",
          "items": [
            "Right to ACCESS their own records.",
            "Right to request CORRECTIONS to records.",
            "Right to know who has ACCESSED their records - an accounting of disclosures.",
            "A notice of privacy practices at the first encounter, signed by the patient."
          ]
        },
        {
          "kind": "h",
          "text": "When Disclosure Is Permitted Without Authorization"
        },
        {
          "kind": "p",
          "text": "Certain disclosures are permitted without explicit patient authorization: TREATMENT - sharing information with other providers caring for the patient; PAYMENT - billing and insurance; and HEALTHCARE OPERATIONS - quality improvement and training. Disclosure is also permitted when REQUIRED BY LAW - mandatory reporting (a Hour 13 callback), court orders, and public health reporting - and for LIMITED research disclosures with appropriate safeguards."
        },
        {
          "kind": "h",
          "text": "When Disclosure Is NOT Permitted"
        },
        {
          "kind": "p",
          "text": "Disclosure is not permitted without patient authorization in these situations: sharing with family or friends without patient consent - except in emergencies where the patient cannot communicate and disclosure is in their best interest; sharing with other healthcare staff who are not involved in this patient's care; posting any patient information, photo, or story on social media; and discussing patients in public areas such as elevators, the cafeteria, or hallways."
        },
        {
          "kind": "p",
          "text": "Two principles govern even permitted disclosures. The MINIMUM NECESSARY principle means that even when disclosure is allowed, you share only the information necessary for the purpose - the lab tech needs the test order, not the entire history. The NEED-TO-KNOW principle means that even within the healthcare team, only those involved in this patient's care should access this record. Accessing the record of a celebrity, a family member, a coworker, or a neighbor - any patient you are not caring for - is a HIPAA violation."
        },
        {
          "kind": "h",
          "text": "Common HIPAA Violations - Memorize"
        },
        {
          "kind": "list",
          "items": [
            "Accessing records of celebrities, family members, coworkers, neighbors, or any patient you are not caring for as part of your assignment.",
            "Discussing patients in elevators, the cafeteria, hallways, or other public spaces - even with first names only, if any combination of details could identify them.",
            "Posting on social media - even without explicit names, if the patient could be identified by the details.",
            "Leaving documents visible on monitors, screens, or printed papers; walking away from a computer without logging off.",
            "Sharing passwords - each user must access with their own credentials.",
            "Taking photographs of patients without specific written consent for the specific purpose.",
            "Discussing patients with family at home, even when names are not used."
          ]
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "The 'no names' defense does not work",
          "text": "Even seemingly innocent posts - 'Caring for a really interesting patient today!' - can be HIPAA violations if any combination of details could identify the patient. The 'no names' defense is one of the most common HIPAA misunderstandings. The safest rule: never post anything work-related involving patients, period."
        },
        {
          "kind": "h",
          "text": "Penalties"
        },
        {
          "kind": "p",
          "text": "The penalties are severe. CIVIL penalties can reach fines of millions of dollars for institutional violations. CRIMINAL penalties apply to malicious violations - up to 10 years in prison for the most severe cases, such as selling PHI or identity theft. INSTITUTIONAL consequences include routine termination, and PROFESSIONAL consequences include board action and loss of license."
        }
      ],
      "practiceItemId": "pi_hipaa_social_media"
    },
    {
      "id": "advance-directives-and-code-status",
      "minutes": "37-44",
      "title": "Advance Directives & Code Status",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Advance directives are documents that express a patient's wishes for care if they become unable to communicate or make decisions. The test asks you to tell the different documents apart, so learn what makes each one distinct."
        },
        {
          "kind": "h",
          "text": "Living Will"
        },
        {
          "kind": "p",
          "text": "A living will is a written document stating wishes about end-of-life care. It may include desires regarding mechanical ventilation, artificial nutrition and hydration, dialysis, and resuscitation. The forms are typically state-specific. Note that a living will is not the same as a 'will' that addresses property after death - those are different documents."
        },
        {
          "kind": "h",
          "text": "Durable Power of Attorney for Healthcare"
        },
        {
          "kind": "p",
          "text": "The durable power of attorney for healthcare - also called a Healthcare Proxy or Healthcare Surrogate - designates a SPECIFIC PERSON to make healthcare decisions if the patient becomes incompetent. Ideally, the designated person knows and has discussed the patient's wishes. This is different from a financial POA."
        },
        {
          "kind": "h",
          "text": "POLST / MOLST"
        },
        {
          "kind": "p",
          "text": "POLST or MOLST stands for Physician Orders for Life-Sustaining Treatment, or Medical Orders for Life-Sustaining Treatment - the terminology varies by state. The critical distinction is that these are actual MEDICAL ORDERS, signed by a provider, that translate the patient's wishes into actionable medical orders. They travel with the patient between care settings - home, nursing home, and hospital. Unlike a living will, which is a statement of wishes, a POLST or MOLST is an active order set the medical team follows."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Wishes vs orders",
          "text": "A living will is a STATEMENT OF WISHES. A POLST/MOLST is an ACTIVE MEDICAL ORDER signed by a provider that the team follows and that travels between care settings. That order-versus-wish distinction is the most testable point here."
        },
        {
          "kind": "h",
          "text": "DNR and DNI"
        },
        {
          "kind": "p",
          "text": "DNR means Do Not Resuscitate - a medical order specifying that CPR will not be performed if the patient experiences cardiac or respiratory arrest. It may be limited (no chest compressions, but other interventions allowed) or full (no resuscitative measures at all). DNI means Do Not Intubate and is separate from DNR in some institutions: the patient may want CPR if their heart stops but not intubation, or may want intubation but not CPR. The orders can be specified separately."
        },
        {
          "kind": "h",
          "text": "Comfort, Palliative, and Hospice Care"
        },
        {
          "kind": "p",
          "text": "Comfort care, palliative care, and hospice all focus on symptom management rather than curative treatment. Palliative care can run alongside curative treatment at any disease stage. Hospice typically requires a terminal diagnosis with a prognosis of 6 months or less and focuses entirely on comfort."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Full code is the default",
          "text": "In the absence of a documented DNR or other limitation, the default is FULL CODE - full resuscitation including CPR, intubation, defibrillation, and medications. If no order exists, the team resuscitates. This is testable: a question may ask 'a patient with no advance directive arrests; what does the team do?' The answer is full code. Family wishes or even patient statements WITHOUT orders do not limit resuscitation - orders are required."
        },
        {
          "kind": "p",
          "text": "Code status should be discussed with the patient - or the surrogate, if the patient is incompetent - at admission and at relevant clinical transitions. Many institutions require code status to be confirmed and ordered at each admission, regardless of prior wishes. The discussion can be uncomfortable, but it is essential: patients deserve clarity, and teams deserve clear orders."
        },
        {
          "kind": "h",
          "text": "Treatment Refusal and Change of Mind"
        },
        {
          "kind": "p",
          "text": "A COMPETENT adult has the right to refuse any treatment, including life-sustaining treatment, even when refusal will result in death - this is autonomy in action. Examples include refusing chemotherapy for terminal cancer, refusing a blood transfusion as a Jehovah's Witness, and refusing intubation. The nurse's role when a patient refuses life-sustaining treatment is to ensure understanding (does the patient understand the consequences?), document the discussion clearly, and SUPPORT the patient's decision while exploring concerns - because refusal sometimes stems from misunderstanding, fear, or pain."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Refusal is not suicidal ideation",
          "text": "Distinguish refusal of treatment from suicidal ideation - they are not the same, and the distinction matters clinically and on the exam. A patient may also change their advance directive or code status at any time; a DNR can be REVOKED by the patient, and new orders are required when wishes change."
        }
      ]
    },
    {
      "id": "mandatory-reporting-and-ethics",
      "minutes": "44-50",
      "title": "Mandatory Reporting (Expanded) & Ethics",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "We expand mandatory reporting beyond the child abuse you learned in Hour 13. There are several categories of conditions and situations that nurses are required to report, and the exam tests your recognition of them."
        },
        {
          "kind": "list",
          "items": [
            "CHILD ABUSE AND NEGLECT - Hour 13. All 50 states. Reasonable suspicion threshold. The nurse is a mandatory reporter.",
            "ELDER ABUSE AND NEGLECT - vulnerable adults (typically age 60+, or younger adults with disabilities making them dependent). Includes financial, physical, sexual, and emotional abuse, and neglect. Mandatory reporting in most states. Reports go to Adult Protective Services or a similar agency.",
            "DOMESTIC VIOLENCE / INTIMATE PARTNER VIOLENCE - varies by state. Some states require mandatory reporting by healthcare workers; others respect patient confidentiality unless the patient consents. Routine screening for IPV is increasingly standard in primary care and emergency visits, including pregnancy care.",
            "COMMUNICABLE DISEASES - state-specific lists of reportable conditions. Common examples include HIV, syphilis, gonorrhea, chlamydia (some states), tuberculosis (recall Hour 8), measles, pertussis, certain foodborne illnesses, meningococcal disease, viral hepatitis, and COVID-19 during the pandemic period. Reports go to the state public health department.",
            "SUSPICIOUS INJURIES - GUNSHOT WOUNDS are mandatory reporting to law enforcement in most states. STAB WOUNDS vary. Burns suspicious for abuse and animal bites (for rabies surveillance) are also reportable.",
            "IMPAIRED COLLEAGUE - nurses are typically required to report colleagues who appear impaired by substance use or by mental health issues affecting practice. Usually reported to a supervisor first; may require state board notification depending on severity and state rules."
          ]
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Reporting protections",
          "text": "Good-faith reports are protected from civil and criminal liability, and the reporter's identity is typically kept confidential. Note the flip side: failure to report when required is itself an offense in most states."
        },
        {
          "kind": "h",
          "text": "The Four Core Ethical Principles - Memorize"
        },
        {
          "kind": "p",
          "text": "AUTONOMY is respect for the patient's right to make their own decisions about their care. The competent patient who refuses chemotherapy is exercising autonomy; the nurse may disagree but supports the decision."
        },
        {
          "kind": "p",
          "text": "BENEFICENCE is doing good - acting in the patient's best interest."
        },
        {
          "kind": "p",
          "text": "NONMALEFICENCE is doing no harm - primum non nocere, 'first, do no harm.' When interventions carry risk, the expected benefit must outweigh the harm."
        },
        {
          "kind": "p",
          "text": "JUSTICE is fairness in the distribution of resources and care. Patients should not be discriminated against based on race, religion, sexual orientation, ability to pay, citizenship status, or other characteristics."
        },
        {
          "kind": "p",
          "text": "Two further principles you may encounter are FIDELITY - keeping commitments to patients - and VERACITY - truthfulness and honesty in communication."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "When principles collide",
          "text": "Ethical dilemmas occur when principles conflict. Autonomy versus beneficence: the patient who refuses life-saving treatment (autonomy wins for competent adults). Justice versus beneficence: limited ICU beds during a pandemic require allocation decisions. Most institutions have ethics committees and ethics consultation services to support difficult decisions."
        }
      ]
    },
    {
      "id": "conflict-resolution-and-advocacy",
      "minutes": "50-55",
      "title": "Conflict Resolution & Advocacy",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Patient advocacy is the nurse's role to support the patient's rights, decisions, and best interests within the healthcare system. It is one of the most distinctive features of nursing as a profession, and the exam expects you to act on it."
        },
        {
          "kind": "h",
          "text": "Advocacy Actions"
        },
        {
          "kind": "list",
          "items": [
            "Ensure the patient's UNDERSTANDING of treatments and choices.",
            "Support the patient's STATED WISHES even when you personally disagree with them.",
            "Communicate concerns to the healthcare team - voice the patient's perspective in rounds and interdisciplinary discussions.",
            "Address UNMET NEEDS - pain not adequately controlled, fears not acknowledged, family communication issues.",
            "Speak up about SAFETY concerns - unsafe staffing, errors in care, and system failures."
          ]
        },
        {
          "kind": "h",
          "text": "Conflict Resolution"
        },
        {
          "kind": "p",
          "text": "Address conflicts directly with the involved parties when possible - peer to peer first, not through gossip or third parties. Use 'I' statements such as 'I observed...' or 'I'm concerned that...' rather than accusatory 'you' statements. Focus on FACTS and patient impact, not personalities or assumed motivations. Compromise when possible, but never compromise patient safety."
        },
        {
          "kind": "h",
          "text": "Chain of Command"
        },
        {
          "kind": "p",
          "text": "When direct resolution fails, escalate through proper channels. The typical order for nursing concerns is peer to peer first, then the charge nurse, then the nurse manager, then the nursing supervisor, then the chief nursing officer. For a physician disagreement, speak with the physician peer first, then the attending or senior, then the department chair, then the chief medical officer. Most institutions have specific chain-of-command policies for clinical concerns."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Stop the line",
          "text": "When patient safety is at risk, speak up immediately. If you believe an order is unsafe - wrong patient, wrong dose, wrong drug, wrong route, or contraindicated for this patient - STOP. Verify with the provider. Do NOT administer if you have unresolved concerns. This is the 'stop the line' principle from quality improvement."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Just culture (Hour 15 recap)",
          "text": "Recall just culture from Hour 15: human error gets consoled, at-risk behavior gets coached, and reckless behavior gets discipline. Reporting errors is encouraged and protected; the system learns from reports rather than punishing individuals for honest mistakes."
        },
        {
          "kind": "p",
          "text": "A cultural note for African-trained nurses: in Kenya and Ghana the hierarchical respect for senior nurses common in many settings can conflict with the US 'speak up' culture. Empowering yourself to challenge an unsafe order is a deliberate cultural shift, and it is exactly what the NCLEX and US practice expect of you."
        }
      ]
    },
    {
      "id": "synthesis-multi-patient-case",
      "minutes": "55-58",
      "title": "Synthesis - Multi-Patient Case",
      "format": "Case",
      "blocks": [
        {
          "kind": "p",
          "text": "Scenario: A nurse on a busy medical-surgical unit begins the shift at 0700. The assignment includes four patients. (1) A 78-year-old admitted yesterday with pneumonia, awaiting discharge teaching this morning, stable, with no acute issues. (2) A 56-year-old post-op day 1 from total knee replacement, complaining of pain 7/10, with no other acute issues. (3) A 65-year-old admitted overnight with confusion and decreased LOC, glucose 38 at 0600 per the overnight nurse - D50 was given, the fingerstick rechecked at 0630 was 92, and the patient is still slightly confused. (4) A 48-year-old with abdominal pain, scheduled for CT abdomen in 30 minutes, who has been complaining of severe abdominal pain throughout the night. The nurse also has a UAP and an LPN available. Walk through your reasoning: who do you see first, how do you delegate to the UAP and LPN, and what is your priority assignment plan?"
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Worked reasoning",
          "text": "Patient priority order. FIRST - patient 3, the post-hypoglycemia patient: unstable recent event, still showing residual confusion after a glucose that dropped to 38, a real neurologic vulnerability. Even though the glucose is now 92, this patient needs immediate RN assessment to verify neurologic status, check for rebound hypoglycemia, evaluate the cause (medication error, missed meal, change in renal function), and plan ongoing monitoring. SECOND - patient 4, severe abdominal pain scheduled for CT: severe ongoing pain plus pending imaging requires assessment, pain reassessment, and procedure prep. THIRD - patient 2, post-op day 1 with pain 7/10: pain needs management but is expected for post-op day 1 after a TKR, so manage promptly but with lower urgency. FOURTH - patient 1, stable and awaiting discharge teaching: discharge teaching can happen mid-morning. Delegation plan. To the UAP: vital signs on the stable patients (patient 1 and patient 2, who needs post-op vitals per protocol), help with ADLs on patient 1 in preparation for discharge, and I&O on appropriate patients - but NOT vitals on patient 3 (unstable, just had a hypoglycemia event) or patient 4 (acute abdominal pain pending workup), which the RN should do. To the LPN: reinforce the pneumonia discharge teaching for patient 1 (the RN did the initial teaching yesterday; the LPN can reinforce), administer scheduled oral medications, reinforce pain medication teaching to patient 2, and help with patient 2's catheter care or wound assessment if stable - but NOT the initial assessment of patient 3 or patient 4, which is RN-only. Reserved for the RN: initial assessment of patient 3 and patient 4, initial discharge teaching for any newly diagnosed condition, any IV push medications, any blood products, and care of the unstable patient. Communication plan: notify the provider on patient 3 for the hypoglycemia follow-up plan, re-evaluate the pain plan with the provider for patient 2 if PRN doses are inadequate, and coordinate patient 4 to CT and follow up on the results."
        },
        {
          "kind": "p",
          "text": "This case synthesizes Hour 2 (priority frameworks), Hour 4 (insulin and hypoglycemia management), Hour 6 (lab interpretation and critical values), and Hour 16 (delegation and prioritization). The realistic complexity - four patients, two delegated staff, and multiple competing priorities - is exactly the kind of management of care thinking the NCLEX tests."
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
          "text": "Homework before Hour 17: fifty management of care questions, with heavy emphasis on delegation (RN/LPN/UAP), prioritization (which patient first), informed consent (the nurse's role as witness), HIPAA scenarios, and code status."
        },
        {
          "kind": "p",
          "text": "Hour 17 is the NGN unfolding case studies - the centerpiece NGN drill hour, with four to five full cases that make all six CJMM steps explicit. Recall the CJMM framework from Hour 1: Recognize cues, Analyze cues, Prioritize hypotheses, Generate solutions, Take action, Evaluate outcomes. That hour is the most NGN-focused of the course and integrates everything we have covered. See you in Hour 17."
        }
      ]
    }
  ]
};
