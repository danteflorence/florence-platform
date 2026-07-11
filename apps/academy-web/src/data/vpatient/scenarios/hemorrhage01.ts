// ───────────────────────────────────────────────────────────────────────────
// vp-hemorrhage-01 - scenario 3: post-op hemorrhage (compensated → shock).
//
// STATUS: approved (operator sign-off 2026-07-10) - live for learners.
//
// CLINICAL BASIS (windows compressed ~6:1 for a 10-minute teaching run):
//  - Parameterized from the BioGears Hemorrhage vocabulary (rate mL/min +
//    compartment; see ../clinicalModel.ts) - here a slow internal bleed after
//    a total hip replacement.
//  - THE teaching point: compensated shock. The heart rate climbs and the
//    pulse pressure NARROWS long before the systolic falls - young/otherwise
//    stable patients "look fine" until they crash. Reward the nurse who
//    reads tachycardia + drain output + pallor, not the one who waits for
//    hypotension.
//  - Trap: medicating the tachycardia's "anxiety" (a benzodiazepine trap is
//    out of scope for an RN without an order; here the trap is treating pain
//    harder because "pain causes tachycardia" while the drain fills).
// SME review should check every window + vitals trajectory in this file.
// ───────────────────────────────────────────────────────────────────────────

import type { VPatientScenario } from "../types";

export const HEMORRHAGE_01: VPatientScenario = {
  id: "vp-hemorrhage-01",
  title: "Post-op hip, 'just a little dizzy'",
  // Approved by the operator (Dante, Florence) 2026-07-10 - live for learners.
  status: "approved",
  setting: "Ortho unit, 6 hours after a total hip replacement. 2200, lights low.",
  clientNeed: "reduction-of-risk",
  careSettingId: "pacu",
  patient: {
    name: "Grace Mwangi",
    age: 64,
    sex: "F",
    history: ["Total hip replacement this afternoon", "Osteoarthritis", "No cardiac history"],
    allergies: ["No known allergies"],
    meds: ["Enoxaparin started post-op", "PRN morphine", "Cefazolin perioperative"],
    chart: [
      {
        id: "notes",
        label: "Nurses' Notes",
        body: "PACU handoff 1600: stable, estimated blood loss in the OR 400 mL. Hemovac drain in place. 2000: c/o incisional pain 5/10, morphine given. Drain emptied 1900: 150 mL.",
      },
      {
        id: "orders",
        label: "Orders",
        body: "Vitals q4h. PRN morphine. Enoxaparin 40 mg daily. Call provider for SBP < 90, HR > 120, drain output > 250 mL/4h, or acute change.",
      },
      {
        id: "history",
        label: "History",
        body: "64 F, elective right THR for osteoarthritis. Independent at baseline. Pre-op hemoglobin 12.8.",
      },
    ],
  },
  initialVitals: {
    hr: 98,
    sbp: 122,
    dbp: 74,
    rr: 18,
    spo2: 97,
    tempC: 36.6,
    pain: 4,
    rhythm: "Sinus rhythm",
    loc: "alert",
  },
  durationSec: 600,
  phases: [
    {
      id: "p0-baseline",
      atSec: 0,
      cues: [
        { id: "c-dizzy", text: "Grace, half-asleep: \"I feel a bit dizzy when I sit up. And thirsty.\"", channel: "patient", critical: true },
        { id: "c-hr-creep", text: "HR has crept from the low 80s to high 90s over two hours.", channel: "monitor", critical: true },
        // The bleed is findable - if you look.
        { id: "c-drain", text: "Hemovac: 260 mL of frank blood since 1900, filling visibly.", channel: "assessment", critical: true },
        { id: "c-dressing", text: "Posterior dressing saturated at the dependent edge; blood pooling under the hip.", channel: "assessment", critical: true },
        { id: "c-pallor", text: "Skin pale and cool, cap refill 3-4 seconds, lips pale.", channel: "assessment", critical: true },
        { id: "c-urine", text: "Foley: 20 mL in the last hour, concentrated.", channel: "assessment" },
        { id: "c-confusion", text: "Grace asks the same question twice and drifts mid-sentence.", channel: "assessment", critical: true },
      ],
      patientLine: { text: "I'm alright... just dizzy when I move. Could I have some water?", audioId: "a-hem-p0" },
    },
    {
      // Compensation: HR up, diastolic up (vasoconstriction) → pulse pressure
      // NARROWS while systolic barely moves. The learner who reads this acts
      // an hour before the crash.
      id: "p1-compensation",
      atSec: 120,
      vitalsDrift: { targets: { hr: 118, dbp: 84, sbp: 116, rr: 22 }, overSec: 120 },
      cues: [
        { id: "c-narrow-pp", text: "BP 116/84 - the gap is narrowing while the heart rate climbs.", channel: "monitor", critical: true },
      ],
      patientLine: { text: "My heart feels... fluttery. Is that normal?", audioId: "a-hem-p1" },
    },
  ],
  actions: [
    { id: "check_vitals", label: "Take a full set of vitals", category: "assess", durationSec: 10, cooldownSec: 30, repeatable: true },
    { id: "check_drain", label: "Check the surgical drain", category: "assess", durationSec: 15, reveals: ["c-drain"] },
    { id: "check_dressing", label: "Inspect the dressing and under the hip", category: "assess", durationSec: 15, reveals: ["c-dressing"] },
    { id: "assess_perfusion", label: "Assess skin, cap refill, pulses", category: "assess", durationSec: 10, reveals: ["c-pallor"] },
    { id: "check_urine", label: "Check urine output", category: "assess", durationSec: 10, reveals: ["c-urine"] },
    { id: "lay_flat_legs_up", label: "Lay her flat, elevate the legs", category: "intervene", durationSec: 10 },
    { id: "apply_oxygen", label: "Apply oxygen 2 L NC", category: "intervene", durationSec: 15 },
    { id: "notify_provider", label: "SBAR the provider", category: "communicate", durationSec: 30 },
    // The trap: "pain causes tachycardia" - so treat the number with morphine
    // while the drain fills. Vasodilation makes a bleeding patient worse.
    { id: "give_morphine", label: "Give PRN morphine for comfort", category: "med", durationSec: 15 },
    { id: "give_fluids", label: "Run the ordered crystalloid bolus", category: "med", durationSec: 30, requiresFlag: "provider_notified" },
    { id: "type_and_cross", label: "Send type and crossmatch", category: "intervene", durationSec: 20, requiresFlag: "provider_notified" },
  ],
  rules: [
    {
      id: "r-position",
      when: { actionTaken: "lay_flat_legs_up" },
      effects: [
        { kind: "setFlag", flag: "positioned" },
        { kind: "vitalsRamp", key: "sbp", target: 118, overSec: 60 },
        { kind: "narrate", text: "Flat with her legs up, the dizziness eases and the pressure steadies a touch. Positioning buys minutes, not a fix." },
      ],
    },
    {
      id: "r-oxygen",
      when: { actionTaken: "apply_oxygen" },
      effects: [
        { kind: "setFlag", flag: "oxygen_applied" },
        { kind: "narrate", text: "Oxygen on. It supports her - it does not stop the bleed." },
      ],
    },
    {
      id: "r-morphine-trap",
      when: { actionTaken: "give_morphine" },
      effects: [
        { kind: "setFlag", flag: "morphine_given" },
        { kind: "vitalsRamp", key: "sbp", target: 100, overSec: 90 },
        { kind: "narrate", text: "She settles... and her pressure drifts lower. Opioid vasodilation on a shrinking volume." },
      ],
    },
    {
      id: "r-notify",
      when: { actionTaken: "notify_provider" },
      effects: [
        { kind: "setFlag", flag: "provider_notified" },
        {
          kind: "narrate",
          text: "Provider: \"That drain output with that heart rate - she is bleeding. Bolus a liter now, send type and cross, hold the enoxaparin. I am calling the surgeon and coming up.\"",
          audioId: "a-hem-orders",
        },
      ],
    },
    {
      id: "r-fluids",
      when: { actionTaken: "give_fluids" },
      effects: [
        { kind: "setFlag", flag: "fluids_given" },
        { kind: "vitalsRamp", key: "sbp", target: 116, overSec: 90 },
        { kind: "vitalsRamp", key: "hr", target: 102, overSec: 120 },
        { kind: "narrate", text: "Bolus running. Color returning to her lips; the monitor slows its climb." },
      ],
    },
    {
      id: "r-crossmatch",
      when: { actionTaken: "type_and_cross" },
      effects: [
        { kind: "setFlag", flag: "crossmatch_sent" },
        { kind: "narrate", text: "Crossmatch to the lab - blood will be ready if the surgeon takes her back." },
      ],
    },
    {
      // Decompensation if nobody escalates: compensation fails, systolic falls
      // off the cliff it was hiding behind.
      id: "r-no-escalation",
      when: { actionNotTakenBySec: { action: "notify_provider", sec: 330 } },
      effects: [
        { kind: "vitalsRamp", key: "sbp", target: 74, overSec: 150 },
        { kind: "vitalsRamp", key: "hr", target: 134, overSec: 120 },
        { kind: "narrate", text: "The compensation is failing. Her pressure lets go all at once." },
      ],
    },
    {
      id: "r-hypotension",
      when: { vitalsCross: { key: "sbp", below: 90 } },
      effects: [
        { kind: "setFlag", flag: "hypotension" },
        { kind: "setVitalText", key: "loc", value: "confused" },
        { kind: "revealCue", cueId: "c-confusion" },
        { kind: "narrate", text: "She is pale, clammy, and asking for her daughter by the wrong name.", audioId: "a-hem-confused" },
      ],
    },
    {
      id: "r-crash",
      when: { vitalsCross: { key: "sbp", below: 76 } },
      effects: [
        { kind: "setVitalText", key: "rhythm", value: "Sinus tachycardia, thready" },
        { kind: "narrate", text: "Rapid response and the surgical team take over. She is going back to the OR." },
        { kind: "endRun", outcome: "deteriorated" },
      ],
    },
    {
      // Recovery crossing: only reachable on the way back up after a dip
      // (baseline SBP 122 > 114; the p1 drift to 116 never crosses upward).
      id: "r-recover",
      when: { vitalsCross: { key: "sbp", above: 114 } },
      effects: [
        { kind: "narrate", text: "Pressure holding, pulse easing. The surgeon finds you: \"good catch - the drain told the story and you listened.\"" },
        { kind: "endRun", outcome: "stabilized" },
      ],
    },
  ],
  rubric: [
    {
      decisionId: "d-vitals",
      label: "Full vitals at the first soft sign",
      ncjmmStep: "recognize-cues",
      clientNeed: "reduction-of-risk",
      correctActions: ["check_vitals"],
      opensAtSec: 0,
      windowSec: 120,
      errorTypeIfMissed: "missed_cue",
      weight: 1,
      citation: "Dizziness + thirst + creeping HR post-op = check now, not at the q4h mark.",
    },
    {
      decisionId: "d-drain",
      label: "Check the drain and dressing - find the blood",
      ncjmmStep: "recognize-cues",
      clientNeed: "reduction-of-risk",
      correctActions: ["check_drain", "check_dressing"],
      opensAtSec: 0,
      windowSec: 240,
      errorTypeIfMissed: "missed_cue",
      weight: 2,
      citation: "Drain output past the notify threshold (260 mL > 250/4h order) is on the chart - the bleed is findable.",
    },
    {
      decisionId: "d-perfusion",
      label: "Read the compensation (pallor, cap refill, narrowing pulse pressure)",
      ncjmmStep: "analyze-cues",
      clientNeed: "physiological-adaptation",
      correctActions: ["assess_perfusion"],
      opensAtSec: 0,
      windowSec: 300,
      errorTypeIfMissed: "misread_cue",
      weight: 1.5,
      citation: "Compensated shock: tachycardia + narrowed pulse pressure precede hypotension - the systolic 'looks fine' until it does not.",
    },
    {
      decisionId: "d-escalate",
      label: "Escalate while she is still compensating",
      ncjmmStep: "take-actions",
      clientNeed: "management-of-care",
      correctActions: ["notify_provider"],
      opensAtSec: 120,
      windowSec: 210,
      errorTypeIfMissed: "unsafe_delay",
      weight: 2,
      citation: "120→330s ≈ the real ~1-hour compensated window at 6:1 compression. Waiting for hypotension wastes it.",
    },
    {
      decisionId: "d-morphine-trap",
      label: "Do not medicate the tachycardia as pain",
      ncjmmStep: "analyze-cues",
      clientNeed: "pharmacological-therapies",
      correctActions: ["notify_provider"],
      harmfulActions: ["give_morphine"],
      errorTypeIfMissed: "unsafe_delay",
      errorTypeIfHarmful: "treating_symptom_not_cause",
      weight: 1.5,
      citation: "Opioid vasodilation drops preload on a bleeding patient; the tachycardia is volume, not pain.",
    },
    {
      decisionId: "d-position",
      label: "Position for perfusion (flat, legs elevated)",
      ncjmmStep: "take-actions",
      clientNeed: "basic-care-comfort",
      correctActions: ["lay_flat_legs_up"],
      afterFlag: "hypotension",
      windowSec: 90,
      errorTypeIfMissed: "priority_error",
      weight: 1,
      citation: "The nurse's independent action while help is coming - buys preload, not a fix.",
    },
    {
      decisionId: "d-fluids",
      label: "Run the bolus once ordered",
      ncjmmStep: "take-actions",
      clientNeed: "physiological-adaptation",
      correctActions: ["give_fluids"],
      afterFlag: "provider_notified",
      windowSec: 150,
      errorTypeIfMissed: "under_treatment",
      weight: 2,
      citation: "Crystalloid first for hemorrhagic hypovolemia while blood is prepared.",
    },
    {
      decisionId: "d-crossmatch",
      label: "Send type and crossmatch",
      ncjmmStep: "generate-solutions",
      clientNeed: "reduction-of-risk",
      correctActions: ["type_and_cross"],
      afterFlag: "provider_notified",
      windowSec: 180,
      errorTypeIfMissed: "content_gap",
      weight: 1,
      citation: "Anticipate the transfusion: crossmatch turnaround is the bottleneck if she returns to the OR.",
    },
    {
      decisionId: "d-reassess",
      label: "Reassess after the bolus",
      ncjmmStep: "evaluate-outcomes",
      clientNeed: "physiological-adaptation",
      correctActions: ["check_vitals"],
      afterFlag: "fluids_given",
      windowSec: 150,
      errorTypeIfMissed: "missed_cue",
      weight: 1,
    },
  ],
  debrief: {
    outcomeSummaries: {
      stabilized:
        "Grace stabilized and the surgeon knows. You read compensated shock - the climbing heart rate and the narrowing pulse pressure - before the systolic ever fell. That hour is the whole game.",
      deteriorated:
        "Grace crashed and went back to the OR emergently. The drain had told the story by 2200. Walk the timeline: find the minute the compensation was already readable.",
      time_end:
        "The shift rolled on with Grace still compensating. Compare timelines - what would you check FIRST next time a post-op patient says 'just a little dizzy'?",
    },
    optimalTimeline: [
      { atSec: 0, label: "Vitals at the 'dizzy and thirsty' report", actionId: "check_vitals" },
      { atSec: 30, label: "Drain checked - 260 mL of frank blood", actionId: "check_drain" },
      { atSec: 60, label: "Perfusion read - pale, slow cap refill", actionId: "assess_perfusion" },
      { atSec: 120, label: "SBAR: 'I think she is bleeding'", actionId: "notify_provider" },
      { atSec: 170, label: "Bolus running", actionId: "give_fluids" },
      { atSec: 210, label: "Type and cross to the lab", actionId: "type_and_cross" },
      { atSec: 300, label: "Reassess - pressure holding, pulse easing", actionId: "check_vitals" },
    ],
  },
  narration: [
    { id: "a-hem-p0", text: "I'm alright... just dizzy when I move. Could I have some water?" },
    { id: "a-hem-p1", text: "My heart feels... fluttery. Is that normal?" },
    { id: "a-hem-orders", text: "That drain output with that heart rate - she is bleeding. Bolus a liter now, send type and cross, hold the enoxaparin. I am calling the surgeon and coming up." },
    { id: "a-hem-confused", text: "She is pale, clammy, and asking for her daughter by the wrong name." },
    { id: "a-hem-feel", text: "Tired. Dizzy. Thirsty, mostly." },
  ],
  patientResponses: [
    { match: ["feel", "how are you", "doing"], text: "Tired. Dizzy. Thirsty, mostly.", audioId: "a-hem-feel" },
    { match: ["pain", "hurt"], text: "The hip aches, maybe a four. It's the dizziness that bothers me." },
    { match: ["dizzy", "lightheaded"], text: "Only when I sit up. The room tilts for a second." },
    { match: ["water", "drink", "thirsty"], text: "Please. My mouth is like paper." },
    { match: ["name", "who"], text: "Grace. Grace Mwangi." },
  ],
};
