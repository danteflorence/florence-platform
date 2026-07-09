import type { Lesson } from "./lessonTypes";

/**
 * Section 10 - Renal & GI. Auto-generated from the Florence Academy
 * bootcamp instructor script (expanded draft). Pending nurse-educator review.
 */
export const lesson: Lesson = {
  "meta": {
    "number": 10,
    "title": "Renal & GI",
    "durationMin": 60,
    "audience": "Internationally educated nurses - Philippines, UK, Kenya, Ghana",
    "contentWeight": "Two organ systems condensed into 60 minutes - high-yield physiological-adaptation content",
    "tagline": "Two organ systems, one hour: master the renal and GI patterns the NCLEX tests with clean right-and-wrong answers."
  },
  "objectives": [
    "Differentiate AKI from CKD by pathophysiology, lab pattern, and treatment principles, and recognize the three categories of AKI causation.",
    "Apply hemodialysis arteriovenous fistula precautions and recognize peritonitis in peritoneal dialysis.",
    "Recognize upper versus lower GI bleeding, prioritize hemodynamic stabilization, and identify variceal-specific interventions.",
    "Manage hepatic encephalopathy with lactulose and recognize the complications of cirrhosis.",
    "Recognize the classic presentation of acute pancreatitis, apply pancreatic rest principles, and identify severe disease markers (Cullen, Grey-Turner signs).",
    "Differentiate small bowel from large bowel obstruction and apply the standard nursing management bundle.",
    "Assess stoma color and surrounding skin, distinguish ileostomy from colostomy output expectations, and identify findings that require provider notification."
  ],
  "timing": [
    {
      "minutes": "0-3",
      "segment": "Recap & frame: two organ systems, one hour",
      "format": "Lecture"
    },
    {
      "minutes": "3-13",
      "segment": "AKI vs CKD - prerenal/intrarenal/postrenal",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "13-21",
      "segment": "Dialysis - HD/PD, AV fistula precautions",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "21-29",
      "segment": "GI bleeding & peptic ulcer disease",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "29-38",
      "segment": "Cirrhosis, hepatic encephalopathy, hepatitis",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "38-44",
      "segment": "Acute & chronic pancreatitis",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "44-49",
      "segment": "Bowel obstruction & IBD (Crohn vs UC)",
      "format": "Lecture"
    },
    {
      "minutes": "49-55",
      "segment": "Ostomy care - assessment, output, teaching",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "55-58",
      "segment": "Synthesis - chronic dialysis patient + GI bleed",
      "format": "Case"
    },
    {
      "minutes": "58-60",
      "segment": "Close & homework",
      "format": "Lecture"
    }
  ],
  "practiceItems": {
    "pi_prerenal_aki_reversal": {
      "id": "pi_prerenal_aki_reversal",
      "stem": "A 68-year-old woman with hypertension is admitted with acute kidney injury after a 2-day flu-like illness with poor oral intake. Labs: BUN 68 mg/dL, creatinine 2.4 mg/dL (baseline 1.0), urine sodium 12 mEq/L. The patient takes lisinopril and ibuprofen daily. Which intervention is most likely to reverse the AKI?",
      "options": [
        {
          "key": "A",
          "text": "Initiate hemodialysis."
        },
        {
          "key": "B",
          "text": "Discontinue lisinopril and ibuprofen and administer IV fluids."
        },
        {
          "key": "C",
          "text": "Begin spironolactone and lasix combination."
        },
        {
          "key": "D",
          "text": "Order renal ultrasound to assess for obstruction."
        }
      ],
      "answer": "B",
      "rationale": "The picture is classic prerenal AKI - a BUN-to-creatinine ratio of 28 (well above 20) and urine sodium of 12 (well below 20). The cause is volume depletion from poor oral intake, compounded by the ACE inhibitor (efferent arteriole dilation) and the NSAID (afferent arteriole constriction). Removing the offending medications and rehydrating with IV fluids will most likely reverse the AKI. Dialysis (A) is not indicated at this stage. Diuretics (C) would worsen the volume depletion. Renal ultrasound (D) is reasonable but does not address the primary problem, which is hypovolemia compounded by drug effect.",
      "cjmm": "generate-solutions",
      "reference": "Section 10 · AKI vs CKD"
    },
    "pi_av_fistula_bp_intervention": {
      "id": "pi_av_fistula_bp_intervention",
      "stem": "A new nurse is assigned a client with chronic kidney disease who has an AV fistula in the left forearm. Which action by the new nurse requires intervention by the charge nurse?",
      "options": [
        {
          "key": "A",
          "text": "Auscultates for a bruit over the fistula."
        },
        {
          "key": "B",
          "text": "Measures blood pressure on the left arm because the right arm has poor access."
        },
        {
          "key": "C",
          "text": "Asks the client about pain or numbness in the left hand."
        },
        {
          "key": "D",
          "text": "Documents the presence of a palpable thrill."
        }
      ],
      "answer": "B",
      "rationale": "No blood pressure on the fistula arm - ever. The cuff pressure can occlude the fistula and cause thrombosis, so the charge nurse must intervene to redirect the new nurse. If both arms are inaccessible, BP is measured on a leg, not on the fistula arm. Auscultating for a bruit (A), asking about pain or numbness in the hand (C), and documenting a palpable thrill (D) are all correct nursing actions. B is the unsafe action.",
      "cjmm": "evaluate-outcomes",
      "reference": "Section 10 · Dialysis"
    },
    "pi_variceal_bleed_first_action": {
      "id": "pi_variceal_bleed_first_action",
      "stem": "A client with cirrhosis is admitted with hematemesis. Endoscopy confirms bleeding esophageal varices. Vital signs: BP 88/56, HR 122, RR 22, SpO2 96%. Hgb 7.2 g/dL. Which intervention should the nurse anticipate FIRST?",
      "options": [
        {
          "key": "A",
          "text": "Type and crossmatch for 4 units of packed red blood cells."
        },
        {
          "key": "B",
          "text": "Initiate IV octreotide infusion."
        },
        {
          "key": "C",
          "text": "Place two large-bore peripheral IV catheters."
        },
        {
          "key": "D",
          "text": "Prepare for emergent endoscopic banding."
        }
      ],
      "answer": "C",
      "rationale": "ABC - circulation comes first. The patient is hypotensive and tachycardic; hemodynamic instability requires immediate IV access for fluid resuscitation, so two large-bore peripheral IVs come first. The other interventions are all appropriate - type and crossmatch (A) is the next step, octreotide (B) is variceal-specific therapy, and endoscopic banding (D) is definitive - but none can happen without IV access first.",
      "cjmm": "prioritize-hypotheses",
      "reference": "Section 10 · GI bleeding & PUD"
    },
    "pi_lactulose_outcome": {
      "id": "pi_lactulose_outcome",
      "stem": "A client with cirrhosis is admitted with confusion, asterixis, and a serum ammonia of 158 μg/dL. The provider orders lactulose 30 mL PO every 6 hours. The nurse should monitor for which expected therapeutic outcome?",
      "options": [
        {
          "key": "A",
          "text": "Decreased urine output."
        },
        {
          "key": "B",
          "text": "Increased serum potassium."
        },
        {
          "key": "C",
          "text": "2-3 soft stools per day with improved mental status."
        },
        {
          "key": "D",
          "text": "Resolution of jaundice and decreased bilirubin."
        }
      ],
      "answer": "C",
      "rationale": "Lactulose traps ammonia in the gut and causes osmotic diarrhea - both effects remove ammonia from the body. The expected outcome is 2 to 3 soft stools per day and improved mental status. This callback from Hour 6 is identical to the earlier synthesis item because it is that important and that frequently tested. Decreased urine output (A), increased serum potassium (B), and resolution of jaundice (D) are not lactulose effects.",
      "cjmm": "evaluate-outcomes",
      "reference": "Section 10 · Cirrhosis, hepatic encephalopathy, hepatitis"
    },
    "pi_pancreatitis_severity_marker": {
      "id": "pi_pancreatitis_severity_marker",
      "stem": "A 48-year-old man presents to the ED with severe epigastric pain radiating to the back, which is partially relieved by leaning forward. Vital signs: BP 96/62, HR 118, T 38.6, RR 24. Bluish discoloration is noted around the umbilicus. Lipase is 1,840 U/L. Calcium is 7.2 mg/dL. Which finding is the most concerning marker of severity?",
      "options": [
        {
          "key": "A",
          "text": "Lipase elevation."
        },
        {
          "key": "B",
          "text": "The bluish periumbilical discoloration."
        },
        {
          "key": "C",
          "text": "The hypocalcemia."
        },
        {
          "key": "D",
          "text": "The fever."
        }
      ],
      "answer": "B",
      "rationale": "Cullen sign - bluish periumbilical discoloration - indicates retroperitoneal hemorrhage and necrotizing pancreatitis, making it the marker of severe disease. Lipase elevation (A) confirms pancreatitis but does not indicate severity. Hypocalcemia (C) and fever (D) are common in moderate-to-severe pancreatitis, but Cullen sign specifically indicates hemorrhagic necrosis with high mortality if not addressed.",
      "cjmm": "analyze-cues",
      "reference": "Section 10 · Pancreatitis"
    },
    "pi_stoma_ischemia_priority": {
      "id": "pi_stoma_ischemia_priority",
      "stem": "A nurse is assessing a client three days post-operative with a new ileostomy. The stoma was pink and moist yesterday but today appears dark red and slightly bluish. The peristomal skin is intact. The client denies pain. Output is unchanged. What is the nurse's priority action?",
      "options": [
        {
          "key": "A",
          "text": "Document the finding and reassess in 4 hours."
        },
        {
          "key": "B",
          "text": "Apply a warm compress to the stoma to improve circulation."
        },
        {
          "key": "C",
          "text": "Notify the provider immediately."
        },
        {
          "key": "D",
          "text": "Reposition the client and apply abdominal binder."
        }
      ],
      "answer": "C",
      "rationale": "A dark red to bluish stoma indicates ischemia or compromised blood supply, which requires immediate provider notification - the stoma may need surgical revision. Documenting and waiting (A) is dangerous because delaying intervention risks necrosis. A warm compress (B) does not reverse ischemia. Repositioning and applying a binder (D) does not address the problem. Note the trend: a stoma that was pink yesterday and is darker today is alarming even before it reaches obvious necrosis.",
      "cjmm": "take-actions",
      "reference": "Section 10 · Ostomy care"
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
          "text": "Welcome to Hour 10. Today we compress two organ systems - renal and gastrointestinal - into 60 minutes. The pacing is deliberately brisk: the handouts carry the fine detail, while the lecture carries the testable patterns and the cross-system connections you need to recognize on exam day. Keep your reference cards close, because depth in this hour comes from pairing the lecture with those materials."
        },
        {
          "kind": "p",
          "text": "Backward references are unusually dense in this hour, so listen for the callbacks. Renal content connects to Hour 3 (ACE inhibitors and anticoagulants), Hour 4 (the metformin contrast hold and lithium causing nephrogenic DI), and Hour 6 (BUN, creatinine, electrolytes, and acid-base). GI content connects to Hour 6 again (liver labs, ammonia, lactulose), Hour 3 (anticoagulants in cirrhosis), and Hour 5 (NSAID-induced GI bleeding). Every one of these threads ties back to material you have already built."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Highest-yield testables today",
          "text": "AV fistula precautions for hemodialysis, lactulose for hepatic encephalopathy, the pancreatitis pain pattern, stoma color assessment, and the SBP-versus-LBO differentiation. These are the patterns the NCLEX tests with clean right-and-wrong answers."
        }
      ]
    },
    {
      "id": "aki-vs-ckd",
      "minutes": "3-13",
      "title": "AKI vs CKD",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Acute kidney injury, or AKI, is a rapid decline in kidney function over hours to days. The current definition uses three criteria, and any one of them qualifies: a rise in creatinine of at least 0.3 mg/dL within 48 hours, a rise to at least 1.5 times baseline, or a urine output below 0.5 mL per kilogram per hour for at least 6 hours. You do not need all three - meeting any single criterion makes the diagnosis."
        },
        {
          "kind": "h",
          "text": "Three categories of AKI cause"
        },
        {
          "kind": "p",
          "text": "Memorize the three categories by where the problem sits relative to the kidney - before the kidneys, in the kidneys, or after the kidneys. This 'location' framing is the fastest way to keep prerenal, intrarenal, and postrenal straight under exam pressure, and it also points you directly at the right treatment."
        },
        {
          "kind": "p",
          "text": "Prerenal AKI means the kidneys themselves are structurally intact but are being underperfused. Causes include dehydration, hemorrhage, heart failure with low cardiac output, and sepsis with vasodilatory shock. Two drug classes are classic: NSAIDs (recall Hour 5 - they constrict the afferent arteriole) and ACE inhibitors or ARBs (recall Hour 3 - they dilate the efferent arteriole, dropping intraglomerular pressure). The kidneys are fine; perfusion is the problem."
        },
        {
          "kind": "p",
          "text": "Intrarenal - also called intrinsic - AKI means the damage is within the kidney tissue itself. The most common cause is acute tubular necrosis, or ATN, usually from prolonged ischemia (untreated prerenal AKI that tips over into intrinsic injury) or from nephrotoxins. The nephrotoxic drugs to know are aminoglycosides (recall Hour 4), IV contrast dye, and NSAIDs again. Other intrinsic causes include acute glomerulonephritis and acute interstitial nephritis, which is often drug-induced."
        },
        {
          "kind": "p",
          "text": "Postrenal AKI means obstruction blocks urine flow back up the urinary tract; pressure builds and the kidneys fail. Causes include kidney stones, benign prostatic hyperplasia, pelvic malignancy, and neurogenic bladder. The encouraging point for the exam is that relief of the obstruction often restores kidney function quickly if it is caught early."
        },
        {
          "kind": "h",
          "text": "Distinguishing prerenal from intrinsic on labs"
        },
        {
          "kind": "p",
          "text": "There is a testable lab pattern for separating prerenal from intrinsic AKI. A BUN-to-creatinine ratio above 20 to 1 suggests prerenal (recall Hour 6). A fractional excretion of sodium (FENa) below 1 percent suggests prerenal, while above 2 percent suggests intrinsic. Urine sodium below 20 mEq/L suggests prerenal, while above 40 mEq/L suggests intrinsic. The unifying theme: in prerenal disease the kidneys are working hard to conserve sodium and water, so the urine is concentrated and sodium-poor; in intrinsic disease the damaged kidneys can no longer conserve."
        },
        {
          "kind": "h",
          "text": "The four phases and the complications"
        },
        {
          "kind": "p",
          "text": "AKI moves through four phases. The initiation phase lasts hours to days and is often clinically silent. The oliguric phase, with urine output below 400 mL per day, typically lasts 1 to 2 weeks and is when most complications develop. The diuretic phase brings increasing urine output as the kidneys begin to recover, but tubular function lags behind, so electrolyte and fluid balance become tricky. The recovery phase plays out over weeks to months and may not return fully to baseline."
        },
        {
          "kind": "p",
          "text": "The complications of AKI follow from the failing kidney. Hyperkalemia is the dangerous one (recall Hour 6 - calcium gluconate first if ECG changes are present). Add metabolic acidosis as the kidneys fail to excrete acid, fluid overload with pulmonary edema, and uremic complications including encephalopathy, pericarditis, and platelet dysfunction. Drug accumulation is also a hazard (recall Hour 4 - many drugs need renal dose adjustment)."
        },
        {
          "kind": "p",
          "text": "AKI management begins by addressing the underlying cause first: volume resuscitation for prerenal, removing the obstruction for postrenal, and withdrawing the nephrotoxin and treating the precipitant for intrinsic. Manage fluid balance carefully and avoid further nephrotoxins throughout."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Dialysis indications - AEIOU",
          "text": "Acidosis (severe), Electrolytes (life-threatening hyperkalemia not responding to medical management), Ingestions (certain), Overload (fluid overload causing respiratory compromise), Uremia (uremic symptoms such as encephalopathy or pericarditis)."
        },
        {
          "kind": "h",
          "text": "Chronic kidney disease"
        },
        {
          "kind": "p",
          "text": "Chronic kidney disease, or CKD, is defined by an eGFR below 60 mL/min/1.73m² for at least 3 months, OR evidence of kidney damage such as proteinuria or structural abnormalities for at least 3 months. Recall the Hour 6 staging: Stage 1 is eGFR above 90 with damage, Stage 2 is 60 to 89 with damage, Stage 3 is 30 to 59, Stage 4 is 15 to 29, and Stage 5 is below 15 - end-stage renal disease, dialysis territory."
        },
        {
          "kind": "p",
          "text": "Know the most common causes of CKD globally because the order is testable. Diabetes is number one in most populations, and hypertension is number two. After those come glomerulonephritis, polycystic kidney disease, and autoimmune disease."
        },
        {
          "kind": "p",
          "text": "CKD complications reflect the many jobs the kidney can no longer do. Anemia arises from low erythropoietin production and is treated with erythropoiesis-stimulating agents like epoetin alfa. Bone-mineral disorder produces low active vitamin D, high phosphate, low calcium, and secondary hyperparathyroidism - treated with phosphate binders given with meals (calcium carbonate, sevelamer), active vitamin D, and sometimes calcimimetics. Metabolic acidosis is treated with sodium bicarbonate. Add fluid overload and hyperkalemia. Cardiovascular disease is the leading cause of death in CKD, and uremic symptoms appear in advanced disease."
        },
        {
          "kind": "p",
          "text": "CKD management aims to slow progression with blood pressure control - ACE or ARB are preferred - plus glycemic control in diabetics, proactive treatment of complications, and avoidance of nephrotoxins such as NSAIDs, contrast where possible, and certain antibiotics. Renal replacement therapy, meaning dialysis or transplant, becomes necessary at Stage 5."
        }
      ],
      "practiceItemId": "pi_prerenal_aki_reversal"
    },
    {
      "id": "dialysis",
      "minutes": "13-21",
      "title": "Dialysis",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "There are two dialysis modalities: hemodialysis and peritoneal dialysis. Hemodialysis removes blood from the patient via vascular access, runs it through a dialyzer - the artificial kidney - where waste and excess fluid are removed across a semipermeable membrane, and then returns it to the patient. A typical regimen is 3 to 4 hours per session, 3 times per week, most commonly performed in-center."
        },
        {
          "kind": "h",
          "text": "Vascular access - three options"
        },
        {
          "kind": "p",
          "text": "The arteriovenous fistula is the gold standard. It is a surgically created connection between an artery and a vein, typically in the non-dominant arm. Arterial pressure causes the vein to dilate and toughen - a process called maturation that takes 6 to 12 weeks - after which two large-bore needles can be inserted into the fistula at each session. It has the lowest infection rate and the longest patency."
        },
        {
          "kind": "p",
          "text": "The arteriovenous graft uses synthetic tubing to connect an artery and a vein, and it is chosen when the patient's own vessels are inadequate for a fistula. It matures faster, in about 2 to 3 weeks, but carries higher infection and clotting rates than a fistula. The central venous catheter, tunneled or non-tunneled, is used for temporary access or when a fistula and graft are not feasible; it has the highest infection risk and is generally avoided long-term when possible."
        },
        {
          "kind": "h",
          "text": "AV fistula precautions - the five rules"
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Memorize and drill the five AV fistula rules",
          "text": "(1) NO blood pressure measurements on that arm - the cuff can compress the fistula and cause it to clot. (2) NO IV starts on that arm. (3) NO blood draws on that arm - the fistula must not be punctured for anything other than dialysis access. (4) NO tight jewelry, watches, sleeves, or constricting clothing on that arm. (5) NO carrying heavy objects, sleeping on, or compressing that arm."
        },
        {
          "kind": "p",
          "text": "This is one of the most heavily tested patient-teaching topics on the NCLEX, so drill it explicitly. For internationally educated nurses - and Filipino-trained nurses in particular, who often have strong renal exposure already - the gap tends to be in this specific US precautionary framework rather than in dialysis itself, so spend the time to lock these five rules in."
        },
        {
          "kind": "p",
          "text": "The patient and the nurse should perform a daily fistula assessment. Palpate for the thrill - a buzzing, vibrating sensation felt over the fistula - and auscultate for the bruit - a whooshing, swooshing sound. Both should be present. An absent thrill or absent bruit indicates the fistula has thrombosed; call the provider immediately, because the fistula may be salvageable if caught quickly with thrombectomy or thrombolysis."
        },
        {
          "kind": "h",
          "text": "Hemodialysis nursing care and complications"
        },
        {
          "kind": "p",
          "text": "Weigh the patient before and after dialysis, because the difference sets the ultrafiltration goal. Monitor blood pressure throughout the session, since hypotension is the most common intradialytic complication, and hold antihypertensives before dialysis to avoid intradialytic hypotension. Remember that many medications are dialyzable and are therefore dosed AFTER dialysis - antibiotics especially. Recall Hour 4 vancomycin, which is variably dialyzed depending on the membrane used."
        },
        {
          "kind": "p",
          "text": "Hemodialysis complications include hypotension (the most common, from rapid fluid removal), muscle cramps, and dialysis disequilibrium syndrome, in which rapid changes in osmolality cause cerebral edema presenting as headache, nausea, confusion, and sometimes seizures. Access-site infection and the rare but catastrophic air embolism round out the list."
        },
        {
          "kind": "h",
          "text": "Peritoneal dialysis"
        },
        {
          "kind": "p",
          "text": "Peritoneal dialysis uses the patient's own peritoneal membrane as the dialyzing surface. A catheter is placed surgically into the peritoneum; dialysate solution is infused, dwells for a prescribed period to allow solute and fluid exchange across the membrane, and is then drained - carrying waste and excess water with it. There are two main schedules: continuous cycling peritoneal dialysis (CCPD), which uses a cycler machine to perform exchanges automatically at night while the patient sleeps, and continuous ambulatory peritoneal dialysis (CAPD), which uses manual exchanges several times a day."
        },
        {
          "kind": "p",
          "text": "Peritoneal dialysis has real advantages: it can be done at home, it allows more patient independence, it offers gentler hemodynamics with no rapid fluid shifts, and it preserves residual kidney function longer than hemodialysis."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Cloudy effluent IS peritonitis until proven otherwise",
          "text": "Peritonitis is THE major complication of peritoneal dialysis. The hallmark sign is cloudy effluent - the drained dialysate becomes opaque instead of clear - accompanied by abdominal pain, fever, and nausea. Send the fluid for cell count, Gram stain, and culture, and begin empiric intraperitoneal antibiotics (typically given through the PD catheter itself). Strict aseptic technique during every single exchange is the prevention strategy, and patient teaching emphasizes it relentlessly."
        },
        {
          "kind": "p",
          "text": "Other peritoneal dialysis complications include catheter exit-site infection, hernias from elevated intra-abdominal pressure, hyperglycemia because the dialysate contains glucose as the osmotic agent, and protein loss across the membrane, which may require protein supplementation."
        }
      ],
      "practiceItemId": "pi_av_fistula_bp_intervention"
    },
    {
      "id": "gi-bleeding-pud",
      "minutes": "21-29",
      "title": "GI Bleeding & Peptic Ulcer Disease",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "GI bleeding is categorized by where the source sits relative to the ligament of Treitz, the anatomic boundary between the duodenum and the jejunum. Anything above that boundary is upper GI bleeding; anything below it is lower GI bleeding. That single landmark drives the differential and the workup."
        },
        {
          "kind": "h",
          "text": "Upper GI bleeding"
        },
        {
          "kind": "p",
          "text": "Upper GI bleeding has its source above the ligament of Treitz. The common causes are peptic ulcer disease, esophageal or gastric varices in cirrhosis, a Mallory-Weiss tear (a linear mucosal tear from forceful vomiting or retching, often after alcohol), gastritis, esophagitis, and malignancy."
        },
        {
          "kind": "p",
          "text": "The presentation depends on how fast the blood moves and how long it sits. Hematemesis with bright red blood means active, rapid bleeding. Coffee-ground emesis means blood that has been in the stomach long enough to be partially digested by acid; it looks like coffee grounds and signals slower or stopped bleeding. Melena - black, tarry, foul-smelling stools - represents blood that has been digested as it transits the gut. Brisk upper GI bleeding can even present with hematochezia, bright red blood per rectum, if it is fast enough to outrun digestion."
        },
        {
          "kind": "h",
          "text": "Lower GI bleeding"
        },
        {
          "kind": "p",
          "text": "Lower GI bleeding has its source below the ligament of Treitz. Common causes include diverticular disease (often painless, profuse, and sometimes self-limited), hemorrhoids, inflammatory bowel disease, colorectal malignancy, arteriovenous malformations, and ischemic colitis. The presentation is usually hematochezia - bright red or maroon blood per rectum - though it can appear as melena if the bleeding is from the right colon and transit is slow."
        },
        {
          "kind": "h",
          "text": "Initial management: ABC"
        },
        {
          "kind": "p",
          "text": "Initial management of any GI bleed follows ABC (recall Hour 2). For airway, a patient with active hematemesis and altered mental status is at risk of aspiration, so intubation may be needed. For breathing, give supplemental oxygen as needed. For circulation, place two large-bore IV catheters, 16 to 18 gauge, in big veins; give aggressive crystalloid resuscitation; type and crossmatch for transfusion; and use vasopressors only if hypotension persists despite adequate volume resuscitation."
        },
        {
          "kind": "p",
          "text": "Draw the right labs. A CBC is essential, but watch out: hemoglobin and hematocrit may look initially normal in acute bleeding before equilibration with extravascular fluid, so recheck in a few hours. Send coagulation studies, including the INR for warfarin patients (recall Hour 6); a type and crossmatch; electrolytes; BUN and creatinine (BUN is often elevated in upper GI bleeding because absorbed blood is metabolized to urea); and lactate to assess for hypoperfusion."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Transfusion threshold",
          "text": "For stable GI bleeding patients, the transfusion threshold is generally a hemoglobin less than 7 g/dL (recall Hour 6). Use a higher threshold in active ongoing bleeding or in patients with significant cardiovascular disease."
        },
        {
          "kind": "p",
          "text": "Definitive management is endoscopic for upper GI bleeding, providing both diagnosis and therapy through clipping, banding, injection therapy with epinephrine, and thermal coagulation. Colonoscopy addresses lower GI sources. Angiographic embolization is reserved for refractory bleeding when surgical intervention is high risk, and surgery is the last resort."
        },
        {
          "kind": "h",
          "text": "Variceal bleeding - special handling"
        },
        {
          "kind": "p",
          "text": "Variceal bleeding deserves special handling (recall Hour 3 portal hypertension). IV octreotide reduces splanchnic blood flow and portal pressure. Endoscopic band ligation or sclerotherapy treats the varices directly. Balloon tamponade with a Sengstaken-Blakemore or Minnesota tube serves as a temporizing measure for refractory bleeding, and TIPS - a transjugular intrahepatic portosystemic shunt - is used for recurrent variceal bleeding. Antibiotic prophylaxis with ceftriaxone improves survival in variceal bleeding by reducing SBP risk."
        },
        {
          "kind": "h",
          "text": "Peptic ulcer disease"
        },
        {
          "kind": "p",
          "text": "Peptic ulcer disease is the major cause of upper GI bleeding. Its causes are H. pylori infection (the most common worldwide), NSAID use (recall Hour 5), severe physiologic stress (Curling ulcers in burn patients, Cushing ulcers in head injury), smoking, and alcohol."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "PUD pain pattern - memorize",
          "text": "Gastric ulcer pain is WORSE with food, because food in the stomach irritates the ulcer. Duodenal ulcer pain is RELIEVED by food, because eating triggers gastric emptying that pushes acid further down and food in the duodenum has a buffering effect; duodenal patients are classically awakened at night when the stomach empties and acid accumulates. Gastric worse with food, duodenal relieved by food."
        },
        {
          "kind": "p",
          "text": "Peptic ulcer complications include bleeding (the most common), perforation, and gastric outlet obstruction from chronic scarring. Perforation is a surgical emergency announced by sudden severe abdominal pain, a rigid 'board-like' abdomen on exam, peritonitis, and free air under the diaphragm on an upright abdominal X-ray."
        },
        {
          "kind": "p",
          "text": "H. pylori treatment is standard triple therapy for 14 days - a proton pump inhibitor plus amoxicillin plus clarithromycin. Quadruple therapy adds bismuth and uses metronidazole instead of one of the antibiotics. When metronidazole is included, give the critical patient teaching (recall Hour 4): avoid alcohol during treatment and for 3 days afterward because of the disulfiram-like reaction."
        }
      ],
      "practiceItemId": "pi_variceal_bleed_first_action"
    },
    {
      "id": "cirrhosis-encephalopathy-hepatitis",
      "minutes": "29-38",
      "title": "Cirrhosis, Hepatic Encephalopathy, Hepatitis",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Cirrhosis is end-stage fibrosis and nodular regeneration of the liver. The liver fails in three major domains, and organizing the disease around them keeps the complications straight. Detoxification fails - the liver normally clears ammonia and metabolizes drugs and toxins. Synthesis fails - the liver normally makes albumin and clotting factors. Bile production fails - the liver normally makes bile for fat digestion."
        },
        {
          "kind": "p",
          "text": "The major causes are chronic alcohol use, chronic hepatitis B, chronic hepatitis C (the leading cause in many countries before direct-acting antivirals, now declining), non-alcoholic fatty liver disease (increasing rapidly with the obesity epidemic), autoimmune hepatitis, hemochromatosis, primary biliary cholangitis, and Wilson disease. UK-trained nurses generally come in with strong cirrhosis and hepatic encephalopathy management, since NHS practice is similar to US practice in this area."
        },
        {
          "kind": "h",
          "text": "Cirrhosis complications"
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Every NCLEX cirrhosis question tests a complication",
          "text": "Memorize the complication list - portal hypertension and its consequences, hepatic encephalopathy, coagulopathy, hypoalbuminemia, jaundice, spontaneous bacterial peritonitis, hepatorenal syndrome, and hepatocellular carcinoma. Each cirrhosis item is testing one of these."
        },
        {
          "kind": "p",
          "text": "Portal hypertension occurs when scar tissue obstructs blood flow through the liver, raising pressure in the portal vein. Its consequences are esophageal and gastric varices (collateral vessels that can rupture and bleed catastrophically), ascites (fluid accumulation in the peritoneum), splenomegaly (blood backing up into the spleen), and caput medusae (visible distended abdominal wall veins)."
        },
        {
          "kind": "p",
          "text": "Coagulopathy follows the failed synthesis of clotting factors (recall Hour 6 - the INR may be elevated; recall Hour 3 - warfarin management becomes complicated). Vitamin K may help, and fresh frozen plasma is used for active bleeding. Hypoalbuminemia follows failed protein synthesis, contributing to edema and ascites, and it also affects drug binding (recall Hour 4 - many drugs bind albumin, so low albumin means more free drug and more pharmacologic effect)."
        },
        {
          "kind": "p",
          "text": "Round out the complications with jaundice from bilirubin accumulation, spontaneous bacterial peritonitis from infected ascites, hepatorenal syndrome in which the kidneys fail in advanced liver disease, and hepatocellular carcinoma, whose risk is significantly elevated in a cirrhotic liver."
        },
        {
          "kind": "h",
          "text": "Ascites and variceal prophylaxis"
        },
        {
          "kind": "p",
          "text": "Ascites management starts with dietary sodium restriction, typically 2 grams per day. Diuretics come next: spironolactone is first-line (recall Hour 3 - potassium-sparing, so watch for hyperkalemia), with furosemide added in combination for an inadequate response. Therapeutic paracentesis treats symptomatic large-volume ascites, with albumin replacement for large-volume taps to prevent post-paracentesis circulatory dysfunction. TIPS is reserved for refractory ascites."
        },
        {
          "kind": "p",
          "text": "Variceal prophylaxis uses non-selective beta blockers - propranolol or nadolol (recall Hour 3) - to reduce portal pressure and decrease the risk of primary variceal bleeding, with endoscopic band ligation for high-risk varices identified at screening endoscopy."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Spontaneous bacterial peritonitis (SBP)",
          "text": "SBP is infection of ascitic fluid without an obvious source. It presents with fever, abdominal pain, and worsening ascites, or sometimes silently with worsened encephalopathy. Diagnosis is by diagnostic paracentesis showing an ascitic fluid neutrophil count above 250 cells/mm³. Treatment is IV antibiotics, typically a third-generation cephalosporin like ceftriaxone, and albumin infusion improves outcomes."
        },
        {
          "kind": "h",
          "text": "Hepatic encephalopathy"
        },
        {
          "kind": "p",
          "text": "Hepatic encephalopathy is a clinical syndrome of cognitive impairment in liver disease, caused by accumulated gut-derived toxins, with ammonia as the marker even though the pathophysiology is more complex. The symptoms progress through sleep-wake reversal (the patient sleeps during the day and is awake at night), confusion, asterixis (the flapping tremor seen when the wrists are dorsiflexed and arms extended, with the hands flapping back and forth), lethargy, and eventual coma. It is graded I to IV in severity."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Know which factor precipitated the episode",
          "text": "The exam loves to ask which factor triggered an encephalopathy episode. The precipitants are GI bleeding (blood is a protein load), infection including SBP, constipation, electrolyte abnormalities (especially hypokalemia), diuretics if they cause electrolyte imbalance, sedatives such as opioids and benzodiazepines (recall Hour 4), dehydration, and dietary protein excess in susceptible patients."
        },
        {
          "kind": "p",
          "text": "Hepatic encephalopathy treatment centers on lactulose (recall Hour 6), given orally or rectally as an enema. Its mechanism is to acidify the colon, trapping ammonia as ammonium ion which cannot be reabsorbed, plus an osmotic laxative effect; the goal is 2 to 3 soft stools per day. Add rifaximin, a non-absorbable antibiotic that reduces ammonia-producing gut bacteria, plus treatment of the precipitant. Protein restriction is NOT routinely recommended in current practice, because adequate nutrition is important for muscle mass and immune function. For African-heavy cohorts, spend extra time on this lactulose-versus-rifaximin paradigm, where the gap tends to be."
        },
        {
          "kind": "h",
          "text": "Viral hepatitis quick reference"
        },
        {
          "kind": "p",
          "text": "Hepatitis A spreads by the fecal-oral route through contaminated food and water, causes an acute illness only with no chronic carrier state, and has an available vaccine; it matters most for travelers and in outbreak situations. Hepatitis E also spreads fecal-oral and is particularly severe in pregnancy. Hepatitis D requires hepatitis B coinfection, because it uses B's surface antigen for its envelope."
        },
        {
          "kind": "p",
          "text": "Hepatitis B spreads through blood and body fluids, including perinatal transmission - a major route in high-prevalence regions including parts of Asia and Africa, where many of you trained. It can become chronic, with risk of cirrhosis and hepatocellular carcinoma, and a vaccine is available. Learn the serology: HBsAg is present in active infection, HBsAb appears after vaccination or recovery and signals immunity, and HBeAg signals high infectivity. This epidemiology is directly relevant for internationally educated nurse cohorts - many of you have been vaccinated, some have natural immunity from prior infection, and personal hepatitis B serology may have practical relevance during US healthcare onboarding."
        },
        {
          "kind": "p",
          "text": "Hepatitis C is bloodborne, historically transfusion-related before 1992 when screening began and currently driven predominantly by injection drug use. It becomes chronic in approximately 75 percent of acutely infected adults, has no available vaccine, and is now curable with direct-acting antivirals."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Healthcare worker needlestick exposure",
          "text": "For a hepatitis B exposure, assess the source patient's HBsAg status if known and the exposed worker's immune status (HBsAb); if the worker is non-immune, give HBIG (hepatitis B immune globulin) and initiate or complete the HB vaccine series. For a hepatitis C exposure, no post-exposure prophylaxis is available - monitor for seroconversion with regular testing and treat with direct-acting antivirals if infection develops."
        }
      ],
      "practiceItemId": "pi_lactulose_outcome"
    },
    {
      "id": "pancreatitis",
      "minutes": "38-44",
      "title": "Pancreatitis",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Acute pancreatitis is inflammation of the pancreas, and it has two main causes worldwide: gallstones, the most common cause and especially common in women, and alcohol use, especially in men. Other causes include medications (azathioprine, valproic acid - recall Hour 6 - certain sulfa drugs, and GLP-1 agonists - recall Hour 4), post-ERCP, hypertriglyceridemia at levels above 1000 mg/dL, hypercalcemia, autoimmune disease, and idiopathic cases."
        },
        {
          "kind": "p",
          "text": "The classic presentation is severe epigastric pain that radiates to the back, often relieved by leaning forward or assuming the fetal position and worsened by lying flat or eating. Add nausea and vomiting, fever, tachycardia, and - if the disease is severe - shock, because significant intravascular volume is lost to the inflamed retroperitoneum."
        },
        {
          "kind": "h",
          "text": "Signs of severe disease"
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Two eponymous signs of retroperitoneal hemorrhage",
          "text": "Cullen sign is bluish discoloration around the umbilicus (periumbilical ecchymosis). Grey-Turner sign is flank ecchymosis (bluish discoloration on the flanks). Both indicate necrotizing or hemorrhagic pancreatitis, and the sign-to-meaning mapping - periumbilical = Cullen, flank = Grey-Turner - is the testable element."
        },
        {
          "kind": "p",
          "text": "On labs, amylase is elevated and rises early but falls within 3 to 5 days. Lipase is also elevated, is more specific to pancreatic origin, and remains elevated longer - often 7 to 14 days - which makes lipase the preferred diagnostic marker. Other findings include leukocytosis from inflammation, sometimes hyperglycemia if islet cells are affected, hypocalcemia because released free fatty acids bind calcium in pancreatic necrosis (recall Hour 6 - hypocalcemia signs include Chvostek and Trousseau and a prolonged QT), and an elevated CRP. Severity is scored with the Ranson criteria (5 assessed at admission, 6 at 48 hours, with more criteria met meaning more severe disease and higher mortality), as well as APACHE II and BISAP."
        },
        {
          "kind": "h",
          "text": "Management principles"
        },
        {
          "kind": "p",
          "text": "The approach to 'resting the pancreas' has shifted. Historically it meant strict NPO, but current evidence favors early enteral nutrition when tolerated, ideally within 24 to 72 hours, because early feeding reduces infections and other complications; the route may be oral, nasogastric, or nasojejunal depending on tolerance and severity. Pair this with aggressive IV fluid resuscitation, because these patients lose significant intravascular volume to the inflamed retroperitoneum - lactated Ringer's is often preferred, with initial rates of 5 to 10 mL/kg/hr for the first several hours, titrated to hemodynamic and urinary output targets."
        },
        {
          "kind": "p",
          "text": "Control pain with opioids. Place an NG tube only for persistent vomiting or ileus, not routinely. Give antibiotics only for documented or strongly suspected infection - not prophylactically in mild pancreatitis. Finally, treat the underlying cause: ERCP for stones causing obstruction, and abstinence counseling and support for alcohol-related pancreatitis."
        },
        {
          "kind": "p",
          "text": "Complications include pancreatic pseudocyst (an encapsulated fluid collection that develops over weeks), pancreatic abscess, necrotizing pancreatitis with sterile or infected necrosis, ARDS (recall Hour 8), acute kidney injury, sepsis, hypocalcemia, hyperglycemia, and multi-organ failure in severe cases."
        },
        {
          "kind": "h",
          "text": "Chronic pancreatitis"
        },
        {
          "kind": "p",
          "text": "Chronic pancreatitis is irreversible structural damage and fibrosis, most commonly from chronic alcohol use in developed countries. Its symptoms are chronic abdominal pain, malabsorption with steatorrhea (fatty, foul-smelling, floating stools), weight loss, and eventual diabetes mellitus from islet cell destruction. Management includes pancreatic enzyme replacement with all meals (pancrelipase), fat-soluble vitamin supplementation (A, D, E, K), diabetes management, pain control, and alcohol abstinence."
        }
      ],
      "practiceItemId": "pi_pancreatitis_severity_marker"
    },
    {
      "id": "bowel-obstruction-ibd",
      "minutes": "44-49",
      "title": "Bowel Obstruction & IBD",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Bowel obstruction comes in two distinct entities - small bowel obstruction and large bowel obstruction - with different causes and slightly different presentations. Keeping the two apart, and recognizing strangulation, is the testable core of this segment."
        },
        {
          "kind": "h",
          "text": "Causes by location"
        },
        {
          "kind": "p",
          "text": "The most common causes of small bowel obstruction are postoperative adhesions (by far the most common), hernias, malignancy, Crohn disease strictures, and intussusception, especially in pediatric patients. The most common causes of large bowel obstruction are colorectal malignancy (by far the most common), volvulus (twisting of the bowel on its mesentery, with the sigmoid most common in adults), diverticular strictures, and fecal impaction."
        },
        {
          "kind": "h",
          "text": "Presentation and imaging"
        },
        {
          "kind": "p",
          "text": "The classic obstruction presentation includes cramping abdominal pain (intermittent and colicky in small bowel obstruction, more constant in large bowel obstruction); abdominal distension (greater with distal obstruction, so large bowel obstruction often distends more than small bowel obstruction); vomiting (earlier and more prominent in small bowel obstruction, and possibly feculent in large bowel obstruction from bacterial overgrowth in stagnant proximal contents); and obstipation, meaning no flatus and no stool. Bowel sounds are high-pitched and hyperactive early, as the proximal bowel tries to push contents past the obstruction, then become absent as the obstruction progresses."
        },
        {
          "kind": "p",
          "text": "On imaging, an abdominal X-ray shows dilated bowel loops with air-fluid levels. A CT scan is more definitive, identifying the transition point between dilated proximal bowel and decompressed distal bowel and often identifying the cause."
        },
        {
          "kind": "h",
          "text": "Management bundle"
        },
        {
          "kind": "p",
          "text": "The standard management bundle is NPO; a nasogastric tube to suction for decompression of the proximal stomach and bowel, which relieves distension, reduces vomiting, and prevents aspiration; IV fluids, because these patients are often volume-depleted from vomiting and third-spacing; electrolyte correction, since vomiting causes hypokalemia and metabolic alkalosis; and surgical consultation. Indications for emergency surgery are complete obstruction not responding to conservative management, signs of strangulation, perforation, and peritonitis."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Strangulation is a surgical emergency",
          "text": "Strangulation is vascular compromise of the obstructed bowel. Its signs are severe focal tenderness, peritonitis on exam, tachycardia, leukocytosis, lactic acidosis, and fever. Without intervention the bowel infarcts, perforates, and the patient develops fecal peritonitis, with high mortality absent rapid surgical intervention."
        },
        {
          "kind": "h",
          "text": "Inflammatory bowel disease: Crohn vs UC"
        },
        {
          "kind": "p",
          "text": "Crohn disease can affect any part of the GI tract from mouth to anus but classically involves the terminal ileum. The inflammation is transmural, affecting the entire bowel wall, and it produces skip lesions - areas of normal bowel between affected segments. Crohn carries higher rates of fistulas, abscesses, strictures, and perianal disease, and surgery is not curative because the disease can recur anywhere in the GI tract."
        },
        {
          "kind": "p",
          "text": "Ulcerative colitis is limited to the colon, with continuous involvement starting at the rectum and extending proximally, and the inflammation is mucosal and submucosal only. The classic presentation is bloody diarrhea with mucus. Toxic megacolon is the feared complication - massive colonic dilation with fever, tachycardia, and perforation risk - and colectomy can be curative for UC."
        },
        {
          "kind": "p",
          "text": "IBD treatment overlaps between the two. Use 5-aminosalicylates such as mesalamine for mild to moderate disease; corticosteroids for acute flares, oral or IV depending on severity; immunomodulators such as azathioprine and methotrexate; and biologics, including anti-TNF agents like infliximab and adalimumab, anti-integrin agents like vedolizumab, and anti-IL-12/23 agents. For surgery, colectomy can cure UC, while Crohn surgery is targeted to specific complications."
        }
      ]
    },
    {
      "id": "ostomy-care",
      "minutes": "49-55",
      "title": "Ostomy Care",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "There are three main ostomy types - ileostomy, colostomy, and urostomy - and the exam expects you to predict the output character from the anatomy. For internationally educated nurses, note that UK-trained nurses use 'stoma nurse' as a recognized specialty role, while some US-specific terminology like 'WOC nurse' (Wound, Ostomy, Continence) may be unfamiliar."
        },
        {
          "kind": "h",
          "text": "The three types and their output"
        },
        {
          "kind": "p",
          "text": "An ileostomy is an opening of the ileum, the distal small intestine, to the abdominal wall. Its output is liquid to semi-liquid and rich in digestive enzymes that are harsh to the skin. Volume is typically high - 500 to 1500 mL per day in steady state, and more in the early postoperative period - which brings a higher risk of dehydration. It is typically located in the right lower abdomen."
        },
        {
          "kind": "p",
          "text": "A colostomy is an opening of the colon to the abdominal wall, and its output character depends on where in the colon the stoma sits. An ascending colostomy in the proximal colon produces liquid stool because water has not yet been absorbed; a transverse colostomy in the middle colon produces semi-formed stool; and descending and sigmoid colostomies in the distal colon produce formed stool similar to normal."
        },
        {
          "kind": "p",
          "text": "A urostomy is most commonly an ileal conduit: a segment of ileum is isolated, the ureters are implanted into it, and the open end is brought to the abdominal wall, giving continuous urine output. The critical patient teaching is that the presence of mucus in the urine is expected and normal, because the conduit is intestinal tissue still producing mucus; patients should not panic when they see it."
        },
        {
          "kind": "h",
          "text": "Stoma color assessment"
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Stoma color - the highest-yield ostomy testable",
          "text": "A healthy stoma is pink to red and moist, looking like healthy mucosa - similar to the inside of your cheek. A pale stoma suggests possible anemia or early compromise of blood supply, so investigate and notify the provider. A dusky stoma - dark red, purple, gray, or black - indicates ischemia or necrosis and REQUIRES immediate provider notification; this is a surgical emergency and the stoma may need revision. Watch the trend: a stoma that was pink yesterday and is darker today is alarming even before it reaches obvious necrosis."
        },
        {
          "kind": "h",
          "text": "Peristomal skin and pouch fitting"
        },
        {
          "kind": "p",
          "text": "Peristomal skin assessment is the second highest-yield testable here. The skin around the stoma is at constant risk of breakdown, because effluent leakage causes chemical irritation - especially with an ileostomy, where digestive enzymes are corrosive. Healthy peristomal skin looks like the rest of the abdominal skin; erythema, denudation, fungal infection (often Candida, with bright red satellite lesions), or ulceration all require intervention."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Pouch aperture and emptying",
          "text": "Cut the pouch aperture - the hole that fits over the stoma - to approximately one-eighth inch larger than the stoma diameter: large enough to fit without compressing the stoma, small enough that effluent does not contact the surrounding skin. Skin barriers, protective rings, and convex inserts are used as needed for difficult anatomy. Empty the pouch when it is one-third to one-half full, because letting it fill further makes it heavy and the weight can pull the pouch off the skin barrier."
        },
        {
          "kind": "h",
          "text": "Hydration, diet, and teaching"
        },
        {
          "kind": "p",
          "text": "Hydration teaching is critical, especially for ileostomy patients, because of high water and electrolyte losses, particularly sodium. Patients should drink 2 to 3 liters of fluid daily and increase intake during hot weather, exercise, or illness with vomiting or diarrhea, using sports drinks or oral rehydration solutions during high-output episodes. Teach them to watch for signs of dehydration - decreased urine output, dark urine, dizziness, fatigue, and weight loss."
        },
        {
          "kind": "p",
          "text": "For diet, introduce foods one at a time over the first few weeks to identify problematic ones. Common gas producers are broccoli, cabbage, onions, beans, and carbonated beverages. Common odor producers are eggs, fish, garlic, and certain spices. Common blockage risks specifically in ileostomy are popcorn, nuts, corn kernels, raw celery, dried fruits, and mushrooms - poorly digested fibers that can cause obstruction at the narrow stoma - so counsel ileostomy patients to chew thoroughly, avoid these foods in the early months, and reintroduce them cautiously."
        },
        {
          "kind": "p",
          "text": "Patient teaching also covers the significant body image impact (support resources help), sexuality counseling, travel considerations (extra supplies, time zones, hot climates), and support groups, where peer connection makes a measurable difference. Require a return demonstration of a pouch change before discharge."
        }
      ],
      "practiceItemId": "pi_stoma_ischemia_priority"
    },
    {
      "id": "synthesis-dialysis-gi-bleed",
      "minutes": "55-58",
      "title": "Synthesis - Chronic Dialysis Patient with GI Bleed",
      "format": "Case",
      "blocks": [
        {
          "kind": "p",
          "text": "Synthesis case. A 64-year-old client with ESRD on hemodialysis takes warfarin for atrial fibrillation. Today the client presents with melena and weakness. Vital signs: BP 86/52, HR 116, RR 22, SpO2 97%. Labs: Hgb 6.4 g/dL, INR 4.8, K+ 6.2, BUN 92, creatinine 6.4. The AV fistula in the left arm has a strong thrill and bruit. Walk through your reasoning: identify the priorities, the immediate actions, and the cross-system considerations."
        },
        {
          "kind": "p",
          "text": "Start by naming the multiple critical issues. There is active upper GI bleeding (melena), hemodynamic instability (BP 86/52 with tachycardia), severe anemia (Hgb 6.4, below the transfusion threshold), a supratherapeutic INR (4.8) compounding the bleeding, hyperkalemia (K+ 6.2, above the typical hemodialysis threshold), and kidney failure (creatinine 6.4 at baseline). Each one demands attention, but they must be sequenced."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Priorities in order",
          "text": "(1) ABC - two large-bore peripheral IVs on the non-fistula arm only (recall the AV fistula precautions) and aggressive fluid resuscitation. (2) Type and crossmatch and transfuse packed red blood cells given Hgb 6.4 with active bleeding. (3) Reverse the warfarin - IV vitamin K plus consideration of FFP or prothrombin complex concentrate (PCC) for emergent reversal given the instability. (4) Address hyperkalemia - calcium gluconate IV if any ECG changes (recall Hour 6), insulin plus dextrose; because this patient is on hemodialysis, urgent dialysis can address both the potassium and the volume/uremia. (5) Endoscopy for diagnosis and therapeutic intervention. (6) Hold warfarin until bleeding is controlled and the INR stabilizes."
        },
        {
          "kind": "p",
          "text": "For the cross-system considerations, note that the fistula is intact (thrill and bruit present), so the access is usable, and hemodialysis can be coordinated for after stabilization to help manage the hyperkalemia. This patient will need a conversation about anticoagulation strategy going forward - possibly switching to a DOAC with renal dose adjustment, or apixaban, which is preferred in renal impairment among the DOACs (recall Hour 3). This case pulls together Hour 2 (the ABC priority framework), Hour 3 (warfarin reversal and atrial fibrillation anticoagulation), Hour 5 (NSAIDs would be off-limits), Hour 6 (transfusion threshold, hyperkalemia treatment, INR interpretation), and Hour 10 (AV fistula precautions, upper GI bleeding management). The cumulative knowledge of the bootcamp is now applied to a realistic, complex patient."
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
          "text": "Homework before Hour 11: fifty renal and GI questions with deliberate emphasis on AV fistula teaching, dialysis safety, lactulose mechanism, and stoma assessment. Capture every wrong answer in your journal - by now that journal is becoming a personalized map of your gaps, so use it."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Preview - Hour 11: Neurology & Musculoskeletal",
          "text": "Stroke recognition and the tPA window, increased intracranial pressure, seizures, spinal cord injury levels, Guillain-Barré, myasthenia gravis, fractures, compartment syndrome, and fat embolism. See you Hour 11."
        }
      ]
    }
  ]
};
