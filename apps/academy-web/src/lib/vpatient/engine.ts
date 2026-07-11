// ───────────────────────────────────────────────────────────────────────────
// Virtual-patient engine - a PURE reducer over VPatientScenario.
//
// No Date.now, no randomness, no timers: the player calls tick(state) once a
// second (1 Hz keeps low-end Android happy) and dispatch(state, actionId) on
// taps. Same scenario + same action log ⇒ the same run, always - which is
// what makes runs replayable in the debrief and the whole thing testable
// headless (engine.test.ts drives a full sepsis run without a DOM).
//
// State is plain JSON (no Sets/Maps) so it can be snapshotted, replayed, and
// eventually resumed. flagsSetAt doubles as the flag set AND its timestamp -
// scoring needs "when did hypotension start" for afterFlag rubric windows.
// ───────────────────────────────────────────────────────────────────────────

import type {
  ActionDef,
  BranchRule,
  Effect,
  NumericVitalKey,
  RunOutcome,
  VPatientScenario,
  VitalsState,
} from "../../data/vpatient/types";

export interface ActiveRamp {
  key: NumericVitalKey;
  from: number;
  to: number;
  startSec: number;
  endSec: number;
}

export interface SimState {
  clockSec: number;
  vitals: VitalsState;
  /** Vitals as of the PREVIOUS tick - vitalsCross rules fire on crossings. */
  prevVitals: VitalsState;
  /** flag → clockSec when it was set. Presence = set. */
  flagsSetAt: Record<string, number>;
  revealedCueIds: string[];
  actionLog: { actionId: string; atSec: number }[];
  activeRamps: ActiveRamp[];
  firedRuleIds: string[];
  unlockedActionIds: string[];
  /** actionId → clockSec when it may run again. */
  actionCooldowns: Record<string, number>;
  /** The nurse is occupied until this clock value (null = free). */
  busyUntilSec: number | null;
  narrationLog: { text: string; audioId?: string; atSec: number }[];
  /** Lab panels ordered but not yet resulted (results post at resultsAtSec). */
  orderedLabs: { panelId: string; orderedAtSec: number; resultsAtSec: number }[];
  /** Panel ids whose results have posted (viewable in the labs/chart). */
  resultedLabPanelIds: string[];
  ended: { outcome: RunOutcome; atSec: number } | null;
  /** Set by the player when hints were used - down-weighted downstream. */
  hinted: boolean;
}

export type DispatchRejection =
  | "ended"
  | "busy"
  | "unknown_action"
  | "locked"
  | "missing_flag"
  | "cooldown"
  | "not_repeatable";

export interface DispatchResult {
  state: SimState;
  ok: boolean;
  rejection?: DispatchRejection;
}

// ── init ─────────────────────────────────────────────────────────────────────

export function init(scenario: VPatientScenario): SimState {
  const state: SimState = {
    clockSec: 0,
    vitals: { ...scenario.initialVitals },
    prevVitals: { ...scenario.initialVitals },
    flagsSetAt: {},
    revealedCueIds: [],
    actionLog: [],
    activeRamps: [],
    firedRuleIds: [],
    unlockedActionIds: [],
    actionCooldowns: {},
    busyUntilSec: null,
    narrationLog: [],
    orderedLabs: [],
    resultedLabPanelIds: [],
    ended: null,
    hinted: false,
  };
  enterPhases(state, scenario); // phase(s) at t=0
  return state;
}

// ── tick (1 Hz) ──────────────────────────────────────────────────────────────

export function tick(state: SimState, scenario: VPatientScenario): SimState {
  if (state.ended) return state;
  const s: SimState = {
    ...state,
    prevVitals: { ...state.vitals },
    vitals: { ...state.vitals },
    clockSec: state.clockSec + 1,
    activeRamps: [...state.activeRamps],
    narrationLog: [...state.narrationLog],
    revealedCueIds: [...state.revealedCueIds],
    firedRuleIds: [...state.firedRuleIds],
    unlockedActionIds: [...state.unlockedActionIds],
    flagsSetAt: { ...state.flagsSetAt },
    orderedLabs: [...state.orderedLabs],
    resultedLabPanelIds: [...state.resultedLabPanelIds],
  };
  if (s.busyUntilSec !== null && s.clockSec >= s.busyUntilSec) s.busyUntilSec = null;
  enterPhases(s, scenario);
  applyRamps(s);
  resultDueLabs(s, scenario);
  evaluateRules(s, scenario, null);
  if (!s.ended && s.clockSec >= scenario.durationSec) {
    s.ended = { outcome: "time_end", atSec: s.clockSec };
  }
  return s;
}

// ── dispatch (learner takes an action) ───────────────────────────────────────

export function dispatch(
  state: SimState,
  scenario: VPatientScenario,
  actionId: string,
): DispatchResult {
  if (state.ended) return { state, ok: false, rejection: "ended" };
  if (state.busyUntilSec !== null && state.clockSec < state.busyUntilSec)
    return { state, ok: false, rejection: "busy" };
  const action = scenario.actions.find((a) => a.id === actionId);
  if (!action) return { state, ok: false, rejection: "unknown_action" };
  if (isLocked(state, scenario, action)) return { state, ok: false, rejection: "locked" };
  if (action.requiresFlag && state.flagsSetAt[action.requiresFlag] === undefined)
    return { state, ok: false, rejection: "missing_flag" };
  const readyAt = state.actionCooldowns[actionId];
  if (readyAt !== undefined && state.clockSec < readyAt)
    return { state, ok: false, rejection: "cooldown" };
  if (!action.repeatable && state.actionLog.some((e) => e.actionId === actionId))
    return { state, ok: false, rejection: "not_repeatable" };

  const s: SimState = {
    ...state,
    vitals: { ...state.vitals },
    prevVitals: { ...state.prevVitals },
    actionLog: [...state.actionLog, { actionId, atSec: state.clockSec }],
    revealedCueIds: [...state.revealedCueIds],
    firedRuleIds: [...state.firedRuleIds],
    unlockedActionIds: [...state.unlockedActionIds],
    actionCooldowns: { ...state.actionCooldowns },
    activeRamps: [...state.activeRamps],
    narrationLog: [...state.narrationLog],
    flagsSetAt: { ...state.flagsSetAt },
    orderedLabs: [...state.orderedLabs],
    resultedLabPanelIds: [...state.resultedLabPanelIds],
    busyUntilSec: state.clockSec + Math.max(0, action.durationSec),
  };
  if (action.cooldownSec) s.actionCooldowns[actionId] = s.clockSec + action.cooldownSec;
  for (const cueId of action.reveals ?? []) revealCue(s, cueId);
  orderLabsFor(s, scenario, actionId);
  evaluateRules(s, scenario, actionId);
  return { state: s, ok: true };
}

/** Panels whose results have posted, in result order - what the labs view and
 *  the debrief render (each caller flags values via labs.ts). */
export function resultedLabPanels(state: SimState, scenario: VPatientScenario) {
  return state.resultedLabPanelIds
    .map((id) => (scenario.labPanels ?? []).find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);
}

/** Convenience for the player + tests: which actions are tappable right now. */
export function availableActions(state: SimState, scenario: VPatientScenario): ActionDef[] {
  return scenario.actions.filter((a) => {
    if (isLocked(state, scenario, a)) return false;
    if (a.requiresFlag && state.flagsSetAt[a.requiresFlag] === undefined) return false;
    const readyAt = state.actionCooldowns[a.id];
    if (readyAt !== undefined && state.clockSec < readyAt) return false;
    if (!a.repeatable && state.actionLog.some((e) => e.actionId === a.id)) return false;
    return true;
  });
}

// ── internals (mutate the fresh copy the public fns just made) ───────────────

function isLocked(state: SimState, scenario: VPatientScenario, action: ActionDef): boolean {
  return (
    (scenario.lockedActionIds ?? []).includes(action.id) &&
    !state.unlockedActionIds.includes(action.id)
  );
}

function enterPhases(s: SimState, scenario: VPatientScenario): void {
  for (const phase of scenario.phases) {
    if (phase.atSec !== s.clockSec) continue;
    if (phase.vitalsDrift) {
      for (const [key, target] of Object.entries(phase.vitalsDrift.targets)) {
        addRamp(s, key as NumericVitalKey, target as number, phase.vitalsDrift.overSec);
      }
    }
    for (const cue of phase.cues ?? []) {
      // Assessment cues hide until an action reveals them - you have to look.
      if (cue.channel !== "assessment") revealCue(s, cue.id);
    }
    if (phase.patientLine) {
      s.narrationLog.push({
        text: phase.patientLine.text,
        ...(phase.patientLine.audioId ? { audioId: phase.patientLine.audioId } : {}),
        atSec: s.clockSec,
      });
    }
  }
}

function addRamp(s: SimState, key: NumericVitalKey, to: number, overSec: number): void {
  // A new ramp on the same vital replaces the old one, starting from the
  // CURRENT value - so a rescue (fluids) smoothly reverses a deterioration.
  s.activeRamps = s.activeRamps.filter((r) => r.key !== key);
  s.activeRamps.push({
    key,
    from: s.vitals[key],
    to,
    startSec: s.clockSec,
    endSec: s.clockSec + Math.max(1, overSec),
  });
}

function applyRamps(s: SimState): void {
  const remaining: ActiveRamp[] = [];
  for (const r of s.activeRamps) {
    const t = Math.min(1, (s.clockSec - r.startSec) / (r.endSec - r.startSec));
    const value = r.from + (r.to - r.from) * t;
    // One decimal is plenty for a monitor readout and keeps runs replay-stable.
    s.vitals[r.key] = Math.round(value * 10) / 10;
    if (s.clockSec < r.endSec) remaining.push(r);
  }
  s.activeRamps = remaining;
}

function revealCue(s: SimState, cueId: string): void {
  if (!s.revealedCueIds.includes(cueId)) s.revealedCueIds.push(cueId);
}

/** When the ordering action fires, schedule any panel it orders to result after
 *  its turnaround. Ordering the same panel twice is a no-op. */
function orderLabsFor(s: SimState, scenario: VPatientScenario, actionId: string): void {
  for (const panel of scenario.labPanels ?? []) {
    if (panel.orderActionId !== actionId) continue;
    if (s.orderedLabs.some((o) => o.panelId === panel.id)) continue;
    if (s.resultedLabPanelIds.includes(panel.id)) continue;
    s.orderedLabs.push({
      panelId: panel.id,
      orderedAtSec: s.clockSec,
      resultsAtSec: s.clockSec + Math.max(0, panel.resultDelaySec),
    });
  }
}

/** Post any labs whose turnaround has elapsed; reveal the result cue + narrate. */
function resultDueLabs(s: SimState, scenario: VPatientScenario): void {
  for (const order of s.orderedLabs) {
    if (s.clockSec < order.resultsAtSec) continue;
    if (s.resultedLabPanelIds.includes(order.panelId)) continue;
    s.resultedLabPanelIds.push(order.panelId);
    const panel = (scenario.labPanels ?? []).find((p) => p.id === order.panelId);
    if (!panel) continue;
    if (panel.resultCueId) revealCue(s, panel.resultCueId);
    s.narrationLog.push({ text: `Labs resulted: ${panel.label}.`, atSec: s.clockSec });
  }
}

/**
 * Fire every eligible unfired rule, cascading: a setFlag effect can satisfy a
 * flagSet trigger in the same pass (bounded by the rule count - each rule
 * fires at most once per run, so this always terminates).
 */
function evaluateRules(
  s: SimState,
  scenario: VPatientScenario,
  justTookActionId: string | null,
): void {
  let firedSomething = true;
  let firstPass = true;
  while (firedSomething && !s.ended) {
    firedSomething = false;
    for (const rule of scenario.rules) {
      if (s.firedRuleIds.includes(rule.id)) continue;
      if (!ruleTriggers(rule, s, firstPass ? justTookActionId : null)) continue;
      s.firedRuleIds.push(rule.id);
      for (const effect of rule.effects) {
        applyEffect(s, effect);
        if (s.ended) break;
      }
      firedSomething = true;
      if (s.ended) break;
    }
    firstPass = false;
  }
}

function ruleTriggers(rule: BranchRule, s: SimState, justTookActionId: string | null): boolean {
  const w = rule.when;
  if (w.actionTaken !== undefined) {
    if (justTookActionId !== w.actionTaken) return false;
    if (w.unlessFlag && s.flagsSetAt[w.unlessFlag] !== undefined) return false;
    return true;
  }
  if (w.actionNotTakenBySec !== undefined) {
    return (
      s.clockSec >= w.actionNotTakenBySec.sec &&
      !s.actionLog.some((e) => e.actionId === w.actionNotTakenBySec!.action)
    );
  }
  if (w.vitalsCross !== undefined) {
    const { key, below, above } = w.vitalsCross;
    const prev = s.prevVitals[key];
    const now = s.vitals[key];
    // CROSSING semantics: fires on the transition, never on the resting level,
    // so "SBP above 100 → stabilized" can't fire at t=0 on a healthy baseline.
    if (below !== undefined) return prev > below && now <= below;
    if (above !== undefined) return prev < above && now >= above;
    return false;
  }
  if (w.flagSet !== undefined) return s.flagsSetAt[w.flagSet] !== undefined;
  return false;
}

function applyEffect(s: SimState, effect: Effect): void {
  switch (effect.kind) {
    case "vitalsRamp":
      addRamp(s, effect.key, effect.target, effect.overSec);
      break;
    case "setVitalText":
      s.vitals = { ...s.vitals, [effect.key]: effect.value };
      break;
    case "setFlag":
      if (s.flagsSetAt[effect.flag] === undefined) s.flagsSetAt[effect.flag] = s.clockSec;
      break;
    case "unlockAction":
      if (!s.unlockedActionIds.includes(effect.actionId)) s.unlockedActionIds.push(effect.actionId);
      break;
    case "narrate":
      s.narrationLog.push({
        text: effect.text,
        ...(effect.audioId ? { audioId: effect.audioId } : {}),
        atSec: s.clockSec,
      });
      break;
    case "revealCue":
      revealCue(s, effect.cueId);
      break;
    case "endRun":
      s.ended = { outcome: effect.outcome, atSec: s.clockSec };
      break;
  }
}
