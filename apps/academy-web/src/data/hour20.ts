import type { Lesson } from "./lessonTypes";

/**
 * Section 20 - Exam Day. Auto-generated from the Florence Academy
 * bootcamp instructor script (expanded draft). Pending nurse-educator review.
 */
export const lesson: Lesson = {
  "meta": {
    "number": 20,
    "title": "Exam Day",
    "durationMin": 60,
    "audience": "Internationally educated nurses - Philippines, UK, Kenya, Ghana",
    "contentWeight": "Capstone - execution, not content; primary client need is management-of-care",
    "tagline": "The content work is done - this final hour is about bringing 19 hours of preparation into one 5-hour test session and walking in ready."
  },
  "objectives": [
    "Describe the NCLEX CAT (Computer Adaptive Test) format, including the 75-145 question range, the 5-hour time limit, and the adaptive nature of difficulty.",
    "Apply CAT-specific pacing strategy - averaging 1.5-2 minutes per question, no dwelling, and no answer-changing without a strong, specific reason.",
    "Apply at least two anxiety-management techniques (box breathing, progressive muscle relaxation, grounding) during test-day stress.",
    "Execute exam-day logistics: what to bring, when to arrive, what to expect at the testing center, and how breaks work.",
    "Manage post-exam uncertainty - the CAT format produces 'I did poorly' feelings even in passing candidates; result timing and meaning are clarified.",
    "Apply a constructive response framework if the result is a failure - diagnostic report use, minimum wait between attempts, and focused re-preparation."
  ],
  "timing": [
    {
      "minutes": "0-3",
      "segment": "Frame - the final hour of the bootcamp",
      "format": "Lecture"
    },
    {
      "minutes": "3-12",
      "segment": "CAT format explained in detail",
      "format": "Lecture"
    },
    {
      "minutes": "12-22",
      "segment": "Pacing strategy & question approach",
      "format": "Lecture"
    },
    {
      "minutes": "22-32",
      "segment": "Anxiety management techniques",
      "format": "Lecture + practice"
    },
    {
      "minutes": "32-42",
      "segment": "Logistics - night before, morning of, at center",
      "format": "Lecture"
    },
    {
      "minutes": "42-50",
      "segment": "During the test, breaks, common pitfalls",
      "format": "Lecture"
    },
    {
      "minutes": "50-55",
      "segment": "After the test, results, if you fail",
      "format": "Lecture"
    },
    {
      "minutes": "55-60",
      "segment": "Final motivational close",
      "format": "Lecture"
    }
  ],
  "practiceItems": {
    "pi_cat_question_count": {
      "id": "pi_cat_question_count",
      "stem": "A candidate's NCLEX ends after exactly 75 questions. Walking out, the candidate panics, certain this means failure. Based on how Computer Adaptive Testing works, which interpretation is correct?",
      "options": [
        {
          "key": "A",
          "text": "Ending at 75 questions confirms the candidate failed, because the test stops early for low performers."
        },
        {
          "key": "B",
          "text": "Ending at 75 questions confirms the candidate passed, because only strong candidates finish quickly."
        },
        {
          "key": "C",
          "text": "The number of questions does not predict the result - candidates pass and fail at both 75 and 145 questions."
        },
        {
          "key": "D",
          "text": "Ending at 75 questions means the 5-hour time limit was reached before the test could continue."
        }
      ],
      "answer": "C",
      "rationale": "The CAT ends most often when the computer reaches 95% confidence that the candidate is above or below the passing standard - and that certainty can be reached at any point. Some people pass at 75 and some pass at 145; some fail at 75 and some fail at 145. The count is unreliable as a predictor, so A and B are both wrong. D is wrong because reaching 75 questions has nothing to do with the 5-hour clock; the test simply hit a confidence threshold.",
      "cjmm": "analyze-cues",
      "reference": "Section 20 · CAT format"
    },
    "pi_changing_answers": {
      "id": "pi_changing_answers",
      "stem": "Midway through the exam, a candidate has selected an answer and feels a vague urge to change it, but cannot say why the first choice would be wrong. What is the best action?",
      "options": [
        {
          "key": "A",
          "text": "Change the answer, because a second look usually catches mistakes."
        },
        {
          "key": "B",
          "text": "Leave the first answer, because random doubt-driven changes reduce scores."
        },
        {
          "key": "C",
          "text": "Flag the question and plan to return to it at the end of the test."
        },
        {
          "key": "D",
          "text": "Change the answer to a different option entirely to be safe."
        }
      ],
      "answer": "B",
      "rationale": "Research consistently shows the first instinct is usually correct. You should only change an answer when you have identified a SPECIFIC reason the first one is wrong - you misread the stem, you confused two concepts, or a later question revealed the right answer. Vague doubt is not a reason, so A and D are wrong. C is wrong because the NCLEX does not, in most cases, let you return to flagged questions once you submit - flagging here only invites dwelling; commit and move on.",
      "cjmm": "take-actions",
      "reference": "Section 20 · Pacing strategy"
    },
    "pi_panic_recovery": {
      "id": "pi_panic_recovery",
      "stem": "A candidate feels a wave of panic rising during the exam - racing heart, tight chest, unable to focus on the question. Using the script's six-step recovery, what is the FIRST action?",
      "options": [
        {
          "key": "A",
          "text": "Stop - stop reading the question and stop trying to think."
        },
        {
          "key": "B",
          "text": "Pick the most reasonable answer based on principles and move on."
        },
        {
          "key": "C",
          "text": "Immediately leave the room and take an unscheduled break."
        },
        {
          "key": "D",
          "text": "Re-read the current question slowly from the beginning."
        }
      ],
      "answer": "A",
      "rationale": "The six-step recovery is: (1) Stop, (2) box breathing for 4 cycles, (3) drink water, (4) re-read the current question, (5) pick the most reasonable answer based on principles, (6) move on. The first step is to STOP - stop reading and stop trying to force thought - before anything else. B and D are later steps (5 and 4). C describes the escalation only if panic RECURS after the recovery; it is not the first move.",
      "cjmm": "take-actions",
      "reference": "Section 20 · Anxiety management"
    },
    "pi_id_match": {
      "id": "pi_id_match",
      "stem": "The night before the exam, an IEN candidate notices that the name on their passport has a middle name that does not appear on their NCLEX registration. What is the correct understanding of this discrepancy?",
      "options": [
        {
          "key": "A",
          "text": "Minor name discrepancies are ignored as long as the photo matches the candidate."
        },
        {
          "key": "B",
          "text": "Names on the IDs must exactly match the registration; even minor discrepancies can cause cancellation."
        },
        {
          "key": "C",
          "text": "A second form of ID will override any mismatch on the primary government-issued ID."
        },
        {
          "key": "D",
          "text": "The discrepancy only matters for the palm vein scan, not for check-in."
        }
      ],
      "answer": "B",
      "rationale": "Pearson VUE will cancel the appointment if the names on the IDs do not exactly match the NCLEX registration - even minor discrepancies. This must be verified the night before. A and C are wrong because there is no leniency for a matching photo or a secondary ID; the match is on the name. D is wrong because the palm vein scan is biometric identification, not the name check - the name verification happens at photo-ID check-in.",
      "cjmm": "recognize-cues",
      "reference": "Section 20 · Logistics"
    },
    "pi_pvt_results": {
      "id": "pi_pvt_results",
      "stem": "Two days after testing, a candidate is anxious for results and has heard about the 'Pearson VUE Trick' (PVT) - trying to re-register to infer pass/fail from whether the system blocks the registration. How should the candidate be advised?",
      "options": [
        {
          "key": "A",
          "text": "Use the PVT; a 'good pop-up' reliably confirms a pass."
        },
        {
          "key": "B",
          "text": "Use the PVT only if Quick Results are delayed beyond 2 business days."
        },
        {
          "key": "C",
          "text": "Do not rely on the PVT - it is not reliable; use Pearson VUE Quick Results and wait for official results."
        },
        {
          "key": "D",
          "text": "Use the PVT, because it is the only way to get results before 6 weeks."
        }
      ],
      "answer": "C",
      "rationale": "The PVT is not reliable - the system has changed multiple times, and many candidates have gotten 'good pop-up' messages and failed while others got 'bad pop-up' messages and passed. The reliable early option is Pearson VUE Quick Results, available in about 2 business days for a small fee (around $7.95 USD), with official results from the state board typically within 6 weeks. A and B treat the PVT as trustworthy, which it is not. D is wrong because Quick Results - not the PVT - is the legitimate early-result path.",
      "cjmm": "evaluate-outcomes",
      "reference": "Section 20 · After the test"
    }
  },
  "segments": [
    {
      "id": "frame-final-hour",
      "minutes": "0-3",
      "title": "Frame - the final hour of the bootcamp",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Welcome to Hour 20 - the final hour. The content work is done. From here, the only question is execution: how do you take 19 hours of preparation, plus all the years of nursing education and clinical experience that came before, and bring it into a 5-hour test session at the Pearson VUE testing center? This hour is practical and motivational rather than another drill."
        },
        {
          "kind": "p",
          "text": "Before the practical content, it's worth acknowledging something honestly. For many of you, this exam represents far more than a test. It represents the credentialing you've worked toward for months or years, the financial cost of the prep courses and application fees, and - for many internationally educated nurses - distance, with family far away while you work toward US licensure. That weight is real and it deserves acknowledgment."
        },
        {
          "kind": "p",
          "text": "And it also deserves to be set aside for the next 5 hours when you sit at the computer. The exam is just a test. You have prepared. The test does not measure your worth as a nurse or as a person; it measures whether you can pass this specific exam on this specific day. The rest of the hour shows you exactly how to be ready: the CAT format, pacing strategy, anxiety management, logistics for the night before and morning of and at the center, what to do during the test, what to do after, and a final close."
        }
      ]
    },
    {
      "id": "cat-format",
      "minutes": "3-12",
      "title": "CAT format explained in detail",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "The NCLEX uses Computer Adaptive Testing - CAT. This is fundamentally different from a fixed-length exam, and simply understanding how the system works reduces anxiety. The test adapts to your performance in real time: each question is selected based on your answers to the previous ones. When you answer correctly, the next question is slightly harder; when you answer incorrectly, the next is slightly easier. The system is narrowing in on your true competency level."
        },
        {
          "kind": "p",
          "text": "The test gives you between 75 and 145 questions. The maximum time is 5 hours, including breaks. Next Generation NCLEX (NGN) items count toward that total - they are part of the test, not an add-on."
        },
        {
          "kind": "h",
          "text": "How the test ends - three conditions"
        },
        {
          "kind": "p",
          "text": "The test ends when one of three conditions is met. First, the most common: the computer reaches 95 percent confidence that you are above the passing standard, or 95 percent confidence that you are below it - once the system is statistically certain, it stops. Second, the maximum time of 5 hours elapses; if you're still being assessed at the 5-hour mark, the test ends regardless of question count. Third, the maximum of 145 questions is answered; if the system has not reached 95 percent confidence by the 145th question, it ends and uses a different decision rule."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Question count is not your result",
          "text": "Your test could end at 75 questions or at 145 - neither tells you whether you passed. Some people pass at 75 (high performers consistently demonstrating competency); some pass at 145 (borderline performers who eventually demonstrate it). Some fail at 75; some fail at 145. The number of questions does not predict the result, so try to ignore the count entirely while testing."
        },
        {
          "kind": "p",
          "text": "Many candidates fixate on the count. When the test ends at 75 they panic - 'I must have failed.' When it goes to 145 they panic - 'I must be borderline.' Neither reaction is reliable, and both waste mental energy you need for the questions in front of you."
        },
        {
          "kind": "h",
          "text": "Next Generation NCLEX (2023) - item types and scoring"
        },
        {
          "kind": "p",
          "text": "The Next Generation NCLEX, introduced in 2023, integrates NGN items throughout the test. You may see standalone NGN items. You may see unfolding case studies - typically a clinical scenario with about 6 questions that apply the CJMM steps. You may also see standard multiple-choice items. The item types include multiple choice, multiple response (select all that apply), cloze (drop-down), highlight, matrix or grid, drag-and-drop, and bowtie."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Partial credit on NGN items",
          "text": "Many NGN items award PARTIAL CREDIT - unlike older items, which were all-or-nothing. Even if you don't get every part of a multi-part item right, you can still earn partial credit. Don't give up on a multi-part item just because you're uncertain about one piece."
        },
        {
          "kind": "h",
          "text": "Breaks"
        },
        {
          "kind": "p",
          "text": "There are two scheduled breaks: one at approximately 2 hours into the test, and one at approximately 3.5 hours in. Breaks count against your 5-hour total time. You can take additional unscheduled breaks, but the clock keeps running while you're away."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Difficulty is not performance",
          "text": "Because the test adapts, the difficulty you experience reflects the system's calibration, not your pass/fail status. If questions feel impossibly hard, that might mean you're answering correctly and the test is moving up to challenge you. If they feel easy, that might mean you're answering incorrectly and it's moving down - or vice versa. Do NOT try to predict pass/fail from difficulty during the test. Just answer each question to the best of your ability and move on."
        }
      ],
      "practiceItemId": "pi_cat_question_count"
    },
    {
      "id": "pacing-strategy",
      "minutes": "12-22",
      "title": "Pacing strategy & question approach",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "Aim for an average of approximately 1.5 to 2 minutes per question. If you take all 145 questions in about 4.5 hours of test time (5 hours minus breaks), that works out to roughly 1.8 minutes per question. If you take 75 questions across that same 4.5 hours, you'd have about 3.5 minutes per question. The pace varies with how the test unfolds, so treat these as a guide, not a stopwatch on every item."
        },
        {
          "kind": "p",
          "text": "Don't pace too quickly. Some candidates worry about time and rush, then make careless errors - misreading the stem, missing a key word like 'EXCEPT' or 'FIRST', overlooking a critical detail. Read carefully, think clearly, move on. Equally, don't pace too slowly. Some candidates over-deliberate, exhaust their mental energy on early questions, and fade later in the test. In most cases, trust your first read."
        },
        {
          "kind": "h",
          "text": "The five-step question approach"
        },
        {
          "kind": "p",
          "text": "Memorize this approach so it becomes automatic on test day. Step one - read the STEM FIRST and identify what is being asked; the stem is the actual question. When the stem comes after a lot of clinical information, read the stem before the clinical details so you know exactly what you're looking for. Step two - identify the patient's clinical situation: what's going on, what condition, what stage, what acuity? Step three - read the OPTIONS, all of them; don't grab the first reasonable-looking one. Step four - ELIMINATE clearly wrong options; cutting two wrong options moves your odds from 25 percent to 50 percent. Step five - pick the best answer and move on; confirm if confident, and click next."
        },
        {
          "kind": "p",
          "text": "For NGN items, apply CJMM - recall Hour 17. Recognize cues, analyze cues, prioritize hypotheses, generate solutions, take action, evaluate outcomes. The format may be unfamiliar, but the reasoning is exactly the same. Don't panic at unusual formats; the clinical thinking is what's actually being tested."
        },
        {
          "kind": "h",
          "text": "Handling specific NGN formats"
        },
        {
          "kind": "list",
          "items": [
            "Multiple-response ('select all that apply') - evaluate each option independently against the question criterion. Do NOT assume a specific number of correct answers; sometimes it's 1, sometimes 7.",
            "Cloze (drop-down) - read the full sentence first to understand the context, then evaluate each drop-down independently. Each drop-down is essentially its own multiple-choice question.",
            "Matrix/grid - work down the list one item at a time and decide each independently. Do NOT try to balance the distribution; the right answer might place 7 items in one category and 1 in another."
          ]
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Do not change answers without a strong reason",
          "text": "Research consistently shows the first instinct is usually correct. Only change an answer if you've identified a SPECIFIC reason the first one is wrong - you misread the stem, confused two concepts, or a later question made the right answer clear. Random second-guessing reduces scores. If you're just doubting yourself, leave the answer alone."
        },
        {
          "kind": "p",
          "text": "When you genuinely don't know, fall back on PRINCIPLES. Safety first. ABC. The therapeutic-communication validate-plus-invite pattern. The delegation two-filter rule (within scope and stable). Priority frameworks - acute over chronic, unstable over stable, unexpected over expected. The most-conservative-safe answer is often correct."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Flagging on the NCLEX",
          "text": "The NCLEX does not let you go back to flagged questions in most cases - once you submit, you move forward. Don't flag intending to come back. Flag mentally to acknowledge uncertainty, then commit to your answer and move on."
        }
      ],
      "practiceItemId": "pi_changing_answers"
    },
    {
      "id": "anxiety-management",
      "minutes": "22-32",
      "title": "Anxiety management techniques",
      "format": "Lecture + practice",
      "blocks": [
        {
          "kind": "p",
          "text": "Anxiety on test day is normal and expected. In fact, mild anxiety improves performance - you're activated, alert, focused. Severe anxiety degrades performance - you're activated, but too much, and you can't think clearly. The goal is to manage the level, not to eliminate anxiety entirely. Practice these techniques between now and exam day so they're ready when you need them."
        },
        {
          "kind": "h",
          "text": "Technique one - Box breathing (4-4-4-4)"
        },
        {
          "kind": "p",
          "text": "Inhale slowly for 4 counts. Hold for 4 counts. Exhale slowly for 4 counts. Hold empty for 4 counts. Repeat for 4 cycles - total time about 1 minute and 4 seconds. Box breathing slows your heart rate, lowers cortisol, and brings the parasympathetic nervous system online. Use it between questions if anxiety spikes."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Practice it now",
          "text": "Lead one cycle together, slowly: Inhale - 1, 2, 3, 4. Hold - 1, 2, 3, 4. Exhale - 1, 2, 3, 4. Hold empty - 1, 2, 3, 4. Notice how your shoulders dropped. That's the technique - it's that simple. Physical practice now is what makes it accessible during the actual exam."
        },
        {
          "kind": "h",
          "text": "Technique two - Grounding (5-4-3-2-1)"
        },
        {
          "kind": "p",
          "text": "Name 5 things you can SEE. 4 things you can HEAR. 3 things you can FEEL - your hands on the desk, your feet on the floor, the chair against your back. 2 things you can SMELL. 1 thing you can TASTE. Grounding brings your attention to the present moment and breaks rumination cycles. It's especially useful during breaks if you find yourself spiraling about the test."
        },
        {
          "kind": "h",
          "text": "Technique three - Progressive muscle relaxation"
        },
        {
          "kind": "p",
          "text": "Tense and release muscle groups systematically: feet - tense for 5 seconds, then release; then calves, thighs, abdomen, hands, arms, shoulders, and face. Hold each tension for 5 seconds, then release with attention to the relaxation sensation. Total time is about 5 minutes. This works well before the exam - in the parking lot or waiting room - and during breaks."
        },
        {
          "kind": "h",
          "text": "Cognitive techniques"
        },
        {
          "kind": "p",
          "text": "Use MENTAL CUE CARDS - before the exam, re-read your most confident content areas to anchor confidence, and walk in mentally rehearsing what you DO know. REFRAME activation: when your heart races, your hands sweat, your stomach tightens, that's physiologic activation - and the exact same pattern accompanies excitement, performance readiness, and motivation. Reframe it internally: 'I'm not anxious, I'm activated for performance.'"
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Stay in your own lane",
          "text": "Do NOT compare yourself to other test-takers. The person next to you might look calm but be panicking inside, or look panicked but be totally fine. Their appearance tells you nothing about your relative readiness."
        },
        {
          "kind": "h",
          "text": "If you panic during the exam - six-step recovery"
        },
        {
          "kind": "list",
          "items": [
            "STOP - stop reading the question and stop trying to think.",
            "BOX BREATHING - 4 cycles, about one minute.",
            "DRINK WATER - if available at your station or during a break.",
            "RE-READ the current question, slowly, from the beginning.",
            "PICK the most reasonable answer based on principles.",
            "MOVE ON - don't dwell on the panic. The whole recovery should take less than 2 minutes."
          ]
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "If panic recurs",
          "text": "Take an unscheduled break. Step away from the computer, use the restroom, splash cold water on your face, do box breathing, drink water, and return. The clock keeps running, but a 5-minute break to reset can save the next 30 minutes of testing."
        }
      ],
      "practiceItemId": "pi_panic_recovery"
    },
    {
      "id": "logistics",
      "minutes": "32-42",
      "title": "Logistics - night before, morning of, at the center",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "h",
          "text": "Night before"
        },
        {
          "kind": "p",
          "text": "Tonight, do light review only - a maximum of 30 minutes - and do NOT try to learn new content. Review your journal or top-yield reference cards. The point is to remind your brain of patterns it already knows, not to add new information."
        },
        {
          "kind": "p",
          "text": "Prepare your materials. Bring two forms of ID: ONE must be government-issued with a photo - passport, driver's license, or state ID - and the second can be a credit card, work ID, or any secondary form. Print your Pearson VUE confirmation email or have it accessible on your phone (phones are stored during the test, but you'll have access for check-in). Plan your route to the testing center, map the directions, identify parking, and allow extra time for traffic, road closures, and parking. Aim to arrive 30 minutes before your scheduled start time."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Names must match exactly",
          "text": "The names on your IDs must EXACTLY match your NCLEX registration name. Pearson VUE will cancel your appointment if the names don't match - even minor discrepancies. Verify this tonight, not at the door."
        },
        {
          "kind": "p",
          "text": "Eat a normal dinner. No alcohol - even one drink can impair cognitive function the next day. Limit caffeine after lunch, since it affects sleep even when you don't feel wired, and hydrate well but stop heavy drinking about 2 hours before bed to limit nighttime bathroom trips. Lay out your clothes tonight - layered and comfortable, because testing centers may run too cold or too warm and layers give you control. Avoid clothing with metal (some centers have metal detectors at check-in) and avoid jewelry beyond simple items."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Sleep is your best preparation",
          "text": "Target 7 to 8 hours. Do not stay up cramming. The diminishing returns of last-minute review are dramatic, and the cost of sleep deprivation is also dramatic. Sleep is your single most valuable preparation for tomorrow."
        },
        {
          "kind": "h",
          "text": "Morning of"
        },
        {
          "kind": "p",
          "text": "Eat a protein-rich breakfast - eggs, yogurt, oatmeal, whole-grain toast, fruit - and avoid heavy sugars or processed cereals, which cause an energy crash about 2 hours later. Drink water. Light caffeine is fine if it's part of your normal routine, but do not add extra coffee on test day if you don't normally drink it. Do not significantly change your routine; the exam is stressful enough without introducing additional changes. Arrive 30 minutes early and plan for the unexpected - traffic, parking difficulty, a GPS error. It's far better to wait 20 minutes than to arrive 5 minutes late and be denied entry, because Pearson VUE may not seat late candidates."
        },
        {
          "kind": "h",
          "text": "What to bring - and what not to"
        },
        {
          "kind": "list",
          "items": [
            "BRING: two forms of ID; your confirmation email or appointment number; a water bottle (stored in the locker, accessible during breaks); light snacks for breaks such as a protein bar, fruit, or nuts (in the locker); comfortable layered clothing; and glasses if you wear them.",
            "DO NOT BRING: your phone (must be off and in the locker); a smart watch (in the locker); books, notes, or study materials; pens - the center provides erasable note boards; food at your seat (it goes in the locker, accessible during breaks); and anything that suggests cheating."
          ]
        },
        {
          "kind": "h",
          "text": "At the testing center"
        },
        {
          "kind": "p",
          "text": "Check-in begins with photo ID verification - Pearson VUE staff compare your IDs to your registration name, take your photograph, perform a palm vein scan (biometric identification used by Pearson VUE), and ask you to sign your name. Your belongings go in a locker that Pearson VUE provides for your jacket, water, snacks, phone, and personal items; you keep the locker key with you and can access the locker only during scheduled breaks."
        },
        {
          "kind": "p",
          "text": "You'll get a brief tutorial on the testing screen showing you how to select answers, how to use drop-downs, and how to navigate - it typically does not count against your test time and is brief, so use it to familiarize yourself with the interface, especially the NGN item formats. An erasable note board and marker are provided for scratch work, calculations, or jotting reminders during the test. The testing room is quiet, with other candidates testing for various exams (not just NCLEX); white noise is typical, and headphones may be available for additional sound dampening. When you're ready, take a breath - box breathing if needed - and begin."
        }
      ],
      "practiceItemId": "pi_id_match"
    },
    {
      "id": "during-the-test",
      "minutes": "42-50",
      "title": "During the test, breaks, and common pitfalls",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "During the test, pace yourself - do not rush, do not dwell. The 1.5 to 2 minutes per question average is approximate; some questions will go faster and some slower, so trust the average rather than timing each item."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Use your breaks",
          "text": "There are two scheduled breaks - at approximately 2 hours and 3.5 hours into the test. USE THEM. The clock keeps running, but breaks are critical for cognitive performance: a 10-minute break can improve your performance on the next hour of testing more than 10 minutes of additional test time would."
        },
        {
          "kind": "p",
          "text": "During breaks, use the restroom, hydrate in small amounts (not so much that you'll need another break), and eat a light snack of protein and complex carbohydrate - a protein bar, banana, or nuts. Stretch your back and neck, and do box breathing for 4 cycles. Avoid talking with anyone about test content."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Do not check your phone on breaks",
          "text": "Checking work email, social media, or family messages introduces cognitive load and emotional distraction. Whatever is on your phone can wait 3 more hours."
        },
        {
          "kind": "h",
          "text": "Five common pitfalls - memorize these to avoid them"
        },
        {
          "kind": "p",
          "text": "Pitfall one - trying to predict pass/fail from question count or perceived difficulty. The CAT design makes this unreliable. Some candidates finishing at 75 questions panic, assuming they failed; many of those candidates passed. Trust the system, don't waste mental energy on prediction, and just take each question."
        },
        {
          "kind": "p",
          "text": "Pitfall two - changing answers based on doubt rather than insight. Only change an answer if you've identified a SPECIFIC reason your first answer was wrong. Random, doubt-driven changes reduce scores."
        },
        {
          "kind": "p",
          "text": "Pitfall three - dwelling on missed or uncertain questions. Once you've moved on, MOVE ON. Don't ruminate. Each question is independent; the next question doesn't know what happened on the last one, and you shouldn't carry it either."
        },
        {
          "kind": "p",
          "text": "Pitfall four - comparing yourself to others in the testing center. The person next to you, whether taking another exam or even another NCLEX, is not your competition. The NCLEX is criterion-referenced, not norm-referenced - you pass if you meet the standard, regardless of how anyone else performs. Stay in your own lane."
        },
        {
          "kind": "p",
          "text": "Pitfall five - letting one bad question define the test. You will hit questions you don't know; that's expected. The CAT format gives every candidate hard questions - that's the design. One missed question does not determine pass/fail. Keep going."
        }
      ],
      "practiceItemId": "pi_pvt_results"
    },
    {
      "id": "after-the-test",
      "minutes": "50-55",
      "title": "After the test, results, and if you don't pass",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "When the test ends, the system will tell you it's over; the screen may say nothing about pass or fail. You'll receive a brief survey, and then you'll be done."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Feeling uncertain is normal - and not reliable",
          "text": "The CAT format ends at the 95 percent confidence threshold, which means the last questions you saw were genuinely difficult, designed to confirm your level. Many passing candidates feel they did poorly; many failing candidates feel they did okay. The feeling is not a reliable signal - do not try to predict from how you feel."
        },
        {
          "kind": "p",
          "text": "Do NOT try to look up questions or content immediately after - that's rumination, not productivity. Walk out, get fresh air, eat, hydrate, and do something completely unrelated. Plan something post-exam: a meal, a walk, a phone call with family, a favorite show. Distraction is healthy during the waiting period."
        },
        {
          "kind": "h",
          "text": "Getting your results"
        },
        {
          "kind": "p",
          "text": "Unofficial results come through Pearson VUE Quick Results, available in approximately 2 business days for a small fee - around $7.95 USD. They are not official, but they are very reliable, and most candidates use this service for early results. Official results come from your state board of nursing, typically within 6 weeks but often sooner, with a license number issued for passing candidates."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "The PVT is not a predictor",
          "text": "Some candidates try the Pearson VUE Trick - re-registering shortly after testing to see whether the system blocks them (suggesting a pass) or allows them (suggesting a fail). IT IS NOT RELIABLE. The system has changed multiple times; many candidates got 'good pop-up' messages and failed, and many got 'bad pop-up' messages and passed. Do not use it as a predictor - wait for official results."
        },
        {
          "kind": "h",
          "text": "If you pass - and if you don't"
        },
        {
          "kind": "p",
          "text": "If you pass: congratulations. License processing through your state board begins, and the Quick Results count as evidence for many subsequent steps. If you don't pass, this is hard - take a few days to feel what you feel. Then look at your candidate performance report, the CPR from NCSBN, which identifies your weak content areas, and use those for focused re-preparation."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "Failing once is not the end",
          "text": "Re-register through Pearson VUE; there is a minimum 45-day wait between attempts. Many candidates pass on the second or third attempt, particularly with focused re-preparation targeting the gaps the CPR identifies. Failing the first time does NOT mean you cannot succeed - many excellent nurses required multiple attempts."
        }
      ]
    },
    {
      "id": "final-close",
      "minutes": "55-60",
      "title": "Final motivational close",
      "format": "Lecture",
      "blocks": [
        {
          "kind": "p",
          "text": "We are at the end of the bootcamp. Twenty hours of intensive preparation, plus the years of nursing education that preceded it - and, for many of you, the journey of international relocation, the credentialing process, and the English proficiency exams. The path here was long."
        },
        {
          "kind": "p",
          "text": "The bootcamp's purpose was translation. Your clinical knowledge and your experience are valid; many of you are already excellent nurses who have cared for sick patients in settings far more challenging than most US hospitals. The bootcamp's job was to translate that knowledge into the specific framework the US NCLEX exam tests - the American delegation hierarchy, the American therapeutic-communication norms, the specific protocols, the specific lab values, the specific medication doses. You are not less prepared than US-educated nurses. You are differently prepared. And now you have the translation."
        },
        {
          "kind": "callout",
          "tone": "key",
          "title": "Trust your preparation",
          "text": "The work is done. From here, the test is execution. Apply the patterns. Use the frameworks. Trust your first instincts. Move through the questions."
        },
        {
          "kind": "h",
          "text": "Cohort acknowledgments"
        },
        {
          "kind": "list",
          "items": [
            "To the Filipino nurses - your warmth, your work ethic, and your patient-centered care are gifts. The US healthcare system needs you. Your families have invested in this with you, and you honor them by walking in confident on test day.",
            "To the UK-trained nurses - your clinical reasoning, professional discipline, and scientific rigor are foundational. The transition from NHS to US healthcare has nuances, but your nursing skills travel across systems. You are ready.",
            "To the African nurses - Kenyan, Ghanaian, and others - your clinical experience with sepsis, TB, sickle cell, and obstetric emergencies often exceeds what US-trained nurses encounter in years of practice. The exam is the gateway; you have the substance."
          ]
        },
        {
          "kind": "p",
          "text": "To everyone - you walked into Hour 1 twenty hours ago, and you are different now. You have new frameworks, new patterns, new confidence, and a cohort that may have become friends, study partners, and supporters. Take those connections with you. On exam day, when you sit down and the first question appears, take a breath. Remember Hour 1, when we started with the CJMM six steps. Remember every drill, every case we walked through. You have the knowledge. You have the patterns. You have the support of everyone in this room and the larger nursing community."
        },
        {
          "kind": "callout",
          "tone": "info",
          "title": "The final word",
          "text": "Now go take the test. Pass it. Then come back as RNs licensed in the United States. We need you. Class dismissed - good luck. You've got this."
        }
      ]
    }
  ]
};
