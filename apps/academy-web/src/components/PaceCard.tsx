// ───────────────────────────────────────────────────────────────────────────
// PaceCard - the reading-pace profile, rendered after a practice session.
// English-under-time-pressure is the quiet IEN failure mode; this card makes
// the habit visible: median seconds per item vs the 90s exam budget, how often
// the budget blows, and whether slow answers are actually MORE accurate
// (productive care) or not (re-reading). Data is the device-local rolling
// window from lib/pacing.ts.
// ───────────────────────────────────────────────────────────────────────────

import { useMemo } from "react";
import { paceProfile, PACE_BUDGET_MS } from "../lib/pacing";

const BAND_STYLE: Record<string, { label: string; cls: string }> = {
  fast: { label: "Fast", cls: "bg-emerald-50 text-emerald-800" },
  "on-pace": { label: "On pace", cls: "bg-emerald-50 text-emerald-800" },
  slow: { label: "Over budget", cls: "bg-amber-50 text-amber-800" },
  unknown: { label: "Building profile", cls: "bg-florence-mist text-florence-slate" },
};

export default function PaceCard() {
  const profile = useMemo(() => paceProfile(), []);
  const band = BAND_STYLE[profile.band];
  const budgetSec = PACE_BUDGET_MS / 1000;

  return (
    <div className="rounded-2xl border border-florence-line bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-florence-ink">Your reading pace</p>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${band.cls}`}>{band.label}</span>
      </div>
      {profile.medianSec !== null ? (
        <>
          <div className="mt-3 flex items-end gap-6">
            <div>
              <p className="font-mono text-2xl font-bold text-florence-ink">
                {profile.medianSec}s
                <span className="ml-1 text-xs font-medium text-florence-slate">/ item</span>
              </p>
              <p className="text-xs text-florence-slate">median · exam budget {budgetSec}s</p>
            </div>
            <div className="text-xs leading-relaxed text-florence-slate">
              <p>
                Slowest 10%: <span className="font-semibold text-florence-ink">{profile.p90Sec}s</span>
              </p>
              <p>
                Over budget:{" "}
                <span className="font-semibold text-florence-ink">
                  {Math.round((profile.overBudget ?? 0) * 100)}%
                </span>{" "}
                of items
              </p>
            </div>
          </div>
          {/* Median vs budget bar */}
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-florence-mist">
            <div
              className={`h-full rounded-full ${profile.band === "slow" ? "bg-vital-warn" : "bg-vital-ok"}`}
              style={{ width: `${Math.min(100, ((profile.medianSec ?? 0) / (budgetSec * 1.5)) * 100)}%` }}
            />
          </div>
          <p className="mt-0.5 text-right text-[11px] text-florence-slate/70">{budgetSec}s budget at {Math.round((budgetSec / (budgetSec * 1.5)) * 100)}%</p>
        </>
      ) : null}
      <p className="mt-2 text-xs leading-relaxed text-florence-slate">{profile.advice}</p>
    </div>
  );
}
