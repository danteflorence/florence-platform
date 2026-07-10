// Remediation Runner (learner surface) - closes the loop the API already opens.
// The server auto-dispatches a RemediationAssignment for every weak subscale
// (theta < 0, >= 4 items); until now nothing showed it to the learner, so the
// assignment evaporated. This panel lists the open assignments and launches a
// FOCUSED practice drill on exactly that weak area, then lets the learner mark
// it cleared.

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  clearRemediation,
  fetchRemediations,
  type RemediationAssignment,
} from "../lib/academyAuth";
import { useCandidate } from "../lib/CandidateContext";
import { CLIENT_NEED_LABEL } from "../data/blueprint";
import { CJMM_STEPS } from "../data/blueprint";
import type { ClientNeed } from "../types/question";

const CJMM_LABEL: Record<string, string> = Object.fromEntries(
  CJMM_STEPS.map((s) => [s.key, s.label]),
);

function labelFor(a: RemediationAssignment): string {
  if (a.dim === "client_need") return CLIENT_NEED_LABEL[a.key as ClientNeed] ?? a.key;
  return CJMM_LABEL[a.key] ?? a.key;
}

/** Where "Practice this now" sends the learner. Client-Need assignments deep-link
 *  into a focused adaptive drill; CJMM assignments route to unfolding cases,
 *  which are what actually exercise clinical-judgment steps. */
function practiceHref(a: RemediationAssignment): string {
  if (a.dim === "client_need") return `/academy/practice?focus=${encodeURIComponent(a.key)}`;
  return `/academy/practice?mode=cases`;
}

export default function RemediationPanel() {
  const { candidate, status } = useCandidate();
  const [rows, setRows] = useState<RemediationAssignment[] | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!candidate) return;
    try {
      const all = await fetchRemediations(candidate.id);
      setRows(all.filter((r) => r.status !== "cleared"));
    } catch {
      setRows([]); // best-effort; never block the home page
    }
  }, [candidate]);

  useEffect(() => {
    void load();
  }, [load]);

  if (status !== "authenticated" || !rows || rows.length === 0) return null;

  const markCleared = async (a: RemediationAssignment) => {
    if (!candidate) return;
    const k = `${a.dim}:${a.key}`;
    setBusyKey(k);
    try {
      await clearRemediation(candidate.id, a.dim, a.key);
      setRows((prev) => (prev ? prev.filter((r) => `${r.dim}:${r.key}` !== k) : prev));
    } catch {
      /* leave it in place if the clear failed */
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="fl-card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-florence-slate">Your remediation plan</p>
        <span className="rounded-full bg-vital-warn/15 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
          {rows.length} {rows.length === 1 ? "area" : "areas"} to close
        </span>
      </div>
      <p className="mt-1 text-sm text-florence-ink">
        Florence flagged these from your recent work. Each one drills exactly the weak area.
      </p>

      <div className="mt-3 space-y-2">
        {rows.map((a) => {
          const k = `${a.dim}:${a.key}`;
          const pct = Math.round(a.pass_prob * 100);
          return (
            <div key={k} className="rounded-xl border border-florence-line bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-florence-ink">{labelFor(a)}</p>
                  <p className="text-xs text-florence-slate">
                    {a.dim === "client_need" ? "Client Need" : "Clinical judgment"} · currently{" "}
                    <span className="font-semibold">{pct}%</span> pass probability
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    to={practiceHref(a)}
                    className="rounded-lg bg-florence-teal px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-florence-teal-dark"
                  >
                    Practice this now →
                  </Link>
                  <button
                    onClick={() => markCleared(a)}
                    disabled={busyKey === k}
                    className="rounded-lg border border-florence-line px-3 py-1.5 text-xs font-medium text-florence-slate hover:bg-florence-mist disabled:opacity-50"
                  >
                    {busyKey === k ? "…" : "Mark cleared"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
