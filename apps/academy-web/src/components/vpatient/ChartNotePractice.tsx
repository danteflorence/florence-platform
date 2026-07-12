// ───────────────────────────────────────────────────────────────────────────
// ChartNotePractice - "now chart it." After a sim run, the learner writes the
// nurse's note for what just happened and gets rule-based feedback on the
// four things US documentation reviews look for: objective, complete, timed,
// closed-loop. Grading: POST /v1/sim/chart-note (deterministic heuristic;
// the note is never stored).
// ───────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { call } from "../../lib/academyAuth";

interface Feedback {
  score: number;
  found: string[];
  missing: string[];
  style_flags: string[];
  feedback: string;
}

export default function ChartNotePractice({ expected }: { expected: string[] }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [fb, setFb] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grade = async () => {
    if (busy || note.trim().length < 20) return;
    setBusy(true);
    setError(null);
    try {
      setFb(await call<Feedback>("/v1/sim/chart-note", { method: "POST", body: { note, expected } }));
    } catch {
      setError("Couldn't grade the note - check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-6 w-full rounded-xl border border-florence-line bg-white px-4 py-3 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-lg"
      >
        <span className="text-sm font-semibold text-florence-ink">📝 Now chart it - write the nurse's note</span>
        <span className="mt-0.5 block text-xs text-florence-slate">
          The shift isn't over until it's documented. Write the note for this run and get feedback on US-style charting.
        </span>
      </button>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-florence-line bg-white p-4 shadow-card">
      <p className="text-sm font-semibold text-florence-ink">Chart this run</p>
      <p className="mt-1 text-xs text-florence-slate">
        Objective, complete, timed, closed-loop. Chart what you found, what you did, and who you told. Your note is graded, not stored.
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={6}
        placeholder={'e.g. "14:32 BP 86/54, HR 122… O2 4L NC applied… Dr. Reyes notified at 14:35…"'}
        className="mt-3 w-full rounded-xl border border-florence-line px-3 py-2 text-sm leading-relaxed text-florence-ink"
      />
      {error && <p className="mt-2 text-sm text-vital-danger">{error}</p>}
      <button
        onClick={grade}
        disabled={busy || note.trim().length < 20}
        className="mt-2 rounded-xl bg-florence-teal px-5 py-2.5 text-sm font-semibold text-white shadow-card enabled:hover:bg-florence-teal-dark disabled:opacity-40"
      >
        {busy ? "Reviewing…" : "Review my note"}
      </button>

      {fb && (
        <div className="mt-4 space-y-2 border-t border-florence-line pt-3">
          <p className="text-sm font-semibold text-florence-ink">
            Documentation score: {Math.round(fb.score * 100)}%
          </p>
          <p className="text-sm leading-relaxed text-florence-ink">{fb.feedback}</p>
          {fb.style_flags.length > 0 && (
            <ul className="space-y-1">
              {fb.style_flags.map((f, i) => (
                <li key={i} className="text-xs leading-relaxed text-amber-900/90">
                  ⚠ {f}
                </li>
              ))}
            </ul>
          )}
          {fb.found.length > 0 && (
            <p className="text-xs text-florence-slate">Covered: {fb.found.join(" · ")}</p>
          )}
        </div>
      )}
    </div>
  );
}
