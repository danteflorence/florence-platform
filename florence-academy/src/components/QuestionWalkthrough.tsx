// The Clinical Judgment Walkthrough - a tabbed review surface that teaches HOW to
// think: the 6 NCJMM steps, why the correct answer wins, why each distractor fails +
// the reasoning ERROR you made if you picked it, adaptive audio, and what to review
// next. Progressive enhancement: no approved walkthrough → today's plain rationale.

import { useState } from "react";
import RationaleAudio from "./RationaleAudio";
import WalkthroughAudio from "./WalkthroughAudio";
import { useWalkthrough } from "./useWalkthrough";
import { buildWalkthroughView } from "../lib/walkthrough";
import { openTutorForQuestion, tutorConfigured } from "../lib/tutorBus";
import { questionContextFrom, groundingText, groundingVars } from "../lib/voiceTutor";

type Tab = "answer" | "walkthrough" | "why-not" | "listen" | "review";

export default function QuestionWalkthrough({
  questionId,
  optionTexts,
  fallbackRationale,
  reference,
  chosenOptionIndex,
}: {
  questionId: string;
  optionTexts: string[];
  fallbackRationale: string;
  reference?: string;
  chosenOptionIndex?: number;
}) {
  const { walkthrough, loading } = useWalkthrough(questionId);
  const [tab, setTab] = useState<Tab>("answer");

  // While loading OR when there's no approved walkthrough, render today's rationale.
  if (loading || !walkthrough) {
    return (
      <div>
        <p className="text-sm leading-relaxed text-florence-ink">{fallbackRationale}</p>
        <RationaleAudio questionId={questionId} />
        {reference && <p className="mt-2 text-xs text-florence-slate">{reference}</p>}
      </div>
    );
  }

  const v = buildWalkthroughView(walkthrough, optionTexts);
  const chosen = chosenOptionIndex != null ? v.optionRows.find((r) => r.optionIndex === chosenOptionIndex) : undefined;
  const chosenIsWrong = !!chosen && !chosen.isCorrect;

  const tabs: { id: Tab; label: string }[] = [
    { id: "answer", label: "Answer" },
    { id: "walkthrough", label: "Clinical judgment" },
    { id: "why-not", label: "Why not the others" },
    { id: "listen", label: "Listen" },
    { id: "review", label: "Review next" },
  ];

  return (
    <div className="mt-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="fl-pill border-florence-indigo/30 text-florence-indigo">{`Tests: ${v.primary.label}`}</span>
        {tutorConfigured() && (
          <button
            onClick={() => {
              const ctx = questionContextFrom("this clinical-judgment item", v);
              openTutorForQuestion({ questionId, context: groundingText(ctx), variables: groundingVars(ctx) });
            }}
            className="text-xs font-semibold text-florence-teal-dark hover:underline"
          >
            Ask FlorenceRN about this →
          </button>
        )}
      </div>

      {/* Error diagnosis - what reasoning error you made (only when you picked a distractor). */}
      {chosenIsWrong && chosen && (
        <div className="mt-3 rounded-xl border border-vital-danger/30 bg-vital-danger/5 p-3">
          <p className="fl-eyebrow text-vital-danger">What happened</p>
          {chosen.errorLabel && <p className="mt-1 text-sm font-semibold text-florence-ink">{chosen.errorLabel}</p>}
          <p className="mt-1 text-sm leading-relaxed text-florence-ink">{chosen.why}</p>
          {v.whatToReviewNext && <p className="mt-2 text-xs text-florence-slate">Review next: {v.whatToReviewNext}</p>}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5 border-b border-florence-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px rounded-t-md px-2.5 py-1.5 text-xs font-medium ${
              tab === t.id ? "border-b-2 border-florence-teal-dark text-florence-teal-dark" : "text-florence-slate hover:text-florence-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-3">
        {tab === "answer" && (
          <div className="space-y-2">
            {v.optionRows.filter((r) => r.isCorrect).map((r) => (
              <div key={r.optionIndex} className="rounded-xl border border-vital-ok/40 bg-vital-ok/10 p-3">
                <p className="fl-eyebrow text-vital-ok">{r.heading}</p>
                <p className="mt-1 text-sm font-medium text-florence-ink">{r.label}</p>
                <p className="mt-1 text-sm leading-relaxed text-florence-ink">{r.why}</p>
              </div>
            ))}
            {v.teachBack && <p className="text-sm leading-relaxed text-florence-slate"><span className="font-semibold">Remember: </span>{v.teachBack}</p>}
          </div>
        )}

        {tab === "walkthrough" && (
          <ol className="space-y-2.5">
            {v.stepRows.map((s) => (
              <li key={s.key} className={`rounded-xl border p-3 ${s.isPrimary ? "border-florence-indigo/40 bg-florence-indigo/5" : "border-florence-line"}`}>
                <p className="text-sm font-semibold text-florence-ink">{s.order}. {s.label}{s.isPrimary ? " - focus" : ""}</p>
                <p className="text-xs text-florence-slate">{s.blurb}</p>
                {s.applies && <p className="mt-1 text-sm leading-relaxed text-florence-ink">{s.applies}</p>}
                {s.cues.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {s.cues.map((c) => (
                      <span key={c} className="rounded-full bg-florence-mist px-2 py-0.5 text-xs font-medium text-florence-ink">{c}</span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}

        {tab === "why-not" && (
          <div className="space-y-2">
            {v.optionRows.filter((r) => !r.isCorrect).map((r) => (
              <div key={r.optionIndex} className="rounded-xl border border-florence-line p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-florence-ink">{r.label}</p>
                  {r.errorLabel && <span className="rounded-full bg-vital-danger/10 px-2 py-0.5 text-xs font-semibold text-vital-danger">{r.errorLabel}</span>}
                </div>
                <p className="fl-eyebrow mt-1 text-florence-slate">{r.heading}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-florence-ink">{r.why}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "listen" && (
          <WalkthroughAudio questionId={questionId} chosenOptionIndex={chosenOptionIndex} chosenIsWrong={chosenIsWrong} />
        )}

        {tab === "review" && (
          <div className="space-y-2 text-sm text-florence-ink">
            {v.whatToReviewNext && <p>{v.whatToReviewNext}</p>}
            {reference && <p className="text-xs text-florence-slate">{reference}</p>}
            {!v.whatToReviewNext && !reference && <p className="text-florence-slate">No linked review material yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
