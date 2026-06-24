import { useEffect, useMemo, useState } from "react";
import type { PracticeItem } from "../data/lessonTypes";
import {
  buildPracticeItemTutorSeed,
  buildQuestionTutorSeed,
  type QuestionTutorContext,
} from "../lib/questionTutor";
import {
  openTutorForQuestion,
  subscribeTutorConfigured,
  tutorConfigured,
  type TutorSeed,
} from "../lib/tutorBus";
import type { Answer, Question } from "../types/question";

export default function QuestionTutorButton({
  question,
  answer,
  revealed,
  context,
  compact = false,
  className = "",
}: {
  question: Question;
  answer?: Answer;
  revealed: boolean;
  context?: QuestionTutorContext;
  compact?: boolean;
  className?: string;
}) {
  const seed = useMemo(
    () => buildQuestionTutorSeed({ question, answer, revealed, context }),
    [question, answer, revealed, context],
  );
  return <TutorButton seed={seed} compact={compact} className={className} />;
}

export function PracticeItemTutorButton({
  item,
  picked,
  revealed,
  source,
  compact = false,
  className = "",
}: {
  item: PracticeItem;
  picked?: string | null;
  revealed: boolean;
  source: string;
  compact?: boolean;
  className?: string;
}) {
  const seed = useMemo(
    () => buildPracticeItemTutorSeed({ item, picked, revealed, source }),
    [item, picked, revealed, source],
  );
  return <TutorButton seed={seed} compact={compact} className={className} />;
}

function TutorButton({
  seed,
  compact,
  className,
}: {
  seed: TutorSeed;
  compact: boolean;
  className: string;
}) {
  const [configured, setConfigured] = useState(tutorConfigured());

  useEffect(() => subscribeTutorConfigured(setConfigured), []);

  const label = compact ? "FlorenceRN" : "Ask FlorenceRN";
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-full border text-xs font-semibold transition-colors";
  const size = compact ? "px-3 py-1.5" : "px-3.5 py-2";
  const tone = configured
    ? "border-florence-teal/50 bg-white text-florence-teal-dark hover:bg-florence-teal-soft"
    : "cursor-not-allowed border-florence-line bg-white/70 text-florence-slate/70";

  return (
    <button
      type="button"
      disabled={!configured}
      onClick={() => openTutorForQuestion(seed)}
      className={`${base} ${size} ${tone} ${className}`}
      title={
        configured
          ? "Talk to FlorenceRN about this item"
          : "FlorenceRN voice is available after ElevenLabs is configured"
      }
    >
      <MicIcon />
      {label}
    </button>
  );
}

function MicIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
    </svg>
  );
}
