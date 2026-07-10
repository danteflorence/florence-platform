// Reasoning profile - the learner's error-taxonomy mix, aggregated across
// their assessment results (sim debriefs post error_tags; walkthrough data
// joins later). Reasoning errors TRANSFER across topics, so naming a
// learner's dominant pattern ("you tend to act late, not wrong") is worth
// more than another topic drill. Renders nothing until at least one tagged
// result exists.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAssessmentRows } from "../lib/academyAuth";
import { useCandidate } from "../lib/CandidateContext";
import { ERROR_TYPE_LABEL, type ErrorType } from "../lib/walkthrough";

interface TagStat {
  tag: ErrorType;
  count: number;
}

export default function ReasoningProfileCard() {
  const { candidate, status } = useCandidate();
  const [stats, setStats] = useState<TagStat[] | null>(null);

  useEffect(() => {
    if (!candidate) return;
    void (async () => {
      try {
        const rows = await fetchAssessmentRows(candidate.id);
        const counts = new Map<string, number>();
        for (const r of rows) {
          for (const t of r.error_tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
        }
        const known = [...counts.entries()]
          .filter(([t]) => t in ERROR_TYPE_LABEL)
          .map(([tag, count]) => ({ tag: tag as ErrorType, count }))
          .sort((a, b) => b.count - a.count);
        setStats(known);
      } catch {
        setStats([]); // best-effort; never block the home page
      }
    })();
  }, [candidate]);

  if (status !== "authenticated" || !stats || stats.length === 0) return null;
  const top = stats[0];
  const topMeta = ERROR_TYPE_LABEL[top.tag];

  return (
    <div className="fl-card p-4 sm:p-5">
      <p className="text-sm font-medium text-florence-slate">Your reasoning profile</p>
      <p className="mt-1 text-base font-semibold leading-snug text-florence-ink">
        Your most common pattern: {topMeta.label.toLowerCase()}.
      </p>
      <p className="mt-0.5 text-sm text-florence-slate">{topMeta.meaning}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {stats.slice(0, 5).map((s) => (
          <span
            key={s.tag}
            title={ERROR_TYPE_LABEL[s.tag].meaning}
            className="inline-flex items-center gap-1.5 rounded-full bg-florence-mist px-2.5 py-1 text-xs font-medium text-florence-ink"
          >
            {ERROR_TYPE_LABEL[s.tag].label}
            <span className="rounded-full bg-white px-1.5 font-mono text-[10px] text-florence-slate">
              ×{s.count}
            </span>
          </span>
        ))}
      </div>

      <p className="mt-3 text-xs text-florence-slate">
        Reasoning patterns transfer across topics - practicing the pattern beats another
        content drill.
      </p>
      <Link
        to="/academy/practice?mode=cases"
        className="mt-3 inline-block rounded-xl border border-florence-line bg-white px-4 py-2 text-sm font-semibold text-florence-ink hover:bg-florence-mist"
      >
        Work the pattern with unfolding cases →
      </Link>
    </div>
  );
}
