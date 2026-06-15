// Retention playbook — maps an OnboardingRisk to a prioritized set of retention
// actions (mirrors the Academy remediation dispatch: base actions by band + one
// targeted nudge per weakest subscale gap). Pure + dependency-free, no enums.
//
// SAFETY: contentRef values are OPAQUE keys only — the actual nudge scripts /
// check-in cadences / manager-outreach templates are authored + QA'd by clinical/
// retention leadership (AI drafts, humans QA). No clinical copy lives here.
// NOTE: lives in retentionPlaybook.ts (Phase 1 owns retention.ts — the revenue tail).

import type { OnboardingRisk, RiskBand } from "./onboardingRisk.ts";
import { RISK_BANDS } from "./onboardingRisk.ts";

export interface RetentionAction {
  priority: number; // 1 = most urgent
  actionType: "increased_checkins" | "remediation_nudge" | "manager_outreach" | "cohort_learning" | "coaching_referral";
  cadence: "once" | "daily" | "weekly" | "biweekly";
  contentRef: string; // opaque key, /^[a-z0-9_.:-]+$/
  gapType?: string;
}
export interface RetentionPlaybook { band: RiskBand; priority: number; actions: RetentionAction[] }

const PLAYBOOK_BY_BAND: Record<RiskBand, Omit<RetentionAction, "gapType">[]> = {
  low: [{ priority: 3, actionType: "increased_checkins", cadence: "biweekly", contentRef: "checkin.standard" }],
  medium: [
    { priority: 2, actionType: "increased_checkins", cadence: "weekly", contentRef: "checkin.weekly" },
    { priority: 3, actionType: "cohort_learning", cadence: "weekly", contentRef: "cohort.peer_support" },
  ],
  high: [
    { priority: 1, actionType: "increased_checkins", cadence: "weekly", contentRef: "checkin.weekly" },
    { priority: 2, actionType: "coaching_referral", cadence: "once", contentRef: "coaching.transition" },
  ],
  critical: [
    { priority: 1, actionType: "manager_outreach", cadence: "once", contentRef: "manager.outreach_urgent" },
    { priority: 1, actionType: "increased_checkins", cadence: "daily", contentRef: "checkin.daily" },
    { priority: 2, actionType: "coaching_referral", cadence: "once", contentRef: "coaching.transition" },
  ],
};

const safeRef = (s: string): string => s.toLowerCase().replace(/[^a-z0-9_.:-]/g, "_");

/** Base actions for the band + one remediation_nudge per weakest-first gap. */
export function playbookFor(risk: OnboardingRisk): RetentionPlaybook {
  const base: RetentionAction[] = PLAYBOOK_BY_BAND[risk.band].map((a) => ({ ...a }));
  const gapActions: RetentionAction[] = risk.gaps.map((g) => ({
    priority: 2,
    actionType: "remediation_nudge" as const,
    cadence: "weekly" as const,
    contentRef: safeRef(`remediation.${g.dim}.${g.key}`),
    gapType: g.key,
  }));
  // Stable sort by priority keeps weakest-first order among the gap nudges.
  const actions = [...base, ...gapActions].sort((a, b) => a.priority - b.priority);
  const priority = actions.length ? Math.min(...actions.map((a) => a.priority)) : 3;
  return { band: risk.band, priority, actions };
}

/** Recommended actions per band (no gaps) — for the Control Tower aggregate. */
export function recommendedActionsByBand(): Record<RiskBand, RetentionAction[]> {
  return Object.fromEntries(
    RISK_BANDS.map((b) => [b, playbookFor({ nurseId: "", band: b, baselineBand: b, score: 0, gaps: [], factors: [], reasonCodes: [], assessedAt: "" }).actions]),
  ) as Record<RiskBand, RetentionAction[]>;
}
