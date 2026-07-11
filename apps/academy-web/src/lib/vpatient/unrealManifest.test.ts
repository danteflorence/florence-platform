import { describe, expect, it } from "vitest";
import { SEPSIS_01 } from "../../data/vpatient/scenarios/sepsis01";
import { toUnrealManifest } from "./unrealManifest";

describe("toUnrealManifest", () => {
  const m = toUnrealManifest(SEPSIS_01);

  it("carries the scene + patient identity with a model hint", () => {
    expect(m.manifestVersion).toBe(1);
    expect(m.scene.id).toBe("vp-sepsis-01");
    expect(m.patient.name).toBe(SEPSIS_01.patient.name);
    expect(m.patient.modelHint).toBe("adult_female"); // 58 F
  });

  it("builds a vitals track starting at baseline and drifting per phase", () => {
    expect(m.vitalsTrack[0].atSec).toBe(0);
    expect(m.vitalsTrack[0].hr).toBe(SEPSIS_01.initialVitals.hr);
    // sepsis phases drift temp up + hr up + pressure down → later keyframes exist
    expect(m.vitalsTrack.length).toBeGreaterThan(1);
    const last = m.vitalsTrack[m.vitalsTrack.length - 1];
    expect(last.atSec).toBeGreaterThan(0);
    expect(last.atSec).toBeLessThanOrEqual(SEPSIS_01.durationSec);
  });

  it("derives visual cues (chest-rise, skin tone) from the numbers", () => {
    const kf = m.vitalsTrack[0];
    expect(kf.visual.chestRiseHz).toBeCloseTo(SEPSIS_01.initialVitals.rr / 60, 2);
    expect(["normal", "pale", "cyanotic", "flushed"]).toContain(kf.visual.skinTone);
  });

  it("maps every action to an animation clip", () => {
    expect(m.actionCues.length).toBe(SEPSIS_01.actions.length);
    const assess = m.actionCues.find((a) => a.category === "assess");
    expect(assess?.animation).toBe("nurse_assess_lean_in");
    const med = m.actionCues.find((a) => a.category === "med");
    expect(med?.animation).toBe("nurse_iv_administer");
  });

  it("collects narrative beats from patient lines and narrate effects", () => {
    expect(m.narrativeBeats.length).toBeGreaterThan(0);
    expect(m.narrativeBeats.some((b) => b.atSecOrTrigger.startsWith("rule:"))).toBe(true);
    expect(m.narrativeBeats.some((b) => b.atSecOrTrigger.startsWith("t="))).toBe(true);
  });

  it("lists the outcome frames the render must support", () => {
    expect(m.outcomes.sort()).toEqual(["deteriorated", "stabilized", "time_end"]);
  });

  it("defaults the environment + a single-patient cast when no unit/team is set", () => {
    // sepsis01 has no careSettingId/team yet → falls back cleanly.
    expect(m.environment.key.startsWith("env_")).toBe(true);
    expect(m.cast).toHaveLength(1);
    expect(m.cast[0]).toMatchObject({ kind: "patient", role: "patient" });
  });

  it("resolves the environment + interprofessional cast from care setting + team", () => {
    const withTeam = toUnrealManifest({
      ...SEPSIS_01,
      careSettingId: "home_health",
      team: [
        { id: "md", role: "physician", name: "Dr. Okafor", reachableVia: "phone" },
        { id: "rph", role: "pharmacist", name: "PharmD Lee", reachableVia: "phone" },
      ],
    });
    expect(withTeam.environment.key).toBe("env_home_living_room");
    expect(withTeam.environment.equipment.length).toBeGreaterThan(0);
    expect(withTeam.cast).toHaveLength(3);
    expect(withTeam.cast.filter((c) => c.kind === "team").map((c) => c.role).sort()).toEqual(["pharmacist", "physician"]);
  });
});
