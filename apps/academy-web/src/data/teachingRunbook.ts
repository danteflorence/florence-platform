// ───────────────────────────────────────────────────────────────────────────
// First-time-teacher runbook - the instructor-side next_action.
//
// Our instructors passed the NCLEX themselves but most have never taught.
// The product does the heavy lifting; this runbook is the minute-by-minute
// script for running one live class session so a first-time teacher never has
// to invent classroom mechanics on the spot. The instructor console renders
// the frame for the NEXT live section, hydrated with the cohort's live
// weakest area from the copilot ({WEAKEST_AREA} placeholder).
//
// Pedagogy notes baked in: retrieval first (poll before teaching), teach in
// 15-20 minute arcs with checks between, name the reasoning error out loud,
// end with a commitment. The sim-debrief script lives with the class-debrief
// pane; this file covers the standard live session.
// ───────────────────────────────────────────────────────────────────────────

export interface RunbookBeat {
  /** Minute range on the class clock, e.g. "0-10". */
  minutes: string;
  title: string;
  /** What the instructor literally does/says - short imperative lines. */
  script: string[];
  /** Which product surface this beat uses. */
  surface?: "deck" | "poll" | "drill" | "qa" | "none";
}

/** The standard 90-minute live-session frame. Works for any section. */
export const SESSION_FRAME: RunbookBeat[] = [
  {
    minutes: "0-10",
    title: "Arrive + retrieve",
    surface: "poll",
    script: [
      "Greet by name as students join. Say what today covers in ONE sentence.",
      "Open a 2-question poll on LAST session's material before any teaching. Retrieval first - it is the highest-value ten minutes of the class.",
      "Reveal, then cold-call two students: \"walk us through WHY that answer.\" You are listening for the reasoning, not the letter.",
    ],
  },
  {
    minutes: "10-30",
    title: "Teach arc 1",
    surface: "deck",
    script: [
      "Teach the first half of the section from the deck. Keep each concept anchored to ONE patient story.",
      "Every 5-7 slides, stop and ask the room to predict: \"what do you expect this drug/finding to do?\"",
      "If the cohort's weakest area is {WEAKEST_AREA}, tie at least one example back to it explicitly.",
    ],
  },
  {
    minutes: "30-40",
    title: "Check + poll",
    surface: "poll",
    script: [
      "Run a graded poll on what you just taught (tag the NCJMM step when you open it - it feeds each student's record).",
      "If under 70% get it: reteach the concept a DIFFERENT way (draw it, act it out, patient story). Do not repeat the same words louder.",
      "Name the trap out loud: \"most of you picked B - that is a priority error. The stem asked what to do FIRST.\"",
    ],
  },
  {
    minutes: "40-60",
    title: "Teach arc 2",
    surface: "deck",
    script: [
      "Second half of the section. Same rhythm: concept, patient, prediction.",
      "Hand the marker to the room once: have a student talk the class through one worked example while you annotate.",
    ],
  },
  {
    minutes: "60-75",
    title: "Apply",
    surface: "drill",
    script: [
      "Work 3-5 exam-style items on today's content as a room. Read the stem out loud, then silence while everyone commits to an answer in the poll.",
      "Debrief each item with the walkthrough language: right answer, why each distractor tempts, which reasoning error it represents.",
    ],
  },
  {
    minutes: "75-90",
    title: "Close + commit",
    surface: "qa",
    script: [
      "Answer the queued Q&A. If you do not know, say so and commit to the answer by tomorrow - modeling that is teaching.",
      "Assign tonight: the nightly 150 plus each student's flagged remediation area (it is already on their home screen).",
      "End with commitments: three students say one thing they will do differently on the next practice set.",
      "After class: hit the post-class wrap (bump coverage + memo). Tomorrow's Plan updates overnight from tonight's practice.",
    ],
  },
];

/** Section-specific coaching for the first two cohort weeks (sections 1-8).
 *  Sections beyond 8 use the generic frame alone until authored. */
export interface SectionNotes {
  /** What actually matters in this section - the instructor's north star. */
  focus: string;
  /** The mistake first-time teachers make with this material. */
  watchFor: string;
  /** A ready-made opening hook. */
  hook: string;
}

export const SECTION_NOTES: Record<number, SectionNotes> = {
  1: {
    focus: "Orientation is about momentum, not content. Every student leaves having answered practice items and seen their readiness card.",
    watchFor: "Spending the whole session on logistics. Cap logistics at 20 minutes - get them INTO the product live.",
    hook: "Ask: \"how many NCLEX questions have you answered in your life?\" Then: \"by tonight that number grows by 150.\"",
  },
  2: {
    focus: "Test-taking strategy = clinical judgment, not tricks. Teach the NCJMM steps as the way nurses think, using 3-4 items slowly.",
    watchFor: "Teaching gimmicks (\"pick C\"). Every strategy must map to a reasoning step or it will not transfer.",
    hook: "Put one hard item on screen cold. Let the room get it wrong, then show how the METHOD gets it right.",
  },
  3: {
    focus: "Pharm I - cardiac and anticoagulants. Prototypes over lists: digoxin, warfarin, heparin deeply beat forty drugs shallowly.",
    watchFor: "Racing through drug lists. If they know the prototype's mechanism, monitoring, and antidote, the class works.",
    hook: "Start with the patient: \"your INR is 8. What did the nurse miss three days ago?\"",
  },
  4: {
    focus: "Pharm II. Keep hanging every drug on mechanism → what you monitor → what you teach the patient.",
    watchFor: "Students memorizing side-effect lists without the WHY. Ask \"what would you expect?\" before revealing.",
    hook: "Poll on Pharm I prototypes first - spaced retrieval on cardiac drugs cements them.",
  },
  5: {
    focus: "Pharm III closes the medication arc. Spend the last 20 minutes mixed-drilling across ALL pharm - interleaving beats blocking.",
    watchFor: "Treating today's drugs in isolation. The exam mixes them; your drill should too.",
    hook: "\"Three infusions are running. One order is wrong. Find it.\"",
  },
  6: {
    focus: "Lab values are recognition + ACTION. Every value teaches: normal range, why it moves, what the nurse does about it.",
    watchFor: "Letting it become a memorization hour. Always ask \"the potassium is 6.1 - what do you DO?\"",
    hook: "Rapid-fire warm-up: call values, the room shouts \"normal / high / low\" - then slow down on the ones that split the room.",
  },
  7: {
    focus: "Cardiac ties pharm + labs + assessment together. Teach failure and ischemia as unfolding stories, not slide lists.",
    watchFor: "Assuming their cardiac assessment transfers from home-country practice. Check with an early poll.",
    hook: "Play the vitals monitor widget - let them watch a deterioration and call out what they see before you name it.",
  },
  8: {
    focus: "Respiratory. Anchor everything to gas exchange: if you can reason from SpO2 + work of breathing, most items fall.",
    watchFor: "ABG panic. Teach one simple method and drill it - do not present three competing mnemonics.",
    hook: "\"Your patient is satting 88 on 4L. Walk me to the bedside - what do you look at first, second, third?\"",
  },
};

/** The line the pane shows when a section has no authored notes yet. */
export const GENERIC_NOTES: SectionNotes = {
  focus: "Run the standard frame. Keep every concept anchored to a patient and check understanding with a poll every 20 minutes.",
  watchFor: "Lecturing past the room. If you have not heard a student's voice in 15 minutes, stop and ask one to reason out loud.",
  hook: "Open with one exam-style item on today's topic, cold. Let the item create the need for the lesson.",
};
