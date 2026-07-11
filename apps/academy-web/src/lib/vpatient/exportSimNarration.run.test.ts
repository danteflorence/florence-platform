// On-demand export of the approved scenarios' narration lines + voice casting
// for the API-side audio generator. Vitest-hosted (Vite resolves the
// extensionless src graph) but GATED so it never runs in the normal suite.
//
//   EXPORT_SIM_AUDIO=1 npx vitest run src/lib/vpatient/exportSimNarration.run.test.ts
//
// Writes api/data/sim-narration.json: key, text, and which VOICE speaks each
// line. Patient-spoken lines (phase patientLines + patientResponses) get a
// diverse cast voice, stable per scenario; everything else is the NARRATOR.
import { describe, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { approvedScenarios } from "../../data/vpatient/registry";
import { CAST, NARRATOR_VOICE_ID } from "../../data/vpatient/voiceCast";

const shouldRun = process.env.EXPORT_SIM_AUDIO === "1";

function hashPick<T>(seed: string, list: T[]): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return list[h % list.length];
}

describe.skipIf(!shouldRun)("export sim narration (EXPORT_SIM_AUDIO=1)", () => {
  it("writes api/data/sim-narration.json", () => {
    const lines: { key: string; scenarioId: string; audioId: string; text: string; voiceId: string; speaker: string }[] = [];
    for (const sc of approvedScenarios()) {
      const patientIds = new Set(
        [...sc.phases.map((p) => p.patientLine?.audioId), ...sc.patientResponses.map((r) => r.audioId)].filter(
          (x): x is string => Boolean(x),
        ),
      );
      const want = /^f/i.test(sc.patient.sex) ? "female" : "male";
      const pool = CAST.filter((v) => v.gender === want && v.roleHints.includes("patient"));
      const patientVoice = pool.length ? hashPick(sc.id, pool).id : NARRATOR_VOICE_ID;
      for (const clip of sc.narration) {
        const speaker = patientIds.has(clip.id) ? "patient" : "narrator";
        lines.push({
          key: `sim-${sc.id}-${clip.id}`,
          scenarioId: sc.id,
          audioId: clip.id,
          text: clip.text,
          voiceId: speaker === "patient" ? patientVoice : NARRATOR_VOICE_ID,
          speaker,
        });
      }
    }
    mkdirSync("api/data", { recursive: true });
    writeFileSync("api/data/sim-narration.json", JSON.stringify({ generated_at: new Date().toISOString(), lines }, null, 2));
    const by = lines.reduce((a: Record<string, number>, l) => ((a[l.speaker] = (a[l.speaker] ?? 0) + 1), a), {});
    console.log(`exported ${lines.length} lines`, JSON.stringify(by));
  });
});
