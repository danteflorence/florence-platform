// Headless tests for the home-health interprofessional scenario. Teaching
// points under test: escalate-by-phone-with-SBAR, don't act outside RN scope,
// and the interprofessional COMMUNICATION score rolls up on its own.
import { describe, expect, it } from "vitest";
import { HOMEHEALTH_01 } from "../../data/vpatient/scenarios/homehealth01";
import { validateScenario } from "../../data/vpatient/validate";
import { CARE_SETTING_BY_ID } from "../../data/vpatient/careSettings";
import { dispatch, init, tick, type SimState } from "./engine";
import { evaluate } from "./score";

const sc = HOMEHEALTH_01;

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

describe("vp-homehealth-01 (interprofessional / transition-to-US-practice)", () => {
  it("is a community care setting with a real team", () => {
    expect(validateScenario(sc)).toEqual([]);
    expect(CARE_SETTING_BY_ID.get(sc.careSettingId!)?.category).toBe("community");
    expect(sc.team?.map((t) => t.role).sort()).toEqual(["case_manager", "pharmacist", "physician"]);
  });

  it("phone-first escalation + scope-safe coordination stabilizes her, high communication score", () => {
    const state = run([
      [0, "check_vitals"],
      [20, "auscultate"],
      [40, "check_weight"],
      [70, "review_meds"],
      [110, "position_upright"],
      [120, "sbar_physician"],
      [170, "give_extra_diuretic"], // now ordered (after SBAR)
      [210, "call_pharmacist"],
      [260, "teach_sodium"],
    ]);
    expect(state.ended?.outcome).toBe("stabilized");
    const ev = evaluate(state, sc);
    expect(verdictOf(ev, "d-escalate")).toBe("met");
    expect(verdictOf(ev, "d-scope")).toBe("met"); // ordered, not unilateral
    expect(verdictOf(ev, "d-pharmacy")).toBe("met");
    // Communication is its own rolled-up lens and it's strong here.
    expect(ev.communication).not.toBeNull();
    expect(ev.communication!).toBeGreaterThan(0.9);
  });

  it("giving the diuretic before calling is a scope error (harmful) and no phone escalation deteriorates her", () => {
    const trap = run([
      [0, "check_vitals"],
      [20, "auscultate"],
      [60, "give_extra_diuretic"], // unordered, before SBAR → scope error
    ]);
    const ev = evaluate(trap, sc);
    expect(trap.flagsSetAt["unordered_med"]).toBeDefined();
    expect(verdictOf(ev, "d-scope")).toBe("harmful");
    expect(ev.errorTags).toContain("scope_error");
  });

  it("never escalating ends with EMS (deteriorated) and a poor communication score", () => {
    const ev = evaluate(run([[0, "check_vitals"], [20, "auscultate"]]), sc);
    expect(ev.outcome).toBe("deteriorated");
    expect(ev.communication!).toBeLessThan(0.5);
    expect(ev.errorTags).toContain("unsafe_delay");
  });
});
