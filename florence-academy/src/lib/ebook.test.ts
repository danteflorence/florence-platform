import { describe, it, expect } from "vitest";
import { buildEbook } from "./ebook";
import { lesson } from "../data/hour7";

describe("buildEbook", () => {
  const book = buildEbook(lesson);

  it("creates one chapter per lesson segment", () => {
    expect(book.chapters.length).toBe(lesson.segments.length);
  });

  it("numbers chapters sequentially from 1 and keeps segment ids", () => {
    book.chapters.forEach((c, i) => {
      expect(c.number).toBe(i + 1);
      expect(c.id).toBe(lesson.segments[i]!.id);
    });
  });

  it("resolves the practice item for segments that declare one", () => {
    for (const seg of lesson.segments) {
      const ch = book.chapters.find((c) => c.id === seg.id)!;
      if (seg.practiceItemId) {
        expect(ch.practiceItem).toBeDefined();
        expect(ch.practiceItem!.id).toBe(lesson.practiceItems[seg.practiceItemId]!.id);
      } else {
        expect(ch.practiceItem).toBeUndefined();
      }
    }
  });

  it("carries the section meta", () => {
    expect(book.section).toBe(lesson.meta.number);
    expect(book.title).toBe(lesson.meta.title);
  });
});
