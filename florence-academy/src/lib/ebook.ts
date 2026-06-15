// Pure Lesson → Ebook transform. One chapter per lesson segment (coarser than the
// deck, which splits per idea). A derived view, like deck.ts — no new content.

import type { Lesson, PracticeItem, Segment } from "../data/lessonTypes";

export interface Chapter {
  id: string; // segment id (anchor + audio key suffix)
  number: number; // 1-based
  title: string;
  minutes: string;
  format: string;
  segment: Segment;
  practiceItem?: PracticeItem;
}

export interface Ebook {
  section: number;
  title: string;
  tagline: string;
  objectives: string[];
  chapters: Chapter[];
}

export function buildEbook(lesson: Lesson): Ebook {
  const chapters: Chapter[] = lesson.segments.map((segment, i) => {
    const practiceItem = segment.practiceItemId ? lesson.practiceItems[segment.practiceItemId] : undefined;
    return {
      id: segment.id,
      number: i + 1,
      title: segment.title,
      minutes: segment.minutes,
      format: segment.format,
      segment,
      ...(practiceItem ? { practiceItem } : {}),
    };
  });
  return {
    section: lesson.meta.number,
    title: lesson.meta.title,
    tagline: lesson.meta.tagline,
    objectives: lesson.objectives,
    chapters,
  };
}
