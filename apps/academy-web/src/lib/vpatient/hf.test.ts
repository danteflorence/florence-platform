// Headless clinical-path tests for the HF exacerbation scenario (vp-hf-01).
// Same style as the sepsis suite: full runs through the pure engine, scored.
import { describe, expect, it } from "vitest";
import { HF_01 } from "../../data/vpatient/scenarios/hf01";
import { validateScenario } from "../../data/vpatient/validate";
import { getScenario } from "../../data/vpatient/registry";
import { dispatch, init, tick, type SimState } from "./engine";
import { evaluate } from "./score";

const sc = HF_01;

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

describe("vp-hf-01 authoring", () => {
  it("passes the validator clean", () => {
    expect(validateScenario(sc)).toEqual([]);
  });

  it("is approved and visible through the learner gate", () => {
    // Operator sign-off 2026-07-10 flipped this live; the gate resolves it
    // without includeDrafts now.
    expect(getScenario("vp-hf-01")?.title).toBe(sc.title);
  });
});

describe("vp-hf-01 clinical paths", () => {
  it("textbook management stabilizes him", () => {
    const state = run([
      [0, "check_vitals"],
      [30, "auscultate"],
      [60, "check_weights"],
      [130, "raise_hob"],
      [150, "apply_oxygen"],
      [180, "notify_provider"],
      [220, "slow_iv_fluids"],
      [250, "give_furosemide"],
      [282, "check_vitals"], // reassess right after the dose - he recovers ~290
    ]);
    expect(state.ended?.outcome).toBe("stabilized");
    const ev = evaluate(state, sc);
    expect(ev.overall).toBe(1);
    expect(ev.errorTags).toEqual([]);
    expect(verdictOf(ev, "d-fluid-mgmt")).toBe("met");
    expect(verdictOf(ev, "d-reassess")).toBe("met");
  });

  it("total neglect deteriorates onto BiPAP with the volume cues missed", () => {
    const state = run([]);
    expect(state.ended?.outcome).toBe("deteriorated");
    expect(state.vitals.loc).toBe("confused");
    const ev = evaluate(state, sc);
    expect(ev.overall).toBe(0);
    expect(ev.missedCriticalCues).toEqual(
      expect.arrayContaining(["c-crackles", "c-weight", "c-io"]),
    );
    expect(ev.errorTags).toContain("unsafe_delay");
  });

  it("chasing the urine output with fluids is scored harmful", () => {
    const state = run([
      [0, "check_vitals"],
      [40, "check_io"],
      [80, "increase_fluids"], // the trap
      [200, "notify_provider"],
    ]);
    const ev = evaluate(state, sc);
    expect(verdictOf(ev, "d-fluid-mgmt")).toBe("harmful");
    expect(ev.errorTags).toContain("treating_symptom_not_cause");
  });

  it("oxygen alone never stabilizes congestion - the diuretic does", () => {
    // O2 + position + escalation, but the furosemide is never given.
    const state = run([
      [0, "check_vitals"],
      [130, "raise_hob"],
      [150, "apply_oxygen"],
      [200, "notify_provider"],
    ]);
    expect(state.ended?.outcome).toBe("time_end"); // stalls in the low 90s
    const ev = evaluate(state, sc);
    expect(verdictOf(ev, "d-diuretic")).toBe("missed");
  });
});
