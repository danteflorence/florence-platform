import type { Lesson } from "./lessonTypes";

/**
 * Section 9 - Endocrine. Auto-generated from the Florence Academy
 * bootcamp instructor script (expanded draft). Pending nurse-educator review.
 */
export const lesson: Lesson = {
  "meta": {
    "number": 9,
    "title": "Endocrine",
    "durationMin": 60,
    "audience": "Internationally educated nurses - Philippines, UK, Kenya, Ghana",
    "contentWeight": "Pattern-rich rather than memorization-rich - four side-by-side pairings cover almost all endocrine content",
    "tagline": "Endocrine on the NCLEX is dominated by four head-to-head comparisons - master the pairings and you master the section."
  },
  "objectives": [
    "Differentiate DKA from HHS on clinical presentation, lab pattern (glucose, pH, ketones, osmolality), and management priorities, including the critical role of potassium and fluid timing.",
    "Recognize thyroid storm and myxedema coma as life-threatening endocrine emergencies and apply the correct intervention sequence for each.",
    "Differentiate Cushing syndrome from Addison disease by clinical pattern and lab findings, and recognize adrenal crisis as an emergency.",
    "Differentiate SIADH from diabetes insipidus by sodium pattern, urine concentration, and treatment, and apply the slow-correction rule for hyponatremia.",
    "Recognize the classic triad of pheochromocytoma and apply the critical perioperative sequencing rule (alpha blockade BEFORE beta blockade).",
    "Walk through a six-item NGN unfolding case study on diabetic ketoacidosis, applying all six CJMM steps."
  ],
  "timing": [
    {
      "minutes": "0-3",
      "segment": "Recap & frame: the four endocrine pairings",
      "format": "Lecture"
    },
    {
      "minutes": "3-16",
      "segment": "DKA vs HHS - labs, treatment, potassium pitfall",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "16-23",
      "segment": "Thyroid storm vs myxedema coma",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "23-30",
      "segment": "Cushing vs Addison + adrenal crisis",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "30-38",
      "segment": "SIADH vs DI",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "38-43",
      "segment": "Pheochromocytoma - the alpha-before-beta rule",
      "format": "Lecture"
    },
    {
      "minutes": "43-52",
      "segment": "NGN unfolding case - DKA",
      "format": "Case walkthrough"
    },
    {
      "minutes": "52-58",
      "segment": "Cross-system synthesis",
      "format": "Case"
    },
    {
      "minutes": "58-60",
      "segment": "Close & homework",
      "format": "Lecture"
    }
  ],
  "practiceItems": {
    "pi_dka_potassium_priority": {
      "id": "pi_dka_potassium_priority",
      "stem": "A 19-year-old with type 1 diabetes presents to the ED with vomiting and confusion. Labs: glucose 482 mg/dL, pH 7.18, HCO3 12, K+ 3.1, ketones positive. The provider orders IV normal saline 1 liter bolus and IV regular insulin 0.1 unit/kg/hr infusion. What is the nurse's priority action?",
      "options": [
        {
          "key": "A",
          "text": "Initiate both orders simultaneously."
        },
        {
          "key": "B",
          "text": "Administer the fluid bolus and notify the provider before starting insulin."
        },
        {
          "key": "C",
          "text": "Start the insulin infusion before the fluid bolus."
        },
        {
          "key": "D",
          "text": "Hold both orders until potassium is rechecked."
        }
      ],
      "answer": "B",
      "rationale": "The potassium at 3.1 is below the 3.3 threshold. Starting insulin will drive potassium further down, risking life-threatening hypokalemia and arrhythmia. The nurse administers the fluids - they are appropriate, ordered, and address the dehydration - and notifies the provider that potassium replacement is needed before insulin. The fluids do not need to wait; the insulin does. Starting both together (A) or insulin first (C) ignores the potassium danger, and holding the fluids too (D) needlessly delays correcting the profound dehydration. This is the classic potassium pitfall: recognize K below 3.3 in DKA and protect the patient from premature insulin.",
      "cjmm": "take-actions",
      "reference": "Section 9 · DKA vs HHS"
    },
    "pi_thyroid_storm_order": {
      "id": "pi_thyroid_storm_order",
      "stem": "A patient with thyroid storm is admitted to the ICU. The provider has ordered propranolol IV, PTU 600 mg PO loading dose, Lugol's iodine solution 5 drops PO, and hydrocortisone 100 mg IV. Place the medications in the correct order of administration.",
      "options": [
        {
          "key": "A",
          "text": "Propranolol → PTU → Iodine → Hydrocortisone."
        },
        {
          "key": "B",
          "text": "Iodine → PTU → Propranolol → Hydrocortisone."
        },
        {
          "key": "C",
          "text": "PTU → Iodine → Propranolol → Hydrocortisone."
        },
        {
          "key": "D",
          "text": "Propranolol → Iodine → PTU → Hydrocortisone."
        }
      ],
      "answer": "A",
      "rationale": "Propranolol goes first for immediate symptomatic control of the cardiovascular effects. Then PTU to block new hormone synthesis. Then iodine - given at least one hour AFTER the thionamide - to block the release of preformed hormone. Then hydrocortisone for peripheral T4-to-T3 conversion and adrenal coverage. Order matters because iodine before the thionamide can be used as substrate for new hormone synthesis and worsen the storm (Wolff-Chaikoff escape). Options B, C, and D all place iodine before PTU or misorder the symptom control, which is dangerous.",
      "cjmm": "generate-solutions",
      "reference": "Section 9 · Thyroid emergencies"
    },
    "pi_lithium_nephrogenic_di": {
      "id": "pi_lithium_nephrogenic_di",
      "stem": "A patient with bipolar disorder on lithium therapy reports excessive thirst and urinating up to 6 liters per day. Labs: serum Na+ 152 mEq/L, serum osmolality 312, urine osmolality 92, urine specific gravity 1.003. Which condition is most likely?",
      "options": [
        {
          "key": "A",
          "text": "SIADH."
        },
        {
          "key": "B",
          "text": "Central diabetes insipidus."
        },
        {
          "key": "C",
          "text": "Nephrogenic diabetes insipidus."
        },
        {
          "key": "D",
          "text": "Psychogenic polydipsia."
        }
      ],
      "answer": "C",
      "rationale": "Lithium is the most common drug cause of nephrogenic DI - the connection back to Hour 4. The labs confirm DI: high serum sodium, high serum osmolality, low urine osmolality, and low specific gravity. It is nephrogenic because the cause is lithium-induced kidney resistance to ADH. Central DI (B) would show the same lab profile but a different cause. SIADH (A) would show the opposite labs - low sodium and concentrated urine. Psychogenic polydipsia (D) would show low or normal serum sodium because the patient is drinking water without an ADH problem.",
      "cjmm": "analyze-cues",
      "reference": "Section 9 · SIADH vs DI"
    }
  },
  "segments": [
    {
      "id": "frame-four-pairings",
      "minutes": "0-3",
      "title": "Recap & Frame: The Four Pairings",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Welcome to Hour 9 - endocrine clinical content. The thing to understand up front is that endocrine is dense but pattern-rich, so today we work in pairs. On the NCLEX, endocrine is dominated by four side-by-side comparisons, and if you build those four tables in your head you cover almost all of the section. The test rewards differentiation far more than memorization of individual disorders - it asks you to tell two look-alike conditions apart."
        },
        {
          "kind": "h",
          "text": "The four pairings plus one standalone"
        },
        {
          "kind": "list",
          "items": [
            "DKA versus HHS",
            "Hyperthyroid emergency versus hypothyroid emergency - thyroid storm versus myxedema coma",
            "Cushing versus Addison",
            "SIADH versus DI",
            "Plus one standalone - pheochromocytoma - which has its own testable sequencing rule"
          ]
        },
        {
          "kind": "p",
          "text": "Several backward references pay off in this hour, so keep them in mind as we go. From Hour 4: insulin types and the rule that only Regular insulin can be given IV, plus corticosteroids and the rule about never stopping them abruptly, and lithium causing nephrogenic DI. From Hour 6: ABG interpretation and hyperkalemia management. Those connections from earlier hours come together today."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "The strategy for this hour",
          "text": "Build four side-by-side comparison tables - DKA vs HHS, hyper vs hypothyroid, Cushing vs Addison, SIADH vs DI. Side by side, these are the single highest-yield study artifact in endocrine content."
        }
      ]
    },
    {
      "id": "dka-vs-hhs",
      "minutes": "3-16",
      "title": "DKA vs HHS",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Diabetic ketoacidosis is the single most testable endocrine emergency, so we start here. I want to walk you through the pathophysiology first, because once you understand the mechanism, the labs and the treatment fall out logically rather than needing to be memorized as a list."
        },
        {
          "kind": "h",
          "text": "DKA pathophysiology and the triad"
        },
        {
          "kind": "p",
          "text": "In DKA the patient has absolute or near-absolute insulin deficiency - usually a Type 1 diabetic who missed insulin or has a precipitating illness, sometimes a Type 2 patient under severe stress. Without insulin, three things happen in parallel. One: glucose cannot enter the cells, so blood glucose rises. Two: the body, sensing the cells are starving, breaks fat down for energy, and that fat breakdown produces ketones as a by-product. Three: those ketones are acids. So you get hyperglycemia, ketosis, and metabolic acidosis simultaneously - that is the DKA triad."
        },
        {
          "kind": "p",
          "text": "Glucose pulls water with it, producing a massive osmotic diuresis - the patient pees out liters and profound dehydration follows. Clinically that gives you the three P's - polyuria, polydipsia, polyphagia - plus dehydration. Layered on top is the body's attempt to compensate for the acidosis by hyperventilating: Kussmaul respirations, that rapid, deep breathing that blows off CO2. Recall Hour 6 ROME - in metabolic acidosis the lungs try to compensate by lowering CO2. You also get fruity breath from acetone (one of the ketones), abdominal pain, nausea and vomiting, and altered mental status that is usually less severe than in HHS."
        },
        {
          "kind": "h",
          "text": "DKA labs"
        },
        {
          "kind": "p",
          "text": "The DKA lab picture: glucose typically 250 to 600 mg/dL - sometimes higher but usually in that range. The pH is below 7.3 and bicarbonate is below 18. The anion gap is elevated above 12, calculated as sodium minus chloride minus bicarbonate. Serum and urine ketones are positive. And - critically - there is the potassium pattern, which we are about to dwell on because it is the most heavily tested point in this entire segment."
        },
        {
          "kind": "h",
          "text": "Common DKA triggers"
        },
        {
          "kind": "list",
          "items": [
            "Missed or inadequate insulin doses",
            "Infection - the most common precipitant (UTI, pneumonia)",
            "New-onset Type 1 diabetes",
            "Myocardial infarction and severe stress",
            "Certain medications - corticosteroids, and SGLT2 inhibitors which can cause euglycemic DKA (recall Hour 4)"
          ]
        },
        {
          "kind": "h",
          "text": "The potassium pitfall - pay attention"
        },
        {
          "kind": "p",
          "text": "Here is the pitfall, and it is heavily tested. At presentation the potassium may look normal, or it may even be elevated - and this is misleading. The acidosis is pushing potassium out of the cells and into the bloodstream, but the total body potassium is actually severely depleted because of the urinary losses from the osmotic diuresis. So the serum potassium looks okay while the patient is genuinely total-body potassium-depleted."
        },
        {
          "kind": "p",
          "text": "When you give insulin, two things happen at once. The acidosis improves, which lets potassium move back into cells, and insulin itself drives potassium into cells. The result is that serum potassium drops, sometimes precipitously - a patient who started with a K of 4.5 can be at 2.8 within hours of starting insulin."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "The K+ < 3.3 rule",
          "text": "If the potassium at presentation is less than 3.3 mEq/L, HOLD insulin and replace potassium first. Giving insulin to a patient with K of 3.0 can cause life-threatening hypokalemia. Replace potassium until it is above 3.3, then start insulin. This is a top-tier NCLEX point."
        },
        {
          "kind": "h",
          "text": "HHS - a different patient, a different physiology"
        },
        {
          "kind": "p",
          "text": "Now HHS - hyperosmolar hyperglycemic state. This is a different patient with a different physiology and a different presentation. HHS is typically a Type 2 diabetic, often elderly, sometimes presenting with diabetes for the first time after being hyperglycemic for weeks or months without knowing. The patient still has some residual insulin - enough to prevent ketogenesis, so there is no significant ketosis and no significant acidosis, but not enough to control hyperglycemia. Glucose climbs dramatically, typically over 600 and sometimes over 1000. The osmotic diuresis is massive and prolonged, the patient becomes profoundly dehydrated, and mental status deteriorates from the high osmolality and dehydration, often more severely than in DKA."
        },
        {
          "kind": "p",
          "text": "HHS labs: glucose typically over 600, often over 1000; serum osmolality over 320 mOsm/kg; pH above 7.3 with no significant acidosis; bicarbonate above 18; and minimal or absent ketones. The sodium is often high - the dehydration is so profound that sodium is concentrated despite the diluting effect of the high glucose. The presentation is profound dehydration, altered mental status that can include seizures, focal neurologic findings, and coma, less abdominal pain than DKA, and no Kussmaul respirations because there is no acidosis to compensate for."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "HHS mortality and the clinical lesson",
          "text": "HHS mortality is higher than DKA - older, more comorbid patients, and slower diagnosis because the picture can mimic a stroke or other neurologic emergency. The clinical lesson: check glucose in any altered elderly patient. Always."
        },
        {
          "kind": "h",
          "text": "Side by side"
        },
        {
          "kind": "list",
          "items": [
            "Glucose: DKA 250-600 / HHS over 600",
            "pH: DKA under 7.3 / HHS over 7.3",
            "Ketones: DKA positive / HHS minimal",
            "Osmolality: DKA usually under 320 / HHS over 320",
            "Typical patient: DKA Type 1 / HHS Type 2",
            "Both: severe dehydration and altered mental status - more severe in HHS"
          ]
        },
        {
          "kind": "h",
          "text": "Treatment sequence - testable"
        },
        {
          "kind": "p",
          "text": "The treatment principles overlap substantially, and the sequence is testable, so let me walk you through it in order. Step one: fluids FIRST - normal saline aggressive resuscitation, often 1 to 1.5 liters in the first hour, then continued replacement. The patient is profoundly dehydrated, and insulin given without fluid resuscitation drops the glucose without correcting the volume - a dehydrated patient with a normalized glucose can crash."
        },
        {
          "kind": "p",
          "text": "Step two: check potassium. If K is below 3.3, hold insulin and replace potassium first. If K is between 3.3 and 5.3, start replacement alongside insulin. If K is above 5.3, just monitor - don't replace, because insulin will drive it down. Step three: insulin - IV REGULAR insulin, the only IV insulin available (recall Hour 4), typically a bolus of 0.1 unit/kg then a continuous infusion at 0.1 unit/kg/hr via pump. It is a high-alert medication (recall Hour 5)."
        },
        {
          "kind": "p",
          "text": "Step four: monitor - glucose hourly and electrolytes every 2 to 4 hours initially, aiming to lower glucose by approximately 50 to 75 mg/dL per hour. Slower is better than faster; especially in pediatric DKA, rapid glucose lowering risks cerebral edema. Step five: when glucose reaches approximately 200 to 250, ADD dextrose to the IV fluids. This is a critical point - the goal of the insulin infusion now is not to lower glucose further but to close the anion gap and clear ketones. We add dextrose so we can keep running insulin without causing hypoglycemia, and the patient stays on dextrose-containing fluids and insulin until the anion gap is closed, the bicarbonate is above 18, and the patient is ready to eat."
        },
        {
          "kind": "p",
          "text": "Step six: transition from IV to subcutaneous insulin when the patient is metabolically stable - anion gap closed, bicarbonate above 18, pH above 7.3, and eating. Overlap the IV insulin with the first SC dose by 1 to 2 hours to avoid rebound hyperglycemia and ketosis. Step seven: treat the underlying trigger - infection means antibiotics, an MI means a cardiac workup, missed insulin means education and a barriers assessment. Bicarbonate replacement is reserved for severe acidosis only - pH below 6.9 - and most cases of DKA correct with fluids and insulin alone."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Add dextrose, don't stop insulin",
          "text": "When glucose hits about 200-250, the answer is to ADD dextrose to the fluids - not to stop the insulin. The insulin keeps running to close the anion gap and clear ketones; the dextrose just prevents hypoglycemia while it does."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Cerebral edema in HHS and pediatric DKA",
          "text": "Correct glucose and osmolality slowly. Rapid correction causes water to shift into brain cells, producing cerebral edema. This is particularly concerning in pediatric DKA."
        }
      ],
      "practiceItemId": "pi_dka_potassium_priority"
    },
    {
      "id": "thyroid-emergencies",
      "minutes": "16-23",
      "title": "Thyroid Storm vs Myxedema Coma",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Thyroid emergencies sit at the two endpoints of the thyroid spectrum, and both are life-threatening - thyroid storm at the hyper end and myxedema coma at the hypo end. Let me set the background for each before we get to the emergency itself."
        },
        {
          "kind": "h",
          "text": "Hyperthyroidism background"
        },
        {
          "kind": "p",
          "text": "Graves disease is the most common cause of hyperthyroidism in younger adults - it is driven by autoimmune thyroid-stimulating antibodies - while toxic multinodular goiter and toxic adenoma are more common in older patients. The symptoms reflect a sped-up metabolism: weight loss despite an increased appetite, heat intolerance, tachycardia, palpitations, fine tremor, anxiety, diaphoresis, and diarrhea, sometimes with exophthalmos and pretibial myxedema in Graves, and often a visible goiter. The labs show TSH suppressed with free T3 and T4 elevated."
        },
        {
          "kind": "p",
          "text": "Treatment of hyperthyroidism: methimazole is first-line, while PTU is preferred in the first trimester of pregnancy and in thyroid storm - both block thyroid hormone synthesis (recall Hour 4). Add a beta blocker for symptom control, typically propranolol (recall Hour 3). Definitive therapy is radioactive iodine ablation or thyroidectomy in selected patients."
        },
        {
          "kind": "h",
          "text": "Thyroid storm - the hyperthyroid emergency"
        },
        {
          "kind": "p",
          "text": "Thyroid storm occurs in a patient who is already hyperthyroid - often undertreated or noncompliant - who hits a precipitant. The triggers are surgery (especially thyroidectomy itself), severe infection, trauma, a sudden iodine load such as contrast imaging, MI, DKA, and withdrawal of antithyroid medications. The presentation is dramatic: hyperthermia often above 38.5°C and sometimes above 40°C, severe tachycardia often over 140, atrial fibrillation, agitation or delirium that can progress to psychosis and eventually coma, vomiting and diarrhea, and developing heart failure. Mortality without treatment is very high."
        },
        {
          "kind": "h",
          "text": "Thyroid storm treatment - the order matters"
        },
        {
          "kind": "p",
          "text": "Memorize this sequence. One: beta blocker - propranolol IV - which blocks the cardiovascular effects of thyroid hormone, slowing the heart and reducing tremor and anxiety for immediate symptom control. Two: thionamide - PTU or methimazole - which blocks NEW thyroid hormone synthesis. Three: iodine - Lugol's solution or SSKI (saturated solution of potassium iodide) - which blocks the RELEASE of preformed thyroid hormone from the gland."
        },
        {
          "kind": "p",
          "text": "Here is the critical sequencing within that: iodine is given at least one hour AFTER the thionamide. If you give iodine first, it can be used as a substrate for new hormone synthesis and actually worsen the storm - that is the Wolff-Chaikoff escape phenomenon. The thionamide blocks synthesis, then iodine blocks release. Four: corticosteroids - hydrocortisone or dexamethasone - which block peripheral conversion of T4 to the more active T3 and also cover possible adrenal insufficiency. Five: supportive care - aggressive cooling with cooling blankets, ice packs, and antipyretics (acetaminophen; avoid aspirin, which can displace thyroid hormone from binding proteins and worsen the storm), IV fluids for the significant losses from sweat and diarrhea, and the ICU. Then treat the precipitating trigger."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Iodine AFTER thionamide",
          "text": "Never give iodine before the thionamide. Iodine first can fuel new hormone synthesis and worsen the storm (Wolff-Chaikoff escape). The canonical NCLEX order is beta blocker → thionamide → iodine → steroids."
        },
        {
          "kind": "h",
          "text": "Hypothyroidism background"
        },
        {
          "kind": "p",
          "text": "Hypothyroidism is the other end of the spectrum - a slowed metabolism. Expect weight gain, cold intolerance, bradycardia, fatigue, depression, constipation, dry skin, hair loss, menorrhagia, elevated cholesterol, and slowed deep tendon reflexes - especially the relaxation phase of the Achilles reflex. The labs show TSH high and free T4 low in primary hypothyroidism. Treatment is levothyroxine (recall Hour 4): lifelong replacement, taken in the morning on an empty stomach, with TSH-monitored adjustments every 6 to 8 weeks."
        },
        {
          "kind": "h",
          "text": "Myxedema coma - the hypothyroid emergency"
        },
        {
          "kind": "p",
          "text": "Myxedema coma is severe decompensated hypothyroidism. The triggers are cold exposure, infection, surgery, and sedatives or opioids given to an undertreated hypothyroid patient. The presentation is the mirror image of thyroid storm: hypothermia often below 35°C, bradycardia, hypotension, hypoventilation with CO2 retention (recall Hour 6 - respiratory acidosis), hyponatremia, hypoglycemia, and altered mental status progressing to coma. You may also see pleural effusions, ascites, and pericardial effusion - the word 'myxedema' refers to the mucinous edema in the tissues."
        },
        {
          "kind": "p",
          "text": "Treatment of myxedema coma: IV levothyroxine - a loading dose then maintenance. IV hydrocortisone - because adrenal insufficiency may coexist and untreated hypothyroidism can mask it, so cortisol is given empirically before the thyroid hormone or alongside it. Supportive ventilation if needed. Gradual passive warming - and this is testable: never warm rapidly with external heat. Rapid warming causes peripheral vasodilation in a patient with marginal cardiac output, leading to shock. Use slow, passive warming with blankets, correct glucose and sodium gradually, and admit to the ICU."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Warm slowly in myxedema coma",
          "text": "Never rapidly warm a myxedema coma patient with external heat. Rapid warming causes peripheral vasodilation in a patient with marginal cardiac output and leads to shock. Slow, passive warming with blankets only. And give hydrocortisone - adrenal insufficiency may coexist."
        }
      ],
      "practiceItemId": "pi_thyroid_storm_order"
    },
    {
      "id": "cushing-vs-addison",
      "minutes": "23-30",
      "title": "Cushing vs Addison + Adrenal Crisis",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Cushing and Addison sit at opposite ends of the cortisol spectrum - too much cortisol versus too little. Get the two clinical pictures side by side and the lab patterns follow."
        },
        {
          "kind": "h",
          "text": "Cushing syndrome - excess cortisol"
        },
        {
          "kind": "p",
          "text": "Cushing syndrome is excess cortisol. By far the most common cause is exogenous - corticosteroid therapy for asthma, COPD, rheumatologic disease, or transplant rejection. The endogenous causes are a pituitary adenoma producing ACTH (this subset, where the pituitary is the source, is called Cushing disease), an adrenal tumor producing cortisol, and ectopic ACTH from a malignancy like small cell lung cancer."
        },
        {
          "kind": "p",
          "text": "The Cushing presentation is a redistribution and breakdown picture. Central obesity with fat deposits in the trunk sparing the extremities, a moon face, a buffalo hump (a fat pad over the upper back), and purple striae on the abdomen - wider than 1 centimeter and purple, unlike the pale stretch marks of pregnancy or rapid weight gain. You also see easy bruising and thin, paper-like skin, hypertension, hyperglycemia sometimes reaching overt diabetes, hypokalemia, osteoporosis with vertebral fractures, immunosuppression with frequent infections, proximal muscle wasting (patients cannot rise from a chair without using their arms), and mood changes that sometimes reach psychosis."
        },
        {
          "kind": "p",
          "text": "Diagnosis of Cushing: an elevated cortisol demonstrated by 24-hour urine cortisol (the classic screening test) and late-night salivary cortisol (which shows loss of the normal diurnal variation), then a dexamethasone suppression test where failure to suppress cortisol confirms autonomous production. An ACTH level localizes the cause - it is high in Cushing disease (pituitary) and in ectopic ACTH, and low in an adrenal tumor. Treatment: taper exogenous steroids slowly if that is the cause (never abruptly), surgically resect a pituitary or adrenal tumor, or use medical therapy with adrenal-blocking agents like ketoconazole or metyrapone in selected cases."
        },
        {
          "kind": "h",
          "text": "Addison disease - primary adrenal insufficiency"
        },
        {
          "kind": "p",
          "text": "Addison disease is primary adrenal insufficiency - the adrenal cortex is destroyed, so three hormones become deficient: cortisol (glucocorticoid), aldosterone (mineralocorticoid), and adrenal androgens. Autoimmune adrenalitis is the most common cause in developed countries, but tuberculosis is the most common cause globally (recall Hour 8), which is directly relevant for IEN cohorts from high-prevalence regions. Other causes are HIV, metastatic cancer to the adrenals, and adrenal hemorrhage (Waterhouse-Friderichsen syndrome from meningococcal sepsis)."
        },
        {
          "kind": "p",
          "text": "The Addison presentation: fatigue, weight loss, and anorexia; hyperpigmentation - skin darkening because the high ACTH stimulates melanocytes, best seen in the palmar creases, buccal mucosa, scars, and knuckles; hypotension, especially orthostatic; salt craving, because aldosterone is low and sodium is being lost; and nausea, vomiting, abdominal pain, and hypoglycemia. The labs show cortisol low, ACTH high in primary disease (the pituitary is trying to stimulate the failed adrenals), hyperkalemia from the aldosterone loss, hyponatremia, and hypoglycemia. Treatment is glucocorticoid replacement (hydrocortisone is the typical agent) PLUS mineralocorticoid replacement (fludrocortisone, brand Florinef) - lifelong."
        },
        {
          "kind": "h",
          "text": "Critical patient teaching for adrenal insufficiency"
        },
        {
          "kind": "p",
          "text": "This teaching is testable on essentially every NCLEX with an Addison patient, so make it explicit. Never stop steroids abruptly. Use stress dosing - for any illness with fever, for surgery, for dental procedures, and for severe stress, double or triple the daily dose. The body normally produces more cortisol under stress; the Addison patient cannot, so they must take more from outside. The patient wears a medical alert bracelet or necklace identifying them as adrenally insufficient to first responders, and carries emergency injectable hydrocortisone for sick days when oral intake isn't possible - during vomiting or severe diarrhea the patient or caregiver injects hydrocortisone IM to bridge until medical care is reached. And the patient must recognize adrenal crisis: severe weakness, vomiting, abdominal pain, dizziness, confusion, and a drop in blood pressure all mean call for emergency care."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Sick-day stress dosing",
          "text": "Never stop steroids abruptly. During illness, fever, surgery, or dental procedures, the adrenally insufficient patient must double or triple the daily dose, wear a medical alert bracelet, and carry emergency injectable hydrocortisone."
        },
        {
          "kind": "h",
          "text": "Adrenal crisis - the life-threatening emergency"
        },
        {
          "kind": "p",
          "text": "Adrenal crisis is the life-threatening emergency at this end of the spectrum. The triggers are missed steroid doses, severe stress, infection, and surgery without stress dosing. The presentation is severe hypotension and shock unresponsive to fluids alone, hyperkalemia, hyponatremia, hypoglycemia, vomiting, abdominal pain, and altered mental status. Treatment: IV hydrocortisone 100 mg bolus, then continued every 6 hours; aggressive IV normal saline because these patients are intravascularly depleted; correct glucose with D5 or D10 fluids; treat severe hyperkalemia per the Hour 6 protocol - calcium gluconate first if there are ECG changes, then the rest of the sequence; and identify and treat the trigger."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Shock unresponsive to fluids",
          "text": "Adrenal crisis presents as severe hypotension and shock that does not respond to fluids alone - the missing piece is steroid. Give IV hydrocortisone 100 mg bolus, then every 6 hours, alongside aggressive normal saline."
        }
      ]
    },
    {
      "id": "siadh-vs-di",
      "minutes": "30-38",
      "title": "SIADH vs DI",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "SIADH and diabetes insipidus sit at opposite ends of the antidiuretic hormone spectrum. Start with the hormone itself. Antidiuretic hormone - ADH, also called vasopressin - is produced in the hypothalamus and stored in and released from the posterior pituitary, and it acts on the collecting ducts of the kidney to reabsorb water. More ADH means more water reabsorbed, more concentrated urine, and more dilute blood. Less ADH means less water reabsorbed, more dilute urine, and more concentrated blood. From there it is simple: too much ADH equals SIADH; too little ADH, or kidney resistance to ADH, equals diabetes insipidus."
        },
        {
          "kind": "h",
          "text": "SIADH - too much ADH"
        },
        {
          "kind": "p",
          "text": "SIADH is the Syndrome of Inappropriate Antidiuretic Hormone. The causes group into CNS disorders (head injury, stroke, meningitis, encephalitis, tumors), pulmonary disorders (small cell lung cancer is paradigmatic, plus pneumonia), medications (SSRIs - recall Hour 4 - carbamazepine, chemotherapy, and vasopressin analogues given by mistake), the postoperative state, and HIV. The pathophysiology: excess ADH means the kidney holds onto water, water is retained without sodium, and the result is a dilutional hyponatremia. The total body sodium is normal - the patient is simply diluted. Volume status is euvolemic to slightly hypervolemic, and the patient is usually not visibly fluid overloaded because the water distributes throughout the body."
        },
        {
          "kind": "p",
          "text": "SIADH symptoms depend on the rate of sodium decline - acute hyponatremia produces more severe symptoms than chronic. Expect headache, nausea, lethargy, and confusion, and at the severe end seizures at sodium below 120 and coma at the extremes. Chronic SIADH, by contrast, may be asymptomatic at remarkably low sodium levels because the brain adapts. The labs: serum sodium low, below 135; serum osmolality low, below 275; urine osmolality inappropriately high, above 100 and often higher; and urine sodium inappropriately high, above 40. The kidney is holding water that should be excreted and concentrating urine that should be dilute."
        },
        {
          "kind": "p",
          "text": "SIADH treatment: fluid restriction is first-line - typically 800 to 1000 mL/day - and you treat the underlying cause. For severe symptomatic hyponatremia with seizures or coma, give hypertonic 3 percent saline carefully under monitoring. Vasopressin receptor antagonists - tolvaptan and conivaptan - block ADH at the receptor and are used in select cases."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "The sodium correction rule",
          "text": "Recall Hour 6. Do not correct sodium faster than approximately 8-10 mEq/L in any 24-hour period. Faster correction causes osmotic demyelination syndrome (central pontine myelinolysis) - irreversible neurologic injury, locked-in syndrome, often fatal. Slow is safe; fast is dangerous. This is one of the highest-yield rules in nephrology and endocrinology."
        },
        {
          "kind": "h",
          "text": "Diabetes insipidus - too little ADH effect"
        },
        {
          "kind": "p",
          "text": "Diabetes insipidus is the opposite: either insufficient ADH production (central DI) or kidney resistance to ADH (nephrogenic DI). Central DI causes are head injury (the post-traumatic state can transiently or permanently impair ADH production), pituitary surgery (the pituitary is a common neurosurgical site), and hypothalamic disease such as tumors, sarcoidosis, and hemorrhage. Nephrogenic DI causes are lithium toxicity - the most common drug cause, and the connection back to Hour 4 - plus inherited forms, chronic kidney disease, hypercalcemia, and hypokalemia. In nephrogenic DI the kidney is resistant to ADH even when ADH levels are normal or high."
        },
        {
          "kind": "p",
          "text": "DI pathophysiology: insufficient ADH effect means the kidney cannot concentrate urine, so there is massive water loss in the urine. If the patient cannot drink enough to keep up, they develop hypernatremia and dehydration; if they can drink, they become a fluid-managing machine, urinating 5 to 20 liters a day and drinking comparable volumes. The presentation is polyuria (often dramatic, 5 to 20 liters a day), polydipsia (intense, unrelenting thirst, often a craving for cold water), dehydration if intake is limited, and hypernatremia with possible hypotension. The labs: serum sodium high, above 145; serum osmolality high, above 300; urine osmolality inappropriately low, below 300; and urine specific gravity low, below 1.005. The kidney cannot concentrate, so the urine is essentially water."
        },
        {
          "kind": "p",
          "text": "DI treatment splits by type. Central DI is treated with desmopressin (DDAVP), synthetic ADH available intranasal, oral, or parenteral, which simply replaces the missing hormone. Nephrogenic DI is treated, paradoxically, with thiazide diuretics, plus NSAIDs and a low-sodium diet - the mechanism is altering renal handling to allow some urine concentration despite the ADH resistance - and if lithium is the cause, discontinue lithium if clinically possible. For all forms of DI, adequate water replacement is essential, because patients can dehydrate quickly if their access to water is restricted."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Read the sodium to tell them apart",
          "text": "SIADH gives low serum sodium with concentrated urine; DI gives high serum sodium with dilute, low-specific-gravity urine. The serum sodium pattern alone separates the two pairings."
        }
      ],
      "practiceItemId": "pi_lithium_nephrogenic_di"
    },
    {
      "id": "pheochromocytoma",
      "minutes": "38-43",
      "title": "Pheochromocytoma - The Alpha-Before-Beta Rule",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Pheochromocytoma is a catecholamine-secreting tumor of the adrenal medulla. It is rare, but it is high-yield because the perioperative sequencing rule is heavily tested. Most are benign but they cause significant morbidity through episodic hypertensive crises."
        },
        {
          "kind": "h",
          "text": "Presentation and diagnosis"
        },
        {
          "kind": "p",
          "text": "The classic triad is severe paroxysmal headache, palpitations or tachycardia, and diaphoresis - plus episodic hypertension that can be extreme and sometimes provokes hypertensive crises, plus anxiety, tremor, pallor, and sometimes a sense of doom. The symptoms often come in spells lasting minutes to hours, separated by relatively normal periods, although some patients have persistent rather than paroxysmal hypertension. Diagnosis is made by 24-hour urine fractionated metanephrines and catecholamines, plasma free metanephrines, and imaging (CT or MRI of the abdomen) to localize the tumor - most are in the adrenal medulla, though some are in extra-adrenal sites and are called paragangliomas. The definitive treatment is surgical resection."
        },
        {
          "kind": "h",
          "text": "The perioperative sequencing rule - memorize"
        },
        {
          "kind": "p",
          "text": "Before surgery, the patient is started on an ALPHA blocker - phenoxybenzamine is the classic choice, with doxazosin or prazosin as alternatives - and it is started 7 to 14 days before surgery to allow the blood vessels to dilate and the chronically contracted intravascular volume to expand. If the patient has persistent tachycardia after alpha blockade is established, a BETA blocker may be added. Beta blockade comes SECOND. Always second."
        },
        {
          "kind": "p",
          "text": "Here is why the order matters. Catecholamines stimulate both alpha receptors (vasoconstriction and peripheral effects) and beta receptors (cardiac effects). If you block beta first without blocking alpha, the alpha effect continues unopposed - you get severe vasoconstriction without the compensatory cardiac response, and the patient goes into a hypertensive crisis. A beta blocker before an alpha blocker in pheochromocytoma is a wrong answer and a dangerous one. This sequencing rule extends to any catecholamine-excess state - cocaine intoxication, methamphetamine toxicity - and if you must use a beta blocker in those settings, alpha blockade must come first, or you use a mixed alpha-beta agent like labetalol cautiously."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Alpha before beta. Always.",
          "text": "Start the alpha blocker first (phenoxybenzamine), 7-14 days pre-op; add the beta blocker only second, for residual tachycardia. Beta blockade first leaves alpha stimulation unopposed and triggers a hypertensive crisis. The rule applies to all catecholamine-excess states."
        },
        {
          "kind": "p",
          "text": "Intraoperatively, anesthesia titrates short-acting agents - nitroprusside and esmolol - to manage the blood pressure swings during tumor manipulation. After tumor removal the catecholamine source is gone and the patient can become hypotensive, so preload optimization with fluids is essential, followed by postoperative ICU monitoring."
        }
      ]
    },
    {
      "id": "ngn-case-dka",
      "minutes": "43-52",
      "title": "NGN Unfolding Case - DKA",
      "format": "Case",
      "blocks": [
        {
          "kind": "p",
          "text": "This is the last segment of content - an NGN unfolding case study: six items, one patient, the six CJMM steps. A 17-year-old high school student arrives in the ED at 0700, brought by her mother. She was diagnosed with Type 1 diabetes 6 months ago. The mother reports the daughter has had a sore throat and fever for 3 days, has been unable to keep food down for the past 24 hours, and was found this morning very drowsy and breathing strangely. The last reported insulin dose was yesterday morning."
        },
        {
          "kind": "h",
          "text": "Item 1 - Highlight (Recognize Cues)"
        },
        {
          "kind": "p",
          "text": "Initial assessment note: 'Patient drowsy, oriented to person only. Skin warm, dry, flushed. Mucous membranes very dry, lips cracked. Capillary refill 4 seconds. Respirations 32, deep and regular. Acetone smell on breath. Reports abdominal pain. BP 88/56. HR 132. Temp 38.4. RR 32. SpO2 99 on room air. Weight 60 kg.' Highlight every finding requiring immediate follow-up. The findings: drowsy and oriented to person only (altered mental status); the skin signs of dehydration - dry, flushed, dry mucous membranes, capillary refill 4 seconds; respirations 32 deep and regular (Kussmaul respirations); acetone breath (ketosis); abdominal pain (common in DKA); BP 88/56 (hypotension from dehydration); and HR 132 (tachycardia compensating for hypovolemia). The fever and the missed insulin doses are the triggers. The cluster of findings is classic DKA."
        },
        {
          "kind": "h",
          "text": "Item 2 - Matrix (Analyze Cues)"
        },
        {
          "kind": "p",
          "text": "Initial labs come back: glucose 524, pH 7.12, HCO3 8, K+ 5.6, Na+ 132, ketones large, anion gap 22, BUN 38, creatinine 1.4. For each lab, classify it as 'expected in DKA,' 'unexpected,' or 'critical and requires immediate action.' Glucose 524 - expected, in the DKA range. pH 7.12 - expected but critical, severely acidotic because it's below 7.2. HCO3 8 - expected but critical, very low. K+ 5.6 - the expected pattern (acidosis pushing K out of cells), elevated but typical. Na+ 132 - expected, mild hyponatremia from glucose pulling water, and the corrected sodium would be higher. Ketones large - expected. Anion gap 22 - expected, elevated. BUN 38 and creatinine 1.4 - expected, from dehydration. The critical findings are the pH and the bicarbonate - severe acidosis demanding aggressive treatment."
        },
        {
          "kind": "h",
          "text": "Item 3 - Drop-down (Prioritize Hypotheses)"
        },
        {
          "kind": "p",
          "text": "Complete the sentence: 'The client's priority condition is BLANK and was likely triggered by BLANK.' For the first blank - DKA: glucose plus acidosis plus ketones plus a Type 1 diabetic equals DKA. For the second blank - missed insulin during illness: the combination of a febrile illness (which raises insulin requirements) and an inability to take insulin reliably (vomiting, perhaps anorexia) is the most common DKA trigger in a young Type 1 diabetic."
        },
        {
          "kind": "h",
          "text": "Item 4 - Bowtie (Take Action)"
        },
        {
          "kind": "p",
          "text": "Center is the priority condition, left is two priority actions, right is two parameters to monitor. Center - diabetic ketoacidosis with severe acidosis. Left - initiate IV normal saline 1 to 1.5 liters in the first hour (fluids first), and initiate the IV Regular insulin infusion at 0.1 unit/kg/hr (after the potassium check). Right - monitor serum potassium every 2 hours initially (the highest-risk lab in DKA management), and monitor mental status and respiratory pattern. Note that the K is 5.6 currently, so there is no need to hold insulin for hypokalemia, but it will fall rapidly with insulin and replacement may be needed soon."
        },
        {
          "kind": "h",
          "text": "Item 5 - Extended Multiple Response (Generate Solutions)"
        },
        {
          "kind": "p",
          "text": "Select all appropriate orders to anticipate. IV normal saline bolus - yes, fluids first. IV Regular insulin infusion - yes, after the potassium check. Subcutaneous insulin lispro - no, IV is the only route in active DKA. IV bicarbonate 50 mEq - only if pH is below 6.9, and the current pH of 7.12 means no bicarbonate. Serum chemistry every 2 hours - yes, for monitoring. Cardiac monitoring - yes, given the electrolyte shifts. IV potassium chloride at 10 mEq/hr - eventually yes, anticipate it as K falls with insulin. Chest X-ray and urinalysis - yes, to identify the triggering infection. Serum lactate - reasonable to check. Intubation - not currently indicated; the patient is breathing adequately."
        },
        {
          "kind": "h",
          "text": "Item 6 - Trend (Evaluate Outcomes)"
        },
        {
          "kind": "p",
          "text": "Vital signs and labs at four time points after initiating treatment. At 0700 - BP 88/56, HR 132, glucose 524, K 5.6, pH 7.12. At 0900 - BP 102/64, HR 110, glucose 388, K 4.4, pH 7.22. At 1100 - BP 110/70, HR 96, glucose 248, K 3.5, pH 7.32. At 1300 - BP 116/72, HR 88, glucose 196, K 3.1, pH 7.38. What is improving, worsening, or requires concern? Improving - blood pressure, heart rate, glucose, and pH are all trending toward normal, an improving clinical picture. Concerning - the potassium: starting at 5.6, now at 3.1, below the critical 3.3 threshold. Insulin is doing its job, but the patient is now hypokalemic. The action is to increase potassium replacement, possibly slow the insulin temporarily, and hold further insulin escalation. The glucose has reached 196, meaning dextrose should be added to the IV fluids to allow continued insulin infusion while preventing hypoglycemia. Treatment is working overall, but the potassium needs immediate attention - this is the predictable potassium pitfall playing out in real time."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "The reasoning thread of the case",
          "text": "Recognize the classic DKA cluster, read the lab matrix (pH and bicarbonate are the critical findings), name the trigger (missed insulin during a febrile illness), act with fluids first then insulin after the K check, anticipate the right orders, and then watch the trend - where the potassium falling from 5.6 to 3.1 over six hours is the predictable potassium pitfall in real time. That is one full DKA case worked through all six CJMM steps; expect three NGN cases like this on your test, embedded among the stand-alone items."
        }
      ]
    },
    {
      "id": "cross-system-synthesis",
      "minutes": "52-58",
      "title": "Cross-System Synthesis",
      "format": "Case",
      "blocks": [
        {
          "kind": "p",
          "text": "A 52-year-old man with bipolar disorder has been stable on lithium 900 mg twice daily for 12 years. He presents to clinic reporting that for the past 3 months he has been urinating 'all night' and drinking water 'constantly.' Today's labs: lithium 0.8 mEq/L (therapeutic), serum Na+ 149 mEq/L, serum osmolality 308 mOsm/kg, urine osmolality 110, urine specific gravity 1.004, creatinine 1.6 mg/dL. What is the most likely diagnosis, what is the recommended workup, and how would you counsel the patient?"
        },
        {
          "kind": "p",
          "text": "Diagnosis - nephrogenic diabetes insipidus due to chronic lithium therapy. The labs are classic: high serum sodium, high serum osmolality, low urine osmolality, and low specific gravity. The lithium level is therapeutic, which rules out acute lithium toxicity as a different cause, and the 12-year duration of therapy is consistent with the slow development of nephrogenic DI."
        },
        {
          "kind": "p",
          "text": "Workup - confirm with a water deprivation test or a response-to-desmopressin test (in nephrogenic DI, the urine osmolality does not rise in response to desmopressin because the kidney is resistant). Assess renal function more broadly, since the creatinine of 1.6 suggests some chronic lithium nephrotoxicity. And discuss with psychiatry whether lithium can be discontinued or substituted, given the chronicity and the patient's degree of mood stability."
        },
        {
          "kind": "p",
          "text": "Counseling - the patient should not abruptly stop lithium without psychiatric guidance, because the bipolar relapse risk is significant. Adequate hydration is essential. Discuss the tradeoff between mood stability and the renal complications. If lithium is continued, treatment options include amiloride, thiazide diuretics, NSAIDs, and salt restriction to reduce urine output, with close sodium monitoring. A medical alert bracelet should note the bipolar disorder, lithium therapy, and DI."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Why this case matters",
          "text": "It synthesizes Hour 4 (lithium adverse effects and renal toxicity), Hour 6 (sodium and osmolality interpretation), Hour 9 (DI pathophysiology), and Hour 2 (priority framework - patient safety in a complex chronic medication decision). It is exactly the kind of case the NCLEX might test as a six-item unfolding study."
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
          "text": "Homework before Hour 10: fifty endocrine-focused questions with deliberate emphasis on DKA management sequences and SIADH/DI differentiation, because both are top-frequency exam patterns. For every wrong answer in your journal, note specifically which pairing tripped you up - that is where your studying pays off most."
        },
        {
          "kind": "p",
          "text": "Hour 10 is renal and gastrointestinal clinical content: AKI versus CKD, dialysis safety, fluid and electrolyte shifts, GI bleeding, cirrhosis and hepatic encephalopathy (recall the lactulose mechanism from Hour 6), pancreatitis, bowel obstruction, and ostomy care. See you Hour 10."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Your highest-yield study artifact",
          "text": "Photograph the four side-by-side tables - DKA vs HHS, hyper vs hypothyroid, Cushing vs Addison, SIADH vs DI - and return to them daily through exam prep. Together they are the single highest-yield endocrine study tool."
        }
      ]
    }
  ]
};
