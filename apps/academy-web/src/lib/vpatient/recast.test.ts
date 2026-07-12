import { describe, expect, it } from "vitest";
import { approvedScenarios } from "../../data/vpatient/registry";
import { characterNameFor, recastOptions, recastScenario } from "./recast";

const base = approvedScenarios()[0];

describe("recast", () => {
  it("offers personas and names them deterministically", () => {
    const options = recastOptions(base);
    expect(options.length).toBeGreaterThan(0);
    for (const p of options) {
      expect(characterNameFor(p)).toBe(characterNameFor(p)); // stable
      expect(characterNameFor(p)).not.toBe(base.patient.name);
    }
  });

  it("swaps identity but never the clinical content", () => {
    const persona = recastOptions(base)[0];
    const re = recastScenario(base, persona);
    expect(re.patient.name).toBe(characterNameFor(persona));
    expect(re.patient.age).toBe(persona.age);
    // The rubric, rules, vitals, and actions are byte-identical - a recast
    // run is scored on exactly the same standard.
    expect(re.rubric).toEqual(base.rubric);
    expect(re.rules).toEqual(base.rules);
    expect(re.initialVitals).toEqual(base.initialVitals);
    expect(re.actions).toEqual(base.actions);
    expect(re.durationSec).toBe(base.durationSec);
  });

  it("renames the patient everywhere the learner reads", () => {
    const persona = recastOptions(base)[0];
    const re = recastScenario(base, persona);
    const oldTokens = base.patient.name.split(/\s+/).filter((t) => t.length > 2);
    const texts = [
      ...re.patient.chart.map((c) => c.body),
      ...re.phases.flatMap((p) => (p.cues ?? []).map((c) => c.text)),
      ...re.narration.map((n) => n.text),
      ...re.patientResponses.map((r) => r.text),
      ...Object.values(re.debrief.outcomeSummaries),
    ].join("\n");
    for (const tok of oldTokens) {
      expect(new RegExp(`\\b${tok}\\b`).test(texts)).toBe(false);
    }
  });

  it("drops patient-voice clips (original persona's voice) but keeps narrator clips", () => {
    const persona = recastOptions(base)[0];
    const re = recastScenario(base, persona);
    for (const r of re.patientResponses) expect(r.audioId).toBeUndefined();
    for (const p of re.phases) expect(p.patientLine?.audioId).toBeUndefined();
    // Narration list survives intact (ids unchanged - the narrator is the
    // same Matilda voice regardless of who the patient is).
    expect(re.narration.map((n) => n.id)).toEqual(base.narration.map((n) => n.id));
  });
});
