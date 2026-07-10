// ───────────────────────────────────────────────────────────────────────────
// vp-hf-01 - scenario 2: acute decompensated heart failure (fluid overload).
//
// STATUS: draft. Invisible to learners until a clinical SME flips it to
// "approved" (same QA gate as walkthroughs).
//
// CLINICAL BASIS (windows compressed ~6:1 for a 10-minute teaching run):
//  - Classic iatrogenic decompensation: HFrEF patient admitted for pneumonia,
//    volume-loaded by IV fluids with antibiotics. Cues: orthopnea, bibasilar
//    crackles, weight up 2.3 kg in 48h, net-positive I&O, JVD.
//  - Management per HF guideline basics: position upright, oxygen for
//    hypoxemia (shunt physiology limits its effect - the teaching point),
//    escalate, IV loop diuretic first-line for congestion, STOP the
//    maintenance fluids. Increasing fluids for "low urine output" is the
//    classic harmful trap - the oliguria is congestion, not dehydration.
// SME review should check every window + vitals trajectory in this file.
// ───────────────────────────────────────────────────────────────────────────

import type { VPatientScenario } from "../types";

export const HF_01: VPatientScenario = {
  id: "vp-hf-01",
  title: "Admitted for pneumonia, drowning quietly",
  status: "draft",
  setting: "Med-surg, hospital day 2 of pneumonia treatment. 0600, night nurse mentions he 'slept sitting up'.",
  clientNeed: "physiological-adaptation",
  patient: {
    name: "Ernesto Cruz",
    age: 71,
    sex: "M",
    history: [
      "Heart failure with reduced EF (EF 30%)",
      "Hypertension",
      "Chronic kidney disease, stage 3",
      "Admitted 2 days ago: community-acquired pneumonia",
    ],
    allergies: ["No known allergies"],
    meds: [
      "IV ceftriaxone (with 100 mL flushes)",
      "Maintenance IV fluids at 100 mL/hr",
      "Home carvedilol, lisinopril (held on admission)",
    ],
    chart: [
      {
        id: "notes",
        label: "Nurses' Notes",
        body: "Night shift: dyspneic when flat, slept in the recliner. Refused breakfast tray at 0530, 'too tired to chew'. IV infusing at 100 mL/hr.",
      },
      {
        id: "orders",
        label: "Orders",
        body: "Ceftriaxone 1 g IV daily. Maintenance NS at 100 mL/hr. Vitals q4h. Call provider for SpO2 < 90, RR > 28, or acute change.",
      },
      {
        id: "history",
        label: "History",
        body: "71 M, HFrEF (EF 30% on last echo), HTN, CKD 3. Lives with his wife; walks to church daily at baseline.",
      },
    ],
  },
  initialVitals: {
    hr: 92,
    sbp: 142,
    dbp: 88,
    rr: 22,
    spo2: 93,
    tempC: 37.1,
    pain: 2,
    rhythm: "Sinus rhythm",
    loc: "alert",
  },
  durationSec: 600,
  phases: [
    {
      id: "p0-baseline",
      atSec: 0,
      cues: [
        { id: "c-orthopnea", text: "Ernesto is propped fully upright: \"I couldn't breathe lying down last night.\"", channel: "patient", critical: true },
        { id: "c-spo2-trend", text: "SpO2 has drifted from 96 to 93 overnight.", channel: "monitor" },
        // The volume picture - you have to LOOK for it.
        { id: "c-crackles", text: "Bibasilar crackles halfway up both lung fields.", channel: "assessment", critical: true },
        { id: "c-weight", text: "Weight log: up 2.3 kg since admission (48 hours).", channel: "assessment", critical: true },
        { id: "c-io", text: "I&O: net positive 2.8 L since admission. Urine output trending down.", channel: "assessment", critical: true },
        { id: "c-jvd", text: "JVD visible at 45 degrees; 2+ pitting edema to the shins.", channel: "assessment" },
        { id: "c-confusion", text: "Ernesto's answers slow; he asks for his wife twice in a minute.", channel: "assessment", critical: true },
      ],
      patientLine: { text: "I'm alright sitting up. Just... don't lay me back.", audioId: "a-hf-p0" },
    },
    {
      id: "p1-decompensation",
      atSec: 120,
      vitalsDrift: { targets: { spo2: 88, rr: 28, hr: 108 }, overSec: 90 },
      cues: [
        { id: "c-accessory", text: "Speaking in three-word sentences now, accessory muscles working.", channel: "patient", critical: true },
      ],
      patientLine: { text: "Can't... quite... get air.", audioId: "a-hf-p1" },
    },
  ],
  actions: [
    { id: "check_vitals", label: "Take a full set of vitals", category: "assess", durationSec: 10, cooldownSec: 30, repeatable: true },
    { id: "auscultate", label: "Auscultate lungs", category: "assess", durationSec: 15, reveals: ["c-crackles"] },
    { id: "check_weights", label: "Check the weight log", category: "assess", durationSec: 10, reveals: ["c-weight"] },
    { id: "check_io", label: "Review I&O totals", category: "assess", durationSec: 10, reveals: ["c-io"] },
    { id: "assess_perfusion", label: "Assess JVD and edema", category: "assess", durationSec: 10, reveals: ["c-jvd"] },
    { id: "raise_hob", label: "Sit him fully upright, legs dependent", category: "intervene", durationSec: 10 },
    { id: "apply_oxygen", label: "Apply oxygen 2 L NC", category: "intervene", durationSec: 15 },
    { id: "slow_iv_fluids", label: "Pause the maintenance fluids and clarify", category: "intervene", durationSec: 10 },
    // The trap: treating the falling urine output as dehydration.
    { id: "increase_fluids", label: "Increase IV rate for low urine output", category: "intervene", durationSec: 15 },
    { id: "notify_provider", label: "SBAR the provider", category: "communicate", durationSec: 30 },
    { id: "give_furosemide", label: "Give IV furosemide 40 mg", category: "med", durationSec: 30, requiresFlag: "provider_notified" },
  ],
  rules: [
    {
      id: "r-position",
      when: { actionTaken: "raise_hob" },
      effects: [
        { kind: "setFlag", flag: "positioned" },
        { kind: "narrate", text: "Fully upright with his legs down, his breathing eases a little." },
      ],
    },
    {
      // Shunt physiology: oxygen helps but cannot fix congestion - the number
      // crawls to the low 90s and stalls. The fix is the diuretic.
      id: "r-oxygen",
      when: { actionTaken: "apply_oxygen" },
      effects: [
        { kind: "setFlag", flag: "oxygen_applied" },
        { kind: "vitalsRamp", key: "spo2", target: 92, overSec: 45 },
        { kind: "narrate", text: "On 2 liters the saturation creeps up, then stalls - the problem is fluid, not FiO2." },
      ],
    },
    {
      id: "r-hold-fluids",
      when: { actionTaken: "slow_iv_fluids" },
      effects: [
        { kind: "setFlag", flag: "fluids_stopped" },
        { kind: "narrate", text: "Maintenance fluids paused pending clarification. The pump goes quiet." },
      ],
    },
    {
      id: "r-extra-fluids",
      when: { actionTaken: "increase_fluids" },
      effects: [
        { kind: "setFlag", flag: "fluids_bolused" },
        { kind: "vitalsRamp", key: "spo2", target: 84, overSec: 90 },
        { kind: "vitalsRamp", key: "rr", target: 32, overSec: 90 },
        { kind: "narrate", text: "More fluid in. Within minutes the crackles march upward and he is working harder to breathe." },
      ],
    },
    {
      id: "r-notify",
      when: { actionTaken: "notify_provider" },
      effects: [
        { kind: "setFlag", flag: "provider_notified" },
        {
          kind: "narrate",
          text: "Provider: \"That is his heart failure, not the pneumonia. IV furosemide forty now, stop the maintenance fluids, strict I&O, portable chest film. Call me with the urine output in an hour.\"",
          audioId: "a-hf-orders",
        },
      ],
    },
    {
      id: "r-furosemide",
      when: { actionTaken: "give_furosemide" },
      effects: [
        { kind: "setFlag", flag: "diuretic_given" },
        { kind: "vitalsRamp", key: "spo2", target: 95, overSec: 120 },
        { kind: "vitalsRamp", key: "rr", target: 20, overSec: 120 },
        { kind: "vitalsRamp", key: "hr", target: 94, overSec: 150 },
        { kind: "narrate", text: "Furosemide in. Twenty minutes later the urinal needs emptying and the crackles are receding." },
      ],
    },
    {
      // Not escalating: congestion keeps winning. ~330s ≈ the real ~1h window
      // between "decompensating" and "in trouble" at this compression.
      id: "r-no-escalation",
      when: { actionNotTakenBySec: { action: "notify_provider", sec: 330 } },
      effects: [
        { kind: "vitalsRamp", key: "spo2", target: 78, overSec: 150 },
        { kind: "vitalsRamp", key: "rr", target: 34, overSec: 150 },
        { kind: "narrate", text: "He stops finishing sentences. The pulse-ox alarm will not stay quiet." },
      ],
    },
    {
      id: "r-resp-distress",
      when: { vitalsCross: { key: "spo2", below: 85 } },
      effects: [
        { kind: "setFlag", flag: "resp_distress" },
        { kind: "setVitalText", key: "loc", value: "confused" },
        { kind: "revealCue", cueId: "c-confusion" },
        { kind: "narrate", text: "He pulls at the cannula, asking for his wife.", audioId: "a-hf-confused" },
      ],
    },
    {
      id: "r-crash",
      when: { vitalsCross: { key: "spo2", below: 80 } },
      effects: [
        { kind: "setVitalText", key: "rhythm", value: "Sinus tachycardia, frequent PVCs" },
        { kind: "narrate", text: "Rapid response is called. BiPAP goes on as the team takes over." },
        { kind: "endRun", outcome: "deteriorated" },
      ],
    },
    {
      // Only reachable on the way UP after a dip - baseline is exactly 93 and
      // crossing semantics require prev < 93.
      id: "r-recover",
      when: { vitalsCross: { key: "spo2", above: 93 } },
      effects: [
        { kind: "narrate", text: "Saturation holding in the mid-90s, sentences back in one breath. \"You knew it was the water,\" he says." },
        { kind: "endRun", outcome: "stabilized" },
      ],
    },
  ],
  rubric: [
    {
      decisionId: "d-vitals",
      label: "Get a full set of vitals early",
      ncjmmStep: "recognize-cues",
      clientNeed: "reduction-of-risk",
      correctActions: ["check_vitals"],
      opensAtSec: 0,
      windowSec: 120,
      errorTypeIfMissed: "missed_cue",
      weight: 1,
    },
    {
      decisionId: "d-lungs",
      label: "Auscultate - find the crackles",
      ncjmmStep: "recognize-cues",
      clientNeed: "physiological-adaptation",
      correctActions: ["auscultate"],
      opensAtSec: 0,
      windowSec: 240,
      errorTypeIfMissed: "missed_cue",
      weight: 1.5,
      citation: "Bibasilar crackles + orthopnea = pulmonary congestion until proven otherwise in HFrEF.",
    },
    {
      decisionId: "d-volume",
      label: "Build the volume picture (weights or I&O)",
      ncjmmStep: "analyze-cues",
      clientNeed: "reduction-of-risk",
      correctActions: ["check_weights", "check_io"],
      opensAtSec: 0,
      windowSec: 300,
      errorTypeIfMissed: "missed_cue",
      weight: 1,
      citation: "Daily weight is the most reliable bedside measure of volume status; 2.3 kg in 48 h is fluid, not food.",
    },
    {
      decisionId: "d-position",
      label: "Position upright before anything else",
      ncjmmStep: "take-actions",
      clientNeed: "basic-care-comfort",
      correctActions: ["raise_hob"],
      opensAtSec: 120,
      windowSec: 120,
      errorTypeIfMissed: "priority_error",
      weight: 1,
      citation: "Positioning is the nurse's first independent action for acute dyspnea - no order required.",
    },
    {
      decisionId: "d-oxygen",
      label: "Oxygen for the hypoxemia",
      ncjmmStep: "take-actions",
      clientNeed: "physiological-adaptation",
      correctActions: ["apply_oxygen"],
      opensAtSec: 120,
      windowSec: 120,
      errorTypeIfMissed: "under_treatment",
      weight: 1.5,
    },
    {
      decisionId: "d-escalate",
      label: "Escalate with SBAR - name the decompensation",
      ncjmmStep: "take-actions",
      clientNeed: "management-of-care",
      correctActions: ["notify_provider"],
      opensAtSec: 120,
      windowSec: 210,
      errorTypeIfMissed: "unsafe_delay",
      weight: 2,
      citation: "120→330s here ≈ the real ~1-hour window between recognized decompensation and needing rescue, at 6:1 compression.",
    },
    {
      decisionId: "d-fluid-mgmt",
      label: "Stop the fluids - do not chase the urine output",
      ncjmmStep: "generate-solutions",
      clientNeed: "reduction-of-risk",
      correctActions: ["slow_iv_fluids"],
      harmfulActions: ["increase_fluids"],
      errorTypeIfMissed: "under_treatment",
      errorTypeIfHarmful: "treating_symptom_not_cause",
      weight: 1.5,
      citation: "Oliguria in decompensated HF is congestion, not dehydration - volume makes it worse.",
    },
    {
      decisionId: "d-diuretic",
      label: "IV loop diuretic once ordered",
      ncjmmStep: "take-actions",
      clientNeed: "pharmacological-therapies",
      correctActions: ["give_furosemide"],
      afterFlag: "provider_notified",
      windowSec: 150,
      errorTypeIfMissed: "under_treatment",
      weight: 2,
      citation: "IV loop diuretics are first-line for congestion in acute decompensated heart failure.",
    },
    {
      decisionId: "d-reassess",
      label: "Reassess after the diuretic",
      ncjmmStep: "evaluate-outcomes",
      clientNeed: "physiological-adaptation",
      correctActions: ["check_vitals"],
      afterFlag: "diuretic_given",
      windowSec: 150,
      errorTypeIfMissed: "missed_cue",
      weight: 1,
    },
  ],
  debrief: {
    outcomeSummaries: {
      stabilized:
        "Ernesto stabilized. You read fluid overload where the chart said pneumonia, and treated the cause instead of the number. Walk your timeline against the optimal path.",
      deteriorated:
        "Ernesto ended up on BiPAP with rapid response in the room. The picture was on the chart by 0600 - find the minute the volume story was already tellable.",
      time_end:
        "The shift moved on with Ernesto still working to breathe. Compare timelines: which cue would have changed your first five minutes?",
    },
    optimalTimeline: [
      { atSec: 0, label: "Vitals + listen to his 'slept sitting up'", actionId: "check_vitals" },
      { atSec: 30, label: "Lungs auscultated - crackles found", actionId: "auscultate" },
      { atSec: 60, label: "Weight log: +2.3 kg in 48 h", actionId: "check_weights" },
      { atSec: 130, label: "Sat him fully upright", actionId: "raise_hob" },
      { atSec: 150, label: "Oxygen on", actionId: "apply_oxygen" },
      { atSec: 180, label: "SBAR: 'this is his heart failure'", actionId: "notify_provider" },
      { atSec: 220, label: "Maintenance fluids stopped", actionId: "slow_iv_fluids" },
      { atSec: 250, label: "IV furosemide given", actionId: "give_furosemide" },
      { atSec: 285, label: "Reassess - sats and work of breathing improving", actionId: "check_vitals" },
    ],
  },
  narration: [
    { id: "a-hf-p0", text: "I'm alright sitting up. Just... don't lay me back." },
    { id: "a-hf-p1", text: "Can't... quite... get air." },
    { id: "a-hf-orders", text: "That is his heart failure, not the pneumonia. IV furosemide forty now, stop the maintenance fluids, strict I&O, portable chest film. Call me with the urine output in an hour." },
    { id: "a-hf-confused", text: "He pulls at the cannula, asking for his wife." },
    { id: "a-hf-feel", text: "Heavy. Like a wet blanket on my chest." },
  ],
  patientResponses: [
    { match: ["feel", "how are you", "doing"], text: "Heavy. Like a wet blanket on my chest.", audioId: "a-hf-feel" },
    { match: ["breath", "air", "lungs"], text: "Better sitting up. Flat, I drown." },
    { match: ["sleep", "night"], text: "In the chair. Third night this week, if I'm honest." },
    { match: ["pain", "hurt"], text: "No pain. Just the weight." },
    { match: ["name", "who"], text: "Ernesto. Ernesto Cruz." },
  ],
};
