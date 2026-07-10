// Headless engine tests - a full sepsis run without a DOM. The reducer is
// pure, so every assertion here is exact and replayable.
import { describe, expect, it } from "vitest";
import { SEPSIS_01 } from "../../data/vpatient/scenarios/sepsis01";
import { availableActions, dispatch, init, tick, type SimState } from "./engine";
import type { VPatientScenario } from "../../data/vpatient/types";

const sc = SEPSIS_01;

/** Drive a run: dispatch scripted [atSec, actionId] pairs, tick to the end.
 *  Defaults to the sepsis scenario; pass `scenario` to drive any other one
 *  (e.g. a difficulty-transformed copy). */
export function runScript(
  script: [number, string][],
  until?: number,
  scenario: VPatientScenario = sc,
): SimState {
  const limit = until ?? scenario.durationSec;
  let s = init(scenario);
  const pending = [...script].sort((a, b) => a[0] - b[0]);
  for (;;) {
    while (pending.length && pending[0][0] <= s.clockSec) {
      const [at, actionId] = pending.shift()!;
      const r = dispatch(s, scenario, actionId);
      if (!r.ok) throw new Error(`dispatch ${actionId} at ${at} (clock ${s.clockSec}): ${r.rejection}`);
      s = r.state;
    }
    if (s.ended || s.clockSec >= limit) return s;
    s = tick(s, scenario);
  }
}

describe("init", () => {
  it("starts from the scenario baseline with only auto-channel cues revealed", () => {
    const s = init(sc);
    expect(s.clockSec).toBe(0);
    expect(s.vitals.sbp).toBe(118);
    expect(s.vitals.loc).toBe("alert");
    expect(s.revealedCueIds).toContain("c-chills"); // patient channel, phase 0
    expect(s.revealedCueIds).toContain("c-hr-trend"); // monitor channel
    expect(s.revealedCueIds).not.toContain("c-wound"); // assessment - must look
    expect(s.revealedCueIds).not.toContain("c-wbc");
  });
});

describe("tick", () => {
  it("ramps phase vitals linearly and lands exactly on target", () => {
    let s = init(sc);
    while (s.clockSec < 150) s = tick(s, sc); // p1 (t=90) drifts over 60s
    expect(s.vitals.tempC).toBe(38.6);
    expect(s.vitals.hr).toBe(112);
  });

  it("is deterministic - identical runs produce identical states", () => {
    const a = runScript([[0, "check_vitals"], [40, "assess_wound"]], 300);
    const b = runScript([[0, "check_vitals"], [40, "assess_wound"]], 300);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("ends the run at durationSec when nothing else ended it first", () => {
    const s = runScript([[0, "check_vitals"], [30, "notify_provider"]]);
    expect(s.ended?.outcome).toBe("time_end");
  });
});

describe("dispatch gating", () => {
  it("rejects order-gated meds until the provider is notified", () => {
    const s = init(sc);
    expect(dispatch(s, sc, "give_antibiotics")).toMatchObject({ ok: false, rejection: "missing_flag" });
    const after = runScript([[0, "notify_provider"]], 40);
    expect(after.flagsSetAt["provider_notified"]).toBe(0);
    expect(dispatch(after, sc, "give_antibiotics").ok).toBe(true);
  });

  it("rejects while the nurse is occupied", () => {
    let s = init(sc);
    s = dispatch(s, sc, "assess_wound").state; // 20s duration
    expect(dispatch(s, sc, "auscultate")).toMatchObject({ ok: false, rejection: "busy" });
  });

  it("enforces cooldown and repeatability", () => {
    // check_vitals: repeatable with a 30s cooldown.
    let s = runScript([[0, "check_vitals"]], 15);
    expect(dispatch(s, sc, "check_vitals")).toMatchObject({ ok: false, rejection: "cooldown" });
    // assess_wound: one-shot.
    s = runScript([[0, "assess_wound"]], 30);
    expect(dispatch(s, sc, "assess_wound")).toMatchObject({ ok: false, rejection: "not_repeatable" });
  });

  it("availableActions hides gated meds until orders exist", () => {
    const ids = availableActions(init(sc), sc).map((a) => a.id);
    expect(ids).toContain("notify_provider");
    expect(ids).not.toContain("give_antibiotics");
  });
});

describe("branching", () => {
  it("actions reveal assessment cues", () => {
    const s = runScript([[0, "assess_wound"]], 30);
    expect(s.revealedCueIds).toContain("c-wound");
  });

  it("unlessFlag: antibiotics before cultures set the sequencing flag", () => {
    const s = runScript([[0, "notify_provider"], [40, "give_antibiotics"], [80, "draw_cultures"]], 150);
    expect(s.flagsSetAt["abx_before_cultures"]).toBeDefined();
    expect(s.flagsSetAt["abx_given"]).toBeDefined();
  });

  it("cultures first: no sequencing flag", () => {
    const s = runScript([[0, "notify_provider"], [40, "draw_cultures"], [80, "give_antibiotics"]], 150);
    expect(s.flagsSetAt["abx_before_cultures"]).toBeUndefined();
  });

  it("total neglect: crash cascade fires in order and ends deteriorated", () => {
    const s = runScript([]);
    expect(s.flagsSetAt["hypotension"]).toBeGreaterThan(330); // after the no-escalation ramp
    expect(s.vitals.loc).toBe("confused");
    expect(s.revealedCueIds).toContain("c-confusion"); // rule-revealed
    expect(s.ended?.outcome).toBe("deteriorated");
    expect(s.ended!.atSec).toBeLessThan(sc.durationSec);
  });

  it("late escalation + bolus rescues the crash into a stabilized end", () => {
    const s = runScript([
      [0, "check_vitals"],
      [40, "assess_wound"],
      [90, "review_labs"],
      [345, "notify_provider"], // late: the crash ramp is already running
      [380, "draw_cultures"],
      [415, "give_antibiotics"],
      [450, "give_fluids"], // after hypotension (~400) - replaces the crash ramp
    ]);
    expect(s.flagsSetAt["hypotension"]).toBeDefined();
    expect(s.ended?.outcome).toBe("stabilized");
  });

  it("timely escalation prevents hypotension entirely", () => {
    const s = runScript([
      [0, "check_vitals"],
      [40, "assess_wound"],
      [90, "review_labs"],
      [150, "notify_provider"],
      [210, "draw_cultures"],
      [260, "give_antibiotics"],
    ]);
    expect(s.flagsSetAt["hypotension"]).toBeUndefined();
    expect(s.ended?.outcome).toBe("time_end");
  });
});
