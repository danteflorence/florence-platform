// ───────────────────────────────────────────────────────────────────────────
// Deck builder — turns the curriculum's typed segments into a flat list of
// full-bleed presenter SLIDES ("feels like a deck the instructor walks
// through, not a webpage you scroll").  This is a PURE transform so the slide
// shape is unit-testable and stays a derived view of the single source of
// truth (src/data/hour7.ts) — edit the lesson, the deck updates for free.
// ───────────────────────────────────────────────────────────────────────────

import type {
  CalloutTone,
  ContentBlock,
  Lesson,
  LessonMeta,
  PracticeItem,
  Segment,
  TimingRow,
} from "../data/lessonTypes";
import type { PollOpenPayload } from "./liveProtocol";

export type DeckWidget = NonNullable<Segment["widget"]>;

/** One advance-able view. Discriminated on `kind`. */
export type Slide =
  | {
      kind: "cover";
      eyebrow: string;
      title: string;
      subtitle: string;
      meta: LessonMeta;
    }
  | { kind: "objectives"; title: string; items: string[] }
  | { kind: "agenda"; title: string; rows: TimingRow[] }
  | {
      kind: "section";
      index: number; // 1-based segment number within the deck
      total: number;
      segment: Segment;
    }
  | {
      kind: "content";
      sectionTitle: string;
      heading?: string;
      blocks: ContentBlock[];
    }
  | {
      kind: "callout";
      sectionTitle: string;
      tone: CalloutTone;
      title: string;
      text: string;
    }
  | {
      kind: "widget";
      sectionTitle: string;
      widget: DeckWidget;
      caption?: string;
    }
  | { kind: "practice"; sectionTitle: string; item: PracticeItem }
  | {
      kind: "close";
      title: string;
      blocks: ContentBlock[];
    };

/** Slide enriched with stable identity + position for nav / sync. */
export interface DeckSlide {
  /** Stable id, unique within the deck (good for React keys + sync). */
  id: string;
  /** 0-based absolute position. */
  index: number;
  /** Which segment this slide belongs to (anchor slug), if any. */
  segmentId?: string;
  /** Short label for the overview grid / progress dots. */
  label: string;
  slide: Slide;
}

export interface Deck {
  title: string;
  slides: DeckSlide[];
}

/**
 * Split a segment's blocks into "one idea per view" slides:
 *  - A heading (`h`) starts a new content slide and pulls the following
 *    paragraphs/lists under it.
 *  - A `callout` flushes the current content slide and becomes its own
 *    emphasis slide (callouts are the deck's "key point" moments).
 *  - Leading paragraphs with no heading group into a single intro slide.
 */
function segmentContentSlides(seg: Segment): Slide[] {
  const out: Slide[] = [];
  let heading: string | undefined;
  let buf: ContentBlock[] = [];

  const flush = () => {
    if (buf.length === 0 && !heading) return;
    out.push({
      kind: "content",
      sectionTitle: seg.title,
      heading,
      blocks: buf,
    });
    heading = undefined;
    buf = [];
  };

  for (const b of seg.blocks) {
    if (b.kind === "callout") {
      flush();
      out.push({
        kind: "callout",
        sectionTitle: seg.title,
        tone: b.tone,
        title: b.title,
        text: b.text,
      });
      continue;
    }
    if (b.kind === "h") {
      // A new heading begins a new idea: flush whatever we were building.
      flush();
      heading = b.text;
      continue;
    }
    buf.push(b);
  }
  flush();
  return out;
}

/** Build the full presenter deck from the curriculum. */
export function buildDeck(lesson: Lesson): Deck {
  const { meta, objectives, timing, segments, practiceItems } = lesson;
  const slides: DeckSlide[] = [];
  let i = 0;
  const push = (
    slide: Slide,
    label: string,
    segmentId?: string,
    idHint?: string,
  ) => {
    slides.push({
      id: idHint ?? `s${i}`,
      index: i,
      segmentId,
      label,
      slide,
    });
    i += 1;
  };

  // Front matter
  push(
    {
      kind: "cover",
      eyebrow: `Section ${meta.number} · NCLEX-RN Bootcamp`,
      title: meta.title,
      subtitle: meta.tagline,
      meta: meta,
    },
    "Title",
    undefined,
    "cover",
  );
  push(
    { kind: "objectives", title: "Learning objectives", items: objectives },
    "Objectives",
    undefined,
    "objectives",
  );
  push(
    { kind: "agenda", title: "Agenda", rows: timing },
    "Agenda",
    undefined,
    "agenda",
  );

  // The last segment ("close") renders as a dedicated closing slide rather
  // than a normal section so the deck ends cleanly.
  const teaching = segments.filter((s) => s.id !== "close");
  const closing = segments.find((s) => s.id === "close");

  teaching.forEach((seg, idx) => {
    push(
      { kind: "section", index: idx + 1, total: teaching.length, segment: seg },
      seg.title,
      seg.id,
      `${seg.id}-title`,
    );

    let n = 0;
    for (const s of segmentContentSlides(seg)) {
      const label =
        s.kind === "callout"
          ? s.title
          : s.kind === "content"
            ? (s.heading ?? seg.title)
            : seg.title;
      push(s, label, seg.id, `${seg.id}-c${n}`);
      n += 1;
    }

    if (seg.widget) {
      push(
        { kind: "widget", sectionTitle: seg.title, widget: seg.widget },
        seg.title,
        seg.id,
        `${seg.id}-widget`,
      );
    }
    if (seg.practiceItemId) {
      // Resolve the practice item the segment references from the static map.
      const item = practiceItems[seg.practiceItemId];
      if (item) {
        push(
          { kind: "practice", sectionTitle: seg.title, item },
          "Check your thinking",
          seg.id,
          `${seg.id}-q`,
        );
      }
    }
  });

  if (closing) {
    push(
      { kind: "close", title: closing.title, blocks: closing.blocks },
      "Close",
      closing.id,
      "close",
    );
  }

  return { title: `Section ${meta.number} · ${meta.title}`, slides };
}

/**
 * Turn a curriculum practice item into a live-poll payload the instructor can
 * push to the room. The single keyed answer becomes the (hidden until reveal)
 * correct option index; option text carries over verbatim. The rationale,
 * CJMM step, and reference travel along so the room sees a worked explanation
 * and the Clinical Judgment framing on reveal — every question, win or lose.
 */
export function pollFromPracticeItem(
  item: PracticeItem,
  slideIndex: number,
): PollOpenPayload {
  const correctIndex = item.options.findIndex((o) => o.key === item.answer);
  return {
    prompt: item.stem,
    options: item.options.map((o) => o.text),
    correct: correctIndex >= 0 ? [correctIndex] : [],
    slideIndex,
    cjmm: item.cjmm,
    rationale: item.rationale,
    reference: item.reference,
  };
}
