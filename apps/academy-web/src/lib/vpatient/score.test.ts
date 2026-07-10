// Scoring + authoring-lint tests for the gold sepsis scenario. Each case is a
// full headless run through the engine, then evaluated against the rubric.
import { describe, expect, it } from "vitest";
import { SEPSIS_01 } from "../../data/vpatient/scenarios/sepsis01";
import { validateScenario } from "../../data/vpatient/validate";
import { evaluate, toAssessmentSummary } from "./score";
import { runScript } from "./engine.test";

const sc = SEPSIS_01;
const verdictOf = (ev: ReturnType<typeof evaluate>, id: string) =>
  ev.decisions.find((d) => d.decisionId === id)?.verdict;

describe("authoring lint", () => {
  it("the gold scenario passes the validator clean", () => {
    expect(validateScenario(sc)).toEqual([]);
  });

  it("the validator actually catches broken references", () => {
    const broken = {
      ...sc,
      rubric: [{ ...sc.rubric[0], correctActions: ["not_a_real_action"] }],
    };
    expect(validateScenario(broken).join(" ")).toContain("not_a_real_action");
  });
});

describe("evaluate", () => {
  it("optimal run: everything met, prevention makes crash decisions n/a", () => {
    const state = runScript([
      [0, "check_vitals"],
      [40, "assess_wound"],
      [90, "review_labs"],
      [120, "check_urine"],
      [150, "notify_provider"],
      [210, "draw_cultures"],
      [260, "give_antibiotics"],
    ]);
    const ev = evaluate(state, sc);
    expect(ev.outcome).toBe("time_end");
    expect(ev.overall).toBe(1);
    expect(ev.errorTags).toEqual([]);
    expect(verdictOf(ev, "d-escalate")).toBe("met");
    expect(verdictOf(ev, "d-cultures")).toBe("met");
    expect(verdictOf(ev, "d-fluids")).toBe("na"); // hypotension prevented
    expect(verdictOf(ev, "d-reassess")).toBe("na");
    // Critical-cue recall: looked at wound/labs/urine; confusion never existed.
    expect(ev.caughtCriticalCues).toEqual(
      expect.arrayContaining(["c-wound", "c-wbc", "c-urine", "c-rigors", "c-bp-drift"]),
    );
    expect(ev.missedCriticalCues).toEqual(["c-confusion"]);
  });

  it("total neglect: zero overall, deteriorated, the right error tags", () => {
    const ev = evaluate(runScript([]), sc);
    expect(ev.outcome).toBe("deteriorated");
    expect(ev.overall).toBe(0);
    expect(verdictOf(ev, "d-vitals")).toBe("missed");
    expect(verdictOf(ev, "d-escalate")).toBe("missed");
    expect(verdictOf(ev, "d-cultures")).toBe("na"); // orders never existed
    expect(verdictOf(ev, "d-fluids")).toBe("missed"); // hypotension happened, no bolus
    expect(ev.errorTags).toEqual(["missed_cue", "unsafe_delay", "under_treatment"]);
    expect(ev.missedCriticalCues).toEqual(
      expect.arrayContaining(["c-wound", "c-wbc", "c-urine"]),
    );
  });

  it("antibiotics before cultures: harmful sequencing verdict + priority_error", () => {
    const state = runScript([
      [0, "check_vitals"],
      [150, "notify_provider"],
      [200, "give_antibiotics"],
      [260, "draw_cultures"], // drawn later - doesn't undo the sequencing error
    ]);
    const ev = evaluate(state, sc);
    expect(verdictOf(ev, "d-cultures")).toBe("harmful");
    expect(ev.errorTags).toContain("priority_error");
    expect(verdictOf(ev, "d-abx")).toBe("met");
  });

  it("late escalation earns half credit and the unsafe_delay tag; rescue still scores", () => {
    const state = runScript([
      [0, "check_vitals"],
      [40, "assess_wound"],
      [90, "review_labs"],
      [345, "notify_provider"], // window closed at 330
      [380, "draw_cultures"],
      [415, "give_antibiotics"],
      [450, "give_fluids"],
      [490, "check_vitals"], // reassess after the bolus (run stabilizes ~526)
    ]);
    const ev = evaluate(state, sc);
    expect(ev.outcome).toBe("stabilized");
    const escalate = ev.decisions.find((d) => d.decisionId === "d-escalate")!;
    expect(escalate.verdict).toBe("late");
    expect(escalate.score).toBe(0.5);
    expect(ev.errorTags).toContain("unsafe_delay");
    expect(verdictOf(ev, "d-fluids")).toBe("met");
    expect(verdictOf(ev, "d-reassess")).toBe("met");
    expect(ev.overall).toBeGreaterThan(0.8);
    expect(ev.overall).toBeLessThan(1);
  });

  it("a repeatable action taken only BEFORE the window can't satisfy it", () => {
    // Bolus given, but the only vitals check was the 07:00 baseline.
    const state = runScript([
      [0, "check_vitals"],
      [345, "notify_provider"],
      [380, "draw_cultures"],
      [415, "give_antibiotics"],
      [450, "give_fluids"],
    ]);
    const ev = evaluate(state, sc);
    expect(verdictOf(ev, "d-reassess")).toBe("missed");
  });

  it("maps into the assessment-results payload with no readiness field", () => {
    const ev = evaluate(runScript([[0, "check_vitals"], [150, "notify_provider"]]), sc);
    const payload = toAssessmentSummary(ev, "cand_test");
    expect(payload.kind).toBe("simulation");
    expect(payload.candidate_id).toBe("cand_test");
    expect(payload.items_completed).toBe(ev.itemsCompleted);
    expect(Object.keys(payload.by_cjmm).length).toBeGreaterThan(0);
    expect("readiness" in payload).toBe(false);
  });
});
