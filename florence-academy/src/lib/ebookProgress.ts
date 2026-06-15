// Per-section e-book chapter cursor ("continue where you left off"). Local-only +
// additive — it does not touch the section-level progress API (that's still updated
// by SectionProgress). Cross-device resume is a later upgrade.

const key = (slug: string) => `florence.ebook.${slug}.chapter`;

export function getChapterCursor(slug: string): number {
  try {
    const v = Number(localStorage.getItem(key(slug)));
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch {
    return 0;
  }
}

export function setChapterCursor(slug: string, chapterIndex: number): void {
  try {
    localStorage.setItem(key(slug), String(chapterIndex));
  } catch {
    /* storage disabled — cursor is in-memory only for this tab */
  }
}
