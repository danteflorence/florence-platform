// ───────────────────────────────────────────────────────────────────────────
// Playable-scenario generator - turns a compact SEED (which insult, on which
// person, in which unit, how severe) into a full, validator-clean, actually
// PLAYABLE VPatientScenario: a deterioration you must recognize, escalate, and
// treat, with a winnable (stabilized) and a losable (deteriorated) path.
//
// It composes the pieces already built:
//   - castRegistry personas (baseline vitals + physiologic reserve)
//   - the BioGears-derived insult signatures (clinicalModel)
//   - the physiology projector (persona × insult → deterministic trajectory)
//
// This is the engine behind BOTH the batch enrichment of the purchased drafts
// and the Studio "generate a first draft" button. Output is always status
// "draft" - a generated scenario still needs SME eyes before it goes live.
// ───────────────────────────────────────────────────────────────────────────

import type {
  ActionDef,
  BranchRule,
  NumericVitalKey,
  Phase,
  RubricEntry,
  VPatientScenario,
} from "../../data/vpatient/types";
import type { ClientNeed } from "../../types/question";
import { INSULT_BY_ID, INTERVENTION_BY_ID } from "../../data/vpatient/clinicalModel";
import type { InsultCategory } from "../../data/vpatient/clinicalModel";
import { PERSONA_BY_ID, personaModelHint } from "../../data/vpatient/castRegistry";
import { projectInsult, projectIntervention } from "./physiology";

export interface ScenarioSeed {
  id: string;
  title: string;
  insultId: string;
  personaId: string;
  careSettingId: string;
  clientNeed: ClientNeed;
  /** 0..1; seeds default high enough to be losable if ignored. */
  severity: number;
  /** Optional human context to keep from the source draft. */
  setting?: string;
  history?: string[];
  meds?: string[];
}

/** The corrective intervention + a learner-facing verb per insult category.
 *  The recovery ramp of the PRIMARY vital is always applied explicitly, so the
 *  mapped action reliably reverses the deterioration regardless of the
 *  intervention's own effect list. */
const CORRECTIVE: Record<InsultCategory, { interventionId: string; actionId: string; label: string; category: ActionDef["category"] }> = {
  respiratory: { interventionId: "supplemental_oxygen", actionId: "give_oxygen", label: "Apply oxygen + position for breathing", category: "intervene" },
  hemorrhage: { interventionId: "fluid_resuscitation", actionId: "give_fluids", label: "Start the ordered fluid/volume resuscitation", category: "med" },
  infection: { interventionId: "fluid_resuscitation", actionId: "start_bundle", label: "Start the ordered sepsis bundle (fluids + antibiotics)", category: "med" },
  cardiac: { interventionId: "fluid_resuscitation", actionId: "start_acls", label: "Start the ordered emergency management", category: "med" },
  neuro: { interventionId: "supplemental_oxygen", actionId: "protect_airway", label: "Protect the airway + position (HOB up)", category: "intervene" },
  metabolic: { interventionId: "fluid_resuscitation", actionId: "correct_metabolic", label: "Start the ordered correction", category: "med" },
  environmental: { interventionId: "fluid_resuscitation", actionId: "resuscitate", label: "Start the ordered resuscitation", category: "med" },
  pain: { interventionId: "drug_administration", actionId: "give_analgesia", label: "Give the ordered analgesia", category: "med" },
};

/** Pick the vital whose deterioration is the danger signal. Prefer a
 *  desaturation or a falling pressure (the classic crisis drivers). */
function primaryVital(effects: { key: NumericVitalKey; direction: "up" | "down" }[]): { key: NumericVitalKey; badDir: "up" | "down" } {
  const spo2 = effects.find((e) => e.key === "spo2" && e.direction === "down");
  if (spo2) return { key: "spo2", badDir: "down" };
  const sbp = effects.find((e) => e.key === "sbp" && e.direction === "down");
  if (sbp) return { key: "sbp", badDir: "down" };
  const anyDown = effects.find((e) => e.direction === "down");
  if (anyDown) return { key: anyDown.key, badDir: "down" };
  return { key: effects[0].key, badDir: effects[0].direction };
}

function firstMatch(text: string, needles: [RegExp, string][], fallback: string): string {
  for (const [re, val] of needles) if (re.test(text)) return val;
  return fallback;
}

function round(v: number, key: NumericVitalKey): number {
  return key === "tempC" ? Math.round(v * 10) / 10 : Math.round(v);
}

export function buildPlayableScenario(seed: ScenarioSeed): VPatientScenario {
  const insult = INSULT_BY_ID.get(seed.insultId);
  const persona = PERSONA_BY_ID.get(seed.personaId);
  if (!insult) throw new Error(`unknown insult ${seed.insultId}`);
  if (!persona) throw new Error(`unknown persona ${seed.personaId}`);

  const proj = projectInsult(persona, seed.insultId, seed.severity);
  const prim = primaryVital(insult.effects);
  const base = persona.baseline[prim.key];
  const target = (proj.targets[prim.key] ?? base) as number;
  const swing = target - base; // negative for down-bad, positive for up-bad

  // Crisis = 70% of the way to the insult's endpoint (dangerous). Recover =
  // 25% of the way back (safe). Directional so it works up-bad or down-bad.
  const crisisVal = round(base + 0.7 * swing, prim.key);
  const recoverVal = round(base + 0.2 * swing, prim.key);

  const corrective = CORRECTIVE[insult.category];
  const intervention = INTERVENTION_BY_ID.get(corrective.interventionId)!;

  // Categorical baseline: derive rhythm + LOC from the persona and insult.
  const rhythm = firstMatch(
    (insult.textEffects ?? []).join(" ") + " " + insult.nursingFocus,
    [
      [/tachy/i, "Sinus tachycardia"],
      [/asystole|VF|PEA|arrest/i, "Sinus rhythm (watch for arrest)"],
    ],
    persona.baseline.hr > 100 ? "Sinus tachycardia" : "Sinus rhythm",
  );

  const keyCueId = "c-key";
  const phases: Phase[] = [
    {
      id: "p0-baseline",
      atSec: 0,
      cues: [
        { id: "c-opening", text: `${persona.displayName} in ${seed.setting ?? "the unit"} - something is off; look closer.`, channel: "patient", critical: true },
        { id: "c-monitor", text: `Monitor: ${insult.label} picture developing.`, channel: "monitor" },
      ],
      patientLine: { text: "I don't feel right." },
    },
    {
      // Rule-free deterioration by clock: the primary vital drifts toward the
      // insult's endpoint. A correct treatment reverses it (r-treat); ignoring
      // it drives the crisis.
      id: "p1-deteriorating",
      atSec: 30,
      vitalsDrift: { targets: proj.targets, overSec: proj.overSec },
      cues: [{ id: keyCueId, text: `On assessment: ${insult.nursingFocus.split(";")[0]}.`, channel: "assessment", critical: true }],
    },
  ];

  const needsOrder = intervention.requiresOrder;
  const actions: ActionDef[] = [
    { id: "check_vitals", label: "Take a full set of vitals", category: "assess", durationSec: 10, cooldownSec: 20, repeatable: true },
    { id: "focused_assess", label: `Focused assessment (${insult.label})`, category: "assess", durationSec: 15, reveals: [keyCueId] },
    { id: "notify_provider", label: "Notify the provider with SBAR", category: "communicate", durationSec: 30, targetRole: "physician" },
    {
      id: corrective.actionId,
      label: corrective.label,
      category: corrective.category,
      durationSec: 15,
      ...(needsOrder ? { requiresFlag: "provider_notified" } : {}),
    },
    { id: "reassess", label: "Reassess response to treatment", category: "assess", durationSec: 10, repeatable: true },
  ];

  // Recovery ramps: the primary vital explicitly back to baseline (guarantees
  // the corrective reverses the danger), plus the intervention's own effects.
  const ivRamps = projectIntervention(persona, corrective.interventionId, 1);
  const recoveryEffects: BranchRule["effects"] = [
    { kind: "vitalsRamp", key: prim.key, target: base, overSec: 160 },
    ...ivRamps.filter((r) => r.key !== prim.key).map((r) => ({ kind: "vitalsRamp" as const, key: r.key, target: r.target, overSec: r.overSec })),
    { kind: "narrate", text: `${corrective.label} is in; over the next while ${insult.label.toLowerCase()} begins to turn around.` },
  ];

  const rules: BranchRule[] = [
    {
      id: "r-notify",
      when: { actionTaken: "notify_provider" },
      effects: [
        { kind: "setFlag", flag: "provider_notified" },
        { kind: "narrate", text: `Provider: "Good catch - ${corrective.label.toLowerCase()}, and call me back after you reassess."` },
        ...(needsOrder ? [{ kind: "unlockAction" as const, actionId: corrective.actionId }] : []),
      ],
    },
    { id: "r-treat", when: { actionTaken: corrective.actionId }, effects: [{ kind: "setFlag", flag: "treated" }, ...recoveryEffects] },
    {
      id: "r-crisis",
      when: { vitalsCross: prim.badDir === "down" ? { key: prim.key, below: crisisVal } : { key: prim.key, above: crisisVal } },
      effects: [
        { kind: "setVitalText", key: "loc", value: "lethargic" },
        { kind: "narrate", text: `Untreated, ${insult.label.toLowerCase()} has outrun the window - ${persona.displayName} is crashing.` },
        { kind: "endRun", outcome: "deteriorated" },
      ],
    },
    {
      id: "r-recover",
      when: { vitalsCross: prim.badDir === "down" ? { key: prim.key, above: recoverVal } : { key: prim.key, below: recoverVal } },
      effects: [
        { kind: "narrate", text: `Recognized early, escalated, and treated - ${persona.displayName} is stabilizing.` },
        { kind: "endRun", outcome: "stabilized" },
      ],
    },
  ];

  const rubric: RubricEntry[] = [
    {
      decisionId: "d-recognize",
      label: `Recognize the ${insult.label.toLowerCase()} picture`,
      ncjmmStep: "recognize-cues",
      clientNeed: seed.clientNeed,
      correctActions: ["check_vitals", "focused_assess"],
      opensAtSec: 0,
      windowSec: 150,
      errorTypeIfMissed: "missed_cue",
      weight: 1.5,
      citation: insult.nursingFocus,
    },
    {
      decisionId: "d-escalate",
      label: "Escalate to the provider with SBAR",
      ncjmmStep: "take-actions",
      clientNeed: "management-of-care",
      correctActions: ["notify_provider"],
      opensAtSec: 30,
      windowSec: 240,
      errorTypeIfMissed: "unsafe_delay",
      weight: 2,
      communication: true,
      citation: "Timely escalation to the right person is the pivotal action in a deteriorating patient.",
    },
    {
      decisionId: "d-treat",
      label: corrective.label,
      ncjmmStep: "generate-solutions",
      clientNeed: seed.clientNeed,
      correctActions: [corrective.actionId],
      afterFlag: needsOrder ? "provider_notified" : undefined,
      windowSec: 240,
      errorTypeIfMissed: "under_treatment",
      weight: 1.5,
      citation: intervention.nursingFocus,
    },
    {
      decisionId: "d-reassess",
      label: "Reassess the response to treatment",
      ncjmmStep: "evaluate-outcomes",
      clientNeed: seed.clientNeed,
      correctActions: ["reassess"],
      afterFlag: "treated",
      windowSec: 200,
      errorTypeIfMissed: "content_gap",
      weight: 1,
      citation: "Evaluation closes the loop: did the intervention work, or does the plan need to change?",
    },
  ];

  return {
    id: seed.id,
    title: seed.title,
    status: "draft",
    setting: seed.setting ?? "Edit: the unit, time, and situation the learner walks into.",
    clientNeed: seed.clientNeed,
    careSettingId: seed.careSettingId,
    personaId: seed.personaId,
    patient: {
      name: persona.displayName,
      age: persona.age,
      sex: persona.sex,
      history: seed.history?.length ? seed.history : persona.comorbidities,
      allergies: ["No known allergies"],
      meds: seed.meds ?? [],
      chart: [
        { id: "notes", label: "Nurses' Notes", body: `Auto-generated draft from "${seed.title}". SME to refine handoff + chart context.` },
        { id: "history", label: "History", body: `${persona.displayName}. ${persona.comorbidities.join(", ") || "No significant history on file."}` },
      ],
    },
    initialVitals: { ...proj.initialVitals, rhythm, loc: "alert" },
    durationSec: 600,
    phases,
    actions,
    rules,
    rubric,
    debrief: {
      outcomeSummaries: {
        stabilized: `You recognized ${insult.label.toLowerCase()} early, escalated with SBAR, treated, and reassessed - the textbook deteriorating-patient loop.`,
        deteriorated: `${persona.displayName} crashed. Walk the timeline: was the assessment early enough, the escalation timely, the treatment started before the window closed?`,
        time_end: "The run ended with the picture unresolved. What would you assess, escalate, and treat first next time?",
      },
      optimalTimeline: [
        { atSec: 10, label: "Full set of vitals", actionId: "check_vitals" },
        { atSec: 40, label: `Focused assessment - name the ${insult.label.toLowerCase()}`, actionId: "focused_assess" },
        { atSec: 90, label: "SBAR to the provider", actionId: "notify_provider" },
        { atSec: 150, label: corrective.label, actionId: corrective.actionId },
        { atSec: 220, label: "Reassess the response", actionId: "reassess" },
      ],
    },
    narration: [],
    patientResponses: [
      { match: ["feel", "how"], text: "I don't feel right. Something's wrong." },
      { match: ["name", "who"], text: persona.displayName },
    ],
    teamRoles: [{ role: "Registered nurse (you)", responsibility: "Assess, recognize the deterioration, escalate, treat, reassess." }],
  };
}

/** Convenience for callers that want the persona's MetaHuman up front. */
export function seedModelHint(seed: ScenarioSeed): string | undefined {
  const p = PERSONA_BY_ID.get(seed.personaId);
  return p ? personaModelHint(p) : undefined;
}
