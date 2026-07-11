// ───────────────────────────────────────────────────────────────────────────
// Virtual Patient scenario schema - the authoring format for browser-first
// patient simulations. Written to be SME-editable: a clinical reviewer reads
// "if fluids are not started by 240s, SBP ramps to 82 over 120s" as ONE rule,
// no code. The engine (src/lib/vpatient/engine.ts) is a pure reducer over this
// schema; scoring (src/lib/vpatient/score.ts) maps a finished run onto the
// NCSBN blueprint (by_client_need), the NCJMM steps (by_cjmm), and the
// walkthrough reasoning-error taxonomy - so a sim run feeds readiness,
// auto-remediation, and the instructor copilot through the EXISTING
// assessment-results pipeline (kind: "simulation").
//
// QA: mirrors the walkthrough workflow. Scenarios ship at status "draft" and
// are invisible to learners until "approved" by a clinical SME. Rubric time
// windows must cite their clinical source in comments (e.g. Surviving Sepsis
// Campaign hour-1 bundle), scaled for teaching-run time compression.
//
// No TS enums (string-literal unions, repo convention). No Dates, no
// randomness anywhere in the schema or engine - runs are deterministic and
// replayable from the action log.
// ───────────────────────────────────────────────────────────────────────────

import type { ClientNeed, CjmmStep } from "../../types/question";
import type { ErrorType } from "../../lib/walkthrough";

// ── Patient state ────────────────────────────────────────────────────────────

/** Numeric vitals the engine can ramp. Superset of VitalSample in vitals.ts so
 *  the props-driven VitalsDisplay can render either source. */
export interface VitalsNumeric {
  hr: number; //    bpm
  sbp: number; //   mmHg
  dbp: number; //   mmHg
  rr: number; //    breaths/min
  spo2: number; //  %
  tempC: number; // °C
  pain: number; //  0-10 self-report
}

/** Categorical state - set by effects, never ramped. */
export interface VitalsText {
  rhythm: string; // e.g. "Sinus tachycardia"
  loc: "alert" | "confused" | "lethargic" | "unresponsive";
}

export type VitalsState = VitalsNumeric & VitalsText;
export type NumericVitalKey = keyof VitalsNumeric;

// ── Cues (what a learner can notice) ─────────────────────────────────────────

/** Where a cue surfaces. monitor/patient/chart cues auto-reveal when their
 *  phase begins; "assessment" cues reveal ONLY when an action lists them in
 *  `reveals` - you have to look to find them, like the real job. */
export type CueChannel = "monitor" | "patient" | "chart" | "assessment";

export interface Cue {
  id: string;
  text: string;
  channel: CueChannel;
  /** Critical cues appear in the debrief as caught/missed. */
  critical?: boolean;
}

// ── Actions (the learner's whole verb set) ───────────────────────────────────

export type ActionCategory = "assess" | "intervene" | "med" | "communicate";

/** Interprofessional roles a scenario's team can include - the people a nurse
 *  transitioning to US practice must learn to work with and escalate to. */
export type TeamRoleKind =
  | "charge_nurse"
  | "physician"
  | "pharmacist"
  | "respiratory_therapist"
  | "rapid_response"
  | "provider_on_call"
  | "social_work"
  | "case_manager";

export interface TeamMember {
  id: string;
  role: TeamRoleKind;
  name: string; //          "Dr. Patel (hospitalist)"
  /** How the learner reaches them in this setting. */
  reachableVia: "in_person" | "phone" | "page" | "secure_chat";
}

export interface ActionDef {
  id: string;
  label: string; //             "Draw blood cultures"
  category: ActionCategory;
  /** For communicate-category actions: which team member this contacts. Drives
   *  the interprofessional-communication scoring + the 3D cast. */
  targetRole?: TeamRoleKind;
  /** Seconds the nurse is occupied; no other action can start meanwhile. */
  durationSec: number;
  /** Optional lockout before the same action can repeat (e.g. reassess). */
  cooldownSec?: number;
  /** Cue ids revealed by performing this action (assessment-channel cues). */
  reveals?: string[];
  /** Gate: action unavailable until this flag is set (e.g. "provider_notified"
   *  before antibiotics - an RN needs the order). */
  requiresFlag?: string;
  /** If true the action can be taken repeatedly (subject to cooldown). */
  repeatable?: boolean;
}

// ── Labs (the biology the learner has to interpret) ──────────────────────────

/** How a resulted value compares to its reference range. */
export type LabFlag = "normal" | "high" | "low" | "critical-high" | "critical-low" | "abnormal";

/** One resulted analyte. Numeric values are flagged against the reference +
 *  critical thresholds; string values (e.g. a culture result) carry an explicit
 *  `flag`. These are exactly the numbers a physiology engine like Pulse would
 *  produce offline - see docs/PULSE_INTEGRATION.md. */
export interface LabValue {
  id: string;
  label: string; //             "Lactate", "WBC", "pH"
  value: number | string;
  unit?: string; //             "mmol/L"
  refLow?: number;
  refHigh?: number;
  criticalLow?: number;
  criticalHigh?: number;
  /** Force a flag for qualitative / author-specified results. */
  flag?: LabFlag;
}

/** A panel the learner can ORDER; results land after `resultDelaySec` (labs
 *  take time - part of the teaching). */
export interface LabPanel {
  id: string;
  label: string; //             "VBG + lactate", "CBC", "BMP"
  /** The action id whose dispatch orders this panel. */
  orderActionId: string;
  resultDelaySec: number; //    turnaround before results post
  values: LabValue[];
  /** Optional cue revealed + narrated when the results land. */
  resultCueId?: string;
}

// ── Phases (the clock-driven baseline story) ─────────────────────────────────

export interface PatientLine {
  text: string;
  /** Pre-generated TTS clip id (audio pipeline: id → asset). */
  audioId?: string;
}

export interface Phase {
  id: string;
  atSec: number;
  /** Ramp targets applied on phase entry: each numeric key drifts linearly to
   *  its target over `overSec` (defaults to the gap to the next phase). */
  vitalsDrift?: { targets: Partial<VitalsNumeric>; overSec: number };
  cues?: Cue[];
  patientLine?: PatientLine;
}

// ── Branch rules (action/inaction/physiology → consequences) ─────────────────

/** Exactly ONE `when` trigger per rule. Rules fire at most once. */
export interface BranchRule {
  id: string;
  when: {
    /** Fires the moment the learner takes this action. */
    actionTaken?: string;
    /** Fires when the clock passes `sec` and the action was never taken. */
    actionNotTakenBySec?: { action: string; sec: number };
    /** Fires when a numeric vital crosses the bound. */
    vitalsCross?: { key: NumericVitalKey; below?: number; above?: number };
    /** Fires the moment another rule/effect sets this flag. */
    flagSet?: string;
    /** For actionTaken: only fire when this flag is NOT set at that moment
     *  (e.g. antibiotics given while "cultures_drawn" absent). */
    unlessFlag?: string;
  };
  effects: Effect[];
}

export type Effect =
  | { kind: "vitalsRamp"; key: NumericVitalKey; target: number; overSec: number }
  | { kind: "setVitalText"; key: keyof VitalsText; value: string }
  | { kind: "setFlag"; flag: string }
  | { kind: "unlockAction"; actionId: string }
  | { kind: "narrate"; text: string; audioId?: string }
  | { kind: "revealCue"; cueId: string }
  | { kind: "endRun"; outcome: RunOutcome };

export type RunOutcome = "stabilized" | "deteriorated" | "time_end";

// ── Rubric (where the learning is scored) ────────────────────────────────────

/**
 * One clinical decision point. `correctActions` = any-of satisfies it.
 * Timing: the window opens at run start, at `opensAtSec`, or when `afterFlag`
 * is set (e.g. "within 240s of hypotension onset"); it spans `windowSec`.
 * Acting after the window = "late" (half credit); never = "missed";
 * a `harmfulActions` hit or `failIfFlag` = "harmful" (zero + its own tag).
 */
export interface RubricEntry {
  decisionId: string;
  label: string; //             debrief row title, e.g. "Escalate with SBAR"
  ncjmmStep: CjmmStep;
  clientNeed: ClientNeed;
  correctActions: string[];
  harmfulActions?: string[];
  /** Verdict is "harmful" if this flag ended up set - for sequencing errors a
   *  single action can't express (e.g. antibiotics before cultures, captured
   *  by an unlessFlag rule that sets "abx_before_cultures"). */
  failIfFlag?: string;
  opensAtSec?: number;
  afterFlag?: string;
  windowSec?: number;
  errorTypeIfMissed: ErrorType;
  errorTypeIfHarmful?: ErrorType;
  weight: number; //            relative weight within its dimensions
  /** Marks a decision as an interprofessional-COMMUNICATION beat (SBAR,
   *  right-person escalation, de-escalation) - rolled up as its own lens so
   *  transition-to-US-practice communication is scored explicitly. */
  communication?: boolean;
  /** Clinical source for the window/decision - shown to SMEs, kept honest. */
  citation?: string;
}

// ── Debrief + narration + canned patient voice ───────────────────────────────

export interface DebriefSpec {
  /** One narrative frame per outcome, spoken/shown at the top of the debrief. */
  outcomeSummaries: Record<RunOutcome, string>;
  /** The optimal timeline the learner's run is diffed against. */
  optimalTimeline: { atSec: number; label: string; actionId?: string }[];
}

export interface NarrationClip {
  id: string; //  audio asset id (TTS batch-generated after approval)
  text: string;
}

/** v1 PatientVoice: keyword-matched canned Q&A ("how do you feel?"). The
 *  player exposes ask(q) behind the PatientVoice interface; v2 swaps in the
 *  Core model-gateway conversational agent with no schema change. */
export interface PatientResponse {
  match: string[]; // lowercase keywords, any-of
  text: string;
  audioId?: string;
}

// ── Chart (reuses the NgnCase tab pattern) ───────────────────────────────────

export interface ChartTab {
  id: string;
  label: string; // "Nurses' Notes" | "Labs" | "Orders" | "History"
  body: string; //  markdown-lite paragraphs
}

// ── The scenario ─────────────────────────────────────────────────────────────

export type ScenarioStatus = "draft" | "sme_reviewed" | "approved";

/** Optional review-packet metadata (for the SME's human-readable one-pager and,
 *  later, multi-role sims). None of it affects the runtime engine. */
export interface TeamRole {
  role: string; //          "Primary RN" | "Charge nurse" | "Provider" | "RT"
  responsibility: string;
}
export interface EscalationStep {
  trigger: string; //       "SBP < 90 or no improvement in 10 min"
  contact: string; //       "Provider (Dr. on call)"
  sbar: string; //          the expected SBAR summary
}

export interface VPatientScenario {
  id: string; //                "vp-sepsis-01"
  title: string;
  status: ScenarioStatus; //    learners see ONLY "approved"
  setting: string; //           "Med-surg, post-op day 2, 0700"
  clientNeed: ClientNeed; //    primary blueprint category (for the launcher)
  patient: {
    name: string;
    age: number;
    sex: string;
    history: string[];
    allergies: string[];
    meds: string[];
    chart: ChartTab[];
  };
  initialVitals: VitalsState;
  durationSec: number; //       8-12 min teaching runs
  phases: Phase[];
  actions: ActionDef[];
  /** Actions locked at start (revealed via unlockAction effects). */
  lockedActionIds?: string[];
  rules: BranchRule[];
  rubric: RubricEntry[];
  debrief: DebriefSpec;
  narration: NarrationClip[];
  patientResponses: PatientResponse[];
  /** Lab panels the learner can order + interpret during the run. */
  labPanels?: LabPanel[];
  /** The care setting (unit) - organizes the library + selects the 3D env. */
  careSettingId?: string;
  /** Optional cast-registry persona this patient is played by. Drives the
   *  swappable MetaHuman on screen and (for generated scenarios) the physiology
   *  projection. Recasting = changing this id. */
  personaId?: string;
  /** The interprofessional team the learner works with in this scenario. */
  team?: TeamMember[];
  /** Review-packet extras (optional; never touch the engine). */
  teamRoles?: TeamRole[];
  escalationChain?: EscalationStep[];
}
