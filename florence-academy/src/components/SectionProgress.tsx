import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCandidate } from "../lib/CandidateContext";
import { fetchProgress, upsertProgress, type ProgressStatus } from "../lib/academyAuth";

/**
 * Per-section progress control shown at the foot of a lesson. Marks the section
 * "in progress" the first time a signed-in learner opens it, and offers a
 * "Mark complete" action that feeds the readiness rollup. Renders a gentle
 * sign-in nudge when anonymous, and nothing at all when no API is configured.
 */
export default function SectionProgress({ slug }: { slug: string }) {
  const { status: sess, candidate, apiEnabled, refreshReadiness } = useCandidate();
  const [status, setStatus] = useState<ProgressStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (sess !== "authenticated" || !candidate) return;
    let alive = true;
    void (async () => {
      try {
        const rows = await fetchProgress(candidate.id);
        const cur = rows.find((r) => r.section_slug === slug);
        if (!alive) return;
        if (cur) {
          setStatus(cur.status);
        } else {
          const rec = await upsertProgress(candidate.id, {
            section_slug: slug,
            status: "in_progress",
            percent: 5,
          });
          if (alive) setStatus(rec.status);
        }
      } catch {
        /* progress is best-effort */
      }
    })();
    return () => {
      alive = false;
    };
  }, [sess, candidate, slug]);

  if (!apiEnabled) return null;

  if (sess !== "authenticated" || !candidate) {
    return (
      <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-dashed border-florence-line bg-white px-5 py-4">
        <p className="text-sm text-florence-slate">
          Sign in to save your progress and track your readiness as you study.
        </p>
        <Link
          to="/academy/account"
          className="shrink-0 rounded-lg bg-florence-indigo px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-florence-indigo-dark"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const done = status === "completed";

  async function mark(next: ProgressStatus) {
    if (busy || !candidate) return;
    setBusy(true);
    try {
      const rec = await upsertProgress(candidate.id, {
        section_slug: slug,
        status: next,
        percent: next === "completed" ? 100 : 25,
      });
      setStatus(rec.status);
      void refreshReadiness();
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`mb-6 flex items-center justify-between gap-4 rounded-2xl border px-5 py-4 ${
        done ? "border-vital-ok/40 bg-vital-ok/5" : "border-florence-line bg-white"
      }`}
    >
      <p className="flex items-center gap-2 text-sm font-medium text-florence-ink">
        {done ? (
          <>
            <span className="grid h-6 w-6 place-items-center rounded-full bg-vital-ok/15 text-vital-ok">
              ✓
            </span>
            You’ve completed this section.
          </>
        ) : (
          "Finished this section?"
        )}
      </p>
      <button
        type="button"
        onClick={() => void mark(done ? "in_progress" : "completed")}
        disabled={busy}
        className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
          done
            ? "border border-florence-line bg-white text-florence-slate hover:bg-florence-mist"
            : "bg-florence-indigo text-white hover:bg-florence-indigo-dark"
        }`}
      >
        {done ? "Mark as in progress" : busy ? "Saving…" : "Mark complete"}
      </button>
    </div>
  );
}
