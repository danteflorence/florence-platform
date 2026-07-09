import { describe, expect, it } from "vitest";
import { buildDeck, pollFromPracticeItem } from "./deck";
import { PRACTICE_ITEMS, SEGMENTS, lesson } from "../data/hour7";

describe("buildDeck", () => {
  const deck = buildDeck(lesson);

  it("opens with cover → objectives → agenda and ends on close", () => {
    expect(deck.slides[0].slide.kind).toBe("cover");
    expect(deck.slides[1].slide.kind).toBe("objectives");
    expect(deck.slides[2].slide.kind).toBe("agenda");
    expect(deck.slides[deck.slides.length - 1].slide.kind).toBe("close");
  });

  it("assigns sequential indexes matching array position", () => {
    deck.slides.forEach((s, i) => expect(s.index).toBe(i));
  });

  it("gives every slide a unique id", () => {
    const ids = new Set(deck.slides.map((s) => s.id));
    expect(ids.size).toBe(deck.slides.length);
  });

  it("emits one section title slide per teaching segment", () => {
    const teaching = SEGMENTS.filter((s) => s.id !== "close");
    const sections = deck.slides.filter((s) => s.slide.kind === "section");
    expect(sections.length).toBe(teaching.length);
  });

  it("never leaves a callout buried inside a content slide", () => {
    for (const s of deck.slides) {
      if (s.slide.kind === "content") {
        expect(s.slide.blocks.some((b) => b.kind === "callout")).toBe(false);
      }
    }
  });

  it("promotes each curriculum callout to its own callout slide", () => {
    const calloutBlocks = SEGMENTS.flatMap((seg) =>
      seg.blocks.filter((b) => b.kind === "callout"),
    );
    const calloutSlides = deck.slides.filter((s) => s.slide.kind === "callout");
    expect(calloutSlides.length).toBe(calloutBlocks.length);
  });

  it("emits a widget slide for every segment that declares a widget", () => {
    const withWidget = SEGMENTS.filter((s) => s.widget).length;
    const widgetSlides = deck.slides.filter((s) => s.slide.kind === "widget");
    expect(widgetSlides.length).toBe(withWidget);
  });

  it("emits a practice slide for every segment that references an item", () => {
    const withItem = SEGMENTS.filter((s) => s.practiceItemId).length;
    const practiceSlides = deck.slides.filter(
      (s) => s.slide.kind === "practice",
    );
    expect(practiceSlides.length).toBe(withItem);
  });
});

describe("pollFromPracticeItem", () => {
  it("maps stem/options across and resolves the keyed answer to its index", () => {
    const item = PRACTICE_ITEMS.pi_mi; // answer key "B" → index 1
    const poll = pollFromPracticeItem(item, 7);
    expect(poll.prompt).toBe(item.stem);
    expect(poll.options).toEqual(item.options.map((o) => o.text));
    expect(poll.correct).toEqual([1]);
    expect(poll.slideIndex).toBe(7);
  });

  it("derives the correct index from each item's answer key", () => {
    for (const item of Object.values(PRACTICE_ITEMS)) {
      const expected = item.options.findIndex((o) => o.key === item.answer);
      expect(pollFromPracticeItem(item, 0).correct).toEqual([expected]);
      expect(expected).toBeGreaterThanOrEqual(0); // every item has a real answer
    }
  });
});
