// ───────────────────────────────────────────────────────────────────────────
// Medical-English drill bank - the NCLEX's OWN LANGUAGE, drilled directly.
// IEN candidates lose points to phrasing, not knowledge: "further teaching is
// needed" means the CLIENT IS WRONG; "requires immediate follow-up" means
// PICK THE DANGEROUS ONE. Each item teaches one test-language pattern with a
// plain-English answer + why. Original Florence content.
// ───────────────────────────────────────────────────────────────────────────

export interface EnglishDrillItem {
  id: string;
  phrase: string; //     the exam wording being decoded
  question: string;
  options: string[]; //  4 options
  correctIndex: number;
  explain: string;
}

export const MEDICAL_ENGLISH_DRILLS: EnglishDrillItem[] = [
  {
    id: "me-further-teaching",
    phrase: "“Which statement indicates that further teaching is needed?”",
    question: "What is this question really asking you to find?",
    options: [
      "The statement showing the client understood",
      "The statement showing the client MISUNDERSTOOD",
      "The statement the nurse should have said",
      "The most medically detailed statement",
    ],
    correctIndex: 1,
    explain:
      "“Further teaching is needed” = the teaching FAILED somewhere. You are hunting for the WRONG or unsafe client statement, not the right one.",
  },
  {
    id: "me-understanding",
    phrase: "“Which statement indicates understanding of the teaching?”",
    question: "And this one?",
    options: [
      "The statement showing the client misunderstood",
      "The statement quoting the nurse exactly",
      "The CORRECT client statement",
      "The longest statement",
    ],
    correctIndex: 2,
    explain:
      "The mirror twin of “further teaching.” Read the stem's polarity FIRST, then judge each option against it - most stem misreads are polarity misreads.",
  },
  {
    id: "me-immediate",
    phrase: "“Which client should the nurse assess FIRST?” / “…requires immediate follow-up?”",
    question: "What are you being asked to find?",
    options: [
      "The most stable client",
      "The client with the most chronic condition",
      "The client whose finding is most DANGEROUS right now",
      "The client admitted most recently",
    ],
    correctIndex: 2,
    explain:
      "Priority language (first / immediate / priority) = acute physiologic danger wins. Airway, breathing, circulation, then sudden change from baseline.",
  },
  {
    id: "me-expected",
    phrase: "“Which finding is EXPECTED for this condition?”",
    question: "“Expected” here means…",
    options: [
      "A finding that would alarm the nurse",
      "A NORMAL finding for someone with this condition",
      "A finding requiring provider notification",
      "A rare complication",
    ],
    correctIndex: 1,
    explain:
      "“Expected” = consistent with the disease, no action needed. Its sibling “unexpected” or “requires follow-up” = the abnormal one.",
  },
  {
    id: "me-most-appropriate",
    phrase: "“What is the most appropriate response?” (therapeutic communication)",
    question: "The best-scoring response usually…",
    options: [
      "Reassures: “Everything will be fine.”",
      "Redirects to the physician",
      "Explores the client's feeling with an open question",
      "Gives detailed medical facts immediately",
    ],
    correctIndex: 2,
    explain:
      "Therapeutic-communication stems reward acknowledging + exploring feelings. False reassurance, “ask your doctor,” and fact-dumping are classic distractors.",
  },
  {
    id: "me-contraindicated",
    phrase: "“Which order should the nurse QUESTION?”",
    question: "You are looking for…",
    options: [
      "The order written most recently",
      "The order that is UNSAFE or contradicts the client's condition",
      "The order requiring a calculation",
      "The most expensive medication",
    ],
    correctIndex: 1,
    explain:
      "“Question the order” = something in the chart makes this order dangerous (allergy, interacting condition, wrong dose/route). Cross-check the stem's history against each order.",
  },
  {
    id: "me-tolerating",
    phrase: "“The client is tolerating the diet.”",
    question: "In charting language, “tolerating” means…",
    options: [
      "The client likes the food",
      "No nausea, vomiting, or distress after eating",
      "The client finished the whole tray",
      "The diet order is correct",
    ],
    correctIndex: 1,
    explain:
      "“Tolerating” is a clinical status word: no adverse response. It says nothing about preference or portion.",
  },
  {
    id: "me-guarding",
    phrase: "“The client is guarding the abdomen.”",
    question: "“Guarding” tells you…",
    options: [
      "The client is protecting a painful area with muscle tension",
      "The client is hiding something from staff",
      "The client refuses assessment",
      "The client has a dressing over the site",
    ],
    correctIndex: 0,
    explain:
      "Guarding = involuntary/voluntary muscle protection over pain - in a stem it often signals peritoneal irritation. It's a physical finding, not a behavior judgment.",
  },
  {
    id: "me-noncompliant",
    phrase: "“The client has not been taking the prescribed medication.”",
    question: "The exam's preferred FIRST nursing response is to…",
    options: [
      "Report the client to the provider",
      "Re-teach the medication schedule immediately",
      "ASSESS the reason (cost, side effects, beliefs, understanding)",
      "Document noncompliance",
    ],
    correctIndex: 2,
    explain:
      "Assessment before intervention - the NCLEX rewards finding out WHY before acting. Watch for the assess-first pattern across the whole exam.",
  },
  {
    id: "me-productive-cough",
    phrase: "“A productive cough” vs “a dry cough”",
    question: "“Productive” means…",
    options: [
      "The cough brings up sputum",
      "The cough is getting better",
      "The cough responds to medication",
      "The cough is frequent",
    ],
    correctIndex: 0,
    explain: "Productive = produces sputum/mucus. Its color and character are often the diagnostic cue hiding in the stem.",
  },
  {
    id: "me-voids",
    phrase: "“The client voids 500 mL.” / “has not voided since surgery.”",
    question: "“Void” means…",
    options: ["Vomit", "Urinate", "Have a bowel movement", "Faint"],
    correctIndex: 1,
    explain:
      "Void = urinate. Post-op stems love it: no void within ~8 hours of surgery is a finding to act on, not chart and move on.",
  },
  {
    id: "me-patent",
    phrase: "“Ensure the airway/IV line is patent.”",
    question: "“Patent” (PAY-tent) means…",
    options: ["Legally protected", "Open and unobstructed", "Newly inserted", "Sterile"],
    correctIndex: 1,
    explain: "Patent = open, working, nothing blocking. A patent airway or IV is one you can use right now.",
  },
  {
    id: "me-within-normal",
    phrase: "“Vital signs are within normal limits (WNL).”",
    question: "When a stem says WNL, the exam usually wants you to…",
    options: [
      "Recheck them yourself",
      "Rule vitals OUT as the problem and look at the other data",
      "Treat it as an emergency",
      "Ask the provider to verify",
    ],
    correctIndex: 1,
    explain:
      "Stems rarely waste words. WNL is the writer telling you the danger is elsewhere in the scenario - move your attention.",
  },
  {
    id: "me-hold-med",
    phrase: "“The nurse should HOLD the medication.”",
    question: "“Hold” means…",
    options: [
      "Carry it to the bedside",
      "NOT give it this time, and follow up",
      "Give half the dose",
      "Store it securely",
    ],
    correctIndex: 1,
    explain:
      "Hold = withhold this dose (usually because a parameter is unsafe: pulse before digoxin, BP before antihypertensives, K+ before potassium).",
  },
  {
    id: "me-ambulate",
    phrase: "“Ambulate the client twice daily.” / “The client ambulates with a steady gait.”",
    question: "“Ambulate” means…",
    options: ["Transfer by wheelchair", "Walk", "Turn in bed", "Exercise in physical therapy"],
    correctIndex: 1,
    explain: "Ambulate = walk. “Steady gait” is the safety detail - gait words carry fall-risk meaning in stems.",
  },
  {
    id: "me-npo-midnight",
    phrase: "“The client is NPO after midnight.”",
    question: "Which action fits the order?",
    options: [
      "Offer sips of water with medications automatically",
      "Nothing by mouth - including water - unless specifically excepted",
      "Clear liquids only",
      "Small snacks if hungry",
    ],
    correctIndex: 1,
    explain:
      "NPO (nil per os) = nothing by mouth. Meds with a sip need an explicit exception order - a favorite trap.",
  },
  {
    id: "me-denies",
    phrase: "“The client denies chest pain.”",
    question: "“Denies” in charting means…",
    options: [
      "The client is lying about pain",
      "The client SAYS they do not have it",
      "The nurse ruled it out objectively",
      "The pain resolved with treatment",
    ],
    correctIndex: 1,
    explain:
      "“Denies” records the client's own report, nothing more. Subjective vs objective wording matters when the stem asks what the NURSE observed.",
  },
  {
    id: "me-baseline",
    phrase: "“…a change from baseline.”",
    question: "“Baseline” means…",
    options: [
      "The textbook normal value",
      "THIS client's usual state",
      "The value at hospital admission only",
      "The minimum acceptable value",
    ],
    correctIndex: 1,
    explain:
      "Baseline is personal, not textbook. A BP of 118/76 can be alarming if the client's baseline is 160/95 - change-from-baseline outranks absolute numbers in priority stems.",
  },
  {
    id: "me-prn",
    phrase: "“Morphine 2 mg IV q4h PRN for pain.”",
    question: "PRN means the nurse gives it…",
    options: [
      "On a fixed schedule every 4 hours",
      "Only when the client needs it, no sooner than every 4 hours",
      "Once only",
      "Whenever the client requests, without limit",
    ],
    correctIndex: 1,
    explain:
      "PRN (pro re nata) = as needed WITHIN the ordered interval. Both halves matter: need + minimum spacing.",
  },
  {
    id: "me-incident",
    phrase: "“The nurse completes an incident (occurrence) report.”",
    question: "What does the exam expect about the report?",
    options: [
      "Reference it in the client's chart",
      "Send a copy to the family",
      "File it per policy but do NOT mention it in the chart",
      "Have the client sign it",
    ],
    correctIndex: 2,
    explain:
      "Chart the facts of the event and care given - never “incident report filed.” The report is an internal quality document, not part of the record.",
  },
  {
    id: "me-only-when",
    phrase: "Absolutes in options: “always,” “never,” “only,” “all,” “must”",
    question: "As a test-language rule, absolute words in an option usually mean…",
    options: [
      "The option is more precise, so more likely correct",
      "The option is SUSPECT - clinical care rarely admits absolutes",
      "The option is quoting policy",
      "Nothing - ignore them",
    ],
    correctIndex: 1,
    explain:
      "Not a guarantee, but a strong lean: safe clinical answers hedge (“generally,” “first,” “most”). Absolute options fail on the exception you weren't told about.",
  },
];
