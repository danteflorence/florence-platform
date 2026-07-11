// Tests for the persona × insult physiology projector. The load-bearing
// property: reserve matters - the SAME insult must decompensate a low-reserve
// person sooner/steeper than a high-reserve one, and interventions ramp back
// toward that person's own baseline.
import { describe, expect, it } from "vitest";
import { PERSONA_BY_ID, PERSONAS, personaModelHint } from "../../data/vpatient/castRegistry";
import { insultPhases, projectInsult, projectIntervention } from "./physiology";
import { validateScenario } from "../../data/vpatient/validate";
import type { VPatientScenario } from "../../data/vpatient/types";

const athlete = PERSONA_BY_ID.get("p-athlete-m-24")!;
const frail = PERSONA_BY_ID.get("p-frail-f-82")!;

describe("cast registry", () => {
  it("has unique ids and a MetaHuman slot per persona", () => {
    const ids = PERSONAS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(PERSONAS.every((p) => p.metaHumanId.startsWith("mh_"))).toBe(true);
  });
  it("reserves are all in [0,1]", () => {
    for (const p of PERSONAS) {
      for (const v of Object.values(p.reserve)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
  it("model hint bands by age + sex", () => {
    expect(personaModelHint(PERSONA_BY_ID.get("p-child-m-7")!)).toBe("child_male");
    expect(personaModelHint(frail)).toBe("older_adult_female");
  });
});

describe("projectInsult - reserve governs magnitude + onset", () => {
  it("sepsis drops the frail elder's pressure sooner and steeper than the athlete's", () => {
    const sev = 0.8;
    const a = projectInsult(athlete, "infection_sepsis", sev);
    const f = projectInsult(frail, "infection_sepsis", sev);

    // Both start at their OWN baseline.
    expect(a.initialVitals.sbp).toBe(athlete.baseline.sbp);
    expect(f.initialVitals.sbp).toBe(frail.baseline.sbp);

    // Pressure DROP from baseline is larger for the low-reserve frail patient.
    const aDrop = athlete.baseline.sbp - (a.targets.sbp as number);
    const fDrop = frail.baseline.sbp - (f.targets.sbp as number);
    expect(fDrop).toBeGreaterThan(aDrop);

    // And it lands faster (shorter onset window).
    expect(f.overSec).toBeLessThan(a.overSec);

    // Sepsis signature moved the right vitals in the right direction.
    expect(f.targets.hr as number).toBeGreaterThan(frail.baseline.hr); // tachy up
    expect(f.targets.tempC as number).toBeGreaterThan(frail.baseline.tempC); // fever up
    expect(f.targets.sbp as number).toBeLessThan(frail.baseline.sbp); // pressure down
    expect(f.textEffects.join(" ")).toMatch(/confused/i);
    expect(f.source.bioGearsAction).toBe("Infection");
  });

  it("clamps to the survivable envelope even at max severity", () => {
    const p = projectInsult(frail, "infection_sepsis", 1);
    expect(p.targets.spo2 as number).toBeGreaterThanOrEqual(55);
    expect(p.targets.sbp as number).toBeGreaterThanOrEqual(44);
  });

  it("severity 0 is a no-op drift (targets equal baseline)", () => {
    const p = projectInsult(athlete, "hemorrhage", 0);
    expect(p.targets.sbp).toBe(athlete.baseline.sbp);
    expect(p.targets.hr).toBe(athlete.baseline.hr);
  });

  it("respiratory insult keys off respiratory reserve - COPD desats hard", () => {
    const copd = PERSONA_BY_ID.get("p-copd-m-63")!;
    const healthy = PERSONA_BY_ID.get("p-adult-f-34")!;
    const c = projectInsult(copd, "asthma_attack", 0.7);
    const h = projectInsult(healthy, "asthma_attack", 0.7);
    const cDesat = copd.baseline.spo2 - (c.targets.spo2 as number);
    const hDesat = healthy.baseline.spo2 - (h.targets.spo2 as number);
    expect(cDesat).toBeGreaterThan(hDesat);
  });
});

describe("insultPhases → engine-consumable, validator-clean", () => {
  it("produces a baseline phase + a drift phase that a scenario can drop in", () => {
    const proj = projectInsult(frail, "hemorrhage", 0.6);
    const phases = insultPhases(proj, 30);
    expect(phases[0].atSec).toBe(0);
    expect(phases[1].vitalsDrift?.overSec).toBe(proj.overSec);

    // A minimal scenario built from the projection validates clean.
    const sc: VPatientScenario = {
      id: "vp-generated-smoke",
      title: "Generated smoke",
      status: "draft",
      setting: "test",
      clientNeed: "physiological-adaptation",
      patient: { name: frail.displayName, age: frail.age, sex: frail.sex, history: [], allergies: [], meds: [], chart: [] },
      initialVitals: { ...proj.initialVitals, rhythm: "Sinus", loc: "alert" },
      durationSec: 600,
      phases,
      actions: [{ id: "check_vitals", label: "Vitals", category: "assess", durationSec: 10 }],
      rules: [],
      rubric: [
        {
          decisionId: "d-x",
          label: "look",
          ncjmmStep: "recognize-cues",
          clientNeed: "physiological-adaptation",
          correctActions: ["check_vitals"],
          opensAtSec: 0,
          windowSec: 120,
          errorTypeIfMissed: "missed_cue",
          weight: 1,
        },
      ],
      debrief: { outcomeSummaries: { stabilized: "s", deteriorated: "d", time_end: "t" }, optimalTimeline: [] },
      narration: [],
      patientResponses: [],
    };
    expect(validateScenario(sc)).toEqual([]);
  });
});

describe("projectIntervention - recovery toward this person's baseline", () => {
  it("fluid bolus targets baseline and the frail patient recovers slower", () => {
    const a = projectIntervention(athlete, "fluid_resuscitation", 1);
    const f = projectIntervention(frail, "fluid_resuscitation", 1);
    const aSbp = a.find((r) => r.key === "sbp")!;
    const fSbp = f.find((r) => r.key === "sbp")!;
    expect(aSbp.target).toBe(athlete.baseline.sbp);
    expect(fSbp.target).toBe(frail.baseline.sbp);
    // Lower reserve = longer recovery ramp.
    expect(fSbp.overSec).toBeGreaterThan(aSbp.overSec);
  });

  it("unknown ids throw (author lint)", () => {
    expect(() => projectInsult(athlete, "nope", 0.5)).toThrow();
    expect(() => projectIntervention(athlete, "nope", 1)).toThrow();
  });
});
