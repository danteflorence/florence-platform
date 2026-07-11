// The generator must emit scenarios that are validator-clean AND genuinely
// playable: a correct assess→escalate→treat→reassess run stabilizes the
// patient, and ignoring the deterioration loses. Table-driven across insult
// categories so we don't just test the happy insult.
import { describe, expect, it } from "vitest";
import { buildPlayableScenario, type ScenarioSeed } from "./scenarioGen";
import { validateScenario } from "../../data/vpatient/validate";
import { dispatch, init, tick, type SimState } from "./engine";
import { evaluate } from "./score";

function run(sc: ReturnType<typeof buildPlayableScenario>, script: [number, string][]): SimState {
  let s = init(sc);
  const pending = [...script].sort((a, b) => a[0] - b[0]);
  for (;;) {
    while (pending.length && pending[0][0] <= s.clockSec) {
      const [, actionId] = pending.shift()!;
      const r = dispatch(s, sc, actionId);
      if (r.ok) s = r.state; // ignore gated rejections in the neglect path
    }
    if (s.ended || s.clockSec >= sc.durationSec) return s;
    s = tick(s, sc);
  }
}

const seeds: ScenarioSeed[] = [
  { id: "gen-sepsis", title: "Gen Sepsis", insultId: "infection_sepsis", personaId: "p-septic-source-m-71", careSettingId: "med_surg", clientNeed: "physiological-adaptation", severity: 0.85, setting: "Med-surg" },
  { id: "gen-resp", title: "Gen Resp", insultId: "asthma_attack", personaId: "p-teen-f-16", careSettingId: "ed", clientNeed: "physiological-adaptation", severity: 0.8, setting: "ED" },
  { id: "gen-hem", title: "Gen Hemorrhage", insultId: "hemorrhage", personaId: "p-postop-f-58", careSettingId: "pacu", clientNeed: "physiological-adaptation", severity: 0.85, setting: "PACU" },
];

describe("buildPlayableScenario", () => {
  for (const seed of seeds) {
    describe(seed.title, () => {
      const sc = buildPlayableScenario(seed);

      it("is validator-clean and carries persona + care setting", () => {
        expect(validateScenario(sc)).toEqual([]);
        expect(sc.personaId).toBe(seed.personaId);
        expect(sc.careSettingId).toBe(seed.careSettingId);
        expect(sc.status).toBe("draft");
      });

      it("a correct assess→escalate→treat→reassess run stabilizes", () => {
        const corrective = sc.actions.find((a) => a.category === "med" || a.category === "intervene")!;
        const state = run(sc, [
          [0, "check_vitals"],
          [20, "focused_assess"],
          [45, "notify_provider"],
          [80, corrective.id],
          [140, "reassess"],
        ]);
        expect(state.ended?.outcome).toBe("stabilized");
        const ev = evaluate(state, sc);
        expect(ev.decisions.find((d) => d.decisionId === "d-escalate")?.verdict).toBe("met");
        expect(ev.communication).not.toBeNull();
      });

      it("ignoring the deterioration loses", () => {
        const state = run(sc, [[0, "check_vitals"]]);
        expect(state.ended?.outcome).toBe("deteriorated");
        expect(evaluate(state, sc).errorTags).toContain("unsafe_delay");
      });
    });
  }

  it("rejects unknown insult/persona ids", () => {
    expect(() => buildPlayableScenario({ ...seeds[0], insultId: "nope" })).toThrow();
    expect(() => buildPlayableScenario({ ...seeds[0], personaId: "nope" })).toThrow();
  });
});
