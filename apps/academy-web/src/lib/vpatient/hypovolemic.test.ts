// Headless clinical-path tests for the hypovolemic-shock scenario (converted
// from a licensed instructor SIF). Teaching point: recognize shock from a
// partial, beta-blocked picture and resuscitate in PARALLEL, not in sequence.
import { describe, expect, it } from "vitest";
import { HYPOVOLEMIC_01 } from "../../data/vpatient/scenarios/hypovolemic01";
import { validateScenario } from "../../data/vpatient/validate";
import { dispatch, init, tick, type SimState } from "./engine";
import { evaluate } from "./score";

const sc = HYPOVOLEMIC_01;

function run(script: [number, string][], until: number = sc.durationSec): SimState {
  let s = init(sc);
  const pending = [...script].sort((a, b) => a[0] - b[0]);
  for (;;) {
    while (pending.length && pending[0][0] <= s.clockSec) {
      const [at, actionId] = pending.shift()!;
      const r = dispatch(s, sc, actionId);
      if (!r.ok) throw new Error(`dispatch ${actionId} at ${at}: ${r.rejection}`);
      s = r.state;
    }
    if (s.ended || s.clockSec >= until) return s;
    s = tick(s, sc);
  }
}
const verdictOf = (ev: ReturnType<typeof evaluate>, id: string) =>
  ev.decisions.find((d) => d.decisionId === id)?.verdict;

describe("vp-hypovolemic-01 (converted from a purchased SIF)", () => {
  it("passes the validator clean", () => {
    expect(validateScenario(sc)).toEqual([]);
  });

  it("parallel resuscitation stabilizes him", () => {
    const state = run([
      [0, "check_vitals"],
      [15, "assess_perfusion"],
      [40, "assess_bleeding"],
      [55, "apply_oxygen"],
      [75, "start_fluids"],
      [100, "notify_provider"],
      [170, "give_pressor"],
      [230, "give_blood"],
      [295, "check_vitals"],
    ]);
    expect(state.ended?.outcome).toBe("stabilized");
    const ev = evaluate(state, sc);
    expect(ev.errorTags).toEqual([]);
    expect(verdictOf(ev, "d-fluids")).toBe("met");
    expect(verdictOf(ev, "d-escalate")).toBe("met");
    expect(verdictOf(ev, "d-blood")).toBe("met");
  });

  it("gathering data without resuscitating ends in PEA arrest", () => {
    // Assess forever, never open fluids → the arrest transition fires.
    const state = run([[0, "check_vitals"], [40, "assess_bleeding"], [80, "assess_perfusion"]]);
    expect(state.flagsSetAt["arrested"]).toBeDefined();
    expect(state.vitals.rhythm).toBe("PEA");
    expect(state.ended?.outcome).toBe("deteriorated");
    const ev = evaluate(state, sc);
    expect(ev.errorTags).toContain("unsafe_delay");
  });

  it("recognizing the arrest and coding is still the right final action", () => {
    const state = run([[0, "check_vitals"]]);
    // He arrests (~360s via the no-fluids path); CPR unlocks on arrest.
    expect(state.flagsSetAt["arrested"]).toBeDefined();
  });
});
