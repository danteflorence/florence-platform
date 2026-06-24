import { useMemo } from "react";
import { Navigate, useParams } from "react-router-dom";
import SlideDeck from "../components/deck/SlideDeck";
import { buildDeck } from "../lib/deck";
import { useLesson } from "../lib/useLesson";
import type { Lesson } from "../data/lessonTypes";

/**
 * Any section in presenter mode - the lesson rendered as a full-bleed slide deck
 * the instructor walks through. Resolves the lesson from the URL slug; the deck
 * is a pure transform of it (see lib/deck.buildDeck).
 */
function DeckView({ lesson, slug }: { lesson: Lesson; slug: string }) {
  const deck = useMemo(() => buildDeck(lesson), [lesson]);
  return <SlideDeck deck={deck} exitTo={`/academy/${slug}`} />;
}

export default function SectionDeck() {
  const { sectionSlug } = useParams<{ sectionSlug: string }>();
  const state = useLesson(sectionSlug);
  if (state.status === "loading")
    return (
      <div className="grid min-h-screen place-items-center bg-florence-ink">
        <p className="animate-pulse text-sm font-medium text-white/70">Loading deck…</p>
      </div>
    );
  if (state.status === "not-found")
    return <Navigate to={`/academy/${sectionSlug ?? ""}`} replace />;
  return <DeckView lesson={state.lesson} slug={sectionSlug!} />;
}
