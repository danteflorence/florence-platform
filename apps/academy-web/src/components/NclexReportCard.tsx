// ───────────────────────────────────────────────────────────────────────────
// NclexReportCard - "Took your exam? Tell us how it went." The candidate's
// self-report lands in the outcomes ledger (source: self_report) and becomes
// the raw material for readiness-cut validation - the number that eventually
// proves the program works. One report only; corrections go through ops.
// ───────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { ApiError, call } from "../lib/academyAuth";

export default function NclexReportCard() {
  const [status, setStatus] = useState<"pass" | "fail" | null>(null);
  const [testedOn, setTestedOn] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done" | "already">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!status || state === "saving") return;
    setState("saving");
    setError(null);
    try {
      await call("/v1/me/nclex-outcome", {
        method: "POST",
        body: testedOn ? { status, tested_on: testedOn } : { status },
      });
      setState("done");
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setState("already");
      } else {
        setState("idle");
        setError(e instanceof Error ? e.message : "Could not save - try again.");
      }
    }
  };

  if (state === "done") {
    return (
      <div className="rounded-2xl border border-florence-line bg-white p-5 shadow-card">
        <h2 className="text-base font-semibold text-florence-ink">
          {status === "pass" ? "Congratulations, nurse. 🎉" : "Thank you for telling us."}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-florence-slate">
          {status === "pass"
            ? "Your result is recorded. Every reported result makes the readiness signal sharper for the nurses behind you."
            : "Your result is recorded, and your instructor will reach out with a retake plan. Most candidates who retake with a focused plan pass - this is a detour, not the destination."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-florence-line bg-white p-5 shadow-card">
      <h2 className="text-base font-semibold text-florence-ink">Took your NCLEX?</h2>
      <p className="mt-1 text-sm text-florence-slate">
        Report your result. It stays private to Florence and your instructor, and it makes the
        readiness guidance more accurate for every nurse after you.
      </p>
      {state === "already" ? (
        <p className="mt-3 rounded-xl bg-florence-mist px-4 py-3 text-sm text-florence-slate">
          A result is already on file. If it needs correcting, contact your instructor.
        </p>
      ) : (
        <>
          <div className="mt-3 flex gap-2">
            {(["pass", "fail"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                  status === s
                    ? "border-florence-teal bg-florence-teal-soft/50 text-florence-teal-dark"
                    : "border-florence-line bg-white text-florence-ink hover:bg-florence-mist"
                }`}
              >
                {s === "pass" ? "I passed" : "I didn't pass"}
              </button>
            ))}
          </div>
          <label className="mt-3 block text-xs font-medium text-florence-slate">
            Exam date (optional)
            <input
              type="date"
              value={testedOn}
              onChange={(e) => setTestedOn(e.target.value)}
              className="mt-1 block rounded-xl border border-florence-line px-3 py-2 text-sm text-florence-ink"
            />
          </label>
          {error && <p className="mt-2 text-sm text-vital-danger">{error}</p>}
          <button
            onClick={submit}
            disabled={!status || state === "saving"}
            className="mt-3 rounded-xl bg-florence-teal px-5 py-2.5 text-sm font-semibold text-white shadow-card enabled:hover:bg-florence-teal-dark disabled:opacity-50"
          >
            {state === "saving" ? "Saving…" : "Save my result"}
          </button>
        </>
      )}
    </div>
  );
}
