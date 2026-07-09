import type { Lesson } from "./lessonTypes";

/**
 * Section 12 - Maternity. Auto-generated from the Florence Academy
 * bootcamp instructor script (expanded draft). Pending nurse-educator review.
 */
export const lesson: Lesson = {
  "meta": {
    "number": 12,
    "title": "Maternity",
    "durationMin": 60,
    "audience": "Internationally educated nurses - Philippines, UK, Kenya, Ghana",
    "contentWeight": "Approximately 6-8% of NCLEX items - but disproportionately important",
    "tagline": "When recognition fails in maternity, two patients are in danger at once - so this hour matters more than its percentage suggests."
  },
  "objectives": [
    "Recognize preeclampsia (mild and severe features), eclampsia, and HELLP syndrome, and apply magnesium sulfate management with the toxicity-sign sequence from Hour 5.",
    "Interpret fetal heart rate strips using the VEAL CHOP framework - early, late, variable, accelerations - and apply the SPFON intervention sequence for late decelerations.",
    "Differentiate placenta previa from placental abruption by presentation and remember the 'no digital vaginal exam' rule for previa.",
    "Apply gestational diabetes screening, management, and neonatal implications.",
    "Apply the 4 T's framework to postpartum hemorrhage and recognize uterine atony as the leading cause, with the fundal-massage-then-empty-bladder priority sequence.",
    "Perform a normal newborn assessment including APGAR scoring, expected vital signs, and primitive reflexes.",
    "Recognize neonatal red flags requiring immediate provider notification - pathologic jaundice in the first 24 hours, central cyanosis, respiratory distress, sepsis signs, and bilious emesis."
  ],
  "timing": [
    {
      "minutes": "0-3",
      "segment": "Recap & frame the maternity hour",
      "format": "Lecture"
    },
    {
      "minutes": "3-13",
      "segment": "Preeclampsia, eclampsia, HELLP",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "13-21",
      "segment": "Fetal heart rate strips - VEAL CHOP",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "21-28",
      "segment": "Placenta previa vs abruption",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "28-34",
      "segment": "Gestational diabetes & screening",
      "format": "Lecture"
    },
    {
      "minutes": "34-42",
      "segment": "Postpartum hemorrhage - 4 T's",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "42-50",
      "segment": "Normal newborn assessment - APGAR, reflexes",
      "format": "Lecture"
    },
    {
      "minutes": "50-55",
      "segment": "Neonatal red flags",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "55-58",
      "segment": "Synthesis - preeclampsia on magnesium with toxicity",
      "format": "Case"
    },
    {
      "minutes": "58-60",
      "segment": "Close & homework",
      "format": "Lecture"
    }
  ],
  "practiceItems": {
    "pi_preeclampsia_hellp": {
      "id": "pi_preeclampsia_hellp",
      "stem": "A client at 34 weeks gestation is admitted with BP 168/108, severe headache, blurred vision, and 3+ proteinuria. Labs: platelets 78,000, AST 142, ALT 156, LDH 480. Which condition is the nurse caring for, and what is the priority medication?",
      "options": [
        {
          "key": "A",
          "text": "Mild preeclampsia; oral labetalol."
        },
        {
          "key": "B",
          "text": "Severe preeclampsia with HELLP features; IV magnesium sulfate plus IV labetalol."
        },
        {
          "key": "C",
          "text": "Chronic hypertension in pregnancy; methyldopa."
        },
        {
          "key": "D",
          "text": "Gestational hypertension; observation only."
        }
      ],
      "answer": "B",
      "rationale": "This is severe preeclampsia with HELLP features - BP 168/108 plus severe headache plus visual changes plus thrombocytopenia (platelets 78,000) plus elevated transaminases (AST 142, ALT 156) plus elevated LDH (480). Magnesium sulfate is started for seizure prophylaxis and IV labetalol for blood pressure control; at 34 weeks with HELLP, the decision to deliver is often imminent. A misses the severity. C does not match the clinical picture. D dramatically understates the urgency.",
      "cjmm": "analyze-cues",
      "reference": "Section 12 · Preeclampsia, eclampsia, HELLP"
    },
    "pi_late_decelerations": {
      "id": "pi_late_decelerations",
      "stem": "During labor with continuous fetal monitoring, the nurse observes the following pattern: FHR baseline 145 with moderate variability. Decelerations begin 30 seconds after the start of each contraction, with the nadir 30 seconds after the peak, and return to baseline 30 seconds after the contraction ends. The client is receiving oxytocin augmentation. What is the nurse's FIRST action?",
      "options": [
        {
          "key": "A",
          "text": "Document the early decelerations and continue monitoring."
        },
        {
          "key": "B",
          "text": "Stop the oxytocin infusion."
        },
        {
          "key": "C",
          "text": "Notify the provider."
        },
        {
          "key": "D",
          "text": "Prepare for immediate cesarean delivery."
        }
      ],
      "answer": "B",
      "rationale": "The pattern described is LATE decelerations - they begin after the contraction starts, nadir after the peak, and return after the contraction ends. The cause is uteroplacental insufficiency, and the intervention is the SPFON sequence. The FIRST action is to stop the oxytocin, eliminating the offending agent and reducing contraction stress; then position, fluids, oxygen, notify. A misreads the pattern as early (which would be benign and mirror the contraction). C and D come later in the sequence.",
      "cjmm": "take-actions",
      "reference": "Section 12 · Fetal heart rate strips - VEAL CHOP"
    },
    "pi_abruption": {
      "id": "pi_abruption",
      "stem": "A client at 34 weeks gestation arrives in the ED reporting sudden onset of severe abdominal pain. She passes a small amount of dark blood. On examination: BP 92/60, HR 122, the uterus is rigid and tender, fetal heart rate shows late decelerations with bradycardia to 100. Which condition is most likely?",
      "options": [
        {
          "key": "A",
          "text": "Placenta previa."
        },
        {
          "key": "B",
          "text": "Placental abruption."
        },
        {
          "key": "C",
          "text": "Uterine rupture."
        },
        {
          "key": "D",
          "text": "Preterm labor."
        }
      ],
      "answer": "B",
      "rationale": "This is placental abruption - painful dark bleeding, a rigid tender uterus, fetal distress with late decelerations and bradycardia, and hemodynamic instability suggesting significant (possibly concealed) blood loss. Placenta previa would be painless bright red bleeding with a soft uterus. Uterine rupture is more typical in previous cesarean patients during labor. Preterm labor without abruption would not cause this clinical picture.",
      "cjmm": "analyze-cues",
      "reference": "Section 12 · Placenta previa vs abruption"
    },
    "pi_pph_atony": {
      "id": "pi_pph_atony",
      "stem": "Two hours after a vaginal delivery, a client has saturated three perineal pads in 30 minutes. On assessment, the fundus is boggy and displaced to the right, 3 cm above the umbilicus. BP 96/58, HR 112. What is the nurse's FIRST action?",
      "options": [
        {
          "key": "A",
          "text": "Administer IV oxytocin per standing order."
        },
        {
          "key": "B",
          "text": "Massage the fundus while supporting the lower uterine segment."
        },
        {
          "key": "C",
          "text": "Notify the provider immediately."
        },
        {
          "key": "D",
          "text": "Assist the client to void or insert a catheter to empty the bladder."
        }
      ],
      "answer": "B",
      "rationale": "A boggy uterus equals atony, and the first action is fundal massage. The fundus is also displaced to the right, suggesting a full bladder is contributing - emptying the bladder (D) is the next step after the immediate massage. Oxytocin (A) and provider notification (C) follow. The test pattern is fundal massage FIRST for atony, then bladder, then medications, then escalation.",
      "cjmm": "take-actions",
      "reference": "Section 12 · Postpartum hemorrhage - 4 T's"
    },
    "pi_neonatal_red_flags": {
      "id": "pi_neonatal_red_flags",
      "stem": "A nurse is assessing a newborn at 8 hours of age. Findings include: HR 168, RR 76, axillary temperature 36.2°C, central cyanosis of the lips and tongue, grunting, and substernal retractions. Acrocyanosis of the hands and feet is also noted. Which findings require immediate provider notification? Select all that apply.",
      "options": [
        {
          "key": "A",
          "text": "HR 168 sustained."
        },
        {
          "key": "B",
          "text": "RR 76."
        },
        {
          "key": "C",
          "text": "Temperature 36.2°C."
        },
        {
          "key": "D",
          "text": "Central cyanosis of lips and tongue."
        },
        {
          "key": "E",
          "text": "Grunting and retractions."
        },
        {
          "key": "F",
          "text": "Acrocyanosis of hands and feet."
        }
      ],
      "answer": "A, B, C, D, E",
      "rationale": "A, B, C, D, and E are all concerning. A sustained HR above 160 is tachycardia; RR 76 is well above the 60 threshold (tachypnea); temperature 36.2°C is below the normal range - hypothermia, concerning for sepsis since newborns often do not mount a febrile response; central cyanosis is never normal; and grunting and retractions are signs of significant respiratory distress. F - acrocyanosis at 8 hours is still potentially within the first 24-hour normal window, though if it persists alongside other findings, evaluation is appropriate. The cluster together strongly suggests a serious problem - possibly sepsis, congenital heart disease, or respiratory pathology - requiring immediate evaluation. Questions like this train you to recognize the cluster, not just single findings.",
      "cjmm": "recognize-cues",
      "reference": "Section 12 · Neonatal red flags"
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
          "text": "Welcome to Hour 12 - maternity and newborn. Maternity content is approximately 6 to 8 percent of NCLEX items, but the consequences of missed recognition in maternity are catastrophic for two patients simultaneously. That is why this hour matters more than its percentage suggests, and why we drill the high-yield patterns until they are reflexive."
        },
        {
          "kind": "p",
          "text": "There are heavy callbacks today, so keep the earlier hours close. Magnesium sulfate returns from Hour 5 - the toxicity sequence and the calcium gluconate antidote. Oxytocin returns from Hour 5, both for labor and for postpartum hemorrhage. The SPFON sequence from Hour 5 - Stop oxytocin, Position, Fluids, Oxygen, Notify - is applied here to fetal distress. And the priority frameworks from Hour 2, especially ABC, anchor every decision we make."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Note for IEN cohorts",
          "text": "Maternal mortality is dramatically higher in the Philippines, Kenya, and Ghana than in the US or UK, and many of you have witnessed eclampsia and postpartum hemorrhage at scale. Your clinical pattern recognition is often strong. What is usually new is the US protocol specifics - the formal magnesium toxicity sequence, the VEAL CHOP fetal monitoring framework, and the postpartum hemorrhage 4 T's structure."
        }
      ]
    },
    {
      "id": "preeclampsia-eclampsia-hellp",
      "minutes": "3-13",
      "title": "Preeclampsia, Eclampsia, HELLP",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Preeclampsia is new-onset hypertension PLUS proteinuria - or other end-organ involvement - after 20 weeks gestation. The timing matters: hypertension before 20 weeks is chronic, not preeclamptic. The diagnostic threshold is a blood pressure of 140 over 90 or higher, documented on two occasions at least 4 hours apart."
        },
        {
          "kind": "h",
          "text": "Severe features"
        },
        {
          "kind": "p",
          "text": "Any one of the following severe features upgrades the diagnosis to 'preeclampsia with severe features,' which raises the urgency of intervention. These are worth memorizing because the exam uses them to separate a stable patient from an emergent one."
        },
        {
          "kind": "list",
          "items": [
            "Blood pressure at or above 160 over 110.",
            "Severe headache.",
            "Visual changes - scotomata, blurred vision, photophobia.",
            "Epigastric or right upper quadrant pain - this is liver capsule stretch and a warning sign for HELLP.",
            "Oliguria - urine output below 500 mL in 24 hours.",
            "Pulmonary edema.",
            "Thrombocytopenia - platelets below 100,000.",
            "Elevated liver enzymes - twice normal.",
            "Serum creatinine above 1.1 mg/dL or doubling."
          ]
        },
        {
          "kind": "h",
          "text": "Eclampsia"
        },
        {
          "kind": "p",
          "text": "Eclampsia is preeclampsia plus seizures. It can occur antepartum, intrapartum, or postpartum. Most cases occur antepartum or intrapartum, but a significant minority occur in the first 48 hours postpartum, with rare cases up to 6 weeks after delivery. The postpartum eclampsia patient is often missed because she has 'delivered already' and the team assumes the risk is past - but it is not. Continue magnesium for 24 hours postpartum and watch for seizures up to 6 weeks."
        },
        {
          "kind": "h",
          "text": "HELLP syndrome"
        },
        {
          "kind": "p",
          "text": "HELLP stands for Hemolysis, Elevated Liver enzymes, and Low Platelets, and it is a variant of severe preeclampsia. The critical pitfall is that HELLP can present WITHOUT hypertension or proteinuria. A pregnant woman with epigastric pain, nausea, vomiting, and malaise - with no obvious BP elevation - may have HELLP, and the labs are what make the diagnosis."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Memorize the HELLP labs",
          "text": "Platelets below 100,000, AST/ALT elevated, LDH elevated (from hemolysis), schistocytes (fragmented red cells) on peripheral smear, and total bilirubin elevated. Hepatic rupture is the feared complication in severe HELLP - sudden severe RUQ pain with hemodynamic collapse."
        },
        {
          "kind": "h",
          "text": "Treatment principles"
        },
        {
          "kind": "p",
          "text": "The definitive treatment for preeclampsia and eclampsia is DELIVERY. Once the placenta is removed, the underlying mechanism resolves over days. The decision to deliver balances severity, gestational age, and fetal status - but always remember that delivery is the cure."
        },
        {
          "kind": "p",
          "text": "Magnesium sulfate, from Hour 5, is given for seizure prophylaxis in severe preeclampsia and for treatment of eclampsia. The loading dose is typically 4 to 6 grams IV over 15 to 30 minutes, followed by a maintenance infusion of 1 to 2 grams per hour, and it is continued for 24 hours postpartum. The therapeutic level is 4 to 7 milliequivalents per liter."
        },
        {
          "kind": "h",
          "text": "Magnesium toxicity signs in order"
        },
        {
          "kind": "p",
          "text": "The magnesium toxicity signs appear in a predictable sequence, and you must be able to recite this order cold - it is one of the highest-frequency NCLEX patterns and returns in the synthesis case at the end of this hour."
        },
        {
          "kind": "list",
          "items": [
            "One - loss of deep tendon reflexes. This is the FIRST sign; the patellar reflex is monitored every 1 to 2 hours.",
            "Two - respiratory depression, with a respiratory rate below 12.",
            "Three - hypotension.",
            "Four - decreased level of consciousness.",
            "Five - decreased urine output, below 30 mL per hour."
          ]
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "The antidote must be at the bedside",
          "text": "Calcium gluconate, 10 percent solution, 10 mL IV slow push, is the antidote to magnesium toxicity. It must be at the bedside whenever magnesium is infusing. If it is not at the bedside, that is a safety failure to fix immediately."
        },
        {
          "kind": "h",
          "text": "Antihypertensives and supportive care"
        },
        {
          "kind": "p",
          "text": "For severe hypertension, labetalol IV is first-line - recall Hour 3, it is a mixed alpha-beta blocker. Hydralazine IV is the alternative, and nifedipine PO returns from Hours 3 and 7. The target is a systolic BP of 140 to 160 and a diastolic BP of 90 to 110. Do not lower below this, because too-low blood pressure causes uteroplacental hypoperfusion and fetal distress."
        },
        {
          "kind": "p",
          "text": "Antenatal corticosteroids - betamethasone or dexamethasone, given IM as two doses 24 hours apart - are used for fetal lung maturity if the pregnancy is less than 34 weeks, extended to 36 plus 6 days in many current protocols. This is another Hour 5 callback."
        },
        {
          "kind": "p",
          "text": "For eclamptic seizure management, ensure airway and oxygenation, give the magnesium loading dose if it has not already been initiated, and protect the patient from injury by padding the rails and using a side-lying position. Do NOT restrain the patient. Maintain continuous fetal monitoring, and once the seizure resolves and the patient is stable, proceed to delivery - typically cesarean if she is not already in active labor with a controlled situation."
        }
      ],
      "practiceItemId": "pi_preeclampsia_hellp"
    },
    {
      "id": "fetal-heart-rate-strips",
      "minutes": "13-21",
      "title": "Fetal Heart Rate Strips - VEAL CHOP",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Fetal heart rate interpretation is the skill that distinguishes a maternity-confident nurse from one who feels lost on labor and delivery. Once you have the framework, the strips become readable. We will build the VEAL CHOP table live, and tracing each pattern with your finger while reciting the mnemonic is a proven way to make it stick."
        },
        {
          "kind": "p",
          "text": "The normal baseline fetal heart rate is 110 to 160 beats per minute. Below 110 is bradycardia, and above 160 is tachycardia."
        },
        {
          "kind": "h",
          "text": "Variability"
        },
        {
          "kind": "p",
          "text": "Variability is the moment-to-moment fluctuation of the baseline. Moderate variability - fluctuations of 6 to 25 beats per minute in amplitude - is reassuring because it indicates an intact fetal central-nervous-system-to-cardiac connection. Absent or minimal variability is concerning: the fetus may be hypoxic, sedated, or having a CNS issue."
        },
        {
          "kind": "h",
          "text": "Three-tier categorization"
        },
        {
          "kind": "p",
          "text": "Category I is normal and reassuring - baseline 110 to 160, moderate variability, no late or variable decelerations, with accelerations present or absent. Continue routine monitoring. Category II is indeterminate - anything that is not Category I or Category III. Most strips spend time in Category II at various points, and it requires evaluation, intrauterine resuscitation, and watchful waiting."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Category III demands immediate action",
          "text": "Category III is abnormal: absent variability with recurrent late or variable decelerations, OR absent variability with bradycardia, OR a sinusoidal pattern. It requires immediate action - intrauterine resuscitation plus consideration of expedited delivery."
        },
        {
          "kind": "h",
          "text": "Accelerations"
        },
        {
          "kind": "p",
          "text": "An acceleration is an increase in fetal heart rate of 15 beats per minute or more above baseline, lasting 15 seconds or more, in fetuses 32 weeks or older (the criteria are smaller in earlier gestation). Accelerations are REASSURING - a sign of fetal well-being. The non-stress test looks for two accelerations in 20 minutes as evidence of fetal oxygenation."
        },
        {
          "kind": "h",
          "text": "Decelerations - four types"
        },
        {
          "kind": "p",
          "text": "Early decelerations MIRROR the contraction: they begin with contraction onset, reach their nadir at the peak of the contraction, and return to baseline by the end of the contraction - the deceleration and the contraction are in phase. The cause is head compression: as the baby's head is squeezed against the pelvis, vagal stimulation slows the heart. Early decelerations are BENIGN and need no intervention, and they are common in active labor as descent occurs."
        },
        {
          "kind": "p",
          "text": "Late decelerations are the 'shifted right' pattern: they begin AFTER the contraction starts, reach their nadir AFTER the peak, and return to baseline AFTER the contraction ends - the deceleration lags the contraction. The cause is uteroplacental insufficiency. During a contraction, blood flow to the placenta drops; if the placenta is already marginal, the fetus becomes hypoxic during contractions and the heart rate slowly drops in response. Late decelerations are CONCERNING and require intervention."
        },
        {
          "kind": "p",
          "text": "Variable decelerations are an ABRUPT decrease - the rate drops rapidly, at least 15 beats per minute, lasting at least 15 seconds, and they are variable in shape, timing, and depth (V-shaped, U-shaped, or W-shaped). The cause is cord compression, either from fetal position or from oligohydramnios. The intervention is to reposition the mother to a different lateral position, with amnioinfusion (sterile fluid into the uterus) in selected cases to cushion the cord."
        },
        {
          "kind": "p",
          "text": "Prolonged decelerations are a decrease of 15 beats per minute or more lasting longer than 2 minutes but less than 10 minutes. There are many possible causes - cord compression, hypotension, placental abruption. They are concerning, so investigate and intervene."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "VEAL CHOP - memorize",
          "text": "The first letters of the four patterns map to their causes. V - Variable - Cord compression. E - Early - Head compression. A - Accelerations - Okay (fetal well-being). L - Late - Placental insufficiency."
        },
        {
          "kind": "h",
          "text": "SPFON for late decelerations"
        },
        {
          "kind": "p",
          "text": "For late decelerations or fetal distress on oxytocin, use the SPFON sequence from Hour 5, in order. S - STOP the oxytocin if it is infusing; the most common iatrogenic cause of fetal distress is too much oxytocin, so stop the offending agent first. P - POSITION the mother, left lateral preferred, which improves uteroplacental blood flow and avoids vena caval compression. F - FLUID bolus on the primary IV to improve uteroplacental perfusion. O - OXYGEN via non-rebreather face mask at 10 liters per minute to improve fetal oxygenation. N - NOTIFY the provider."
        }
      ],
      "practiceItemId": "pi_late_decelerations"
    },
    {
      "id": "previa-vs-abruption",
      "minutes": "21-28",
      "title": "Placenta Previa vs Abruption",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "There are two major causes of antepartum bleeding - placenta previa and placental abruption - and they present in OPPOSITE ways. The differentiation matters because management diverges sharply, which is exactly why the exam loves this pair."
        },
        {
          "kind": "h",
          "text": "Placenta previa"
        },
        {
          "kind": "p",
          "text": "In placenta previa, the placenta is implanted in the lower uterine segment, partially or completely covering the cervical os. It is diagnosed by ultrasound and is increasingly common with advanced maternal age and prior cesarean delivery."
        },
        {
          "kind": "p",
          "text": "Previa presents as PAINLESS bright red vaginal bleeding in late pregnancy, typically the third trimester. The uterus is soft and non-tender on palpation, and the fetal heart rate is usually normal until significant blood loss occurs and maternal hemodynamics deteriorate."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "No digital vaginal exam in previa",
          "text": "This is highly testable. A digital vaginal exam can disrupt the placenta and cause catastrophic hemorrhage. If previa is suspected based on a history of bleeding, the exam waits for confirmation by ultrasound. If previa is confirmed, delivery is by cesarean section - vaginal delivery through a placenta is fatal."
        },
        {
          "kind": "p",
          "text": "Previa management is to stabilize the mother with IV access and a type and cross, monitor mother and fetus continuously, give anti-D immunoglobulin if the mother is Rh-negative to prevent alloimmunization, and plan for cesarean delivery - with timing that depends on the severity of bleeding, gestational age, and fetal status."
        },
        {
          "kind": "h",
          "text": "Placental abruption"
        },
        {
          "kind": "p",
          "text": "Placental abruption is the premature separation of a normally implanted placenta from the uterine wall before delivery. The placenta tears away from the wall, blood accumulates behind it, and the placenta can no longer support the fetus."
        },
        {
          "kind": "p",
          "text": "Abruption presents with PAINFUL dark red bleeding. Sometimes the blood is concealed behind the placenta, so external bleeding may be minimal or absent despite significant blood loss. The uterus is rigid, board-like, and tender because the blood irritates the myometrium and causes contraction, and uterine contractions may be present. Fetal distress is common - variable or late decelerations, or fetal bradycardia, even fetal demise."
        },
        {
          "kind": "p",
          "text": "Abruption risk factors include hypertension (the most important), cocaine use, abdominal trauma (including motor vehicle collisions, falls, and intimate partner violence), smoking, multiparity, prior abruption, and premature rupture of membranes."
        },
        {
          "kind": "p",
          "text": "Abruption management is an emergency depending on severity. Stabilize the mother with IV access using large-bore catheters and type and crossmatch for blood products, maintain continuous fetal monitoring, and prepare for emergency delivery - vaginal if fetal status is reassuring and delivery is imminent, cesarean if there is fetal distress or maternal instability. DIC is a feared complication, because placental disruption releases tissue thromboplastin and triggers the coagulation cascade, so monitor coagulation studies and replace blood products as needed."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Quick differentiator",
          "text": "Previa equals PAINLESS BRIGHT RED bleeding with a SOFT uterus and no digital exam. Abruption equals PAINFUL DARK bleeding with a RIGID uterus and possible concealed bleeding. Two clinical pictures, two trajectories, two different right answers."
        }
      ],
      "practiceItemId": "pi_abruption"
    },
    {
      "id": "gestational-diabetes",
      "minutes": "28-34",
      "title": "Gestational Diabetes & Screening",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Gestational diabetes mellitus is diabetes first diagnosed during pregnancy, typically resolving postpartum but with long-term implications for both mother and child. Many of you have strong baseline knowledge here; the goal is to lock in the US screening numbers and the neonatal consequences."
        },
        {
          "kind": "h",
          "text": "Risk factors"
        },
        {
          "kind": "p",
          "text": "Risk factors include previous GDM, obesity, a family history of diabetes, advanced maternal age, polyhydramnios, a history of macrosomic infants weighing more than 4000 grams, and polycystic ovary syndrome. Certain ethnic groups have higher prevalence - Hispanic, Asian, African, and Native American populations - which is relevant for IEN cohorts whose patient populations may carry higher baseline risk."
        },
        {
          "kind": "h",
          "text": "Screening"
        },
        {
          "kind": "p",
          "text": "Screening is universal at 24 to 28 weeks gestation in the US, and a two-step approach is common. Step one is the 1-hour glucose challenge test: the patient drinks a 50 gram glucose load and blood is drawn at 1 hour. The screen is positive if the blood glucose is at or above 130 to 140 milligrams per deciliter - the threshold varies by institution between these values."
        },
        {
          "kind": "p",
          "text": "Step two, if step one is positive, is the 3-hour oral glucose tolerance test: a 100 gram glucose load, with blood drawn fasting and at 1, 2, and 3 hours. GDM is diagnosed if two or more values exceed the diagnostic thresholds."
        },
        {
          "kind": "h",
          "text": "Management"
        },
        {
          "kind": "p",
          "text": "Dietary modification is the first-line therapy. Limit simple carbohydrates, distribute carbohydrates across three meals and two to three snacks daily, balance with protein and fat to slow absorption, and avoid sugary beverages."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "GDM glucose targets - tighter than non-pregnant",
          "text": "Monitor fasting and 1- or 2-hour postprandial glucose. Targets: fasting below 95, 1-hour postprandial below 140, 2-hour postprandial below 120."
        },
        {
          "kind": "p",
          "text": "If dietary management fails, insulin is added. Insulin is the safest medication for GDM because it does NOT cross the placenta. Recall Hour 4 - a typical regimen may include long-acting insulin plus mealtime rapid-acting. Some institutions use metformin or glyburide for GDM, but insulin remains the safest and most studied; note that metformin crosses the placenta."
        },
        {
          "kind": "h",
          "text": "Risks of uncontrolled GDM"
        },
        {
          "kind": "p",
          "text": "Maternal risks of uncontrolled GDM include preeclampsia, an increased cesarean delivery rate, and future type 2 diabetes risk - up to 50 to 70 percent within 20 years."
        },
        {
          "kind": "p",
          "text": "Fetal and neonatal risks include macrosomia (large for gestational age, increasing the risks of shoulder dystocia and birth trauma) and neonatal hypoglycemia - after delivery, when the maternal glucose supply ends abruptly while neonatal insulin remains elevated, the newborn drops, which we revisit in the newborn segment. Other risks are neonatal hyperbilirubinemia, respiratory distress syndrome, polycythemia, and congenital anomalies in poorly controlled pre-gestational diabetes, because first-trimester glucose control matters for organogenesis."
        },
        {
          "kind": "p",
          "text": "For postpartum follow-up, a 75-gram 2-hour oral glucose tolerance test at 6 to 12 weeks postpartum identifies persistent diabetes or impaired glucose tolerance. Even women whose GDM resolves carry a substantially elevated lifelong risk of type 2 diabetes, so ongoing screening every 1 to 3 years is recommended."
        }
      ]
    },
    {
      "id": "postpartum-hemorrhage",
      "minutes": "34-42",
      "title": "Postpartum Hemorrhage - 4 T's",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Postpartum hemorrhage is the leading cause of maternal mortality worldwide, and it is particularly important for IEN cohorts from regions with higher PPH-related mortality. The definition is a cumulative blood loss of 1000 milliliters or more, OR blood loss with signs or symptoms of hypovolemia, within 24 hours after birth - regardless of route. The traditional definition of 500 mL for vaginal delivery and 1000 mL for cesarean has been updated to a single 1000 mL threshold with attention to clinical signs."
        },
        {
          "kind": "p",
          "text": "Early PPH occurs within 24 hours of delivery and is the most common and most acute. Late PPH occurs from 24 hours to 12 weeks postpartum and often arises from retained tissue or infection."
        },
        {
          "kind": "h",
          "text": "The four T's of PPH"
        },
        {
          "kind": "p",
          "text": "Tone refers to uterine atony, the number-one cause of early PPH, responsible for approximately 70 to 80 percent of cases. The uterus fails to contract after delivery, so the spiral arteries that supplied the placenta continue to bleed. Risk factors include prolonged labor; induced or augmented labor with oxytocin (paradoxically, the muscle fatigues); high parity; an overdistended uterus from twins, polyhydramnios, or macrosomia; chorioamnionitis; and magnesium sulfate, which relaxes smooth muscle (recall Hour 5)."
        },
        {
          "kind": "p",
          "text": "Trauma refers to lacerations of the cervix, vagina, or perineum; uterine rupture; and hematoma - vulvar, vaginal, or retroperitoneal. The key clinical clue is that vaginal bleeding with a firm, well-contracted uterus suggests trauma, not atony. If the uterus is contracted but bleeding continues, look for the laceration."
        },
        {
          "kind": "p",
          "text": "Tissue refers to retained placental fragments. The uterus may fail to contract fully when something is still inside it, and manual exploration or dilation and curettage may be required to remove the retained tissue."
        },
        {
          "kind": "p",
          "text": "Thrombin refers to coagulopathy, either preexisting (von Willebrand disease, anticoagulant use - recall Hour 3) or acquired (DIC from placental abruption, sepsis, or amniotic fluid embolism; factor deficiencies)."
        },
        {
          "kind": "h",
          "text": "Initial nursing actions for atony"
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "The testable sequence for atony",
          "text": "Fundal massage FIRST, then empty the bladder, then uterotonics, then escalation. Many learners default to giving oxytocin first because medication feels like action - redirect to massage first."
        },
        {
          "kind": "p",
          "text": "Step one is fundal massage. Locate the fundus by palpation just below or at the level of the umbilicus, support the lower uterine segment with one hand to prevent uterine inversion, and firmly massage the fundus with the other hand. This stimulates uterine contraction and is often the single most effective initial intervention."
        },
        {
          "kind": "p",
          "text": "Step two is to assess and empty the bladder. A full bladder displaces the uterus from the midline - typically to the right - and prevents adequate contraction. Have the patient void, or catheterize if necessary."
        },
        {
          "kind": "p",
          "text": "Step three is uterotonics in sequence. Oxytocin is first-line (recall Hour 5) - 10 to 40 units in 1 liter of crystalloid IV, or 10 units IM - continued or escalated if bleeding persists."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Second-line uterotonic contraindications",
          "text": "Methylergonovine (Methergine), 0.2 mg IM - AVOID in hypertensive patients, it can precipitate hypertensive crisis. Carboprost (Hemabate), 0.25 mg IM - AVOID in asthmatic patients, it can cause severe bronchospasm. Misoprostol (Cytotec), 800 to 1000 mcg rectally or sublingually - a generally safer cross-condition profile."
        },
        {
          "kind": "p",
          "text": "Step four is bimanual compression with aggressive fluid resuscitation and continued uterotonics. Step five, if the hemorrhage is refractory, moves to definitive interventions: balloon tamponade with a Bakri balloon, uterine artery embolization, surgical interventions such as a B-Lynch suture or hypogastric artery ligation, and hysterectomy as a last resort."
        },
        {
          "kind": "p",
          "text": "Concurrent with all of the above, establish two large-bore IVs (16 to 18 gauge), send a type and crossmatch, and give packed red blood cells, fresh frozen plasma, and platelets per protocol. Many institutions use a massive transfusion protocol with a 1:1:1 ratio of PRBC to FFP to platelets in active major hemorrhage."
        }
      ],
      "practiceItemId": "pi_pph_atony"
    },
    {
      "id": "normal-newborn-assessment",
      "minutes": "42-50",
      "title": "Normal Newborn Assessment - APGAR, Reflexes",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Normal newborn assessment covers the skills that should be reflexive by Hour 12. We will move through APGAR scoring, expected vital signs and measurements, the primitive reflexes, and routine newborn care."
        },
        {
          "kind": "h",
          "text": "APGAR scoring"
        },
        {
          "kind": "p",
          "text": "APGAR scoring is done at 1 minute and 5 minutes after birth, and sometimes again at 10 minutes if scores are low. There are five components, each scored 0 to 2, for a total possible score of 10."
        },
        {
          "kind": "list",
          "items": [
            "Appearance (color): 0 if blue or pale all over; 1 if pink body with blue extremities - this is acrocyanosis, a normal finding in the first 24 hours of life; 2 if completely pink.",
            "Pulse (heart rate): 0 if absent; 1 if less than 100; 2 if 100 or above.",
            "Grimace (reflex irritability): 0 if no response to stimulation; 1 if grimace or weak cry; 2 if vigorous cry, cough, or sneeze.",
            "Activity (muscle tone): 0 if limp; 1 if some flexion; 2 if active motion.",
            "Respirations: 0 if absent; 1 if slow or irregular; 2 if good cry and regular respirations."
          ]
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "APGAR interpretation",
          "text": "7 to 10 is normal - the infant is adapting well. 4 to 6 needs assistance - stimulation, oxygen, suction. 0 to 3 is critical - full resuscitation required. APGAR is not used as a sole indicator of long-term outcomes; it is a snapshot of physiologic adaptation in the first minutes of life."
        },
        {
          "kind": "h",
          "text": "Normal newborn vital signs and measurements"
        },
        {
          "kind": "p",
          "text": "The normal heart rate is 110 to 160 beats per minute while awake - lower when sleeping, briefly in the 80s - and a sustained heart rate above 160 is tachycardia and concerning. The respiratory rate is 30 to 60 breaths per minute, and sustained above 60 is tachypnea, which is concerning. The axillary temperature is 36.5 to 37.5 degrees Celsius, that is 97.7 to 99.5 Fahrenheit. Blood pressure is not routinely measured in healthy term newborns."
        },
        {
          "kind": "p",
          "text": "Normal measurements are a weight of 2500 to 4000 grams (5 pounds 8 ounces to 8 pounds 13 ounces), a length of 45 to 55 centimeters, and a head circumference of 32 to 37 centimeters - typically about 2 centimeters greater than the chest circumference at birth. Head circumference greater than chest circumference is the expected pattern; the chest becomes larger than the head by 1 to 2 years."
        },
        {
          "kind": "h",
          "text": "Newborn reflexes"
        },
        {
          "kind": "p",
          "text": "Primitive reflexes are present at birth and disappear at predictable times. The Moro, or startle, reflex: a sudden noise or loss of support causes the infant to abduct and extend the arms with fingers fanned, then adduct and flex back toward the body. It disappears by 4 to 6 months. An absent Moro on one side suggests injury - brachial plexus injury or clavicle fracture from birth."
        },
        {
          "kind": "p",
          "text": "The rooting reflex: stroking the cheek causes the infant to turn the head toward the stimulus with mouth open, searching for food; it disappears by 3 to 4 months and helps with feeding initiation. The sucking reflex: stroking the lips or placing a nipple in the mouth elicits sucking; it disappears around 3 to 4 months as it becomes voluntary. The palmar grasp: pressure on the palm causes finger flexion so the infant grasps your finger; it disappears by 3 to 4 months."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Babinski - normal in infants, pathologic in adults",
          "text": "The plantar (Babinski) reflex: stroking the lateral sole from heel to toe causes the great toe to extend (dorsiflex) and the other toes to fan. In infants this is NORMAL and disappears by 1 to 2 years. In an older child or adult, a positive Babinski is pathologic - it indicates an upper motor neuron lesion (recall Hour 11)."
        },
        {
          "kind": "p",
          "text": "The stepping reflex: holding the infant upright with feet touching a surface elicits stepping movements; it disappears by 4 to 8 weeks. The tonic neck, or fencing, reflex: turning the infant's head to one side causes the arm on that same side to extend and the opposite arm to flex, like a fencing pose; it disappears by 4 to 6 months."
        },
        {
          "kind": "h",
          "text": "Routine newborn care"
        },
        {
          "kind": "p",
          "text": "Erythromycin ophthalmic ointment is placed in each eye within 1 hour of birth as prophylaxis against gonococcal ophthalmia neonatorum, which can cause blindness. Vitamin K (phytonadione) 0.5 to 1 milligram IM prevents hemorrhagic disease of the newborn, since vitamin K-dependent clotting factors are physiologically low at birth. The hepatitis B vaccine is given within 24 hours of birth (recall Hour 10), especially critical if the mother is HBsAg positive, in which case the infant also receives HBIG."
        },
        {
          "kind": "p",
          "text": "The newborn metabolic screen is done by heel stick and screens for PKU, congenital hypothyroidism, sickle cell disease, cystic fibrosis, and other disorders depending on the state; it is performed at 24 to 48 hours, before discharge. A hearing screen is universal in most US states. Critical congenital heart disease screening uses pulse oximetry pre-ductal (right hand) and post-ductal (foot) to identify cyanotic congenital heart disease."
        },
        {
          "kind": "p",
          "text": "For newborn stooling, the first meconium - dark, sticky, tarry - passes within 24 to 48 hours. Failure to pass meconium beyond 48 hours warrants evaluation for possible Hirschsprung disease, cystic fibrosis with meconium ileus, or intestinal atresia. Transitional stools, greenish and mixed with milk stool, follow over several days. Breastfed infant stools become yellow, seedy, soft, and frequent, while formula-fed stools become firmer and more brown."
        }
      ]
    },
    {
      "id": "neonatal-red-flags",
      "minutes": "50-55",
      "title": "Neonatal Red Flags",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "These are the neonatal findings that require immediate provider notification. The exam rewards recognizing the cluster, not just isolated single findings, so train yourself to see how these signs travel together."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Central cyanosis vs acrocyanosis",
          "text": "Central cyanosis - blue discoloration of the face, trunk, and mucous membranes (lips, tongue) - is abnormal at any time. Distinguish it from acrocyanosis - bluish hands and feet with a pink body - which is NORMAL in the first 24 hours of life from immature peripheral circulation. Acrocyanosis persisting beyond 24 hours, or central cyanosis at any time, requires evaluation."
        },
        {
          "kind": "h",
          "text": "Respiratory distress signs"
        },
        {
          "kind": "p",
          "text": "Memorize the signs of respiratory distress in the newborn. A sustained respiratory rate above 60 is tachypnea. Grunting is the infant exhaling against a partially closed glottis to maintain functional residual capacity - a sound between breaths that should not be there and a sign of significant distress. Retractions are the visible drawing in of soft tissues with each inspiration - intercostal (between ribs), subcostal (below ribs), suprasternal (above the sternum), and substernal. Nasal flaring is widening of the nostrils with inspiration. Periods of apnea longer than 20 seconds are also a red flag. Any of these requires immediate evaluation."
        },
        {
          "kind": "h",
          "text": "Sepsis and temperature instability"
        },
        {
          "kind": "p",
          "text": "Temperature instability - hypothermia below 36.5 degrees Celsius or hyperthermia - matters because newborns often do not mount a robust febrile response to infection. Temperature instability in either direction can be the first sign of neonatal sepsis."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Pathologic jaundice in the first 24 hours",
          "text": "Jaundice appearing in the FIRST 24 HOURS of life is ALWAYS pathologic until proven otherwise. Causes include hemolysis (ABO incompatibility, Rh incompatibility, G6PD deficiency), sepsis, and internal hemorrhage. Physiologic jaundice typically appears after 24 hours, peaks at 3 to 5 days, and resolves by 1 to 2 weeks. Pathologic jaundice in the first 24 hours requires immediate workup - bilirubin level, Coombs test, hemoglobin, blood type, and sepsis evaluation."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Bilious emesis is a surgical emergency",
          "text": "Vomiting that is GREEN - bile-stained - indicates intestinal obstruction below the ampulla of Vater and is a surgical emergency until proven otherwise. Causes include malrotation with volvulus (which can lead to bowel necrosis if untreated) and intestinal atresia. Distinguish it from non-bilious emesis, which is more commonly benign - reflux, overfeeding, pyloric stenosis (though pyloric stenosis warrants evaluation, it is not the same level of emergency)."
        },
        {
          "kind": "h",
          "text": "Other concerning findings"
        },
        {
          "kind": "p",
          "text": "Feeding difficulties - refusal to feed, weak suck, decreased intake - can indicate sepsis, neurologic problems, congenital heart disease, or metabolic disorders, and combined with other findings they raise significant concern. Lethargy, hypotonia, and decreased activity - the infant who was vigorous now seems floppy and unresponsive - are concerning for sepsis, hypoglycemia, intracranial pathology, or metabolic encephalopathy."
        },
        {
          "kind": "p",
          "text": "Neonatal seizures may be SUBTLE rather than the typical tonic-clonic pattern seen in older children. Subtle manifestations include lip smacking, bicycling movements of the legs, eye deviation, repetitive eye blinking, tongue thrusting, and apnea. Causes include hypoxic-ischemic encephalopathy, intracranial hemorrhage, metabolic disorders (hypoglycemia, hypocalcemia, hyponatremia), and infection."
        },
        {
          "kind": "p",
          "text": "Hypoglycemia in the newborn is a glucose below 40 to 45 milligrams per deciliter in the first day and below 50 thereafter - thresholds vary by institution and age. It is particularly common in infants of diabetic mothers, who are macrosomic and hyperinsulinemic and whose insulin remains elevated for hours after the maternal glucose supply abruptly ends. Treatment is early feeding within the first hour if possible, and IV dextrose if severe or if oral feeding is not tolerated."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Single umbilical artery",
          "text": "The normal umbilical cord has 2 arteries and 1 vein - AVA. A single umbilical artery (1 artery and 1 vein) is associated with congenital anomalies, especially renal and cardiac, and warrants further evaluation including renal ultrasound."
        }
      ],
      "practiceItemId": "pi_neonatal_red_flags"
    },
    {
      "id": "synthesis-magnesium-toxicity",
      "minutes": "55-58",
      "title": "Synthesis - Preeclampsia on Magnesium with Toxicity",
      "format": "Case",
      "blocks": [
        {
          "kind": "p",
          "text": "Synthesis case. A client at 36 weeks gestation is admitted with severe preeclampsia. She is started on IV magnesium sulfate, loading 6 g over 30 minutes followed by 2 g/hr maintenance. Four hours into the infusion, the nurse notes: BP 154/96, HR 78, RR 11, SpO2 94%, urine output 22 mL in the past hour, patellar reflexes absent bilaterally. The fetal heart rate baseline is 130 with moderate variability and accelerations. Walk through your reasoning - identify what is happening, prioritize, and plan."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Reasoning - three findings, one diagnosis, two patients",
          "text": "This is magnesium toxicity. Three of the five toxicity signs are present: loss of deep tendon reflexes (the FIRST sign in the Hour 5 order), respiratory rate 11 (below the 12 threshold), and urine output 22 mL/hr (below the 30 mL/hr threshold). Priority actions, in order: (1) DISCONTINUE the magnesium infusion immediately; (2) ADMINISTER calcium gluconate, the antidote - 10% solution, 10 mL IV slow push; (3) assess for respiratory support - RR 11 is borderline, so keep airway and oxygen ready and provide ventilatory support if RR continues to drop; (4) assess fetal status - the FHR is reassuring in this snapshot (baseline 130, moderate variability, accelerations), but continuous monitoring continues; (5) notify the obstetric provider - the patient is in toxicity in the context of severe preeclampsia near term, so delivery may be expedited. This case synthesizes Hour 5 (magnesium toxicity sequence and antidote), Hour 11 (DTRs as a neurologic sign), Hour 12 (preeclampsia management context), and Hour 2 (priority frameworks - a life-threatening medication complication takes precedence, and the patient's life is also the fetus's life)."
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
          "text": "Homework before Hour 13: fifty maternity and newborn questions with deliberate emphasis on magnesium toxicity recognition, FHR strip interpretation, the PPH 4 T's intervention sequence, and neonatal red flags. The synthesis case is a real-world scenario you may encounter - memorize the sequence."
        },
        {
          "kind": "p",
          "text": "Hour 13 is pediatrics: growth and development milestones, the immunization schedule, dehydration assessment in children, common pediatric illnesses including croup, RSV, bronchiolitis, and sickle cell crisis, child abuse indicators, and safety by age. See you Hour 13."
        }
      ]
    }
  ]
};
