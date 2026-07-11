// ───────────────────────────────────────────────────────────────────────────
// vp-sepsis-01 - GOLD scenario: post-op sepsis recognition + hour-1 bundle.
//
// STATUS: approved (operator sign-off 2026-07-10) - live for learners.
// TTS narration is generated only after approval.
//
// CLINICAL BASIS (windows compressed ~6:1 for a 10-minute teaching run):
//  - Surviving Sepsis Campaign hour-1 bundle: measure lactate, obtain blood
//    cultures BEFORE antimicrobials, administer broad-spectrum antimicrobials,
//    begin 30 mL/kg crystalloid for hypotension/lactate ≥ 4.
//  - Real 60-min recognition→escalation window ≈ 330 sim-seconds here.
//  - Cultures-before-antibiotics is scored as a sequencing decision: giving
//    antimicrobials first sets "abx_before_cultures" via an unlessFlag rule.
// SME review should check every window + vitals trajectory in this file.
// ───────────────────────────────────────────────────────────────────────────

import type { VPatientScenario } from "../types";

export const SEPSIS_01: VPatientScenario = {
  id: "vp-sepsis-01",
  title: "Post-op day 2: something's off",
  // Approved by the operator (Dante, Florence) 2026-07-10 - live for learners.
  status: "approved",
  setting: "Med-surg, post-op day 2 after an open appendectomy. 0700 handoff just ended.",
  clientNeed: "physiological-adaptation",
  careSettingId: "med_surg",
  patient: {
    name: "Rosa Alvarez",
    age: 58,
    sex: "F",
    history: ["Type 2 diabetes", "Hypertension", "Open appendectomy 2 days ago"],
    allergies: ["No known allergies"],
    meds: ["Metformin 1000 mg BID", "Lisinopril 20 mg daily", "Oxycodone 5 mg PRN"],
    chart: [
      {
        id: "notes",
        label: "Nurses' Notes",
        body: "Night shift: slept poorly, c/o chills around 0400. Incision dressing dry and intact at last check (2300). Tolerating clears. IV: 18g left forearm, patent.",
      },
      {
        id: "orders",
        label: "Orders",
        body: "Diet as tolerated. Ambulate TID. Vitals q4h. PRN oxycodone for pain. Call provider for T > 38.5, SBP < 90, HR > 130, or acute change.",
      },
      {
        id: "history",
        label: "History",
        body: "58 F, open appendectomy for perforated appendicitis (POD 2). T2DM (last A1c 8.1), HTN. Lives alone, daughter nearby.",
      },
    ],
  },
  initialVitals: {
    hr: 96,
    sbp: 118,
    dbp: 76,
    rr: 18,
    spo2: 96,
    tempC: 37.6,
    pain: 3,
    rhythm: "Sinus rhythm",
    loc: "alert",
  },
  durationSec: 600,
  phases: [
    {
      id: "p0-baseline",
      atSec: 0,
      cues: [
        { id: "c-chills", text: "Rosa pulls the blanket up: \"I can't get warm.\"", channel: "patient" },
        { id: "c-hr-trend", text: "HR has drifted up through the 90s since 0500.", channel: "monitor" },
        // You have to LOOK to find these - the heart of cue recognition.
        { id: "c-wound", text: "Surgical site: spreading erythema, warmth, purulent drainage at the medial edge.", channel: "assessment", critical: true },
        { id: "c-wbc", text: "This morning's labs: WBC 14.2 (was 9.8 yesterday), lactate pending.", channel: "assessment", critical: true },
        { id: "c-urine", text: "Foley bag: 90 mL over the last 4 hours, dark amber.", channel: "assessment", critical: true },
        { id: "c-lungs", text: "Lungs clear bilaterally, no adventitious sounds.", channel: "assessment" },
        { id: "c-perfusion", text: "Skin warm and flushed, cap refill 3 seconds.", channel: "assessment" },
        { id: "c-confusion", text: "Rosa answers slowly and asks where she is.", channel: "assessment", critical: true },
        // Revealed when the ordered VBG + lactate + CBC results post.
        { id: "c-lab-lactate", text: "VBG/lactate resulted: lactate 4.6 mmol/L, pH 7.30, WBC 15.1 with left shift - the numbers behind the picture.", channel: "assessment", critical: true },
      ],
      patientLine: { text: "Morning... I don't feel right today. Cold, mostly.", audioId: "a-p0-line" },
    },
    {
      id: "p1-fever",
      atSec: 90,
      vitalsDrift: { targets: { tempC: 38.6, hr: 112 }, overSec: 60 },
      cues: [
        { id: "c-rigors", text: "Visible rigors under the blanket.", channel: "patient", critical: true },
      ],
      patientLine: { text: "I feel shivery. Is it cold in here?", audioId: "a-p1-line" },
    },
    {
      id: "p2-early-hypoperfusion",
      atSec: 240,
      vitalsDrift: { targets: { sbp: 96, dbp: 58, hr: 124, rr: 24 }, overSec: 120 },
      cues: [
        { id: "c-bp-drift", text: "BP trending down across the last three cycles.", channel: "monitor", critical: true },
      ],
    },
  ],
  actions: [
    { id: "check_vitals", label: "Take a full set of vitals", category: "assess", durationSec: 10, cooldownSec: 30, repeatable: true },
    { id: "assess_wound", label: "Assess the surgical site", category: "assess", durationSec: 20, reveals: ["c-wound"] },
    { id: "review_labs", label: "Review this morning's labs", category: "assess", durationSec: 10, reveals: ["c-wbc"] },
    { id: "send_labs", label: "Send a VBG + lactate + CBC now", category: "assess", durationSec: 10 },
    { id: "check_urine", label: "Check urine output", category: "assess", durationSec: 10, reveals: ["c-urine"] },
    { id: "auscultate", label: "Auscultate lungs", category: "assess", durationSec: 15, reveals: ["c-lungs"] },
    { id: "assess_perfusion", label: "Assess skin and perfusion", category: "assess", durationSec: 10, reveals: ["c-perfusion"] },
    { id: "notify_provider", label: "SBAR the provider", category: "communicate", durationSec: 30 },
    // Order-gated: an RN needs the provider's orders first (requiresFlag).
    { id: "draw_cultures", label: "Draw blood cultures ×2", category: "intervene", durationSec: 30, requiresFlag: "provider_notified" },
    { id: "give_antibiotics", label: "Start broad-spectrum antibiotics", category: "med", durationSec: 30, requiresFlag: "provider_notified" },
    { id: "give_fluids", label: "Run 30 mL/kg crystalloid bolus", category: "med", durationSec: 30, requiresFlag: "provider_notified" },
    { id: "give_antipyretic", label: "Give PRN acetaminophen", category: "med", durationSec: 15, requiresFlag: "provider_notified" },
    { id: "reposition_patient", label: "Reposition and add a blanket", category: "intervene", durationSec: 10, repeatable: true },
    { id: "apply_oxygen", label: "Apply oxygen 2 L NC", category: "intervene", durationSec: 15 },
  ],
  rules: [
    {
      id: "r-notify",
      when: { actionTaken: "notify_provider" },
      effects: [
        { kind: "setFlag", flag: "provider_notified" },
        {
          kind: "narrate",
          text: "Provider: \"Sounds septic. Blood cultures times two, then start broad-spectrum antibiotics. If that pressure drifts, run thirty per kilo of crystalloid. I'm on my way.\"",
          audioId: "a-orders",
        },
      ],
    },
    {
      id: "r-cultures",
      when: { actionTaken: "draw_cultures" },
      effects: [
        { kind: "setFlag", flag: "cultures_drawn" },
        { kind: "narrate", text: "Two sets of cultures drawn and sent." },
      ],
    },
    {
      // Sequencing error: antimicrobials before cultures contaminates the
      // diagnostic window (SSC: obtain cultures before antimicrobials when it
      // causes no substantial delay).
      id: "r-abx-before-cultures",
      when: { actionTaken: "give_antibiotics", unlessFlag: "cultures_drawn" },
      effects: [
        { kind: "setFlag", flag: "abx_before_cultures" },
        { kind: "narrate", text: "Antibiotics are infusing - but cultures weren't drawn first. The lab won't be able to isolate the organism cleanly." },
      ],
    },
    {
      id: "r-abx",
      when: { actionTaken: "give_antibiotics" },
      effects: [
        { kind: "setFlag", flag: "abx_given" },
        { kind: "narrate", text: "Broad-spectrum antibiotics infusing." },
      ],
    },
    {
      id: "r-fluids",
      when: { actionTaken: "give_fluids" },
      effects: [
        { kind: "setFlag", flag: "fluids_given" },
        { kind: "vitalsRamp", key: "sbp", target: 108, overSec: 90 },
        { kind: "vitalsRamp", key: "dbp", target: 66, overSec: 90 },
        { kind: "vitalsRamp", key: "hr", target: 104, overSec: 120 },
        { kind: "narrate", text: "Bolus running wide open." },
      ],
    },
    {
      // The teaching consequence of not escalating: ~330s ≈ the SSC hour-1
      // recognition→bundle window at this run's time compression. The slow
      // ramp to 72 crosses 90 (→ hypotension, confusion) around 400s and 74
      // (→ shock, run ends deteriorated) around 500s - both rescuable with a
      // bolus at any point in between, which ramps the pressure back up and
      // ends the run stabilized when it crosses 104 on the way back.
      id: "r-no-escalation",
      when: { actionNotTakenBySec: { action: "notify_provider", sec: 330 } },
      effects: [
        { kind: "vitalsRamp", key: "sbp", target: 72, overSec: 180 },
        { kind: "vitalsRamp", key: "rr", target: 28, overSec: 120 },
        { kind: "narrate", text: "She's quieter now. The monitor alarms - pressure sliding." },
      ],
    },
    {
      id: "r-hypotension",
      when: { vitalsCross: { key: "sbp", below: 90 } },
      effects: [
        { kind: "setFlag", flag: "hypotension" },
        { kind: "setVitalText", key: "loc", value: "confused" },
        { kind: "revealCue", cueId: "c-confusion" },
        { kind: "narrate", text: "Rosa picks at her IV line and asks where she is.", audioId: "a-confused" },
      ],
    },
    {
      id: "r-shock",
      when: { vitalsCross: { key: "sbp", below: 74 } },
      effects: [
        { kind: "setVitalText", key: "rhythm", value: "Sinus tachycardia, thready" },
        { kind: "narrate", text: "Rapid response is called. The team takes over the room." },
        { kind: "endRun", outcome: "deteriorated" },
      ],
    },
    {
      // Only reachable after a dip below ~104 and a rescue - crossing
      // semantics mean a healthy baseline can never trip this at t=0.
      id: "r-recover",
      when: { vitalsCross: { key: "sbp", above: 104 } },
      effects: [
        { kind: "narrate", text: "Pressure holding. Rosa's answers are quicker. \"You caught that fast,\" the provider says at the door." },
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
      citation: "Baseline vitals within minutes of an acute-change report - standard deterioration response.",
    },
    {
      decisionId: "d-wound",
      label: "Assess the surgical site",
      ncjmmStep: "recognize-cues",
      clientNeed: "reduction-of-risk",
      correctActions: ["assess_wound"],
      opensAtSec: 0,
      windowSec: 300,
      errorTypeIfMissed: "missed_cue",
      weight: 1,
      citation: "Post-op fever + chills → source assessment; the wound is the most likely source on POD 2.",
    },
    {
      decisionId: "d-labs",
      label: "Connect the lab trend (WBC rising)",
      ncjmmStep: "analyze-cues",
      clientNeed: "reduction-of-risk",
      correctActions: ["review_labs"],
      opensAtSec: 0,
      windowSec: 300,
      errorTypeIfMissed: "missed_cue",
      weight: 1,
    },
    {
      decisionId: "d-escalate",
      label: "Escalate with SBAR once the infection picture forms",
      ncjmmStep: "take-actions",
      clientNeed: "management-of-care",
      correctActions: ["notify_provider"],
      opensAtSec: 90,
      windowSec: 240,
      errorTypeIfMissed: "unsafe_delay",
      weight: 2,
      citation: "SSC hour-1 bundle clock starts at recognition; 90→330s here ≈ the real 60-minute window at 6:1 compression.",
    },
    {
      decisionId: "d-cultures",
      label: "Draw cultures before antibiotics",
      ncjmmStep: "take-actions",
      clientNeed: "safety-infection-control",
      correctActions: ["draw_cultures"],
      failIfFlag: "abx_before_cultures",
      afterFlag: "provider_notified",
      windowSec: 120,
      errorTypeIfMissed: "content_gap",
      errorTypeIfHarmful: "priority_error",
      weight: 1.5,
      citation: "SSC: obtain blood cultures before antimicrobials when no substantial delay results.",
    },
    {
      decisionId: "d-abx",
      label: "Start broad-spectrum antibiotics promptly",
      ncjmmStep: "take-actions",
      clientNeed: "pharmacological-therapies",
      correctActions: ["give_antibiotics"],
      afterFlag: "provider_notified",
      windowSec: 180,
      errorTypeIfMissed: "under_treatment",
      weight: 2,
      citation: "SSC hour-1: administer broad-spectrum antimicrobials.",
    },
    {
      decisionId: "d-fluids",
      label: "Fluid resuscitation once hypotensive",
      ncjmmStep: "take-actions",
      clientNeed: "physiological-adaptation",
      correctActions: ["give_fluids"],
      afterFlag: "hypotension",
      windowSec: 120,
      errorTypeIfMissed: "under_treatment",
      weight: 2,
      citation: "SSC hour-1: begin 30 mL/kg crystalloid for sepsis-induced hypotension.",
    },
    {
      decisionId: "d-reassess",
      label: "Reassess vitals after the bolus",
      ncjmmStep: "evaluate-outcomes",
      clientNeed: "physiological-adaptation",
      correctActions: ["check_vitals"],
      afterFlag: "fluids_given",
      windowSec: 150,
      errorTypeIfMissed: "missed_cue",
      weight: 1,
      citation: "Evaluate response to resuscitation - repeat focused assessment after intervention.",
    },
  ],
  // The biology behind the picture: order a VBG + lactate + CBC and, after a
  // short turnaround, read the numbers. Lactate 4.6 is a critical sepsis cue.
  // (These are authored today; Pulse will generate them offline - see
  // docs/PULSE_INTEGRATION.md.)
  labPanels: [
    {
      id: "vbg-lactate-cbc",
      label: "VBG + lactate + CBC",
      orderActionId: "send_labs",
      resultDelaySec: 60,
      resultCueId: "c-lab-lactate",
      values: [
        { id: "lactate", label: "Lactate", value: 4.6, unit: "mmol/L", refLow: 0.5, refHigh: 2.0, criticalHigh: 4.0 },
        { id: "ph", label: "pH", value: 7.3, refLow: 7.35, refHigh: 7.45 },
        { id: "wbc", label: "WBC", value: 15.1, unit: "10^9/L", refLow: 4.0, refHigh: 11.0 },
        { id: "hco3", label: "HCO3", value: 18, unit: "mmol/L", refLow: 22, refHigh: 26 },
        { id: "gluc", label: "Glucose", value: 148, unit: "mg/dL", refLow: 70, refHigh: 110 },
      ],
    },
  ],
  debrief: {
    outcomeSummaries: {
      stabilized:
        "Rosa stabilized. You recognized a post-op infection turning septic and got the bundle moving before her pressure collapsed. Walk the timeline below against the optimal path.",
      deteriorated:
        "Rosa deteriorated into septic shock and rapid response took over. This debrief is where that run turns into judgment: find the minute the picture was already clear.",
      time_end:
        "Time ran out with Rosa still on the unit. Compare your timeline against the optimal path - what would you do at minute one next time?",
    },
    optimalTimeline: [
      { atSec: 0, label: "Full vitals at the report of chills", actionId: "check_vitals" },
      { atSec: 40, label: "Surgical site assessed - purulent drainage found", actionId: "assess_wound" },
      { atSec: 90, label: "Labs reviewed - WBC trend connected", actionId: "review_labs" },
      { atSec: 150, label: "SBAR to the provider - sepsis named", actionId: "notify_provider" },
      { atSec: 210, label: "Cultures drawn first", actionId: "draw_cultures" },
      { atSec: 260, label: "Broad-spectrum antibiotics started", actionId: "give_antibiotics" },
      { atSec: 340, label: "Bolus at the first pressure drift", actionId: "give_fluids" },
      { atSec: 430, label: "Reassess - pressure and mentation recovering", actionId: "check_vitals" },
    ],
  },
  narration: [
    { id: "a-p0-line", text: "Morning... I don't feel right today. Cold, mostly." },
    { id: "a-p1-line", text: "I feel shivery. Is it cold in here?" },
    { id: "a-orders", text: "Sounds septic. Blood cultures times two, then start broad-spectrum antibiotics. If that pressure drifts, run thirty per kilo of crystalloid. I'm on my way." },
    { id: "a-confused", text: "Rosa picks at her IV line and asks where she is." },
    { id: "a-feel", text: "Cold... shaky. And my belly hurts more than yesterday." },
    { id: "a-pain", text: "It's up to a six now. Deep, not just the incision." },
  ],
  patientResponses: [
    { match: ["feel", "how are you", "doing"], text: "Cold... shaky. And my belly hurts more than yesterday.", audioId: "a-feel" },
    { match: ["pain", "hurt"], text: "It's up to a six now. Deep, not just the incision.", audioId: "a-pain" },
    { match: ["name", "who"], text: "Rosa. Rosa Alvarez." },
    { match: ["drink", "eat", "thirsty"], text: "I had a few sips of juice. Not hungry." },
  ],
};
