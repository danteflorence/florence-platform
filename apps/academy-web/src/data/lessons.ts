// ───────────────────────────────────────────────────────────────────────────
// Lesson registry. Each section's content file is lazy-loaded here so the 20
// big lesson modules never bloat the initial bundle. A section becomes a live,
// walkable lesson once it (a) has a loader entry below AND (b) is flagged
// `ready: true` in blueprint.ts SECTIONS. Adding a section = author hourN.ts +
// register it here + flip the flag.
// ───────────────────────────────────────────────────────────────────────────

import type { Lesson } from "./lessonTypes";
import { SECTIONS } from "./blueprint";

const LOADERS: Record<number, () => Promise<{ lesson: Lesson }>> = {
  1: () => import("./hour1"),
  2: () => import("./hour2"),
  3: () => import("./hour3"),
  4: () => import("./hour4"),
  5: () => import("./hour5"),
  6: () => import("./hour6"),
  7: () => import("./hour7"),
  8: () => import("./hour8"),
  9: () => import("./hour9"),
  10: () => import("./hour10"),
  11: () => import("./hour11"),
  12: () => import("./hour12"),
  13: () => import("./hour13"),
  14: () => import("./hour14"),
  15: () => import("./hour15"),
  16: () => import("./hour16"),
  17: () => import("./hour17"),
  18: () => import("./hour18"),
  19: () => import("./hour19"),
  20: () => import("./hour20"),
};

export function hasLesson(n: number): boolean {
  return n in LOADERS;
}

export async function loadLessonByNumber(n: number): Promise<Lesson | null> {
  const loader = LOADERS[n];
  return loader ? (await loader()).lesson : null;
}

export async function loadLessonBySlug(slug: string): Promise<Lesson | null> {
  const spec = SECTIONS.find((s) => s.slug === slug);
  return spec ? loadLessonByNumber(spec.n) : null;
}
