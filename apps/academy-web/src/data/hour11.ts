import type { Lesson } from "./lessonTypes";

/**
 * Section 11 - Neuro & Musculoskeletal. Auto-generated from the Florence Academy
 * bootcamp instructor script (expanded draft). Pending nurse-educator review.
 */
export const lesson: Lesson = {
  "meta": {
    "number": 11,
    "title": "Neuro & Musculoskeletal",
    "durationMin": 60,
    "audience": "Internationally educated nurses - Philippines, UK, Kenya, Ghana",
    "contentWeight": "Two high-yield organ systems condensed into one hour, dense with top-frequency physiological-adaptation testables",
    "tagline": "Two organ systems, one hour: master the counterintuitive rules of stroke BP, autonomic dysreflexia, and compartment syndrome that the NCLEX loves to test."
  },
  "objectives": [
    "Differentiate ischemic from hemorrhagic stroke, apply FAST/BEFAST recognition, identify the tPA window and contraindications, and manage blood pressure correctly for each stroke type.",
    "Recognize signs of increased intracranial pressure including Cushing's triad and apply the ICP nursing care bundle.",
    "Apply seizure precautions and manage status epilepticus with the benzodiazepine-first sequence.",
    "Recognize autonomic dysreflexia in spinal cord injury at T6 and above and apply the three-step intervention.",
    "Differentiate Guillain-Barré from myasthenia gravis, and distinguish myasthenic from cholinergic crisis.",
    "Recognize compartment syndrome by the 5 P's with pain on passive stretch as the earliest sign.",
    "Recognize fat embolism syndrome by its classic triad and apply hip replacement precautions.",
    "Walk through a six-item NGN unfolding case study on acute ischemic stroke."
  ],
  "timing": [
    {
      "minutes": "0-3",
      "segment": "Recap & frame: neuro + MSK in one hour",
      "format": "Lecture"
    },
    {
      "minutes": "3-13",
      "segment": "Stroke - recognition, tPA, BP management",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "13-20",
      "segment": "Increased ICP - Cushing's triad, management",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "20-26",
      "segment": "Seizures & status epilepticus",
      "format": "Lecture"
    },
    {
      "minutes": "26-32",
      "segment": "SCI & autonomic dysreflexia",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "32-37",
      "segment": "Guillain-Barré vs myasthenia gravis",
      "format": "Lecture"
    },
    {
      "minutes": "37-44",
      "segment": "Fractures, compartment syndrome, fat embolism",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "44-50",
      "segment": "Hip replacement, osteoporosis, rheumatology",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "50-56",
      "segment": "NGN unfolding case - acute stroke",
      "format": "Case walkthrough"
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
    "pi_tpa_inr_contraindication": {
      "id": "pi_tpa_inr_contraindication",
      "stem": "A 72-year-old client with atrial fibrillation presents at 1100 with sudden right-sided weakness and aphasia. Last known well 0900. BP 178/96, HR 92, SpO2 98%. CT shows no hemorrhage. Client takes warfarin, today's INR 2.6. Is the client a candidate for IV tPA?",
      "options": [
        {
          "key": "A",
          "text": "Yes - within the 4.5 hour window."
        },
        {
          "key": "B",
          "text": "Yes - once BP is lowered."
        },
        {
          "key": "C",
          "text": "No - INR 2.6 is a contraindication."
        },
        {
          "key": "D",
          "text": "No - atrial fibrillation is a contraindication."
        }
      ],
      "answer": "C",
      "rationale": "Therapeutic anticoagulation with an INR above 1.7 contraindicates tPA, and an INR of 2.6 makes thrombolysis unsafe because of the bleeding risk. The patient is within the 4.5-hour window and the BP could be managed, so neither of those is the disqualifier, and atrial fibrillation is not itself a contraindication - in fact it is the likely embolic source. The patient may still be a candidate for mechanical thrombectomy.",
      "cjmm": "analyze-cues",
      "reference": "Section 11 · Stroke - tPA contraindications"
    },
    "pi_cushings_triad_tbi": {
      "id": "pi_cushings_triad_tbi",
      "stem": "A nurse is caring for a client with severe TBI. Assessment reveals BP 168/72 (was 138/82 one hour ago), HR 52, RR 8 irregular, unilateral right pupil dilation. What is the priority interpretation?",
      "options": [
        {
          "key": "A",
          "text": "Side effects of mannitol."
        },
        {
          "key": "B",
          "text": "Cushing's triad indicating impending herniation."
        },
        {
          "key": "C",
          "text": "Expected response to sedation."
        },
        {
          "key": "D",
          "text": "Improving neurologic status."
        }
      ],
      "answer": "B",
      "rationale": "This is Cushing's triad: hypertension with a widening pulse pressure (the pulse pressure climbed from 56 to 96 as the systolic rose while the diastolic dropped), bradycardia, and irregular respirations. Add the unilateral dilated pupil suggesting uncal herniation and the picture is a late, ominous sign of impending herniation that demands immediate intervention - not a medication side effect, not sedation, and certainly not improvement.",
      "cjmm": "analyze-cues",
      "reference": "Section 11 · Increased ICP - Cushing's triad"
    },
    "pi_autonomic_dysreflexia_first_action": {
      "id": "pi_autonomic_dysreflexia_first_action",
      "stem": "A nurse cares for a client with T4 spinal cord injury two months post-injury. Client suddenly reports pounding headache. BP 218/124, HR 48, face/neck flushing, lower extremity pallor. FIRST action?",
      "options": [
        {
          "key": "A",
          "text": "IV hydralazine."
        },
        {
          "key": "B",
          "text": "Supine position."
        },
        {
          "key": "C",
          "text": "Sit upright and assess for bladder distension."
        },
        {
          "key": "D",
          "text": "Notify the provider."
        }
      ],
      "answer": "C",
      "rationale": "A T4 injury is at or above T6, so this severe hypertension with pounding headache, flushing above the lesion, and pallor below is classic autonomic dysreflexia. The first action is to sit the patient upright - NOT supine, which worsens the hypertension - and immediately search for the most common trigger, bladder distension. Hydralazine and provider notification come only after positioning and the trigger search.",
      "cjmm": "take-actions",
      "reference": "Section 11 · SCI & autonomic dysreflexia"
    },
    "pi_compartment_syndrome_cast": {
      "id": "pi_compartment_syndrome_cast",
      "stem": "Client with tibial fracture in long leg cast applied 6 hours ago reports increasing pain rated 10/10 despite IV morphine, especially when nurse dorsiflexes the foot. Toes pale and cool. Priority action?",
      "options": [
        {
          "key": "A",
          "text": "Additional morphine and reassess in 1 hour."
        },
        {
          "key": "B",
          "text": "Elevate above heart and apply ice."
        },
        {
          "key": "C",
          "text": "Notify provider immediately - cast may need bivalving or removal."
        },
        {
          "key": "D",
          "text": "Loosen inner padding."
        }
      ],
      "answer": "C",
      "rationale": "Pain out of proportion to the injury, pain on passive stretch (dorsiflexing the foot), plus pallor and a cool extremity are compartment syndrome until proven otherwise. This is time-critical - irreversible nerve and muscle injury can occur within 4 to 6 hours - so the cast must come off and the provider must be notified immediately. More morphine simply masks the cardinal warning sign, and elevation or ice does not relieve the compartment pressure.",
      "cjmm": "take-actions",
      "reference": "Section 11 · Compartment syndrome - 5 P's"
    },
    "pi_thr_precautions_teaching": {
      "id": "pi_thr_precautions_teaching",
      "stem": "A 76-year-old woman is being discharged after posterior approach THR. Which statement indicates need for further teaching?",
      "options": [
        {
          "key": "A",
          "text": "I will use the elevated toilet seat."
        },
        {
          "key": "B",
          "text": "I will cross my legs while sitting to maintain balance."
        },
        {
          "key": "C",
          "text": "I will use a long-handled shoehorn."
        },
        {
          "key": "D",
          "text": "I will sleep with the abductor pillow between my legs."
        }
      ],
      "answer": "B",
      "rationale": "Crossing the legs is adduction past midline, which violates posterior hip precautions and risks dislocation, so this statement signals the need for more teaching. The elevated toilet seat (avoids flexion past 90 degrees), the long-handled shoehorn (avoids bending forward), and the abductor pillow (keeps the leg from adducting) are all correct, safe practices.",
      "cjmm": "evaluate-outcomes",
      "reference": "Section 11 · Hip replacement precautions"
    }
  },
  "segments": [
    {
      "id": "frame-the-hour",
      "minutes": "0-3",
      "title": "Frame the Hour",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Welcome to Hour 11. We are condensing neurology and musculoskeletal into 60 minutes, and we are at the halfway mark of the clinical block. The architecture you have been building does not get set aside here - the priority frameworks from Hour 2, the labs from Hour 6, the cardiac patterns from Hour 7, and the respiratory patterns from Hour 8 all continue to apply. Keep that scaffolding in mind, because this hour leans on every piece of it."
        },
        {
          "kind": "p",
          "text": "Let me orient you to where the points are. The highest-yield testables this hour are stroke - the tPA window, the blood pressure targets, and FAST recognition; increased ICP - Cushing's triad and the management bundle; autonomic dysreflexia - the spinal cord injury emergency at T6 and above; the 5 P's of compartment syndrome with pain on passive stretch as the earliest sign; fat embolism and its classic triad; and hip replacement precautions. If you anchor those, you have captured most of what this section asks of you."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Backward references",
          "text": "This hour pulls forward earlier material: anticoagulation (Hour 3), magnesium (Hour 5), corticosteroids and osteoporosis (Hour 4), and antiepileptic drug levels (Hour 6). When you see those threads, recognize that the cumulative architecture is doing its job."
        }
      ]
    },
    {
      "id": "stroke",
      "minutes": "3-13",
      "title": "Stroke - Recognition, tPA, and BP Management",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Stroke comes in two big types - ischemic and hemorrhagic - and the distinction matters enormously because the treatments are different, sometimes flatly opposite. Getting the type right is the gateway to everything else, which is why imaging happens before any clot-dissolving drug is even considered."
        },
        {
          "kind": "h",
          "text": "The two types"
        },
        {
          "kind": "p",
          "text": "Ischemic stroke accounts for about 87 percent of all strokes. Its subtypes are thrombotic, from atherosclerosis building up in a vessel; embolic, often a clot thrown from atrial fibrillation - recall Hour 7, where the CHA2DS2-VASc score and anticoagulation exist precisely to prevent this; and lacunar, small subcortical infarcts driven by longstanding hypertension."
        },
        {
          "kind": "p",
          "text": "Hemorrhagic stroke is about 13 percent. It splits into intracerebral hemorrhage, often from chronic hypertension or anticoagulation, and subarachnoid hemorrhage, classically from a ruptured berry aneurysm. The subarachnoid bleed announces itself with the 'worst headache of life,' the 'thunderclap headache' - a phrase the exam uses as a signal."
        },
        {
          "kind": "h",
          "text": "Recognition and time"
        },
        {
          "kind": "p",
          "text": "Recognition runs on FAST - Face drooping, Arm weakness, Speech difficulty, Time to call 911. BEFAST extends it by adding Balance loss and Eye changes. These are the bedside and public-facing screens that get a stroke patient to the door fast."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Time is brain",
          "text": "Estimates suggest 1.9 million neurons die per minute in a major untreated stroke. The time of symptom onset - or last known well if the onset was unwitnessed - is the single most important historical data point, because it sets the entire treatment clock."
        },
        {
          "kind": "p",
          "text": "The initial workup is a fixed sequence: ABCs first; blood glucose immediately, because hypoglycemia can mimic a stroke perfectly; a non-contrast CT scan within minutes to differentiate ischemic from hemorrhagic before any thrombolytic is on the table; labs; an ECG; and the NIH Stroke Scale to quantify the deficit."
        },
        {
          "kind": "h",
          "text": "Ischemic stroke treatment"
        },
        {
          "kind": "p",
          "text": "For ischemic stroke, tPA - tissue plasminogen activator, alteplase - is given IV within 4.5 hours of symptom onset for eligible patients. Mechanical thrombectomy may be considered up to 24 hours from onset in large vessel occlusion when advanced imaging shows salvageable tissue. Antiplatelet aspirin is for non-tPA candidates, or it starts 24 hours after tPA - never alongside it in that first day."
        },
        {
          "kind": "p",
          "text": "The tPA contraindications cluster into major categories, and the exam tests them relentlessly. They are: hemorrhagic stroke on CT; recent major surgery or trauma; active internal bleeding; uncontrolled BP above 185/110; recent intracranial hemorrhage; coagulopathy or therapeutic anticoagulation - warfarin with an INR above 1.7, recent heparin, or a recent DOAC; and known intracranial pathology."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Therapeutic anticoagulation blocks tPA",
          "text": "Warfarin with INR above 1.7, recent heparin, or a recent DOAC contraindicates thrombolysis. A patient can be inside the time window and still be ineligible because their blood is already 'thinned' - that is a favorite trap."
        },
        {
          "kind": "h",
          "text": "Blood pressure - the counterintuitive rule"
        },
        {
          "kind": "p",
          "text": "Now blood pressure management, which is counterintuitive, important, and heavily testable. In ischemic stroke without tPA, we use permissive hypertension: generally do NOT lower the BP unless it climbs above approximately 220/120. The brain tissue surrounding the infarct survives on collateral circulation, and that collateral flow needs pressure - drop the BP and you worsen the ischemia."
        },
        {
          "kind": "p",
          "text": "Pre-tPA is the exception. Before giving tPA, the BP must be brought below 185/110, and you treat aggressively to get there with IV labetalol or nicardipine. For hemorrhagic stroke, the pressure is lowered more aggressively still, often to a target systolic below 140, because here high pressure feeds active bleeding."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Three BP-by-stroke-type rules, taught together",
          "text": "Ischemic without tPA - permissive hypertension, do not treat until ~220/120. Pre-tPA - must be below 185/110. Hemorrhagic - aggressive lowering, often systolic below 140. Many learners reflexively want to lower BP in every stroke; in untreated ischemic stroke that instinct is wrong."
        },
        {
          "kind": "h",
          "text": "Deficits by hemisphere and aftercare"
        },
        {
          "kind": "p",
          "text": "Deficits localize by hemisphere. A left hemisphere stroke produces right-sided weakness, plus aphasia - Broca's expressive or Wernicke's receptive - plus a cautious, anxious personality. A right hemisphere stroke produces left-sided weakness, plus hemispatial neglect, where the patient ignores the entire left side of the world, plus an impulsive personality."
        },
        {
          "kind": "p",
          "text": "Dysphagia screening before any PO intake is critical, because aspiration pneumonia is a leading cause of early stroke mortality. Use a bedside swallow screen, get a formal speech-language pathology evaluation if there is any concern, and keep the patient NPO until cleared. DVT prophylaxis also starts early: LMWH is preferred in ischemic stroke once hemorrhage has been excluded, while in acute hemorrhagic stroke you use mechanical prophylaxis only."
        }
      ],
      "practiceItemId": "pi_tpa_inr_contraindication"
    },
    {
      "id": "increased-icp",
      "minutes": "13-20",
      "title": "Increased Intracranial Pressure",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Increased intracranial pressure starts with the Monro-Kellie doctrine: the skull is a fixed container, so any increase in one of its contents - brain tissue, blood, or CSF - must be compensated for by a reduction in another. Beyond a certain threshold that compensation fails, and ICP rises sharply. That tipping-point behavior is why a patient can look stable and then deteriorate fast."
        },
        {
          "kind": "p",
          "text": "The causes are broad: traumatic brain injury, stroke (especially hemorrhagic), intracranial hemorrhage, tumor, meningitis or encephalitis, hydrocephalus, and severe metabolic derangements such as profound hyponatremia (recall Hour 6) and hepatic encephalopathy (recall Hour 10)."
        },
        {
          "kind": "h",
          "text": "Symptoms, earliest to latest"
        },
        {
          "kind": "p",
          "text": "Learn the symptoms in order from earliest to latest. Altered level of consciousness is the most sensitive early indicator - drowsiness, confusion, lethargy. Then headache, often worse in the morning from recumbent venous congestion overnight. Then projectile vomiting, classically without preceding nausea. Finally pupil changes - a unilateral dilated, fixed pupil suggests uncal herniation."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Cushing's triad is LATE",
          "text": "Cushing's triad is the late sign of impending herniation, not an early heads-up. Its three components are hypertension with a widening pulse pressure (systolic rises while diastolic stays or drops), bradycardia, and irregular respirations (Cheyne-Stokes or ataxic). When you see it, herniation may be imminent - the patient is in trouble now, and aggressive intervention is required immediately."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Two different Cushings",
          "text": "Do not confuse Cushing's triad - the late neurologic emergency here - with Cushing's syndrome, the cortisol-excess condition from Hour 9. Same name, completely different problem; learners mix these up constantly."
        },
        {
          "kind": "h",
          "text": "The management bundle"
        },
        {
          "kind": "p",
          "text": "The management bundle is a cluster of measures that all serve to lower or stabilize ICP. Elevate the head of bed to 30 degrees for venous drainage. Keep the neck midline - avoid flexion, which impedes jugular outflow, and avoid extreme rotation. Avoid Valsalva: no coughing, straining, or prolonged suctioning, and use stool softeners to prevent straining at stool. Maintain normothermia, because fever raises the brain's metabolic demand. Sedate as appropriate."
        },
        {
          "kind": "p",
          "text": "Two more pieces complete the bundle. Hyperosmolar therapy - mannitol or 3% hypertonic saline - pulls water out of the brain and into the bloodstream, reducing cerebral volume. And avoid hypercapnia, because CO2 is a cerebral vasodilator that will raise intracranial blood volume and worsen the pressure."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "CPP = MAP − ICP",
          "text": "Cerebral perfusion pressure equals mean arterial pressure minus intracranial pressure, and the goal is above 60 mmHg. A low CPP means cerebral ischemia, so when ICP climbs, perfusion to the brain falls unless MAP is supported."
        }
      ],
      "practiceItemId": "pi_cushings_triad_tbi"
    },
    {
      "id": "seizures",
      "minutes": "20-26",
      "title": "Seizures & Status Epilepticus",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Seizures divide into focal versus generalized. The emergency you must recognize is status epilepticus - continuous seizure activity for more than 5 minutes, or two or more seizures without recovery of consciousness between them. That definition is the trigger for aggressive treatment, so memorize the numbers."
        },
        {
          "kind": "h",
          "text": "Precautions and what to do during a seizure"
        },
        {
          "kind": "p",
          "text": "For at-risk patients, set up precautions in advance: padded side rails up, the bed in its lowest position, suction at the bedside, oxygen available, and IV access maintained. One thing you do NOT do is attempt to insert an oral airway during an active seizure."
        },
        {
          "kind": "list",
          "items": [
            "Protect from injury - clear the area around the patient.",
            "Do NOT physically restrain the patient - restraint causes fractures.",
            "Position side-lying when possible to protect the airway.",
            "Note the onset time and the seizure's characteristics, and time the duration.",
            "Do NOT put anything in the mouth - the patient cannot swallow their tongue, and tongue blades cause broken teeth and aspiration.",
            "Give oxygen as needed and do NOT leave the patient alone."
          ]
        },
        {
          "kind": "p",
          "text": "After the seizure comes the post-ictal phase: confusion, drowsiness, headache, and sometimes Todd paralysis, a transient focal weakness that can mimic stroke. Assess the airway, vital signs, neuro exam, level of consciousness, and glucose, and reassure and re-orient the patient as awareness returns."
        },
        {
          "kind": "h",
          "text": "Status epilepticus management"
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Benzodiazepine first",
          "text": "Step one of status epilepticus is always a benzodiazepine - IV lorazepam first-line (recall Hour 4: benzodiazepines bind GABA-A receptors). No IV access? Give IM midazolam or rectal diazepam. The benzodiazepine comes before the longer-acting drugs, every time."
        },
        {
          "kind": "p",
          "text": "Step two is a longer-acting anticonvulsant: fosphenytoin or phenytoin, valproate (recall the Hour 10 pancreatitis warning), or levetiracetam. Step three, for refractory status, is propofol or a barbiturate, often with intubation. Throughout, identify and treat the underlying cause - status is a symptom, not just an event."
        },
        {
          "kind": "p",
          "text": "Finally, know the long-term anticonvulsant therapeutic levels and their signature toxicities, which we first met in Hour 6. Phenytoin runs 10-20 (watch for gingival hyperplasia, ataxia, nystagmus). Carbamazepine runs 4-12 (bone marrow suppression, hyponatremia). Valproic acid runs 50-100 (hepatotoxicity, pancreatitis). Levetiracetam is monitored more for mood and behavior changes than for a serum level."
        }
      ]
    },
    {
      "id": "sci-autonomic-dysreflexia",
      "minutes": "26-32",
      "title": "Spinal Cord Injury & Autonomic Dysreflexia",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "In spinal cord injury, the level of injury - defined as the lowest spinal segment with preserved normal function - determines both functional capability and complication risk. The higher the lesion, the more function is lost and the greater the risk of life-threatening autonomic complications."
        },
        {
          "kind": "h",
          "text": "Key functional levels"
        },
        {
          "kind": "list",
          "items": [
            "C1-C3 - ventilator dependent for life; the phrenic nerve from C3-C5 supplies the diaphragm.",
            "C4 - diaphragm preserved but limited.",
            "C5 - shoulder shrug, elbow flexion, self-feeds with adaptive equipment.",
            "C6 - wrist extension, significant partial independence.",
            "C7 - triceps function, the major functional level for independent wheelchair living and transfers.",
            "C8-T1 - full hand function.",
            "T1-T6 - paraplegia with full upper body.",
            "T6 and above - autonomic dysreflexia risk."
          ]
        },
        {
          "kind": "h",
          "text": "Two shock syndromes"
        },
        {
          "kind": "p",
          "text": "Distinguish two shock syndromes that follow cord injury. Spinal shock is a clinical syndrome - a temporary loss of all reflexes and sensation below the injury with flaccid paralysis, lasting days to weeks. Neurogenic shock is a hemodynamic state from loss of sympathetic tone above T6: bradycardia despite hypotension, with warm and dry skin."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Neurogenic vs hypovolemic shock",
          "text": "Neurogenic shock is bradycardic with warm, dry skin - the opposite of hypovolemic shock, which is tachycardic with cold, clammy skin. Treatment of neurogenic shock is cautious fluids, vasopressors, and atropine for symptomatic bradycardia."
        },
        {
          "kind": "h",
          "text": "Autonomic dysreflexia"
        },
        {
          "kind": "p",
          "text": "Autonomic dysreflexia is the spinal cord injury emergency at T6 and above. Once spinal shock has resolved, a noxious stimulus below the level of injury triggers a massive sympathetic outflow that the descending inhibitory signals can no longer reach to dampen, so the blood pressure spikes dangerously."
        },
        {
          "kind": "p",
          "text": "The presentation is distinctive: severe hypertension, sometimes systolic above 200; a pounding headache; flushing, sweating, and warm skin ABOVE the level of injury; pallor and cool skin BELOW the injury; bradycardia from the baroreceptor reflex; nasal congestion; and anxiety. The most common triggers, in order, are bladder distension (number one - an overfilled bladder or a blocked catheter), bowel impaction (number two), pressure injury, tight clothing, and an ingrown toenail."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Three steps in order - sit up FIRST",
          "text": "Step one: SIT THE PATIENT UPRIGHT and lower the legs if possible - gravity drops the BP. This is counterintuitive for learners who think 'severe hypertension means lay them down' - that is wrong here. Step two: find and remove the trigger - bladder first (ensure flow, catheterize if needed), then bowel (manual disimpaction with lidocaine jelly), then check skin under clothing, dressings, and shoes. Step three: give a short-acting antihypertensive (nifedipine or hydralazine) if the BP remains dangerously high, and notify the provider."
        }
      ],
      "practiceItemId": "pi_autonomic_dysreflexia_first_action"
    },
    {
      "id": "gbs-vs-myasthenia",
      "minutes": "32-37",
      "title": "Guillain-Barré vs Myasthenia Gravis",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Guillain-Barré syndrome and myasthenia gravis both cause weakness and both can cause respiratory failure, but the mechanisms and patterns are different, and the exam wants you to tell them apart cleanly."
        },
        {
          "kind": "h",
          "text": "Guillain-Barré syndrome"
        },
        {
          "kind": "p",
          "text": "GBS is an acute inflammatory demyelinating polyneuropathy - an autoimmune attack on the myelin of peripheral nerves, usually following a viral or bacterial infection. Campylobacter jejuni gastroenteritis is the most common antecedent. The defining pattern is ASCENDING paralysis: it starts in the feet and moves upward, symmetrically, often with rapid progression, loss of deep tendon reflexes, and autonomic dysfunction in severe cases."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Watch the diaphragm in GBS",
          "text": "The feared complication is respiratory failure as the ascending paralysis reaches the diaphragm. Monitor vital capacity at the bedside - an FVC below 20 mL/kg or a rapid decline is concerning and may signal the need for intubation."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "GBS treatment - no steroids",
          "text": "Treat GBS with IVIG or plasmapheresis; they are equally effective. Steroids are NOT effective in GBS. Add supportive care, respiratory monitoring, DVT prophylaxis, and management of autonomic instability."
        },
        {
          "kind": "h",
          "text": "Myasthenia gravis"
        },
        {
          "kind": "p",
          "text": "Myasthenia gravis is also autoimmune, but here the antibodies are directed against the postsynaptic acetylcholine receptors at the neuromuscular junction. Its hallmark is muscle weakness that WORSENS with activity and IMPROVES with rest, with a diurnal variation - typically better in the morning and worse by evening. That fatigable pattern is what distinguishes MG."
        },
        {
          "kind": "p",
          "text": "Classic features include ptosis - a drooping eyelid, often the very first symptom - diplopia, and bulbar symptoms such as dysphagia, dysarthria, and facial weakness, with respiratory failure in severe cases. Treatment is pyridostigmine, an acetylcholinesterase inhibitor that increases ACh availability at the synapse, plus immunosuppression, IVIG or plasmapheresis for crisis, and thymectomy in selected patients."
        },
        {
          "kind": "h",
          "text": "Two MG crises"
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Myasthenic vs cholinergic crisis",
          "text": "Myasthenic crisis is from UNDER-medication or a precipitant (infection, surgery, or drugs like aminoglycosides and beta blockers - recall Hours 3 and 4): severe weakness and respiratory failure, treated with IVIG/plasmapheresis and intubation. Cholinergic crisis is from OVER-medication: SLUDGE features - Salivation, Lacrimation, Urination, Defecation, GI cramping, Emesis - plus weakness from receptor overstimulation, treated by holding the AChE inhibitor and giving atropine for the muscarinic effects."
        }
      ]
    },
    {
      "id": "fractures-compartment-fat-embolism",
      "minutes": "37-44",
      "title": "Fractures, Compartment Syndrome, Fat Embolism",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Start with fracture basics. Fractures are closed or open, and the patterns include complete, incomplete (greenstick in pediatrics), comminuted, and pathologic. The signs are pain, deformity, swelling, crepitus, decreased range of motion, and ecchymosis. Management runs immobilization (cast, splint, or traction), reduction, surgical fixation such as ORIF, and rehabilitation."
        },
        {
          "kind": "h",
          "text": "Compartment syndrome"
        },
        {
          "kind": "p",
          "text": "Compartment syndrome occurs when pressure within a fascial compartment compromises perfusion. It is time-critical: there are only 4 to 6 hours before irreversible nerve and muscle injury. Common settings are tibial fractures, crush injuries, tight casts, and reperfusion injury."
        },
        {
          "kind": "p",
          "text": "Memorize the 5 P's in their order of appearance, because the order is the whole point - acting on the early sign saves the limb, while waiting for the late signs means the damage is already done."
        },
        {
          "kind": "list",
          "items": [
            "Pain - out of proportion, especially on PASSIVE STRETCH of the muscles in the compartment. This is the EARLIEST and most reliable sign.",
            "Pallor - a pale, cool extremity.",
            "Paresthesia - numbness and tingling.",
            "Pulselessness - LATE; there is severe compromise by the time pulses disappear.",
            "Paralysis - LATE; the damage is established."
          ]
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Pain on passive stretch is the earliest sign",
          "text": "The tibial fracture patient who screams when you dorsiflex the foot has compartment syndrome until proven otherwise. Pain out of proportion plus pain on passive stretch is enough to escalate - do NOT wait for pulselessness or paralysis, because by then irreversible injury has occurred. Some sources add Poikilothermia as a sixth P. Action: notify the provider immediately, bivalve or remove the cast, and fasciotomy for established cases."
        },
        {
          "kind": "h",
          "text": "Fat embolism syndrome"
        },
        {
          "kind": "p",
          "text": "In fat embolism syndrome, fat globules from the bone marrow enter the venous circulation after a long-bone fracture (especially the femur) or a pelvic fracture, then travel to the lungs and brain. The onset is delayed - 12 to 72 hours after the fracture or the fixation surgery - which is a key timing clue."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Fat embolism - the classic triad",
          "text": "Respiratory: hypoxia, dyspnea, tachypnea, which can progress to ARDS (recall Hour 8). Neurologic: confusion and altered mental status. Skin: a petechial rash classically on the axilla, chest, neck, and conjunctiva - the petechial rash is the most distinctive feature. Treatment is supportive - oxygen, ventilation as needed, hemodynamic support - and early fracture stabilization helps prevent it."
        }
      ],
      "practiceItemId": "pi_compartment_syndrome_cast"
    },
    {
      "id": "hip-osteoporosis-rheumatology",
      "minutes": "44-50",
      "title": "Hip Replacement, Osteoporosis, Rheumatology",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Hip fracture in the elderly is often osteoporosis plus a fall. The classic presentation is a shortened, externally rotated leg with pain and an inability to bear weight. Management is surgical fixation, hemiarthroplasty, or total hip arthroplasty depending on the fracture and the patient."
        },
        {
          "kind": "h",
          "text": "Total hip replacement precautions"
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Posterior approach - three rules",
          "text": "No hip flexion past 90 degrees. No crossing the legs (no adduction past midline). No internal rotation of the operative leg. These three precautions exist to prevent dislocation of the new joint."
        },
        {
          "kind": "p",
          "text": "Translate those rules into practical implementation the patient can live by: an abductor pillow between the legs in bed; an elevated toilet seat at home; no bending forward to put on shoes or socks, using a long-handled shoehorn and a reacher instead; no low chairs or sofas; and no leg crossing. Each of these is just one of the three rules applied to daily life."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Hip dislocation signs",
          "text": "Sudden severe pain, inability to move the leg, abnormal rotation or shortening, and possibly an audible pop signal a dislocation. Notify the provider immediately and keep the patient still."
        },
        {
          "kind": "p",
          "text": "DVT prophylaxis after hip surgery is essential because the VTE risk is high: LMWH or a DOAC plus mechanical prophylaxis (recall Hour 3)."
        },
        {
          "kind": "h",
          "text": "Osteoporosis"
        },
        {
          "kind": "p",
          "text": "Osteoporosis is decreased bone density with increased fracture risk. The risk factors are postmenopausal status, age, low calcium and vitamin D, a sedentary lifestyle, smoking, alcohol, and long-term corticosteroids (recall Hour 4). Diagnosis is by DEXA scan, and a T-score at or below -2.5 defines osteoporosis."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Bisphosphonate teaching",
          "text": "Bisphosphonates such as alendronate and risedronate are first-line. The critical teaching: take on an empty stomach with a full glass of water, and REMAIN UPRIGHT for 30 minutes after the dose to prevent esophagitis. Other agents include denosumab SC every 6 months, raloxifene, teriparatide (anabolic), and romosozumab - plus calcium 1200 mg/day, vitamin D 800-1000 IU/day, weight-bearing exercise, and fall prevention."
        },
        {
          "kind": "h",
          "text": "Brief rheumatology"
        },
        {
          "kind": "p",
          "text": "Systemic lupus erythematosus is a multisystem autoimmune disease: malar rash, photosensitivity, joint pain, and lupus nephritis. Treatment is hydroxychloroquine - which requires eye monitoring - plus immunosuppressants and sun avoidance."
        },
        {
          "kind": "p",
          "text": "Rheumatoid arthritis is a symmetric inflammatory arthritis with morning stiffness lasting more than 1 hour, which distinguishes it from osteoarthritis, and it targets the small joints. Treatment is DMARDs (methotrexate first-line), biologics, and short steroid courses for flares."
        }
      ],
      "practiceItemId": "pi_thr_precautions_teaching"
    },
    {
      "id": "ngn-unfolding-case-stroke",
      "minutes": "50-56",
      "title": "NGN Unfolding Case - Acute Ischemic Stroke",
      "format": "Case",
      "blocks": [
        {
          "kind": "p",
          "text": "Here is our second full NGN unfolding case of the bootcamp, and it moves through all six clinical judgment steps. Background: a 68-year-old woman with atrial fibrillation on apixaban presents to the ED at 0945. Her husband states she was reading at breakfast at 0900 when she suddenly slumped to the right and could not speak. He called 911 immediately, and she arrived at 0938. Read each item, decide your answer, then check the reasoning."
        },
        {
          "kind": "h",
          "text": "Item one - Recognize Cues"
        },
        {
          "kind": "p",
          "text": "Assessment at 0945: patient awake, eyes open, follows simple commands inconsistently; right facial droop; right arm cannot sustain against gravity; right leg weak 3/5; speech with severe word-finding difficulty and paraphasic errors; pulse irregular 92; BP 184/96; RR 18; SpO2 96% on room air; glucose 142; no headache; no neck stiffness; last known well 0900. Highlight the findings requiring immediate follow-up."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Item one reasoning",
          "text": "The findings to flag: right facial droop, right arm weakness, and right leg weakness; aphasia, which points to the left hemisphere; the irregular pulse, confirming AF as the embolic source; BP 184/96, which needs control for tPA; and last known well only 45 minutes ago, well within the tPA window."
        },
        {
          "kind": "h",
          "text": "Item two - Analyze Cues"
        },
        {
          "kind": "p",
          "text": "A matrix asks you to classify each finding as more consistent with ischemic stroke, hemorrhagic stroke, or either: sudden onset, right-sided weakness, aphasia, irregular pulse, BP 184/96, severe headache, neck stiffness, and glucose 142."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Item two reasoning",
          "text": "Sudden onset, right-sided weakness, and aphasia are each 'either.' The irregular pulse (AF) favors ischemic via an embolic source. BP 184/96 is 'either,' though very high BP slightly favors hemorrhagic. The absence of headache and neck stiffness argues against hemorrhagic. The cluster - an AF source plus no headache plus no neck stiffness - favors ischemic, pending CT."
        },
        {
          "kind": "h",
          "text": "Item three - Prioritize Hypotheses"
        },
        {
          "kind": "p",
          "text": "A drop-down asks you to complete: 'Priority condition is BLANK; immediate next step is BLANK.' First blank options: acute ischemic stroke, intracerebral hemorrhage, hypoglycemia, TIA. Second blank options: non-contrast CT head, MRI brain, glucose recheck, immediate tPA."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Item three reasoning",
          "text": "First blank: acute ischemic stroke (suspected, pending imaging). Second blank: non-contrast CT head to rule out hemorrhage. The CT is the gateway decision before any thrombolytic can be considered."
        },
        {
          "kind": "h",
          "text": "Item four - Take Action"
        },
        {
          "kind": "p",
          "text": "A bowtie places the priority condition in the center, with two priority actions on the left and two parameters to monitor on the right."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Item four reasoning",
          "text": "Center: suspected acute ischemic stroke within the tPA window. Left (priority actions): obtain a non-contrast head CT immediately and establish two large-bore IV access. Right (monitor): BP, which must be below 185/110 for tPA, and neurologic status via serial NIHSS."
        },
        {
          "kind": "h",
          "text": "Item five - Generate Solutions"
        },
        {
          "kind": "p",
          "text": "An extended multiple response: the CT is done and shows no hemorrhage; apixaban's last dose was 27 hours ago and the level is undetectable. Select all appropriate orders from: IV tPA per protocol; aspirin 325 mg; mechanical thrombectomy eval; IV labetalol for BP control; permissive hypertension; NPO until swallow screen; LMWH for DVT prophylaxis; head MRI; transfer to stroke unit."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Item five reasoning",
          "text": "Appropriate: IV tPA (yes, if BP is controlled); mechanical thrombectomy eval (yes); IV labetalol (yes, to get BP below 185/110); NPO until swallow screen (yes); transfer to the stroke unit (yes). NOT appropriate: aspirin (no - not in the first 24 hours after tPA); permissive hypertension (no - this is a tPA candidate); LMWH (typically held the first 24 hours after tPA, with mechanical SCD prophylaxis meanwhile); head MRI (not urgent)."
        },
        {
          "kind": "h",
          "text": "Item six - Evaluate Outcomes"
        },
        {
          "kind": "p",
          "text": "A trend item: tPA was given at 1018, 78 minutes after last known well. NIHSS and BP at four time points - 1045: NIHSS 14, BP 168/92; 1300: NIHSS 10, BP 152/88; 1700: NIHSS 6, BP 140/82; 0700 day 2: NIHSS 4, BP 132/78. Identify whether the patient is improving, worsening, or stable."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Item six reasoning",
          "text": "All improving. The NIHSS dropped from 14 to 4 - a substantial neurologic recovery consistent with successful reperfusion - and the BP normalized, with no signs of hemorrhagic conversion. The plan: continued monitoring, a swallow evaluation before any PO, and reinitiation of long-term anticoagulation in time."
        }
      ]
    },
    {
      "id": "synthesis",
      "minutes": "56-58",
      "title": "Synthesis",
      "format": "Case",
      "blocks": [
        {
          "kind": "p",
          "text": "Walk through your reasoning on this synthesis case. An 80-year-old woman with osteoporosis on chronic prednisone for polymyalgia rheumatica falls and sustains a left intertrochanteric hip fracture. Surgical fixation is performed. On post-op day 2 she develops new dyspnea, hypoxia (SpO2 88% on 2L nasal cannula), confusion, and a fine petechial rash across the anterior chest."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Reasoning",
          "text": "Post-op day 2 after a hip fracture is the classic timing of fat embolism syndrome (12-72 hours), and the classic triad is all present: respiratory (hypoxia, dyspnea), neurologic (confusion), and skin (petechial rash on the chest). She is at higher risk because chronic corticosteroids contribute to osteoporosis (recall Hour 4), creating more brittle bones. Actions: ABCs - supplemental oxygen to keep SpO2 above 92, escalating to high-flow or non-invasive ventilation if needed; an ABG (recall the Hour 6 ROME mnemonic - expect a respiratory alkalosis with hypoxia, much like PE); rapid response or ICU; and remember the differential includes PE, which looks similar, so anticoagulation considerations and imaging follow. This synthesizes Hour 11 (fat embolism, hip fracture), Hour 8 (respiratory failure, oxygen), Hour 6 (ABG, ROME), Hour 4 (corticosteroid-induced osteoporosis), Hour 3 (DVT prophylaxis considerations), and Hour 2 (ABC priority) - the cumulative architecture is functioning."
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
          "text": "Homework before Hour 12: fifty neuro and MSK questions, with emphasis on stroke management, compartment syndrome, and autonomic dysreflexia. Put every wrong answer in the journal. You are eleven hours in, so that journal should be substantial by now - use it for targeted review of your weak spots."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Preview - Hour 12 is maternity",
          "text": "Coming up: preeclampsia and eclampsia (recall Hour 5 magnesium sulfate), postpartum hemorrhage (recall Hour 5 oxytocin), fetal heart rate strip interpretation, placenta previa versus abruption, gestational diabetes, normal newborn assessment, and neonatal red flags. The pharmacology intersection is dense. See you Hour 12."
        }
      ]
    }
  ]
};
