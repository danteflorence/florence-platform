import type { Lesson } from "./lessonTypes";

/**
 * Section 8 - Respiratory. Auto-generated from the Florence Academy
 * bootcamp instructor script (expanded draft). Pending nurse-educator review.
 */
export const lesson: Lesson = {
  "meta": {
    "number": 8,
    "title": "Respiratory",
    "durationMin": 60,
    "audience": "Internationally educated nurses - Philippines, UK, Kenya, Ghana",
    "contentWeight": "Approximately 10-12% of NCLEX items - and the single highest-yield IEN-specific content of the bootcamp",
    "tagline": "Respiratory is where international experience meets US-specific practice - and TB precautions, BCG, and the risk-stratified PPD are the gap this hour closes."
  },
  "objectives": [
    "Differentiate COPD from asthma in presentation, ABG pattern, and emergency management - including the oxygen-targeting principle in chronic CO2 retainers.",
    "Recognize the classic and atypical presentations of pneumonia, including aspiration pneumonia, and apply prevention strategies in postoperative and tube-fed patients.",
    "Apply US-specific TB precautions (airborne, N95, negative pressure room), interpret a PPD by risk-stratified cutoff, and recite the RIPE regimen with class-specific adverse effects.",
    "Recognize pulmonary embolism by clinical pattern and ABG (respiratory alkalosis with hypoxia), and identify the role of D-dimer and CT pulmonary angiogram.",
    "Identify the Berlin criteria for ARDS and the principles of lung-protective ventilation.",
    "Manage a chest tube - interpret tidaling, bubbling, and drainage; respond correctly to tubing disconnection and patient dislodgment.",
    "Apply the ventilator-associated pneumonia bundle and tracheostomy emergency management."
  ],
  "timing": [
    {
      "minutes": "0-3",
      "segment": "Recap & frame the respiratory hour",
      "format": "Lecture"
    },
    {
      "minutes": "3-9",
      "segment": "COPD - chronic CO2 retention, oxygen targeting",
      "format": "Lecture"
    },
    {
      "minutes": "9-15",
      "segment": "Asthma - stepwise treatment, status asthmaticus",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "15-21",
      "segment": "Pneumonia - CAP, HAP, aspiration, prevention",
      "format": "Lecture"
    },
    {
      "minutes": "21-30",
      "segment": "Tuberculosis - precautions, PPD, RIPE, BCG",
      "format": "Lecture + 1 item - extended"
    },
    {
      "minutes": "30-36",
      "segment": "Pulmonary embolism - recognition, treatment",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "36-41",
      "segment": "ARDS - Berlin criteria, lung-protective ventilation",
      "format": "Lecture"
    },
    {
      "minutes": "41-49",
      "segment": "Chest tubes - drainage, tidaling, emergencies",
      "format": "Lecture + 1 item"
    },
    {
      "minutes": "49-54",
      "segment": "Ventilator basics & tracheostomy",
      "format": "Lecture"
    },
    {
      "minutes": "54-58",
      "segment": "Synthesis - TB exposure in healthcare worker",
      "format": "Case"
    },
    {
      "minutes": "58-60",
      "segment": "Close & homework",
      "format": "Lecture"
    }
  ],
  "practiceItems": {
    "pi_silent_chest": {
      "id": "pi_silent_chest",
      "stem": "A nurse is caring for a child with severe asthma exacerbation who has been wheezing loudly on auscultation for the past hour. The nurse reassesses and notes that the wheezing has resolved, but the child appears more anxious, tachypneic, and is using accessory muscles. What is the nurse's priority interpretation?",
      "options": [
        {
          "key": "A",
          "text": "The child's asthma is responding to treatment."
        },
        {
          "key": "B",
          "text": "The child requires deeper auscultation; the wheezing has likely just moved."
        },
        {
          "key": "C",
          "text": "The child's airflow has decreased to the point where no wheeze is produced - impending respiratory failure."
        },
        {
          "key": "D",
          "text": "The child is now hyperventilating from anxiety, not from asthma."
        }
      ],
      "answer": "C",
      "rationale": "Silent chest in a previously wheezing asthmatic with worsening clinical signs - accessory muscle use, increased work of breathing - is impending respiratory failure. The wheeze stopped because the airflow stopped, not because the airways opened. Call a rapid response, prepare for intubation, and continue continuous nebulizer plus systemic steroids plus IV magnesium. A is the dangerous misinterpretation - the absence of wheeze is mistaken for improvement. B and D miss the physiology: there is too little air movement to generate any wheeze.",
      "cjmm": "analyze-cues",
      "reference": "Section 8 · Asthma - status asthmaticus and the silent chest"
    },
    "pi_ppd_ien_nurse": {
      "id": "pi_ppd_ien_nurse",
      "stem": "A new nurse from the Philippines is hired at a US hospital and receives a routine pre-employment Mantoux test. At 48 hours, the induration measures 12 mm. The nurse received BCG vaccination as a child and has no respiratory symptoms or known TB contacts. Which interpretation and action are correct?",
      "options": [
        {
          "key": "A",
          "text": "The PPD is negative because the nurse received BCG; no further action needed."
        },
        {
          "key": "B",
          "text": "The PPD is positive for a healthcare worker from a high-prevalence country; an IGRA or chest X-ray should follow to evaluate for active versus latent TB."
        },
        {
          "key": "C",
          "text": "The PPD is positive and the nurse must be removed from patient care indefinitely."
        },
        {
          "key": "D",
          "text": "The PPD is negative because 12 mm is below the 15 mm cutoff."
        }
      ],
      "answer": "B",
      "rationale": "The cutoff for healthcare workers and for foreign-born persons from high-prevalence countries is 10 mm, so 12 mm in this nurse is POSITIVE. BCG is a confounder for the PPD but does not negate it - and IGRA is the preferred follow-up test in BCG-vaccinated persons because it is not affected by BCG. Next steps are a chest X-ray to evaluate for active disease, an IGRA to confirm if there is uncertainty, and evaluation for latent TB treatment if infection is confirmed and active disease is excluded. The nurse is not necessarily removed from patient care if latent - but is treated for latent TB. C is too restrictive. D applies the wrong cutoff (15 mm). A misses both the IGRA preference and the risk-stratified interpretation.",
      "cjmm": "analyze-cues",
      "reference": "Section 8 · Tuberculosis - PPD interpretation and BCG"
    },
    "pi_postop_pe": {
      "id": "pi_postop_pe",
      "stem": "A client three days postoperative from total hip replacement suddenly reports severe dyspnea and right-sided chest pain. Vital signs: HR 124, BP 92/58, RR 32, SpO2 86% on room air. ABG: pH 7.50, PaCO2 28, HCO3 24, PaO2 56. Which condition is most likely?",
      "options": [
        {
          "key": "A",
          "text": "Pneumonia."
        },
        {
          "key": "B",
          "text": "Pulmonary embolism."
        },
        {
          "key": "C",
          "text": "Pulmonary edema."
        },
        {
          "key": "D",
          "text": "Pneumothorax."
        }
      ],
      "answer": "B",
      "rationale": "Three days post-op from a hip replacement is a major DVT/PE risk window. The picture is sudden-onset dyspnea, tachycardia, hypotension suggesting hemodynamic compromise, and severe hypoxia. The ABG shows respiratory alkalosis with hypoxia - pH up, CO2 down, PaO2 56 - the classic PE pattern. Pneumonia would typically be subacute with fever, sputum, and an infiltrate. Pulmonary edema would have crackles and frothy sputum and is usually cardiac. Pneumothorax would have unilateral absent breath sounds and possible tracheal deviation. The answer is B.",
      "cjmm": "prioritize-hypotheses",
      "reference": "Section 8 · Pulmonary embolism - recognition"
    },
    "pi_chest_tube_dislodged": {
      "id": "pi_chest_tube_dislodged",
      "stem": "A nurse enters the room of a client with a chest tube and notes that the tube has been pulled out of the chest. Significant subcutaneous emphysema is rapidly developing around the insertion site. What is the nurse's priority action?",
      "options": [
        {
          "key": "A",
          "text": "Notify the provider immediately."
        },
        {
          "key": "B",
          "text": "Apply a sterile occlusive dressing taped on all four sides."
        },
        {
          "key": "C",
          "text": "Apply a sterile occlusive dressing taped on three sides."
        },
        {
          "key": "D",
          "text": "Insert a sterile glove finger into the wound to occlude it."
        }
      ],
      "answer": "C",
      "rationale": "A sterile occlusive dressing taped on three sides is correct - the unfastened fourth side acts as a one-way valve that lets air escape on expiration but prevents air from entering on inspiration, preventing a tension pneumothorax. B is the catastrophic answer: four-sided taping seals the pleural space and causes a tension pneumothorax. A is appropriate but not first - the airway risk must be addressed first, then notify the provider. D is not standard practice. Three sides, always.",
      "cjmm": "take-actions",
      "reference": "Section 8 · Chest tubes - emergencies"
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
          "text": "Welcome to Hour 8 - Respiratory. Approximately 10 to 12 percent of NCLEX items live in this content area, so on volume alone it earns the full hour. But more importantly for this audience, this hour contains the single highest-yield IEN-specific content of the entire bootcamp: tuberculosis. We will spend almost ten minutes on TB alone."
        },
        {
          "kind": "p",
          "text": "The reason TB is the headline is that the way it is managed in the United States is different from how it is managed in the Philippines, in Kenya, in Ghana, and in parts of the UK with high immigrant populations. The precautions are different. The PPD interpretation is different - especially when you have had BCG vaccination, which most of you have. The drug regimen itself is the same globally, but the monitoring frameworks differ. We close that gap deliberately today."
        },
        {
          "kind": "p",
          "text": "Before we get to TB we will cover COPD, asthma, and pneumonia. After TB we cover pulmonary embolism, ARDS, chest tubes, ventilator basics, and tracheostomy. There are backward references throughout - ABG interpretation from Hour 6 (ROME), anticoagulation from Hour 3, opioid respiratory depression from Hour 5, and prioritization from Hour 2. The clinical hours are getting denser now because the cumulative knowledge is substantial. Let's go."
        }
      ]
    },
    {
      "id": "copd",
      "minutes": "3-9",
      "title": "COPD - Chronic CO2 Retention and Oxygen Targeting",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "COPD - chronic obstructive pulmonary disease - includes two overlapping syndromes: chronic bronchitis and emphysema. Chronic bronchitis is defined by a productive cough on most days for 3 months in 2 consecutive years; emphysema is alveolar destruction. Most patients have features of both. The unifying problem is fixed, largely irreversible airflow obstruction - in direct contrast to asthma, which is mostly reversible."
        },
        {
          "kind": "h",
          "text": "Classic presentation"
        },
        {
          "kind": "p",
          "text": "Expect a chronic productive cough that has lasted years and progressive dyspnea on exertion. The chest takes on a barrel shape from chronic air trapping. Patients often teach themselves pursed-lip breathing - it provides a kind of auto-PEEP that keeps the small airways open during expiration. You will also hear prolonged expiration and decreased breath sounds, and you may hear wheezing or coarse crackles."
        },
        {
          "kind": "h",
          "text": "ABG pattern in stable disease"
        },
        {
          "kind": "p",
          "text": "The hallmark is chronic respiratory acidosis with metabolic compensation. CO2 is elevated because the patient retains it; HCO3 is elevated because the kidneys have compensated; and pH is near normal in stable disease, sometimes slightly acidotic. Recall Hour 6 ROME - pH and CO2 in opposite directions tells you it is respiratory, and HCO3 shifted in the same direction as CO2 tells you compensation has occurred."
        },
        {
          "kind": "h",
          "text": "Oxygen targeting in chronic CO2 retainers - the most testable principle"
        },
        {
          "kind": "p",
          "text": "Here is the physiology. Healthy people breathe primarily in response to rising CO2 - a chemoreceptor in the brainstem detects CO2 and drives ventilation. Chronic CO2 retainers, a subset of severe COPD patients, have desensitized that chemoreceptor and instead breathe primarily in response to LOW oxygen. If you flood them with high-flow oxygen, you remove that hypoxic drive, they stop breathing as hard, and CO2 climbs further until they slide into hypercapnic respiratory failure."
        },
        {
          "kind": "p",
          "text": "So in known chronic retainers - and you will know this from the history and previous ABGs - the target oxygen saturation is 88 to 92 percent. Not 95. Not 100. 88 to 92. You titrate oxygen to that window rather than maximizing it."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Never withhold oxygen from a hypoxic patient",
          "text": "You do NOT withhold oxygen based on theoretical concern. If a COPD patient has a sat of 78 percent, they need oxygen now. Titrate UP to target: if 2 liters by nasal cannula reaches the target, stay at 2; if they need 6 liters to reach target, give 6. Hypoxia kills now; CO2 narcosis develops over hours. Treat the hypoxia first, then titrate to 88-92%."
        },
        {
          "kind": "h",
          "text": "Pharmacologic treatment of stable COPD"
        },
        {
          "kind": "p",
          "text": "Start with a short-acting beta-agonist - albuterol in US English, salbutamol in UK English; recall the Hour 3 drill on this exact name pair. Add long-acting bronchodilators - long-acting beta-agonists (LABA) and long-acting muscarinic antagonists (LAMA) such as tiotropium. Inhaled corticosteroids are reserved for selected patients with frequent exacerbations or features of asthma overlap. Smoking cessation is the single most impactful intervention - nothing else changes the trajectory like quitting. Round it out with the annual influenza vaccine and the pneumococcal vaccine."
        },
        {
          "kind": "h",
          "text": "Acute exacerbation"
        },
        {
          "kind": "p",
          "text": "Management of an acute exacerbation means increased short-acting bronchodilator use, systemic corticosteroids (prednisone 40 milligrams orally for 5 days is a common regimen), and antibiotics if there are signs of bacterial infection - increased sputum volume, purulent sputum, or fever. Oxygen is titrated to 88 to 92 percent. Non-invasive positive pressure ventilation - BiPAP - is used for hypercapnic respiratory failure, with intubation reserved for when BiPAP fails or is contraindicated."
        }
      ]
    },
    {
      "id": "asthma",
      "minutes": "9-15",
      "title": "Asthma - Stepwise Treatment and Status Asthmaticus",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Asthma is reversible airway obstruction. The key difference from COPD is exactly that reversibility - asthma airflow obstruction can be substantially reversed with bronchodilators, whereas COPD is partially reversible at best. Symptoms also classically come in episodes, with periods of relative wellness between them."
        },
        {
          "kind": "h",
          "text": "Triggers and symptoms"
        },
        {
          "kind": "p",
          "text": "Triggers include allergens, exercise, cold air, viral respiratory infections, NSAIDs in aspirin-sensitive asthma, occupational exposures, stress, and GERD. The classic symptoms are wheezing, dyspnea, chest tightness, and cough - the cough is often worst at night or early morning."
        },
        {
          "kind": "h",
          "text": "Stepwise treatment (GINA/NIH framework)"
        },
        {
          "kind": "p",
          "text": "These are the broad strokes - cohort-specific protocols may vary. Every asthma patient gets rescue therapy with a SABA (albuterol). Anyone with persistent symptoms gets controller therapy with a low-dose inhaled corticosteroid. Moderate-to-severe disease steps up to LABA-plus-ICS combinations. For severe asthma, add a LAMA, a leukotriene receptor antagonist such as montelukast, or biologics such as omalizumab or mepolizumab."
        },
        {
          "kind": "h",
          "text": "Peak flow monitoring - patient self-management"
        },
        {
          "kind": "p",
          "text": "Personal best is established when the patient is well, and then daily peak flow is interpreted by zones. The green zone is 80 to 100 percent of personal best - good control. The yellow zone is 50 to 79 percent - caution: increase rescue inhaler use and consider stepping up controller therapy. The red zone is less than 50 percent - a medical emergency: use the rescue inhaler and get to the ED if there is no rapid improvement."
        },
        {
          "kind": "h",
          "text": "Status asthmaticus"
        },
        {
          "kind": "p",
          "text": "Status asthmaticus is a severe, refractory exacerbation that does not respond to standard therapy. Treat with continuous nebulized albuterol, systemic corticosteroids, and IV magnesium sulfate - recall Hour 5, where magnesium was the OB drug; it relaxes smooth muscle, including bronchial smooth muscle. Epinephrine is used in severe cases, and intubation is performed if respiratory failure is imminent."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "The silent chest",
          "text": "Wheezing requires moving air. A severely obstructed patient with minimal air movement does not wheeze - there isn't enough flow to make the noise. So if a previously wheezing asthmatic suddenly stops wheezing, that is NOT improvement - it may be impending respiratory arrest. The silent chest is a critical, counterintuitive finding. Memorize it."
        },
        {
          "kind": "h",
          "text": "Inhaler teaching - heavily tested"
        },
        {
          "kind": "list",
          "items": [
            "Shake the canister.",
            "Exhale fully.",
            "Place the inhaler 1 to 2 finger-widths from the mouth, or use a spacer.",
            "Press the canister and inhale slowly and deeply.",
            "Hold the breath for 10 seconds.",
            "Wait 1 minute between puffs.",
            "After an inhaled corticosteroid (ICS), rinse the mouth to prevent oral candidiasis - thrush."
          ]
        },
        {
          "kind": "p",
          "text": "Spacers improve drug delivery and reduce oropharyngeal deposition. They are always recommended with metered-dose inhalers in children and in adults with poor coordination."
        }
      ],
      "practiceItemId": "pi_silent_chest"
    },
    {
      "id": "pneumonia",
      "minutes": "15-21",
      "title": "Pneumonia - CAP, HAP, Aspiration, and Prevention",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Pneumonia is classified three ways by the setting of acquisition, and the classification drives the empiric antibiotic choice - that is why it matters on the exam."
        },
        {
          "kind": "h",
          "text": "Three classifications by acquisition setting"
        },
        {
          "kind": "p",
          "text": "Community-acquired pneumonia (CAP) has its onset outside a healthcare facility, or within the first 48 hours of admission. The common organisms are Streptococcus pneumoniae - the most common typical bacterial cause - along with atypicals (Mycoplasma pneumoniae, Chlamydia pneumoniae, Legionella) and viral causes such as influenza, RSV, and more recently SARS-CoV-2."
        },
        {
          "kind": "p",
          "text": "Hospital-acquired pneumonia (HAP) has its onset more than 48 hours after admission. Ventilator-associated pneumonia (VAP) develops in a patient mechanically ventilated for more than 48 hours. Both involve a different, more resistant organism profile - Pseudomonas, MRSA, and gram-negative bacilli - which is why they require broader-spectrum empiric coverage."
        },
        {
          "kind": "h",
          "text": "Presentation"
        },
        {
          "kind": "p",
          "text": "The classic presentation is cough, sputum production (rust-colored in classic pneumococcal disease, green in pseudomonas), fever, dyspnea, and pleuritic chest pain, with crackles on auscultation and possibly bronchial breath sounds or egophony over an area of consolidation."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Atypical presentation in the elderly",
          "text": "Older adults often present without classic findings. Confusion, weakness, and a fall may be the only manifestations - sometimes with no fever, sometimes with only tachypnea. Always consider pneumonia in the deteriorating elderly patient."
        },
        {
          "kind": "h",
          "text": "Diagnosis"
        },
        {
          "kind": "p",
          "text": "Diagnosis rests on a chest X-ray showing an infiltrate, a sputum Gram stain and culture, urinary antigens for pneumococcus and Legionella in selected cases, and blood cultures for severe disease - drawn before antibiotics."
        },
        {
          "kind": "h",
          "text": "Aspiration pneumonia"
        },
        {
          "kind": "p",
          "text": "Aspiration pneumonia is a different beast: it involves anaerobic bacteria from the oropharynx and affects the dependent lung segments. The right lower lobe is most common because the right mainstem bronchus is more vertical than the left. At-risk patients are those with dysphagia (stroke, dementia, Parkinson disease), decreased level of consciousness (alcohol intoxication, sedation, anesthesia), nasogastric tubes, enteral feeding, or prolonged supine positioning."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Prevention strategies - testable on every NCLEX",
          "text": "Incentive spirometry every hour while awake in postoperative patients. Early ambulation. Head of bed elevated to 30-45 degrees in tube-fed and ventilated patients. Oral care, especially chlorhexidine in ventilated patients. Pneumococcal vaccine (current schedule includes PCV15 or PCV20 followed by PPSV23) and annual influenza vaccine for adults over 65 and at-risk populations."
        }
      ]
    },
    {
      "id": "tuberculosis",
      "minutes": "21-30",
      "title": "Tuberculosis - Precautions, PPD, RIPE, and BCG",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "This is the IEN-critical segment of the hour, so we slow down here. Tuberculosis is caused by Mycobacterium tuberculosis, and transmission is airborne. The droplet nuclei are small enough to remain suspended in the air for hours - fundamentally different from droplet diseases like influenza or pertussis, which fall to the ground within a few feet. Airborne pathogens require special precautions, and that distinction is the whole reason TB is managed the way it is."
        },
        {
          "kind": "h",
          "text": "Latent versus active TB"
        },
        {
          "kind": "p",
          "text": "In latent TB infection the patient has been infected but the immune system is containing the organism within granulomas. The patient is asymptomatic, has a normal chest X-ray (or only old fibrotic scars), and cannot transmit the organism. Latent TB is treated to prevent reactivation."
        },
        {
          "kind": "p",
          "text": "In active TB disease the organism has overcome immune containment, so the patient is symptomatic and infectious. The symptoms are a cough lasting longer than 2 to 3 weeks, hemoptysis, drenching night sweats that require a change of bedclothes, unintentional weight loss, low-grade fever, fatigue, and anorexia. The pattern is subacute to chronic, not acute."
        },
        {
          "kind": "h",
          "text": "IEN-specific context and BCG"
        },
        {
          "kind": "p",
          "text": "TB prevalence is substantially higher in the Philippines, in much of sub-Saharan Africa including Kenya and Ghana, and in parts of South Asia. Many of you have been exposed to TB, and many of you received BCG vaccination as infants or young children, because BCG is given routinely in TB-endemic countries to reduce severe TB in children."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "BCG and the IGRA preference",
          "text": "BCG can cause a positive PPD response that may persist for years. It does NOT affect interferon gamma release assays (IGRAs). So for BCG-vaccinated individuals, the IGRA - QuantiFERON-TB Gold or T-SPOT.TB - is the preferred diagnostic test, and CDC recommendations specifically support IGRA over PPD in BCG-vaccinated persons."
        },
        {
          "kind": "h",
          "text": "PPD (Mantoux) interpretation"
        },
        {
          "kind": "p",
          "text": "Even though IGRA is preferred for many of you, you will be tested on PPD interpretation. The Mantoux test is an intradermal injection of purified protein derivative, read at 48 to 72 hours. Measure the induration - the firm raised area - in millimeters across the forearm. Erythema alone does not count; measure only the induration. The cutoff for a positive result depends on the patient's risk category."
        },
        {
          "kind": "list",
          "items": [
            "≥5 mm is positive in high-risk groups: HIV-positive patients, recent close contacts of an active TB case, patients with fibrotic changes on chest X-ray consistent with prior TB, organ transplant recipients, and other significantly immunosuppressed patients.",
            "≥10 mm is positive in moderate-risk groups: foreign-born persons from high-prevalence countries (most IENs from the Philippines, Africa, and parts of Asia), IV drug users, healthcare workers, residents or employees of high-risk congregate settings (correctional facilities, homeless shelters, nursing homes), children under 4, and persons with certain comorbidities including diabetes, silicosis, chronic renal failure, and leukemia.",
            "≥15 mm is positive in low-risk persons with no known risk factors."
          ]
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Your cutoff is 10 mm, not 15",
          "text": "For healthcare workers from high-prevalence countries - that is most of you - a 10-millimeter induration is positive. Not 15. Memorize this, because the exam loves to bait you with a reading between 10 and 15 and the wrong 15 mm cutoff."
        },
        {
          "kind": "h",
          "text": "Airborne precautions in the United States"
        },
        {
          "kind": "p",
          "text": "For active or suspected TB, the US standard is a single-patient negative-pressure room - air flows IN to the room from the hallway, not out, so airborne particles do not escape. The door remains closed at all times. Staff wear an N95 respirator or higher, fit-tested annually, on every entry, and a PAPR (powered air-purifying respirator) for aerosol-generating procedures such as intubation or bronchoscopy. The patient wears a surgical mask if they must be transported outside the room, and transport is limited whenever possible."
        },
        {
          "kind": "h",
          "text": "The RIPE regimen"
        },
        {
          "kind": "p",
          "text": "Drug-susceptible active TB is treated with the RIPE regimen for the first 2 months, then RI (rifampin and isoniazid) for 4 additional months - a total of 6 months of therapy. Each drug has signature adverse effects you must know."
        },
        {
          "kind": "list",
          "items": [
            "R - Rifampin: hepatotoxicity; orange-red discoloration of all body fluids (tears, urine, and sweat turn orange, and soft contact lenses are permanently stained - warn the patient explicitly so they are not alarmed); and induction of the CYP3A4 enzyme system, which accelerates metabolism of many drugs (oral contraceptives become unreliable, warfarin requires dose adjustment, certain antiretrovirals are problematic). A drug interaction review is essential.",
            "I - Isoniazid (INH): hepatotoxicity, especially in patients who also drink alcohol; and peripheral neuropathy (tingling, numbness, burning in the feet) caused by B6 (pyridoxine) antagonism. Standard practice is to give pyridoxine 25 to 50 milligrams daily with INH to prevent the neuropathy.",
            "P - Pyrazinamide: hepatotoxicity, hyperuricemia that can precipitate gout flares, and arthralgias.",
            "E - Ethambutol: optic neuritis - vision changes, decreased visual acuity, and red-green color blindness. Report any vision change immediately and discontinue the drug; obtain baseline visual acuity and color vision testing before starting, and periodically during therapy."
          ]
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Why pyridoxine with INH?",
          "text": "If a question asks why pyridoxine (vitamin B6) is given with INH, the answer is to prevent peripheral neuropathy. INH antagonizes B6, and pyridoxine replacement prevents the resulting nerve symptoms. This is a reliable testable pairing."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "All four TB drugs are hepatotoxic",
          "text": "Check LFTs at baseline and as clinically indicated. Patients should avoid alcohol entirely during treatment. New hepatitis symptoms - nausea, anorexia, RUQ pain, jaundice, dark urine - require immediate evaluation."
        },
        {
          "kind": "h",
          "text": "DOT and latent treatment"
        },
        {
          "kind": "p",
          "text": "Directly Observed Therapy (DOT) means a healthcare worker watches the patient take each dose. It is the standard of care for many active TB patients in the US because the consequence of nonadherence - multidrug-resistant TB - is catastrophic for the individual and for public health. Latent TB treatment is typically INH for 6 to 9 months, or a shorter combination regimen such as 3HP (INH plus rifapentine weekly for 12 weeks). Treatment of latent infection prevents progression to active disease in about 90 percent of cases."
        }
      ],
      "practiceItemId": "pi_ppd_ien_nurse"
    },
    {
      "id": "pulmonary-embolism",
      "minutes": "30-36",
      "title": "Pulmonary Embolism - Recognition and Treatment",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Most pulmonary emboli originate as deep vein thromboses, typically from the lower extremities, that break free and embolize to the pulmonary arteries. Recognizing the setup and the clinical pattern is what the exam rewards."
        },
        {
          "kind": "h",
          "text": "Virchow's triad"
        },
        {
          "kind": "p",
          "text": "Three categories of risk combine to cause clots. Venous stasis - immobility, long flights, the postoperative state, hospitalization. Endothelial injury - surgery, trauma, central venous catheters. Hypercoagulability - malignancy, pregnancy, oral contraceptives, inherited thrombophilias such as factor V Leiden, and COVID-19 infection."
        },
        {
          "kind": "h",
          "text": "Presentation"
        },
        {
          "kind": "p",
          "text": "The classic presentation is sudden-onset dyspnea, tachypnea, tachycardia, pleuritic chest pain, hypoxia, and anxiety, with possible hemoptysis and possible syncope in massive PE. The picture overlaps with MI - recall Hour 7 - and the differentiation matters. Massive (high-risk) PE is the subset with hemodynamic instability: hypotension, signs of shock, and right ventricular failure. Mortality without rapid intervention is high."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "ABG pattern",
          "text": "Respiratory alkalosis from hyperventilation, PLUS hypoxia, PLUS an elevated A-a gradient. Recall Hour 6 ROME - pH up, CO2 down, opposite directions, respiratory alkalosis. The hypoxia is what distinguishes PE from anxiety-induced hyperventilation, where oxygenation is normal."
        },
        {
          "kind": "h",
          "text": "Diagnostic approach"
        },
        {
          "kind": "p",
          "text": "Step one is to assess clinical pretest probability using the Wells score or revised Geneva score. Step two: in low-probability patients, a negative D-dimer can rule out PE - recall Hour 6, D-dimer below 0.5. Step three: in moderate-to-high probability patients, or with a positive D-dimer, the CT pulmonary angiogram is the definitive test. A V/Q scan is the alternative when CT contrast is contraindicated by severe renal impairment or severe contrast allergy."
        },
        {
          "kind": "h",
          "text": "Treatment"
        },
        {
          "kind": "p",
          "text": "For hemodynamically stable PE, the treatment is anticoagulation: initial parenteral therapy with unfractionated or low molecular weight heparin bridging to oral warfarin, or a direct oral anticoagulant (DOAC) started immediately depending on the agent - recall Hour 3. For massive PE, the treatment is thrombolytics (alteplase), catheter-directed thrombolysis, or surgical or catheter embolectomy. It is time-critical, and mortality drops with rapid recognition and intervention."
        },
        {
          "kind": "p",
          "text": "An IVC filter is considered in patients with contraindications to anticoagulation or recurrent PE despite adequate anticoagulation; it does not treat the existing clot but prevents further clots from reaching the lungs. Prevention in at-risk hospitalized patients is prophylactic-dose LMWH or DOAC, mechanical prophylaxis with sequential compression devices and graduated compression stockings, and early mobilization."
        }
      ],
      "practiceItemId": "pi_postop_pe"
    },
    {
      "id": "ards",
      "minutes": "36-41",
      "title": "ARDS - Berlin Criteria and Lung-Protective Ventilation",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "ARDS - acute respiratory distress syndrome - is severe diffuse lung injury with non-cardiogenic pulmonary edema. The capillaries in the lungs leak protein-rich fluid into the alveoli, the lungs become stiff and heavy, and gas exchange fails."
        },
        {
          "kind": "h",
          "text": "Causes"
        },
        {
          "kind": "p",
          "text": "Sepsis is the most common precipitant. After that come pneumonia, aspiration, severe trauma, transfusion-related acute lung injury (TRALI), pancreatitis, near-drowning, and burns."
        },
        {
          "kind": "h",
          "text": "Berlin criteria for diagnosis"
        },
        {
          "kind": "list",
          "items": [
            "Acute onset - within 1 week of a known clinical insult or new or worsening respiratory symptoms.",
            "Bilateral opacities on chest imaging not fully explained by effusions, lobar collapse, or nodules.",
            "Respiratory failure not fully explained by cardiac failure or fluid overload.",
            "Hypoxemia categorized by the PaO2/FiO2 ratio (P/F ratio) on a minimum PEEP of 5: mild ARDS P/F 200-300, moderate P/F 100-200, severe P/F at or below 100."
          ]
        },
        {
          "kind": "h",
          "text": "Treatment principles"
        },
        {
          "kind": "p",
          "text": "Treat the underlying cause - antibiotics for the precipitating infection, source control, whatever the cause was. Provide mechanical ventilation with lung-protective settings: a low tidal volume of 6 milliliters per kilogram of IDEAL body weight, a plateau pressure below 30 centimeters of water, and optimized PEEP. Use conservative fluid management once initial resuscitation is complete, because too much fluid worsens the pulmonary edema."
        },
        {
          "kind": "p",
          "text": "Prone positioning is used for severe ARDS - placing the patient face-down improves V/Q matching and reduces atelectasis in the posterior lung regions, and the evidence base is strong. Neuromuscular blockade is used in selected severe cases, and ECMO (extracorporeal membrane oxygenation) is reserved for refractory cases."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Prevention has the highest impact",
          "text": "Mortality in ARDS remains substantial - historically around 30 to 40 percent. Prevention of the common precipitants - early sepsis recognition and aspiration prevention bundles - has the highest impact on outcomes."
        }
      ]
    },
    {
      "id": "chest-tubes",
      "minutes": "41-49",
      "title": "Chest Tubes - Drainage, Tidaling, and Emergencies",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Chest tubes are the most common bedside procedure on a thoracic or trauma unit. The indications are pneumothorax (air in the pleural space), hemothorax (blood), pleural effusion (fluid), empyema (infected pleural fluid), and post-thoracic surgery drainage."
        },
        {
          "kind": "h",
          "text": "The three-chamber drainage system"
        },
        {
          "kind": "p",
          "text": "Chamber one is the collection chamber, closest to the patient - drained fluid collects here, and its volume, color, and character are measured and documented. Chamber two is the water-seal chamber, in the middle - it contains water that creates a one-way valve so air can escape from the pleural space out through the water but cannot get back in. This is the safety chamber; without it, every inhalation would suck air into the pleural space and enlarge a pneumothorax. Chamber three is the suction control chamber, furthest from the patient - it determines the level of suction applied, either by a water column (the height of water sets the suction) or by a dry suction regulator, and it connects to wall suction."
        },
        {
          "kind": "h",
          "text": "Tidaling"
        },
        {
          "kind": "p",
          "text": "Tidaling is the fluctuation of the water level in the water-seal chamber with respiration. In a spontaneously breathing patient the water rises with inspiration - negative intrathoracic pressure pulls fluid up the tube - and falls with expiration; in a mechanically ventilated patient on positive pressure the pattern is reversed. Tidaling is NORMAL and indicates the system is functioning - the chest tube is connected to the pleural space and responding to pressure changes."
        },
        {
          "kind": "p",
          "text": "Absent tidaling means one of two things. Either the lung has fully re-expanded - good news, and the tube may be ready to remove. Or the tubing is obstructed - kinked, clamped, or clotted - which is a bad news, immediate problem. Assess the tubing, milk it if policy permits, and investigate the cause."
        },
        {
          "kind": "h",
          "text": "Bubbling"
        },
        {
          "kind": "p",
          "text": "First look at the water-seal chamber. Intermittent bubbling during expiration in a pneumothorax patient is NORMAL - air is being evacuated through the water seal. Continuous bubbling - bubbling that does not stop - means an air leak, either in the system or in the patient. To localize it, briefly clamp the tube near the patient: if the bubbling stops, the leak is between the clamp and the patient (somewhere in the patient or at the insertion site); if the bubbling continues, the leak is between the clamp and the drainage system (somewhere in the tubing)."
        },
        {
          "kind": "p",
          "text": "Then look at the suction control chamber. Gentle continuous bubbling is normal - that is the suction working at the set level. Vigorous bubbling means the suction is too high; turn it down. No bubbling means the suction is not connected or is set too low."
        },
        {
          "kind": "h",
          "text": "Drainage and subcutaneous emphysema"
        },
        {
          "kind": "p",
          "text": "Assess drainage by color (sanguineous, serosanguineous, serous, purulent), amount, and character, and document it hourly initially. After thoracic surgery, drainage greater than 100 milliliters per hour is reported to the surgeon because it suggests ongoing bleeding. Subcutaneous emphysema is air tracking into the soft tissues - crepitus on palpation around the insertion site, sometimes extending into the neck or face. Mark the borders with a marker and reassess to monitor progression; significant or rapidly progressing emphysema requires immediate provider notification."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Emergency 1 - disconnection from the drainage system",
          "text": "If the tubing comes apart from the collection chamber, place the open end of the chest tube tubing into a container of sterile water or saline to create an emergency water seal until the system can be reconnected. Do NOT clamp the chest tube - clamping creates a closed system and can cause a tension pneumothorax if there is an ongoing air leak from the patient."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Emergency 2 - tube dislodged from the patient",
          "text": "If the tube comes out of the chest, immediately cover the insertion site with a sterile occlusive dressing taped on THREE sides only. The unfastened fourth side functions as a one-way valve - air escapes during expiration but cannot enter during inspiration. Taping all four sides creates a sealed pocket where every breath raises pressure: the lung collapses, the mediastinum shifts, and cardiovascular collapse follows. Three sides only. Then call the provider. Memorize this."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Two standing rules",
          "text": "Never clamp a chest tube except as specifically ordered or briefly during transport - routine clamping is dangerous. Keep the drainage system below the level of the chest at all times; elevation above the chest causes retrograde flow back into the pleural space."
        }
      ],
      "practiceItemId": "pi_chest_tube_dislodged"
    },
    {
      "id": "ventilator-tracheostomy",
      "minutes": "49-54",
      "title": "Ventilator Basics and Tracheostomy",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "On ventilator modes you need to recognize the names and general purposes - this is not a respiratory therapist's lecture. Assist Control (AC): every breath, whether the patient initiates it or the machine delivers it, delivers the full preset tidal volume; common in acutely ill, fully supported patients. SIMV (Synchronized Intermittent Mandatory Ventilation): preset mandatory breaths plus the patient's own spontaneous breaths between them, allowing the patient to breathe above the minimum rate."
        },
        {
          "kind": "p",
          "text": "Pressure Support (PS): a pressure boost applied to patient-initiated breaths only, with the patient setting the rate and depth - used during weaning. CPAP (Continuous Positive Airway Pressure): the patient breathes spontaneously while the ventilator provides a constant low pressure to splint open airways - used for sleep apnea, mild support, and weaning. BiPAP (Bilevel Positive Airway Pressure): two different pressures, higher inspiratory and lower expiratory - used non-invasively for acute COPD exacerbations and pulmonary edema."
        },
        {
          "kind": "p",
          "text": "Know these settings by name: FiO2 (fraction of inspired oxygen, 21 to 100 percent), PEEP (positive end-expiratory pressure, which keeps alveoli open), respiratory rate, tidal volume, and mode."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Ventilator alarms - assess the patient first",
          "text": "When an alarm sounds, the FIRST action is ALWAYS to assess the patient - not silence the alarm, not call respiratory therapy. Look at the patient, then troubleshoot."
        },
        {
          "kind": "h",
          "text": "High- versus low-pressure alarms"
        },
        {
          "kind": "p",
          "text": "A high-pressure alarm means the ventilator cannot deliver the set tidal volume without exceeding the high-pressure limit. Causes include secretions obstructing the airway (suction), the patient biting the tube (bite block, sedation), a mucus plug, kinked tubing, bronchospasm, and sudden pneumothorax - assess for unilaterally absent breath sounds and tracheal deviation. A low-pressure alarm means pressure is dropping below the threshold. Causes include disconnection somewhere in the circuit (most common - check the connections), an endotracheal tube cuff leak, displacement of the endotracheal tube so it is no longer in the trachea (tip in the esophagus, or pulled out entirely), and a large air leak in the tubing."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "VAP prevention bundle - testable, five components",
          "text": "1) Head of bed elevated to 30-45 degrees. 2) Oral care with chlorhexidine. 3) Daily sedation interruption (a sedation vacation) paired with assessment of extubation readiness. 4) Peptic ulcer prophylaxis. 5) DVT prophylaxis. Subglottic suctioning is added when available."
        },
        {
          "kind": "h",
          "text": "Suctioning principles"
        },
        {
          "kind": "p",
          "text": "Hyperoxygenate the patient before and after suctioning. Suction for no more than 10 to 15 seconds at a time. Apply suction only on withdrawal of the catheter, never on insertion. Monitor heart rate and oxygen saturation throughout, because suctioning can cause vagal bradycardia and hypoxia."
        },
        {
          "kind": "h",
          "text": "Tracheostomy care"
        },
        {
          "kind": "p",
          "text": "The inner cannula is cleaned or replaced per facility policy, and the stoma is cleaned with normal saline. Always keep two extra trach tubes at the bedside - one of the same size as the current tube and one a size smaller - because if the trach falls out you may need the smaller tube to reinsert before the stoma narrows."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Accidental decannulation in a fresh trach",
          "text": "If a trach less than 7 days old (before the tract is mature) is dislodged, it is an emergency. Hold the stoma open with a hemostat, insert the obturator that came with the tracheostomy kit if available, and call a rapid response. Do NOT attempt to reinsert the trach tube unless you are specifically trained and the tract is mature - you can create a false passage and the patient can lose the airway."
        },
        {
          "kind": "p",
          "text": "A tracheostomy bypasses the upper airway's natural humidification, so supplemental humidified oxygen or a heat-moisture exchanger (an 'artificial nose') prevents drying and mucus plugging. Communication options include writing, picture boards, electronic devices, and speaking valves such as the Passy-Muir, used with the cuff deflated to allow phonation in selected patients. For eating, speech-language pathology evaluates swallowing; modified textures may be required, and chin-tuck and other swallowing strategies may help, because aspiration risk is elevated - many trach patients have a swallow study before initiating oral intake."
        }
      ]
    },
    {
      "id": "synthesis-tb-healthcare-worker",
      "minutes": "54-58",
      "title": "Synthesis - TB Exposure in a Healthcare Worker",
      "format": "Case",
      "blocks": [
        {
          "kind": "p",
          "text": "A 28-year-old nurse trained in Manila is being onboarded at a US hospital. Her pre-employment Mantoux at 48 hours shows 14 mm of induration. She received BCG vaccination as an infant. She reports no symptoms and no known TB contacts. Her chest X-ray is read as normal, and her IGRA is positive. The provider recommends INH 300 mg PO daily plus pyridoxine 25 mg PO daily for 9 months. The nurse asks the bootcamp instructor: 'Why am I getting B6? And can I still work with patients?' Walk through your reasoning."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "The reasoning",
          "text": "The PPD at 14 mm is positive for a healthcare worker from a high-prevalence country (10 mm cutoff). The positive IGRA confirms infection - it is not confounded by BCG. A normal CXR plus no symptoms means this is latent TB infection, not active disease. Latent TB is not infectious, so the nurse CAN work with patients while being treated. Pyridoxine (vitamin B6) is given with INH to prevent the peripheral neuropathy caused by INH's B6-antagonist effect - standard practice. The course of INH 300 mg daily plus B6 25 to 50 mg daily for 6 to 9 months completes the prevention of progression to active disease. The nurse should monitor for hepatitis symptoms - nausea, anorexia, RUQ pain, jaundice - have LFTs checked periodically, and avoid alcohol during treatment."
        },
        {
          "kind": "p",
          "text": "This synthesis case is the most common real-world TB scenario for IEN nurses. Many of you will encounter this exact situation in your first year of US employment, so understanding it cold is professional self-protection as well as exam preparation."
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
          "text": "Homework before Hour 9 is fifty respiratory-focused questions, with deliberate emphasis on TB management and chest tube troubleshooting - both are exam-reliable and clinically high-stakes. For every wrong answer in your journal, note specifically which segment you missed."
        },
        {
          "kind": "p",
          "text": "Hour 9 is endocrine clinical content: DKA versus HHS, thyroid storm versus myxedema, adrenal insufficiency and Cushing, and SIADH versus DI. The drugs from Hour 4 - insulin, oral hypoglycemics, levothyroxine, and antithyroid agents - meet their clinical contexts there. See you Hour 9."
        }
      ]
    }
  ]
};
