// ───────────────────────────────────────────────────────────────────────────
// Unreal scene manifest - the deterministic 3D-render contract. Turns an
// approved scenario into a scene description an Unreal Engine pipeline can
// consume to build the visuals that MATCH what our 2D engine already runs:
// the same patient, the same vitals trajectory, the same action beats.
//
// This is a pure data transform - it does NOT call Unreal. The render seam
// (POST /v1/sim/scenarios/:id/render) forwards this manifest to an Unreal
// render service when UNREAL_RENDER_URL is configured, and mock-queues it
// otherwise. So the "SME approves → system builds the visuals" step has a
// real, testable contract today and a one-endpoint hookup when the pipeline
// exists. The 2D playable build never waits on this.
// ───────────────────────────────────────────────────────────────────────────

import type { VPatientScenario, VitalsNumeric } from "../../data/vpatient/types";
import { CARE_SETTING_BY_ID } from "../../data/vpatient/careSettings";

/** Category → a coarse animation clip the Unreal patient/actor plays. */
const ACTION_ANIMATION: Record<string, string> = {
  assess: "nurse_assess_lean_in",
  intervene: "nurse_hands_on",
  med: "nurse_iv_administer",
  communicate: "nurse_phone_sbar",
};

export interface VitalsKeyframe {
  atSec: number;
  hr: number;
  sbp: number;
  dbp: number;
  rr: number;
  spo2: number;
  tempC: number;
  /** Derived visual cues for the render (chest-rise rate, skin tone, LOC). */
  visual: { chestRiseHz: number; skinTone: "normal" | "pale" | "cyanotic" | "flushed"; loc: string };
}

export interface UnrealManifest {
  manifestVersion: 1;
  scene: { id: string; title: string; setting: string };
  /** The 3D environment + props to load (from the care setting). */
  environment: { key: string; label: string; equipment: string[] };
  patient: {
    name: string;
    age: number;
    sex: string;
    /** A coarse model-selection hint for the Unreal character rig. */
    modelHint: string;
    initialPose: "supine" | "semi_fowler" | "seated";
  };
  /** Every character in the scene: the patient + the interprofessional team. */
  cast: { id: string; kind: "patient" | "team"; role: string; name: string; modelHint: string }[];
  /** Vitals over the run - the Unreal monitor + patient animation interpolate. */
  vitalsTrack: VitalsKeyframe[];
  /** Every learner action → an animation clip + category. */
  actionCues: { id: string; label: string; category: string; animation: string }[];
  /** Narrative/escalation beats the render can subtitle or voice. */
  narrativeBeats: { atSecOrTrigger: string; text: string; audioId?: string }[];
  outcomes: string[];
  durationSec: number;
}

function skinTone(v: { spo2: number; sbp: number; tempC: number }): VitalsKeyframe["visual"]["skinTone"] {
  if (v.spo2 < 88) return "cyanotic";
  if (v.sbp < 90) return "pale";
  if (v.tempC >= 38.5) return "flushed";
  return "normal";
}

function keyframe(atSec: number, v: VitalsNumeric, loc: string): VitalsKeyframe {
  return {
    atSec,
    hr: Math.round(v.hr),
    sbp: Math.round(v.sbp),
    dbp: Math.round(v.dbp),
    rr: Math.round(v.rr),
    spo2: Math.round(v.spo2),
    tempC: Math.round(v.tempC * 10) / 10,
    visual: {
      chestRiseHz: Math.round((v.rr / 60) * 100) / 100, // breaths → Hz for the rig
      skinTone: skinTone(v),
      loc,
    },
  };
}

function modelHint(age: number, sex: string): string {
  const band = age < 18 ? "pediatric" : age < 65 ? "adult" : "older_adult";
  const s = /^f/i.test(sex) ? "female" : /^m/i.test(sex) ? "male" : "neutral";
  return `${band}_${s}`;
}

export function toUnrealManifest(sc: VPatientScenario): UnrealManifest {
  // Build the vitals track: baseline at t=0, then a keyframe at the END of each
  // phase's drift with the drifted targets merged onto the running numbers.
  const running: VitalsNumeric = {
    hr: sc.initialVitals.hr,
    sbp: sc.initialVitals.sbp,
    dbp: sc.initialVitals.dbp,
    rr: sc.initialVitals.rr,
    spo2: sc.initialVitals.spo2,
    tempC: sc.initialVitals.tempC,
    pain: sc.initialVitals.pain,
  };
  let loc = sc.initialVitals.loc;
  const track: VitalsKeyframe[] = [keyframe(0, running, loc)];
  for (const phase of sc.phases) {
    if (!phase.vitalsDrift) continue;
    for (const [k, val] of Object.entries(phase.vitalsDrift.targets)) {
      (running as unknown as Record<string, number>)[k] = val as number;
    }
    const at = Math.min(sc.durationSec, phase.atSec + phase.vitalsDrift.overSec);
    track.push(keyframe(at, running, loc));
  }

  const narrativeBeats: UnrealManifest["narrativeBeats"] = [];
  for (const phase of sc.phases) {
    if (phase.patientLine) {
      narrativeBeats.push({
        atSecOrTrigger: `t=${phase.atSec}`,
        text: phase.patientLine.text,
        ...(phase.patientLine.audioId ? { audioId: phase.patientLine.audioId } : {}),
      });
    }
  }
  for (const rule of sc.rules) {
    for (const e of rule.effects) {
      if (e.kind === "narrate") {
        narrativeBeats.push({ atSecOrTrigger: `rule:${rule.id}`, text: e.text, ...(e.audioId ? { audioId: e.audioId } : {}) });
      }
    }
  }

  const setting = sc.careSettingId ? CARE_SETTING_BY_ID.get(sc.careSettingId) : undefined;
  const cast: UnrealManifest["cast"] = [
    { id: "patient", kind: "patient", role: "patient", name: sc.patient.name, modelHint: modelHint(sc.patient.age, sc.patient.sex) },
    ...(sc.team ?? []).map((m) => ({
      id: m.id,
      kind: "team" as const,
      role: m.role,
      name: m.name,
      modelHint: `staff_${m.role}`,
    })),
  ];

  return {
    manifestVersion: 1,
    scene: { id: sc.id, title: sc.title, setting: sc.setting },
    environment: {
      key: setting?.unrealEnvironmentKey ?? "env_medsurg_room",
      label: setting?.label ?? "Med-surg room",
      equipment: setting?.typicalEquipment ?? [],
    },
    patient: {
      name: sc.patient.name,
      age: sc.patient.age,
      sex: sc.patient.sex,
      modelHint: modelHint(sc.patient.age, sc.patient.sex),
      initialPose: sc.initialVitals.loc === "unresponsive" ? "supine" : "semi_fowler",
    },
    cast,
    vitalsTrack: track,
    actionCues: sc.actions.map((a) => ({
      id: a.id,
      label: a.label,
      category: a.category,
      animation: ACTION_ANIMATION[a.category] ?? "nurse_generic",
    })),
    narrativeBeats,
    outcomes: Object.keys(sc.debrief.outcomeSummaries),
    durationSec: sc.durationSec,
  };
}
