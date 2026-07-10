// Headless clinical-path tests for the post-op hemorrhage scenario
// (vp-hemorrhage-01). The teaching point under test: compensated shock is
// readable (and actionable) BEFORE hypotension, and medicating the
// tachycardia as pain is scored harmful.
import { describe, expect, it } from "vitest";
import { HEMORRHAGE_01 } from "../../data/vpatient/scenarios/hemorrhage01";
import { validateScenario } from "../../data/vpatient/validate";
import { dispatch, init, tick, type SimState } from "./engine";
import { evaluate } from "./score";

const sc = HEMORRHAGE_01;

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

describe("vp-hemorrhage-01 authoring", () => {
  it("passes the validator clean", () => {
    expect(validateScenario(sc)).toEqual([]);
  });
});

describe("vp-hemorrhage-01 clinical paths", () => {
  it("reading the compensation early stabilizes her before hypotension ever happens", () => {
    const state = run([
      [0, "check_vitals"],
      [30, "check_drain"],
      [60, "assess_perfusion"],
      [120, "notify_provider"],
      [170, "give_fluids"],
      [210, "type_and_cross"],
      [300, "check_vitals"],
    ]);
    const ev = evaluate(state, sc);
    expect(state.flagsSetAt["hypotension"]).toBeUndefined(); // caught while compensating
    expect(ev.errorTags).toEqual([]);
    expect(verdictOf(ev, "d-drain")).toBe("met");
    expect(verdictOf(ev, "d-escalate")).toBe("met");
    expect(verdictOf(ev, "d-morphine-trap")).toBe("met"); // escalated instead of medicating
    expect(verdictOf(ev, "d-position")).toBe("na"); // hypotension prevented
    expect(ev.overall).toBe(1);
  });

  it("waiting for hypotension deteriorates her back to the OR", () => {
    const state = run([]);
    expect(state.ended?.outcome).toBe("deteriorated");
    const ev = evaluate(state, sc);
    expect(ev.overall).toBe(0);
    expect(ev.missedCriticalCues).toEqual(
      expect.arrayContaining(["c-drain", "c-dressing", "c-pallor"]),
    );
    expect(ev.errorTags).toContain("unsafe_delay");
  });

  it("medicating the tachycardia as pain is scored harmful and drops her pressure", () => {
    const state = run([
      [0, "check_vitals"],
      [140, "give_morphine"], // the trap
      [300, "notify_provider"],
    ]);
    const ev = evaluate(state, sc);
    expect(verdictOf(ev, "d-morphine-trap")).toBe("harmful");
    expect(ev.errorTags).toContain("treating_symptom_not_cause");
    // The morphine ramp (toward SBP 100) plus the crash makes hypotension arrive.
    expect(state.flagsSetAt["morphine_given"]).toBeDefined();
  });

  it("late catch after hypotension: position + bolus rescue her to stabilized", () => {
    const state = run([
      [0, "check_vitals"],
      [340, "notify_provider"], // after the crash ramp starts at 330
      [380, "check_drain"],
      [435, "lay_flat_legs_up"], // hypotension crosses ~423 - position after it
      [455, "give_fluids"],
      [500, "check_vitals"],
    ]);
    expect(state.flagsSetAt["hypotension"]).toBeDefined();
    expect(state.ended?.outcome).toBe("stabilized");
    const ev = evaluate(state, sc);
    expect(verdictOf(ev, "d-position")).toBe("met");
    expect(verdictOf(ev, "d-fluids")).toBe("met");
    const escalate = ev.decisions.find((d) => d.decisionId === "d-escalate")!;
    expect(escalate.verdict).toBe("late");
  });
});
