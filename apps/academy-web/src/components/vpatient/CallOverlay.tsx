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

import { useEffect, useMemo, useState } from "react";
import type { ActionDef, TeamMember } from "../../data/vpatient/types";
import { readbackQuiz } from "../../lib/vpatient/readback";

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
  orders = [],
  onDeliver,
  onHangUp,
}: {
  action: ActionDef;
  member: TeamMember | undefined;
  clockSec: number;
  /** Verbal orders this call produces (labels of actions it unlocks). When
   *  present, delivering the SBAR leads into a read-back check - Joint
   *  Commission NPSG 02.03.01, the phone ritual US practice runs on. */
  orders?: string[];
  onDeliver: () => void;
  onHangUp: () => void;
}) {
  const [connected, setConnected] = useState(false);
  const [sbar, setSbar] = useState({ s: "", b: "", a: "", r: "" });
  // "compose" → (deliver) → "readback" when the provider gives an order.
  const [phase, setPhase] = useState<"compose" | "readback">("compose");
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setConnected(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const roleLabel = ROLE_LABEL[action.targetRole ?? ""] ?? "Care team";
  const name = member?.name ?? roleLabel;
  const filled = Object.values(sbar).filter((v) => v.trim().length >= 3).length;
  const canDeliver = connected && filled >= 2;

  const quiz = useMemo(() => (orders.length ? readbackQuiz(orders[0]) : null), [orders]);

  const deliver = () => {
    // The engine responds immediately (orders unlock, narration fires); the
    // read-back is the learner's half of closing the loop.
    onDeliver();
    if (quiz) setPhase("readback");
    else onHangUp();
  };

  if (phase === "readback" && quiz) {
    const correct = picked === quiz.correctIndex;
    return (
      <div className="fixed inset-0 z-40 flex items-end justify-center bg-florence-ink/80 backdrop-blur-sm sm:items-center">
        <div className="w-full max-w-md rounded-t-3xl bg-white p-4 shadow-2xl sm:rounded-3xl">
          <p className="text-sm font-semibold text-florence-ink">{name}</p>
          <p className="mt-2 rounded-xl bg-florence-indigo-soft/40 px-3 py-2 text-sm italic text-florence-ink">
            "OK - {orders[0]}. Read that back to me."
          </p>
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-florence-slate">
            Your read-back
          </p>
          <div className="mt-1.5 space-y-2">
            {quiz.options.map((opt, i) => {
              const cls =
                picked === null
                  ? "border-florence-line bg-white hover:bg-florence-mist"
                  : i === quiz.correctIndex
                    ? "border-vital-ok bg-emerald-50"
                    : i === picked
                      ? "border-vital-danger bg-red-50"
                      : "border-florence-line bg-white opacity-60";
              return (
                <button
                  key={i}
                  disabled={picked !== null}
                  onClick={() => setPicked(i)}
                  className={`block w-full rounded-xl border px-3 py-2 text-left text-sm text-florence-ink ${cls}`}
                >
                  "{opt}"
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <div className="mt-3">
              <p className="text-sm text-florence-ink">
                {correct
                  ? '"Correct. Thanks." Read-back confirmed - that\'s how orders stay safe over the phone.'
                  : `"No - ${orders[0]}." Numbers are where phone orders go wrong: repeat the order verbatim, digit by digit.`}
              </p>
              <button
                onClick={onHangUp}
                className="mt-3 w-full rounded-xl bg-florence-teal px-4 py-2.5 text-sm font-semibold text-white shadow-card hover:bg-florence-teal-dark"
              >
                Hang up and carry out the order
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

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
              <label className="text-xs font-bold uppercase tracking-wide text-florence-slate" htmlFor={`sbar-${f.key}`}>
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

        <p className="mt-2 text-xs text-florence-slate">
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
            onClick={deliver}
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
