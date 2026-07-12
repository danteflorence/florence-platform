// ───────────────────────────────────────────────────────────────────────────
// Today's Plan - the Daily Coach's learner face. Adherence is the strongest
// pass-rate lever we control, so the first thing a signed-in learner sees is
// ONE day-sized plan: review what's due, drill the weakest area, run the sim
// of the day, and keep the streak alive. Data: /v1/me/daily-plan (streak,
// focus areas, plan-day index) + the client-side spaced queue (due count) +
// the NCLEX review plan (sim of the day).
// ───────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiBaseUrl, call, storedToken } from "../lib/academyAuth";
import { useCandidate } from "../lib/CandidateContext";
import { dueEntries, loadQueue } from "../lib/spacedQueue";
import { approvedScenarios } from "../data/vpatient/registry";
import { buildReviewPlan } from "../lib/vpatient/nclexReviewPlan";
import { CLIENT_NEED_LABEL } from "../data/blueprint";
import type { ClientNeed } from "../types/question";

interface DailyPlan {
  today: string;
  active_today: boolean;
  streak_days: number;
  readiness: { band: string; next_action: string; focus_areas: string[] };
  open_remediations: number;
  plan_day_index: number;
}

export default function TodaysPlanCard() {
  const { candidate } = useCandidate();
  const [plan, setPlan] = useState<DailyPlan | null>(null);

  useEffect(() => {
    if (!candidate || !storedToken() || !apiBaseUrl()) return;
    let active = true;
    call<DailyPlan>("/v1/me/daily-plan")
      .then((p) => {
        if (active) setPlan(p);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [candidate]);

  const dueCount = useMemo(
    () => (candidate ? dueEntries(loadQueue(candidate.id), Date.now()).length : 0),
    [candidate],
  );
  const simOfTheDay = useMemo(() => {
    const sims = approvedScenarios();
    if (sims.length === 0 || !plan) return undefined;
    const days = buildReviewPlan(sims, Math.max(sims.length, 5));
    return days[plan.plan_day_index % days.length];
  }, [plan]);

  if (!plan) return null;

  const focus = plan.readiness.focus_areas[0] as ClientNeed | undefined;
  const focusLabel = focus ? (CLIENT_NEED_LABEL[focus] ?? focus) : undefined;

  const items: { label: string; detail: string; to: string }[] = [
    {
      label: "Review",
      detail: dueCount > 0 ? `${dueCount} card${dueCount === 1 ? "" : "s"} due` : "Nothing due — bank one anyway",
      to: "/academy/practice",
    },
    ...(focusLabel
      ? [{ label: "Practice", detail: `10 items · ${focusLabel}`, to: "/academy/practice" }]
      : []),
    ...(simOfTheDay?.simOfTheDayId
      ? [{ label: "Sim of the day", detail: simOfTheDay.simTitle ?? "Virtual patient", to: `/sim/${simOfTheDay.simOfTheDayId}` }]
      : []),
    ...(plan.open_remediations > 0
      ? [{ label: "Remediation", detail: `${plan.open_remediations} open`, to: "/academy/practice" }]
      : []),
  ];

  return (
    <div className="rounded-2xl border border-florence-line bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-florence-ink">Today's plan</p>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            plan.streak_days > 0 ? "bg-amber-50 text-amber-800" : "bg-florence-mist text-florence-slate"
          }`}
          title="Consecutive study days"
        >
          🔥 {plan.streak_days}-day streak
        </span>
      </div>
      <p className="mt-1 text-xs text-florence-slate">{plan.readiness.next_action}</p>
      <ul className="mt-3 space-y-1.5">
        {items.map((it) => (
          <li key={it.label}>
            <Link
              to={it.to}
              className="flex items-center justify-between rounded-xl border border-florence-line px-3 py-2 hover:bg-florence-mist/60"
            >
              <span className="text-sm font-medium text-florence-ink">{it.label}</span>
              <span className="text-xs text-florence-slate">{it.detail} →</span>
            </Link>
          </li>
        ))}
      </ul>
      {plan.active_today ? (
        <p className="mt-2 text-[11px] font-medium text-emerald-700">✓ You've studied today — streak safe.</p>
      ) : (
        <p className="mt-2 text-[11px] font-medium text-amber-700">Nothing yet today — one item keeps the streak.</p>
      )}
    </div>
  );
}
