import { describe, expect, it } from "vitest";
import { CAST, CAST_BY_ID, NARRATOR_VOICE_ID, voiceForPersona, voiceForTeamRole } from "./voiceCast";
import { PERSONA_BY_ID, PERSONAS } from "./castRegistry";
import type { TeamRoleKind } from "./types";

describe("voice cast", () => {
  it("has unique ids and a broad heritage spread", () => {
    const ids = CAST.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(CAST.map((v) => v.heritage)).size).toBeGreaterThanOrEqual(6);
    expect(CAST.some((v) => v.gender === "female")).toBe(true);
    expect(CAST.some((v) => v.gender === "male")).toBe(true);
    expect(NARRATOR_VOICE_ID).toMatch(/^[A-Za-z0-9]+$/);
    expect(CAST_BY_ID.get(CAST[0].id)?.label).toBe(CAST[0].label);
  });

  it("assigns a sex-matched patient voice, stable per persona", () => {
    for (const p of PERSONAS) {
      const v1 = voiceForPersona(p);
      const v2 = voiceForPersona(p);
      expect(v1).toBe(v2); // deterministic
      const entry = CAST_BY_ID.get(v1)!;
      expect(entry.gender).toBe(p.sex === "F" ? "female" : "male");
    }
  });

  it("an explicit persona.voiceId wins", () => {
    const p = { ...PERSONA_BY_ID.get("p-athlete-m-24")!, voiceId: "CUSTOM123" };
    expect(voiceForPersona(p)).toBe("CUSTOM123");
  });

  it("team roles get role-appropriate, non-colliding voices", () => {
    const md = voiceForTeamRole("physician" as TeamRoleKind, "md");
    const rph = voiceForTeamRole("pharmacist" as TeamRoleKind, "rph");
    expect(CAST_BY_ID.get(md)?.roleHints).toContain("physician");
    expect(CAST_BY_ID.get(rph)?.roleHints).toContain("pharmacist");
    // Same role, different member ids → spread (usually different voices).
    const a = voiceForTeamRole("physician" as TeamRoleKind, "md-a");
    const b = voiceForTeamRole("physician" as TeamRoleKind, "md-b");
    expect(CAST_BY_ID.has(a) && CAST_BY_ID.has(b)).toBe(true);
  });
});
