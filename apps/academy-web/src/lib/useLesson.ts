import { useEffect, useState } from "react";
import { loadLessonBySlug } from "../data/lessons";
import type { Lesson } from "../data/lessonTypes";

export type LessonState =
  | { status: "loading" }
  | { status: "ready"; lesson: Lesson }
  | { status: "not-found" };

/** Resolve a section's lesson by URL slug (lazy-loaded from the registry). */
export function useLesson(slug: string | undefined): LessonState {
  const [state, setState] = useState<LessonState>({ status: "loading" });
  useEffect(() => {
    let live = true;
    setState({ status: "loading" });
    if (!slug) {
      setState({ status: "not-found" });
      return;
    }
    loadLessonBySlug(slug).then((lesson) => {
      if (!live) return;
      setState(lesson ? { status: "ready", lesson } : { status: "not-found" });
    });
    return () => {
      live = false;
    };
  }, [slug]);
  return state;
}
