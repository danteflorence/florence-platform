// ───────────────────────────────────────────────────────────────────────────
// Voice cast - the roster of ElevenLabs voices for the sim + product, mapped to
// roles and ethnicities. US health care is diverse; the people a nurse works
// with (patients, physicians, pharmacists, colleagues) should SOUND diverse too.
//
// TWO fixed voices vs a BROAD cast (the operator's split):
//   - NARRATOR_VOICE_ID is the ONE consistent voice for instruction: lesson
//     narration, rationales, walkthroughs, and the live tutor's spoken replies.
//     Consistency matters for the "teacher" the learner comes to trust.
//   - Everyone else (patients, doctors, nurses, pharmacists) is drawn from
//     CAST[] - a broad, diverse library. Deterministic assignment keeps a given
//     persona/role sounding the same across a run without hand-casting each one.
//
// These ids are live in the FlorenceRN ElevenLabs account (added from the shared
// library). The account holds 660 voice slots, so this list grows over time
// (more accents: Vietnamese, Korean, Arabic, Ghanaian, Caribbean, ...).
// ───────────────────────────────────────────────────────────────────────────

import type { Persona } from "./castRegistry";
import type { TeamRoleKind } from "./types";

/** The single instruction voice: narrator + tutor + rationales + live replies.
 *  "Matilda" - American, professional educator. Swap here to re-voice all of it. */
export const NARRATOR_VOICE_ID = "XrExE9yKIg1WjnnlVkGX";

export type VoiceGender = "female" | "male";
export type VoiceAge = "young" | "middle" | "old";

export interface VoiceCastEntry {
  id: string; //          ElevenLabs voice_id
  label: string; //       "Filipino, warm (F)"
  gender: VoiceGender;
  age: VoiceAge;
  /** Accent / heritage - descriptive, for casting variety (not a stereotype rule). */
  heritage: string;
  /** Roles this voice reads well; any voice can also voice a patient. */
  roleHints: (TeamRoleKind | "patient")[];
}

// The diverse cast (13 today). heritage spans the biggest US immigrant-nurse and
// patient populations plus regional US accents.
export const CAST: VoiceCastEntry[] = [
  { id: "6AUOG2nbfr0yFEeI0784", label: "Filipino, warm (F)", gender: "female", age: "middle", heritage: "Filipino", roleHints: ["patient", "charge_nurse"] },
  { id: "iW5UKo8wEfpqHg3Xw3i3", label: "Filipino, calm (M)", gender: "male", age: "middle", heritage: "Filipino", roleHints: ["patient", "pharmacist", "respiratory_therapist"] },
  { id: "2zRM7PkgwBPiau2jvVXc", label: "Indian, clear (F)", gender: "female", age: "young", heritage: "Indian", roleHints: ["physician", "pharmacist"] },
  { id: "omLr0bN17lYIC1JWLSYV", label: "Indian, warm (M)", gender: "male", age: "young", heritage: "Indian", roleHints: ["physician", "provider_on_call"] },
  { id: "2vbhUP8zyKg4dEZaTWGn", label: "Nigerian, warm (F)", gender: "female", age: "young", heritage: "Nigerian", roleHints: ["patient", "charge_nurse"] },
  { id: "zwbf3iHXH6YGoTCPStfx", label: "Nigerian, direct (M)", gender: "male", age: "young", heritage: "Nigerian", roleHints: ["physician", "provider_on_call"] },
  { id: "zWoalRDt5TZrmW4ROIA7", label: "African-American NYC (F)", gender: "female", age: "middle", heritage: "African-American", roleHints: ["patient", "charge_nurse", "social_work"] },
  { id: "1cuDPO8sIMatoOE4Z2Zv", label: "African-American, calm (M)", gender: "male", age: "young", heritage: "African-American", roleHints: ["patient", "respiratory_therapist"] },
  { id: "ZwLTvq6uCfb4W00YFl7F", label: "Mexican-American (M)", gender: "male", age: "young", heritage: "Mexican-American", roleHints: ["patient", "case_manager"] },
  { id: "pBZVCk298iJlHAcHQwLr", label: "Latina, soothing (F)", gender: "female", age: "middle", heritage: "Latina", roleHints: ["patient", "social_work", "pharmacist"] },
  { id: "0rEo3eAjssGDUCXHYENf", label: "US Southern elder (F)", gender: "female", age: "old", heritage: "US Southern", roleHints: ["patient"] },
  { id: "Cb8NLd0sUB8jI4MW2f9M", label: "US Southern (M)", gender: "male", age: "middle", heritage: "US Southern", roleHints: ["patient"] },
  { id: "DLsHlh26Ugcm6ELvS0qi", label: "US Southern, reassuring (F)", gender: "female", age: "middle", heritage: "US Southern", roleHints: ["charge_nurse", "patient"] },
];

export const CAST_BY_ID = new Map(CAST.map((v) => [v.id, v]));

/** Deterministic index into a list from a string seed (stable per id, no RNG). */
function hashPick<T>(seed: string, list: T[]): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return list[h % list.length];
}

/**
 * The patient voice for a persona: matches the persona's sex, then spreads
 * across the diverse cast deterministically by persona id (so the same persona
 * always sounds the same, and recasting the persona recasts the voice). If a
 * persona sets an explicit `voiceId`, that wins.
 */
export function voiceForPersona(persona: Persona): string {
  if (persona.voiceId) return persona.voiceId;
  const want: VoiceGender = persona.sex === "F" ? "female" : "male";
  const pool = CAST.filter((v) => v.gender === want && v.roleHints.includes("patient"));
  const usable = pool.length ? pool : CAST.filter((v) => v.gender === want);
  return (usable.length ? hashPick(persona.id, usable) : CAST[0]).id;
}

/**
 * A voice for an interprofessional team member. Prefers voices whose roleHints
 * include the role, then spreads by the member id so a scenario's physician and
 * pharmacist don't collide. Falls back to any voice.
 */
export function voiceForTeamRole(role: TeamRoleKind, memberId: string): string {
  const pool = CAST.filter((v) => v.roleHints.includes(role));
  const usable = pool.length ? pool : CAST;
  return hashPick(`${role}:${memberId}`, usable).id;
}
