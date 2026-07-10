// Daily review card - the visible half of spaced re-practice. Shows how many
// missed items have resurfaced on the 1/3/7/14-day curve and launches a review
// session on exactly those items. Renders nothing when the queue is empty and
// no streak exists, so new learners never see a hollow widget.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCandidate } from "../lib/CandidateContext";
import { dueEntries, loadQueue, nextDueAt } from "../lib/spacedQueue";

export default function DailyReviewCard() {
  const { candidate } = useCandidate();
  const [state, setState] = useState<{ due: number; queued: number; streak: number; nextDue: number | null } | null>(null);

  useEffect(() => {
    const q = loadQueue(candidate?.id ?? null);
    const now = Date.now();
    setState({
      due: dueEntries(q, now).length,
      queued: q.entries.length,
      streak: q.streak,
      nextDue: nextDueAt(q, now),
    });
  }, [candidate]);

  if (!state || (state.queued === 0 && state.streak === 0)) return null;

  return (
    <div className="fl-card flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-florence-slate">Daily review</p>
          {state.streak > 1 && (
            <span className="rounded-full bg-florence-teal-soft px-2.5 py-0.5 text-xs font-bold text-florence-teal-dark">
              {state.streak}-day streak
            </span>
          )}
        </div>
        <p className="mt-1 text-base font-semibold text-florence-ink">
          {state.due > 0
            ? `${state.due} missed ${state.due === 1 ? "item is" : "items are"} back for review.`
            : "Nothing due today - the queue comes back on its curve."}
        </p>
        <p className="mt-0.5 text-xs text-florence-slate">
          {state.due > 0
            ? "Items you missed resurface on a 1/3/7/14-day schedule until you clear them four times."
            : state.nextDue
              ? `Next review ${new Date(state.nextDue).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}.`
              : "Miss an item in practice and it enters the review queue."}
        </p>
      </div>
      {state.due > 0 && (
        <Link
          to="/academy/practice?mode=review"
          className="shrink-0 rounded-xl bg-florence-indigo px-5 py-2.5 text-sm font-semibold text-white shadow-card hover:bg-florence-indigo-dark"
        >
          Start review →
        </Link>
      )}
    </div>
  );
}
