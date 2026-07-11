// ───────────────────────────────────────────────────────────────────────────
// Patient presence - derives WHAT THE PATIENT LOOKS LIKE from the live vitals,
// so the player can show a person who visibly changes as they deteriorate
// (the single biggest "feels real" signal short of full 3D).
//
// Pure + deterministic (tested). The renderer (PatientPresence.tsx) maps the
// state to an expression/posture; when real persona portraits exist
// (MetaHuman renders keyed by personaId + state), the same state picks the
// image - this module is the contract either way.
// ───────────────────────────────────────────────────────────────────────────

import type { VitalsState } from "../../data/vpatient/types";

export type PresenceState = "alert" | "anxious" | "distressed" | "lethargic" | "unresponsive";

/** Perfusion-driven skin tint (mirrors the Unreal manifest's visual cues). */
export type SkinTone = "normal" | "pale" | "cyanotic" | "flushed";

export function skinToneOf(v: VitalsState): SkinTone {
  if (v.spo2 < 88) return "cyanotic";
  if (v.sbp < 90) return "pale";
  if (v.tempC >= 38.5) return "flushed";
  return "normal";
}

/**
 * The presence state. LOC dominates (a lethargic patient LOOKS lethargic no
 * matter the numbers); above that, physiologic distress shows before the
 * learner reads a single number.
 */
export function presenceState(v: VitalsState): PresenceState {
  if (v.loc === "unresponsive") return "unresponsive";
  if (v.loc === "lethargic") return "lethargic";
  // Confused or alert: let the physiology speak.
  const desat = v.spo2 < 90;
  const shocky = v.sbp < 90;
  const workingHard = v.rr >= 26 || v.hr >= 125;
  if (desat || shocky) return "distressed";
  if (workingHard || v.pain >= 7 || v.loc === "confused") return "anxious";
  return "alert";
}

/** A short human caption the presence panel shows under the avatar. */
export function presenceCaption(v: VitalsState): string {
  const s = presenceState(v);
  const tone = skinToneOf(v);
  const toneText =
    tone === "cyanotic" ? "lips dusky" : tone === "pale" ? "pale" : tone === "flushed" ? "flushed" : "";
  switch (s) {
    case "unresponsive":
      return "Unresponsive.";
    case "lethargic":
      return toneText ? `Lethargic, ${toneText}.` : "Lethargic, eyes closing.";
    case "distressed":
      return toneText ? `In visible distress, ${toneText}.` : "In visible distress.";
    case "anxious":
      return v.rr >= 26 ? "Anxious, working to breathe." : "Restless and uneasy.";
    default:
      return "Resting comfortably.";
  }
}
