// ───────────────────────────────────────────────────────────────────────────
// vp-homehealth-01 - scenario 5: home-health CHF decompensation.
//
// STATUS: approved (operator sign-off 2026-07-10) - live for learners.
//
// This is the INTERPROFESSIONAL / transition-to-US-practice scenario: a
// home-health RN alone in the patient's living room, who must recognize
// decompensating heart failure, escalate BY PHONE to the US physician with a
// clean SBAR (the right person, the right handoff), and coordinate a med change
// with the PHARMACIST - the exact communication + escalation skills an
// internationally-educated nurse needs to work inside a US health system.
// Communication decisions are tagged so they roll up as their own score.
//
// CLINICAL BASIS: post-discharge HFrEF, 3-day weight gain + orthopnea. No
// monitor, no code team, no colleague down the hall - independent judgment and
// telephone escalation are the whole point. ~6:1 time compression.
// ───────────────────────────────────────────────────────────────────────────

import type { VPatientScenario } from "../types";

export const HOMEHEALTH_01: VPatientScenario = {
  id: "vp-homehealth-01",
  title: "A home visit that turns into a phone call",
  // Approved by the operator (Dante, Florence) 2026-07-10 - live for learners.
  status: "approved",
  setting: "The patient's living room, a scheduled home-health visit at 1000, three days after a heart-failure discharge.",
  clientNeed: "physiological-adaptation",
  careSettingId: "home_health",
  team: [
    { id: "md", role: "physician", name: "Dr. Reyes (cardiology, on call)", reachableVia: "phone" },
    { id: "rph", role: "pharmacist", name: "PharmD Nguyen (home-health pharmacy)", reachableVia: "phone" },
    { id: "cm", role: "case_manager", name: "Case manager (agency)", reachableVia: "phone" },
  ],
  patient: {
    name: "Wella Santos",
    age: 68,
    sex: "F",
    history: ["Heart failure with reduced EF (EF 35%)", "Type 2 diabetes", "Discharged 3 days ago after a HF admission"],
    allergies: ["Sulfa"],
    meds: ["Furosemide 40 mg daily", "Carvedilol", "Lisinopril", "Metformin"],
    chart: [
      { id: "notes", label: "Referral / last visit", body: "Home-health referral for HF post-discharge teaching + monitoring. Discharge weight 71 kg. Instructed on daily weights and low-sodium diet." },
      { id: "meds", label: "Med list", body: "Furosemide 40 mg PO daily, carvedilol 12.5 mg BID, lisinopril 10 mg daily, metformin 1000 mg BID." },
      { id: "history", label: "History", body: "68 F, HFrEF EF 35%, T2DM. Lives with her daughter, who works days. English is her second language." },
    ],
  },
  initialVitals: {
    hr: 104,
    sbp: 148,
    dbp: 90,
    rr: 24,
    spo2: 91,
    tempC: 36.8,
    pain: 1,
    rhythm: "Sinus tachycardia",
    loc: "alert",
  },
  durationSec: 600,
  phases: [
    {
      id: "p0-visit",
      atSec: 0,
      cues: [
        { id: "c-breath", text: "Wella, propped on two pillows on the couch: \"I can't lie flat anymore. I've been sleeping sitting up.\"", channel: "patient", critical: true },
        { id: "c-weight", text: "Her home scale reads 76 kg - up 5 kg from her discharge weight three days ago.", channel: "assessment", critical: true },
        { id: "c-crackles", text: "Bibasilar crackles a third of the way up; she's working to breathe.", channel: "assessment", critical: true },
        { id: "c-edema", text: "Pitting edema to mid-shin, worse than the referral noted.", channel: "assessment" },
        { id: "c-diet", text: "A takeout container on the table: instant noodles. \"My daughter's been busy.\"", channel: "assessment", critical: true },
        { id: "c-meds", text: "The furosemide bottle is still full - she wasn't sure she should take it if she felt okay.", channel: "assessment", critical: true },
      ],
      patientLine: { text: "I didn't want to bother anyone. It's just a little hard to breathe.", audioId: "a-hh-p0" },
    },
    {
      // The picture worsens by CLOCK only through what you do or don't do
      // (see r-untreated / r-no-escalation). A phase-level drift here would
      // fight the treatment ramps; keeping the pressure rule-driven means a
      // correct escalation actually gets rewarded with recovery.
      id: "p1-worsening",
      atSec: 180,
      cues: [
        { id: "c-anxious", text: "She's more anxious now, speaking in short phrases.", channel: "patient", critical: true },
      ],
    },
  ],
  actions: [
    { id: "check_vitals", label: "Take a full set of vitals", category: "assess", durationSec: 10, cooldownSec: 30, repeatable: true },
    { id: "check_weight", label: "Check her home weight log", category: "assess", durationSec: 10, reveals: ["c-weight"] },
    { id: "auscultate", label: "Auscultate lungs", category: "assess", durationSec: 15, reveals: ["c-crackles"] },
    { id: "review_meds", label: "Review the med bottles + adherence", category: "assess", durationSec: 15, reveals: ["c-meds", "c-diet"] },
    { id: "assess_edema", label: "Assess edema", category: "assess", durationSec: 10, reveals: ["c-edema"] },
    { id: "position_upright", label: "Sit her fully upright, feet down", category: "intervene", durationSec: 10 },
    { id: "sbar_physician", label: "Phone the physician with SBAR", category: "communicate", durationSec: 30, targetRole: "physician" },
    { id: "call_pharmacist", label: "Call the pharmacist about the diuretic", category: "communicate", durationSec: 20, targetRole: "pharmacist", requiresFlag: "physician_notified" },
    { id: "give_extra_diuretic", label: "Give an extra furosemide dose on your own", category: "med", durationSec: 10 },
    { id: "call_911", label: "Call 911 for transport", category: "communicate", durationSec: 20, requiresFlag: "decompensating" },
    { id: "teach_sodium", label: "Teach sodium + daily weights (with the daughter)", category: "communicate", durationSec: 20 },
  ],
  rules: [
    {
      id: "r-position",
      when: { actionTaken: "position_upright" },
      effects: [
        { kind: "setFlag", flag: "positioned" },
        { kind: "vitalsRamp", key: "spo2", target: 93, overSec: 45 },
        { kind: "narrate", text: "Upright with her feet down, she breathes a little easier - but the fluid is still there." },
      ],
    },
    {
      id: "r-sbar",
      when: { actionTaken: "sbar_physician" },
      effects: [
        { kind: "setFlag", flag: "physician_notified" },
        { kind: "narrate", text: "Dr. Reyes: \"Good catch. Give the furosemide dose she missed, I'll order a short course increase, coordinate it with the pharmacy, and if her sat keeps dropping send her in. Call me back in an hour.\"" },
        { kind: "unlockAction", actionId: "give_extra_diuretic" },
      ],
    },
    {
      // Giving the extra diuretic WITHOUT an order first is out of an RN's home
      // scope - the trap. Only after physician_notified is it "on your own".
      id: "r-diuretic-unordered",
      when: { actionTaken: "give_extra_diuretic", unlessFlag: "physician_notified" },
      effects: [
        { kind: "setFlag", flag: "unordered_med" },
        { kind: "narrate", text: "You gave an extra dose with no order. In the home, on your own, that's outside your scope - the physician needed to make that call." },
      ],
    },
    {
      // Physiologically the extra furosemide helps a fluid-overloaded HF
      // patient breathe - whether or not it was ordered. The SCOPE error of
      // giving it unordered is carried by the rubric (d-scope / unordered_med),
      // not by pretending the drug doesn't work. Recovery is gradual so the
      // teaching + pharmacy-coordination beats land before she stabilizes.
      id: "r-diuretic-ordered",
      when: { actionTaken: "give_extra_diuretic" },
      effects: [
        { kind: "setFlag", flag: "diuretic_given" },
        { kind: "vitalsRamp", key: "spo2", target: 96, overSec: 300 },
        { kind: "vitalsRamp", key: "rr", target: 18, overSec: 200 },
        { kind: "vitalsRamp", key: "hr", target: 92, overSec: 200 },
        { kind: "narrate", text: "The ordered dose is in and coordinated with the pharmacy; over the next while her breathing eases." },
      ],
    },
    {
      id: "r-pharmacist",
      when: { actionTaken: "call_pharmacist" },
      effects: [
        { kind: "setFlag", flag: "pharmacy_coordinated" },
        { kind: "narrate", text: "PharmD Nguyen confirms the temporary dose increase and flags a metformin-hold note - closed loop." },
      ],
    },
    {
      // If the ordered dose never goes in, she tires - a mild worsening that
      // only bites when you HAVEN'T treated. Gated on the action, so a correct
      // run never triggers it.
      id: "r-untreated",
      when: { actionNotTakenBySec: { action: "give_extra_diuretic", sec: 240 } },
      effects: [
        { kind: "vitalsRamp", key: "spo2", target: 82, overSec: 120 },
        { kind: "vitalsRamp", key: "rr", target: 28, overSec: 120 },
        { kind: "narrate", text: "Nothing has changed her fluid status; she's working harder to breathe." },
      ],
    },
    {
      // No phone escalation at all is the dangerous path: in the home YOU are
      // the escalation, and it drives her toward a crash.
      id: "r-no-escalation",
      when: { actionNotTakenBySec: { action: "sbar_physician", sec: 300 } },
      effects: [
        { kind: "setFlag", flag: "decompensating" },
        { kind: "unlockAction", actionId: "call_911" },
        { kind: "vitalsRamp", key: "spo2", target: 72, overSec: 150 },
        { kind: "narrate", text: "No one has been called and she's tiring. In the home, YOU are the escalation - and it hasn't happened." },
      ],
    },
    {
      id: "r-crisis",
      when: { vitalsCross: { key: "spo2", below: 84 } },
      effects: [
        { kind: "setFlag", flag: "decompensating" },
        { kind: "unlockAction", actionId: "call_911" },
        { kind: "setVitalText", key: "loc", value: "lethargic" },
        { kind: "narrate", text: "She's using every muscle to breathe. This has outrun a home visit." },
      ],
    },
    {
      // The fatal floor: if she's allowed to fall this far with no transport,
      // the visit has failed her.
      id: "r-crash",
      when: { vitalsCross: { key: "spo2", below: 74 } },
      effects: [{ kind: "endRun", outcome: "deteriorated" }],
    },
    {
      id: "r-transport",
      when: { actionTaken: "call_911" },
      effects: [
        { kind: "narrate", text: "EMS is on the way. Recognizing that the home was no longer the right place - and getting her moved - is the correct call." },
        { kind: "endRun", outcome: "deteriorated" },
      ],
    },
    {
      id: "r-recover",
      when: { vitalsCross: { key: "spo2", above: 94 } },
      effects: [
        { kind: "narrate", text: "Sat holding in the mid-90s, breathing settled, the plan coordinated across the physician and pharmacy. \"You handled that exactly right,\" Dr. Reyes says on the callback." },
        { kind: "endRun", outcome: "stabilized" },
      ],
    },
  ],
  rubric: [
    {
      decisionId: "d-recognize",
      label: "Recognize decompensation (weight, orthopnea, crackles)",
      ncjmmStep: "recognize-cues",
      clientNeed: "physiological-adaptation",
      correctActions: ["auscultate", "check_weight"],
      opensAtSec: 0,
      windowSec: 150,
      errorTypeIfMissed: "missed_cue",
      weight: 1.5,
      citation: "5 kg over 3 days + orthopnea + crackles = HF decompensation.",
    },
    {
      decisionId: "d-adherence",
      label: "Uncover the adherence + diet story (held diuretic, high-sodium meal)",
      ncjmmStep: "analyze-cues",
      clientNeed: "health-promotion",
      correctActions: ["review_meds"],
      opensAtSec: 0,
      windowSec: 240,
      errorTypeIfMissed: "missed_cue",
      weight: 1,
      citation: "The held furosemide + noodles explain the decompensation - and are the teachable root cause.",
    },
    {
      decisionId: "d-escalate",
      label: "Escalate to the physician by phone with SBAR",
      ncjmmStep: "take-actions",
      clientNeed: "management-of-care",
      correctActions: ["sbar_physician"],
      opensAtSec: 60,
      windowSec: 240,
      errorTypeIfMissed: "unsafe_delay",
      weight: 2,
      communication: true,
      citation: "In the home the RN IS the escalation path; SBAR to the right person (the on-call physician) is the pivotal action.",
    },
    {
      decisionId: "d-scope",
      label: "Don't give an unordered diuretic - get the order first",
      ncjmmStep: "prioritize-hypotheses",
      clientNeed: "safety-infection-control",
      correctActions: ["sbar_physician"],
      // The scope error is specifically the UNORDERED give (the flag), not the
      // act of giving furosemide once the physician has ordered it.
      failIfFlag: "unordered_med",
      errorTypeIfMissed: "scope_error",
      errorTypeIfHarmful: "scope_error",
      weight: 1.5,
      communication: true,
      citation: "A home-health RN can't dose-adjust on their own; the point of the phone call is the order. US-practice scope + escalation.",
    },
    {
      decisionId: "d-pharmacy",
      label: "Close the loop with the pharmacist on the med change",
      ncjmmStep: "generate-solutions",
      clientNeed: "pharmacological-therapies",
      correctActions: ["call_pharmacist"],
      afterFlag: "physician_notified",
      windowSec: 200,
      errorTypeIfMissed: "under_treatment",
      weight: 1,
      communication: true,
      citation: "Interprofessional coordination: the pharmacist verifies the temporary increase + interactions - the US care-team handoff.",
    },
    {
      decisionId: "d-teach",
      label: "Teach sodium + daily weights, involving the daughter",
      ncjmmStep: "evaluate-outcomes",
      clientNeed: "health-promotion",
      correctActions: ["teach_sodium"],
      opensAtSec: 0,
      windowSec: 600,
      errorTypeIfMissed: "content_gap",
      weight: 1,
      communication: true,
      citation: "Family-inclusive teaching in the language the family uses is the prevention that keeps her out of the ED.",
    },
  ],
  debrief: {
    outcomeSummaries: {
      stabilized:
        "Wella stayed home safely. You recognized decompensation alone in her living room, escalated to the physician with a clean SBAR instead of acting outside your scope, coordinated the change with the pharmacist, and taught the family. That is exactly how a nurse works inside a US care team.",
      deteriorated:
        "Wella needed EMS. Sometimes that IS the right call - but walk the timeline: was the phone escalation early enough, or did the home visit try to hold a patient who had already outrun it?",
      time_end:
        "The visit ended with the picture unresolved. In the home you are the whole safety net - what would you phone in, and to whom, in the first five minutes next time?",
    },
    optimalTimeline: [
      { atSec: 0, label: "Vitals + listen to 'I sleep sitting up'", actionId: "check_vitals" },
      { atSec: 30, label: "Lungs + weight log - name the decompensation", actionId: "auscultate" },
      { atSec: 70, label: "Meds reviewed - the held diuretic found", actionId: "review_meds" },
      { atSec: 120, label: "SBAR to the physician by phone", actionId: "sbar_physician" },
      { atSec: 170, label: "Ordered diuretic given", actionId: "give_extra_diuretic" },
      { atSec: 210, label: "Pharmacist loops in on the change", actionId: "call_pharmacist" },
      { atSec: 260, label: "Teach sodium + weights with the daughter", actionId: "teach_sodium" },
    ],
  },
  narration: [
    { id: "a-hh-p0", text: "I didn't want to bother anyone. It's just a little hard to breathe." },
    { id: "a-hh-feel", text: "Tired. And scared, if I'm honest." },
  ],
  patientResponses: [
    { match: ["feel", "how", "doing"], text: "Tired. And scared, if I'm honest.", audioId: "a-hh-feel" },
    { match: ["weight", "scale"], text: "The scale keeps going up. My shoes don't fit." },
    { match: ["medicine", "med", "water pill", "furosemide"], text: "The water pill? I felt alright, so I skipped it. Was that wrong?" },
    { match: ["eat", "salt", "food", "diet"], text: "My daughter's been working late. It's been a lot of takeout." },
    { match: ["name", "who"], text: "Wella. Wella Santos." },
  ],
  teamRoles: [
    { role: "Home-health RN (you)", responsibility: "Assess, recognize deterioration, escalate, coordinate, teach - alone in the home." },
    { role: "On-call physician", responsibility: "Receives the SBAR, orders the med change, decides on transport." },
    { role: "Home-health pharmacist", responsibility: "Verifies the temporary dose change and interactions; closes the loop." },
  ],
  escalationChain: [
    { trigger: "HF decompensation on a home visit (weight/orthopnea/crackles)", contact: "On-call physician, by phone", sbar: "S: post-d/c HF pt, worsening dyspnea. B: EF 35%, up 5 kg in 3 days, held her diuretic. A: bibasilar crackles, SpO2 91 and falling, orthopnea. R: request a diuretic order + plan; will coordinate with pharmacy." },
    { trigger: "SpO2 < 84 or failure to improve", contact: "911 / EMS", sbar: "Decompensated HF outrunning home care; requesting emergency transport." },
  ],
};
