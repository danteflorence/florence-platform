// ───────────────────────────────────────────────────────────────────────────
// PatientPresence - the patient as a PERSON on screen. A compact card whose
// avatar visibly changes with the live vitals: expression follows the derived
// presence state, skin tint follows perfusion, and the figure BREATHES at the
// patient's actual respiratory rate (unresponsive = barely at all).
//
// The avatar is a deliberately stylized SVG (dignified, not uncanny). When
// MetaHuman portrait renders exist, pass `portraitUrl` (keyed by personaId +
// presence state) and the image replaces the SVG - the state machinery in
// lib/vpatient/presence.ts is the contract either way.
// ───────────────────────────────────────────────────────────────────────────

import type { VitalsState } from "../../data/vpatient/types";
import { presenceCaption, presenceState, skinToneOf, type PresenceState, type SkinTone } from "../../lib/vpatient/presence";

const SKIN: Record<SkinTone, { face: string; lips: string }> = {
  normal: { face: "#C99B7E", lips: "#A9666B" },
  pale: { face: "#D9C6B8", lips: "#B08A8C" },
  cyanotic: { face: "#B4A79E", lips: "#5E7A9B" },
  flushed: { face: "#D58F73", lips: "#A6555C" },
};

function Eyes({ state }: { state: PresenceState }) {
  switch (state) {
    case "unresponsive":
      return (
        <>
          <line x1="24" y1="30" x2="32" y2="30" stroke="#3A3128" strokeWidth="2" strokeLinecap="round" />
          <line x1="40" y1="30" x2="48" y2="30" stroke="#3A3128" strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case "lethargic":
      return (
        <>
          <path d="M24 30 q4 2.5 8 0" fill="none" stroke="#3A3128" strokeWidth="2" strokeLinecap="round" />
          <path d="M40 30 q4 2.5 8 0" fill="none" stroke="#3A3128" strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case "distressed":
    case "anxious":
      return (
        <>
          {/* widened eyes + raised brows */}
          <circle cx="28" cy="30" r="3.4" fill="#3A3128" />
          <circle cx="44" cy="30" r="3.4" fill="#3A3128" />
          <path d="M23 23 q5 -3.5 10 -1" fill="none" stroke="#3A3128" strokeWidth="2" strokeLinecap="round" />
          <path d="M39 22 q5 -2.5 10 1" fill="none" stroke="#3A3128" strokeWidth="2" strokeLinecap="round" />
        </>
      );
    default:
      return (
        <>
          <circle cx="28" cy="30" r="2.6" fill="#3A3128" />
          <circle cx="44" cy="30" r="2.6" fill="#3A3128" />
        </>
      );
  }
}

function Mouth({ state, lips }: { state: PresenceState; lips: string }) {
  switch (state) {
    case "unresponsive":
      return <line x1="32" y1="44" x2="40" y2="44" stroke={lips} strokeWidth="2.5" strokeLinecap="round" />;
    case "lethargic":
      return <path d="M32 45 q4 1 8 0" fill="none" stroke={lips} strokeWidth="2.5" strokeLinecap="round" />;
    case "distressed":
      return <ellipse cx="36" cy="45" rx="4.5" ry="3.4" fill={lips} />; // open, gasping
    case "anxious":
      return <path d="M31 46 q5 -2.5 10 0" fill="none" stroke={lips} strokeWidth="2.5" strokeLinecap="round" />;
    default:
      return <path d="M31 44 q5 2.5 10 0" fill="none" stroke={lips} strokeWidth="2.5" strokeLinecap="round" />;
  }
}

export default function PatientPresence({
  vitals,
  name,
  portraitUrl,
}: {
  vitals: VitalsState;
  name: string;
  /** MetaHuman render for this persona+state, when the 3D asset pass lands. */
  portraitUrl?: string;
}) {
  const state = presenceState(vitals);
  const tone = skinToneOf(vitals);
  const skin = SKIN[tone];
  // Breathe at the real RR; unresponsive = barely perceptible.
  const breathSec = Math.max(1.3, 60 / Math.max(6, vitals.rr));
  const breathScale = state === "unresponsive" ? 1.008 : state === "distressed" ? 1.045 : 1.025;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-florence-line bg-florence-ink px-3 py-2.5">
      <style>{`@keyframes fl-breathe { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(${breathScale}); } }`}</style>
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/5">
        {portraitUrl ? (
          <img src={portraitUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <svg viewBox="0 0 72 72" className="h-full w-full" aria-hidden="true">
            {/* shoulders breathe */}
            <g style={{ animation: `fl-breathe ${breathSec}s ease-in-out infinite`, transformOrigin: "36px 72px" }}>
              <path d="M12 72 q0 -18 24 -18 q24 0 24 18 Z" fill="#5B6675" />
              <path d="M12 72 q0 -18 24 -18 q24 0 24 18 Z" fill={skin.face} opacity="0.15" />
            </g>
            {/* head */}
            <g>
              <circle cx="36" cy="33" r="17" fill={skin.face} />
              <Eyes state={state} />
              <Mouth state={state} lips={skin.lips} />
            </g>
          </svg>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white/90">{name}</p>
        <p className="text-xs leading-snug text-white/60">{presenceCaption(vitals)}</p>
      </div>
      <span
        className={`ml-auto h-2.5 w-2.5 shrink-0 rounded-full ${
          state === "alert" ? "bg-vital-ok" : state === "anxious" ? "bg-vital-warn" : "bg-vital-danger animate-pulse-dot"
        }`}
        aria-label={`Patient state: ${state}`}
      />
    </div>
  );
}
