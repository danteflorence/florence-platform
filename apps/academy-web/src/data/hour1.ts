import type { Lesson } from "./lessonTypes";

/**
 * Section 1 - Orientation. Auto-generated from the Florence Academy
 * bootcamp instructor script (expanded draft). Pending nurse-educator review.
 */
export const lesson: Lesson = {
  "meta": {
    "number": 1,
    "title": "Orientation",
    "durationMin": 60,
    "audience": "Internationally educated nurses - Philippines, UK, Kenya, Ghana",
    "contentWeight": "Foundation hour - frames the whole 20-hour bootcamp; scope-of-practice and delegation alone appear in roughly 1 in 8 NCLEX questions",
    "tagline": "We don't re-teach you nursing - we translate what you already know into the language the NCLEX speaks."
  },
  "objectives": [
    "Explain in plain language how Computerized Adaptive Testing (CAT) selects questions and determines pass/fail.",
    "Identify the seven Next Generation NCLEX (NGN) item types and describe what each looks like on screen.",
    "Recite the six steps of the NCSBN Clinical Judgment Measurement Model (CJMM) and connect each step to a clinical action.",
    "Describe the minimum number of questions, maximum number of questions, and time limit for the current NCLEX-RN exam.",
    "Articulate the top reasons IENs from their region of origin typically fail on the first attempt - and what this bootcamp does about each one.",
    "Commit to a daily study load of 50 practice questions plus rationale review between sessions."
  ],
  "timing": [
    {
      "minutes": "0-5",
      "segment": "Welcome, instructor introduction, ground rules",
      "format": "Lecture"
    },
    {
      "minutes": "5-12",
      "segment": "Why IENs from PH/UK/KE/GH struggle on the NCLEX",
      "format": "Lecture"
    },
    {
      "minutes": "12-25",
      "segment": "How CAT works - the engine under the hood",
      "format": "Lecture"
    },
    {
      "minutes": "25-42",
      "segment": "Next Gen NCLEX: the seven item types",
      "format": "Lecture"
    },
    {
      "minutes": "42-52",
      "segment": "Clinical Judgment Measurement Model (six steps)",
      "format": "Lecture"
    },
    {
      "minutes": "52-58",
      "segment": "Study plan, daily expectations, the 90% pass commitment",
      "format": "Lecture"
    },
    {
      "minutes": "58-60",
      "segment": "Q&A and close",
      "format": "Lecture"
    }
  ],
  "practiceItems": {
    "pi_test_feels_hard": {
      "id": "pi_test_feels_hard",
      "stem": "A candidate finishes the NCLEX-RN and tells you the questions felt extremely difficult the entire way through. Based on how Computerized Adaptive Testing works, what is the most accurate interpretation of that experience?",
      "options": [
        {
          "key": "A",
          "text": "The difficulty means the candidate was almost certainly placed below the pass standard."
        },
        {
          "key": "B",
          "text": "A hard-feeling test is expected and often a good sign - the algorithm gives hard questions once it has established the candidate can answer easier ones near their ability ceiling."
        },
        {
          "key": "C",
          "text": "The candidate must have answered the early questions incorrectly, which forced the test to stay difficult."
        },
        {
          "key": "D",
          "text": "Difficulty has no relationship to the algorithm and simply reflects bad luck with the question pool."
        }
      ],
      "answer": "B",
      "rationale": "The algorithm only serves hard questions once it has established that the candidate can answer the easier ones, so it is testing near the top of the ability range. A test that feels easy throughout is actually the worry sign, because it can mean the algorithm has placed the candidate below the pass line and is confirming they cannot handle harder material. Option A inverts the truth; C misdescribes how the adaptive engine responds to early answers; D denies the direct link between perceived difficulty and the algorithm pushing toward the candidate's ceiling.",
      "cjmm": "evaluate-outcomes",
      "reference": "Section 1 · How CAT Works"
    },
    "pi_test_length_outcome": {
      "id": "pi_test_length_outcome",
      "stem": "A learner messages you in a panic because the exam shut off at 85 questions, and she is convinced this means she failed. What is the best response about what test length tells you?",
      "options": [
        {
          "key": "A",
          "text": "A short test always means a pass, because only strong candidates trigger the early stop."
        },
        {
          "key": "B",
          "text": "A short test always means a fail, because the algorithm gives up on weak candidates quickly."
        },
        {
          "key": "C",
          "text": "Length does not predict the outcome - shutting off at the minimum simply means the algorithm reached 95% confidence, which can be confidence that she is above OR below the pass line."
        },
        {
          "key": "D",
          "text": "A 150-question test guarantees a pass because the candidate got more chances to score points."
        }
      ],
      "answer": "C",
      "rationale": "The test ends at the minimum when the algorithm is 95% confident, and that confidence works in both directions - it could be a fast pass or a fast fail. A 150-question test means the algorithm could not reach 95% confidence, so the candidate's ability is wobbling right around the pass line; it is not a guaranteed pass. Options A and B each assume length predicts a single direction, and D misreads a long test as a positive. The honest answer is that you cannot read the runes of question count - wait for the official result.",
      "cjmm": "evaluate-outcomes",
      "reference": "Section 1 · How CAT Works"
    },
    "pi_no_passing_percentage": {
      "id": "pi_no_passing_percentage",
      "stem": "While reviewing practice questions, a candidate is alarmed that he is scoring only about 55% correct and assumes this is a failing performance. Which statement best reflects how the NCLEX pass standard works?",
      "options": [
        {
          "key": "A",
          "text": "He must reach at least 70% correct, because that is the fixed NCLEX passing percentage."
        },
        {
          "key": "B",
          "text": "There is no passing percentage; what matters is demonstrating ability above the NCSBN pass standard, and most who pass get roughly 45-60% of questions correct because the algorithm keeps pushing them toward questions they will get right only about half the time."
        },
        {
          "key": "C",
          "text": "Any score under 80% indicates he is not ready and should stop testing."
        },
        {
          "key": "D",
          "text": "Percentage correct is the only thing the algorithm measures, so 55% is a clear fail."
        }
      ],
      "answer": "B",
      "rationale": "The NCLEX has no percentage threshold - the candidate must demonstrate ability above the NCSBN pass standard, which is an ability level, not a score. Because the algorithm constantly steers toward questions a candidate will answer correctly only about half the time, most candidates who pass land somewhere between 45 and 60 percent correct; that is the point where the algorithm can most efficiently estimate ability. Options A and C invent fixed percentage cutoffs that do not exist, and D wrongly treats raw percentage as the deciding metric, so a 55% practice score is potentially a passing performance depending on question difficulty.",
      "cjmm": "evaluate-outcomes",
      "reference": "Section 1 · How CAT Works"
    },
    "pi_recognize_cues_highlight": {
      "id": "pi_recognize_cues_highlight",
      "stem": "A nurse reviews a client's chart showing: temperature 38.9°C, heart rate 138, oxygen saturation 86% on room air, blood pressure 96/58, and a client statement of 'I feel like something is wrong.' An NGN highlight item asks the nurse to click the findings that require immediate follow-up. Which step of the Clinical Judgment Measurement Model is this item primarily testing?",
      "options": [
        {
          "key": "A",
          "text": "Recognize Cues"
        },
        {
          "key": "B",
          "text": "Generate Solutions"
        },
        {
          "key": "C",
          "text": "Take Action"
        },
        {
          "key": "D",
          "text": "Evaluate Outcomes"
        }
      ],
      "answer": "A",
      "rationale": "Highlight (Enhanced Hot Spot) items map directly to Recognize Cues - the first CJMM step - because they ask the nurse to filter the signal from the noise and identify which findings actually matter, such as the heart rate of 138 and the oxygen saturation of 86%. Generate Solutions is about brainstorming the full range of actions; Take Action is choosing and sequencing interventions; Evaluate Outcomes is judging whether an intervention worked, which is tested by trend items. None of those match the 'which findings are concerning' task, so Recognize Cues is correct.",
      "cjmm": "recognize-cues",
      "reference": "Section 1 · Clinical Judgment Measurement Model"
    },
    "pi_bowtie_weight": {
      "id": "pi_bowtie_weight",
      "stem": "An IEN preparing for the NGN exam asks which single item type deserves the most preparation because it carries the heaviest weight per question and integrates the most clinical-judgment steps. Which item type should you point to?",
      "options": [
        {
          "key": "A",
          "text": "Cloze (Drop Down)"
        },
        {
          "key": "B",
          "text": "Extended Drag and Drop"
        },
        {
          "key": "C",
          "text": "Bowtie"
        },
        {
          "key": "D",
          "text": "Trend"
        }
      ],
      "answer": "C",
      "rationale": "The Bowtie is the most heavily weighted NGN item type per question, and every NGN case study contains exactly one. Its structure - a center box for the priority condition, two 'Actions to Take' boxes on the left, and two 'Parameters to Monitor' boxes on the right - packs three CJMM steps (Prioritize Hypotheses, Take Action, and the monitoring side of Evaluate Outcomes) into a single item. Cloze and Extended Drag and Drop are scored per blank or per placement but are not the heaviest-weighted, and Trend maps mainly to Evaluate Outcomes alone, so the Bowtie is the one to prepare for most.",
      "cjmm": "prioritize-hypotheses",
      "reference": "Section 1 · Next Gen NCLEX Item Types"
    },
    "pi_pharm_generic_names": {
      "id": "pi_pharm_generic_names",
      "stem": "On the NCLEX, an IEN sees the drug name 'metoprolol' in a question stem. Reflecting the US pharmacology conventions the exam uses, what does the candidate most need to do to answer correctly?",
      "options": [
        {
          "key": "A",
          "text": "Recognize metoprolol as a beta blocker, because the NCLEX uses generic names rather than brand names."
        },
        {
          "key": "B",
          "text": "Convert the brand name to its generic equivalent before reasoning about it."
        },
        {
          "key": "C",
          "text": "Interpret any lab values in the question in millimoles per liter, the standard the NCLEX uses."
        },
        {
          "key": "D",
          "text": "Wait for the question to provide the drug class, since the NCLEX never expects recall of drug classes."
        }
      ],
      "answer": "A",
      "rationale": "The NCLEX uses generic drug names, not brand names, so the candidate must recognize metoprolol as a beta blocker (just as enoxaparin must be recognized as a low molecular weight heparin) without being told the class. Option B reverses the actual convention - the stem already gives the generic name. Option C is wrong because US lab values are in US units (for example, glucose and creatinine in milligrams per deciliter, not millimoles or micromoles per liter), which is exactly the conversion trap IENs must overcome. Option D is incorrect because recognizing the class from the generic name is precisely the skill being tested.",
      "cjmm": "analyze-cues",
      "reference": "Section 1 · Why IENs Struggle"
    }
  },
  "segments": [
    {
      "id": "welcome-ground-rules",
      "minutes": "0-5",
      "title": "Welcome & Ground Rules",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Good morning, good afternoon, good evening - depending on where in the world you're joining from. Welcome to the NCLEX-RN bootcamp. Over the next 20 hours together I am going to do something very specific with you: I am not going to re-teach you nursing. You already know nursing. Some of you have been practicing for five, ten, even fifteen years. What I am going to do is translate what you already know into the language the NCLEX speaks - because that, more than anything else, is what stands between you and your US license."
        },
        {
          "kind": "p",
          "text": "We open with a quick poll: type the country where you completed your nursing training - just the country. Philippines, UK, Kenya, Ghana, somewhere else, whatever it is. This single data point gets referenced throughout the bootcamp, so it matters that you answer it. In a typical cohort the chat fills with Manila, Cebu, Nairobi, Accra, Kumasi, Leeds, Lagos - a genuinely international room."
        },
        {
          "kind": "p",
          "text": "Notice something right away: every one of you trained in a healthcare system that produces excellent nurses. The NHS, the Philippine General Hospital, Korle Bu, Kenyatta National - these are serious teaching hospitals. You did not come to the United States because your training was inadequate. You came because the opportunity is here. The only thing standing between you and that opportunity is a test - a test we are going to dismantle, together, over 20 hours."
        },
        {
          "kind": "h",
          "text": "Three ground rules"
        },
        {
          "kind": "list",
          "items": [
            "Questions go in the chat any time - you don't have to wait. If something doesn't land, drop it in chat and the instructor or co-facilitator will respond.",
            "Cameras are encouraged but not required. Some of you are watching on a phone in a break room; whatever works.",
            "Every session is recorded and posted to your portal within 24 hours. If you miss a section because your toddler needed something or your shift ran late, you have not missed the bootcamp - you've just delayed it by a day."
          ]
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Take the 75-question diagnostic",
          "text": "Make sure you've completed the 75-question diagnostic sent last week - your results are already in your portal. The instructor references your diagnostic throughout the bootcamp, so if you haven't taken it, do it within 48 hours. It is the single most important data point we have about you."
        }
      ]
    },
    {
      "id": "why-iens-struggle",
      "minutes": "5-12",
      "title": "Why IENs Struggle",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Start with a number worth memorizing. The first-time NCLEX-RN pass rate for US-educated candidates is consistently in the high 80s - roughly 88 percent in recent years. The first-time pass rate for internationally educated candidates is roughly 43 to 47 percent, depending on the year and the source. That is a forty-plus percentage point gap. We name it plainly, because pretending it doesn't exist does you no favors."
        },
        {
          "kind": "p",
          "text": "Here is the crucial reframe: the gap is not because you don't know nursing. It is not a knowledge gap. In years of teaching IENs, the consistent finding is that internationally educated nurses have MORE bedside experience than US new graduates. Many of you have run wards, managed twenty patients on a shift with two healthcare assistants, intubated, defibrillated, and delivered babies in corridors. The knowledge is there. So the gap is something else - and it comes down to four things you should write down."
        },
        {
          "kind": "h",
          "text": "Reason 1 - Scope of practice and delegation"
        },
        {
          "kind": "p",
          "text": "In the United States there is a strict, legally defined hierarchy: the Registered Nurse, the Licensed Practical Nurse (LPN, also called LVN in some states), and the Unlicensed Assistive Personnel (UAP). Each role has a list of tasks it can and cannot legally perform - the RN cannot delegate certain tasks to the LPN, and the LPN cannot delegate certain tasks to the UAP. The NCLEX tests this hierarchy in roughly one out of every eight questions."
        },
        {
          "kind": "p",
          "text": "The difficulty for IENs is that this legal framework may be one you've never operated inside. In the Philippines you have nursing attendants and midwives, but the legal scope is different. In the UK you have Healthcare Assistants and Nursing Associates, and the scope rules are NMC rules, which differ from US state board rules. In Kenya and Ghana you may have practiced where the RN does almost everything because staffing demanded it. So when the NCLEX asks 'which task can the RN delegate to the UAP,' you're being asked to apply a legal framework that may be entirely new. We fix this in Hour 16."
        },
        {
          "kind": "h",
          "text": "Reason 2 - Therapeutic communication"
        },
        {
          "kind": "p",
          "text": "Every NCLEX has roughly five to fifteen questions on therapeutic communication - what to say to a patient who is anxious, angry, grieving, suicidal, or in denial. The 'correct' answers reflect a very specific American therapeutic style: it is direct, it validates feelings before redirecting, it uses open-ended questions, and it does not minimize, reassure prematurely, or give advice."
        },
        {
          "kind": "p",
          "text": "In many cultures - including Filipino, the reserved British style, and many African cultures - the polite, professional thing to say to a worried patient is something like 'don't worry, you're going to be fine, the doctors here are very good.' On the NCLEX that answer is wrong, every time. This is a learned reflex, and we will retrain it in Hour 14. (UK-trained nurses will recognize that NHS communication is closer to the US style, though more reserved - the point is a spectrum, not a single culture being 'the problem.')"
        },
        {
          "kind": "h",
          "text": "Reason 3 - Pharmacology in US conventions"
        },
        {
          "kind": "p",
          "text": "The NCLEX uses generic drug names, not brand names. When you see 'metoprolol,' you have to recognize it as a beta blocker; when you see 'enoxaparin,' you have to recognize it as a low molecular weight heparin. The lab values are in US units too: glucose in milligrams per deciliter, not millimoles per liter; creatinine in milligrams per deciliter, not micromoles per liter. We fix the unit-conversion problem in Hour 6 and drill US pharmacology in Hours 3, 4, and 5."
        },
        {
          "kind": "h",
          "text": "Reason 4 - The NGN reasoning pattern (CJMM)"
        },
        {
          "kind": "p",
          "text": "The Next Generation NCLEX rewards a specific reasoning pattern called the Clinical Judgment Measurement Model. We spend the back half of this hour on it. Once you see it, you will see it everywhere, and your test scores will jump."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "It's a translation gap, not a competence gap",
          "text": "The forty-point gap is not a verdict on your nursing. It is a translation gap - and translation can be taught. That is exactly what these 20 hours are for: we translate, we don't re-teach."
        }
      ]
    },
    {
      "id": "how-cat-works",
      "minutes": "12-25",
      "title": "How CAT Works",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Now let's open the hood and look at the engine of the NCLEX. The NCLEX is a Computerized Adaptive Test, or CAT, and it works differently from almost any exam you've taken before. It's worth slowing down here, because once you understand how CAT works, a lot of the anxiety around the test starts to dissolve."
        },
        {
          "kind": "h",
          "text": "The ability line and the pass standard"
        },
        {
          "kind": "p",
          "text": "Picture a vertical line. At the bottom is 'cannot answer any nursing questions correctly.' At the top is 'can answer the most difficult nursing question imaginable.' Somewhere in the middle is a horizontal mark - the pass standard. That mark is the minimum ability level the National Council of State Boards of Nursing has decided a safe entry-level nurse must demonstrate. Note that the pass standard is an ability level, not a percentage; it is set by NCSBN and recalibrated periodically, so always confirm the current standard before your exam date."
        },
        {
          "kind": "p",
          "text": "When you sit down, the algorithm places you at a starting point near the middle of that line but slightly above it. From there the algorithm has one job and one job only: to figure out, as quickly and accurately as possible, whether you are above or below that pass line. It is not trying to be fair or nice - it is trying to estimate your ability efficiently."
        },
        {
          "kind": "h",
          "text": "The adaptive dance"
        },
        {
          "kind": "p",
          "text": "It gives you a question at roughly your starting difficulty. Answer correctly, and the algorithm thinks 'this candidate is probably above this level,' so the next question is a little harder. Get that right, and the next is harder still, with your estimated ability climbing the line. Eventually you reach questions you can't answer reliably and you start getting some wrong; each wrong answer nudges the estimate down a little, each right answer nudges it back up. This dance continues and the estimate narrows tighter and tighter around your true ability level."
        },
        {
          "kind": "h",
          "text": "Three ways the test ends"
        },
        {
          "kind": "list",
          "items": [
            "The algorithm reaches 95 percent statistical confidence that you are above the pass line - or 95 percent confident you are below it. This is the most common way the test ends.",
            "You hit the maximum number of questions.",
            "You run out of time."
          ]
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Current parameters (verify with NCSBN before your exam)",
          "text": "Minimum 85 questions, maximum 150 questions, and a five-hour time limit that includes any breaks you take. NGN items are scored within this same count. These can change, so always verify with NCSBN before your exam date."
        },
        {
          "kind": "p",
          "text": "Now here are the three most important things you'll hear this entire hour - write them down. First: if your test feels HARD, that is good. The algorithm only gives you hard questions once it has established you can answer the easier ones. A test that feels easy throughout is actually a worry sign - it could mean the algorithm has placed you below the pass line and is confirming you can't handle harder material. So walking out of Pearson VUE thinking 'that was brutal' is not bad news; it is the algorithm working exactly as designed at the top of your ability range."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Don't read the runes of test length",
          "text": "The length of your test does not predict whether you passed. It shuts off at 85 questions when the algorithm hits 95 percent confidence - and that works in both directions, a fast pass or a fast fail. A 150-question test means the algorithm couldn't reach 95 percent confidence, so your ability is wobbling right around the pass line. Do not try to interpret how many questions you got. Wait for the official result."
        },
        {
          "kind": "p",
          "text": "Third: there is no percentage to pass. You don't need 70 percent, or 80 percent, or any specific percent right. You need to demonstrate ability above the NCSBN pass standard. In practice, most candidates who pass get somewhere between 45 and 60 percent of their questions correct, because the algorithm constantly pushes them toward questions they'll only get right about half the time - that's where it can most efficiently estimate ability. So if you're scoring 55 percent on practice questions, that is not a failing score; in NCLEX-world it is potentially a passing performance, depending on the difficulty of those questions. Don't panic at percentages."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Two questions students always ask",
          "text": "Does the order of questions matter? No - each question is independent; answer it on its own merits. Can I go back to a previous question? No. Once you submit an answer it's locked in. This is one of the hardest psychological adjustments, and we will train for it."
        }
      ],
      "practiceItemId": "pi_test_feels_hard"
    },
    {
      "id": "ngn-item-types",
      "minutes": "25-42",
      "title": "Next Gen NCLEX Item Types",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Let's talk about Next Generation NCLEX, or NGN. NGN is the format the NCLEX moved to in April 2023, and it changed the test more fundamentally than any update in the last twenty years. If anyone back home took the NCLEX before April 2023, the test they took and the test you will take are different exams - so don't borrow their study materials. They are out of date."
        },
        {
          "kind": "p",
          "text": "Why did NCSBN make this change? They ran a study called the Strategic Practice Analysis, looking at new nurses in their first six months on the job and identifying the most common reasons new nurses harmed patients. It was almost never lack of knowledge - new nurses knew the textbook. What they lacked was clinical judgment: they couldn't look at a constellation of symptoms and labs and recognize what was unfolding, they couldn't prioritize, and they couldn't decide what to do first. So NCSBN rewrote the test to measure clinical judgment, not just recall. That is NGN."
        },
        {
          "kind": "p",
          "text": "Practically, NGN means two things. First, you'll see new question formats - seven of them. Second, many of these new questions allow partial credit, so getting one part wrong doesn't lose you the whole question. This is friendlier than the old all-or-nothing rule, but it also means careless mistakes cost you fractions of a point that add up. Think of these seven types as seven different ways the test can ask you to demonstrate clinical judgment."
        },
        {
          "kind": "h",
          "text": "Type 1 - Extended Multiple Response"
        },
        {
          "kind": "p",
          "text": "This looks like a 'select all that apply' question, but with more options - often six, eight, or more. The key difference from the old format is partial credit: each correct selection earns a point, and each incorrect selection may subtract a point depending on the scoring rule applied. So don't randomly check boxes hoping to catch the right answers - be deliberate and only select the options you are confident are correct."
        },
        {
          "kind": "h",
          "text": "Type 2 - Extended Drag and Drop"
        },
        {
          "kind": "p",
          "text": "You see a list of items on one side and categories or zones on the other, and you drag each item into the correct category. For example, drag each sign and symptom into an 'expected' or 'unexpected' column, or drag each medication into the time slot it should be given. Partial credit applies - each correct placement scores."
        },
        {
          "kind": "h",
          "text": "Type 3 - Cloze (Drop Down)"
        },
        {
          "kind": "p",
          "text": "You see a sentence with one or more blanks, and each blank has a dropdown menu; you select the word that completes the sentence correctly. A classic example: 'The nurse should first assess the patient's [BLANK] because this finding is consistent with [BLANK].' Each dropdown is scored independently."
        },
        {
          "kind": "h",
          "text": "Type 4 - Enhanced Hot Spot (Highlight)"
        },
        {
          "kind": "p",
          "text": "You see a chart - a nurse's note, a set of vital signs, a lab panel - and you click on the words or phrases that are relevant, abnormal, or concerning. The question might say 'highlight the findings that require immediate follow-up,' and you click on a heart rate of 138 and an oxygen saturation of 86 percent. This item type maps directly to the first step of clinical judgment, Recognize Cues, and we drill highlight items in every clinical hour."
        },
        {
          "kind": "h",
          "text": "Type 5 - Matrix (Grid)"
        },
        {
          "kind": "p",
          "text": "This is a table where each row is a clinical finding or action and each column is a category - 'indicated,' 'contraindicated,' 'not relevant,' or 'effective,' 'ineffective,' 'no change.' You make a decision for every row. Matrix items can be intimidating because they look like ten questions in one, but each row is scored independently, which means substantial partial credit is available. Don't panic at the matrix."
        },
        {
          "kind": "h",
          "text": "Type 6 - Bowtie"
        },
        {
          "kind": "p",
          "text": "Pay closest attention to the bowtie, because it is the heaviest-weighted NGN item type per question and the one most students have never seen before. It's shaped like a bowtie: in the middle is one box asking you to identify the priority condition or the patient's primary problem; to its left are two 'Actions to Take' boxes; to its right are two 'Parameters to Monitor' boxes. You pick from option banks to fill each box. So the bowtie tests what is wrong with this patient, what you do, and what you watch for - three of the six steps of clinical judgment in one item."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Every case study has exactly one bowtie",
          "text": "The bowtie is the most heavily weighted NGN item type per question, and every NGN case study contains exactly one. Prepare accordingly - middle, left, right: priority problem, actions to take, parameters to monitor."
        },
        {
          "kind": "h",
          "text": "Type 7 - Trend"
        },
        {
          "kind": "p",
          "text": "You see data presented across two, three, or four time points - vitals at 0800, 1000, 1200, and 1400, for example - and you identify what is improving, worsening, or stable. Trend items map to Evaluate Outcomes, the final step of clinical judgment, and they are usually the last item in an unfolding case study."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Polytomous scoring = partial credit",
          "text": "Most NGN items use polytomous scoring, meaning you can earn partial credit. This is a major departure from the older NCLEX 'all or nothing' rule - but it cuts both ways, so careless errors quietly drain fractions of a point."
        },
        {
          "kind": "h",
          "text": "Stand-alone items vs. case studies"
        },
        {
          "kind": "p",
          "text": "You'll see two patterns. Stand-alone items are single questions that look like the seven types above. A case study is six linked items walking through one patient: you read a nurse's note and answer item one (usually Recognize Cues), then more data appears and you answer item two (usually Analyze Cues), and so on through all six items, ending with a trend item that evaluates outcomes. Each case study takes about 12 to 15 minutes, and you'll see roughly three case studies on your exam, embedded among the stand-alone items."
        },
        {
          "kind": "p",
          "text": "Why so much detail? Because the worst thing that can happen on test day is seeing an item type for the first time and freezing. By the time we finish Hour 17 you'll have worked dozens of NGN items - you'll see a bowtie and think 'okay, middle, left, right, I know this dance.' That is the goal."
        }
      ],
      "practiceItemId": "pi_bowtie_weight"
    },
    {
      "id": "cjmm-six-steps",
      "minutes": "42-52",
      "title": "Clinical Judgment Measurement Model",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Now the most powerful tool in this entire bootcamp: the Clinical Judgment Measurement Model, or CJMM. This is the framework NCSBN uses to write every single NGN item. Knowing this framework is, no exaggeration, like being given the test-writers' worksheet. CJMM has six steps - write these down, because you should know them by Hour 2."
        },
        {
          "kind": "h",
          "text": "Step 1 - Recognize Cues"
        },
        {
          "kind": "p",
          "text": "When you walk into a patient room, what information do you notice? The patient is diaphoretic, the heart rate is 138, the oxygen saturation is 87 percent on room air, the patient says 'I feel like something is wrong.' Those are cues. Recognize Cues means filtering the signal from the noise. On the test it's tested by highlight items - 'highlight the findings that require immediate follow-up' - and by matrix items asking you to classify findings as expected or concerning. About 30 percent of NGN items test this step."
        },
        {
          "kind": "h",
          "text": "Step 2 - Analyze Cues"
        },
        {
          "kind": "p",
          "text": "You've recognized the cues - now what do they mean? Diaphoresis, tachycardia, hypoxia, and a sense of impending doom together form a pattern, pointing you toward pulmonary embolism, sepsis, or possibly a cardiac event. Analyze Cues is about building hypotheses from the data. On the test it's tested by matrix items asking which conditions are consistent with the cues, and by drop-downs asking you to complete a sentence like 'the findings are most consistent with [BLANK].'"
        },
        {
          "kind": "h",
          "text": "Step 3 - Prioritize Hypotheses"
        },
        {
          "kind": "p",
          "text": "You have three possible hypotheses - PE, sepsis, MI. Which is most urgent? Which is most likely? Prioritize Hypotheses is the step where you decide what to address first. On the test it's tested by bowtie center boxes - 'the patient's priority problem is...' - and by drag-and-drop items asking you to rank possibilities."
        },
        {
          "kind": "h",
          "text": "Step 4 - Generate Solutions"
        },
        {
          "kind": "p",
          "text": "For the priority problem, what are all the reasonable nursing actions? Oxygen, IV access, notify the provider, anticoagulation, prepare for CT, position upright. Generate Solutions means brainstorming the full range. On the test it's rarely tested as a step by itself, but it shows up inside bowtie left-side boxes and in extended multiple response items."
        },
        {
          "kind": "h",
          "text": "Step 5 - Take Action"
        },
        {
          "kind": "p",
          "text": "From the list of possible solutions, which do you do, and in what order? This is where the priority frameworks we drill in Hour 2 come in - ABCs, Maslow, safety, unstable before stable. On the test, Take Action is tested by ordering items, by bowtie left-side boxes, and by drop-downs like 'the first action by the nurse should be [BLANK].'"
        },
        {
          "kind": "h",
          "text": "Step 6 - Evaluate Outcomes"
        },
        {
          "kind": "p",
          "text": "You took the action - did it work? You gave oxygen, is the saturation rising? You gave fluids, is the blood pressure improving? Evaluate Outcomes is the step that closes the loop. On the test it's tested by trend items and by matrix items asking 'was the intervention effective, ineffective, or no change.'"
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "The six steps, in order",
          "text": "Recognize Cues → Analyze Cues → Prioritize Hypotheses → Generate Solutions → Take Action → Evaluate Outcomes. Two factors modify every step: environmental factors (resources, time, staffing) and individual factors (the nurse's experience, the patient's specific characteristics). We come back to those modifiers in Hour 17."
        },
        {
          "kind": "p",
          "text": "Here is the practical translation. Every time you see a Next Gen item on practice questions, ask yourself: which step of CJMM is this testing? Once you know the step, you know which kind of thinking the question wants. A highlight item wants pattern recognition. A bowtie wants prioritization and action. A trend wants outcome evaluation. Knowing the step tells you what mental gear to shift into - and we drill exactly this in every clinical hour."
        }
      ],
      "practiceItemId": "pi_recognize_cues_highlight"
    },
    {
      "id": "study-plan-90-commitment",
      "minutes": "52-58",
      "title": "Study Plan & the 90% Commitment",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Let's close with the hardest conversation of the hour, because this bootcamp is not in the business of selling you false confidence - it is in the business of getting you licensed. So here is what it takes, plainly. This bootcamp is 20 hours of instruction, and on its own, 20 hours of instruction will not get a 90 percent pass rate. Anyone who tells you otherwise is selling you something. What gets a 90 percent pass rate is the bootcamp plus three other things, and you should commit to all four right now."
        },
        {
          "kind": "h",
          "text": "Element 1 - The 20 hours of bootcamp"
        },
        {
          "kind": "p",
          "text": "Show up to every session. If you have to miss one for a shift, watch the recording within 24 hours. Do not let two sessions go by unwatched, because each hour builds on the last."
        },
        {
          "kind": "h",
          "text": "Element 2 - 1,500 practice questions, minimum"
        },
        {
          "kind": "p",
          "text": "Do at least 1,500 practice questions before your test date - this is the single biggest predictor of success. Students who pass on the first attempt have done somewhere between 1,500 and 3,000 practice questions; students who fail have almost always done fewer than 1,000. There is no shortcut. You can use UWorld, Kaplan, Archer, or the bank that comes with this bootcamp, but you must do the questions - fifty per day, every day, between sessions."
        },
        {
          "kind": "h",
          "text": "Element 3 - Read every rationale"
        },
        {
          "kind": "p",
          "text": "Read every rationale, including for the questions you answered correctly. The test rotates: the exact question you got right today will appear as a slightly different question tomorrow, and the rationale tells you the underlying concept that lets you answer both. If you only read rationales for the wrong ones, you train yourself to fix mistakes - good - but you don't train yourself to deepen the right answers, which is what passing requires."
        },
        {
          "kind": "h",
          "text": "Element 4 - The question journal"
        },
        {
          "kind": "p",
          "text": "Keep one notebook, one page per wrong question. At the top of the page: the topic. Below that: what you answered. Below that: what the right answer was. Below that: the rationale, in your own words. Below that: the cue or the concept you missed. Every week you re-read the journal. By exam day the journal is your single most personalized study tool - no one else has your journal. It is the map of your gaps."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "The protocol",
          "text": "Bootcamp + 1,500 questions + every rationale + the journal. Do all four and your probability of passing on the first attempt is north of 90 percent. Skip any one of them and the probability drops. What actually produces 90% is instruction + 1,500 practice questions + one full readiness assessment + targeted remediation 7-10 days before exam date."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Make the commitment real",
          "text": "In the chat, type - and actually type it, don't just think it - 'I commit to 50 questions per day until exam day.' If you mean it, type it. The ones who type it are the ones who pass, and these commitments get referenced later in the bootcamp for learners who fall off pace."
        }
      ]
    },
    {
      "id": "qa-and-close",
      "minutes": "58-60",
      "title": "Q&A and Close",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "We take three rapid questions from the chat. Anything beyond that goes to the discussion channel, where the instructor or co-facilitator responds within four hours. Keep each answer brief so we close on time."
        },
        {
          "kind": "h",
          "text": "Before Hour 2 - your homework"
        },
        {
          "kind": "list",
          "items": [
            "If you have not done the 75-question diagnostic, do it tonight.",
            "Complete the 50-question 'fundamentals review' set in your portal.",
            "Download the NGN Item Type Cheat Sheet, print it, and put it next to your study spot.",
            "Before Hour 3, complete the 50-question pharmacology set."
          ]
        },
        {
          "kind": "p",
          "text": "Hour 2 is test-taking strategy. We drill the priority frameworks - ABCs, Maslow, safety, unstable before stable - and we look at the specific question patterns where IENs from your countries consistently lose points, then give you the eliminations and heuristics to fix them. Bring your diagnostic results to Hour 2; we are going to use them. Thank you for being here - see you in Hour 2."
        }
      ]
    }
  ]
};
