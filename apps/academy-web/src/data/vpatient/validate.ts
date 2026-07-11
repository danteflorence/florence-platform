// ───────────────────────────────────────────────────────────────────────────
// Scenario authoring lint. Every scenario ships with a vitest that asserts
// validateScenario(sc) === [] - so a typo'd action id, a rubric window past
// the run length, or an assessment cue nothing reveals fails CI instead of
// silently breaking a class. SME-facing: messages name the offending id.
// ───────────────────────────────────────────────────────────────────────────

import type { VPatientScenario } from "./types";

export function validateScenario(sc: VPatientScenario): string[] {
  const errors: string[] = [];
  const err = (msg: string) => errors.push(msg);

  const actionIds = new Set<string>();
  for (const a of sc.actions) {
    if (actionIds.has(a.id)) err(`duplicate action id "${a.id}"`);
    actionIds.add(a.id);
  }
  const cues = sc.phases.flatMap((p) => p.cues ?? []);
  const cueIds = new Set<string>();
  for (const c of cues) {
    if (cueIds.has(c.id)) err(`duplicate cue id "${c.id}"`);
    cueIds.add(c.id);
  }
  const ruleIds = new Set<string>();
  for (const r of sc.rules) {
    if (ruleIds.has(r.id)) err(`duplicate rule id "${r.id}"`);
    ruleIds.add(r.id);
  }

  // Phases: sorted, start at 0, inside the run.
  if (sc.phases.length === 0 || sc.phases[0].atSec !== 0) err("first phase must be atSec 0");
  for (let i = 1; i < sc.phases.length; i++) {
    if (sc.phases[i].atSec <= sc.phases[i - 1].atSec)
      err(`phase "${sc.phases[i].id}" atSec must increase`);
  }
  for (const p of sc.phases) {
    if (p.atSec >= sc.durationSec) err(`phase "${p.id}" starts after the run ends`);
  }

  // Flags: everything read must be settable by some effect.
  const settableFlags = new Set<string>();
  for (const r of sc.rules)
    for (const e of r.effects) if (e.kind === "setFlag") settableFlags.add(e.flag);
  const readFlag = (flag: string | undefined, where: string) => {
    if (flag && !settableFlags.has(flag)) err(`${where} reads flag "${flag}" no rule ever sets`);
  };

  // Actions: reveal targets exist + are assessment-channel; gates readable.
  const cueById = new Map(cues.map((c) => [c.id, c]));
  for (const a of sc.actions) {
    for (const cueId of a.reveals ?? []) {
      const cue = cueById.get(cueId);
      if (!cue) err(`action "${a.id}" reveals unknown cue "${cueId}"`);
      else if (cue.channel !== "assessment")
        err(`action "${a.id}" reveals "${cueId}" which is channel "${cue.channel}" (auto-revealed) - pointless`);
    }
    readFlag(a.requiresFlag, `action "${a.id}"`);
  }
  // Every assessment cue must be findable - by an action's reveals or a
  // rule's revealCue effect (e.g. confusion surfacing when the BP crashes).
  const revealed = new Set([
    ...sc.actions.flatMap((a) => a.reveals ?? []),
    ...sc.rules.flatMap((r) =>
      r.effects.flatMap((e) => (e.kind === "revealCue" ? [e.cueId] : [])),
    ),
    // A lab panel's result cue is revealed when its results post.
    ...(sc.labPanels ?? []).flatMap((p) => (p.resultCueId ? [p.resultCueId] : [])),
  ]);
  for (const c of cues) {
    if (c.channel === "assessment" && !revealed.has(c.id))
      err(`assessment cue "${c.id}" is revealed by no action or rule - unfindable`);
  }

  // Locked actions must exist and be unlockable.
  const unlockable = new Set<string>();
  for (const r of sc.rules)
    for (const e of r.effects) if (e.kind === "unlockAction") unlockable.add(e.actionId);
  for (const id of sc.lockedActionIds ?? []) {
    if (!actionIds.has(id)) err(`lockedActionIds names unknown action "${id}"`);
    else if (!unlockable.has(id)) err(`locked action "${id}" has no unlockAction effect - dead`);
  }

  // Rules: exactly one trigger, references exist.
  for (const r of sc.rules) {
    const w = r.when;
    const triggers = [w.actionTaken, w.actionNotTakenBySec, w.vitalsCross, w.flagSet].filter(
      (x) => x !== undefined,
    );
    if (triggers.length !== 1) err(`rule "${r.id}" must have exactly one trigger (has ${triggers.length})`);
    if (w.actionTaken !== undefined && !actionIds.has(w.actionTaken))
      err(`rule "${r.id}" triggers on unknown action "${w.actionTaken}"`);
    if (w.actionNotTakenBySec !== undefined) {
      if (!actionIds.has(w.actionNotTakenBySec.action))
        err(`rule "${r.id}" watches unknown action "${w.actionNotTakenBySec.action}"`);
      if (w.actionNotTakenBySec.sec >= sc.durationSec)
        err(`rule "${r.id}" deadline is after the run ends`);
    }
    if (w.unlessFlag !== undefined && w.actionTaken === undefined)
      err(`rule "${r.id}" uses unlessFlag without actionTaken`);
    readFlag(w.flagSet, `rule "${r.id}"`);
    readFlag(w.unlessFlag, `rule "${r.id}"`);
    for (const e of r.effects) {
      if (e.kind === "unlockAction" && !actionIds.has(e.actionId))
        err(`rule "${r.id}" unlocks unknown action "${e.actionId}"`);
      if (e.kind === "revealCue" && !cueById.has(e.cueId))
        err(`rule "${r.id}" reveals unknown cue "${e.cueId}"`);
    }
  }

  // Rubric: references + windows sane.
  const decisionIds = new Set<string>();
  for (const d of sc.rubric) {
    if (decisionIds.has(d.decisionId)) err(`duplicate decision id "${d.decisionId}"`);
    decisionIds.add(d.decisionId);
    for (const id of [...d.correctActions, ...(d.harmfulActions ?? [])]) {
      if (!actionIds.has(id)) err(`decision "${d.decisionId}" references unknown action "${id}"`);
    }
    if (d.correctActions.length === 0) err(`decision "${d.decisionId}" has no correct actions`);
    readFlag(d.afterFlag, `decision "${d.decisionId}"`);
    readFlag(d.failIfFlag, `decision "${d.decisionId}"`);
    if (d.opensAtSec !== undefined && d.opensAtSec >= sc.durationSec)
      err(`decision "${d.decisionId}" opens after the run ends`);
    if (d.weight <= 0) err(`decision "${d.decisionId}" needs a positive weight`);
  }

  // Debrief timeline + narration/audio references.
  for (const t of sc.debrief.optimalTimeline) {
    if (t.actionId && !actionIds.has(t.actionId))
      err(`debrief timeline references unknown action "${t.actionId}"`);
  }
  const narrationIds = new Set(sc.narration.map((n) => n.id));
  const audioRefs: (string | undefined)[] = [
    ...sc.phases.map((p) => p.patientLine?.audioId),
    ...sc.rules.flatMap((r) => r.effects.map((e) => (e.kind === "narrate" ? e.audioId : undefined))),
    ...sc.patientResponses.map((p) => p.audioId),
  ];
  for (const id of audioRefs) {
    if (id && !narrationIds.has(id)) err(`audioId "${id}" has no NarrationClip`);
  }
  for (const p of sc.patientResponses) {
    if (p.match.length === 0) err("a patientResponse has an empty match list");
  }

  // Labs: each panel is ordered by a real action, has values, and sane ranges.
  const panelIds = new Set<string>();
  for (const panel of sc.labPanels ?? []) {
    if (panelIds.has(panel.id)) err(`duplicate lab panel id "${panel.id}"`);
    panelIds.add(panel.id);
    if (!actionIds.has(panel.orderActionId))
      err(`lab panel "${panel.id}" ordered by unknown action "${panel.orderActionId}"`);
    if (panel.values.length === 0) err(`lab panel "${panel.id}" has no values`);
    if (panel.resultCueId && !cueIds.has(panel.resultCueId))
      err(`lab panel "${panel.id}" resultCueId "${panel.resultCueId}" is not a defined cue`);
    for (const v of panel.values) {
      if (v.refLow !== undefined && v.refHigh !== undefined && v.refLow > v.refHigh)
        err(`lab value "${v.id}" has refLow > refHigh`);
    }
  }

  return errors;
}
