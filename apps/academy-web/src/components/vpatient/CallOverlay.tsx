// ───────────────────────────────────────────────────────────────────────────
// CallOverlay - escalation feels like a real phone call. Tapping a communicate
// action that targets a team member opens this instead of instantly firing:
// the callee "answers", and the learner composes a structured S-B-A-R before
// delivering. The sim CLOCK KEEPS RUNNING while they type - organizing your
// handoff under time pressure is the skill.
//
// v1 scaffolding, not grading: the text isn't scored (the rubric already
// scores WHETHER and WHEN you escalated); writing it is deliberate practice.
// Deliver dispatches the underlying engine action, so rules/narration/voice
// respond exactly as before.
// ───────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import type { ActionDef, TeamMember } from "../../data/vpatient/types";

const ROLE_LABEL: Record<string, string> = {
  charge_nurse: "Charge nurse",
  physician: "Physician",
  pharmacist: "Pharmacist",
  respiratory_therapist: "Respiratory therapist",
  rapid_response: "Rapid response",
  provider_on_call: "Provider on call",
  social_work: "Social work",
  case_manager: "Case manager",
};

const SBAR_FIELDS: { key: "s" | "b" | "a" | "r"; label: string; hint: string }[] = [
  { key: "s", label: "S — Situation", hint: "Who you are, the patient, and the problem in one sentence." },
  { key: "b", label: "B — Background", hint: "Relevant history, meds, and what changed." },
  { key: "a", label: "A — Assessment", hint: "The vitals and findings that worry you." },
  { key: "r", label: "R — Recommendation", hint: "What you need from them, and how fast." },
];

export default function CallOverlay({
  action,
  member,
  clockSec,
  onDeliver,
  onHangUp,
}: {
  action: ActionDef;
  member: TeamMember | undefined;
  clockSec: number;
  onDeliver: () => void;
  onHangUp: () => void;
}) {
  const [connected, setConnected] = useState(false);
  const [sbar, setSbar] = useState({ s: "", b: "", a: "", r: "" });

  useEffect(() => {
    const t = setTimeout(() => setConnected(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const roleLabel = ROLE_LABEL[action.targetRole ?? ""] ?? "Care team";
  const name = member?.name ?? roleLabel;
  const filled = Object.values(sbar).filter((v) => v.trim().length >= 3).length;
  const canDeliver = connected && filled >= 2;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-florence-ink/80 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-4 shadow-2xl sm:rounded-3xl">
        {/* Call header */}
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-florence-indigo-soft text-lg" aria-hidden="true">
            📞
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-florence-ink">{name}</p>
            <p className="text-xs text-florence-slate">
              {connected ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-vital-ok" /> On the line — clock is running
                </span>
              ) : (
                "Calling…"
              )}
            </p>
          </div>
          <span className="font-mono text-xs text-florence-slate">
            {String(Math.floor(clockSec / 60)).padStart(2, "0")}:{String(clockSec % 60).padStart(2, "0")}
          </span>
        </div>

        {/* SBAR form */}
        <div className="mt-3 space-y-2">
          {SBAR_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="text-[11px] font-bold uppercase tracking-wide text-florence-slate" htmlFor={`sbar-${f.key}`}>
                {f.label}
              </label>
              <textarea
                id={`sbar-${f.key}`}
                value={sbar[f.key]}
                onChange={(e) => setSbar((cur) => ({ ...cur, [f.key]: e.target.value }))}
                placeholder={f.hint}
                rows={1}
                className="mt-0.5 w-full resize-none rounded-lg border border-florence-line px-2.5 py-1.5 text-sm leading-snug text-florence-ink placeholder:text-florence-slate/60"
              />
            </div>
          ))}
        </div>

        <p className="mt-2 text-[11px] text-florence-slate">
          Fill at least two sections, then deliver. Your handoff isn't graded — making it is the practice.
        </p>

        <div className="mt-3 flex gap-2">
          <button
            onClick={onHangUp}
            className="rounded-xl border border-florence-line bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            Hang up
          </button>
          <button
            onClick={onDeliver}
            disabled={!canDeliver}
            className="flex-1 rounded-xl bg-florence-teal px-4 py-2.5 text-sm font-semibold text-white shadow-card hover:bg-florence-teal-dark disabled:opacity-40"
          >
            {connected ? `Deliver SBAR (${filled}/4)` : "Connecting…"}
          </button>
        </div>
      </div>
    </div>
  );
}
