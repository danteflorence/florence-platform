// ───────────────────────────────────────────────────────────────────────────
// vp-hypovolemic-01 - scenario 4: hypovolemic shock from an upper GI bleed.
//
// STATUS: approved (operator sign-off 2026-07-10) - live for learners.
//
// PROVENANCE: the CLINICAL FACTS (presentation, vital-sign values, the
// bundle) are adapted from a licensed instructor Scenario Information Form
// (New Mexico / Kansas healthcare simulation lab, "Hypovolemic Shock -
// Nursing"). Facts and physiological parameters are not copyrightable; this is
// our own expression of them in the Florence scenario schema. The original
// instructor-reference document is NOT redistributed. This file also serves as
// the worked example the Scenario Studio points authors at: a real purchased
// scenario's State/Vitals/Transition grid mapped onto our engine.
//
//   Source grid → our schema:
//     State 1 (initial presentation) → phases[p0] + initialVitals
//     "NRB raises SpO2 to 94 @ 10 LPM" modifier → r-oxygen (action → ramp)
//     "Code pt when students call MD" transition → the crash path if the
//        recognize→resuscitate bundle is not done in time
//     Version B fluids + pressor + blood → the order-gated stabilization path
// ───────────────────────────────────────────────────────────────────────────

import type { VPatientScenario } from "../types";

export const HYPOVOLEMIC_01: VPatientScenario = {
  id: "vp-hypovolemic-01",
  title: "Weak, vomiting, and crashing",
  // Approved by the operator (Dante, Florence) 2026-07-10 - live for learners.
  status: "approved",
  setting: "Rural ER, 1400. A new patient was just wheeled in - weakness and vomiting for six hours.",
  clientNeed: "physiological-adaptation",
  patient: {
    name: "Ray Delgado",
    age: 50,
    sex: "M",
    history: ["Hypertension", "Alcohol use disorder", "Esophageal varices (banded 4 years ago, no GI follow-up)"],
    allergies: ["Iodine"],
    meds: ["Atenolol"],
    chart: [
      {
        id: "notes",
        label: "Nurses' Notes",
        body: "Tech: INT placed, blood samples drawn per N/V protocol. Partial vitals - HR 122 weak and regular at the radial, pale skin, NIBP would not read. Patient has vomited about four times an hour for six hours.",
      },
      {
        id: "orders",
        label: "Orders",
        body: "N/V protocol labs sent. No provider orders yet - patient has not been seen.",
      },
      {
        id: "history",
        label: "History",
        body: "50 M, chronic heavy alcohol use (~12 beers/day x 20 years). Esophageal varices banded 4 years ago, lost to GI follow-up. On atenolol (blunts the compensatory tachycardia).",
      },
    ],
  },
  initialVitals: {
    hr: 122,
    sbp: 88,
    dbp: 46,
    rr: 26,
    spo2: 84,
    tempC: 36.3,
    pain: 3,
    rhythm: "Sinus tachycardia",
    loc: "confused",
  },
  durationSec: 600,
  phases: [
    {
      id: "p0-presentation",
      atSec: 0,
      cues: [
        { id: "c-weak", text: "Ray, pale and diaphoretic: \"I feel like I'm going to pass out. My heart's racing.\"", channel: "patient", critical: true },
        { id: "c-nibp", text: "Monitor: NIBP failing to read; radial pulse weak and thready.", channel: "monitor", critical: true },
        { id: "c-vomit", text: "Emesis basin: dark coffee-ground vomit with streaks of red blood and clots.", channel: "assessment", critical: true },
        { id: "c-skin", text: "Skin cold, pale, diaphoretic; cap refill over 4 seconds.", channel: "assessment", critical: true },
        { id: "c-int", text: "A tech-placed INT (IV access, no fluids running) is in the left forearm.", channel: "chart" },
        { id: "c-loc", text: "Ray is oriented but slow, drifting off mid-sentence.", channel: "patient", critical: true },
      ],
      patientLine: { text: "I've been throwing up all day... something's wrong.", audioId: "a-hv-p0" },
    },
    {
      // Untreated, hypovolemia deepens: pressure falls further, SpO2 drops.
      id: "p1-decompensation",
      atSec: 150,
      vitalsDrift: { targets: { sbp: 72, hr: 132, spo2: 78 }, overSec: 120 },
      cues: [
        { id: "c-fading", text: "Ray stops answering questions and his eyes close.", channel: "patient", critical: true },
      ],
    },
  ],
  actions: [
    { id: "check_vitals", label: "Take a full set of vitals", category: "assess", durationSec: 10, cooldownSec: 30, repeatable: true },
    { id: "assess_bleeding", label: "Assess the vomit / GI source", category: "assess", durationSec: 15, reveals: ["c-vomit"] },
    { id: "assess_perfusion", label: "Assess skin, cap refill, pulses", category: "assess", durationSec: 10, reveals: ["c-skin"] },
    { id: "apply_oxygen", label: "Apply high-flow O2 (non-rebreather 10 L)", category: "intervene", durationSec: 15 },
    { id: "start_fluids", label: "Open the INT - run a 1 L NS bolus wide", category: "intervene", durationSec: 20 },
    { id: "notify_provider", label: "SBAR the provider", category: "communicate", durationSec: 30 },
    { id: "give_pressor", label: "Start norepinephrine per order", category: "med", durationSec: 30, requiresFlag: "provider_notified" },
    { id: "give_blood", label: "Hang the STAT whole-blood transfusion", category: "med", durationSec: 30, requiresFlag: "provider_notified" },
    { id: "start_cpr", label: "Begin CPR / call the code", category: "intervene", durationSec: 20, requiresFlag: "arrested" },
  ],
  rules: [
    {
      // "NRB raises SpO2 to 94 at 10 LPM or greater" - the source-grid modifier.
      id: "r-oxygen",
      when: { actionTaken: "apply_oxygen" },
      effects: [
        { kind: "setFlag", flag: "oxygen_applied" },
        { kind: "vitalsRamp", key: "spo2", target: 94, overSec: 30 },
        { kind: "narrate", text: "High-flow oxygen on; the saturation comes up, but the pressure is still bottoming out." },
      ],
    },
    {
      id: "r-fluids",
      when: { actionTaken: "start_fluids" },
      effects: [
        { kind: "setFlag", flag: "fluids_running" },
        { kind: "vitalsRamp", key: "sbp", target: 92, overSec: 90 },
        { kind: "vitalsRamp", key: "hr", target: 118, overSec: 120 },
        { kind: "narrate", text: "Fluids wide open through the INT. A little more pressure - but he is bleeding faster than saline can fill him." },
      ],
    },
    {
      id: "r-notify",
      when: { actionTaken: "notify_provider" },
      effects: [
        { kind: "setFlag", flag: "provider_notified" },
        {
          kind: "narrate",
          text: "Provider: \"Upper GI bleed in shock. One liter of saline wide open, start norepinephrine at 5 micrograms a minute, and I'm calling the blood bank for STAT whole blood. Keep his sat in the mid-90s.\"",
          audioId: "a-hv-orders",
        },
      ],
    },
    {
      id: "r-pressor",
      when: { actionTaken: "give_pressor" },
      effects: [
        { kind: "setFlag", flag: "pressor_running" },
        { kind: "vitalsRamp", key: "sbp", target: 100, overSec: 90 },
        { kind: "narrate", text: "Norepinephrine titrating in; the pressure lifts off the floor." },
      ],
    },
    {
      id: "r-blood",
      when: { actionTaken: "give_blood" },
      effects: [
        { kind: "setFlag", flag: "blood_running" },
        { kind: "vitalsRamp", key: "sbp", target: 104, overSec: 120 },
        { kind: "vitalsRamp", key: "hr", target: 104, overSec: 150 },
        { kind: "narrate", text: "Whole blood hanging - replacing what he is losing. Color returns to his face." },
      ],
    },
    {
      // The source grid's Version-A transition: "Code the patient when students
      // go to call the MD" - i.e. if the resuscitation is not underway, he
      // arrests. Here: if no fluids AND no pressor are running by ~300s, arrest.
      id: "r-arrest",
      when: { actionNotTakenBySec: { action: "start_fluids", sec: 300 } },
      effects: [
        { kind: "vitalsRamp", key: "sbp", target: 40, overSec: 60 },
        { kind: "vitalsRamp", key: "hr", target: 30, overSec: 60 },
        { kind: "narrate", text: "The monitor alarms - the rhythm is disorganized and there is no pulse. He is in PEA arrest." },
      ],
    },
    {
      id: "r-pea",
      when: { vitalsCross: { key: "sbp", below: 50 } },
      effects: [
        { kind: "setFlag", flag: "arrested" },
        { kind: "setVitalText", key: "rhythm", value: "PEA" },
        { kind: "setVitalText", key: "loc", value: "unresponsive" },
        { kind: "unlockAction", actionId: "start_cpr" },
        { kind: "narrate", text: "Pulseless. This is a code now." },
      ],
    },
    {
      id: "r-code-fail",
      when: { actionNotTakenBySec: { action: "start_cpr", sec: 360 } },
      effects: [{ kind: "endRun", outcome: "deteriorated" }],
    },
    {
      id: "r-cpr",
      when: { actionTaken: "start_cpr" },
      effects: [
        { kind: "narrate", text: "CPR in progress, code team at the bedside. The outcome now is out of your hands - but you recognized it and acted." },
        { kind: "endRun", outcome: "deteriorated" },
      ],
    },
    {
      // Stabilization: pressure climbs past 102 - which the pressor alone
      // (caps at 100) cannot do; it takes the blood. So he only truly turns
      // the corner once the transfusion is running, which is the teaching point.
      id: "r-recover",
      when: { vitalsCross: { key: "sbp", above: 102 } },
      effects: [
        { kind: "setVitalText", key: "loc", value: "alert" },
        { kind: "narrate", text: "Pressure holding above 100, sat in the mid-90s, mentation clearing. \"You caught how sick he was and moved fast,\" the provider says." },
        { kind: "endRun", outcome: "stabilized" },
      ],
    },
  ],
  rubric: [
    {
      decisionId: "d-recognize",
      label: "Recognize shock from the partial picture (thready pulse, no NIBP, pallor)",
      ncjmmStep: "recognize-cues",
      clientNeed: "physiological-adaptation",
      correctActions: ["check_vitals", "assess_perfusion"],
      opensAtSec: 0,
      windowSec: 90,
      errorTypeIfMissed: "missed_cue",
      weight: 1.5,
      citation: "Compensated→decompensated hypovolemic shock; the atenolol blunts the tachycardia, so pallor + unrecordable NIBP carry the diagnosis.",
    },
    {
      decisionId: "d-source",
      label: "Identify the GI bleed source",
      ncjmmStep: "analyze-cues",
      clientNeed: "reduction-of-risk",
      correctActions: ["assess_bleeding"],
      opensAtSec: 0,
      windowSec: 180,
      errorTypeIfMissed: "missed_cue",
      weight: 1,
      citation: "Coffee-ground emesis with clots + varices history = upper GI hemorrhage.",
    },
    {
      decisionId: "d-oxygen",
      label: "High-flow oxygen for the hypoxemia",
      ncjmmStep: "take-actions",
      clientNeed: "physiological-adaptation",
      correctActions: ["apply_oxygen"],
      opensAtSec: 0,
      windowSec: 150,
      errorTypeIfMissed: "under_treatment",
      weight: 1,
      citation: "SpO2 84 on room air; NRB at 10 L brings it to the mid-90s (source-grid modifier).",
    },
    {
      decisionId: "d-fluids",
      label: "Open fluids through the existing access - do not wait",
      ncjmmStep: "take-actions",
      clientNeed: "physiological-adaptation",
      correctActions: ["start_fluids"],
      opensAtSec: 0,
      windowSec: 240,
      errorTypeIfMissed: "unsafe_delay",
      weight: 2,
      citation: "An INT is already in place; volume is the first resuscitation lever while help and blood are coming.",
    },
    {
      decisionId: "d-escalate",
      label: "Escalate with SBAR for orders (pressor, blood)",
      ncjmmStep: "take-actions",
      clientNeed: "management-of-care",
      correctActions: ["notify_provider"],
      opensAtSec: 0,
      windowSec: 240,
      errorTypeIfMissed: "unsafe_delay",
      weight: 2,
      citation: "The RN needs orders for the pressor and the STAT transfusion; escalate early, in parallel with fluids and O2.",
    },
    {
      decisionId: "d-blood",
      label: "Give blood - saline can't replace what he's losing",
      ncjmmStep: "generate-solutions",
      clientNeed: "pharmacological-therapies",
      correctActions: ["give_blood"],
      afterFlag: "provider_notified",
      windowSec: 180,
      errorTypeIfMissed: "under_treatment",
      weight: 1.5,
      citation: "Ongoing hemorrhage needs blood products; crystalloid alone dilutes and buys only minutes.",
    },
    {
      decisionId: "d-reassess",
      label: "Reassess after the interventions",
      ncjmmStep: "evaluate-outcomes",
      clientNeed: "physiological-adaptation",
      correctActions: ["check_vitals"],
      afterFlag: "fluids_running",
      windowSec: 260,
      errorTypeIfMissed: "missed_cue",
      weight: 1,
    },
  ],
  debrief: {
    outcomeSummaries: {
      stabilized:
        "Ray stabilized. You recognized shock from a partial, ugly picture - a beta-blocked patient whose only tell was pallor and an unreadable pressure - and ran the resuscitation in parallel instead of in sequence. That is the whole skill.",
      deteriorated:
        "Ray arrested. In this patient the compensation was already spent at the door; every minute without volume and escalation was borrowed. Find the point where the picture was already 'shock' and you were still gathering data.",
      time_end:
        "The resuscitation stalled and time ran out. Compare your timeline to the optimal path - what would you start in the first two minutes next time?",
    },
    optimalTimeline: [
      { atSec: 0, label: "Vitals + perfusion - name the shock", actionId: "assess_perfusion" },
      { atSec: 30, label: "High-flow O2", actionId: "apply_oxygen" },
      { atSec: 60, label: "Fluids wide open through the INT", actionId: "start_fluids" },
      { atSec: 100, label: "SBAR - get pressor + blood orders", actionId: "notify_provider" },
      { atSec: 170, label: "Norepinephrine started", actionId: "give_pressor" },
      { atSec: 230, label: "Whole blood hanging", actionId: "give_blood" },
      { atSec: 320, label: "Reassess - pressure and mentation recovering", actionId: "check_vitals" },
    ],
  },
  narration: [
    { id: "a-hv-p0", text: "I've been throwing up all day... something's wrong." },
    { id: "a-hv-orders", text: "Upper GI bleed in shock. One liter of saline wide open, start norepinephrine at 5 micrograms a minute, and I'm calling the blood bank for STAT whole blood. Keep his sat in the mid-90s." },
    { id: "a-hv-feel", text: "Dizzy... cold... my mouth tastes like metal." },
  ],
  patientResponses: [
    { match: ["feel", "how", "doing"], text: "Dizzy... cold... my mouth tastes like metal.", audioId: "a-hv-feel" },
    { match: ["vomit", "throw", "blood"], text: "It started brown... now there's red in it." },
    { match: ["drink", "alcohol", "beer"], text: "A twelve pack a day. Twenty years. I know." },
    { match: ["pain", "hurt"], text: "No real pain. Just weak. Like I'm draining out." },
    { match: ["name", "who"], text: "Ray... Ray Delgado." },
  ],
};
