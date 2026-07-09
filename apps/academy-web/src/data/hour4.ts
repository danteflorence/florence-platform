import type { Lesson } from "./lessonTypes";

/**
 * Section 4 - Pharmacology II. Auto-generated from the Florence Academy
 * bootcamp instructor script (expanded draft). Pending nurse-educator review.
 */
export const lesson: Lesson = {
  "meta": {
    "number": 4,
    "title": "Pharmacology II",
    "durationMin": 60,
    "audience": "Internationally educated nurses - Philippines, UK, Kenya, Ghana",
    "contentWeight": "The densest single hour of the bootcamp - three high-yield buckets: endocrine, psychiatric, antibiotics",
    "tagline": "Insulin peaks, the two killer drug-reaction syndromes, the narrow lithium window, and one signature toxicity per antibiotic class - the patterns the NCLEX tests again and again."
  },
  "objectives": [
    "Differentiate the onset, peak, and duration of rapid-acting, short-acting, intermediate-acting, and long-acting insulins, and apply the 'clear before cloudy' mixing rule.",
    "Identify the highest-yield adverse effects and hold parameters for metformin, sulfonylureas, SGLT2 inhibitors, and GLP-1 agonists.",
    "Recognize serotonin syndrome and neuroleptic malignant syndrome by clinical presentation and respond with the correct nursing priority.",
    "Apply lithium toxicity parameters, sodium-balance teaching, and monitoring requirements.",
    "Distinguish extrapyramidal symptoms from neuroleptic malignant syndrome, and identify clozapine's life-threatening adverse effect.",
    "Recognize the signature toxicities and nursing implications for vancomycin, aminoglycosides, fluoroquinolones, sulfonamides, tetracyclines, and metronidazole."
  ],
  "timing": [
    {
      "minutes": "0-3",
      "segment": "Recap & frame",
      "format": "Lecture"
    },
    {
      "minutes": "3-15",
      "segment": "Insulin - types, peaks, mixing, storage",
      "format": "Lecture + table + 1 item"
    },
    {
      "minutes": "15-21",
      "segment": "Oral hypoglycemics - metformin focus + class overview",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "21-24",
      "segment": "Thyroid replacement - levothyroxine",
      "format": "Lecture"
    },
    {
      "minutes": "24-32",
      "segment": "Antidepressants - SSRIs, SNRIs, TCAs, serotonin syndrome",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "32-36",
      "segment": "MAOIs and the tyramine reaction",
      "format": "Lecture"
    },
    {
      "minutes": "36-42",
      "segment": "Lithium - narrow window, sodium, monitoring",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "42-48",
      "segment": "Antipsychotics - EPS, NMS, clozapine",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "48-56",
      "segment": "Antibiotics - vanc, aminoglycosides, fluoroquinolones, others",
      "format": "Rapid lecture + 1 item"
    },
    {
      "minutes": "56-58",
      "segment": "Synthesis",
      "format": "Case"
    },
    {
      "minutes": "58-60",
      "segment": "Close & homework",
      "format": "Lecture"
    }
  ],
  "practiceItems": {
    "pi_insulin_mixing_order": {
      "id": "pi_insulin_mixing_order",
      "stem": "The nurse is preparing to administer Regular insulin 10 units and NPH insulin 20 units subcutaneously to a client. Place the steps in the correct order.",
      "options": [
        {
          "key": "A",
          "text": "Inject 20 units of air into the NPH vial."
        },
        {
          "key": "B",
          "text": "Inject 10 units of air into the Regular vial."
        },
        {
          "key": "C",
          "text": "Draw up 10 units of Regular insulin."
        },
        {
          "key": "D",
          "text": "Draw up 20 units of NPH insulin."
        }
      ],
      "answer": "A",
      "rationale": "The correct order is A, B, C, D. Air goes into the NPH (cloudy) vial first - so that NPH can be pulled out at the end without creating a vacuum - then air into the Regular vial, then draw up the Regular, then draw up the NPH. Clear before cloudy; Regular before NPH (the 'RN' mnemonic). The classic trap is to flip B and A by injecting air into the Regular vial first; that is wrong because NPH is drawn second, so it gets its air first.",
      "cjmm": "take-actions",
      "reference": "Section 4 · Insulin"
    },
    "pi_metformin_contrast_hold": {
      "id": "pi_metformin_contrast_hold",
      "stem": "A client with type 2 diabetes is scheduled for a CT scan with IV contrast tomorrow morning. The client takes metformin twice daily. Which instruction should the nurse provide?",
      "options": [
        {
          "key": "A",
          "text": "Take both metformin doses as usual today and the morning of the scan."
        },
        {
          "key": "B",
          "text": "Hold metformin starting today and for 48 hours after the scan, then resume per provider order."
        },
        {
          "key": "C",
          "text": "Switch to insulin temporarily for blood sugar control during this period."
        },
        {
          "key": "D",
          "text": "Drink extra fluids but continue metformin without changes."
        }
      ],
      "answer": "B",
      "rationale": "Metformin is held before contrast imaging and for 48 hours after, because of the risk of contrast nephropathy precipitating lactic acidosis; the patient resumes once the provider confirms renal function is acceptable. A is wrong - taking it as usual exposes the patient to lactic acidosis risk. C is unnecessary in a stable type 2 diabetic for such a short period. D ignores the hold protocol entirely.",
      "cjmm": "take-actions",
      "reference": "Section 4 · Oral hypoglycemics"
    },
    "pi_serotonin_syndrome_recognition": {
      "id": "pi_serotonin_syndrome_recognition",
      "stem": "A client taking sertraline is started on tramadol for postoperative pain. Two days later, the nurse observes agitation, tachycardia, diaphoresis, tremor, and a temperature of 39.4°C. Which condition should the nurse suspect?",
      "options": [
        {
          "key": "A",
          "text": "Serotonin syndrome."
        },
        {
          "key": "B",
          "text": "Anticholinergic toxicity."
        },
        {
          "key": "C",
          "text": "Neuroleptic malignant syndrome."
        },
        {
          "key": "D",
          "text": "Opioid withdrawal."
        }
      ],
      "answer": "A",
      "rationale": "Sertraline plus tramadol are both serotonergic, and the picture shows the triad of mental status changes, autonomic instability, and neuromuscular hyperactivity (tremor). NMS would show rigidity and bradykinesia rather than tremor and hyperreflexia, and would follow antipsychotic exposure. Anticholinergic toxicity would have dry skin and decreased bowel sounds. Opioid withdrawal would show piloerection, yawning, lacrimation, and abdominal cramps - a different picture.",
      "cjmm": "analyze-cues",
      "reference": "Section 4 · Antidepressants & serotonin syndrome"
    },
    "pi_lithium_toxicity_priority": {
      "id": "pi_lithium_toxicity_priority",
      "stem": "A client on lithium 600 mg twice daily reports new onset of vomiting, hand tremor that is now visible even when not reaching for objects, and unsteadiness when walking. The lithium level drawn this morning is 1.8 mEq/L. What is the nurse's priority action?",
      "options": [
        {
          "key": "A",
          "text": "Encourage the client to drink more fluids and reassess in 4 hours."
        },
        {
          "key": "B",
          "text": "Hold the next lithium dose and notify the provider immediately."
        },
        {
          "key": "C",
          "text": "Administer an antiemetic and continue lithium as ordered."
        },
        {
          "key": "D",
          "text": "Educate the client about taking lithium with food."
        }
      ],
      "answer": "B",
      "rationale": "A coarse tremor visible at rest, plus vomiting, plus ataxia, plus a level of 1.8 mEq/L is lithium toxicity. The next dose is held immediately and the provider is notified; the vomiting itself contributes to dehydration, which worsens the toxicity. A is wrong because waiting 4 hours is dangerous. C is wrong because giving more lithium makes it worse. D is irrelevant - this is a clinical emergency, not a teaching moment.",
      "cjmm": "take-actions",
      "reference": "Section 4 · Lithium"
    },
    "pi_nms_recognition": {
      "id": "pi_nms_recognition",
      "stem": "A client started on haloperidol three days ago is found in bed with a temperature of 40.3°C, severe muscle rigidity, blood pressure of 180/110 mmHg, and altered mental status. The serum CK is 8,500 U/L. Which condition should the nurse suspect?",
      "options": [
        {
          "key": "A",
          "text": "Acute dystonia."
        },
        {
          "key": "B",
          "text": "Tardive dyskinesia."
        },
        {
          "key": "C",
          "text": "Serotonin syndrome."
        },
        {
          "key": "D",
          "text": "Neuroleptic malignant syndrome."
        }
      ],
      "answer": "D",
      "rationale": "Hyperthermia, rigidity, autonomic instability, altered mental status, an elevated CK, and recent initiation of a high-potency typical antipsychotic make up the classic NMS tetrad. A - acute dystonia is an acute muscle spasm, not a systemic syndrome. B - tardive dyskinesia is late-onset involuntary movement with no hyperthermia. C - serotonin syndrome would show hyperreflexia and clonus plus a serotonergic drug exposure, not an antipsychotic.",
      "cjmm": "analyze-cues",
      "reference": "Section 4 · Antipsychotics"
    },
    "pi_vancomycin_infusion_reaction": {
      "id": "pi_vancomycin_infusion_reaction",
      "stem": "A client receiving IV vancomycin 1 gram develops flushing of the upper body, an erythematous rash, and a blood pressure drop from 130/82 to 92/58 about 20 minutes into the infusion. What is the nurse's priority action?",
      "options": [
        {
          "key": "A",
          "text": "Discontinue the infusion permanently and document a vancomycin allergy."
        },
        {
          "key": "B",
          "text": "Slow the infusion and notify the provider; this is likely vancomycin infusion reaction."
        },
        {
          "key": "C",
          "text": "Administer epinephrine for anaphylaxis."
        },
        {
          "key": "D",
          "text": "Increase the infusion rate to clear the medication faster."
        }
      ],
      "answer": "B",
      "rationale": "Flushing, rash, and hypotension during a vancomycin infusion is the vancomycin infusion reaction - direct histamine release from too-rapid infusion, not a true allergy. The intervention is to slow the infusion, sometimes pre-medicate with diphenhydramine, and continue. A is wrong because this is not an allergy and the patient may need the drug. C is wrong - this is not anaphylaxis; it lacks airway involvement and angioedema. D is wrong - a faster infusion makes it worse.",
      "cjmm": "take-actions",
      "reference": "Section 4 · Antibiotics"
    }
  },
  "segments": [
    {
      "id": "recap-and-frame",
      "minutes": "0-3",
      "title": "Recap & Frame",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Welcome back, and let's start with a brisk check on Hour 3. Recite the seven name roots with me right now: -olol, -pril, -sartan, -dipine, -statin, -xaban, -gatran. If any one of those didn't fire off instantly in your head, that is your review for tonight - you should be able to hear the root and know the class without hesitating."
        },
        {
          "kind": "p",
          "text": "Today we add three more roots - -gliptin, -gliflozin, -glutide - plus a few concepts that don't follow any name pattern at all. We are covering endocrine, psychiatric, and antibiotic pharmacology in 60 minutes. This is the densest single hour in the entire bootcamp, by design, so I am going to move fast. If I lose you, stop me in the chat."
        },
        {
          "kind": "p",
          "text": "We use the same six-field template as Hour 3: name root, mechanism, uses, adverse effects, hold parameters, teaching pearl. A few drugs today won't fit the template perfectly - insulin doesn't have a name root, and lithium doesn't have a class - but the architecture still holds. Think in those six fields and the volume becomes manageable."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "The three buckets",
          "text": "Endocrine, psychiatric, antibiotics. Hold those three headings in your mind for the next hour - everything we cover slots into one of them."
        }
      ]
    },
    {
      "id": "insulin",
      "minutes": "3-15",
      "title": "Insulin - Types, Peaks, Mixing, Storage",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Insulin comes in four categories. For each one I want you to know a representative drug, the onset, the peak, and the duration - and you are going to write these down. Open your Insulin Onset/Peak/Duration Chart handout and keep it next to you; many learners say this hour is the moment insulin finally clicked for them, and that table is what they reference for years afterward."
        },
        {
          "kind": "h",
          "text": "Category one - rapid-acting"
        },
        {
          "kind": "p",
          "text": "Rapid-acting insulins are lispro (Humalog), aspart (Novolog), and glulisine (Apidra). Onset is about 15 minutes, peak is 30 to 90 minutes, and duration is 3 to 5 hours. The critical teaching point is to give it just before the meal - within 15 minutes of eating. If you give rapid-acting insulin and the patient doesn't eat, you get hypoglycemia, fast."
        },
        {
          "kind": "h",
          "text": "Category two - short-acting"
        },
        {
          "kind": "p",
          "text": "There is only one short-acting insulin to know: Regular insulin (Humulin R, Novolin R). Onset is 30 to 60 minutes, peak is 2 to 3 hours, and duration is 5 to 8 hours. Give it 30 minutes before the meal."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Regular is the only IV insulin",
          "text": "Regular insulin is the ONLY insulin that can be given intravenously - every other insulin is subcutaneous only. If you see IV insulin on the NCLEX, it is Regular. Memorize this."
        },
        {
          "kind": "h",
          "text": "Category three - intermediate-acting"
        },
        {
          "kind": "p",
          "text": "Intermediate-acting means NPH (Humulin N, Novolin N). Onset is 1 to 2 hours, peak is 4 to 12 hours, and duration is 12 to 18 hours. Two things to remember. First, NPH is CLOUDY - it is the only commonly used insulin that is cloudy, because it contains protamine, which slows absorption; every other insulin is clear. Second, the peak is wide, 4 to 12 hours, so you have to think about when the patient might bottom out."
        },
        {
          "kind": "p",
          "text": "That wide peak has a practical consequence. NPH given in the morning peaks during the workday, while NPH given at bedtime peaks in the middle of the night - and that nighttime peak is exactly where nocturnal hypoglycemia comes from. Time your assessments and the patient's snacks around where that peak lands."
        },
        {
          "kind": "h",
          "text": "Category four - long-acting"
        },
        {
          "kind": "p",
          "text": "Long-acting insulins are glargine (Lantus, Basaglar, Toujeo), detemir (Levemir), and degludec (Tresiba). Onset is 1 to 2 hours, there is NO PEAK, and duration is approximately 24 hours - sometimes longer for degludec. These provide basal coverage: a steady background of insulin throughout the day."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Never mix long-acting insulin",
          "text": "Long-acting insulins are NEVER mixed with any other insulin - they are given as a separate injection. If a patient needs basal plus mealtime coverage, glargine goes in one syringe and rapid-acting goes in another."
        },
        {
          "kind": "h",
          "text": "Mixing - clear before cloudy"
        },
        {
          "kind": "p",
          "text": "When you mix Regular and NPH, the rule is clear before cloudy - Regular before NPH. The mnemonic is RN: Regular before NPH. Walk through the steps with me. Step one, inject air into the NPH vial equal to the dose. Step two, inject air into the Regular vial equal to the dose. Step three, draw up the Regular insulin. Step four, draw up the NPH. Clear into the syringe first, cloudy second."
        },
        {
          "kind": "p",
          "text": "Why does the order matter so much? Because if a tiny amount of NPH contaminates the Regular vial, that is a permanent contamination of the clear vial. Contamination in the reverse direction is recoverable. So always: RN, Regular before NPH."
        },
        {
          "kind": "h",
          "text": "Storage"
        },
        {
          "kind": "p",
          "text": "Unopened insulin lives in the refrigerator. Once opened, most insulins can sit at room temperature for up to 28 days. Insulin should never be frozen. And before drawing up, roll the vial gently between the palms - do not shake it, because shaking creates air bubbles and can denature the protein."
        },
        {
          "kind": "h",
          "text": "Injection sites"
        },
        {
          "kind": "p",
          "text": "Insulin is subcutaneous. Rotate within the same anatomic area, not across areas, because absorption rates differ by site. The abdomen absorbs fastest, the arm is second, the thigh is third, and the buttock is slowest. If a patient gives morning insulin in the abdomen one day and the thigh the next, their blood sugar control becomes erratic - so stay in one zone and rotate within it."
        },
        {
          "kind": "h",
          "text": "Two clinical pearls and the hypoglycemia teaching"
        },
        {
          "kind": "p",
          "text": "Two pearls to add. Hot showers and exercise accelerate absorption - the peak comes sooner and harder - so warn diabetic patients about gym timing. And patients on rapid or short-acting insulin must eat within the relevant window; skipping a meal after rapid insulin is a fast route to a hypoglycemic emergency."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Hypoglycemia - recognize and treat",
          "text": "Signs of hypoglycemia: cool, clammy skin, tachycardia, anxiety, hunger, and confusion. Treat with the 15-15 rule, have the patient always carry a simple carbohydrate, and never skip a meal after rapid or short-acting insulin."
        }
      ],
      "practiceItemId": "pi_insulin_mixing_order"
    },
    {
      "id": "oral-hypoglycemics",
      "minutes": "15-21",
      "title": "Oral Hypoglycemics - Metformin Focus + Class Overview",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Oral diabetes medications come in five classes. I'll spend most of the time on metformin, because it's first-line and the most tested, and then move quickly through the rest."
        },
        {
          "kind": "h",
          "text": "Metformin"
        },
        {
          "kind": "p",
          "text": "Metformin (Glucophage) is a biguanide and the first-line therapy for type 2 diabetes. Its mechanism is mostly hepatic - it decreases glucose production by the liver. And because it doesn't stimulate insulin secretion, metformin does NOT cause hypoglycemia as monotherapy. That last point is important and frequently tested."
        },
        {
          "kind": "p",
          "text": "Metformin has three adverse effects to know. First, GI upset - nausea, diarrhea, cramping - which is common and dose-related but often improves over weeks; you start low, titrate up, and take it with food. Second, lactic acidosis - rare but life-threatening, classically in a patient with impaired renal function who builds up metformin in their system, presenting with fatigue, malaise, muscle pain, hyperventilation, and abdominal pain. Third, vitamin B12 deficiency with long-term use, so check B12 levels periodically."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Metformin and IV contrast",
          "text": "Hold metformin before IV contrast imaging - a CT with contrast or a coronary angiogram - and for 48 hours after, if renal function is borderline. Contrast can precipitate acute kidney injury, and if the kidneys fail to clear metformin, lactic acidosis develops. Contraindicated in severe renal impairment, generally eGFR below 30. This is heavily tested."
        },
        {
          "kind": "h",
          "text": "Sulfonylureas"
        },
        {
          "kind": "p",
          "text": "Sulfonylureas - glipizide, glyburide, glimepiride - stimulate the pancreatic beta cells to release more insulin. Because they push insulin out, their major adverse effect is hypoglycemia, sometimes severe, especially in older adults and in patients who skip meals; they also cause weight gain. They are generally being deprioritized in modern practice in favor of newer agents."
        },
        {
          "kind": "h",
          "text": "DPP-4 inhibitors (-gliptin)"
        },
        {
          "kind": "p",
          "text": "The DPP-4 inhibitors carry the name root -gliptin: sitagliptin (Januvia), saxagliptin, linagliptin. They give a modest A1c reduction, are weight neutral, and carry a low hypoglycemia risk. The main warning is pancreatitis - if a patient on a gliptin reports severe abdominal pain radiating to the back, think pancreatitis and stop the drug."
        },
        {
          "kind": "h",
          "text": "SGLT2 inhibitors (-gliflozin)"
        },
        {
          "kind": "p",
          "text": "The SGLT2 inhibitors carry the name root -gliflozin: empagliflozin (Jardiance), dapagliflozin (Farxiga), canagliflozin (Invokana). They block reabsorption of glucose in the kidney, so glucose is excreted in the urine. The benefits are substantial - weight loss, blood pressure reduction, and importantly cardiovascular and renal protection in selected patients."
        },
        {
          "kind": "p",
          "text": "The adverse effects are what get tested. Because there is now glucose in the urine bathing the genitourinary tract, you see urinary tract infections and genital yeast infections. You also see dehydration and orthostatic hypotension. And critically, euglycemic diabetic ketoacidosis - DKA that can develop even when the blood glucose is near normal."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Euglycemic DKA",
          "text": "In a patient on a gliflozin with nausea, vomiting, abdominal pain, and acidosis - check ketones even if the glucose is only mildly elevated. This is an atypical presentation, and the normal-looking glucose is exactly the trap."
        },
        {
          "kind": "h",
          "text": "GLP-1 agonists (-glutide)"
        },
        {
          "kind": "p",
          "text": "The GLP-1 agonists carry the name root -glutide: liraglutide (Victoza), semaglutide (Ozempic injectable for diabetes, Wegovy injectable for weight loss, Rybelsus oral), and dulaglutide (Trulicity). Most are subcutaneous injection - weekly for semaglutide and dulaglutide - and the benefits are significant weight loss, A1c reduction, and cardiovascular protection."
        },
        {
          "kind": "p",
          "text": "Three adverse effects to know. First, nausea - very common, often dose-limiting, but improves with time. Second, a pancreatitis warning. Third, a thyroid C-cell tumor warning based on animal studies, which makes these drugs contraindicated in patients with a personal or family history of medullary thyroid cancer."
        }
      ],
      "practiceItemId": "pi_metformin_contrast_hold"
    },
    {
      "id": "levothyroxine",
      "minutes": "21-24",
      "title": "Levothyroxine",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Levothyroxine is synthetic T4. Synthroid is the most common brand, but there are many generics. It is lifelong replacement for hypothyroidism."
        },
        {
          "kind": "p",
          "text": "The administration is heavily tested. Take it in the morning, on an empty stomach, with a full glass of water, and then wait 30 to 60 minutes before food or any other medications. The reason is that food significantly impairs absorption, and several agents - calcium, iron supplements, proton pump inhibitors, soy products, and fiber supplements - bind levothyroxine in the gut and reduce how much is absorbed."
        },
        {
          "kind": "p",
          "text": "Doses are adjusted based on TSH, typically rechecked every 6 to 8 weeks after a change. TSH is the marker you read: if the TSH is high, the dose is too low; if the TSH is suppressed, the dose is too high."
        },
        {
          "kind": "p",
          "text": "The adverse effects are mostly signs of over-replacement, which mimic hyperthyroidism - tachycardia, palpitations, weight loss, anxiety, heat intolerance, and insomnia. If a patient on levothyroxine reports these, the dose is probably too high."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Teaching pearls",
          "text": "Do not stop levothyroxine abruptly - hypothyroidism returns. And be deliberate about brand switches, because generics are not always bioequivalent in practice."
        }
      ]
    },
    {
      "id": "antidepressants-serotonin-syndrome",
      "minutes": "24-32",
      "title": "Antidepressants & Serotonin Syndrome",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "There are three major antidepressant classes you must know - SSRIs, SNRIs, and TCAs - plus MAOIs as a fourth, which I'll cover in the next segment because of the tyramine reaction."
        },
        {
          "kind": "h",
          "text": "SSRIs"
        },
        {
          "kind": "p",
          "text": "SSRIs - Selective Serotonin Reuptake Inhibitors - are the first-line treatment for depression and most anxiety disorders. The examples are fluoxetine (Prozac), sertraline (Zoloft), paroxetine (Paxil), citalopram (Celexa), escitalopram (Lexapro), and fluvoxamine. These are the workhorses of outpatient psychiatry."
        },
        {
          "kind": "p",
          "text": "The critical teaching point is onset. SSRIs take 4 to 6 weeks for the full therapeutic effect on mood. Patients may notice some improvement in 1 to 2 weeks, but the full antidepressant response is delayed - and this matters because patients give up on the drug too early. Set expectations clearly: tell them it will take six weeks, stay with it, and we will reassess at six weeks."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Black box warning - suicidality",
          "text": "SSRIs carry a warning about increased suicidality in adolescents and young adults during the first weeks of therapy. The thinking is that motivation and energy return before mood improves - a depressed patient who couldn't get out of bed now has the energy to act on suicidal thoughts. Close monitoring in the first weeks is essential."
        },
        {
          "kind": "p",
          "text": "The adverse effects: GI upset, usually transient; sexual dysfunction, which is very common and often the reason for nonadherence - patients won't bring it up, so you must ask; weight changes; and insomnia or somnolence depending on which SSRI. There is also hyponatremia, especially in older adults via an SIADH-like mechanism, so check sodium if a patient on an SSRI becomes confused or lethargic."
        },
        {
          "kind": "p",
          "text": "Discontinuation syndrome matters too. If you stop an SSRI abruptly you get dizziness, flu-like symptoms, electric-shock sensations called brain zaps, and irritability. So taper, do not stop abruptly. Paroxetine is the worst offender because of its short half-life - patients can feel discontinuation even from a single missed dose."
        },
        {
          "kind": "h",
          "text": "SNRIs"
        },
        {
          "kind": "p",
          "text": "SNRIs - Serotonin Norepinephrine Reuptake Inhibitors - are venlafaxine (Effexor) and duloxetine (Cymbalta). They have the same general profile as SSRIs but with an added norepinephrine effect, which makes them useful for depression with prominent fatigue or for neuropathic pain - duloxetine is approved for diabetic neuropathy. Watch for hypertension, especially with venlafaxine at higher doses."
        },
        {
          "kind": "h",
          "text": "TCAs"
        },
        {
          "kind": "p",
          "text": "TCAs - Tricyclic Antidepressants - are amitriptyline, nortriptyline, imipramine, and doxepin. They have been largely replaced by SSRIs because TCAs are dangerous in overdose. The signature problems are cardiotoxicity, specifically QRS widening on the ECG in overdose, and anticholinergic effects - dry mouth, constipation, urinary retention, blurred vision, and sedation. The rule is to limit pill quantities prescribed to depressed patients, because a one-month TCA supply can be a lethal overdose."
        },
        {
          "kind": "h",
          "text": "Serotonin syndrome"
        },
        {
          "kind": "p",
          "text": "Now, serotonin syndrome. This is life-threatening, and you must memorize the triad. The three components are: mental status changes (agitation, restlessness, confusion); autonomic instability (hypertension, tachycardia, hyperthermia sometimes over 40 degrees Celsius, diaphoresis, dilated pupils); and neuromuscular hyperactivity (tremor, clonus, hyperreflexia, rigidity). If you see these together in a patient on a serotonergic medication, think serotonin syndrome."
        },
        {
          "kind": "p",
          "text": "The cause is combining serotonergic drugs. The classic combination is an SSRI plus an MAOI, which is exactly why we keep a 2-week washout between those classes. But it also happens with SSRI plus tramadol, SSRI plus triptans for migraines, SSRI plus St. John's wort, SSRI plus linezolid (an antibiotic that has MAOI activity), SSRI plus another SSRI, and even SSRI plus ondansetron at high doses."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Serotonin syndrome management",
          "text": "Discontinue the offending agents. Provide supportive care - IV fluids and cooling. Give benzodiazepines for agitation. And use cyproheptadine, a serotonin antagonist, in severe cases."
        }
      ],
      "practiceItemId": "pi_serotonin_syndrome_recognition"
    },
    {
      "id": "maois-and-tyramine",
      "minutes": "32-36",
      "title": "MAOIs and Tyramine",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "MAOIs - Monoamine Oxidase Inhibitors - are phenelzine (Nardil), tranylcypromine (Parnate), and isocarboxazid. Selegiline, given as the Emsam patch at low doses, has fewer dietary restrictions. These are used today mainly for treatment-resistant depression or atypical depression - not first-line - but they are heavily tested on the NCLEX because of the dietary restriction."
        },
        {
          "kind": "p",
          "text": "The mechanism: monoamine oxidase is the enzyme that breaks down norepinephrine, dopamine, serotonin, and importantly tyramine - an amino acid found in fermented and aged foods. When you inhibit MAO, tyramine from food is absorbed and not broken down. The tyramine triggers norepinephrine release, and the result is a hypertensive crisis."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Tyramine foods to avoid",
          "text": "Aged cheeses (cheddar, blue, gorgonzola, parmesan) - though fresh mozzarella and cottage cheese are okay. Cured and smoked meats (salami, pepperoni, dry sausages). Fermented foods (sauerkraut, kimchi, miso). Soy sauce. Draft and unpasteurized beer. Red wine. Fava beans. Overripe bananas. As a rule: anything aged or fermented."
        },
        {
          "kind": "p",
          "text": "The hypertensive crisis presentation is a severe headache - often occipital, and described as the worst headache of life - with neck stiffness, palpitations, sweating, photophobia, nausea, and a blood pressure spike to dangerous levels, sometimes systolic 220 or higher. This is an emergency: hold the MAOI, get the patient to the ED, and give IV antihypertensives."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Two-week washout",
          "text": "Allow a 2-week washout between an MAOI and any serotonergic medication - specifically 2 weeks between stopping an SSRI and starting an MAOI - to prevent serotonin syndrome. The exception is fluoxetine, which has a long half-life and requires a 5-week washout."
        }
      ]
    },
    {
      "id": "lithium",
      "minutes": "36-42",
      "title": "Lithium - Narrow Window, Sodium, Monitoring",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Lithium is the mood stabilizer for bipolar disorder. It's an old drug with a narrow therapeutic window, and it is heavily tested. The mechanism isn't fully understood; it modulates neurotransmission and second-messenger systems."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Therapeutic range - memorize 0.6-1.2",
          "text": "Maintenance range is 0.6 to 1.2 mEq/L. Up to 1.5 mEq/L is acceptable for acute mania. Anything above 1.5 is toxic territory, and above 2.0 is severe toxicity."
        },
        {
          "kind": "p",
          "text": "Toxicity signs build in stages. Early on, a fine tremor at baseline is actually normal on lithium - but a coarse tremor, bigger and more obvious, signals toxicity. Add to that GI upset (vomiting, diarrhea), ataxia (unsteady gait), slurred speech, drowsiness, and confusion. Severe toxicity progresses to seizures, coma, and death. If a patient on lithium develops vomiting and a coarse tremor, that is not gastroenteritis - that is lithium toxicity until proven otherwise."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Sodium balance - the single most important teaching",
          "text": "Lithium is handled by the kidney similarly to sodium. When sodium is low, the kidney reabsorbs more sodium - and more lithium - and lithium levels climb. So patients must NOT restrict salt, must maintain consistent sodium intake, and must avoid dehydration. NSAIDs decrease lithium clearance and raise levels, so they are generally avoided, and thiazide diuretics also raise levels."
        },
        {
          "kind": "p",
          "text": "Hydration follows directly from that. Maintain 2 to 3 liters of fluid daily, because dehydration concentrates lithium and precipitates toxicity. A patient on lithium who gets gastroenteritis, runs a marathon, or has heat stroke can develop toxicity from dehydration alone."
        },
        {
          "kind": "p",
          "text": "Long-term monitoring covers three things. Thyroid function tests, because lithium can cause hypothyroidism over years. Renal function, because lithium can cause chronic kidney disease. And the lithium level itself every 3 to 6 months once stable - more often when initiating or adjusting the dose."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Pregnancy - Ebstein anomaly",
          "text": "Lithium carries a risk of Ebstein anomaly, a specific cardiac malformation, with risk during the first trimester. Counsel about contraception; if pregnancy is planned, the medication is often switched."
        },
        {
          "kind": "p",
          "text": "Finally, onset. Lithium takes 1 to 2 weeks to control acute mania, sometimes longer for the maintenance effect. During the acute phase, an antipsychotic is often started alongside it for immediate behavioral control, then tapered as lithium reaches steady state."
        }
      ],
      "practiceItemId": "pi_lithium_toxicity_priority"
    },
    {
      "id": "antipsychotics",
      "minutes": "42-48",
      "title": "Antipsychotics - EPS, NMS, Clozapine",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Antipsychotics come in two generations with two distinct profiles."
        },
        {
          "kind": "h",
          "text": "Typical (first-generation)"
        },
        {
          "kind": "p",
          "text": "Typical antipsychotics are first-generation, with high-potency dopamine-2 blockade: haloperidol (Haldol), fluphenazine, chlorpromazine, and perphenazine. They are strong for positive symptoms - hallucinations and delusions - but they cause high extrapyramidal side effects."
        },
        {
          "kind": "h",
          "text": "Atypical (second-generation)"
        },
        {
          "kind": "p",
          "text": "Atypical antipsychotics are second-generation and block dopamine AND serotonin: risperidone (Risperdal), olanzapine (Zyprexa), quetiapine (Seroquel), aripiprazole (Abilify), ziprasidone (Geodon), and clozapine (Clozaril). They address both positive and negative symptoms with less EPS - but more metabolic syndrome, meaning weight gain, diabetes, and dyslipidemia, especially with olanzapine and clozapine."
        },
        {
          "kind": "h",
          "text": "Extrapyramidal symptoms - four to know"
        },
        {
          "kind": "p",
          "text": "Acute dystonia is muscle spasm - torticollis, oculogyric crisis (eyes rolling up), laryngospasm - usually within hours to days of starting the medication. Treat it with intramuscular benztropine (Cogentin) or intramuscular diphenhydramine, and it reverses quickly."
        },
        {
          "kind": "p",
          "text": "Akathisia is an internal restlessness, an inability to sit still - patients pace, fidget, and feel like they're crawling out of their skin. It is treatable, sometimes with beta blockers and sometimes by lowering the dose."
        },
        {
          "kind": "p",
          "text": "Parkinsonism is bradykinesia, rigidity, resting tremor, and a masked face - it looks exactly like Parkinson's disease. Treat it with anticholinergics such as benztropine, or by lowering the antipsychotic dose."
        },
        {
          "kind": "p",
          "text": "Tardive dyskinesia is late-onset, appearing after months to years of antipsychotic use: involuntary movements of the face, tongue, lips, and jaw - lip smacking, tongue protrusion, grimacing. It is the most feared EPS because it is often irreversible. It is monitored with the Abnormal Involuntary Movement Scale (AIMS); the dose is reviewed, and sometimes the antipsychotic is switched."
        },
        {
          "kind": "h",
          "text": "Neuroleptic Malignant Syndrome"
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "NMS tetrad",
          "text": "Hyperthermia, often above 40°C. Severe muscle rigidity, described as 'lead pipe' rigidity. Autonomic instability - wildly fluctuating blood pressure, tachycardia, sweating. Altered mental status - confusion, stupor, sometimes coma. The lab clue is a markedly elevated CK from muscle breakdown, sometimes with a high white count."
        },
        {
          "kind": "p",
          "text": "NMS can occur with any antipsychotic at any point in treatment, but it is most common with high-potency typical antipsychotics like haloperidol and with rapid dose escalations. The mortality is significant - somewhere around 10 to 20 percent if untreated - so early recognition saves lives."
        },
        {
          "kind": "p",
          "text": "Management is to discontinue the antipsychotic immediately, then supportive care - aggressive cooling, IV hydration, electrolyte correction - with dantrolene to relax the muscles and sometimes bromocriptine. ICU-level care is typically required."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Serotonin syndrome vs. NMS",
          "text": "Both share hyperthermia, autonomic instability, and altered mental status. The differences: serotonin syndrome has neuromuscular HYPERACTIVITY (hyperreflexia, clonus, tremor) while NMS has RIGIDITY with bradykinesia; serotonin syndrome onset is hours while NMS onset is days; and the exposure differs - a serotonergic drug versus an antipsychotic."
        },
        {
          "kind": "h",
          "text": "Clozapine - the special case"
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Clozapine and agranulocytosis",
          "text": "Clozapine is the most effective antipsychotic for treatment-resistant schizophrenia, but it causes agranulocytosis - a severe drop in white blood cell count - in approximately 1 percent of patients. CBC is drawn weekly for the first 6 months, biweekly through month 12, then monthly thereafter. Teach the patient to report any sore throat, fever, or mouth ulcers immediately - those are often the first sign of agranulocytosis. The drug is dispensed only by registered pharmacies and is strictly monitored."
        },
        {
          "kind": "p",
          "text": "One more class-wide point: QT prolongation. Many antipsychotics, especially ziprasidone and IV haloperidol, prolong the QT interval - so avoid combining them with other QT-prolonging agents."
        }
      ],
      "practiceItemId": "pi_nms_recognition"
    },
    {
      "id": "antibiotics",
      "minutes": "48-56",
      "title": "Antibiotics - One Signature Toxicity Per Class",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Antibiotics - eight classes. I am going to give you each class with one signature toxicity. Memorize the signature; the detail comes from your drug cards. We move fast here."
        },
        {
          "kind": "h",
          "text": "Penicillins"
        },
        {
          "kind": "p",
          "text": "Penicillins are amoxicillin, ampicillin, penicillin G, and piperacillin-tazobactam (Zosyn). The signature is allergy - anywhere from a rash to anaphylaxis. Always ask about penicillin allergy and characterize the reaction, because 'rash' is different from 'anaphylaxis': both are documented, but anaphylaxis is an absolute contraindication."
        },
        {
          "kind": "h",
          "text": "Cephalosporins"
        },
        {
          "kind": "p",
          "text": "Cephalosporins include cefazolin (Ancef, the common surgical prophylaxis), ceftriaxone (Rocephin, the common inpatient agent), and cefepime (fourth generation). The signature is that cross-reactivity with penicillin allergy is lower than once feared - under 10 percent, and lower for later-generation cephalosporins. One specific note: cefotetan and a few others cause a disulfiram-like reaction with alcohol."
        },
        {
          "kind": "h",
          "text": "Aminoglycosides"
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Aminoglycosides - nephro + ototoxicity",
          "text": "Gentamicin, tobramycin, amikacin, neomycin. The signature is nephrotoxicity AND ototoxicity - and the ototoxicity is often irreversible, affecting both hearing and balance. Monitor peak and trough levels: the trough is drawn 30 minutes before the next dose, the peak 30 minutes after the IV infusion completes. An elevated trough means the drug is accumulating - hold the next dose and notify the provider."
        },
        {
          "kind": "h",
          "text": "Fluoroquinolones"
        },
        {
          "kind": "p",
          "text": "Fluoroquinolones are ciprofloxacin (Cipro), levofloxacin (Levaquin), and moxifloxacin. The signature is tendon rupture, especially the Achilles tendon, and especially in the elderly, in patients on corticosteroids, and in transplant recipients - it carries a black box warning. There is also QT prolongation, C. difficile risk, peripheral neuropathy, and photosensitivity. Avoid in children when alternatives exist because of cartilage concerns, and do not take with calcium, iron, antacids, or dairy products, which chelate the drug and reduce absorption."
        },
        {
          "kind": "h",
          "text": "Vancomycin"
        },
        {
          "kind": "p",
          "text": "Vancomycin is for MRSA and severe Gram-positive infections. The signature is the vancomycin infusion reaction, the syndrome formerly known as red man syndrome - flushing, rash, and hypotension from direct histamine release when infused too rapidly. It is not a true allergy. Prevention is to infuse over at least 60 minutes, longer for higher doses, and the reaction typically resolves with slowing the infusion."
        },
        {
          "kind": "p",
          "text": "Vancomycin also has nephrotoxicity and ototoxicity at high serum concentrations. Trough levels are monitored - target around 15 to 20 mg/L for serious infections, though many institutions are shifting to area-under-the-curve (AUC) monitoring. One more point: oral vancomycin is used for C. difficile colitis only, because it is not systemically absorbed - IV for systemic infections, oral for C. diff."
        },
        {
          "kind": "h",
          "text": "Macrolides"
        },
        {
          "kind": "p",
          "text": "Macrolides are azithromycin (Z-Pak), erythromycin, and clarithromycin. The signature is QT prolongation, so avoid combining with other QT-prolonging drugs. Erythromycin also has significant GI motility effects and is sometimes used as a gut prokinetic in gastroparesis."
        },
        {
          "kind": "h",
          "text": "Tetracyclines"
        },
        {
          "kind": "p",
          "text": "Tetracyclines are doxycycline, tetracycline, and minocycline. The signature is teeth discoloration in children under 8 and in pregnancy and lactation, plus photosensitivity - so avoid in pregnancy. Take with a full glass of water and remain upright for 30 minutes to prevent esophagitis, and do not take with dairy or calcium-containing products, which chelate the drug."
        },
        {
          "kind": "h",
          "text": "Sulfonamides"
        },
        {
          "kind": "p",
          "text": "Sulfonamides means trimethoprim-sulfamethoxazole (Bactrim, Septra). The signature is Stevens-Johnson syndrome risk - a rare but devastating mucocutaneous reaction, so any new rash on Bactrim is taken seriously, especially with mucous membrane involvement. There is also hyperkalemia and photosensitivity, and you avoid it in late pregnancy due to kernicterus risk in the newborn."
        },
        {
          "kind": "h",
          "text": "Metronidazole"
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Metronidazole and alcohol",
          "text": "Metronidazole (Flagyl) treats anaerobic infections and is used for oral therapy of C. difficile. The signature is a disulfiram-like reaction with alcohol - severe nausea, vomiting, flushing, and tachycardia. Counsel patients to avoid alcohol during therapy and for 3 days after the last dose. A metallic taste is common - annoying, not dangerous."
        }
      ],
      "practiceItemId": "pi_vancomycin_infusion_reaction"
    },
    {
      "id": "synthesis",
      "minutes": "56-58",
      "title": "Synthesis",
      "format": "Case",
      "blocks": [
        {
          "kind": "p",
          "text": "Here is one synthesis case that bridges psychiatric and endocrine reasoning - type your reasoning, not just an answer. A client with bipolar disorder taking lithium 900 mg twice daily is started on ibuprofen for shoulder pain. Three days later, the client presents with vomiting, ataxia, slurred speech, and a coarse tremor. The lithium level is 2.1 mEq/L. Which assessment finding best explains the elevated lithium level?"
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "The reasoning",
          "text": "NSAIDs reduce renal lithium clearance, and ibuprofen plus lithium is a well-known interaction that drives lithium toxicity. The clinical picture matches - coarse tremor, ataxia, slurred speech, vomiting, level 2.1. The synthesis is to recognize the interaction, recognize the toxicity signs, and identify the NSAID exposure as the answer. The actions: hold lithium, stop ibuprofen, hydrate, supportive care, and notify the provider."
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
          "text": "Recite all ten name roots from Hours 3 and 4 cold: -olol, -pril, -sartan, -dipine, -statin, -xaban, -gatran, -gliptin, -gliflozin, -glutide. If any one of those doesn't fire instantly, that is tonight's review."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Homework",
          "text": "Do 50 pharmacology questions, with at least 20 from the psychiatric and antibiotic categories. Put every wrong answer in your journal - and specifically, for every psychiatric medication error, record whether you missed a teaching point, a toxicity, or a hold parameter. Pattern your errors."
        },
        {
          "kind": "p",
          "text": "Hour 5 is the last pharmacology hour: pain management, OB medications, peds dosing, and safe medication administration - including the rights of medication administration, high-alert meds, and look-alike sound-alike. After Hour 5, the heavy drug content is done and we move into clinical content - labs and disease management. See you next session."
        }
      ]
    }
  ]
};
