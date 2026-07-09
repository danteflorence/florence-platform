import type { Lesson } from "./lessonTypes";

/**
 * Section 3 - Pharmacology I - Cardiac & Anticoagulants. Auto-generated from the Florence Academy
 * bootcamp instructor script (expanded draft). Pending nurse-educator review.
 */
export const lesson: Lesson = {
  "meta": {
    "number": 3,
    "title": "Pharmacology I - Cardiac & Anticoagulants",
    "durationMin": 60,
    "audience": "Internationally educated nurses - Philippines, UK, Kenya, Ghana",
    "contentWeight": "First of three pharmacology hours - the NCLEX delivers roughly 15-20 pharmacology items, and cardiovascular and anticoagulation are the most heavily tested drug categories",
    "tagline": "Learn one six-field template and you can decode any new cardiac or anticoagulant drug the moment its generic name appears on screen."
  },
  "objectives": [
    "Recognize cardiac and anticoagulant drug classes instantly from the generic name root (-olol, -pril, -sartan, -dipine, -statin, -xaban, -gatran).",
    "State the critical pre-administration assessment and hold parameters for beta blockers, ACE inhibitors, calcium channel blockers, and digoxin.",
    "Differentiate the monitoring, antidotes, and patient teaching for heparin, low molecular weight heparin, warfarin, and the DOACs.",
    "Identify the four life-threatening toxicities of amiodarone and the procedural specifics of adenosine administration.",
    "Translate common UK and Commonwealth drug names (paracetamol, adrenaline, GTN) to their US generic equivalents under time pressure.",
    "Apply the priority frameworks from Hour 2 to medication-related NCLEX items."
  ],
  "timing": [
    {
      "minutes": "0-3",
      "segment": "Recap & frame the pharmacology arc (Hours 3-5)",
      "format": "Lecture"
    },
    {
      "minutes": "3-12",
      "segment": "Beta blockers (-olol)",
      "format": "Lecture"
    },
    {
      "minutes": "12-19",
      "segment": "ACE inhibitors (-pril) and ARBs (-sartan)",
      "format": "Lecture"
    },
    {
      "minutes": "19-25",
      "segment": "Calcium channel blockers (-dipine + verapamil/diltiazem)",
      "format": "Lecture"
    },
    {
      "minutes": "25-32",
      "segment": "Digoxin - narrow therapeutic window",
      "format": "Lecture"
    },
    {
      "minutes": "32-37",
      "segment": "Statins (-statin)",
      "format": "Lecture"
    },
    {
      "minutes": "37-47",
      "segment": "Anticoagulants: heparin, LMWH, warfarin, DOACs",
      "format": "Lecture"
    },
    {
      "minutes": "47-53",
      "segment": "Antiarrhythmics: amiodarone, adenosine",
      "format": "Lecture"
    },
    {
      "minutes": "53-58",
      "segment": "Synthesis items + UK-to-US name drill",
      "format": "Rapid-fire"
    },
    {
      "minutes": "58-60",
      "segment": "Close & homework",
      "format": "Lecture"
    }
  ],
  "practiceItems": {
    "pi_metoprolol_hold": {
      "id": "pi_metoprolol_hold",
      "stem": "A client is prescribed metoprolol 50 mg PO daily for hypertension. The nurse should hold the medication and notify the provider if which finding is present?",
      "options": [
        {
          "key": "A",
          "text": "Blood pressure 142/88 mmHg."
        },
        {
          "key": "B",
          "text": "Apical pulse 54 beats per minute."
        },
        {
          "key": "C",
          "text": "Client reports occasional headache."
        },
        {
          "key": "D",
          "text": "Client took medication with food this morning."
        }
      ],
      "answer": "B",
      "rationale": "An apical pulse of 54 is below the hold threshold of 60 beats per minute, so the nurse holds the dose and notifies the provider. A blood pressure of 142/88 is only mildly elevated - that is exactly why the patient is on the drug. Headache is a possible adverse effect but is not a hold parameter. Taking the dose with food is fine. The number to memorize is 60.",
      "cjmm": "take-actions",
      "reference": "Section 3 · Beta blockers"
    },
    "pi_lisinopril_angioedema": {
      "id": "pi_lisinopril_angioedema",
      "stem": "A client newly prescribed lisinopril calls the clinic reporting facial swelling and difficulty swallowing. What is the nurse's priority action?",
      "options": [
        {
          "key": "A",
          "text": "Tell the client to take an antihistamine and call back if symptoms persist."
        },
        {
          "key": "B",
          "text": "Instruct the client to hold the next dose and come in for an appointment tomorrow."
        },
        {
          "key": "C",
          "text": "Instruct the client to call 911 or go to the nearest emergency department immediately."
        },
        {
          "key": "D",
          "text": "Reassure the client that this is a common, non-serious side effect."
        }
      ],
      "answer": "C",
      "rationale": "Facial swelling with difficulty swallowing in a patient on an ACE inhibitor is angioedema, and angioedema is a life-threatening airway emergency - the answer is the emergency department now. Antihistamines may help but cannot be the only response. Waiting until tomorrow may be too late. False reassurance is a classic distractor (Pattern 5 from Hour 2). The drug is discontinued and never restarted in that patient.",
      "cjmm": "take-actions",
      "reference": "Section 3 · ACE inhibitors & ARBs"
    },
    "pi_digoxin_priority": {
      "id": "pi_digoxin_priority",
      "stem": "A client taking digoxin for atrial fibrillation reports nausea, loss of appetite, and seeing \"yellow circles\" around lights. The most recent digoxin level is 2.6 ng/mL and the potassium is 3.1 mEq/L. Which finding is the priority for the nurse to address?",
      "options": [
        {
          "key": "A",
          "text": "The potassium level."
        },
        {
          "key": "B",
          "text": "The digoxin level."
        },
        {
          "key": "C",
          "text": "The visual symptoms."
        },
        {
          "key": "D",
          "text": "The anorexia."
        }
      ],
      "answer": "A",
      "rationale": "This is a synthesis item - all four findings are abnormal and all relate to digoxin toxicity. The priority is the potassium. The digoxin level is high and the visual and GI symptoms are real toxicity, but the underlying physiological driver and the modifiable factor is the hypokalemia, which potentiates digoxin. Replace the potassium and the toxicity moderates even before the digoxin clears. The test pattern is to find the root cause, not the most dramatic symptom - and the potassium is the root cause.",
      "cjmm": "prioritize-hypotheses",
      "reference": "Section 3 · Digoxin"
    },
    "pi_warfarin_diet": {
      "id": "pi_warfarin_diet",
      "stem": "A client taking warfarin asks the nurse about diet. Which response by the nurse is most accurate?",
      "options": [
        {
          "key": "A",
          "text": "\"Avoid all green leafy vegetables completely.\""
        },
        {
          "key": "B",
          "text": "\"Eat the same amount of green leafy vegetables daily as you usually do.\""
        },
        {
          "key": "C",
          "text": "\"Increase your intake of green vegetables to improve clotting.\""
        },
        {
          "key": "D",
          "text": "\"Diet does not affect your warfarin.\""
        }
      ],
      "answer": "B",
      "rationale": "The teaching is consistent vitamin K intake, not avoidance. Avoiding green leafy vegetables altogether is rigid and unrealistic and uses the absolute word 'all' (Pattern 1 from Hour 2). Increasing intake is wrong because vitamin K directly antagonizes the drug. Diet affects warfarin enormously. The answer is consistency.",
      "cjmm": "generate-solutions",
      "reference": "Section 3 · Anticoagulants - warfarin"
    },
    "pi_enoxaparin_admin": {
      "id": "pi_enoxaparin_admin",
      "stem": "The nurse is preparing to administer enoxaparin subcutaneously to a postoperative client. Which action by the nurse is correct?",
      "options": [
        {
          "key": "A",
          "text": "Aspirate before injection to confirm placement."
        },
        {
          "key": "B",
          "text": "Expel the air bubble from the prefilled syringe before injecting."
        },
        {
          "key": "C",
          "text": "Inject in the abdomen, two inches from the umbilicus."
        },
        {
          "key": "D",
          "text": "Massage the site after injection to disperse the medication."
        }
      ],
      "answer": "C",
      "rationale": "The correct technique is to inject in the abdomen, two inches from the umbilicus. The other three are all wrong: do not aspirate (it increases bruising and tissue trauma), do not expel the air bubble (it seals the medication in the tissue and ensures the full dose is delivered), and do not massage (it causes hematoma). Four rules, one correct answer.",
      "cjmm": "take-actions",
      "reference": "Section 3 · Anticoagulants - LMWH"
    },
    "pi_adenosine_admin": {
      "id": "pi_adenosine_admin",
      "stem": "The nurse is preparing to administer adenosine 6 mg IV push to a client with supraventricular tachycardia. Which action by the nurse is most important?",
      "options": [
        {
          "key": "A",
          "text": "Dilute the medication in 50 mL of normal saline before infusion."
        },
        {
          "key": "B",
          "text": "Push the medication slowly over 1 to 2 minutes."
        },
        {
          "key": "C",
          "text": "Push the medication rapidly over 1 to 2 seconds and immediately flush with saline."
        },
        {
          "key": "D",
          "text": "Administer in a peripheral IV in the foot for steady delivery."
        }
      ],
      "answer": "C",
      "rationale": "Adenosine is given as a rapid push over 1 to 2 seconds followed immediately by a saline flush. The other options are all wrong: adenosine is never diluted, never pushed slowly (it would be metabolized before reaching the heart given its ~10-second half-life), and never given in a peripheral foot IV - the proximal port closest to the heart is required for speed of delivery.",
      "cjmm": "take-actions",
      "reference": "Section 3 · Antiarrhythmics - adenosine"
    }
  },
  "segments": [
    {
      "id": "recap-and-frame",
      "minutes": "0-3",
      "title": "Recap & Frame the Pharmacology Arc",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Welcome back. By now I hope your priority decision tree is taped somewhere you see it every day - the fridge, the bedroom wall, your phone wallpaper. ABC first, then safety, then Maslow, then acute over chronic, then unstable over stable. If you don't have it memorized yet, you will by Hour 5. We are going to lean on it constantly today, because medication questions are priority questions in disguise."
        },
        {
          "kind": "p",
          "text": "Today is the first of three pharmacology hours. Hours 3, 4, and 5 are the most heavily tested content categories on the NCLEX. The test will give you somewhere between fifteen and twenty pharmacology items, and that is not counting all the items in other categories that have a medication wrapped inside them. So we are going to spend three hours making sure that when a generic drug name appears on your screen, you recognize the class within five seconds."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "The six-field template",
          "text": "Every drug class in these three hours is taught with the same six fields: Name root → Mechanism in plain words → Uses → Key adverse effects → Hold parameters → Teaching pearl. Memorize the template, fill in the drugs. By Hour 5 you will be able to walk through any new drug you meet using these same six fields."
        },
        {
          "kind": "p",
          "text": "This hour covers beta blockers, ACE inhibitors, ARBs, calcium channel blockers, digoxin, statins, anticoagulants, and antiarrhythmics. This is the densest content hour so far, so buckle in. As a reminder, your homework from Hour 2 was fifty priority-format items, and we are going to build directly on that priority thinking now."
        }
      ]
    },
    {
      "id": "beta-blockers",
      "minutes": "3-12",
      "title": "Beta Blockers (-olol)",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "h",
          "text": "Name root and drug list"
        },
        {
          "kind": "p",
          "text": "Beta blockers. Write this down: the name root is -olol. If a drug ends in -olol, it is almost certainly a beta blocker. Metoprolol, atenolol, propranolol, carvedilol, labetalol, bisoprolol. The two outliers are carvedilol and labetalol, which also block alpha receptors in addition to beta, but they still belong to the beta blocker family. For IENs this is good news - bisoprolol is the same drug name in both the UK and US systems, and the beta blocker drug list is largely shared across systems."
        },
        {
          "kind": "h",
          "text": "Mechanism in plain words"
        },
        {
          "kind": "p",
          "text": "Adrenaline - what the US calls epinephrine - circulates in your bloodstream and lands on receptors called beta receptors. Beta-1 receptors are in your heart: when adrenaline lands on beta-1, the heart speeds up and contracts harder. Beta-2 receptors are in your lungs and peripheral blood vessels: when adrenaline lands on beta-2 in the lungs, the airways open up. So when a beta blocker blocks these receptors, the heart slows down, contractility decreases, and the bronchi can constrict. That last part is exactly why beta blockers and asthma can be dangerous together."
        },
        {
          "kind": "h",
          "text": "Two flavors: selective vs nonselective"
        },
        {
          "kind": "p",
          "text": "There are two flavors to keep straight. Cardioselective drugs preferentially block beta-1 in the heart with less effect on beta-2 in the lungs - metoprolol, atenolol, and bisoprolol. These are safer, not safe but safer, in patients with asthma or COPD; never assume full safety. Nonselective drugs block both beta-1 and beta-2 equally - propranolol is the classic, along with nadolol - and these should be avoided in asthma."
        },
        {
          "kind": "h",
          "text": "Uses"
        },
        {
          "kind": "p",
          "text": "Beta blockers are everywhere. Uses include hypertension, angina, and post-MI - beta blockers reduce mortality after a heart attack, which is why your post-MI patient almost always goes home on one. They are used in heart failure, but only specific ones: carvedilol, metoprolol succinate, and bisoprolol are the evidence-based choices for HF. They are also used for atrial fibrillation rate control, migraine prevention, performance anxiety, and essential tremor."
        },
        {
          "kind": "h",
          "text": "Key adverse effects"
        },
        {
          "kind": "list",
          "items": [
            "Bradycardia - the heart slows too much.",
            "Hypotension.",
            "Bronchospasm - especially nonselective drugs in asthmatics.",
            "Fatigue.",
            "Masking of hypoglycemia symptoms - the one IENs most often miss."
          ]
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Masked hypoglycemia - memorize this",
          "text": "A normal diabetic gets warning signs when blood sugar drops - tachycardia, sweating, anxiety - and the racing heart is driven by adrenaline. Block beta receptors and you block that tachycardia warning, so a diabetic on a beta blocker can slide into severe hypoglycemia without the early alarm. They may still sweat, but the heart-racing warning is gone. This is testable."
        },
        {
          "kind": "h",
          "text": "Hold parameters"
        },
        {
          "kind": "p",
          "text": "Textbook rule of thumb, and always verify against your facility's policy: hold the beta blocker if the apical heart rate is below 60 beats per minute, or if the systolic blood pressure is below 90 millimeters of mercury. Some protocols use 50, so check locally. And apical means stethoscope on the chest, counted for a full minute - not radial. Apical."
        },
        {
          "kind": "h",
          "text": "Teaching pearl"
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Never stop abruptly",
          "text": "If a patient suddenly stops a beta blocker, the adrenaline that has been blocked suddenly has unopposed receptors to bind, and you can get rebound hypertension, rebound tachycardia, and even an MI in someone with coronary disease. Taper over one to two weeks. When the NCLEX gives you a patient who says 'I felt fine, so I stopped my metoprolol,' that patient gets the teaching answer - never stop abruptly."
        }
      ],
      "practiceItemId": "pi_metoprolol_hold"
    },
    {
      "id": "ace-inhibitors-and-arbs",
      "minutes": "12-19",
      "title": "ACE Inhibitors (-pril) and ARBs (-sartan)",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "h",
          "text": "ACE inhibitors - name root and mechanism"
        },
        {
          "kind": "p",
          "text": "ACE inhibitors. The name root is -pril: lisinopril, enalapril, captopril, ramipril, benazepril. If it ends in -pril, it is an ACE inhibitor. Angiotensin Converting Enzyme is the enzyme that converts angiotensin I to angiotensin II, and angiotensin II is a potent vasoconstrictor that also triggers aldosterone release, which holds onto sodium and water. So if you block ACE, you block angiotensin II production: vasoconstriction decreases, aldosterone decreases, blood pressure drops, and sodium and water are excreted."
        },
        {
          "kind": "h",
          "text": "Uses"
        },
        {
          "kind": "p",
          "text": "Uses are hypertension, heart failure (reduces mortality), post-MI (reduces remodeling), and diabetic nephropathy (slows progression). Here is the counterintuitive part: ACE inhibitors are protective for the kidneys in diabetic patients even though they can also cause kidney injury. The mechanism is different - long-term, they protect the glomerulus."
        },
        {
          "kind": "h",
          "text": "The five testable adverse effects"
        },
        {
          "kind": "p",
          "text": "One - a dry, persistent cough. About 10 to 20 percent of patients develop a hacky, dry, nonproductive cough due to bradykinin buildup. It is annoying, not dangerous, but it makes patients want to stop the drug, and the usual clinical move is to switch them to an ARB."
        },
        {
          "kind": "p",
          "text": "Two - angioedema: swelling of the face, lips, tongue, and throat. This is an emergency because the airway can close. If a patient on an ACE inhibitor calls and says their tongue feels swollen, that is an ED visit, not a clinic appointment. Discontinue the drug immediately and never restart any ACE inhibitor in that patient; ARBs are also higher risk in that patient and should be used only cautiously."
        },
        {
          "kind": "p",
          "text": "Three - hyperkalemia. Because aldosterone is suppressed, potassium is retained. A potassium above about 5.5 milliequivalents per liter is generally a hold parameter, and combining an ACE inhibitor with a potassium-sparing diuretic like spironolactone is risky."
        },
        {
          "kind": "p",
          "text": "Four - first-dose hypotension, especially in volume-depleted patients. Give the first dose at bedtime and teach the patient to rise slowly. Five - pregnancy: ACE inhibitors are teratogenic, Class D in the second and third trimesters. Do not give to pregnant women, and ask about pregnancy or pregnancy plans before initiating in any woman of childbearing age."
        },
        {
          "kind": "p",
          "text": "Putting those together, the hold parameters for ACE inhibitors are pregnancy, a history of angioedema with any ACE inhibitor, potassium above approximately 5.5 mEq/L, and significantly worsening renal function - keeping in mind acute kidney injury is a particular risk in renal artery stenosis."
        },
        {
          "kind": "h",
          "text": "ARBs - name root and mechanism"
        },
        {
          "kind": "p",
          "text": "ARBs. The name root is -sartan: losartan, valsartan, irbesartan, olmesartan, telmisartan. If it ends in -sartan, it is an ARB. Instead of blocking the enzyme that makes angiotensin II, ARBs block the receptor that angiotensin II binds to. The downstream effect is the same - vasodilation, less aldosterone, lower blood pressure - but the key practical difference is that ARBs do not cause the bradykinin cough, because they do not affect bradykinin metabolism. That is why ARBs are used when an ACE inhibitor is needed but the cough is intolerable."
        },
        {
          "kind": "p",
          "text": "ARBs share the same uses as ACE inhibitors - hypertension, heart failure, post-MI, diabetic nephropathy - and the same hyperkalemia and pregnancy concerns. Cough is much less common. Angioedema is rare but still possible, and a patient who had angioedema with an ACE inhibitor has elevated risk with an ARB."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Cough vs swelling",
          "text": "Teach the distinction clearly: a dry cough is bothersome but not dangerous - but any facial or tongue swelling is an emergency."
        }
      ],
      "practiceItemId": "pi_lisinopril_angioedema"
    },
    {
      "id": "calcium-channel-blockers",
      "minutes": "19-25",
      "title": "Calcium Channel Blockers (-dipine, verapamil/diltiazem)",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Calcium channel blockers are unusual because there are two distinct subgroups that behave very differently. Treat them as two separate drugs in your head - different uses, different adverse effects."
        },
        {
          "kind": "h",
          "text": "Group one - dihydropyridines (-dipine)"
        },
        {
          "kind": "p",
          "text": "The name root is -dipine: amlodipine, nifedipine, felodipine, nicardipine. These work primarily on the peripheral arterial smooth muscle - they dilate arteries - and are used mainly for hypertension. Their adverse effects follow from that arterial dilation: peripheral edema, particularly ankle swelling, which is the most common reason patients stop taking amlodipine; reflex tachycardia, because when the arteries dilate the heart speeds up to compensate; headache; flushing; and gingival hyperplasia, where the gums grow over the teeth, which is uncomfortable and cosmetic."
        },
        {
          "kind": "h",
          "text": "Group two - non-dihydropyridines (verapamil, diltiazem)"
        },
        {
          "kind": "p",
          "text": "Verapamil and diltiazem act on the heart, not the periphery. They slow heart rate, decrease contractility, and slow conduction at the AV node, so they are used for atrial fibrillation rate control, supraventricular tachycardia, and angina. Their adverse effects are bradycardia, AV block, worsening heart failure (because they decrease contractility they are contraindicated in patients with reduced ejection fraction), and constipation - especially with verapamil, which patients will mention before you even ask."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Do not combine with beta blockers",
          "text": "Do not combine non-dihydropyridines with beta blockers. Both slow the heart and both block AV conduction, so the combination can cause profound bradycardia, complete heart block, even asystole - potentially fatal. If you see a patient on a beta blocker AND verapamil or diltiazem, clarify with the provider. The combination occasionally exists with careful monitoring, but it should raise an alarm."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Grapefruit juice",
          "text": "Patient teaching for both groups: avoid grapefruit juice. Grapefruit inhibits the metabolism of many CCBs, increasing drug levels and adverse effects, and this is especially relevant for nifedipine, felodipine, and verapamil."
        }
      ]
    },
    {
      "id": "digoxin",
      "minutes": "25-32",
      "title": "Digoxin - Narrow Therapeutic Window",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Digoxin gets its own segment because it appears more often per drug on the NCLEX than almost any other medication, and the reason is simple: it has a narrow therapeutic window. The therapeutic dose and the toxic dose are very close together, so the margin for error is small."
        },
        {
          "kind": "h",
          "text": "Mechanism and uses"
        },
        {
          "kind": "p",
          "text": "Digoxin does two things. It makes the heart contract more forcefully - a positive inotrope - and it slows the heart rate - a negative chronotrope. So in heart failure with reduced ejection fraction it gives a weak pump more power, and in atrial fibrillation it slows the rapid ventricular response."
        },
        {
          "kind": "h",
          "text": "Therapeutic range"
        },
        {
          "kind": "p",
          "text": "Traditional teaching cites a therapeutic range of 0.5 to 2.0 nanograms per milliliter. Current evidence, especially in heart failure, supports a tighter range of 0.5 to 0.9 to reduce mortality. Anything above 2.0 is toxic territory, and above 2.4 is dangerous."
        },
        {
          "kind": "h",
          "text": "Toxicity signs - heavily tested"
        },
        {
          "kind": "p",
          "text": "Memorize these. The early signs are gastrointestinal - nausea, vomiting, anorexia - so a patient on digoxin who suddenly doesn't want to eat should make you think toxicity first. The visual disturbances are the classic NCLEX cue: yellow-green halos around lights, blurred vision, photophobia. If a question mentions a digoxin patient seeing yellow halos, the answer is toxicity. The cardiac signs are bradycardia and new arrhythmias, especially heart block, and the neurologic signs are confusion, weakness, and fatigue."
        },
        {
          "kind": "h",
          "text": "Hold parameters"
        },
        {
          "kind": "p",
          "text": "Hold for an apical pulse below 60 beats per minute in adults, below 70 in children, and below 90 to 110 in infants - counted for one full minute with the stethoscope on the chest. If the pulse is below threshold, hold the dose and notify the provider."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Hypokalemia potentiates digoxin toxicity",
          "text": "When potassium is low, digoxin binds more strongly to its target on the heart muscle, and a normally therapeutic level becomes toxic. A patient on digoxin AND a loop diuretic like furosemide - which wastes potassium - is at high risk. Check potassium routinely; if potassium drops, digoxin toxicity may follow."
        },
        {
          "kind": "h",
          "text": "Antidote and teaching"
        },
        {
          "kind": "p",
          "text": "The antidote is digoxin immune Fab - brand names Digibind or DigiFab - used for life-threatening toxicity; the Fab binds digoxin and the complex is excreted by the kidneys. For teaching: take the apical pulse for one full minute before every dose, and if it is below 60 do not take the dose and call the provider. Report visual changes immediately, and maintain potassium-rich foods if on a potassium-wasting diuretic - bananas, oranges, potatoes, and leafy greens."
        }
      ],
      "practiceItemId": "pi_digoxin_priority"
    },
    {
      "id": "statins",
      "minutes": "32-37",
      "title": "Statins (-statin)",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "h",
          "text": "Name root and mechanism"
        },
        {
          "kind": "p",
          "text": "Statins. The name root is -statin: atorvastatin, simvastatin, rosuvastatin, pravastatin, lovastatin, fluvastatin. If it ends in -statin, it is an HMG-CoA reductase inhibitor. HMG-CoA reductase is the rate-limiting enzyme in cholesterol synthesis in the liver, so when you block the enzyme, less cholesterol is made, the liver upregulates LDL receptors to pull more LDL out of the blood, and serum LDL drops."
        },
        {
          "kind": "h",
          "text": "Uses"
        },
        {
          "kind": "p",
          "text": "Uses are hyperlipidemia, primary prevention of cardiovascular disease in high-risk patients, and secondary prevention after MI or stroke. The data is robust - statins prevent heart attacks and strokes."
        },
        {
          "kind": "h",
          "text": "Adverse effects you must know"
        },
        {
          "kind": "p",
          "text": "Two adverse effects are essential. The first is myopathy - muscle pain, muscle weakness, muscle tenderness - and in the worst case rhabdomyolysis, where muscle breakdown releases myoglobin into the bloodstream and damages the kidneys, causing acute kidney injury. Any patient on a statin who reports new muscle pain - that report goes to the provider; discontinuation may be needed and a CK level may be checked. The second is hepatotoxicity: liver enzymes can rise, so baseline LFTs are obtained, and although routine repeat testing is no longer universally recommended, LFTs are checked if symptoms develop such as jaundice, dark urine, or right-upper-quadrant pain. New-onset diabetes risk, headache, and GI upset round out the list."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Statin timing",
          "text": "Short-acting statins - simvastatin, lovastatin, pravastatin, fluvastatin - work better taken in the evening, because cholesterol synthesis peaks at night. Long-acting statins - atorvastatin and rosuvastatin - can be taken any time of day. The NCLEX likes to test this: if the question says simvastatin and asks about timing, the answer involves evening dosing."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Two rhabdomyolysis-raising interactions",
          "text": "Grapefruit juice increases levels of simvastatin, lovastatin, and atorvastatin, raising rhabdomyolysis risk. Fibrates such as gemfibrozil combined with a statin substantially increase rhabdomyolysis risk."
        }
      ]
    },
    {
      "id": "anticoagulants",
      "minutes": "37-47",
      "title": "Anticoagulants: Heparin, LMWH, Warfarin, DOACs",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Anticoagulants come in four categories: unfractionated heparin, low molecular weight heparin, warfarin, and the DOACs. We will walk through each one, and then build a comparison table on the whiteboard."
        },
        {
          "kind": "h",
          "text": "Unfractionated heparin"
        },
        {
          "kind": "p",
          "text": "Unfractionated heparin is given IV or subcutaneous. It binds to a protein called antithrombin III, and the heparin-antithrombin complex inactivates thrombin and factor Xa - translation, it stops clots from forming. Onset is immediate when given IV. You monitor with the aPTT, the activated partial thromboplastin time, targeting a therapeutic range of 1.5 to 2.5 times the control value. The antidote is protamine sulfate: if a patient on IV heparin is bleeding dangerously, you give protamine."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Heparin-induced thrombocytopenia (HIT)",
          "text": "About 5 to 10 days into therapy, some patients develop antibodies against the heparin-platelet complex. The platelet count drops - sometimes by 50 percent or more - and paradoxically the patient develops thrombosis instead of bleeding. If a patient on heparin has a sudden drop in platelets, stop the heparin immediately and switch to a non-heparin anticoagulant. And never give heparin IM - it forms hematomas."
        },
        {
          "kind": "h",
          "text": "Low molecular weight heparin (LMWH)"
        },
        {
          "kind": "p",
          "text": "LMWH means enoxaparin (brand name Lovenox) and dalteparin (Fragmin), given subcutaneous only. These are smaller heparin molecules with a more predictable dose response, so routine aPTT monitoring is not needed; anti-Xa levels are used only if monitoring is required, typically in renal impairment or extreme body weight. The antidote is protamine sulfate, but it only partially reverses LMWH."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "LMWH administration - four rules",
          "text": "Inject subcutaneously in the abdomen, two inches away from the umbilicus, in the love-handle area. Do not expel the air bubble from the prefilled syringe - it pushes the medication fully out and seals the tract. Do not aspirate before injecting. Do not rub the site afterward - it causes bruising. Abdomen, no air expel, no aspirate, no rub - these four facts show up regularly."
        },
        {
          "kind": "h",
          "text": "Warfarin"
        },
        {
          "kind": "p",
          "text": "Warfarin is oral. It blocks the vitamin K-dependent synthesis of clotting factors II, VII, IX, and X. Its onset is slow - 3 to 5 days for full effect - and because of that slow onset, patients are often bridged with heparin or LMWH at the start of therapy until the warfarin reaches a therapeutic level. You monitor with the INR, the International Normalized Ratio: the target is 2 to 3 for most indications including atrial fibrillation, DVT, and PE, and a higher target of 2.5 to 3.5 for a mechanical mitral valve. An INR above 4 is dangerous, and above 5 is a bleeding emergency. The antidote is vitamin K (phytonadione), given orally for moderate elevations and IV for severe; for life-threatening bleeding, fresh frozen plasma or prothrombin complex concentrate is given for immediate reversal. Warfarin is teratogenic and contraindicated in pregnancy - use heparin or LMWH instead."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Warfarin diet - consistency, not avoidance",
          "text": "Keep vitamin K intake CONSISTENT, not absent. If a patient eats spinach every day, the warfarin dose is calibrated to that intake. The problem is variability - eating no greens for a week and then having a big salad makes the INR swing. Consistent intake equals stable INR. Green leafy vegetables daily in the same approximate amount is fine."
        },
        {
          "kind": "p",
          "text": "Warfarin precautions: soft toothbrush, electric razor, and watch for bleeding gums, dark or bloody stools, hematuria, easy bruising, and prolonged bleeding from cuts. Warfarin has many drug interactions, including with amiodarone, antibiotics, and NSAIDs."
        },
        {
          "kind": "h",
          "text": "DOACs - direct oral anticoagulants"
        },
        {
          "kind": "p",
          "text": "DOACs have two subcategories. The factor Xa inhibitors carry the name root -xaban: apixaban (Eliquis), rivaroxaban (Xarelto), edoxaban (Savaysa). The direct thrombin inhibitor carries the name root -gatran: dabigatran (Pradaxa). DOACs bind directly to clotting factors - factor Xa or thrombin - without going through the antithrombin or vitamin K pathways. The big advantage is that no routine monitoring is required: no INR, no aPTT, no dose adjustments based on labs, just fixed dosing."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "DOAC antidotes",
          "text": "Andexanet alfa (brand name Andexxa) reverses the factor Xa inhibitors. Idarucizumab (brand name Praxbind) reverses dabigatran. These antidotes are testable."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "DOAC renal dosing",
          "text": "DOACs are cleared by the kidneys. In patients with impaired renal function, doses are reduced or the drug is contraindicated depending on the GFR threshold. The NCLEX may give you a patient with an elevated creatinine on a DOAC - check that the dose has been adjusted."
        },
        {
          "kind": "h",
          "text": "Heparin vs warfarin - the live comparison"
        },
        {
          "kind": "p",
          "text": "Here is the comparison we build live on the whiteboard, across onset, route, lab, antidote, and pregnancy safety. Heparin: IV, monitored by aPTT, reversed by protamine, pregnancy-safe. LMWH: subcutaneous, no routine lab, partially reversed by protamine, pregnancy-safe. Warfarin: oral, monitored by INR, reversed by vitamin K, NOT safe in pregnancy. DOACs: oral, no monitoring, specific antidotes, pregnancy questionable."
        }
      ],
      "practiceItemId": "pi_warfarin_diet"
    },
    {
      "id": "anticoagulants-enoxaparin-practice",
      "minutes": "37-47",
      "title": "Anticoagulants - Enoxaparin Administration Check",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Anticoagulants carry two practice items because both patterns are top-frequency on the NCLEX. The first tested the warfarin diet; the second tests subcutaneous enoxaparin technique. Recall the four LMWH rules from the segment above - abdomen two inches from the umbilicus, do not expel the air bubble, do not aspirate, do not rub - and apply them to the item below."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Top-frequency pattern",
          "text": "Never let the warfarin diet item or the enoxaparin administration item slip - both are among the highest-frequency NCLEX patterns in this entire hour."
        }
      ],
      "practiceItemId": "pi_enoxaparin_admin"
    },
    {
      "id": "antiarrhythmics",
      "minutes": "47-53",
      "title": "Antiarrhythmics: Amiodarone & Adenosine",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Two antiarrhythmics to know, and they are very different drugs: amiodarone and adenosine."
        },
        {
          "kind": "h",
          "text": "Amiodarone"
        },
        {
          "kind": "p",
          "text": "Amiodarone is a Class III antiarrhythmic with characteristics of all four Vaughan-Williams classes, used for both ventricular and supraventricular arrhythmias. It is a powerful drug and a problem drug. Its half-life is extraordinarily long - often cited around 25 to 60 days - which means its drug interactions persist long after you stop it."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Four life-threatening amiodarone toxicities",
          "text": "1) Pulmonary fibrosis - the lung tissue thickens and scars; this is the most lethal toxicity, so new cough, dyspnea, or hypoxia triggers a workup. 2) Hepatotoxicity - transaminases above three times normal often trigger discontinuation. 3) Thyroid dysfunction - amiodarone is about 37 percent iodine by weight and can cause both hypothyroidism and hyperthyroidism, sometimes in the same patient over time. 4) Corneal microdeposits - tiny deposits in the cornea, sometimes causing visual halos or blurred vision, usually reversible after discontinuation."
        },
        {
          "kind": "p",
          "text": "Beyond those four, amiodarone causes blue-gray skin discoloration with chronic use, photosensitivity (use sunscreen), and peripheral neuropathy. Monitoring is extensive: baseline and ongoing chest X-ray, pulmonary function tests, LFTs, TFTs (TSH at baseline and every six months), and ophthalmology. And it has many drug interactions - critically, it potentiates warfarin and digoxin, so the doses of those drugs are typically reduced when amiodarone is added."
        },
        {
          "kind": "h",
          "text": "Adenosine"
        },
        {
          "kind": "p",
          "text": "Adenosine is the opposite kind of drug - used for paroxysmal supraventricular tachycardia, with a half-life measured in seconds, not days. It works for a few seconds and then disappears, with a half-life of about 10 seconds."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Adenosine administration - heavily tested",
          "text": "Rapid IV push over 1 to 2 seconds into the port closest to the heart, immediately followed by a rapid 20 milliliter saline flush - the two-syringe technique, where one nurse pushes the adenosine and another pushes the flush, sometimes using a stopcock to make the transition fast. The urgency is because the half-life is so short that pushing it slowly means it is metabolized before it reaches the heart."
        },
        {
          "kind": "p",
          "text": "Expect a brief asystole - the monitor will go flat for 3 to 10 seconds, then a sinus rhythm typically returns. The patient feels this and often describes a sense of doom, of dying, of chest pressure, so warn them in advance and have the crash cart in the room. The dose is an initial 6 milligrams, and if unsuccessful you repeat at 12 milligrams, up to one or two repeat doses depending on protocol."
        }
      ],
      "practiceItemId": "pi_adenosine_admin"
    },
    {
      "id": "synthesis-and-uk-to-us-drill",
      "minutes": "53-58",
      "title": "Synthesis & UK-to-US Name Drill",
      "format": "Case",
      "blocks": [
        {
          "kind": "p",
          "text": "Now we put it together. First, three rapid synthesis items that combine the priority framework from Hour 2 with the medication knowledge from this hour - the kind of layered item where you must recognize the drug class, recognize the abnormal finding, and then decide what matters most. Then a rapid-fire translation drill: I call out a UK or Commonwealth drug name and you type the US generic equivalent in the chat, as fast as you can."
        },
        {
          "kind": "h",
          "text": "UK-to-US name drill - the seven high-yield equivalences"
        },
        {
          "kind": "list",
          "items": [
            "Paracetamol = acetaminophen - same drug, different name.",
            "Adrenaline = epinephrine - critical: adrenaline is the word in every UK and Commonwealth resus protocol, but on the NCLEX it is always epinephrine.",
            "GTN (glyceryl trinitrate) = nitroglycerin - often abbreviated NTG on US charts.",
            "Frusemide = furosemide - note the spelling change, F-U-R-O; brand name Lasix.",
            "Salbutamol = albuterol - same bronchodilator.",
            "Lignocaine = lidocaine - same local anesthetic and ventricular antiarrhythmic.",
            "Pethidine = meperidine - brand name Demerol, same opioid.",
            "Amiodarone = amiodarone - the same name in both systems."
          ]
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Reason it through",
          "text": "These synthesis items reward root-cause thinking, not symptom-spotting: recognize the drug from its name root, recognize the danger, then let the priority frameworks - ABC, safety, unstable over stable - decide the answer. Drill the seven translations until they are reflexive; the full UK-to-US lookup handout has twelve more, and by Hour 5 every translation should be automatic."
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
          "text": "Homework before Hour 4: fifty pharmacology questions, with at least twenty from the cardiac and anticoagulant categories. Every wrong answer goes in the journal - topic, your wrong answer, the right answer, the rationale, and the name root or mechanism you forgot."
        },
        {
          "kind": "p",
          "text": "Hour 4 is endocrine, psychiatric medications, and antibiotics: insulin types and peak times, SSRIs and lithium, and the aminoglycosides, fluoroquinolones, and vancomycin. We keep the exact same six-field template - name root, mechanism, uses, adverse effects, hold parameters, teaching pearl."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Recite the seven name roots cold",
          "text": "Before you log off, recite the seven name roots from this hour out loud - to yourself or to your camera: -olol, -pril, -sartan, -dipine, -statin, -xaban, -gatran. If any of those do not trigger an immediate class recognition, that is tonight's review."
        }
      ]
    }
  ]
};
