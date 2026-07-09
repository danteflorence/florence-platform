import { useEffect, useState } from "react";
import { fetchWalkthrough, type QuestionWalkthrough } from "../lib/walkthrough";

/** Fetch the approved walkthrough for a question (session-cached). null → fall back to rationale. */
export function useWalkthrough(questionId: string): { walkthrough: QuestionWalkthrough | null; loading: boolean } {
  const [walkthrough, setWalkthrough] = useState<QuestionWalkthrough | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    setLoading(true);
    fetchWalkthrough(questionId).then((w) => {
      if (live) {
        setWalkthrough(w);
        setLoading(false);
      }
    });
    return () => {
      live = false;
    };
  }, [questionId]);
  return { walkthrough, loading };
}
