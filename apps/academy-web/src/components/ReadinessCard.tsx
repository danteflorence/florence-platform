// The learner-facing readiness card - the render half of the loop the API
// already computes (band → route → next_action). Shown on AcademyHome and on
// the session Results screen for signed-in learners; anonymous/static builds
// never mount it (no snapshot exists).

import { Link } from "react-router-dom";
import type { ReadinessSnapshot } from "../lib/academyAuth";
import { presentReadiness } from "../lib/readinessView";

export default function ReadinessCard({
  snapshot,
  heading = "Your NCLEX readiness",
}: {
  snapshot: ReadinessSnapshot;
  heading?: string;
}) {
  const v = presentReadiness(snapshot);
  return (
    <div className="fl-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-sm font-medium text-florence-slate">{heading}</p>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${v.presentation.chipClass}`}
        >
          {v.presentation.label}
        </span>
        {v.passPct != null && (
          <span className="text-xs text-florence-slate">
            <span className="font-semibold tabular-nums text-florence-ink">{v.passPct}%</span>{" "}
            projected pass probability
          </span>
        )}
      </div>

      <p className="mt-3 text-base font-semibold leading-snug text-florence-ink">
        {v.nextAction}
      </p>

      {v.focusAreas.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-florence-slate">
            Focus areas
          </span>
          {v.focusAreas.map((label) => (
            <span
              key={label}
              className="rounded-full bg-florence-mist px-2.5 py-0.5 text-xs font-medium text-florence-ink"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-florence-slate">
          <span>
            {v.sectionsCompleted} of {v.sectionsTotal} sections completed
          </span>
          <span className="tabular-nums">
            {v.assessmentsTaken} {v.assessmentsTaken === 1 ? "assessment" : "assessments"} ·{" "}
            {v.itemsCompleted} items
          </span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-florence-mist">
          <div
            className={`fl-bar-fill h-full rounded-full ${v.presentation.barClass}`}
            style={{ width: `${Math.max(v.sectionsPct, v.sectionsPct > 0 ? 3 : 0)}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to={v.band === "none" ? "/academy/practice?mode=baseline" : "/academy/practice"}
          className="fl-press rounded-xl bg-florence-teal px-4 py-2 text-sm font-semibold text-white shadow-card transition-colors hover:bg-florence-teal-dark"
        >
          {v.band === "none" ? "Take a baseline diagnostic →" : "Practice what's next →"}
        </Link>
        <Link
          to="/academy/tutor"
          className="rounded-xl border border-florence-line bg-white px-4 py-2 text-sm font-semibold text-florence-ink hover:bg-florence-mist"
        >
          Review with Florence Tutor
        </Link>
      </div>
    </div>
  );
}
