import type { Lesson } from "./lessonTypes";

/**
 * Section 15 - Infection Control. Auto-generated from the Florence Academy
 * bootcamp instructor script (expanded draft). Pending nurse-educator review.
 */
export const lesson: Lesson = {
  "meta": {
    "number": 15,
    "title": "Infection Control",
    "durationMin": 60,
    "audience": "Internationally educated nurses - Philippines, UK, Kenya, Ghana",
    "contentWeight": "The bootcamp's most memorization-heavy hour - high-yield safety-and-infection-control specifics with clean, testable right/wrong patterns",
    "tagline": "The hour of pure-memorization gimmes: get the PPE order, the C. diff rule, the airborne-plus-contact diseases, and the never-IV-push-KCl rule right, and they become easy NCLEX points."
  },
  "objectives": [
    "Apply standard precautions and identify when transmission-based precautions (contact, droplet, airborne) are layered on top.",
    "Match common organisms and conditions to the correct precaution type, including the airborne-plus-contact combinations for varicella and disseminated zoster.",
    "Demonstrate the correct PPE donning and doffing sequence and explain the order rationale - most contaminated removed first.",
    "Apply the C. difficile hand hygiene exception - soap and water, not alcohol - along with the WHO 5 moments and other hand hygiene principles.",
    "Distinguish negative pressure rooms for airborne precautions from protective-environment (positive pressure) rooms for immunocompromised patients.",
    "Apply fall prevention strategies including risk assessment, environmental modifications, and the post-fall response sequence.",
    "Apply restraint requirements including alternatives-first, provider order specifications, age-based time limits, monitoring frequency, and quick-release knots tied to the bed frame.",
    "Apply the medication administration rights, the three medication checks, and high-alert medication safeguards including the never-IV-push-KCl rule.",
    "Recognize never events and apply incident reporting principles including the rule never to document the incident report in the chart."
  ],
  "timing": [
    {
      "minutes": "0-3",
      "segment": "Recap & frame",
      "format": "Lecture"
    },
    {
      "minutes": "3-13",
      "segment": "Standard & transmission-based precautions overview",
      "format": "Lecture"
    },
    {
      "minutes": "13-21",
      "segment": "PPE donning/doffing & isolation room types",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "21-28",
      "segment": "Specific organisms by precaution type",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "28-35",
      "segment": "Falls - assessment, prevention, post-fall",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "35-43",
      "segment": "Restraints - requirements, monitoring, documentation",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "43-50",
      "segment": "Medication safety - rights, checks, high-alert meds",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "50-54",
      "segment": "Never events & incident reporting",
      "format": "Lecture"
    },
    {
      "minutes": "54-58",
      "segment": "Synthesis case",
      "format": "Practice item"
    },
    {
      "minutes": "58-60",
      "segment": "Close & homework",
      "format": "Lecture"
    }
  ],
  "practiceItems": {
    "pi_ppe_doffing_sequence": {
      "id": "pi_ppe_doffing_sequence",
      "stem": "A nurse is preparing to leave the room of a patient on contact and droplet precautions. The nurse is wearing gown, gloves, mask, and goggles. Which sequence of PPE removal is correct?",
      "options": [
        {
          "key": "A",
          "text": "Mask, goggles, gown, gloves, hand hygiene."
        },
        {
          "key": "B",
          "text": "Gloves, goggles, gown, mask, hand hygiene."
        },
        {
          "key": "C",
          "text": "Gown, gloves, mask, goggles, hand hygiene."
        },
        {
          "key": "D",
          "text": "Hand hygiene, gloves, mask, goggles, gown."
        }
      ],
      "answer": "B",
      "rationale": "B is correct: gloves first because they are the most contaminated, then goggles, then gown, then mask last because it is least contaminated near the face, and finally hand hygiene. A reverses the principle entirely. C removes the gown before the gloves, which contaminates the process. D puts hand hygiene first, which is the DONNING starting step, not doffing. B is the only sequence that applies the doffing principle - most contaminated off first.",
      "cjmm": "take-actions",
      "reference": "Section 15 · PPE donning/doffing & isolation room types"
    },
    "pi_chickenpox_precautions": {
      "id": "pi_chickenpox_precautions",
      "stem": "A nurse is admitting a 6-year-old client with chickenpox to the pediatric unit. Which type of isolation precautions should the nurse implement?",
      "options": [
        {
          "key": "A",
          "text": "Contact precautions only."
        },
        {
          "key": "B",
          "text": "Droplet precautions only."
        },
        {
          "key": "C",
          "text": "Airborne precautions only."
        },
        {
          "key": "D",
          "text": "Airborne plus contact precautions."
        }
      ],
      "answer": "D",
      "rationale": "D is correct: varicella (chickenpox) is the classic example of airborne PLUS contact precautions. The lesions spread by contact and the disease also spreads by the airborne route, so the patient needs a negative pressure room, an N95 respirator, and gown and gloves. Contact-only, droplet-only, and airborne-only each capture just one half of the transmission picture. Disseminated zoster in an immunocompromised or extensive case follows the same combined precautions.",
      "cjmm": "generate-solutions",
      "reference": "Section 15 · Specific organisms by precaution type"
    },
    "pi_anticoagulated_fall_head": {
      "id": "pi_anticoagulated_fall_head",
      "stem": "A 78-year-old client on apixaban for atrial fibrillation has an unwitnessed fall in the bathroom. The client is found alert and oriented, denying head injury, but with a small abrasion on the forehead. Vital signs are stable. Which is the FIRST priority action?",
      "options": [
        {
          "key": "A",
          "text": "Help the client back to bed and document the fall."
        },
        {
          "key": "B",
          "text": "Notify the provider and prepare for CT head imaging."
        },
        {
          "key": "C",
          "text": "Apply an ice pack to the forehead abrasion."
        },
        {
          "key": "D",
          "text": "Reassess vital signs in 4 hours."
        }
      ],
      "answer": "B",
      "rationale": "B is correct: the patient is on an anticoagulant (apixaban) and has a head injury, even if it looks minor. Anticoagulated patients with any head impact warrant urgent imaging to rule out an intracranial hemorrhage, which may not be symptomatic initially. The combination of anticoagulation plus head impact is the test pattern. A delays needed care, C addresses the wound but misses the bleed risk, and D undermonitors a high-risk patient. B is the priority.",
      "cjmm": "prioritize-hypotheses",
      "reference": "Section 15 · Falls - assessment, prevention, post-fall"
    },
    "pi_delirium_restraint_alternatives": {
      "id": "pi_delirium_restraint_alternatives",
      "stem": "An 82-year-old client with delirium is pulling at the IV line and attempting to climb out of bed. The client has already been moved closer to the nursing station and has a bed alarm in place. The family is unavailable. Which is the nurse's next best action?",
      "options": [
        {
          "key": "A",
          "text": "Apply soft wrist restraints immediately as a safety measure."
        },
        {
          "key": "B",
          "text": "Administer haloperidol as a chemical restraint without order."
        },
        {
          "key": "C",
          "text": "Assess for treatable causes of delirium (pain, hypoxia, urinary retention) and continue less restrictive interventions while monitoring closely."
        },
        {
          "key": "D",
          "text": "Apply a vest restraint and obtain a provider order within 1 hour."
        }
      ],
      "answer": "C",
      "rationale": "C is correct: less restrictive alternatives must be exhausted before physical restraints are applied. The nurse should assess for treatable causes of delirium - uncontrolled pain, hypoxia, urinary retention, infection, medication side effects - and continue close monitoring with the alternatives already in place (bed alarm, location near the nursing station). A applies restraints prematurely. B is illegal without an order. D is acceptable in a true emergency but only once alternatives have been tried and the risk is imminent. C is the best initial action when alternatives have not been fully explored - the test pattern is alternatives FIRST, restraints LAST RESORT.",
      "cjmm": "generate-solutions",
      "reference": "Section 15 · Restraints - requirements, monitoring, documentation"
    },
    "pi_kcl_administration": {
      "id": "pi_kcl_administration",
      "stem": "A nurse is preparing to administer KCl 40 mEq to a patient with serum potassium 2.8 mEq/L. Which method of administration is correct?",
      "options": [
        {
          "key": "A",
          "text": "IV push over 1 minute."
        },
        {
          "key": "B",
          "text": "IV push over 5 minutes through a central line."
        },
        {
          "key": "C",
          "text": "Diluted in 1 liter of normal saline, infused via pump over 4 hours."
        },
        {
          "key": "D",
          "text": "Rapid IV bolus through a peripheral line."
        }
      ],
      "answer": "C",
      "rationale": "C is correct: KCl is NEVER given IV push under any circumstance - the rule is absolute, and IV push KCl is fatal. The correct administration is diluted in IV fluid (typically 1 L of NS or D5W) and infused by continuous pump at a rate not exceeding 10 to 20 mEq per hour through a peripheral line, or up to 40 mEq/hour through a central line in severe hypokalemia with cardiac monitoring. Choices A, B, and D all involve IV push or rapid bolus and are fatal - and B is still IV push even through a central line.",
      "cjmm": "take-actions",
      "reference": "Section 15 · Medication safety - rights, checks, high-alert meds"
    }
  },
  "segments": [
    {
      "id": "recap-and-frame",
      "minutes": "0-3",
      "title": "Frame the hour",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Welcome to Hour 15: infection control and safety. This hour is dense with concrete, testable specifics, and a large share of them are pure-memorization items - the PPE order, the C. diff hand hygiene exception, the airborne-plus-contact diseases, the never-IV-push-KCl rule. Get them right and these are easy NCLEX points. Get them wrong and they are easy NCLEX losses. The teaching frame for the whole hour is simple: these are quick wins that pay disproportionate dividends if you memorize them cleanly."
        },
        {
          "kind": "p",
          "text": "We are leaning on several callbacks today. Tuberculosis airborne precautions come from Hour 8. MRSA contact precautions tie back to the Hour 8 vancomycin context. Pediatric RSV comes from Hour 13. The restraint material that Hour 14 previewed is now covered in full detail. And anticoagulation and fall risk reach back to Hour 3."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "IEN cohort note",
          "text": "US infection control protocols are well-defined and similar to UK norms, but they differ somewhat from clinical practice in the Philippines, Kenya, and Ghana - not in concept, but in protocol specificity and documentation requirements. The restraint rules and the medication-rights framework are the biggest US-specific protocol gaps for many learners, so we will drill them."
        }
      ]
    },
    {
      "id": "precautions-overview",
      "minutes": "3-13",
      "title": "Standard & transmission-based precautions overview",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "h",
          "text": "Standard precautions - the baseline for every patient"
        },
        {
          "kind": "p",
          "text": "Standard precautions are applied to every patient regardless of diagnosis - they are the baseline that is always in effect. Perform hand hygiene before and after every patient contact. Wear gloves whenever there is contact with body fluids, mucous membranes, or non-intact skin. Add a gown when there is a risk of soiling your clothes, and a mask, goggles, or face shield when splash or spray is anticipated. Use safe injection practices - single-use needles and syringes, single-dose vials when possible - and practice respiratory hygiene by covering coughs, disposing of tissues, and performing hand hygiene afterward. Handle contaminated equipment and linen safely."
        },
        {
          "kind": "p",
          "text": "Hand hygiene is structured by the WHO 5 moments framework, and it is worth knowing each one. Perform hand hygiene before patient contact; before an aseptic procedure (any procedure where clean technique matters - IV insertion, dressing change, urinary catheter insertion); after a body fluid exposure risk; after patient contact; and after contact with the patient's surroundings, even if you did not directly touch the patient."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "C. diff equals soap and water",
          "text": "Alcohol-based hand sanitizer is fine for routine hand hygiene EXCEPT in two situations. One - when hands are visibly soiled, use soap and water. Two - for C. difficile or norovirus patients, use soap and water, because alcohol does NOT kill spores. This is a heavily tested specific. Memorize it: C. diff equals soap and water."
        },
        {
          "kind": "h",
          "text": "Contact precautions"
        },
        {
          "kind": "p",
          "text": "Transmission-based precautions are layered on top of standard precautions, never instead of them. Contact precautions are added when organisms spread by direct or indirect contact - touching the patient or touching contaminated surfaces. The pathogens that drive contact precautions include MRSA (methicillin-resistant Staphylococcus aureus), VRE (vancomycin-resistant Enterococcus), C. difficile, RSV in many institutions, scabies, lice, impetigo, extensive herpes simplex lesions, multidrug-resistant Gram-negative bacteria, and open wounds with significant drainage. In incontinent patients, add rotavirus, shigella, salmonella, E. coli O157:H7, and hepatitis A."
        },
        {
          "kind": "p",
          "text": "The specifications for contact precautions are concrete: gown and gloves on entry, a private room or cohorting with a patient who has the same organism, and dedicated equipment when possible - the stethoscope and the blood pressure cuff stay with the patient. Hand hygiene before and after, as always."
        },
        {
          "kind": "h",
          "text": "Droplet precautions"
        },
        {
          "kind": "p",
          "text": "Droplet precautions are added when pathogens spread by large respiratory droplets - greater than 5 micrometers - that travel short distances, roughly 3 to 6 feet. Examples include influenza, pertussis (whooping cough), mumps, Neisseria meningitidis (recall Hour 11 - droplet precautions until 24 hours of effective antibiotic therapy), group A streptococcus pharyngitis (until 24 hours of antibiotics), rubella, diphtheria, Haemophilus influenzae meningitis or epiglottitis (recall Hour 13), parvovirus B19, and mycoplasma pneumonia."
        },
        {
          "kind": "p",
          "text": "For droplet precautions, wear a surgical mask when within 3 to 6 feet of the patient, use a private room or cohort, and have the patient wear a surgical mask during transport outside the room."
        },
        {
          "kind": "h",
          "text": "Airborne precautions"
        },
        {
          "kind": "p",
          "text": "Airborne precautions are added when pathogens spread by small airborne droplet nuclei - less than 5 micrometers - that remain suspended in the air and travel longer distances on air currents. The list is short and worth memorizing: tuberculosis (recall Hour 8), measles (rubeola), varicella (chickenpox), disseminated herpes zoster (shingles), SARS, MERS, and COVID-19 in many institutions, especially during aerosol-generating procedures."
        },
        {
          "kind": "p",
          "text": "Airborne precautions require an N95 respirator that has been fit-tested, or a PAPR (powered air-purifying respirator); a negative pressure room with single occupancy; the door kept closed at all times; and a surgical mask on the patient during transport outside the room."
        },
        {
          "kind": "h",
          "text": "Combined precautions"
        },
        {
          "kind": "p",
          "text": "Some diseases require multiple precautions simultaneously. Varicella (chickenpox) is airborne PLUS contact - the lesions spread by contact and the disease also spreads by the airborne route. Disseminated zoster (shingles that is extensive or in an immunocompromised patient) is also airborne PLUS contact; localized zoster in an otherwise healthy person is often contact-only if the lesions can be covered. SARS, MERS, and COVID are often airborne plus contact plus droplet depending on institutional policy and current guidance, since the picture has evolved over time. Smallpox, of historical relevance, is airborne plus contact."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Memorize the combinations",
          "text": "Varicella and disseminated zoster are AIRBORNE plus CONTACT. This is a classic NCLEX item, and the trap is selecting airborne-only because you think of these as respiratory. The contact half - the lesions are infectious - is the second piece you must remember."
        }
      ]
    },
    {
      "id": "ppe-and-room-types",
      "minutes": "13-21",
      "title": "PPE donning/doffing & isolation room types",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "h",
          "text": "PPE donning - putting it on"
        },
        {
          "kind": "p",
          "text": "The PPE donning sequence is one of the highest-yield single facts in the entire bootcamp, so memorize the order. Step one is hand hygiene first - always start clean. Step two is the gown: tie it at the neck and waist and fully cover the torso and arms. Step three is the mask or respirator: secure the ties or elastic loops at the back of the head, and for an N95 perform a seal check by exhaling and inhaling and feeling for leaks at the edges, adjusting if there is leakage."
        },
        {
          "kind": "p",
          "text": "Step four is goggles or a face shield, positioned over the face and eyes. Step five is gloves last - pull the glove cuffs over the gown cuffs so no skin is exposed."
        },
        {
          "kind": "h",
          "text": "PPE doffing - taking it off"
        },
        {
          "kind": "p",
          "text": "Doffing is even more critical, and it is heavily tested. The governing principle is to remove the most contaminated items first, so that as you continue removing PPE you do not contaminate yourself. Step one is gloves first - they are the most contaminated PPE because they touched the patient and surfaces directly. Use the glove-in-glove or beak technique: peel one glove off, hold it in the other gloved hand, then slide a finger under the cuff of the remaining glove and peel it off over the first glove. Dispose of gloves as biohazardous waste."
        },
        {
          "kind": "p",
          "text": "Step two is goggles or face shield, removed by the headband or earpieces while avoiding the front, which may be contaminated from splash. Step three is the gown: untie or unfasten it, pull it away from the body while rolling the outside in (the exterior is contaminated), and dispose of it. Step four is the mask or respirator last - it is considered the least contaminated item near the wearer's face; remove it by the ties or elastic loops without touching the front, which may have caught airborne pathogens, and dispose of it. Step five is hand hygiene immediately after removing all PPE."
        },
        {
          "kind": "p",
          "text": "Why this order? Gloves came into the most direct contact, so they come off first. The mask was near your face, so it comes off last to keep your face protected during removal of the more contaminated items. In real terms, if you take off your gown first while still wearing gloves, you contaminate the gown removal."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "CDC variant orders",
          "text": "The CDC has updated some sequences over time, including a variant order: gloves, goggles, gown, mask. For NCLEX purposes, gloves first and mask last is the reliable framework - the principle (most contaminated off first) matters more than the exact intermediate order."
        },
        {
          "kind": "h",
          "text": "Isolation room types - three to know"
        },
        {
          "kind": "p",
          "text": "A standard private room is used for most transmission-based precautions when single occupancy can be maintained; it has no special airflow. A negative pressure room is required for airborne precautions: the air pressure inside the room is LOWER than the hallway, so air flows IN from the hallway to the room, and the exhaust either vents to the outside or passes through HEPA filtration. This prevents airborne pathogens from the patient from escaping into the hospital corridor, and the door must remain closed to maintain the pressure differential. Negative pressure rooms are used for TB, measles, varicella, and suspected airborne infectious diseases."
        },
        {
          "kind": "p",
          "text": "A protective environment room uses positive pressure and is the opposite design. It is used for severely immunocompromised patients, such as bone marrow or stem cell transplant recipients and those with severe neutropenia. The air pressure inside the room is HIGHER than the hallway, so air flows OUT from the room to the hallway, and incoming air is HEPA-filtered. Here the patient is the one being protected from environmental pathogens; the staff is not the focus."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Pressure memory aid",
          "text": "NEGATIVE pressure protects the OUTSIDE world from the PATIENT - the TB patient stays in. POSITIVE pressure protects the PATIENT from the OUTSIDE world - the immunocompromised patient stays clean."
        }
      ],
      "practiceItemId": "pi_ppe_doffing_sequence"
    },
    {
      "id": "organisms-by-precaution",
      "minutes": "21-28",
      "title": "Specific organisms by precaution type",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Memorize which organism gets which precaution. The NCLEX will give you a patient diagnosis and ask which precautions apply - this is pure pattern recognition, and these lists reward flashcard drilling. Below are the three core lists plus the must-know combination."
        },
        {
          "kind": "h",
          "text": "Contact precaution organisms"
        },
        {
          "kind": "list",
          "items": [
            "MRSA",
            "VRE",
            "C. difficile",
            "RSV (in many institutions)",
            "Scabies",
            "Lice",
            "Impetigo",
            "Herpes simplex, extensive",
            "Multidrug-resistant Gram-negative bacteria",
            "Shigella",
            "Salmonella",
            "E. coli O157:H7",
            "Hepatitis A in incontinent patients",
            "Rotavirus in incontinent patients",
            "Open wounds with significant drainage"
          ]
        },
        {
          "kind": "h",
          "text": "Droplet precaution organisms"
        },
        {
          "kind": "list",
          "items": [
            "Influenza",
            "Pertussis",
            "Mumps",
            "Neisseria meningitidis (until 24 hours of antibiotic therapy)",
            "Group A streptococcus pharyngitis (until 24 hours of antibiotics)",
            "Rubella",
            "Diphtheria",
            "Haemophilus influenzae meningitis or epiglottitis",
            "Parvovirus B19",
            "Mycoplasma pneumonia"
          ]
        },
        {
          "kind": "h",
          "text": "Airborne precaution organisms"
        },
        {
          "kind": "list",
          "items": [
            "Tuberculosis (recall Hour 8)",
            "Measles",
            "Varicella",
            "Disseminated zoster",
            "SARS",
            "MERS",
            "COVID-19 in many institutions"
          ]
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Airborne PLUS contact",
          "text": "Varicella and disseminated zoster require airborne PLUS contact precautions - both the lesions and the respiratory route. Memorize this combination; it is a classic NCLEX item."
        },
        {
          "kind": "p",
          "text": "Localized zoster in an immunocompetent patient is often handled with contact precautions only if the lesions can be covered - the full airborne-plus-contact combination is reserved for varicella and for disseminated zoster."
        },
        {
          "kind": "h",
          "text": "Special notes worth memorizing"
        },
        {
          "kind": "p",
          "text": "Neisseria meningitidis calls for droplet precautions until 24 hours of effective antibiotic therapy (recall Hour 11). Close contacts may need post-exposure prophylaxis with rifampin or ciprofloxacin (recall Hours 4 and 8)."
        },
        {
          "kind": "p",
          "text": "C. difficile calls for contact precautions with soap and water hand hygiene, because alcohol does not kill the spores. Environmental cleaning must use bleach or another sporicidal agent - alcohol-based wipes do not kill spores either. Use dedicated equipment, and discontinue precautions per institutional protocol, typically after 48 hours without diarrhea."
        },
        {
          "kind": "p",
          "text": "Tuberculosis requires airborne precautions, a negative pressure room, and an N95 respirator. Recall the Hour 8 IEN considerations: BCG vaccination, PPD interpretation with the 10 mm cutoff for healthcare workers, the IGRA preference for BCG-vaccinated learners, and the RIPE regimen with B6 alongside isoniazid."
        },
        {
          "kind": "p",
          "text": "VRE and MRSA both require contact precautions, with hand hygiene by alcohol or soap (no spore concern) and dedicated equipment. VRE survives on environmental surfaces for extended periods, so environmental cleaning is critical."
        }
      ],
      "practiceItemId": "pi_chickenpox_precautions"
    },
    {
      "id": "falls",
      "minutes": "28-35",
      "title": "Falls - assessment, prevention, post-fall",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Falls are the leading cause of preventable injury in hospitalized patients, and hospital-acquired falls with injury are a CMS never event, which we will return to later this hour. That financial and quality framing is part of why fall prevention is taken so seriously."
        },
        {
          "kind": "h",
          "text": "Fall risk assessment"
        },
        {
          "kind": "p",
          "text": "The Morse Fall Scale is one common assessment tool. It scores six factors: history of falling, secondary diagnosis, ambulatory aid, IV or heparin lock, gait quality, and mental status awareness. The scores stratify patients into low, moderate, and high risk. Other tools include the Hendrich II and STRATIFY, and institutional policy determines which tool is used."
        },
        {
          "kind": "p",
          "text": "Common fall risk factors include age 65 and older; a history of previous falls, which is the single strongest predictor; cognitive impairment such as delirium or dementia; mobility impairment from recent surgery or neurologic deficits; polypharmacy, especially benzodiazepines (recall Hour 14), opioids (Hour 5), and antihypertensives causing orthostatic hypotension; sensory impairment of vision or hearing; urinary urgency, because toileting falls are very common when patients try to make it to the bathroom alone; recent surgery; and postural hypotension."
        },
        {
          "kind": "h",
          "text": "High-risk fall interventions"
        },
        {
          "kind": "p",
          "text": "For high-risk patients, use a yellow band or yellow sock identification as a visual cue to staff that the patient is high risk, and place a bed alarm that alerts staff if the patient attempts to get out of bed unassisted. Build in frequent, purposeful rounding using the hourly rounding four P's - Pain (assess and manage), Position (offer position changes), Potty (offer toileting), and Possessions (place the call light and personal items within reach). Many fall reductions come directly from these purposeful hourly rounds."
        },
        {
          "kind": "p",
          "text": "Round out the environment: keep the bed in the LOW position with the wheels LOCKED, the call light within reach, non-skid footwear on the patient, and adequate lighting with night lights for nighttime ambulation. Keep pathways clear of clutter, cords, and equipment between the bed and bathroom, assist with ambulation, and do toileting rounds before bedtime and on awakening."
        },
        {
          "kind": "h",
          "text": "Post-fall assessment"
        },
        {
          "kind": "p",
          "text": "After a fall, follow a deliberate sequence. Take vital signs immediately, then perform a head-to-toe assessment. Do a neurologic check - particularly important if a head impact occurred, if the patient is on anticoagulation (recall Hour 3 - warfarin or DOAC patients warrant a CT for even minor head impact), or if mental status changed. If a fracture is suspected, assess for limb shortening, rotation, and deformity, especially at the hip, and check for hematoma anywhere on the body. Use the Glasgow Coma Scale if mental status is altered. Critically, maintain the patient in place until cleared if injury is suspected - do not move them - and then notify the provider."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Anticoagulation plus head impact",
          "text": "Anticoagulated patients with any head impact, even minor, warrant urgent CT to rule out intracranial hemorrhage, which may not be symptomatic initially. The combination of anticoagulation plus head impact is the test pattern - do not be reassured by a normal-appearing patient."
        },
        {
          "kind": "h",
          "text": "Post-fall documentation"
        },
        {
          "kind": "p",
          "text": "Document objective findings; the mechanism if known (witnessed versus unwitnessed); patient statements verbatim if relevant; the time; the action taken; and provider and family notification. Document the fall itself as an event in the medical record - and complete the incident report SEPARATELY, a rule we cover in detail shortly."
        }
      ],
      "practiceItemId": "pi_anticoagulated_fall_head"
    },
    {
      "id": "restraints",
      "minutes": "35-43",
      "title": "Restraints - requirements, monitoring, documentation",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Restraints are the detailed version of what Hour 14 previewed, and they are heavily tested. There are two types. Physical restraints include a vest, wrist or ankle restraints, mitts, a lap belt, side rails when all four are raised, and a geri-chair with a locked tray. Chemical restraints are medications used to control behavior or restrict freedom of movement, rather than as standard treatment for a medical condition. The distinction matters legally."
        },
        {
          "kind": "h",
          "text": "Indications"
        },
        {
          "kind": "p",
          "text": "Behavioral restraints are indicated when a patient is at imminent risk of harm to self or others. Medical restraints are indicated to prevent the patient from removing life-sustaining therapy - the intubated patient pulling at the endotracheal tube, or the post-op patient repeatedly pulling at IV lines or surgical drains."
        },
        {
          "kind": "h",
          "text": "Less restrictive alternatives first"
        },
        {
          "kind": "p",
          "text": "Less restrictive alternatives must be tried first, and these appear as best-initial-intervention options on the NCLEX, so memorize them. They include frequent reorientation; diversional activities such as TV, music, or family photos; family presence, since a calm family member at the bedside often eliminates the need for restraints; a bed alarm; and moving the patient closer to the nursing station for closer observation. Provide eyeglasses and hearing aids, because sensory deprivation increases agitation, particularly in elderly patients. Treat the underlying cause - uncontrolled pain, urinary retention, hypoxia (check the pulse ox), infection (check the temperature), or a medication side effect (review the meds). Address basic needs such as toileting, hydration, hunger, and comfort, sit with the patient when presence itself is the intervention, and use de-escalation techniques from Hour 14."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Alternatives first, restraints last resort",
          "text": "The NCLEX rewards systematically exploring treatable causes (pain, hypoxia, urinary retention, infection, medication side effect) before applying restraints. Many learners default to restraints when a patient is agitated; the test pattern is alternatives FIRST, restraints LAST RESORT."
        },
        {
          "kind": "h",
          "text": "Provider order and time limits"
        },
        {
          "kind": "p",
          "text": "A provider order is required for restraints, and it cannot be PRN - the order is for a specific episode, not a standing order to use as needed. The order must specify the TYPE of restraint, the DURATION, and the REASON; there is no blanket 'restrain as needed.' In an emergency, if a nurse must apply restraints urgently for immediate safety, a provider order must be obtained - verbally or in writing - within ONE HOUR for behavioral restraints per the CMS standard, and the provider must perform an in-person evaluation within specific timeframes, typically within 1 hour for behavioral restraints in adults."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Behavioral restraint time limits by age",
          "text": "Adults 18 and older - 4 HOURS maximum per order. Children 9 to 17 - 2 HOURS maximum. Children under 9 - 1 HOUR maximum. After expiration, a new in-person evaluation and a new order are required. Medical restraints (preventing self-removal of life-sustaining therapy) have longer order durations, typically 24 hours, but still require ongoing reassessment."
        },
        {
          "kind": "h",
          "text": "Monitoring and tying"
        },
        {
          "kind": "p",
          "text": "Monitoring is continuous or every 15 minutes depending on the indication and institutional policy. Check vital signs; check circulation in the restrained extremities (color, capillary refill, pulses); check range of motion of the restrained extremities, skin integrity at the restraint site, hydration, and toileting needs. Release each restrained limb at least every 2 hours for range-of-motion exercises. The pattern is continuous reassessment with planned release."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Never tie to the side rail",
          "text": "Use quick-release knots, and NEVER tie a restraint to the side rail - if the patient becomes entangled or the rail is lowered, injury occurs. Tie restraints to the BED FRAME, where they remain accessible and secure regardless of side rail position."
        },
        {
          "kind": "h",
          "text": "Reassessment, documentation, and education"
        },
        {
          "kind": "p",
          "text": "Continuously reassess for the ability to release, use the least restrictive restraint that meets the safety need, and release as soon as it is safe to do so. Document the rationale for continuing restraints at each reassessment - if you cannot articulate why they are still needed, they probably should be released."
        },
        {
          "kind": "p",
          "text": "Documentation includes the indication (why restraints are needed), the type of restraint, the less restrictive alternatives attempted, the time applied, the monitoring findings (vital signs, circulation, range of motion, skin), the patient response, release attempts and outcomes, and any reapplication with rationale. For patient and family education, explain the reason for restraints and the plan for removal, clarify that family can visit but cannot remove restraints, and document family questions and concerns."
        }
      ],
      "practiceItemId": "pi_delirium_restraint_alternatives"
    },
    {
      "id": "medication-safety",
      "minutes": "43-50",
      "title": "Medication safety - rights, checks, high-alert meds",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "h",
          "text": "The medication administration rights"
        },
        {
          "kind": "p",
          "text": "The traditional six rights of medication administration have expanded, and you should memorize all ten. Right one is the right patient - two patient identifiers are required, such as name plus date of birth, or name plus medical record number. Never use the room number alone, because patients move and rooms do not identify patients. Right two is the right medication - compare the medication against the order and watch for look-alike, sound-alike drugs such as hydralazine versus hydroxyzine, Celebrex versus Celexa, or Lasix versus losartan; tall-man lettering helps. Right three is the right dose - calculate it, and double-check high-alert medications with another nurse as an independent double-check."
        },
        {
          "kind": "p",
          "text": "Right four is the right route - PO, IV, IM, SC, topical, sublingual, rectal, and so on; wrong-route errors include giving an IM medication IV, which can be fatal for certain drugs. Right five is the right time - within 30 minutes before or after the scheduled time is generally acceptable for most medications, but check institutional policy, and remember that some medications are time-critical (antibiotics, insulin, antiepileptics) with narrower windows. Right six is the right documentation - record AFTER administration, not before, because the patient might refuse, you might be interrupted, or the patient might vomit immediately after; document the actual event, not the anticipated one."
        },
        {
          "kind": "p",
          "text": "Right seven is the right reason or indication - verify the medication matches the patient's condition; the metoprolol ordered for hypertension only fits if the patient actually has hypertension and is not hypotensive today. Right eight is the right response - assess for therapeutic effect and adverse effects, such as whether the BP came down, whether a rash developed, or pulse oximetry after opioid administration (recall Hour 5). Right nine is the right to refuse - a competent patient may refuse any medication; document the refusal and the reason if known, educate the patient on the implications, and notify the provider. Right ten is the right education - the patient should know what they are taking, why, and what to watch for."
        },
        {
          "kind": "h",
          "text": "The three checks"
        },
        {
          "kind": "p",
          "text": "There are three checks of the medication, and each check verifies medication, dose, route, time, and patient. Check one is when obtaining the medication from storage (the Pyxis, Omnicell, or drawer). Check two is when preparing the medication (drawing it up or opening packaging). Check three is at the bedside, immediately before administration."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "The bedside check is the most important",
          "text": "The third check at the bedside is the most important - this is where patient identifier verification happens, using both identifiers, immediately before the medication is given."
        },
        {
          "kind": "h",
          "text": "High-alert medications"
        },
        {
          "kind": "p",
          "text": "High-alert medications require special precautions because errors with them are particularly dangerous, so memorize the categories: insulin (recall Hour 4 - independent double-check for dose), heparin (Hour 3 - bolus and infusion verification), opioids (Hour 5), concentrated electrolytes (KCl, hypertonic saline, concentrated magnesium), chemotherapy, neuromuscular blockers (used in the OR and ICU), anticoagulants, and sedatives. In general nursing, insulin and heparin are the most commonly encountered high-alert medications."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Never IV push potassium chloride",
          "text": "NEVER give KCl IV push. KCl is ALWAYS diluted in IV fluid and administered by continuous infusion with a pump - never as a bolus, never IV push. IV push KCl is fatal: it causes cardiac arrest from sudden hyperkalemia. The rule is absolute, and there are no exceptions - not even through a central line."
        },
        {
          "kind": "p",
          "text": "Concentrated electrolytes are typically not stored on regular patient care units. They must be diluted in pharmacy or by following strict dilution protocols, and some institutions remove concentrated KCl entirely from patient care areas. The independent double-check means two nurses independently calculate and verify before administration - each nurse calculates independently rather than confirming the other's work. If you simply nod at what the other nurse calculated, that is not an independent check; that is shared error."
        }
      ],
      "practiceItemId": "pi_kcl_administration"
    },
    {
      "id": "never-events-and-reporting",
      "minutes": "50-54",
      "title": "Never events & incident reporting",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "h",
          "text": "Never events"
        },
        {
          "kind": "p",
          "text": "Never events are serious, largely preventable adverse events that should never occur. CMS does not reimburse for the additional care required to address never events that occur during hospitalization, and beyond CMS, never events are quality and legal red flags. The list is referenced and updated periodically."
        },
        {
          "kind": "list",
          "items": [
            "Wrong-site surgery",
            "Wrong-patient surgery or procedure",
            "Foreign object retained after surgery (instrument, sponge, swab)",
            "Air embolism",
            "Blood incompatibility error",
            "Stage III or IV pressure injury developed in hospital",
            "Fall with serious injury in hospital",
            "Patient death from a medication error",
            "Hospital-acquired infections - CAUTI (catheter-associated UTI), CLABSI (central line-associated bloodstream infection), and SSI (surgical site infection) for certain procedures",
            "Patient suicide in inpatient",
            "Sexual assault on a patient",
            "Patient elopement resulting in death or serious injury"
          ]
        },
        {
          "kind": "p",
          "text": "Sentinel events are the Joint Commission term: unanticipated events involving death or serious physical or psychological injury, or the risk thereof. Sentinel events require a root cause analysis (RCA) and corrective action plans, and many never events are also sentinel events."
        },
        {
          "kind": "h",
          "text": "Incident reports"
        },
        {
          "kind": "p",
          "text": "Incident reports - also called variance reports, occurrence reports, or event reports - are internal quality improvement documents. They are completed for any deviation from the expected outcome: medication errors, falls, equipment failures, near-misses, and breaks in protocol."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Never document the incident report in the chart",
          "text": "Incident reports are NOT part of the medical record; they are internal documents for quality improvement and risk management. Document the facts of the event in the patient's chart - factual, objective, in real time - and document on the incident report SEPARATELY. NEVER write 'incident report completed' or 'incident report filed' in the patient's chart. This rule is heavily tested."
        },
        {
          "kind": "p",
          "text": "Why does this matter? Incident reports are typically protected from discovery in legal proceedings as quality improvement materials, and mentioning the incident report in the medical record can compromise that protection. The chart entry should read like this: 'patient found on floor at 0230, alert and oriented, no apparent injury; vital signs stable; provider notified' - period."
        },
        {
          "kind": "h",
          "text": "Just Culture and the medication error response"
        },
        {
          "kind": "p",
          "text": "The Just Culture model is a framework for responding to errors. Human error means inadvertent slips and lapses, and the response is to console. At-risk behavior means taking shortcuts and drifts in practice, and the response is to coach. Reckless behavior means conscious disregard for safety, and the response is to punish. The model balances accountability with a non-punitive learning environment to encourage error reporting."
        },
        {
          "kind": "p",
          "text": "The medication error response follows a memorized sequence. One - assess the patient: vital signs, monitor for adverse effects, and anticipate consequences of the specific error. Two - notify the provider and communicate the error and the patient's status. Three - implement corrective measures, including an antidote if available (flumazenil for a benzodiazepine, recalling the Hour 14 cautions; naloxone for an opioid) and close monitoring. Four - document the facts in the patient's chart, factual and objective and complete. Five - complete an incident report as a separate document. Six - do not write 'incident report completed' in the patient's chart."
        }
      ]
    },
    {
      "id": "synthesis-case",
      "minutes": "54-58",
      "title": "Synthesis case",
      "format": "Case",
      "blocks": [
        {
          "kind": "p",
          "text": "A nurse is caring for an 80-year-old client admitted with pneumonia. The client is on droplet precautions, has a history of multiple falls, is taking warfarin for atrial fibrillation (INR 2.4), and was placed in wrist restraints overnight for pulling at the IV line. During morning assessment, the nurse finds the client on the floor next to the bed; the wrist restraint on the right side has come loose. The client reports hitting the head. Walk through your reasoning: identify priorities, immediate actions, and follow-up requirements."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Reasoning - multiple safety issues converging",
          "text": "Immediate priorities are the ABCs - airway, breathing, circulation - and maintaining the patient in place, not moving until cleared for injury given the potential head impact and possible fracture. Three critical concerns: (1) an anticoagulated patient (warfarin, INR 2.4, therapeutic) with a HEAD IMPACT, which requires urgent CT head to rule out intracranial hemorrhage regardless of clinical appearance - recall Hours 3 and 11, anticoagulated patients with head injury can deteriorate rapidly; (2) a possible fracture, so assess for hip rotation, shortening, and deformity and do not move if a fracture is suspected; (3) droplet precautions are still in effect, so apply PPE before close contact. Immediate actions in sequence: call for help; keep the patient in place and address ABCs; full assessment with a neuro check and vital signs; apply a surgical mask to the patient and don PPE before close contact; notify the provider STAT given anticoagulation plus head injury; anticipate CT head, possible C-spine imaging, and X-rays of any suspected fracture; once cleared, return to bed with assistance. Follow-up: review the restraint failure (was it tied correctly, to the bed frame not the side rail, with quick-release knots, with adequate monitoring?) - a fall WITH restraints in place is particularly concerning, and restraints are a last resort, so reassess whether they were appropriately indicated and whether alternatives were tried. Document in the medical record the objective findings, mechanism if known (unwitnessed fall from bed despite wrist restraints, restraint loose on arrival), patient statements verbatim, time, action taken, and provider and family notification - and complete a SEPARATE incident report without writing 'incident report completed' in the chart. Finally, this fall qualifies as potentially a never event if it results in serious injury, so a root cause analysis may be required, with review of fall prevention, restraint protocols, and monitoring frequency. The combination of fall risk, anticoagulation, restraints, and an unwitnessed fall is a significant safety concern requiring system-level review."
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
          "text": "Homework before Hour 16: fifty infection control and safety questions, with emphasis on the PPE donning and doffing order, the C. diff hand hygiene rule, organism-to-precaution matching (especially airborne plus contact), restraint requirements and time limits, the KCl never-IV-push rule, and the incident report documentation rule. Remember the framing - this is the bootcamp's most memorization-heavy hour, but the organism lists can be drilled with flashcards in about 30 minutes, the PPE order in about 5 minutes, and the KCl, C. diff, and incident report rules are each one-line absolutes. These are quick wins that pay disproportionate dividends."
        },
        {
          "kind": "p",
          "text": "Hour 16 is management of care: delegation and scope of practice - RN versus LPN versus UAP - which is a major IEN gap because the scope-of-practice framework differs substantially between countries. We will also cover legal and ethical principles, informed consent requirements, HIPAA basics, advance directives, and mandatory reporting, which expands on the child-abuse reporting we covered in Hour 13. See you in Hour 16."
        }
      ]
    }
  ]
};
