// Unit tests for the draft→seed mapping - the part that must be RIGHT so the
// batch enrichment doesn't mislabel scenarios.
import { describe, expect, it } from "vitest";
import { cleanStrings, draftToSeed, inferClientNeed, matchFirst, pickPersonaId, INSULT_MAP, INSULT_FALLBACK } from "./enrichDrafts";
import { buildPlayableScenario } from "./scenarioGen";
import { validateScenario } from "../../data/vpatient/validate";

describe("draftToSeed mapping", () => {
  it("does NOT map hypertension to pneumothorax (the /tension/ false-match)", () => {
    const seed = draftToSeed({ id: "d1", title: "Hypertensive Crisis on the ward", patient: { age: 60, sex: "M" } });
    expect(seed.insultId).not.toBe("tension_pneumothorax");
  });

  it("maps a pediatric sepsis case to infection_sepsis + pediatrics + a young persona", () => {
    const seed = draftToSeed({ id: "d2", title: "Pediatric Sepsis - Meningitis", patient: { age: 7, sex: "M" } });
    expect(seed.insultId).toBe("infection_sepsis");
    expect(seed.careSettingId).toBe("pediatrics");
    expect(seed.personaId).toBe("p-child-m-7");
  });

  it("maps a real pneumothorax + ICU + female", () => {
    const seed = draftToSeed({ id: "d3", title: "Tension Pneumothorax in the ICU", patient: { age: 40, sex: "F" } });
    expect(seed.insultId).toBe("tension_pneumothorax");
    expect(seed.careSettingId).toBe("micu");
    expect(seed.personaId).toBe("p-adult-f-34");
  });

  it("unmapped title falls back to the deteriorating-ward-patient shape", () => {
    const seed = draftToSeed({ id: "d4", title: "Something unusual", patient: { age: 55, sex: "F" } });
    expect(seed.insultId).toBe(INSULT_FALLBACK);
    expect(seed.careSettingId).toBe("med_surg");
  });

  it("strips placeholder history/meds", () => {
    expect(cleanStrings(["Edit: relevant history", ""])).toBeUndefined();
    expect(cleanStrings(["Type 2 diabetes", "Edit: more"])).toEqual(["Type 2 diabetes"]);
  });

  it("a mapped seed builds a validator-clean playable scenario", () => {
    const seed = draftToSeed({ id: "vp-x", title: "GI Bleed on Med-Surg", patient: { age: 58, sex: "F" } });
    const sc = buildPlayableScenario(seed);
    expect(validateScenario(sc)).toEqual([]);
    expect(sc.status).toBe("draft");
  });

  it("helpers behave", () => {
    expect(matchFirst("nothing here", INSULT_MAP, "fb")).toBe("fb");
    expect(pickPersonaId(80, "F")).toBe("p-frail-f-82");
  });

  it("infers the NCLEX section from title keywords, else the insult category", () => {
    expect(inferClientNeed("Insulin drip titration on the floor", "infection_sepsis")).toBe("pharmacological-therapies");
    expect(inferClientNeed("Delegation and triage on a busy shift", "infection_sepsis")).toBe("management-of-care");
    expect(inferClientNeed("Contact isolation for C. diff", "infection_sepsis")).toBe("safety-infection-control");
    // No keyword → insult category default (acute deterioration = phys integrity).
    expect(inferClientNeed("Acute Brain Attack", "tbi")).toBe("physiological-adaptation");
    expect(inferClientNeed("Something", "pain")).toBe("pharmacological-therapies");
  });
});
