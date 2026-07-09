import type { Lesson } from "./lessonTypes";

/**
 * Section 14 - Mental Health. Auto-generated from the Florence Academy
 * bootcamp instructor script (expanded draft). Pending nurse-educator review.
 */
export const lesson: Lesson = {
  "meta": {
    "number": 14,
    "title": "Mental Health",
    "durationMin": 60,
    "audience": "Internationally educated nurses - Philippines, UK, Kenya, Ghana",
    "contentWeight": "The single biggest cultural-translation hour of the bootcamp; psychosocial integrity is heavily tested",
    "tagline": "The NCLEX rewards one very specific American therapeutic-communication style - learn it as a test pattern, then apply it cold."
  },
  "objectives": [
    "Identify the seven core therapeutic communication techniques the NCLEX rewards and apply them in standardized response selection.",
    "Identify the eight common non-therapeutic responses that appear as NCLEX distractors and explain why each is non-therapeutic.",
    "Recognize the cultural translation challenge between IEN home communication norms (Filipino, British, African) and US therapeutic communication norms, and apply NCLEX-correct phrasing despite cultural discomfort.",
    "Conduct a suicide risk assessment using direct inquiry, identify high-risk features, and apply means restriction.",
    "Apply major psychiatric medication principles: SSRI black box warning, lithium toxicity, serotonin syndrome vs NMS, tyramine restrictions with MAOIs, and clozapine agranulocytosis.",
    "Recognize major depressive disorder, bipolar disorder, anxiety disorders, PTSD, and schizophrenia, and apply core nursing interventions for each.",
    "Recognize alcohol withdrawal progression from minor withdrawal to delirium tremens, and apply benzodiazepine plus thiamine-before-glucose treatment."
  ],
  "timing": [
    {
      "minutes": "0-3",
      "segment": "Frame the cultural translation challenge",
      "format": "Lecture"
    },
    {
      "minutes": "3-15",
      "segment": "Therapeutic communication & non-therapeutic distractors",
      "format": "Lecture + 2 items"
    },
    {
      "minutes": "15-20",
      "segment": "Cultural translation for Filipino, UK, African cohorts",
      "format": "Lecture + discussion"
    },
    {
      "minutes": "20-27",
      "segment": "Suicide risk assessment",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "27-34",
      "segment": "Major psychiatric medications",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "34-41",
      "segment": "Depression, bipolar, anxiety, PTSD, OCD",
      "format": "Lecture"
    },
    {
      "minutes": "41-46",
      "segment": "Schizophrenia & psychosis",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "46-52",
      "segment": "Substance use & alcohol withdrawal",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "52-55",
      "segment": "De-escalation principles",
      "format": "Lecture"
    },
    {
      "minutes": "55-58",
      "segment": "Synthesis case",
      "format": "Case"
    },
    {
      "minutes": "58-60",
      "segment": "Close & homework",
      "format": "Lecture"
    }
  ],
  "practiceItems": {
    "pi_pancreatic_cancer_disclosure": {
      "id": "pi_pancreatic_cancer_disclosure",
      "stem": "A 58-year-old client just received a diagnosis of stage IV pancreatic cancer. The nurse enters the room and the client says quietly, \"I don't know how I'm going to tell my children.\" Which response by the nurse is therapeutic?",
      "options": [
        {
          "key": "A",
          "text": "\"Don't worry, they will understand. Families always do.\""
        },
        {
          "key": "B",
          "text": "\"You should ask the social worker to help you with that conversation.\""
        },
        {
          "key": "C",
          "text": "\"That sounds like a difficult conversation to face. Tell me what you're thinking about.\""
        },
        {
          "key": "D",
          "text": "\"Why are you so worried about telling them? They're adults, aren't they?\""
        }
      ],
      "answer": "C",
      "rationale": "C is the validate-plus-invite pattern: validation ('That sounds like a difficult conversation to face') plus an open-ended invitation ('Tell me what you're thinking about'). A is false reassurance combined with a stereotyped response. B is giving advice. D is a why question that sounds judgmental. The correct answer names the feeling and invites more dialogue.",
      "cjmm": "take-actions",
      "reference": "Section 14 · Therapeutic communication"
    },
    "pi_diabetes_overwhelmed": {
      "id": "pi_diabetes_overwhelmed",
      "stem": "A client with newly diagnosed type 1 diabetes is angry about her insulin regimen. She says, \"This is too complicated. I can't do this. I'm going to fail at managing my diabetes.\" Which response is therapeutic?",
      "options": [
        {
          "key": "A",
          "text": "\"You'll get used to it. Many people learn to manage their diabetes well.\""
        },
        {
          "key": "B",
          "text": "\"It sounds like you're feeling overwhelmed by all this new information. What feels most difficult?\""
        },
        {
          "key": "C",
          "text": "\"You need to learn this. Not managing your diabetes can lead to serious complications.\""
        },
        {
          "key": "D",
          "text": "\"Why do you think you'll fail? You haven't even tried yet.\""
        }
      ],
      "answer": "B",
      "rationale": "B is validate-plus-invite: validation ('It sounds like you're feeling overwhelmed') plus an open-ended invitation ('What feels most difficult?'). A is belittling and false reassurance. C is giving advice with an implicit threat. D is a why question with disapproval. Same pattern every time - name the feeling, invite more dialogue.",
      "cjmm": "take-actions",
      "reference": "Section 14 · Therapeutic communication"
    },
    "pi_sudden_mood_improvement": {
      "id": "pi_sudden_mood_improvement",
      "stem": "A client hospitalized for severe depression with suicidal ideation has been on the unit for 5 days. The patient was tearful and withdrawn during the first 4 days. This morning the nurse finds the patient cheerful, dressed nicely, eating breakfast, and reporting \"I feel so much better. I figured everything out last night.\" Which is the nurse's priority action?",
      "options": [
        {
          "key": "A",
          "text": "Document the improvement and reduce observation frequency."
        },
        {
          "key": "B",
          "text": "Maintain close observation and notify the provider; sudden improvement in a suicidal patient may indicate decision to act."
        },
        {
          "key": "C",
          "text": "Encourage the patient to share what they figured out."
        },
        {
          "key": "D",
          "text": "Discharge planning, as the patient appears ready to leave."
        }
      ],
      "answer": "B",
      "rationale": "Sudden mood improvement in a previously depressed and suicidal patient is a warning sign, not relief - the patient may have decided on suicide and is experiencing 'relief' from resolved ambivalence. The nurse maintains close observation and notifies the provider. A and D take the improvement at face value and fall into the trap. C is reasonable as part of the assessment but is not the priority action.",
      "cjmm": "prioritize-hypotheses",
      "reference": "Section 14 · Suicide risk assessment"
    },
    "pi_lithium_thiazide_interaction": {
      "id": "pi_lithium_thiazide_interaction",
      "stem": "A client with bipolar I disorder is taking lithium 600 mg twice daily for maintenance. The client presents to the clinic reporting fatigue, persistent nausea and vomiting for 3 days, fine tremor, and confusion. The client recently started a new medication. Which medication change is most likely contributing to the current symptoms?",
      "options": [
        {
          "key": "A",
          "text": "Started acetaminophen for headaches."
        },
        {
          "key": "B",
          "text": "Started hydrochlorothiazide for newly diagnosed hypertension."
        },
        {
          "key": "C",
          "text": "Started multivitamin daily."
        },
        {
          "key": "D",
          "text": "Started melatonin for sleep."
        }
      ],
      "answer": "B",
      "rationale": "Hydrochlorothiazide is a thiazide diuretic, which increases lithium retention and causes toxicity. The patient's symptoms - nausea, vomiting, tremor, confusion - are progressive lithium toxicity. Check a lithium level, hold the lithium, and discontinue the thiazide. Acetaminophen (A) does not interact significantly; multivitamin (C) and melatonin (D) have no significant interaction. The thiazide-lithium interaction is a classic test pattern.",
      "cjmm": "analyze-cues",
      "reference": "Section 14 · Major psychiatric medications"
    },
    "pi_schizophrenia_hallucination_response": {
      "id": "pi_schizophrenia_hallucination_response",
      "stem": "A client with schizophrenia is admitted to the inpatient psychiatric unit. The client appears to be responding to internal stimuli, looking off to the side and muttering. When the nurse approaches, the client states, \"The voices are telling me you are going to poison my food.\" Which response by the nurse is most therapeutic?",
      "options": [
        {
          "key": "A",
          "text": "\"The voices are not real. There is no one telling you to be afraid of me.\""
        },
        {
          "key": "B",
          "text": "\"I understand. I won't come near your food then.\""
        },
        {
          "key": "C",
          "text": "\"I don't hear the voices you're hearing, but I can see they are frightening you. What are the voices saying?\""
        },
        {
          "key": "D",
          "text": "\"Why do you think the voices are saying that about me?\""
        }
      ],
      "answer": "C",
      "rationale": "C acknowledges the experience as real to the patient ('I can see they are frightening you') without validating the hallucination as real ('I don't hear the voices'), and assesses for command hallucinations ('What are the voices saying?'). A argues with the hallucination - non-therapeutic. B validates the false belief and actually reinforces the delusion. D is a why question that asks the patient to explain the delusion as if it were rational. C uses the standard approach.",
      "cjmm": "take-actions",
      "reference": "Section 14 · Schizophrenia & psychosis"
    },
    "pi_delirium_tremens_thiamine_first": {
      "id": "pi_delirium_tremens_thiamine_first",
      "stem": "A 54-year-old client is admitted to the ED after being found confused at home. The client's spouse reports the client has been drinking heavily for years but stopped drinking 3 days ago after a fall. Findings: T 38.4°C, HR 132, BP 168/98, profuse diaphoresis, marked tremor, disoriented to time and place, reports seeing spiders on the walls. Blood glucose 68 mg/dL. Which intervention is the FIRST priority?",
      "options": [
        {
          "key": "A",
          "text": "Administer IV dextrose 50% for hypoglycemia."
        },
        {
          "key": "B",
          "text": "Administer IV thiamine before giving glucose."
        },
        {
          "key": "C",
          "text": "Administer IV lorazepam to manage withdrawal."
        },
        {
          "key": "D",
          "text": "Apply restraints to prevent injury from agitation."
        }
      ],
      "answer": "B",
      "rationale": "This is delirium tremens - about 72 hours after the last drink, with autonomic instability, disorientation, and hallucinations. Among the listed options the first priority is thiamine before glucose: giving glucose first in a chronic alcoholic without thiamine can precipitate Wernicke encephalopathy. Lorazepam (C) is needed and will follow shortly, but is not first. Restraints (D) are a last resort, not the first action. Recognize chronic alcohol use, apply the sequence rule, give thiamine first.",
      "cjmm": "prioritize-hypotheses",
      "reference": "Section 14 · Substance use & alcohol withdrawal"
    }
  },
  "segments": [
    {
      "id": "frame-the-hour",
      "minutes": "0-3",
      "title": "Frame the cultural translation challenge",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Welcome to Hour 14: mental health and therapeutic communication. This is the most culturally complex hour of the entire bootcamp, and some of what we cover will feel uncomfortable. I want to name that discomfort up front, because the content asks you to communicate in a way that may not match how you were trained to communicate, and pretending otherwise would not serve you."
        },
        {
          "kind": "p",
          "text": "Here is the core challenge. The NCLEX rewards a very specific American therapeutic communication style: emotionally explicit, individually focused, with feelings always named and validated. Many of you trained in cultures where this style is simply not the norm. Filipino communication is often family-centered and indirect. British communication tends toward restraint and understatement. Across many African nursing cultures, hierarchical respect and spiritual or communal framing of distress are normative."
        },
        {
          "kind": "p",
          "text": "None of these home styles is wrong. Many of you are likely more flexible, more authentic, and more present as communicators than the formulaic American style demands. But the NCLEX asks for a specific style, so we will learn that style as a pattern - a test pattern. You will recognize it when you see it, you will apply it on the exam, and in real practice you will integrate it with your authentic communication and likely be a more effective communicator than nurses trained only to the test."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "This is a test, not a verdict on who is the better nurse",
          "text": "The framing for this whole hour is 'this is the test pattern,' not 'this is how you should be in real life.' Learn the pattern, apply it on the exam, and keep your authentic communication for the bedside."
        },
        {
          "kind": "p",
          "text": "Expect heavy callbacks this hour. Lithium toxicity and serotonin syndrome versus NMS return from Hour 4. Thiamine before glucose returns from Hour 6, applied today to alcohol withdrawal. Restraint and safety preview Hour 15. We start with the communication framework, because if you nail that you will pick up many easy NCLEX points."
        }
      ]
    },
    {
      "id": "therapeutic-communication",
      "minutes": "3-15",
      "title": "Therapeutic communication & non-therapeutic distractors",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "h",
          "text": "The seven core therapeutic communication techniques"
        },
        {
          "kind": "p",
          "text": "There are seven core therapeutic communication techniques the NCLEX rewards, and you should memorize all of them. Technique one is OPEN-ENDED QUESTIONS - questions that cannot be answered yes or no, such as 'Tell me more about that,' 'What is that like for you?' and 'How are you feeling today?' Open-ended questions invite elaboration; closed questions shut the door."
        },
        {
          "kind": "p",
          "text": "Technique two is REFLECTION: you mirror back the patient's feelings or words to validate them and invite elaboration - 'You sound frustrated,' 'You seem worried about this,' 'It sounds like you've been dealing with a lot.' Reflection signals that you heard what was said and that you are paying attention to what is beneath the words."
        },
        {
          "kind": "p",
          "text": "Technique three is CLARIFICATION: you ask the patient to elaborate or rephrase - 'Help me understand what you mean by that,' 'Could you give me an example?' Clarification ensures you are understanding accurately and signals genuine interest. Technique four is VALIDATION: you acknowledge the patient's feelings as real and reasonable - 'That must be very difficult,' 'It makes sense that you feel that way given everything you've been through.' Validation does not require you to agree with the patient's reasoning or conclusions; it only requires you to acknowledge that the feelings exist and are real to the patient."
        },
        {
          "kind": "p",
          "text": "Technique five is SILENCE: you allow the patient time to think and respond. The nurse who can be comfortable with silence often gets more meaningful disclosure than the one who fills every pause with words - silence communicates space, attention, and patience. Technique six is OFFERING SELF, or PRESENCE: you communicate availability and willingness to be with the patient - 'I'll sit with you,' 'I'm here,' 'I'll stay with you while you call your family.' Sometimes presence is the entire intervention. Technique seven is FOCUSING: you direct the conversation to a relevant area - 'You mentioned earlier that you were feeling overwhelmed; can you tell me more about that?' - which helps the patient zoom in on something significant."
        },
        {
          "kind": "h",
          "text": "The eight non-therapeutic responses (NCLEX distractors)"
        },
        {
          "kind": "p",
          "text": "Now the eight non-therapeutic responses that appear as NCLEX distractors. These are equally important to memorize, because recognizing the trap is half the work. Non-therapeutic one is GIVING ADVICE - 'I think you should...,' 'You ought to...,' 'Have you tried...' - which removes patient agency and suggests the nurse knows best. The one exception is that patient teaching is appropriate; giving life-direction advice is not. Non-therapeutic two is FALSE REASSURANCE - 'Don't worry, everything will be fine,' 'It will all work out' - but the nurse cannot guarantee outcomes, and false reassurance dismisses the patient's actual concerns and shuts down disclosure."
        },
        {
          "kind": "p",
          "text": "Non-therapeutic three is STEREOTYPED OR CLICHE RESPONSES - 'Time heals all wounds,' 'Tomorrow is another day,' 'This too shall pass' - empty platitudes without engagement, recognizable as distractors because they sound canned. Non-therapeutic four is DEFENDING - 'The doctor was just doing his job,' 'Our nurses are very experienced' - which aligns the nurse with the system against the patient and signals that the patient's concern is not legitimate. Non-therapeutic five is APPROVAL OR DISAPPROVAL - 'That's good,' 'That was wrong of you' - which implies the nurse is the judge and may cause the patient to suppress further disclosure to avoid judgment."
        },
        {
          "kind": "p",
          "text": "Non-therapeutic six is BELITTLING - 'Lots of people feel that way,' 'It's not as bad as it could be' - which minimizes the patient's individual experience; the distractor often comes disguised as solidarity, as in 'I know how you feel,' but it minimizes nonetheless. Non-therapeutic seven is WHY QUESTIONS - 'Why do you feel that way?,' 'Why didn't you call sooner?' - which put the patient on the defensive and sound like interrogation; reframe them to 'what' or 'how,' as in 'What happened?' or 'How did you decide?' Non-therapeutic eight is CHANGING THE SUBJECT - the patient mentions feeling depressed and the nurse responds by asking about diet - which signals discomfort with the topic and refuses engagement."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "The validate-plus-invite pattern",
          "text": "The NCLEX format: the patient says something emotionally significant, four response options are given, THREE are non-therapeutic distractors, and ONE uses an open-ended technique that VALIDATES FEELINGS and INVITES MORE DIALOGUE. That pattern - validate plus invite - is the correct answer almost every time."
        }
      ],
      "practiceItemId": "pi_pancreatic_cancer_disclosure"
    },
    {
      "id": "diabetes-communication-drill",
      "minutes": "10-15",
      "title": "Validate-plus-invite, second drill",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Let's drill the validate-plus-invite pattern a second time, because this is the single most important takeaway of the hour and pattern recognition only comes from repetition. The setup is the same as the first item: an emotionally charged statement from the patient, four options, three non-therapeutic distractors, and one response that names the feeling and opens the door to more dialogue. As you read the next item, first ask yourself what the patient is feeling, then eliminate the three options that fall into the eight non-therapeutic categories."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Same pattern, every time",
          "text": "If you find these emotionally explicit 'correct' answers feel theatrical or unnatural, that feeling is valid and we will name exactly why in the next segment. For now: name the feeling, invite more dialogue, and the answer follows."
        }
      ],
      "practiceItemId": "pi_diabetes_overwhelmed"
    },
    {
      "id": "cultural-translation",
      "minutes": "15-20",
      "title": "Cultural translation for Filipino, UK, African cohorts",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Now let me address the cultural translation explicitly, because the two practice items we just did may have felt uncomfortable. The 'correct' answers may feel theatrical, intrusive, or simply unlike how you would naturally respond - and that feeling is valid. Let me name what is happening for each cohort, because understanding the gap between your home style and the test style is what lets you cross it deliberately."
        },
        {
          "kind": "h",
          "text": "Filipino cohort"
        },
        {
          "kind": "p",
          "text": "Filipino communication style is family-centered, often indirect, with respect for authority figures. The cultural norm 'hiya' - roughly translated as shame-avoidance or face-saving - means direct discussion of difficult emotional content with a relative stranger can feel inappropriate. The cultural norm 'pakikisama' - smooth interpersonal relations - means that challenging or correcting another person feels uncomfortable."
        },
        {
          "kind": "p",
          "text": "The Filipino-to-NCLEX translation: the test expects MORE EXPLICIT emotional acknowledgment than may feel natural. 'That must be very difficult' is correct on the test even when culturally you might lean toward practical support - 'Let me get you some water, and we can call your sister' - or toward family deferral - 'Is your daughter able to come help you process this?' Those responses are kind and culturally appropriate, but on the test they tend to be the distractor."
        },
        {
          "kind": "h",
          "text": "UK cohort"
        },
        {
          "kind": "p",
          "text": "UK communication style emphasizes emotional restraint, understatement, and practical problem-solving, and the 'stiff upper lip' tradition shapes nurse-patient communication. Open emotional discussion with a relative stranger can feel intrusive or theatrical. The British nurse who responds to a grieving patient with 'I'm very sorry. Is there anything practical I can do?' is being kind and appropriate in UK practice - but on the NCLEX the more emotionally explicit option, 'Tell me how you're feeling about losing him,' is typically marked correct. The translation: the test expects more explicit feeling-focused phrasing than feels natural, and the practical-help response may be a distractor."
        },
        {
          "kind": "h",
          "text": "African cohort (Kenya, Ghana, broader)"
        },
        {
          "kind": "p",
          "text": "Communication styles vary across Kenya, Ghana, and other African nursing cultures, but several common features matter for the NCLEX: communal orientation, in which distress is understood and expressed within family and community context; respect for elders, where a junior nurse speaking explicitly about feelings to a senior patient may feel inappropriate; and religious or spiritual framing of distress, where 'I will pray for you' or 'God will give you strength' are common, welcome, and culturally appropriate."
        },
        {
          "kind": "p",
          "text": "The African-to-NCLEX translation: the test expects one-on-one, secular, feelings-focused communication that may feel inappropriate for a stranger or for a younger nurse with an older patient. The spiritual framing common in real African practice - 'I will pray for you' - is generally NOT selected as the NCLEX-correct response. The test does not consider that response wrong in life; it simply does not match the test's communication template."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Universal teaching point",
          "text": "The NCLEX rewards a specific communication style. That style is not universally better than your home style - it is the specific style the test rewards. Learn the pattern, apply it on the test, and in real practice integrate it with your authentic communication."
        },
        {
          "kind": "p",
          "text": "Two practical adaptations carry you through almost every therapeutic-communication item. First, when you read the question stem, ask yourself 'What is the patient FEELING?' - the answer that NAMES THE FEELING is almost always correct. Second, when scanning the response options, eliminate the three that are clearly non-therapeutic using the eight-category framework - advice, false reassurance, cliche, defending, judgment, belittling, why questions, subject change - and the remaining option is usually the right one."
        }
      ]
    },
    {
      "id": "suicide-risk-assessment",
      "minutes": "20-27",
      "title": "Suicide risk assessment",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Suicide risk assessment is the single most important communication skill in mental health nursing and a heavily tested NCLEX topic. Direct inquiry is the standard: 'Are you thinking about suicide?' or 'Are you thinking about hurting yourself?' Asking directly does NOT increase risk. This is one of the most persistent myths in nursing - that asking will 'put the idea in their head' - and it is false. Asking communicates that the topic is allowable, signals that you take it seriously, and provides the assessment data you need."
        },
        {
          "kind": "h",
          "text": "Seven risk assessment components"
        },
        {
          "kind": "p",
          "text": "Evaluate seven things. One, IDEATION - passive ideation sounds like 'I wish I weren't here anymore' or 'I wish I would go to sleep and not wake up,' while active ideation sounds like 'I'm thinking about killing myself' or 'I want to end my life.' Two, PLAN - specific ('I would take all my pills') or vague ('Sometimes I think about ending it'). Three, INTENT - does the patient actually intend to act on the ideation, since some patients have passive thoughts without any intention while others have active intention?"
        },
        {
          "kind": "p",
          "text": "Four, MEANS - does the patient have ACCESS to lethal means such as firearms in the home, accumulated medications, access to a high location, or access to pesticides? Means availability dramatically affects risk. Five, PRIOR ATTEMPTS - the single biggest predictor of completed suicide is prior attempts, so a patient with a history of one or more previous attempts is at much higher risk. Six, FAMILY HISTORY of suicide. Seven, CURRENT PSYCHIATRIC SYMPTOMS - severity of depression, presence of psychotic symptoms (particularly command hallucinations), substance use, and recent precipitating events."
        },
        {
          "kind": "list",
          "items": [
            "High-risk features: specific plan with available means",
            "Recent attempt",
            "Severe hopelessness",
            "Command hallucinations to harm self",
            "Significant substance use",
            "Recent precipitating events (job loss, relationship breakup, anniversary of loss)",
            "Social isolation"
          ]
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Sudden mood improvement is a danger sign",
          "text": "Sudden mood improvement in a previously depressed and suicidal patient is often a WARNING SIGN, not relief. A patient who has decided on suicide may appear calm and 'better' because the internal ambivalence has resolved. If a suicidal patient suddenly seems much better with no obvious reason, increase your vigilance - not your relief. This is the highest-yield NCLEX-testable specific in the segment."
        },
        {
          "kind": "p",
          "text": "Means restriction is one of the most effective evidence-based interventions, because removing access to lethal means saves lives: firearm removal from the home, medication lockup and pill counts, and pesticide restriction, which is relevant in many international settings. Safety planning has largely replaced 'no-suicide contracts.' The old practice of asking a patient to sign a contract promising not to attempt suicide is NOT evidence-based and provides false reassurance to the clinician without protecting the patient. Modern safety plans include warning signs the patient can recognize, internal coping strategies, social contacts for distraction, social contacts for help, professional contacts such as crisis lines, and means restriction."
        },
        {
          "kind": "p",
          "text": "For hospitalization of high-risk patients, voluntary admission is preferred. Involuntary commitment criteria vary by state, but typical criteria are danger to self, danger to others, or grave disability. Acutely suicidal hospitalized patients require continuous, one-to-one observation: the patient is never left alone, including in the bathroom, and this is heavily tested. Documentation should use specific, direct language and record the patient's exact words when possible - for example, 'Patient stated, \"I want to take all my pills and not wake up\"' - and document the assessment, the plan, the patient's response, and follow-up."
        }
      ],
      "practiceItemId": "pi_sudden_mood_improvement"
    },
    {
      "id": "major-psychiatric-medications",
      "minutes": "27-34",
      "title": "Major psychiatric medications",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "h",
          "text": "Antidepressants"
        },
        {
          "kind": "p",
          "text": "SSRIs - selective serotonin reuptake inhibitors - include fluoxetine, sertraline, citalopram, escitalopram, and paroxetine, and they are first-line for depression and most anxiety disorders. They take 4 to 6 weeks for full antidepressant effect, which makes patient teaching critical because patients often want to stop after 1 to 2 weeks when they don't yet feel improvement. Side effects include sexual dysfunction (the most commonly reported), GI upset, weight changes, and insomnia or somnolence, plus bleeding risk especially with anticoagulants (recall Hour 3)."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "SSRI black box warning",
          "text": "Increased suicidal ideation in patients UNDER 25 in the first weeks of treatment - monitor closely. The mechanism: patients may experience energy improvement before mood improvement, giving them more capacity to act on suicidal thoughts."
        },
        {
          "kind": "p",
          "text": "SNRIs - venlafaxine and duloxetine - have a similar profile to SSRIs with added norepinephrine effects, are also used for chronic pain and neuropathy, and may increase blood pressure (especially venlafaxine). TCAs - tricyclic antidepressants such as amitriptyline, nortriptyline, and imipramine - are an older class still used for depression, neuropathic pain, and migraine prevention. They are CARDIOTOXIC IN OVERDOSE: even a relatively small overdose can cause fatal arrhythmias, and they carry anticholinergic side effects (dry mouth, urinary retention, constipation, blurred vision). They are dangerous in suicidal patients, so limit prescribed quantities."
        },
        {
          "kind": "p",
          "text": "MAOIs - monoamine oxidase inhibitors such as phenelzine, tranylcypromine, and isocarboxazid - are rare now but still appear on the NCLEX. The critical point is the tyramine food restriction: tyramine in aged cheese, cured meats, fermented foods, draft beer, red wine, soy sauce, fava beans, and marmite, when combined with an MAOI, causes a HYPERTENSIVE CRISIS, so patient teaching is intensive. MAOIs also require a 2-week washout period between an MAOI and another antidepressant to prevent serotonin syndrome, which matters when switching medications."
        },
        {
          "kind": "p",
          "text": "Bupropion is an atypical antidepressant also used for smoking cessation (brand name Zyban). It carries SEIZURE RISK at higher doses and is CONTRAINDICATED in eating disorders (anorexia, bulimia - increased seizure risk in low-weight patients) and in seizure history. It does NOT cause sexual side effects, which makes it valuable for patients who could not tolerate SSRIs for that reason."
        },
        {
          "kind": "h",
          "text": "Serotonin syndrome (Hour 4 callback)"
        },
        {
          "kind": "p",
          "text": "Serotonin syndrome is excess serotonergic activity in the CNS, and its triad is autonomic instability (hyperthermia, tachycardia, hypertension, diaphoresis), mental status changes (agitation, confusion), and neuromuscular hyperactivity (CLONUS, HYPERREFLEXIA, tremor, rigidity). It is triggered by combinations of serotonergic agents: SSRI plus MAOI is the most classic combination and should never be given together; SSRI plus tramadol (recall Hour 5); SSRI plus linezolid, an antibiotic; SSRI plus St. John's wort; and combinations of any two serotonergic drugs. Treatment is to discontinue the serotonergic agents, give supportive care with cooling and hydration, use cyproheptadine (a serotonin antagonist) in severe cases, and give benzodiazepines for agitation."
        },
        {
          "kind": "h",
          "text": "Lithium (Hour 4 callback)"
        },
        {
          "kind": "p",
          "text": "Lithium is used for bipolar disorder maintenance and acute mania, and it has a narrow therapeutic window. The therapeutic level is 0.6 to 1.2 mEq/L; toxicity occurs above 1.5 and severe toxicity above 2.5. Early toxicity signs are nausea, vomiting, diarrhea, fine tremor, and polyuria, progressing to confusion, ataxia, slurred speech, hyperreflexia, coarse tremor, seizures, and coma. Treatment is IV hydration and hemodialysis for severe toxicity, and you hold the lithium."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Lithium interactions: sodium and fluid matter",
          "text": "Low sodium causes lithium retention and toxicity, so patients with vomiting, diarrhea, heavy sweating, or low-salt diets are at risk. Dehydration causes toxicity. Thiazide diuretics, NSAIDs, and ACE inhibitors all increase lithium levels. Teach consistent salt and fluid intake. Lithium is also TERATOGENIC - Ebstein's anomaly of the tricuspid valve - and is generally avoided in pregnancy unless benefit outweighs risk."
        },
        {
          "kind": "p",
          "text": "Other mood stabilizers to know: valproate is hepatotoxic and teratogenic, causing neural tube defects (the worst of the antiepileptics, recall Hour 11). Lamotrigine carries a Stevens-Johnson syndrome risk, so it requires slow titration and watching for rash. Carbamazepine can cause agranulocytosis and hyponatremia from SIADH (recall Hour 9)."
        },
        {
          "kind": "h",
          "text": "Antipsychotics and EPS"
        },
        {
          "kind": "p",
          "text": "Typical (first-generation) antipsychotics - haloperidol, chlorpromazine, fluphenazine - produce strong dopamine D2 blockade, control positive symptoms such as hallucinations and delusions, and have side effects dominated by EPS, the extrapyramidal symptoms. There are four EPS manifestations to know. Acute dystonia is sudden sustained muscle contractions such as oculogyric crisis (eyes rolled up) or torticollis (neck twisted), often within hours to days of starting the drug, treated with an anticholinergic agent IM (benztropine, diphenhydramine) for rapid relief. Akathisia is inner restlessness and inability to sit still - the patient paces or shifts in the chair and it is often misinterpreted as anxiety - treated with beta-blockers, benzodiazepines, or dose reduction."
        },
        {
          "kind": "p",
          "text": "Pseudoparkinsonism is tremor, rigidity, bradykinesia, and masked face (recall Hour 11 TRAP), treated with an anticholinergic or dose reduction. Tardive dyskinesia is involuntary movements - lip smacking, tongue protrusion, facial grimacing, choreoathetoid movements of the extremities - occurring after long-term use, often months to years, and it is often IRREVERSIBLE; switch to an atypical agent, with newer agents (valbenazine, deutetrabenazine) available for treatment."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "NMS vs serotonin syndrome (Hour 4 callback)",
          "text": "Neuroleptic malignant syndrome (NMS) is a severe, life-threatening reaction to antipsychotics: hyperthermia, severe LEAD-PIPE rigidity, altered mental status, autonomic instability, elevated CK, possible rhabdomyolysis (recall Hour 11); treat by stopping the antipsychotic, supportive care, dantrolene, and bromocriptine. The differentiator: serotonin syndrome has HYPERREFLEXIA AND CLONUS (muscles hyper-active); NMS has LEAD-PIPE RIGIDITY (muscles stiff and slow). Both have hyperthermia and altered mental status - the neuromuscular finding tells them apart."
        },
        {
          "kind": "p",
          "text": "Atypical (second-generation) antipsychotics - olanzapine, risperidone, quetiapine, aripiprazole, ziprasidone, clozapine - have less D2 blockade and more serotonin effects, so they cause LESS EPS, though it is still possible. Their main concern is METABOLIC syndrome - weight gain, diabetes, and dyslipidemia, especially with olanzapine and clozapine - so monitor weight, glucose, and lipids regularly."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Clozapine and agranulocytosis",
          "text": "Clozapine is the most effective agent for treatment-resistant schizophrenia but is reserved due to side effects. AGRANULOCYTOSIS - a life-threatening drop in white blood cells - requires weekly CBC monitoring for the first 6 months, biweekly for the next 6 months, and monthly thereafter, and the patient cannot receive clozapine without enrollment in a registered monitoring program. Other risks: seizures, myocarditis, severe constipation (sometimes fatal - monitor bowel function), and sialorrhea (excessive drooling)."
        },
        {
          "kind": "p",
          "text": "Benzodiazepines - lorazepam, diazepam, alprazolam, chlordiazepoxide, midazolam - are used for anxiety, alcohol withdrawal, status epilepticus (recall Hour 11), and preoperative sedation. Side effects include sedation, addiction with prolonged use, and respiratory depression especially when combined with opioids (recall Hour 5); withdrawal from chronic use can cause seizures. Flumazenil is the antidote but is rarely used in chronic benzodiazepine users because it can precipitate withdrawal seizures. Stimulants for ADHD - methylphenidate and amphetamines - cause appetite suppression and growth concerns in children (monitor weight and height), sleep disturbance, and cardiovascular effects (monitor BP and HR), and they are Schedule II controlled substances."
        }
      ],
      "practiceItemId": "pi_lithium_thiazide_interaction"
    },
    {
      "id": "mood-anxiety-ptsd-ocd",
      "minutes": "34-41",
      "title": "Depression, bipolar, anxiety, PTSD, OCD",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "h",
          "text": "Major depressive disorder"
        },
        {
          "kind": "p",
          "text": "Major depressive disorder requires five or more of the SIGECAPS criteria for at least 2 weeks, with at least one being either depressed mood OR loss of interest. SIGECAPS stands for Sleep changes (insomnia or hypersomnia), Interest loss (anhedonia), Guilt or feelings of worthlessness, Energy decreased, Concentration decreased, Appetite and weight changes, Psychomotor changes (agitation or retardation), and Suicidality."
        },
        {
          "kind": "p",
          "text": "First-line MDD treatment is an SSRI plus cognitive behavioral therapy, with other antidepressants for non-responders. Electroconvulsive therapy (ECT) is reserved for severe, refractory, or high-suicide-risk depression and is particularly safe and effective in the elderly. The main ECT side effect is short-term memory loss, which is usually transient."
        },
        {
          "kind": "h",
          "text": "Bipolar disorder"
        },
        {
          "kind": "p",
          "text": "Bipolar I disorder requires at least one manic episode, with or without depressive episodes. Bipolar II requires at least one hypomanic episode plus at least one major depressive episode and never has full mania. Manic episode features follow the mnemonic DIG FAST: Distractibility; Indiscretion (impulsivity, risk-taking, hypersexuality, spending sprees, dangerous decisions); Grandiosity; Flight of ideas (rapid jumping between topics, pressured thinking); Activity increase (psychomotor agitation, goal-directed activity, sometimes for days without sleep); Sleep decreased (often without subjective fatigue - the manic patient can function on 2 to 3 hours of sleep for days); and Talkativeness (pressured speech, hard to interrupt)."
        },
        {
          "kind": "p",
          "text": "Bipolar treatment: for acute mania, a second-generation antipsychotic (olanzapine, risperidone, quetiapine), with or without lithium or valproate. For maintenance, lithium is first-line, with valproate or lamotrigine (the latter for depression-predominant bipolar). Antidepressants alone can precipitate mania in bipolar patients, so use them with caution and usually in combination with a mood stabilizer."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Nursing care during mania",
          "text": "Decrease environmental stimuli (private room, low lighting, quiet). Provide FINGER FOODS - the manic patient cannot sit through a full meal but will eat on the move. Monitor for exhaustion, dehydration, injury, and financial or sexual indiscretion. Set firm, consistent, brief limits, and use brief, clear, focused statements - long discussions are impossible during full mania."
        },
        {
          "kind": "h",
          "text": "Anxiety disorders"
        },
        {
          "kind": "p",
          "text": "Generalized anxiety disorder is excessive worry about multiple domains, more days than not, for at least 6 months, with physical symptoms - restlessness, fatigue, concentration difficulty, irritability, muscle tension, and sleep disturbance. Treatment is an SSRI or SNRI plus CBT, with benzodiazepines short-term only because of addiction risk. Panic disorder is recurrent panic attacks: discrete episodes of intense fear with palpitations, dyspnea, chest pain, dizziness, sweating, a sense of impending doom, derealization, and fear of dying or going crazy. Patients often present to the ED thinking they are having a heart attack. Treatment is an SSRI plus CBT, with benzodiazepines short-term for acute attacks."
        },
        {
          "kind": "h",
          "text": "PTSD and acute stress disorder"
        },
        {
          "kind": "p",
          "text": "Post-traumatic stress disorder follows exposure to actual or threatened death, serious injury, or sexual violence, with symptoms in FOUR clusters lasting more than 1 month: intrusion (flashbacks, nightmares, intrusive memories); avoidance (of trauma reminders, conversations, places); negative cognition and mood (persistent negative beliefs, emotional detachment); and hyperarousal (hypervigilance, exaggerated startle, sleep disturbance, irritability, concentration difficulties). Acute stress disorder is similar to PTSD but its symptoms last 3 days to 1 month after the trauma; most resolve, while some progress to PTSD."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Avoid benzodiazepines in PTSD",
          "text": "PTSD treatment is trauma-focused CBT, EMDR (eye movement desensitization and reprocessing), and prolonged exposure therapy. SSRIs are first-line medications, and prazosin specifically reduces trauma-related nightmares. AVOID benzodiazepines in PTSD - they may worsen outcomes by interfering with trauma processing."
        },
        {
          "kind": "p",
          "text": "OCD consists of obsessions - intrusive, unwanted, distressing thoughts - plus compulsions, which are repetitive behaviors performed to neutralize the obsessions; the relief is temporary, so the cycle repeats. Treatment is high-dose SSRIs (often higher than depression dosing) plus exposure and response prevention (ERP) therapy, which is the gold-standard psychotherapy for OCD."
        }
      ]
    },
    {
      "id": "schizophrenia-psychosis",
      "minutes": "41-46",
      "title": "Schizophrenia & psychosis",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Schizophrenia is a chronic psychotic disorder with onset typically in late adolescence to young adulthood - earlier in men (late teens to 20s) than in women (20s to 30s). The diagnostic criteria are two or more symptoms for a significant portion of 1 month, with continuous disturbance lasting at least 6 months."
        },
        {
          "kind": "h",
          "text": "Positive, negative, and cognitive symptoms"
        },
        {
          "kind": "p",
          "text": "POSITIVE symptoms are additions to normal experience: hallucinations, most commonly auditory (voices); delusions, which are fixed false beliefs not amenable to reason and come in common types - persecutory (being followed or plotted against), grandiose (special powers or identity), referential (events have special meaning for the patient), and somatic (false beliefs about the body); disorganized speech such as loose associations, word salad, and neologisms; and disorganized or catatonic behavior."
        },
        {
          "kind": "p",
          "text": "NEGATIVE symptoms are absences from normal experience: avolition (lack of motivation), alogia (poverty of speech, minimal words), anhedonia (loss of pleasure), affective flattening (reduced emotional expression), and social withdrawal. Negative symptoms are often MORE disabling long-term than positive symptoms and respond LESS well to medications. Cognitive symptoms include attention deficits, working memory impairment, and executive function deficits, which are often present before the first psychotic episode and persist throughout the illness."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Hallucination response - the NCLEX approach",
          "text": "Do NOT argue with the hallucination or try to disprove it, and do NOT validate it as real or pretend you can also see or hear what the patient does. Acknowledge that the experience is REAL TO THE PATIENT, but that you do not share it: 'I don't hear the voices you're hearing, but I understand they are real to you. What are the voices saying?' This is partly assessment - assess for command hallucinations, especially harm-related - and partly redirecting to reality."
        },
        {
          "kind": "p",
          "text": "The delusion response is similar: do not argue, do not validate, and focus on the underlying FEELING - 'You seem worried about being followed. Tell me more about what you're feeling' - then redirect to reality-based activities. For treatment, antipsychotic medication is the foundation, with second-generation agents often preferred for tolerability, and long-acting injectable formulations improve adherence in patients who struggle with daily oral medications. Psychosocial interventions include assertive community treatment, family education and support, supported employment, cognitive remediation, and social skills training."
        }
      ],
      "practiceItemId": "pi_schizophrenia_hallucination_response"
    },
    {
      "id": "substance-use-alcohol-withdrawal",
      "minutes": "46-52",
      "title": "Substance use & alcohol withdrawal",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Alcohol withdrawal is potentially life-threatening",
          "text": "Memorize the timeline. Unlike opioid or stimulant withdrawal, alcohol withdrawal can kill - delirium tremens carries 15 to 25 percent mortality if untreated."
        },
        {
          "kind": "h",
          "text": "Alcohol withdrawal timeline"
        },
        {
          "kind": "list",
          "items": [
            "6 to 12 hours after the last drink - minor withdrawal: tremor, anxiety, insomnia, mild autonomic instability (tachycardia, mild hypertension), GI upset, headache.",
            "12 to 24 hours - alcoholic hallucinosis: visual or tactile hallucinations with INTACT orientation. This is a key differentiator from DTs - the patient knows where they are even though they are seeing things.",
            "24 to 48 hours - WITHDRAWAL SEIZURES: generalized tonic-clonic, often single but can be multiple (recall Hour 11, status epilepticus treatment).",
            "48 to 96 hours - DELIRIUM TREMENS (DTs): confusion AND disorientation (different from alcoholic hallucinosis), severe agitation, hallucinations, marked autonomic instability (tachycardia 140+, hypertension, hyperthermia, profuse diaphoresis), tremor. Mortality 15 to 25 percent untreated, 1 to 5 percent with treatment. Medical emergency."
          ]
        },
        {
          "kind": "p",
          "text": "The CIWA-Ar - the Clinical Institute Withdrawal Assessment for Alcohol, revised - is the scoring tool for severity, and its scores guide treatment dosing because symptom-triggered protocols are evidence-based. For treatment, benzodiazepines are the foundation: chlordiazepoxide (Librium) has a long half-life and is used in many protocols, while lorazepam (Ativan) is preferred in liver disease because it lacks the hepatic phase I metabolism the others require. Symptom-triggered dosing based on CIWA scores, rather than fixed schedules, reduces total exposure."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Thiamine before glucose (Hour 6 callback)",
          "text": "Alcoholic patients are often profoundly thiamine-deficient. Giving glucose before thiamine can precipitate Wernicke encephalopathy (confusion, ataxia, ophthalmoplegia) or Korsakoff syndrome (amnesia, confabulation). The sequence: IV thiamine first, then glucose if hypoglycemic. Memorize the phrase 'Thiamine before glucose.'"
        },
        {
          "kind": "p",
          "text": "Other supportive measures in alcohol withdrawal include folate supplementation, magnesium repletion (commonly depleted), IV hydration, a calm environment with reorientation, cardiac monitoring for arrhythmias, and restraints if needed for safety in DT agitation, with appropriate monitoring."
        },
        {
          "kind": "h",
          "text": "Other withdrawal syndromes and overdose"
        },
        {
          "kind": "p",
          "text": "Opioid withdrawal is NOT life-threatening (in contrast to alcohol and benzodiazepine withdrawal) but is extremely uncomfortable - the patient feels terrible. Symptoms are lacrimation, rhinorrhea, yawning, MYDRIASIS (dilated pupils, the opposite of acute intoxication where pupils are pinpoint), piloerection ('goose flesh'), GI symptoms (nausea, vomiting, diarrhea, cramping), muscle aches, restlessness, and anxiety. Treatment is methadone or buprenorphine substitution, clonidine for autonomic symptoms (especially the sympathetic surge), antiemetics and antidiarrheals, and supportive care, with long-term medication-assisted treatment using methadone or buprenorphine maintenance."
        },
        {
          "kind": "p",
          "text": "Benzodiazepine withdrawal is similar in timeline and severity to alcohol withdrawal - SEIZURES are a real risk - so never abruptly discontinue long-term benzodiazepines; always taper slowly, sometimes over weeks to months. Stimulant withdrawal (cocaine, methamphetamine) is NOT life-threatening but produces profound depression, fatigue, sleep disturbance (initial hypersomnia then insomnia), hyperphagia, and intense craving; treatment is supportive, and you must MONITOR FOR SUICIDE RISK because of the severe depressive component."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Naloxone has a shorter half-life than many opioids",
          "text": "Naloxone reverses opioid-induced respiratory depression, but it has a SHORTER half-life than many opioids - especially methadone, fentanyl, and extended-release formulations. You may need repeat dosing or a continuous infusion. Do not discharge after one dose of naloxone if a long-acting opioid is involved; re-sedation will occur."
        }
      ],
      "practiceItemId": "pi_delirium_tremens_thiamine_first"
    },
    {
      "id": "de-escalation",
      "minutes": "52-55",
      "title": "De-escalation principles",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "De-escalation is largely common sense applied with discipline. Safety comes first - your safety, the patient's safety, and other patients' safety. Position yourself near an exit, do not turn your back to an agitated patient, and have backup available. Keep a calm demeanor: your voice lower and slower than the patient's, your breathing visible and steady, and your body language open with arms uncrossed and hands visible."
        },
        {
          "kind": "p",
          "text": "Respect personal space by staying at least an arm's length away initially, approaching from the front, and not cornering the patient - leave them an exit too. Use active listening: allow the patient to express, reflect back what you hear, and validate FEELINGS even when you cannot agree with behaviors, as in 'I can see you are angry. I want to understand why.' Do NOT argue with delusions or hallucinations during de-escalation - now is not the time."
        },
        {
          "kind": "p",
          "text": "Offer CHOICES when possible - 'Would you prefer to talk here or in the quieter room?' - because choices restore some sense of agency to a patient who feels out of control. Set LIMITS clearly and consistently - 'I cannot allow you to throw things. Let's talk about what's bothering you' - limits without threats."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Restraints are a last resort",
          "text": "Restraints can be physical or chemical (medication-induced sedation) and require a provider order, or initiation under an emergency standing order with the order obtained within a specific timeframe (typically within 1 hour). They require continuous monitoring - vital signs, circulation in restrained limbs, skin integrity, hydration, toileting - and frequent reassessment for ability to release, plus documentation. Detail comes in Hour 15."
        }
      ]
    },
    {
      "id": "synthesis-serotonin-syndrome",
      "minutes": "55-58",
      "title": "Synthesis case: serotonin syndrome vs NMS",
      "format": "Case",
      "blocks": [
        {
          "kind": "p",
          "text": "Work through this synthesis case, which integrates depression, medication interactions, and acute decompensation. A 72-year-old client with major depressive disorder has been taking fluoxetine 40 mg daily for 6 months. The client is admitted to the ED with T 38.9°C, HR 124, BP 168/102, diaphoresis, agitation, confusion, tremor with clonus of the lower extremities, and hyperreflexia. The family reports the client recently started a new medication for back pain prescribed by another provider, and the pain medication bottle in the client's belongings is tramadol. Walk through your reasoning: identify what is happening, prioritize, and plan."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Reasoning: this is serotonin syndrome",
          "text": "The patient is on a serotonergic medication (fluoxetine, an SSRI) for 6 months and recently started a second serotonergic medication (tramadol, which has serotonergic activity). The picture matches the serotonin syndrome triad: autonomic instability (hyperthermia, hypertension, tachycardia, diaphoresis), mental status changes (agitation, confusion), and neuromuscular hyperactivity (CLONUS, HYPERREFLEXIA, tremor). Could this be NMS? No - the patient is not on an antipsychotic, and the neuromuscular finding is HYPER-active (clonus and hyperreflexia), not the LEAD-PIPE rigidity of NMS. Priority actions in sequence: (1) STOP both serotonergic medications immediately - fluoxetine and tramadol; (2) SUPPORTIVE CARE - IV fluids for hydration and BP support, cooling measures for the centrally driven hyperthermia (antipyretics may be ineffective), cardiac monitoring; (3) BENZODIAZEPINES (IV lorazepam) for agitation and autonomic instability; (4) CYPROHEPTADINE (a serotonin antagonist) in severe cases; (5) NOTIFY the provider and prepare for ICU admission in severe cases; (6) DOCUMENT the interaction and flag both medications in the allergy/intolerance record. The test pattern: recognize the syndrome, differentiate from NMS by neuromuscular findings, and stop the offending agents."
        }
      ]
    },
    {
      "id": "close-and-homework",
      "minutes": "58-60",
      "title": "Close & homework",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Homework before Hour 15: fifty mental health questions, with deliberate emphasis on the therapeutic communication response format - the validate-plus-invite pattern - plus suicide risk assessment and lithium, SSRI, and antipsychotic medication safety. If you are still missing therapeutic-communication items, the issue is pattern recognition, so drill more items: name the feeling, invite more dialogue."
        },
        {
          "kind": "p",
          "text": "Hour 15 is infection control and safety: transmission-based precautions (standard, contact, droplet, airborne), PPE donning and doffing sequence, fall prevention, restraints in detail (which we just previewed), never events, medication errors, and the 'six rights' of medication administration plus additional rights. It is a high-density hour. See you in Hour 15."
        }
      ]
    }
  ]
};
