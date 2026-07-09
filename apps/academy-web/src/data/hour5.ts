import type { Lesson } from "./lessonTypes";

/**
 * Section 5 - Pharmacology III. Auto-generated from the Florence Academy
 * bootcamp instructor script (expanded draft). Pending nurse-educator review.
 */
export const lesson: Lesson = {
  "meta": {
    "number": 5,
    "title": "Pharmacology III",
    "durationMin": 60,
    "audience": "Internationally educated nurses - Philippines, UK, Kenya, Ghana",
    "contentWeight": "Closes the three-hour pharmacology block - one of the most heavily tested areas on the NCLEX",
    "tagline": "The drugs that don't fit a clean name root - pain, OB, peds - plus the safe-administration framework that wraps everything else."
  },
  "objectives": [
    "Recognize opioid toxicity, identify the hold parameter for respiratory rate, and administer naloxone correctly.",
    "Differentiate the adverse-effect profiles and dose ceilings of NSAIDs and acetaminophen, including the acetaminophen antidote.",
    "Manage a patient on intravenous magnesium sulfate - recognize toxicity by loss of deep tendon reflexes, monitor required parameters, and administer the antidote.",
    "Identify the indications and contraindications for oxytocin, recognize tachysystole, and respond with the correct nursing action.",
    "Perform weight-based pediatric dose calculations and apply 'safe dose range' verification.",
    "Apply the ten rights of medication administration, identify high-alert medications requiring independent double-check, and recognize the most common look-alike/sound-alike drug pairs."
  ],
  "timing": [
    {
      "minutes": "0-3",
      "segment": "Recap & frame the close of the pharmacology block",
      "format": "Lecture"
    },
    {
      "minutes": "3-13",
      "segment": "Opioids - agents, monitoring, naloxone, PCA",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "13-18",
      "segment": "NSAIDs & acetaminophen - ceilings, antidote, Reye",
      "format": "Lecture"
    },
    {
      "minutes": "18-25",
      "segment": "Magnesium sulfate - preeclampsia, DTRs, antidote",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "25-31",
      "segment": "Oxytocin - induction, augmentation, PPH",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "31-35",
      "segment": "Tocolytics & antenatal corticosteroids",
      "format": "Lecture"
    },
    {
      "minutes": "35-43",
      "segment": "Pediatric dosing - weight-based math, safe range",
      "format": "Lecture + 2 calculations"
    },
    {
      "minutes": "43-51",
      "segment": "Safe med admin - 10 rights, high-alert, LASA",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "51-57",
      "segment": "Synthesis pulling from H3, H4, H5",
      "format": "Practice items"
    },
    {
      "minutes": "57-60",
      "segment": "Close pharmacology block & frame clinical content",
      "format": "Lecture"
    }
  ],
  "practiceItems": {
    "pi_opioid_resp_depression": {
      "id": "pi_opioid_resp_depression",
      "stem": "A nurse is caring for a postoperative client who received hydromorphone 1 mg IV 20 minutes ago. Assessment reveals a respiratory rate of 6, oxygen saturation of 86%, and the client is difficult to arouse. What is the nurse's priority action?",
      "options": [
        {
          "key": "A",
          "text": "Increase the oxygen flow rate and continue to monitor."
        },
        {
          "key": "B",
          "text": "Reposition the client and stimulate to arouse."
        },
        {
          "key": "C",
          "text": "Administer naloxone 0.4 mg IV."
        },
        {
          "key": "D",
          "text": "Notify the provider to discontinue the opioid order."
        }
      ],
      "answer": "C",
      "rationale": "The patient is in opioid-induced respiratory depression - RR 6, O2 sat 86, difficult to arouse - so naloxone is the priority. Option A is wrong because increasing oxygen alone does not reverse the respiratory depression; the patient will continue to under-ventilate and accumulate CO2. Option B may help briefly but does not address the underlying mu-receptor binding. Option D is appropriate after the patient is stabilized, but notifying the provider is not the priority when respiratory drive is compromised. Administer naloxone, then monitor for resedation.",
      "cjmm": "take-actions",
      "reference": "Section 5 · Opioids"
    },
    "pi_magnesium_toxicity": {
      "id": "pi_magnesium_toxicity",
      "stem": "A nurse is caring for a client at 32 weeks gestation receiving IV magnesium sulfate for severe preeclampsia. Assessment reveals: BP 138/86, HR 84, RR 10, absent patellar reflexes, urine output 25 mL/hr for the past two hours, and oxygen saturation 94%. What is the nurse's priority action?",
      "options": [
        {
          "key": "A",
          "text": "Increase IV fluids and reassess in one hour."
        },
        {
          "key": "B",
          "text": "Discontinue the magnesium infusion and prepare to administer calcium gluconate."
        },
        {
          "key": "C",
          "text": "Notify the provider and continue the infusion at the current rate."
        },
        {
          "key": "D",
          "text": "Slow the magnesium infusion rate and reassess deep tendon reflexes."
        }
      ],
      "answer": "B",
      "rationale": "Absent reflexes plus RR 10 plus urine output under 30 mL/hr is magnesium toxicity, so the action is to discontinue the magnesium and administer the antidote, calcium gluconate. Option A is wrong because adding fluids does not undo neuromuscular depression. Option C is wrong because continuing the infusion while toxicity progresses risks respiratory arrest. Option D is only partially right - slowing isn't enough; the infusion must stop and the antidote must be ready.",
      "cjmm": "take-actions",
      "reference": "Section 5 · Magnesium sulfate"
    },
    "pi_oxytocin_tachysystole": {
      "id": "pi_oxytocin_tachysystole",
      "stem": "A laboring client receiving IV oxytocin develops contractions every 90 seconds lasting 90 seconds, with late decelerations on the fetal heart rate monitor. What is the nurse's FIRST action?",
      "options": [
        {
          "key": "A",
          "text": "Notify the provider."
        },
        {
          "key": "B",
          "text": "Administer oxygen at 10 L/min via face mask."
        },
        {
          "key": "C",
          "text": "Discontinue the oxytocin infusion."
        },
        {
          "key": "D",
          "text": "Reposition the client to the left lateral position."
        }
      ],
      "answer": "C",
      "rationale": "This is tachysystole - contractions every 90 seconds means more than 5 in 10 minutes - with late decelerations indicating fetal distress. The FIRST action is to stop the oxytocin, then reposition, then fluids, then oxygen, then notify (the SPFON sequence). Many students pick D - reposition - because it is also part of the response, but the oxytocin is causing the problem, so stop the cause first.",
      "cjmm": "take-actions",
      "reference": "Section 5 · Oxytocin"
    },
    "pi_peds_dose_per_dose": {
      "id": "pi_peds_dose_per_dose",
      "stem": "A child weighs 33 lb. The order is for a medication at 10 mg/kg/dose. How many milligrams should the nurse administer per dose?",
      "options": [
        {
          "key": "A",
          "text": "33 mg"
        },
        {
          "key": "B",
          "text": "73 mg"
        },
        {
          "key": "C",
          "text": "150 mg"
        },
        {
          "key": "D",
          "text": "330 mg"
        }
      ],
      "answer": "C",
      "rationale": "Step one is to convert pounds to kilograms: 33 ÷ 2.2 = 15 kg. Step two is to multiply weight by the dose: 15 kg × 10 mg/kg = 150 mg/dose. The math errors usually come from skipping step one (the lb-to-kg conversion). Option D (330 mg) results from multiplying the weight in pounds by the dose without converting; the other options reflect related conversion mistakes.",
      "cjmm": "take-actions",
      "reference": "Section 5 · Pediatric dosing"
    },
    "pi_peds_safe_range": {
      "id": "pi_peds_safe_range",
      "stem": "A child weighs 22 kg. The provider has ordered amoxicillin 250 mg every 8 hours. The safe range for this indication is 25-50 mg/kg/day. Is the ordered dose safe, and what should the nurse do?",
      "options": [
        {
          "key": "A",
          "text": "The dose is below the safe range; hold and clarify with the provider."
        },
        {
          "key": "B",
          "text": "The dose is within the safe range; administer the medication."
        },
        {
          "key": "C",
          "text": "The dose exceeds the safe range; hold and clarify with the provider."
        },
        {
          "key": "D",
          "text": "The dose exceeds the safe range; round down and administer."
        }
      ],
      "answer": "B",
      "rationale": "Step one: 250 mg every 8 hours is 3 doses/day, so 250 × 3 = 750 mg/day ordered. Step two: the safe range for this child is 22 kg × 25 = 550 mg/day (low end) and 22 kg × 50 = 1100 mg/day (high end), so 550-1100 mg/day. Step three: 750 mg falls between 550 and 1100, so the dose is safe and the nurse gives the medication. If a dose ever exceeds the upper limit (for example 1500 mg/day in this child), the action is to hold and clarify - never to round down or give partial doses (which is why D is wrong even when a dose is unsafe).",
      "cjmm": "analyze-cues",
      "reference": "Section 5 · Pediatric dosing"
    },
    "pi_telephone_order_readback": {
      "id": "pi_telephone_order_readback",
      "stem": "A nurse receives a telephone order from a provider for the client in room 412: \"morphine 4 milligrams IV every 4 hours as needed for pain.\" Which action by the nurse demonstrates safe practice?",
      "options": [
        {
          "key": "A",
          "text": "Document the order and administer at the next scheduled time."
        },
        {
          "key": "B",
          "text": "Repeat the order to the provider, including drug, dose, route, and frequency, before confirming."
        },
        {
          "key": "C",
          "text": "Ask the provider to enter the order electronically before administering."
        },
        {
          "key": "D",
          "text": "Administer the first dose immediately and document afterward."
        }
      ],
      "answer": "B",
      "rationale": "Read-back and verify for telephone and verbal orders is a Joint Commission requirement and a core safety standard. Option A skips the verification step. Option C is a stalling tactic that could be appropriate in non-urgent situations, but it does not address the immediate verbal-order safety practice. Option D may be acceptable in emergencies, but the read-back must still occur. Option B captures the right framework - say it back to confirm - and the same standard applies to critical lab values, transfusion verification, and many other high-risk communications.",
      "cjmm": "take-actions",
      "reference": "Section 5 · Safe medication administration"
    }
  },
  "segments": [
    {
      "id": "recap-and-frame",
      "minutes": "0-3",
      "title": "Recap & Frame the Close of Pharmacology",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Welcome to Hour 5 - this is the last pharmacology hour. After today, the bootcamp pivots: we move into clinical content, starting with labs, then organ systems, then OB and peds and psych and management of care. The heavy drug content closes today, so this hour is about finishing strong and tying the block together."
        },
        {
          "kind": "p",
          "text": "Let's recite the ten name roots from Hours 3 and 4 out loud: -olol, -pril, -sartan, -dipine, -statin, -xaban, -gatran, -gliptin, -gliflozin, -glutide. If any of those still don't fire off instantly, tonight is the night to fix it - these roots are the scaffold for everything we built in the cardiac, anticoagulant, and diabetes hours."
        },
        {
          "kind": "p",
          "text": "Today we cover the drugs that don't fit a clean name root: opioids; NSAIDs and acetaminophen; magnesium sulfate; oxytocin; and tocolytics. On top of those drug classes we add pediatric dosing math and the cross-cutting topic of safe medication administration - the ten rights, high-alert meds, and look-alike/sound-alike pairs. After this hour, the bootcamp shifts from drugs to clinical content."
        },
        {
          "kind": "list",
          "items": [
            "-olol",
            "-pril",
            "-sartan",
            "-dipine",
            "-statin",
            "-xaban",
            "-gatran",
            "-gliptin",
            "-gliflozin",
            "-glutide"
          ]
        }
      ]
    },
    {
      "id": "opioids",
      "minutes": "3-13",
      "title": "Opioids - Agents, Monitoring, Naloxone, PCA",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Opioids are the most important medication class on a postoperative or oncology floor, and one of the most heavily tested categories on the NCLEX. You need to recognize the major agents on sight: morphine; hydromorphone (brand Dilaudid), about five to seven times more potent than morphine; and fentanyl, about 100 times more potent than morphine, used IV for procedural sedation and as a transdermal patch for chronic pain."
        },
        {
          "kind": "p",
          "text": "Continuing the agent list: oxycodone - alone as OxyContin or combined with acetaminophen as Percocet; hydrocodone - usually combined with acetaminophen as Vicodin or Norco; codeine - a prodrug that is variably metabolized; tramadol - an atypical opioid with serotonergic activity; meperidine - known in the UK and Commonwealth as pethidine; and methadone - long half-life, used in chronic pain and opioid use disorder."
        },
        {
          "kind": "h",
          "text": "Mechanism"
        },
        {
          "kind": "p",
          "text": "All opioids are mu-receptor agonists. They bind to mu receptors in the central nervous system and produce analgesia through supraspinal and spinal action. Unfortunately, that same receptor is responsible for almost all of the side effects - the relief and the danger ride on the same target."
        },
        {
          "kind": "h",
          "text": "Adverse effects - shared by all opioids"
        },
        {
          "kind": "p",
          "text": "Memorize this shared list. Respiratory depression is the killer - it slows breathing and can lead to apnea and death. Constipation is universal, so every patient on opioids needs a bowel regimen - a stool softener plus a stimulant laxative - started at the same time as the opioid; do not wait for constipation to develop. The rest of the cluster is sedation; nausea and vomiting, especially with the first doses; pruritus (itching, especially with morphine, from histamine release - not a true allergy); urinary retention; and miosis, the pinpoint pupils that are a classic finding of opioid effect."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Hold parameter: respiratory rate",
          "text": "Hold the opioid and notify the provider for a respiratory rate below 10 (some institutions use 12 - check facility policy). Respiratory rate is the canary, and declining RR precedes arrest. Watch the trend, not just the snapshot: a patient at 16 dropping to 12 to 10 is in trouble even if each reading is technically above some threshold. Trend beats snapshot - recall Hour 2."
        },
        {
          "kind": "h",
          "text": "Special opioids to know"
        },
        {
          "kind": "p",
          "text": "Meperidine - also called pethidine in the UK and Commonwealth - should be avoided in elderly patients and in patients with renal impairment, because the metabolite normeperidine accumulates and causes seizures. Most US hospitals have moved away from meperidine entirely except for specific indications such as post-anesthetic shivering."
        },
        {
          "kind": "p",
          "text": "Tramadol is an atypical opioid with serotonergic activity, so combining it with an SSRI can cause serotonin syndrome - recall Hour 4. The classic vignette is a patient already on an antidepressant who gets tramadol postoperatively and develops the serotonin triad. The NCLEX loves this pattern."
        },
        {
          "kind": "p",
          "text": "Methadone has a very long half-life - 8 to 59 hours, sometimes longer - and is used for chronic pain and for opioid use disorder maintenance. It causes QT prolongation, and dose escalations must be slow precisely because of that long half-life."
        },
        {
          "kind": "p",
          "text": "The fentanyl transdermal patch is for chronic, stable pain - never acute. It reaches steady state slowly, taking 12 to 24 hours to reach therapeutic levels after a new patch is applied. Removed patches are still loaded with opioid, so proper disposal matters. Fever and external heat can accelerate absorption from the patch and cause overdose - counsel patients about heating pads and hot baths."
        },
        {
          "kind": "h",
          "text": "Antidote - naloxone"
        },
        {
          "kind": "p",
          "text": "Naloxone (brand Narcan) is the antidote. It can be given IV, IM, subcutaneously, or intranasally. It is a pure mu antagonist and reverses respiratory depression within minutes. Typical initial dosing is 0.4-2 mg IV/IM/SC, with intranasal at 4 mg; titrate to effect."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Naloxone outlasted by the opioid",
          "text": "Naloxone has a short half-life - only 30 to 90 minutes - and most opioids outlast it. After you reverse an overdose, the patient can re-sedate when the naloxone wears off, so repeat dosing is often required (in some cases a naloxone infusion). Monitor continuously for resedation and redose as needed."
        },
        {
          "kind": "p",
          "text": "In opioid-dependent patients, naloxone precipitates acute withdrawal - agitation, sweating, nausea, abdominal cramps, piloerection, lacrimation. It is uncomfortable but rarely life-threatening. Titrate to respiratory effect, not to full reversal: the goal is breathing, not complete antagonism."
        },
        {
          "kind": "h",
          "text": "Patient-Controlled Analgesia (PCA)"
        },
        {
          "kind": "p",
          "text": "With PCA, the patient pushes a button to self-administer analgesia. A lockout interval - typically 6 to 10 minutes - prevents stacking doses. A PCA may have a basal rate plus on-demand doses, or on-demand only."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Only the patient pushes the button",
          "text": "The single most important PCA rule on the NCLEX: only the patient activates the PCA - never family, never the nurse pressing on the patient's behalf. This is called 'PCA by proxy,' and it kills patients. The whole safety logic of PCA is that a sedated patient can't push the button; the moment another person presses it, that safety is broken."
        }
      ],
      "practiceItemId": "pi_opioid_resp_depression"
    },
    {
      "id": "nsaids-and-acetaminophen",
      "minutes": "13-18",
      "title": "NSAIDs & Acetaminophen - Ceilings, Antidote, Reye",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "The NSAIDs to know are ibuprofen, naproxen, ketorolac (brand Toradol), celecoxib (brand Celebrex, a selective COX-2 inhibitor), and aspirin. The mechanism is COX inhibition: they inhibit COX enzymes, reducing prostaglandins, which blocks pain, inflammation, and fever."
        },
        {
          "kind": "h",
          "text": "Adverse effects"
        },
        {
          "kind": "p",
          "text": "Because prostaglandins protect the gastric mucosa, blocking their production strips that protection and causes GI ulceration and bleeding. NSAIDs also cause renal injury - especially in dehydrated patients and the elderly - and carry cardiovascular risk: NSAIDs other than aspirin increase the risk of MI and stroke. Finally, they cause sodium and water retention, which can worsen heart failure and hypertension."
        },
        {
          "kind": "p",
          "text": "Ketorolac (Toradol) is a powerful NSAID, often used parenterally or as a short oral course, with analgesic potency comparable to a small dose of morphine for some types of pain. Because of renal toxicity, it must be limited to 5 days."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "NSAID interactions and pregnancy",
          "text": "Do not combine NSAIDs with anticoagulants like warfarin or DOACs without close monitoring - the bleeding risk is additive. Also avoid NSAIDs with lithium (recall Hour 4): NSAIDs reduce renal lithium clearance and precipitate toxicity. And avoid NSAIDs in the third trimester of pregnancy because of the risk of premature closure of the ductus arteriosus."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Aspirin + children = Reye syndrome",
          "text": "Never give aspirin to children with a viral illness, especially chickenpox or influenza. Reye syndrome - encephalopathy and hepatic failure occurring after a viral illness - is the danger. Acetaminophen or ibuprofen is preferred instead. This is a classic NCLEX teaching point."
        },
        {
          "kind": "h",
          "text": "Acetaminophen (paracetamol)"
        },
        {
          "kind": "p",
          "text": "Acetaminophen is called paracetamol in the UK and Commonwealth - recall the UK-to-US drill in Hour 3. Its mechanism is poorly understood: it is a central analgesic and antipyretic with only a weak peripheral anti-inflammatory effect, which sets it apart from the NSAIDs."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Acetaminophen dose ceiling",
          "text": "4 grams per day in healthy adults, reduced to 3 grams per day in patients with liver disease, in the elderly, and in patients with chronic alcohol use. The danger is that acetaminophen hides in dozens of combination products - Percocet, Vicodin, Norco, NyQuil, DayQuil, cold and flu remedies. A patient taking Percocet five times a day plus over-the-counter Tylenol for fever can easily exceed 4 grams without realizing it. Always count acetaminophen across all sources."
        },
        {
          "kind": "p",
          "text": "Acetaminophen overdose is hepatotoxic. Normally the drug is metabolized through glucuronidation and sulfation, with a small amount going to the toxic metabolite NAPQI, which is neutralized by glutathione. In overdose, the safe pathways saturate, NAPQI accumulates, glutathione is depleted, and hepatocytes die. Without treatment, acute liver failure follows."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Antidote: N-acetylcysteine (NAC)",
          "text": "N-acetylcysteine (NAC, brand Acetadote), oral or IV, replenishes glutathione. It is most effective within 8 hours of overdose, still beneficial up to 24 hours, and sometimes given even later in selected cases. The Rumack-Matthew nomogram is used to assess severity based on the serum acetaminophen level and the time since ingestion."
        }
      ]
    },
    {
      "id": "magnesium-sulfate",
      "minutes": "18-25",
      "title": "Magnesium Sulfate - Preeclampsia, DTRs, Antidote",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Magnesium sulfate is the single most heavily tested OB medication. If you remember nothing else about OB pharmacology, remember magnesium. It has two main uses: number one, seizure prevention in preeclampsia and treatment in eclampsia - this is the primary indication; and number two, fetal neuroprotection in preterm labor under 32 weeks gestation. It was historically also used as a tocolytic, but that role has diminished."
        },
        {
          "kind": "p",
          "text": "Mechanism: magnesium antagonizes calcium at the neuromuscular junction. It stabilizes neurons, raising the seizure threshold, and it relaxes smooth muscle, including the uterus."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Therapeutic level 4-7 mEq/L",
          "text": "The therapeutic level for OB use is 4 to 7 milliequivalents per liter (sources vary slightly). Above 8 is toxic. Above 12 is dangerous - respiratory and cardiac arrest. Memorize 4 to 7."
        },
        {
          "kind": "h",
          "text": "Toxicity signs - in order of appearance"
        },
        {
          "kind": "p",
          "text": "Memorize this sequence, because the order matters - the test will ask which sign appears first. This is one of the very few segments where memorizing an ordered list is mandatory rather than illustrative."
        },
        {
          "kind": "list",
          "items": [
            "Loss of deep tendon reflexes - the FIRST sign. The patellar (knee-jerk) reflex is checked every 1-2 hours during infusion. If reflexes diminish, suspect toxicity; if reflexes are absent, hold the magnesium and notify the provider.",
            "Respiratory depression - respiratory rate below 12 (memorize this number).",
            "Hypotension.",
            "Decreased level of consciousness - drowsiness, confusion, somnolence.",
            "Decreased urine output - below 30 mL/hr. Because magnesium is renally excreted, falling urine output causes magnesium to accumulate and toxicity to worsen."
          ]
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Antidote: calcium gluconate at the bedside",
          "text": "Calcium gluconate - 10% solution, 10 mL IV slow push - is the antidote. It must be at the bedside whenever magnesium is infusing. If you are caring for a magnesium patient and there is no calcium gluconate in the room, that is a safety problem to fix immediately. This point is testable."
        },
        {
          "kind": "h",
          "text": "Required monitoring and dosing"
        },
        {
          "kind": "p",
          "text": "During a magnesium infusion, monitor blood pressure; heart rate; respiratory rate (every hour at minimum); deep tendon reflexes (every 1-2 hours); urine output (measured hourly, threshold 30 mL/hr); oxygen saturation; and fetal heart rate if antepartum or intrapartum. If a loading dose is being given, monitoring is continuous."
        },
        {
          "kind": "p",
          "text": "Dosing: the loading dose is typically 4 to 6 grams IV over 15 to 30 minutes, followed by a maintenance infusion of 1 to 2 grams per hour."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Magnesium crosses the placenta",
          "text": "If magnesium is given before delivery for neuroprotection, it crosses the placenta and the neonate may have respiratory depression and hypotonia at birth. Alert the pediatrics team at delivery - the neonate may need brief respiratory support."
        }
      ],
      "practiceItemId": "pi_magnesium_toxicity"
    },
    {
      "id": "oxytocin",
      "minutes": "25-31",
      "title": "Oxytocin - Induction, Augmentation, PPH",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Oxytocin (brand Pitocin) is a synthetic version of the posterior pituitary hormone that drives uterine contractions and milk let-down. It has three indications: labor induction - starting labor that has not begun; labor augmentation - strengthening labor that has begun but is inadequate; and postpartum hemorrhage management - driving uterine contraction after delivery to stop bleeding."
        },
        {
          "kind": "h",
          "text": "Administration during labor"
        },
        {
          "kind": "p",
          "text": "Always give oxytocin via an infusion pump - this is a high-alert medication. Always run it on a secondary line, piggybacked into a primary IV with crystalloid fluid. The reason for the secondary line is critical: if you need to stop the oxytocin urgently, you turn off the secondary and the primary continues to flow, maintaining IV access and hydration. The starting dose is typically 1 to 2 milliunits per minute, titrated up every 15 to 30 minutes based on the contraction pattern."
        },
        {
          "kind": "h",
          "text": "Risks"
        },
        {
          "kind": "p",
          "text": "The major risks are tachysystole - more than five contractions in ten minutes averaged over thirty minutes; uterine hyperstimulation; uterine rupture, especially in patients with a prior cesarean; fetal heart rate abnormalities; and water intoxication, because oxytocin has antidiuretic-hormone-like activity at high doses."
        },
        {
          "kind": "p",
          "text": "Discontinue oxytocin for tachysystole, recurrent late decelerations, prolonged decelerations, a category III fetal heart rate tracing, suspected uterine rupture, or maternal hypotension or distress."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "SPFON - the response to tachysystole / fetal distress",
          "text": "Memorize the sequence: STOP the oxytocin; POSITION the mother in left lateral; FLUIDS - increase the primary IV rate; OXYGEN - face mask at 10 liters per minute; NOTIFY the provider. The mnemonic is Stop-Position-Fluid-Oxygen-Notify (SPFON). 'Stop the oxytocin first' is universal and the single most testable point."
        },
        {
          "kind": "h",
          "text": "Postpartum hemorrhage and contraindications"
        },
        {
          "kind": "p",
          "text": "Postpartum hemorrhage dosing is different from labor dosing: typically 10 to 40 units in 1 liter of crystalloid IV, with the rate adjusted to clinical response, or 10 units IM. Oxytocin is the first-line uterotonic for uterine atony after delivery."
        },
        {
          "kind": "p",
          "text": "Contraindications to oxytocin for induction or augmentation include prior classical cesarean (the vertical uterine incision is at high risk for rupture), active genital herpes, placenta previa, transverse fetal lie, cord prolapse, and prior uterine rupture. Some of these are absolute and some are relative - but all are testable."
        }
      ],
      "practiceItemId": "pi_oxytocin_tachysystole"
    },
    {
      "id": "tocolytics-and-antenatal-steroids",
      "minutes": "31-35",
      "title": "Tocolytics & Antenatal Corticosteroids",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Tocolytics are medications used to delay preterm labor - but only briefly. The goal is rarely to stop labor permanently; it is to buy roughly 48 hours so that antenatal corticosteroids can be given and the mother can be transferred to a center with appropriate neonatal care."
        },
        {
          "kind": "h",
          "text": "The tocolytic agents"
        },
        {
          "kind": "p",
          "text": "Terbutaline (brand Brethine) is a beta-2 agonist used off-label for tocolysis. Maternal side effects include tachycardia, tremor, hyperglycemia, and pulmonary edema. The FDA has a black box warning against prolonged use beyond 48 to 72 hours because of maternal cardiac events - short-term use only."
        },
        {
          "kind": "p",
          "text": "Nifedipine is a calcium channel blocker (recall Hour 3 - a dihydropyridine, name root -dipine) used off-label for tocolysis. Side effects include maternal hypotension, headache, and flushing. Avoid combining nifedipine with magnesium sulfate because of additive cardiovascular effects."
        },
        {
          "kind": "p",
          "text": "Indomethacin is an NSAID used as a tocolytic typically before 32 weeks gestation. After 32 weeks, the risk of premature closure of the fetal ductus arteriosus rises sharply, so indomethacin is generally avoided."
        },
        {
          "kind": "p",
          "text": "Magnesium sulfate was historically common as a tocolytic, but the evidence for tocolytic efficacy is limited. Its current primary OB use for preterm labor is fetal neuroprotection - administered under 32 weeks gestation to reduce the neonate's cerebral palsy risk."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Antenatal corticosteroids: 24-34 weeks",
          "text": "Betamethasone or dexamethasone - two intramuscular doses 24 hours apart - are given between 24 and 34 weeks gestation (with extension to 36 plus 6 days in some current protocols). They promote fetal lung surfactant production and reduce neonatal respiratory distress syndrome, intraventricular hemorrhage, and neonatal mortality. This is one of the most powerful interventions in modern obstetrics. If you remember one number from this segment: 24 to 34 weeks."
        }
      ]
    },
    {
      "id": "pediatric-dosing",
      "minutes": "35-43",
      "title": "Pediatric Dosing - Weight-Based Math, Safe Range",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Pediatric dosing is the math hour-within-the-hour. Pediatric doses are always weight-based - milligrams per kilogram. Body surface area is used in chemotherapy and a few other contexts, but weight-based is the default. UK-trained nurses who already work in kilograms have a head start on the conversion step."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Weight conversion: divide pounds by 2.2",
          "text": "US charts sometimes record weight in pounds and sometimes in kilograms, and the NCLEX may give either. The conversion is pounds ÷ 2.2 = kilograms. Memorize 2.2. The biggest learner failure mode in pediatric math is skipping this unit-conversion step - show it explicitly every time."
        },
        {
          "kind": "h",
          "text": "The safe dose range concept"
        },
        {
          "kind": "p",
          "text": "Every pediatric order has a published safe range, usually expressed as mg per kg per dose or mg per kg per day. The nurse's job is to check the order against the safe range: if the order is within range, give it; if the order is outside range, hold and clarify. The NCLEX loves to give you an order that exceeds the maximum - the right answer is never to give the unsafe dose; the right answer is to question."
        },
        {
          "kind": "h",
          "text": "Calculation one - mg per dose"
        },
        {
          "kind": "p",
          "text": "The child weighs 33 pounds; the order is 10 mg per kg per dose; how many milligrams per dose? Step one - convert pounds to kilograms: 33 ÷ 2.2 = 15, so the child weighs 15 kilograms. Step two - multiply weight by the dose: 15 kg × 10 mg/kg = 150 mg. The dose is 150 milligrams per dose. It is simple, but the math errors usually come from skipping step one."
        },
        {
          "kind": "h",
          "text": "Calculation two - safe-dose verification"
        },
        {
          "kind": "p",
          "text": "The child weighs 22 kilograms; the provider has ordered amoxicillin 250 milligrams every 8 hours; the safe range for this indication is 25 to 50 mg per kg per day; is the dose safe? Step one - calculate the daily dose ordered: 250 mg every 8 hours is 3 doses per day, so 250 × 3 = 750 mg per day. Step two - calculate the safe range for this child: low end 22 kg × 25 = 550 mg/day, high end 22 kg × 50 = 1100 mg/day, so the safe range is 550 to 1100 mg/day. Step three - compare: 750 mg falls between 550 and 1100, so the dose is safe; give the medication."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "The trap: hold and clarify",
          "text": "The NCLEX will sometimes give an ordered dose at, say, 1500 mg/day in this same child. 1500 is above the upper limit of 1100, so the dose is unsafe. The action is to hold the medication and contact the provider - not to round down, not to give partial doses. Hold and clarify."
        },
        {
          "kind": "h",
          "text": "Other pediatric pearls"
        },
        {
          "kind": "list",
          "items": [
            "Liquid medications: measure in milliliters using an oral syringe. Never use a household teaspoon - 1 teaspoon equals 5 mL, but household teaspoons vary widely, and oral syringes prevent this error.",
            "Rounding: pediatric doses are often small, so tenths and hundredths of a milliliter matter. Round per facility policy, and when in doubt, ask the pharmacy.",
            "Family teaching: parents must measure liquid medications using the device dispensed by the pharmacy - the oral syringe, dropper, or dosing cup that comes with the bottle. Teach return demonstration: have parents draw it up while you watch."
          ]
        }
      ],
      "practiceItemId": "pi_peds_dose_per_dose"
    },
    {
      "id": "safe-medication-administration",
      "minutes": "43-51",
      "title": "Safe Medication Administration - 10 Rights, High-Alert, LASA",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Safe medication administration is the framework that wraps everything else. It has three sections: the ten rights, high-alert medications, and look-alike/sound-alike drugs. You may have learned five or seven rights in nursing school - the list has expanded as patient-safety research has matured, and the current list is ten."
        },
        {
          "kind": "h",
          "text": "The ten rights"
        },
        {
          "kind": "list",
          "items": [
            "Right patient - use two identifiers (name and date of birth, or name and medical record number). NEVER the room number. Confirm verbally if the patient can speak, and against the wristband; if the patient is non-verbal, use the wristband plus a second identifier from the chart.",
            "Right medication - verify against the order and check the label three times (when pulling from storage, when preparing, and at the bedside).",
            "Right dose - confirm the dose against the order, confirm against the safe range, and confirm any calculations with a second nurse for high-risk drugs.",
            "Right route - oral, IV, IM, subcutaneous, sublingual, transdermal, rectal, topical, intrathecal. Some drugs have specific routes that must not be substituted, and wrong-route errors can be fatal.",
            "Right time - within 30 to 60 minutes of the scheduled time per facility policy. Some medications (antibiotics, anti-seizure drugs, antiarrhythmics, immunosuppressants) have narrow timing windows.",
            "Right documentation - document the administration immediately, including time, dose, route, site, and patient response. Never document before giving - that is chart fraud.",
            "Right reason - know the indication. If you cannot explain why the patient is receiving this medication, stop and find out.",
            "Right response - evaluate the patient's response (pain rating before and after an analgesic, blood pressure before and after an antihypertensive, glucose before insulin) and document it.",
            "Right to refuse - a competent patient may refuse any medication. Document the refusal, the patient's stated reason if given, the teaching provided about the consequence, and notification of the provider.",
            "Right education - the patient understands what they are taking, why, and what to watch for. Teach-back, where the patient explains the medication in their own words, is best practice."
          ]
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Three checks",
          "text": "Check at three points: when pulling from storage, when preparing, and at the bedside before administration. These are three independent checks - not three checks of the same step. Verify the label, the order, and the patient at every check."
        },
        {
          "kind": "h",
          "text": "High-alert medications"
        },
        {
          "kind": "p",
          "text": "High-alert medications are drugs the Institute for Safe Medication Practices (ISMP) identifies as having a high risk of significant patient harm when used in error. For most of these, the standard practice is an independent double-check by two registered nurses."
        },
        {
          "kind": "list",
          "items": [
            "Anticoagulants - especially IV heparin (and warfarin).",
            "Insulin - especially IV and concentrated formulations.",
            "Opioids - especially IV.",
            "Concentrated electrolytes - potassium chloride above a certain concentration, hypertonic (hypertonic) saline, and magnesium sulfate IV.",
            "Chemotherapy.",
            "Neuromuscular blocking agents.",
            "IV adrenergic agonists - like epinephrine and norepinephrine."
          ]
        },
        {
          "kind": "h",
          "text": "Look-alike/sound-alike (LASA) drugs"
        },
        {
          "kind": "p",
          "text": "LASA drugs are name pairs that look similar in writing or sound similar in speech. These are the high-yield pairs you must know - same letters or sounds, but different drug classes and different effects."
        },
        {
          "kind": "list",
          "items": [
            "Hydroxyzine (antihistamine/anxiolytic - brand Vistaril or Atarax) vs. hydralazine (antihypertensive vasodilator). Same first three letters, different class.",
            "Celebrex (celecoxib, an NSAID) vs. Celexa (citalopram, an SSRI) vs. Cerebyx (fosphenytoin, an anticonvulsant). Three drugs, three classes.",
            "Heparin (anticoagulant) vs. Hespan (hetastarch, a volume expander).",
            "Humalog (rapid-acting insulin lispro) vs. Humulin (brand of Regular or NPH).",
            "Lantus (glargine, long-acting) vs. Lente (older intermediate-acting insulin, now rare).",
            "Lasix (furosemide, a loop diuretic) vs. Luvox (fluvoxamine, an SSRI).",
            "Clonidine (antihypertensive and ADHD adjunct) vs. clonazepam (a benzodiazepine). Same first five letters."
          ]
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Tall man lettering",
          "text": "Tall man lettering mixes capital letters to highlight differences - hydrOXYzine vs. hydrALAzine, predniSONE vs. prednisoLONE. Federal and institutional standards have adopted tall man lettering to reduce LASA errors. Watch for it on charts and computer screens."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Verbal/telephone orders and reconciliation",
          "text": "Read back and verify verbal and telephone orders - a Joint Commission requirement. The provider gives the order, the nurse writes it down, the nurse reads it back word for word (drug, dose, route, frequency), and the provider confirms or corrects before it is entered. Medication reconciliation happens at every transition of care - admission, transfer, and discharge - comparing what the patient was taking with what is now ordered. Reconciliation is where most medication errors are found, and also where most are made."
        }
      ],
      "practiceItemId": "pi_telephone_order_readback"
    },
    {
      "id": "synthesis-warfarin-nsaid",
      "minutes": "51-54",
      "title": "Synthesis - Warfarin + NSAID Bleeding Risk",
      "format": "Case",
      "blocks": [
        {
          "kind": "p",
          "text": "A client with atrial fibrillation has been taking warfarin daily. The client now reports new lower back pain and has been taking over-the-counter ibuprofen for the past four days. Today the INR is 5.8 and the client reports a small amount of blood in the urine. Which finding is the MOST concerning?"
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Reasoning",
          "text": "Warfarin plus an NSAID is a major bleeding interaction, and three problems compound here. One - NSAIDs increase bleeding risk through platelet inhibition and gastric mucosal damage. Two - NSAIDs may displace warfarin from albumin binding and elevate the INR. Three - the patient now has an INR of 5.8, well above the therapeutic 2 to 3 range, and is bleeding. The most concerning finding is the combination of the supratherapeutic INR plus active bleeding (hematuria) - this is a bleeding emergency. Hold the warfarin, reverse it with vitamin K, counsel the patient to stop the NSAID, and identify a safer pain option. This synthesizes Hour 3 anticoagulation with Hour 5 NSAID interactions."
        }
      ]
    },
    {
      "id": "synthesis-oxytocin-spfon",
      "minutes": "54-57",
      "title": "Synthesis - Oxytocin Late Decelerations (SPFON)",
      "format": "Case",
      "blocks": [
        {
          "kind": "p",
          "text": "A client at 39 weeks gestation is receiving IV oxytocin to augment labor. The nurse observes contractions every 1.5 minutes lasting 80 seconds, and the fetal heart rate tracing shows late decelerations with each contraction. List the nurse's actions in correct order."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Correct sequence - SPFON",
          "text": "Stop the oxytocin. Position the mother in left lateral. Fluids - increase the primary IV rate. Oxygen - face mask at 10 liters per minute. Notify the provider. This is the standard nursing response to tachysystole with fetal distress, and 'stop the oxytocin first' is the universal, most testable point."
        }
      ]
    },
    {
      "id": "close-and-transition",
      "minutes": "57-60",
      "title": "Close & Transition to Clinical Content",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "The pharmacology block is complete - three hours, ten name roots, dozens of drugs, and an architecture you can apply to any drug you encounter going forward. The three structures to carry with you are the six-field drug template, the four priority frameworks from Hour 2, and the ten rights of medication administration. With those three structures in your head, you can break down any pharmacology item the NCLEX gives you. The heavy drug content is behind you; from here we apply it."
        },
        {
          "kind": "p",
          "text": "Homework before Hour 6: fifty mixed pharmacology questions, with a deliberate focus on the categories where your journal shows your weakest patterns. Pull out your journal, look at the topics most often missed, and bias your practice toward those. We are entering the personalization phase of the bootcamp - the questions you practice should match the gaps you have, not just the content of the most recent hour."
        },
        {
          "kind": "p",
          "text": "Hour 6 begins clinical content with lab values - the numbers. Electrolytes, ABGs, CBC, coagulation, BUN/creatinine, the liver panel, troponin, BNP, HbA1c, and therapeutic drug levels: the labs that drive almost every clinical decision on the NCLEX. We will memorize the critical values and what to do first when each one is abnormal. Bring your most recent practice question performance to Hour 6 - we will start to tailor."
        }
      ]
    }
  ]
};
