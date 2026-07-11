import { describe, expect, it } from "vitest";
import { CARE_SETTINGS, CARE_SETTING_BY_ID, CARE_CATEGORY_LABEL } from "./careSettings";

describe("care-setting taxonomy", () => {
  it("has unique ids and every category is labeled", () => {
    const ids = CARE_SETTINGS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of CARE_SETTINGS) {
      expect(CARE_CATEGORY_LABEL[s.category]).toBeTruthy();
      expect(s.unrealEnvironmentKey.startsWith("env_")).toBe(true);
      expect(s.typicalEquipment.length).toBeGreaterThan(0);
    }
  });

  it("covers the AMC breadth: critical care, inpatient, procedural, women's/children's, outpatient, community", () => {
    const cats = new Set(CARE_SETTINGS.map((s) => s.category));
    expect(cats).toEqual(
      new Set(["critical_care", "acute_inpatient", "procedural", "womens_childrens", "outpatient", "community"]),
    );
  });

  it("includes outpatient and home health specifically", () => {
    expect(CARE_SETTING_BY_ID.get("primary_care")?.category).toBe("outpatient");
    expect(CARE_SETTING_BY_ID.get("infusion_center")?.category).toBe("outpatient");
    expect(CARE_SETTING_BY_ID.get("home_health")?.category).toBe("community");
    expect(CARE_SETTING_BY_ID.get("home_health")?.unrealEnvironmentKey).toBe("env_home_living_room");
  });

  it("distinct 3D environments exist for the visually different settings", () => {
    const envs = new Set(CARE_SETTINGS.map((s) => s.unrealEnvironmentKey));
    expect(envs.has("env_icu_bay")).toBe(true);
    expect(envs.has("env_operating_room")).toBe(true);
    expect(envs.has("env_ldr_room")).toBe(true);
    expect(envs.has("env_home_living_room")).toBe(true);
    expect(envs.size).toBeGreaterThan(8);
  });
});
