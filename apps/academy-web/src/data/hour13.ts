import type { Lesson } from "./lessonTypes";

/**
 * Section 13 - Pediatrics. Auto-generated from the Florence Academy
 * bootcamp instructor script (expanded draft). Pending nurse-educator review.
 */
export const lesson: Lesson = {
  "meta": {
    "number": 13,
    "title": "Pediatrics",
    "durationMin": 60,
    "audience": "Internationally educated nurses - Philippines, UK, Kenya, Ghana",
    "contentWeight": "Approximately 6-10% of NCLEX items - children are not small adults, so dosing, fluids, development, and disease presentation all differ",
    "tagline": "Children compensate beautifully until they crash - pediatrics rewards the nurse who recognizes the subtle cue before the obvious one (late hypotension, drooling, hydration-first) appears."
  },
  "objectives": [
    "Apply developmental milestones (motor, language, social) at 2, 4, 6, 9, 12, 15, 18, and 24 months and at ages 3, 4, and 5 - and identify the developmental red flags that require evaluation, especially loss of any previously achieved milestone.",
    "Apply the US childhood immunization schedule, memorize the live attenuated vaccines, and distinguish true contraindications to live vaccines from non-contraindications and defer situations.",
    "Recognize and categorize dehydration in children using fontanelle, capillary refill, mucous membranes, tears, and urine output, and apply the late-hypotension rule.",
    "Differentiate croup from epiglottitis from bronchiolitis on cause, onset, presentation, and management - and apply the 'no throat exam in suspected epiglottitis' rule.",
    "Apply the sickle cell crisis priority sequence - hydration first, then pain, then oxygen - and recognize acute chest syndrome, splenic sequestration, and functional asplenia.",
    "Recognize physical, sexual, and neglect abuse indicators and understand the nurse's mandatory reporting obligation, the reasonable-suspicion threshold, and proper documentation.",
    "Apply age-appropriate safety teaching including SIDS prevention, car seat positioning, poisoning and choking prevention, lead poisoning, and a working overview of cystic fibrosis."
  ],
  "timing": [
    {
      "minutes": "0-3",
      "segment": "Recap & frame the pediatrics hour",
      "format": "Lecture"
    },
    {
      "minutes": "3-13",
      "segment": "Developmental milestones - motor, language, social",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "13-20",
      "segment": "Immunizations & contraindications",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "20-27",
      "segment": "Dehydration in children",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "27-36",
      "segment": "Croup vs epiglottitis vs bronchiolitis",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "36-43",
      "segment": "Sickle cell crisis",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "43-49",
      "segment": "Child abuse & mandatory reporting",
      "format": "Lecture"
    },
    {
      "minutes": "49-54",
      "segment": "Safety by age + lead poisoning + CF brief",
      "format": "Lecture"
    },
    {
      "minutes": "54-58",
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
    "pi_milestone_two_word_phrases": {
      "id": "pi_milestone_two_word_phrases",
      "stem": "During a well-child visit, a 24-month-old child is observed to walk well but unsteadily up stairs with assistance, says approximately 8 single words, and does not yet combine words into phrases. The parent reports a normal hearing screen and no other concerns. Which finding requires further evaluation?",
      "options": [
        {
          "key": "A",
          "text": "Walking with an unsteady gait."
        },
        {
          "key": "B",
          "text": "Needing assistance with stairs."
        },
        {
          "key": "C",
          "text": "Lack of two-word phrases."
        },
        {
          "key": "D",
          "text": "Saying only 8 single words."
        }
      ],
      "answer": "C",
      "rationale": "By 24 months, two-word phrases should be present, so their absence is a developmental red flag warranting evaluation, including referral for speech-language evaluation and consideration of autism spectrum disorder screening. Walking can normally be somewhat unsteady at 24 months (A), and needing assistance with stairs is acceptable at this age (B). Vocabulary at 24 months ranges widely, and 8 words is at the lower end of the typical range but not in itself an automatic referral if two-word phrases were present (D). It is the combination of below-average vocabulary AND absent phrases that makes this child warrant evaluation, with the absent phrases being the defining red flag.",
      "cjmm": "recognize-cues",
      "reference": "Section 13 · Developmental milestones"
    },
    "pi_vaccinate_resolved_mild_illness": {
      "id": "pi_vaccinate_resolved_mild_illness",
      "stem": "A nurse is preparing to administer the 12-month vaccines to a child. The mother reports the child had a mild runny nose and low-grade fever (37.8°C) yesterday, which has resolved today. The child takes inhaled corticosteroids for asthma. Which is the most appropriate action?",
      "options": [
        {
          "key": "A",
          "text": "Defer all vaccines until the child has been afebrile for 7 days."
        },
        {
          "key": "B",
          "text": "Administer all scheduled vaccines today."
        },
        {
          "key": "C",
          "text": "Defer the MMR and Varicella vaccines due to the inhaled corticosteroid use."
        },
        {
          "key": "D",
          "text": "Defer only the live vaccines until the URI is fully resolved."
        }
      ],
      "answer": "B",
      "rationale": "Mild illness with low-grade fever that has resolved is not a contraindication to vaccination. Inhaled corticosteroids for asthma do not cause systemic immunosuppression at typical doses and are not a contraindication to live vaccines. The 12-month vaccines - MMR, Varicella, HepA, the Hib booster, and the PCV13 booster - can all be administered today. Option A delays vaccination inappropriately. Options C and D apply contraindications that do not actually apply: inhaled steroids are not severe immunocompromise, and the URI has already resolved.",
      "cjmm": "take-actions",
      "reference": "Section 13 · Immunizations & contraindications"
    },
    "pi_dehydration_normal_bp_trap": {
      "id": "pi_dehydration_normal_bp_trap",
      "stem": "A 6-month-old infant is brought to the ED with 3 days of vomiting and diarrhea. Findings: HR 178, RR 50, BP 88/54, capillary refill 4 seconds, anterior fontanelle deeply sunken, no tears with crying, axillary skin tents when pinched, mottled extremities, lethargic. Which assessment finding is most reassuring in this clinical picture?",
      "options": [
        {
          "key": "A",
          "text": "The blood pressure of 88/54."
        },
        {
          "key": "B",
          "text": "The respiratory rate of 50."
        },
        {
          "key": "C",
          "text": "The capillary refill of 4 seconds."
        },
        {
          "key": "D",
          "text": "None - all findings indicate severe dehydration."
        }
      ],
      "answer": "D",
      "rationale": "This is a deliberate trick. The BP appears within the normal range for a 6-month-old (normal SBP roughly 70 to 100), and a less-experienced nurse might be reassured by it. But in the context of severe dehydration with every other finding indicating decompensated shock, the maintained BP is the LAST compensatory mechanism - the child is on the brink of decompensation. Hypotension is a LATE sign in children, so a 'normal' BP in a clearly dehydrated child is falsely reassuring. All other findings - HR 178, capillary refill 4 seconds, sunken fontanelle, mottled extremities, lethargy - indicate severe dehydration requiring an immediate IV bolus. The correct answer is D.",
      "cjmm": "analyze-cues",
      "reference": "Section 13 · Dehydration in children"
    },
    "pi_epiglottitis_no_throat_exam": {
      "id": "pi_epiglottitis_no_throat_exam",
      "stem": "A 4-year-old is brought to the ED with sudden onset of high fever, drooling, and a muffled voice, and is sitting forward in the tripod position. The child appears toxic and is breathing rapidly with mild stridor. Which is the nurse's priority action?",
      "options": [
        {
          "key": "A",
          "text": "Obtain a throat swab for rapid strep testing."
        },
        {
          "key": "B",
          "text": "Place the child supine and obtain a lateral neck X-ray."
        },
        {
          "key": "C",
          "text": "Keep the child calm in the position of comfort with the parent and notify ENT/anesthesia immediately."
        },
        {
          "key": "D",
          "text": "Administer racemic epinephrine via nebulizer."
        }
      ],
      "answer": "C",
      "rationale": "This is a classic epiglottitis presentation - sudden onset, high fever, drooling, tripod position, toxic appearance, and muffled voice. The critical management rule is that you do NOT examine the throat, which rules out A, and you do NOT lay the child supine, which rules out B because supine positioning can let the swollen epiglottis occlude the airway. You also do not agitate the child in any way. Racemic epinephrine (D) is croup treatment, not epiglottitis treatment. The correct action is to keep the child in the position of comfort, with the parent for reassurance, and mobilize anesthesia and ENT for controlled intubation in the OR.",
      "cjmm": "take-actions",
      "reference": "Section 13 · Croup vs epiglottitis vs bronchiolitis"
    },
    "pi_sickle_cell_hydration_first": {
      "id": "pi_sickle_cell_hydration_first",
      "stem": "A 6-year-old child with sickle cell disease arrives in the ED in vaso-occlusive crisis, reporting severe pain (10/10) in both knees and the lower back. Findings: T 38.4°C, HR 132, RR 24, BP 110/70, SpO2 95%, capillary refill 2 seconds. Which is the nurse's priority action?",
      "options": [
        {
          "key": "A",
          "text": "Administer IV morphine for pain control."
        },
        {
          "key": "B",
          "text": "Initiate IV normal saline at 1.5x maintenance rate."
        },
        {
          "key": "C",
          "text": "Apply supplemental oxygen via nasal cannula."
        },
        {
          "key": "D",
          "text": "Obtain blood cultures and notify the provider for an antibiotic order."
        }
      ],
      "answer": "B",
      "rationale": "All four actions are correct and will be done - this is a priority-sequencing question. The priority sequence in a sickle cell crisis is hydration first (B), then pain management (A), then oxygen if hypoxic (C, but the SpO2 of 95% makes oxygen a lower priority), then antibiotics for fever (D, which is also indicated given the T of 38.4°C). The correct FIRST action is B - initiate IV fluids - because hydration addresses the underlying mechanism by diluting the blood and reducing sickling. Pain medication is critical and follows quickly, but most NCLEX items expect hydration first, then pain. The nurse who reaches for opioids first is treating the symptom; the nurse who starts fluids first is treating the disease.",
      "cjmm": "prioritize-hypotheses",
      "reference": "Section 13 · Sickle cell crisis"
    }
  },
  "segments": [
    {
      "id": "frame-the-hour",
      "minutes": "0-3",
      "title": "Recap & Frame the Pediatrics Hour",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Welcome to Hour 13 - pediatrics. The single most important mental shift for this hour is that children are not small adults. Pharmacology dosing is weight-based rather than fixed, fluid management follows different rules, developmental considerations shape both your assessment and your teaching, and many diseases present differently than they do in adults. Pediatrics is roughly 6 to 10 percent of NCLEX items, so it is a meaningful share of the test, and it is content-dense - we will move briskly."
        },
        {
          "kind": "p",
          "text": "Several callbacks from earlier hours pay off today, so keep them in mind as we go. A positive Babinski is normal in infants but pathologic in adults - recall Hours 11 and 12. Droplet versus contact precautions is a preview of Hour 15, and it returns in the bronchiolitis segment. Pain assessment in non-verbal children draws on Hour 5. And ABG and SpO2 monitoring connect back to Hours 6 and 8. Pediatrics is where many threads of this bootcamp come together."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "What is universal and what is US-specific for IENs",
          "text": "Developmental milestone teaching is reasonably similar worldwide, so most of you arrive with solid milestone knowledge. The major US-specific gaps tend to be the immunization schedule - which varies between countries in spacing and in which vaccines are used - and the mandatory reporting requirements for child abuse, which are stronger in the US than in many other countries. We spend extra time on both."
        }
      ]
    },
    {
      "id": "developmental-milestones",
      "minutes": "3-13",
      "title": "Developmental Milestones - Motor, Language, Social",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Before the motor landmarks, start with Erikson's psychosocial stages, because they give you a frame for understanding a child's behavior at each age. In the first year it is trust versus mistrust - the infant whose needs are reliably met develops trust. In the toddler years, roughly 1 to 3, it is autonomy versus shame and doubt - this is the 'I do it' age. In preschool, roughly 3 to 6, it is initiative versus guilt - imaginative play and planning. In school age, roughly 6 to 12, it is industry versus inferiority - building competence. And in adolescence, roughly 12 to 18, it is identity versus role confusion. Each stage tells you what the child is working on developmentally."
        },
        {
          "kind": "h",
          "text": "Motor and language milestones - memorize the landmarks"
        },
        {
          "kind": "p",
          "text": "These landmarks are highly testable, so commit them to memory. At 2 months, the infant lifts the head 45 degrees when prone, gives a social smile - the responsive smile to a face - and tracks objects past the midline. At 4 months, the infant rolls front to back, which typically comes first; back-to-front rolling comes a bit later, around 5 to 6 months. The 4-month-old also laughs and brings the hands together at the midline. At 6 months, the infant sits with support, transfers objects hand to hand, and babbles - 'bababa', 'dadada' - with the babbling repertoire expanding rapidly."
        },
        {
          "kind": "p",
          "text": "At 9 months, the infant crawls, pulls to stand, and says 'mama' or 'dada' non-specifically. This is also when stranger anxiety peaks - the infant who was friendly to everyone at 6 months now cries when an unfamiliar adult approaches. At 12 months, the child walks; the walking range is 9 to 16 months and most children walk by 15 months. The 12-month-old says 1 to 3 specific words besides 'mama' and 'dada' and has a refined pincer grasp, picking up small objects between thumb and index finger. At 15 months, the child walks well and has about 4 to 6 words."
        },
        {
          "kind": "p",
          "text": "At 18 months, the child runs awkwardly, has 10 to 50 words, points to body parts on request, and climbs stairs with assistance. At 24 months - 2 years - the child runs well, uses TWO-WORD phrases such as 'mommy go', 'more milk', or 'no juice', follows simple commands, and is approximately 50 percent intelligible to strangers. At 3 years, the child rides a tricycle, speaks in three-word sentences, copies a circle, and is approximately 75 percent intelligible to strangers."
        },
        {
          "kind": "p",
          "text": "At 4 years, the child hops on one foot, copies a square, knows colors, and is approximately 100 percent intelligible to strangers. At 5 years, the child skips, ties shoes - often, not always - copies a triangle, and knows numbers and letters. If the long list feels overwhelming, anchor on a small cluster: walks by 15 months, words by 18 months, phrases by 24 months. That phrase captures most of the testable content."
        },
        {
          "kind": "h",
          "text": "Developmental red flags - the action items"
        },
        {
          "kind": "p",
          "text": "The red flags are where you act, so memorize them. Not walking by 18 months. No words by 18 months. No two-word phrases by 24 months. And - most importantly of all - LOSS of any previously achieved milestone at ANY age. Regression suggests serious pathology: autism spectrum disorder, neurodegenerative disorders, intracranial pathology, or abuse. Loss of milestones is never normal at any age, and it always warrants evaluation."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Regression is never normal",
          "text": "Loss of a previously achieved milestone at ANY age is the single most important developmental red flag. It is never normal and points to serious pathology - autism spectrum disorder, neurodegenerative disease, intracranial pathology, or abuse. The other action-item red flags: no walking by 18 months, no words by 18 months, no two-word phrases by 24 months."
        },
        {
          "kind": "h",
          "text": "Fontanelles"
        },
        {
          "kind": "p",
          "text": "Round out the developmental picture with the fontanelles. The posterior fontanelle closes by 2 months. The anterior fontanelle closes by 18 months, with a normal range of 12 to 24 months. A persistent open anterior fontanelle beyond 24 months warrants evaluation for possible hydrocephalus, hypothyroidism, or rickets. The fontanelle returns in the next segment too, because its character - sunken versus full - is a key dehydration sign in infants."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "The milestone cluster worth memorizing",
          "text": "Walks by 15 months, words by 18 months, two-word phrases by 24 months. Posterior fontanelle closes by 2 months; anterior fontanelle closes by 18 months (range 12-24). These few anchors plus the red flags cover the bulk of the testable milestone content."
        }
      ],
      "practiceItemId": "pi_milestone_two_word_phrases"
    },
    {
      "id": "immunizations",
      "minutes": "13-20",
      "title": "Immunizations & Contraindications",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Now the US childhood immunization schedule. You need to memorize the major time points and which vaccines are added at each visit. This is one of the most US-specific topics in the hour, because home-country schedules differ in spacing and in which vaccines are used."
        },
        {
          "kind": "h",
          "text": "The schedule by age"
        },
        {
          "kind": "p",
          "text": "At birth, the child gets the first dose of Hepatitis B, often given in the hospital before discharge. At 2 months, there is a heavy visit: HepB second dose, DTaP first dose (diphtheria, tetanus, acellular pertussis), Hib first dose (Haemophilus influenzae type B), IPV first (inactivated polio), PCV13 first (pneumococcal conjugate), and Rotavirus first (an oral vaccine). That is 6 doses at one visit, often given in combinations to reduce the number of injections. At 4 months, the child gets the second doses of the series - DTaP, Hib, IPV, PCV13, and Rotavirus."
        },
        {
          "kind": "p",
          "text": "At 6 months, the child gets the HepB third dose, plus DTaP, Hib on some schedules, PCV13, and Rotavirus - and Rotavirus must be completed by 8 months of age. Influenza vaccine begins at 6 months and is given annually thereafter. At 12 to 15 months comes another heavy visit: MMR first dose (measles, mumps, rubella), Varicella first dose, a Hib booster, a PCV13 booster, and HepA first dose. The live vaccines, MMR and Varicella, are given at this age because maternal antibody has declined enough for them to take. At 18 months, the child gets the HepA second dose, at least 6 months after the first."
        },
        {
          "kind": "p",
          "text": "At 4 to 6 years come the pre-kindergarten boosters: DTaP, IPV, MMR second dose, and Varicella second dose. At 11 to 12 years: Tdap (the adolescent tetanus-diphtheria-acellular-pertussis booster), HPV (human papillomavirus, given in 2 or 3 doses depending on the age at initiation), and the meningococcal conjugate MenACWY first dose. At 16 years: a meningococcal conjugate booster, with MenB optional and decided clinically."
        },
        {
          "kind": "h",
          "text": "Live attenuated vaccines - memorize the list"
        },
        {
          "kind": "p",
          "text": "You must know the live attenuated vaccines cold, because they carry the contraindications. The list is MMR, Varicella, Rotavirus, intranasal influenza (LAIV), Yellow fever, and BCG. BCG is widely used outside the US and is directly relevant to your home practice - recall the Hour 8 BCG-TB implications. For your IEN cohort, BCG is a vaccine you have given many times that US-trained nurses rarely encounter."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "The live vaccine list",
          "text": "MMR, Varicella, Rotavirus, intranasal influenza (LAIV), Yellow fever, and BCG. Memorize this list - these are the vaccines that carry the contraindications for immunocompromise, pregnancy, and anaphylaxis. BCG is used outside the US and is part of your home-country practice."
        },
        {
          "kind": "h",
          "text": "Contraindications to live vaccines"
        },
        {
          "kind": "p",
          "text": "There are three contraindications to live vaccines, and you should memorize them. One: severe immunocompromise - chemotherapy, high-dose corticosteroids, HIV with a low CD4 count, or the post-transplant state. Two: pregnancy - live vaccines are avoided in pregnancy. Three: anaphylaxis to a previous dose or to a known vaccine component. Those three, and only those three, are the true contraindications."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Three live-vaccine contraindications",
          "text": "(1) Severe immunocompromise - chemotherapy, high-dose steroids, HIV with low CD4, post-transplant. (2) Pregnancy. (3) Anaphylaxis to a previous dose or component. These are the only three true contraindications to a live vaccine - everything else on the next list is a distractor."
        },
        {
          "kind": "h",
          "text": "What is NOT a contraindication"
        },
        {
          "kind": "p",
          "text": "Just as important is the list of things that are NOT contraindications, because the exam loves to offer these as distractors. Mild illness with low-grade fever is not a contraindication. A family history of vaccine reactions is not relevant. Breastfeeding in most cases is not a contraindication. Egg allergy is no longer a contraindication for MMR or most flu vaccines, with special considerations remaining only for severe egg allergy and certain flu formulations. And mild local reactions to previous doses are not a contraindication. Separately, there is a defer category - not a contraindication, but a reason to wait: moderate-to-severe acute illness with or without fever, where you defer until the child has recovered. Recent receipt of antibody-containing products may also delay live vaccines."
        },
        {
          "kind": "list",
          "items": [
            "Mild illness with low-grade fever - vaccinate",
            "Family history of vaccine reactions - vaccinate",
            "Breastfeeding (most cases) - vaccinate",
            "Egg allergy for MMR or most flu vaccines - vaccinate (special care only for severe egg allergy with certain flu formulations)",
            "Mild local reactions to previous doses - vaccinate",
            "DEFER (do not contraindicate): moderate-to-severe acute illness with or without fever; recent antibody-containing products may delay live vaccines"
          ]
        },
        {
          "kind": "h",
          "text": "Storage, route, and site"
        },
        {
          "kind": "p",
          "text": "A few administration points. Most vaccines are refrigerated at 2 to 8°C (35 to 46°F); Varicella and some others are frozen, so check institution policy - a cold chain failure is a genuine vaccine safety concern. As for route: most vaccines are given IM, MMR and Varicella are given SC, and Rotavirus is oral - and remember Rotavirus must be given by 8 months because of intussusception risk beyond that age. The site varies by age. The vastus lateralis, the anterolateral thigh, is preferred for infants under 1 year because the deltoid is too small; the deltoid is used in older children and adults."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Route quick reference",
          "text": "IM for most vaccines, SC for MMR and Varicella, oral for Rotavirus. Site: vastus lateralis (anterolateral thigh) for infants under 1 year; deltoid after that. Rotavirus must be completed by 8 months because of intussusception risk."
        }
      ],
      "practiceItemId": "pi_vaccinate_resolved_mild_illness"
    },
    {
      "id": "dehydration-in-children",
      "minutes": "20-27",
      "title": "Dehydration in Children",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Dehydration in children progresses differently than in adults, and this difference is the heart of the segment. Children compensate well - until they suddenly do not. Hypotension is a LATE sign in children. By the time the blood pressure drops, the child is already in decompensated shock with a poor prognosis. So your entire job is to recognize dehydration before the BP drops, using the more sensitive cues that change earlier."
        },
        {
          "kind": "h",
          "text": "Severity by percent body weight loss"
        },
        {
          "kind": "p",
          "text": "Severity is categorized by the percent of body weight lost. Mild dehydration is 3 to 5 percent in infants, lower in older children: slightly dry mucous membranes, slight thirst, normal vital signs, normal urine output, and normal capillary refill. Moderate dehydration is 6 to 9 percent: dry mucous membranes, sunken eyes, decreased tears with crying, decreased skin turgor (skin 'tents' when pinched), a SUNKEN ANTERIOR FONTANELLE in infants (a reliable sign), decreased urine output with fewer wet diapers, tachycardia, capillary refill of 2 to 3 seconds, and a child who is fussy or lethargic."
        },
        {
          "kind": "p",
          "text": "Severe dehydration is 10 percent or more: very dry mucous membranes, severely sunken eyes, no tears, marked skin tenting, a deeply sunken fontanelle, very decreased or absent urine output, marked tachycardia, capillary refill greater than 3 seconds, lethargy or coma, and COLD MOTTLED EXTREMITIES. And critically - hypotension is a LATE sign. The child compensates with tachycardia and vasoconstriction long before the BP ever drops."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "The late-hypotension rule",
          "text": "In children, BP is the LAST compensatory mechanism to fail. A child can be in severe, near-decompensated dehydration with a 'normal' blood pressure. Never be reassured by a normal BP in a clearly dehydrated child. Tachycardia, capillary refill, mental status, urine output, and the fontanelle are all more sensitive than BP - read those first."
        },
        {
          "kind": "h",
          "text": "Key signs by developmental age"
        },
        {
          "kind": "p",
          "text": "The most useful signs shift with the child's age. In infants, the anterior fontanelle is highly reliable - a sunken fontanelle equals dehydration. Decreased wet diapers matters too: fewer than 6 wet diapers per day in an infant under 6 months is concerning. And the absence of tears with crying is telling - after about 2 to 4 weeks of age tears develop, so their absence with crying suggests dehydration. In toddlers and older children, you rely instead on dry mucous membranes, sunken eyes, decreased urine output, and prolonged capillary refill."
        },
        {
          "kind": "p",
          "text": "On capillary refill specifically: press on the chest, the sternum, or a fingertip. Normally refill is less than 2 seconds; greater than 3 seconds is concerning. It is a sensitive sign of perfusion in children and one you can check in seconds at the bedside."
        },
        {
          "kind": "h",
          "text": "Treatment of mild-to-moderate dehydration"
        },
        {
          "kind": "p",
          "text": "For mild-to-moderate dehydration, oral rehydration therapy is preferred. Use an ORS solution - Pedialyte or WHO ORS - given as small frequent sips, building up as tolerated. The target is approximately 50 to 100 mL per kilogram over 4 hours, plus replacement of ongoing losses. Two things to avoid: plain water in young infants, because it can cause hyponatremia, and juice or soda, because the osmotic load worsens diarrhea. For UK-trained nurses, this WHO ORS approach maps directly onto your existing practice."
        },
        {
          "kind": "h",
          "text": "Treatment of severe dehydration and maintenance fluids"
        },
        {
          "kind": "p",
          "text": "For severe dehydration, move to IV fluids. The bolus dose is 20 mL per kilogram of normal saline or lactated Ringer's, given over 10 to 20 minutes, then reassess; you may repeat to a total of 40 to 60 mL per kilogram during resuscitation, after which you transition to maintenance plus deficit replacement. Maintenance fluids are calculated with the 4-2-1 rule: 4 mL per kilogram per hour for the first 10 kilograms of body weight, 2 mL per kilogram per hour for the next 10 kilograms, and 1 mL per kilogram per hour for each kilogram above 20."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "The 4-2-1 maintenance rule worked through",
          "text": "4 mL/kg/hr for the first 10 kg, 2 mL/kg/hr for the next 10 kg, 1 mL/kg/hr for each kg above 20. Example: a 25 kg child - first 10 kg at 4 = 40, next 10 kg at 2 = 20, last 5 kg at 1 = 5, for a total of 65 mL/hr maintenance. The severe-dehydration bolus is 20 mL/kg NS or LR, repeatable to 40-60 mL/kg."
        },
        {
          "kind": "p",
          "text": "One electrolyte caution to carry with you: hyponatremia from hypotonic fluids has been recognized as a real iatrogenic risk in pediatric inpatients. Current practice therefore favors isotonic fluids - normal saline or LR - for maintenance in most cases, rather than the hypotonic solutions used historically."
        }
      ],
      "practiceItemId": "pi_dehydration_normal_bp_trap"
    },
    {
      "id": "croup-epiglottitis-bronchiolitis",
      "minutes": "27-36",
      "title": "Croup vs Epiglottitis vs Bronchiolitis",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "These are three pediatric respiratory entities that are frequently confused, and the differentiation matters because the management diverges dramatically. Get the three pictures side by side - cause, age, onset, the signature finding, and the treatment - and you can separate them under exam pressure."
        },
        {
          "kind": "h",
          "text": "Croup (laryngotracheobronchitis)"
        },
        {
          "kind": "p",
          "text": "Croup, or laryngotracheobronchitis, affects children 6 months to 6 years with a peak in toddlers. The cause is viral - parainfluenza virus most commonly, also RSV, adenovirus, and influenza. The onset is GRADUAL, over days, often following a mild upper respiratory infection. The signature finding is a BARKING cough that sounds like a seal, along with inspiratory stridor that is worse with agitation, a hoarse voice, and a low-grade fever. Importantly, the child is usually NOT toxic-appearing. On X-ray, when obtained, you see the STEEPLE SIGN on the AP neck film, showing subglottic narrowing."
        },
        {
          "kind": "p",
          "text": "Croup management starts with the most important principle: keep the child CALM. Agitation increases respiratory effort and worsens the stridor, so have the parent hold the child. Cool mist or humidified air is commonly used. For moderate-to-severe stridor, give nebulized racemic epinephrine, which provides rapid relief - but then observe for 3 to 4 hours afterward because of potential rebound. And give dexamethasone as a single oral or IM dose; it reduces airway inflammation and is standard of care for croup."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Croup: barking cough, steeple sign, dexamethasone",
          "text": "Gradual onset, barking seal-like cough, inspiratory stridor, low-grade fever, NOT toxic-appearing, steeple sign on X-ray. Keep the child calm; treat with humidified air, racemic epinephrine for moderate-severe stridor (observe 3-4 hours for rebound), and a single dose of dexamethasone."
        },
        {
          "kind": "h",
          "text": "Epiglottitis - the airway emergency"
        },
        {
          "kind": "p",
          "text": "Epiglottitis is a feared pediatric emergency, historically caused by Haemophilus influenzae type B. It is now RARE in the US because of Hib vaccination, but it is still tested heavily, precisely because the consequences of missing it are catastrophic. The historical age is 2 to 7 years, and it can also occur in unvaccinated children and in adults from other organisms. The onset is SUDDEN, over hours, not days. The child has a HIGH fever and is DROOLING, because the swollen epiglottis prevents swallowing secretions. The child sits in the TRIPOD POSITION - leaning forward on the hands, neck extended, jaw thrust forward - to maximize the airway opening, has a muffled 'hot potato' voice, and is TOXIC-appearing. Stridor may be present but is often subtle until very late. On X-ray, when safely obtainable, you see the THUMB SIGN on the lateral neck - the swollen epiglottis looks like a thumb pointing up."
        },
        {
          "kind": "p",
          "text": "Now the critical management rule - memorize this exact wording. Do NOT examine the throat. Do NOT use a tongue blade. Do NOT obtain blood draws if they will distress the child. Do NOT separate the child from the parent. And do NOT lay the child down. The reason is that ANY agitation can precipitate complete laryngospasm and total airway closure - the swollen epiglottis can flop over the airway under stress. Children have died on the examination table from a tongue blade exam. The correct management is to keep the child calm with the parent, notify ENT and anesthesia STAT, plan controlled intubation in the operating room with anesthesia present and a surgical airway available if intubation fails, and give IV antibiotics - ceftriaxone - only after the airway is secured."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Do NOT examine the throat",
          "text": "In suspected epiglottitis: no throat exam, no tongue blade, no distressing blood draws, do not separate from the parent, do not lay the child supine. Any agitation can cause complete airway closure. Keep the child calm and upright with the parent, call ENT and anesthesia STAT, and secure the airway in the OR before antibiotics. This 'no throat exam' rule generalizes to any suspected upper-airway emergency."
        },
        {
          "kind": "h",
          "text": "Bronchiolitis"
        },
        {
          "kind": "p",
          "text": "Bronchiolitis is most commonly caused by RSV (respiratory syncytial virus). It affects children under 2 years and peaks at 3 to 6 months. Premature infants and infants with chronic lung disease or congenital heart disease are at highest risk. The presentation starts with URI symptoms - a clear runny nose (coryza), low-grade fever, and mild cough - then progresses over 2 to 3 days to lower respiratory symptoms: WHEEZING, RHONCHI, TACHYPNEA, RETRACTIONS, and NASAL FLARING. In very young infants under 2 months, apnea can occur - and sometimes apnea is the only sign of severe RSV in a young infant. Difficulty feeding is common because the infant cannot coordinate breathing and feeding."
        },
        {
          "kind": "p",
          "text": "Bronchiolitis management is SUPPORTIVE care - that is essentially the entire treatment. Give oxygen for hypoxia, targeting an SpO2 above 90 to 92 percent. Suction the nose before feeds to relieve obstruction. Provide hydration with small frequent oral feeds if tolerated, IV if not. Use continuous pulse oximetry monitoring, and hospitalize moderate-to-severe cases, with ICU care for severe disease."
        },
        {
          "kind": "p",
          "text": "Just as important is what does NOT work in bronchiolitis. Bronchodilators like albuterol have no consistent benefit and are not routinely recommended. Corticosteroids are not effective for typical bronchiolitis - and note that this is different from croup, where dexamethasone is standard. Antibiotics are not indicated unless there is a bacterial co-infection. For prevention, palivizumab (Synagis) is a monoclonal antibody injection given monthly during RSV season for high-risk infants (prematurity, chronic lung disease, certain congenital heart conditions), and newer agents like nirsevimab are approved for broader use."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Bronchiolitis: supportive care, and the contact + droplet rule",
          "text": "RSV is the cause; treatment is supportive - oxygen, nasal suctioning before feeds, hydration, pulse oximetry. Bronchodilators, steroids, and antibiotics do NOT help typical bronchiolitis. For hospitalized infants, use CONTACT plus DROPLET precautions (preview of Hour 15) because RSV spreads via respiratory secretions and contaminated surfaces; hand hygiene is critical and RSV-positive patients can be cohorted."
        }
      ],
      "practiceItemId": "pi_epiglottitis_no_throat_exam"
    },
    {
      "id": "sickle-cell-crisis",
      "minutes": "36-43",
      "title": "Sickle Cell Crisis",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Sickle cell disease is an autosomal recessive hemoglobinopathy - both parents are carriers, and the child has the disease. Hemoglobin S polymerizes under hypoxic conditions and sickles the red blood cell, which then occludes the microvasculature. It is most common in patients of African, Mediterranean, Middle Eastern, and Indian descent, which makes it directly relevant to IEN cohort patient populations from Africa, where sickle cell prevalence is the highest in the world. For Kenyan and Ghanaian nurses in particular, your clinical recognition of crisis is typically already strong - the gaps tend to be the US protocol specifics, the priority sequence, and hydroxyurea as standard maintenance."
        },
        {
          "kind": "h",
          "text": "Types of crises"
        },
        {
          "kind": "p",
          "text": "Start with the vaso-occlusive crisis - the pain crisis, and the most common type. Sickled cells block small vessels, causing tissue ischemia, with severe pain typically in the bones, joints, abdomen, chest, or back. The triggers are dehydration, infection, hypoxia, cold exposure, stress, high altitude, and exercise without hydration. Next is acute chest syndrome, the most serious common complication: it is chest pain PLUS fever PLUS hypoxia PLUS a new infiltrate on chest X-ray. It is life-threatening with significant mortality, and it may be triggered by infection or by a pulmonary fat embolism from bone marrow infarction (recall Hour 11 fat embolism syndrome). Treatment is aggressive - oxygen, IV fluids, broad-spectrum antibiotics, pain control, and often exchange transfusion."
        },
        {
          "kind": "p",
          "text": "Splenic sequestration is another emergency: blood pools in the spleen, causing a rapid drop in hemoglobin and hypovolemic shock. It is most common in young children, before the spleen is infarcted and fibrosed, and it can be FATAL within hours. Treatment is emergency transfusion, with splenectomy considered for recurrent episodes. Stroke is also a major concern - children with sickle cell disease have a markedly elevated stroke risk, screened for with transcranial Doppler, and acute stroke is treated with exchange transfusion and supportive care. Finally, aplastic crisis occurs when parvovirus B19 infection suppresses the bone marrow, causing a sudden severe anemia; it is self-limited but transfusion is often needed."
        },
        {
          "kind": "h",
          "text": "Functional asplenia"
        },
        {
          "kind": "p",
          "text": "Repeated splenic infarction from sickling makes children with sickle cell disease functionally asplenic by school age - their spleen no longer protects them. This gives them a GREATLY increased risk of infection with encapsulated bacterial organisms: Streptococcus pneumoniae, Neisseria meningitidis, and Haemophilus influenzae. Because of this, prophylactic penicillin is given from infancy through age 5, and sometimes longer. The critical vaccinations are pneumococcal (PCV13 in childhood plus PPSV23 later), meningococcal, Hib, annual influenza, and COVID. Functional asplenia is also why fever in these patients is treated as an emergency, as we will see in the priority sequence."
        },
        {
          "kind": "h",
          "text": "Crisis management - the priority sequence"
        },
        {
          "kind": "p",
          "text": "Now the priority sequence for crisis management - memorize this in order. Priority one is HYDRATION: IV fluids, aggressively. Hydration is the most important immediate intervention because it dilutes the blood, reduces viscosity, and reduces sickling - it addresses the underlying mechanism. The nurse who reaches for opioids first is treating the symptom; the nurse who starts IV fluids first is treating the disease. Priority two is PAIN MANAGEMENT: IV opioids are usually needed for severe vaso-occlusive crises (recall Hour 5) - morphine or hydromorphone, with patient-controlled analgesia for older children, around-the-clock dosing during the crisis rather than just as-needed, and NSAIDs adjunctively. Pain is OFTEN under-treated in sickle cell patients, so recognize that bias and give adequate analgesia; children deserve appropriate pain control."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Hydration BEFORE pain - the priority sequence",
          "text": "The sequence: (1) HYDRATION - IV fluids first, because they treat the underlying mechanism by diluting blood and reducing sickling. (2) PAIN - IV opioids, around the clock. (3) OXYGEN if hypoxic. (4) WARMTH. (5) TREAT INFECTION. (6) TRANSFUSION. The single most tested point: fluids come before pain medication, even though the child is in obvious distress. Hydration treats the disease; analgesia treats the symptom - both are required, fluids are first."
        },
        {
          "kind": "p",
          "text": "Priority three is OXYGEN: if the child is hypoxic, supplemental oxygen prevents further sickling. Priority four is WARMTH: avoid cold exposure, because cold causes vasoconstriction, which worsens sickling - keep the patient warm with blankets. Priority five is TREAT INFECTION: fever in a sickle cell patient is a MEDICAL EMERGENCY because of the high risk of sepsis from encapsulated organisms in a functionally asplenic child. Give broad-spectrum antibiotics promptly - typically ceftriaxone - and draw blood cultures before antibiotics if possible, but do not delay the antibiotics. Priority six is BLOOD TRANSFUSION: a simple transfusion for severe symptomatic anemia or aplastic crisis, and an exchange transfusion for stroke, acute chest syndrome, or multi-organ failure."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Fever in a sickle cell patient is an emergency",
          "text": "Because functional asplenia removes protection against encapsulated organisms, any fever in a sickle cell patient is a sepsis emergency. Give broad-spectrum antibiotics (ceftriaxone) promptly; draw blood cultures first if possible but never delay antibiotics for them."
        },
        {
          "kind": "h",
          "text": "Chronic management"
        },
        {
          "kind": "p",
          "text": "For chronic management, hydroxyurea is the cornerstone: it increases fetal hemoglobin (HbF), which does not sickle, thereby reducing crisis frequency. Add folic acid supplementation, all vaccinations on schedule plus the extras (meningococcal, pneumococcal), and education on trigger avoidance - hydration, avoiding altitude, and infection prevention. Gene therapy and stem cell transplantation are emerging curative approaches."
        }
      ],
      "practiceItemId": "pi_sickle_cell_hydration_first"
    },
    {
      "id": "child-abuse-mandatory-reporting",
      "minutes": "43-49",
      "title": "Child Abuse & Mandatory Reporting",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Child abuse takes four forms - physical, sexual, emotional, and neglect - and they often occur in combination. Nurses encounter all forms, and recognition and reporting are professional obligations. This is also a significant IEN gap, because many home countries do not have the strict mandatory reporting laws that US states have, so we will be explicit about both the recognition patterns and the legal duty."
        },
        {
          "kind": "h",
          "text": "Physical abuse indicators"
        },
        {
          "kind": "p",
          "text": "Start with the high-yield testable patterns for physical abuse. Bruises in UNUSUAL locations are a key cue: normal child play causes bruises on the shins, elbows, knees, and forehead - the bony prominences and play surfaces - whereas abuse bruises tend to be on SOFT areas like the cheeks, ears, neck, buttocks, abdomen, and thighs. PATTERNED bruises are especially telling: loop marks from a cord or belt, hand prints from slap injuries, bite marks, linear marks, and small circular cigarette burns the size of a cigarette tip. And bruises in VARIOUS STAGES of healing - different colors at the same time - suggest repeated incidents over time rather than a single accident."
        },
        {
          "kind": "p",
          "text": "Burns carry their own patterns. Immersion burns with a sharp 'stocking' or 'glove' distribution mean a foot or hand was dipped into hot water and held still. Cigarette burns are small, deep, and circular. And burns that SPARE the skin folds suggest the child pulled away from the burning agent while the folded areas stayed protected. Fractures inconsistent with the reported mechanism are also red flags: a SPIRAL FRACTURE in a non-ambulatory child is highly suspicious because it requires a twisting force not consistent with the rolling or sitting of a young infant; multiple fractures in various stages of healing on X-ray suggest prior unreported injuries; RIB FRACTURES in infants are very suspicious because the ribs are pliable and rarely fracture from accidents; and skull fractures with a vague history are concerning."
        },
        {
          "kind": "p",
          "text": "Two history-based cues round out the physical picture. An inconsistent or changing history is a strong red flag - the caregiver's story doesn't fit the injury, or changes between tellings, or different caregivers give different versions. And delayed presentation for medical care - the injury occurred yesterday but they come in today - is also concerning."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "The patterns that signal physical abuse",
          "text": "Bruises on soft areas (cheeks, ears, neck, buttocks, abdomen, thighs) rather than bony prominences; patterned injuries (loop, slap, bite, cigarette circles); bruises in various stages of healing; immersion 'stocking/glove' burns; spiral fractures in a non-ambulatory child; rib fractures in infants; an inconsistent or changing history; and delayed presentation."
        },
        {
          "kind": "h",
          "text": "Abusive head trauma"
        },
        {
          "kind": "p",
          "text": "Abusive head trauma - formerly called 'shaken baby syndrome' - deserves special attention. The classic triad is subdural hematoma, retinal hemorrhages, and cerebral edema in an infant, often with NO external signs. It may present with non-specific symptoms - vomiting, lethargy, seizures, apnea, or irritability - which is exactly why it is so easy to miss. It carries high mortality and morbidity and is caused by violent shaking, sometimes with impact."
        },
        {
          "kind": "h",
          "text": "Sexual abuse and neglect indicators"
        },
        {
          "kind": "p",
          "text": "Sexual abuse indicators include an STI in a young child - particularly in a prepubertal child, where any STI raises strong suspicion - genital or anal trauma, recurrent UTI without an identified anatomic cause, sexualized behaviors inappropriate for age, and behavioral changes such as withdrawal, regression, aggression, school refusal, and sleep disturbance. Neglect indicators include persistent poor hygiene, untreated medical or dental problems, malnutrition or failure to thrive, missed appointments, and inadequate supervision for age."
        },
        {
          "kind": "h",
          "text": "Mandatory reporting"
        },
        {
          "kind": "p",
          "text": "Now the testable legal duty, and the major IEN gap. Nurses are MANDATORY REPORTERS of suspected child abuse and neglect in all 50 US states. The threshold for reporting is REASONABLE SUSPICION - not certainty, not proof. The nurse does not need to investigate or confirm abuse; that is the role of child protective services and law enforcement. Your job is to report your concerns based on what you observed. Reporting also carries protections: mandatory reporters are protected from civil and criminal liability for good-faith reports, even if abuse is not subsequently confirmed, and failure to report when required is itself a criminal offense in most states."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Reasonable suspicion is the threshold",
          "text": "Nurses are mandatory reporters in all 50 states. Report on REASONABLE SUSPICION - not certainty, not proof. You do not investigate or confirm; CPS and law enforcement do. Good-faith reports are protected from civil and criminal liability even if abuse is not confirmed, and failure to report is itself a crime in most states. This duty is stronger in the US than in many home countries."
        },
        {
          "kind": "h",
          "text": "Documentation"
        },
        {
          "kind": "p",
          "text": "Documentation must be objective, factual, and specific. Document the injury characteristics - location, color, pattern, and size with measurements. Document the caregiver's stated history in QUOTATION MARKS, verbatim, and document the child's statements in QUOTATION MARKS, verbatim, because these may become legal evidence. Document the time and the persons present. Photograph injuries per institution policy with proper consent. And critically, do NOT document conclusions like 'this is abuse' - document the observations and let the investigation reach the conclusion."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Document observations, not conclusions",
          "text": "Record injury location, color, pattern, and measured size; quote the caregiver's history and the child's statements verbatim; note the time and persons present; photograph per policy with consent. Do not write 'this is abuse' - describe what you observed and let CPS reach the conclusion."
        }
      ]
    },
    {
      "id": "safety-lead-cf",
      "minutes": "49-54",
      "title": "Safety by Age + Lead Poisoning + CF Brief",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Safety teaching shifts with developmental age, because the major risks change as the child grows. Walk through the age bands and you have an anticipatory-guidance framework you can apply to any well-child item."
        },
        {
          "kind": "h",
          "text": "Infants, 0 to 12 months"
        },
        {
          "kind": "p",
          "text": "For infants, SIDS prevention is the highest-priority teaching for new parents, so memorize the rules. Back to sleep - always supine for sleep. A firm mattress. No soft objects in the crib - no pillows, no bumpers, no stuffed animals. No co-sleeping in an adult bed, though room-sharing without bed-sharing is protective. Beyond SIDS, manage aspiration risk by keeping small objects out of reach and avoiding nuts and hard candies. The car seat is REAR-FACING until at least age 2, and the current recommendation is to keep it rear-facing as long as the child fits within the seat's height and weight limits. For crib safety, slats should be no more than 2 and 3/8 inches apart. And for bath safety, never leave an infant unattended in water, even briefly."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "SIDS prevention - back to sleep",
          "text": "Supine for every sleep, firm mattress, nothing soft in the crib (no pillows, bumpers, or stuffed animals), no co-sleeping in an adult bed, and room-share without bed-sharing. Car seat rear-facing until at least age 2; crib slats no more than 2 3/8 inches apart; never leave an infant alone in water."
        },
        {
          "kind": "h",
          "text": "Toddlers, 1 to 3 years"
        },
        {
          "kind": "p",
          "text": "For toddlers, poisoning is a major risk, so keep medications and chemicals locked. Prevent falls with gates at the stairs. Prevent drowning by never leaving the child alone near water, including buckets, toilets, and bathtubs. Prevent choking by cutting food into small pieces - no hot dogs in rounds (cut lengthwise then chopped), no whole grapes (quartered), and no nuts under age 4. Prevent burns by turning pot handles in and setting the hot water heater below 120 degrees Fahrenheit. And for motor vehicles, move to a forward-facing car seat with a 5-point harness only after the child has outgrown rear-facing."
        },
        {
          "kind": "h",
          "text": "Preschool, school age, and adolescents"
        },
        {
          "kind": "p",
          "text": "For preschool and school age, teach bike helmets always, water safety with swimming lessons and pool fencing, and stranger safety. The child uses a booster seat until meeting the height and weight criteria - typically 4 feet 9 inches or age 12 - and rides in the back seat until at least age 13. For adolescents, the leading cause of death is motor vehicle collisions, so address distracted driving; also cover substance use (alcohol, marijuana, opioids), mental health (suicide is among the top causes of adolescent death), sexual health (STI prevention and consent), and firearm safety (locked, unloaded, ammunition stored separately in homes with firearms)."
        },
        {
          "kind": "list",
          "items": [
            "Infants: SIDS prevention, aspiration risk, rear-facing car seat to age 2, crib and bath safety",
            "Toddlers: poisoning (lock meds/chemicals), stair gates, drowning (buckets/toilets), choking (cut food, no whole grapes/nuts under 4), burns, forward-facing harness",
            "Preschool/school age: bike helmets, water safety, stranger safety, booster until 4'9\" or age 12, back seat until age 13",
            "Adolescents: motor vehicle collisions are the LEADING cause of death; substance use; suicide risk; sexual health; firearm safety"
          ]
        },
        {
          "kind": "h",
          "text": "Lead poisoning"
        },
        {
          "kind": "p",
          "text": "Lead poisoning is the next focus. Pica is the most common mechanism - children eating non-food items, especially paint chips in older housing built before 1978. The risk factors are old housing, immigrant families from countries without lead regulation (directly relevant to IEN cohort patient populations), and low-income families. Symptoms include irritability, developmental regression, abdominal pain, microcytic anemia (recall Hour 6 anemia categorization), and neurologic symptoms including encephalopathy and seizures in severe cases. Screen with a blood lead level at 12 months and 24 months in high-risk children. For treatment, REMOVE FROM THE LEAD SOURCE FIRST - there is no point treating if the exposure continues - and then use chelation therapy for elevated levels: succimer (DMSA) orally, and dimercaprol (BAL) plus EDTA IV for severe encephalopathy."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Lead poisoning: remove the source first",
          "text": "Pica with paint chips in pre-1978 housing is the classic story; watch for irritability, developmental regression, abdominal pain, and microcytic anemia. Screen high-risk children at 12 and 24 months. Always REMOVE the child from the lead source before chelation (succimer oral; dimercaprol/BAL plus EDTA IV for severe encephalopathy) - chelation is pointless while exposure continues. This is more often encountered in US practice than in many home countries."
        },
        {
          "kind": "h",
          "text": "Cystic fibrosis - brief"
        },
        {
          "kind": "p",
          "text": "Finally, a brief on cystic fibrosis. It is autosomal recessive, with variable prevalence between populations. Diagnosis is by the sweat chloride test (greater than 60 milliequivalents per liter is diagnostic) and newborn screening with immunoreactive trypsinogen, and the classic finding is salty-tasting skin from sodium loss in sweat. CF affects multiple systems: pancreatic insufficiency causes steatorrhea and failure to thrive, treated with pancreatic enzyme replacement with every meal and snack; pulmonary disease brings chronic infection (Pseudomonas eventually) and bronchiectasis, treated with chest physiotherapy, mucolytics (dornase alfa, hypertonic saline), antibiotics, and newer CFTR modulator therapies (ivacaftor, lumacaftor/ivacaftor, and elexacaftor combinations) that have dramatically changed prognosis. CF also brings CF-related diabetes and infertility in most males. Nutritionally, the child needs a high-calorie, high-protein diet with fat-soluble vitamin supplementation - A, D, E, and K - because of malabsorption, plus pancreatic enzymes with all meals and snacks."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Cystic fibrosis at a glance",
          "text": "Autosomal recessive; sweat chloride >60 mEq/L is diagnostic; salty-tasting skin. Pancreatic insufficiency means enzyme replacement with every meal and snack plus fat-soluble vitamins (A, D, E, K) and a high-calorie, high-protein diet. Pulmonary care is chest physiotherapy, mucolytics, antibiotics, and CFTR modulators. Also expect CF-related diabetes and male infertility."
        }
      ]
    },
    {
      "id": "synthesis-case",
      "minutes": "54-58",
      "title": "Synthesis Case - Sickle Cell Crisis in a 4-Year-Old",
      "format": "Case",
      "blocks": [
        {
          "kind": "p",
          "text": "A 4-year-old child with sickle cell disease is admitted to the ED. The child appears lethargic with cool, mottled extremities and reports severe pain (9/10) in the right thigh and the abdomen. Findings: T 39.0°C, HR 162, RR 30, BP 92/58, SpO2 91%, capillary refill 4 seconds. The mother reports the child has been refusing fluids for 2 days and had a recent viral URI. The abdomen is distended with the spleen tip palpable 6 cm below the costal margin (baseline is non-palpable). Walk through your reasoning: identify what is happening, prioritize, and plan."
        },
        {
          "kind": "p",
          "text": "Multiple processes are occurring at once. First, SPLENIC SEQUESTRATION: the spleen is palpable 6 cm below the costal margin versus a non-palpable baseline, and the child is hypotensive for age, tachycardic, and lethargic with poor perfusion - this is hypovolemic shock from blood pooling in the spleen, which is life-threatening and can be fatal within hours. Second, a VASO-OCCLUSIVE crisis: the severe pain in the thigh and abdomen is consistent with sickling, and the dehydration from refusing fluids plus the recent URI are classic triggers. Third, possible INFECTION OR SEPSIS: the fever of 39.0, the recent URI, and the functional asplenia of a sickle cell child together create a high risk of bacterial sepsis from encapsulated organisms. Fourth, possible ACUTE CHEST SYNDROME or worsening respiratory status: the SpO2 of 91% and RR of 30 warrant a chest X-ray and continued monitoring."
        },
        {
          "kind": "p",
          "text": "Now prioritize the actions in sequence. One - IV FLUIDS immediately, a 20 mL/kg normal saline bolus, because the splenic sequestration is causing functional hypovolemia and fluids are the priority both for the dehydration triggering the crisis and for the shock from sequestration; establish two large-bore IVs. Two - TYPE AND CROSS for blood, because transfusion is anticipated for splenic sequestration, and notify the blood bank. Three - OXYGEN supplementation, given the SpO2 of 91%. Four - BROAD-SPECTRUM ANTIBIOTICS, because fever in a sickle cell patient is a sepsis emergency: draw blood cultures, then give ceftriaxone promptly. Five - PAIN MANAGEMENT with IV opioids such as morphine, dosed around the clock. Six - CONTINUOUS MONITORING: cardiac, respiratory, and oxygen saturation, with frequent vital signs, serial hemoglobin checks for sequestration progression, and a chest X-ray to evaluate for acute chest syndrome. Seven - NOTIFY hematology and the pediatric ICU, because this child needs ICU-level care."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "The reasoning thread of the case",
          "text": "Recognize that several sickle cell emergencies are overlapping - splenic sequestration (spleen 6 cm down, shock), a vaso-occlusive crisis (dehydration and URI as triggers), possible sepsis (fever in a functionally asplenic child), and possible acute chest syndrome (SpO2 91%). Act in the priority order: fluids first (20 mL/kg NS), type and cross, oxygen, antibiotics after cultures, then pain control, then continuous monitoring, then escalate to hematology and PICU. This synthesizes Hour 2 (priority frameworks - ABC plus disease priorities), Hour 5 (pediatric pain management), Hour 6 (anemia, fluid resuscitation), and Hour 13 (the sickle cell priority sequence and the late-hypotension rule). Sickle cell children in crisis realistically present with multiple simultaneous problems."
        }
      ]
    },
    {
      "id": "close-homework",
      "minutes": "58-60",
      "title": "Close & Homework",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Homework before Hour 14: fifty pediatric questions, with deliberate emphasis on the milestone red flags, dehydration recognition with the late-hypotension rule, croup versus epiglottitis differentiation including the 'no throat exam' rule, and the sickle cell crisis priority sequence. As always, for every wrong answer, note in your journal exactly which pattern tripped you up."
        },
        {
          "kind": "p",
          "text": "Hour 14 is mental health and therapeutic communication, and it is potentially the biggest cultural-translation hour of the bootcamp. American therapeutic communication norms differ significantly from communication styles in the Philippines, the UK, and across African nursing cultures - direct emotional expression versus restraint, patient-centered phrasing, and the specific NCLEX 'therapeutic response' question format. We will also cover suicide risk assessment, abuse screening, and the major psychiatric medications. Get ready for it. See you Hour 14."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "The four patterns to drill before Hour 14",
          "text": "Milestone red flags (no walking by 18 months, no words by 18 months, no phrases by 24 months, regression at any age); dehydration with the late-hypotension rule; croup versus epiglottitis with the 'no throat exam' rule; and the sickle cell hydration-first priority sequence. These four have the cleanest right/wrong distinctions on the exam."
        }
      ]
    }
  ]
};
