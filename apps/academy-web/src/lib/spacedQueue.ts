// ───────────────────────────────────────────────────────────────────────────
// Spaced re-practice v1 - a Leitner queue over missed practice items.
// Spaced retrieval has the highest effect size in the learning literature;
// until now a cleared item never resurfaced. Now every miss enters box 1 and
// resurfaces on the 1/3/7/14-day curve; answering it right in a later session
// advances the box, answering it wrong resets it. Graduating box 4 removes it.
//
// v1 is DEVICE-LOCAL (localStorage, keyed per candidate so accounts on a
// shared phone don't bleed into each other). Server persistence is the
// post-cohort follow-up; the pure core below is storage-agnostic and fully
// vitest-covered with an injected clock.
// ───────────────────────────────────────────────────────────────────────────

export interface SpacedEntry {
  /** Question id. */
  id: string;
  /** Leitner box 1..4. */
  box: number;
  /** Epoch ms when the item is next due. */
  dueAt: number;
  /** Times the learner missed it after entering the queue. */
  lapses: number;
  addedAt: number;
}

export interface SpacedQueue {
  entries: SpacedEntry[];
  /** YYYY-MM-DD of the last completed daily review (streak accounting). */
  lastReviewDay?: string;
  streak: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Box → days until the item resurfaces. */
export const BOX_INTERVAL_DAYS: Record<number, number> = { 1: 1, 2: 3, 3: 7, 4: 14 };
export const MAX_BOX = 4;

export function emptyQueue(): SpacedQueue {
  return { entries: [], streak: 0 };
}

/** A miss in ANY session: new items enter box 1; existing items reset to
 *  box 1 and count a lapse. Due tomorrow either way. */
export function recordMiss(queue: SpacedQueue, id: string, now: number): SpacedQueue {
  const existing = queue.entries.find((e) => e.id === id);
  if (existing) {
    return {
      ...queue,
      entries: queue.entries.map((e) =>
        e.id === id ? { ...e, box: 1, dueAt: now + DAY_MS, lapses: e.lapses + 1 } : e,
      ),
    };
  }
  return {
    ...queue,
    entries: [...queue.entries, { id, box: 1, dueAt: now + DAY_MS, lapses: 0, addedAt: now }],
  };
}

/** A correct answer on a QUEUED item (any session): advance the box; past
 *  box 4 the item graduates out of the queue entirely. */
export function recordCorrect(queue: SpacedQueue, id: string, now: number): SpacedQueue {
  const entry = queue.entries.find((e) => e.id === id);
  if (!entry) return queue;
  if (entry.box >= MAX_BOX) {
    return { ...queue, entries: queue.entries.filter((e) => e.id !== id) };
  }
  const nextBox = entry.box + 1;
  return {
    ...queue,
    entries: queue.entries.map((e) =>
      e.id === id ? { ...e, box: nextBox, dueAt: now + BOX_INTERVAL_DAYS[nextBox] * DAY_MS } : e,
    ),
  };
}

/** Apply a finished session's graded outcomes in one pass. */
export function applySessionOutcomes(
  queue: SpacedQueue,
  outcomes: { id: string; correct: boolean }[],
  now: number,
): SpacedQueue {
  let q = queue;
  for (const o of outcomes) {
    const queued = q.entries.some((e) => e.id === o.id);
    if (!o.correct) q = recordMiss(q, o.id, now);
    else if (queued) q = recordCorrect(q, o.id, now);
  }
  return q;
}

export function dueEntries(queue: SpacedQueue, now: number): SpacedEntry[] {
  return queue.entries.filter((e) => e.dueAt <= now).sort((a, b) => a.dueAt - b.dueAt);
}

/** Epoch ms of the next due item after `now`, or null when nothing is queued. */
export function nextDueAt(queue: SpacedQueue, now: number): number | null {
  const future = queue.entries.filter((e) => e.dueAt > now);
  if (future.length === 0) return null;
  return Math.min(...future.map((e) => e.dueAt));
}

const dayOf = (now: number) => new Date(now).toISOString().slice(0, 10);

/** Call when a daily review session completes. Consecutive days grow the
 *  streak; a gap resets it to 1; twice in one day is idempotent. */
export function markReviewDone(queue: SpacedQueue, now: number): SpacedQueue {
  const today = dayOf(now);
  if (queue.lastReviewDay === today) return queue;
  const yesterday = dayOf(now - DAY_MS);
  const streak = queue.lastReviewDay === yesterday ? queue.streak + 1 : 1;
  return { ...queue, lastReviewDay: today, streak };
}

// ── localStorage adapter ─────────────────────────────────────────────────────

const KEY_PREFIX = "fl_academy_spaced_v1";
const keyFor = (candidateId: string | null) => `${KEY_PREFIX}:${candidateId ?? "anon"}`;

export function loadQueue(candidateId: string | null): SpacedQueue {
  try {
    const raw = localStorage.getItem(keyFor(candidateId));
    if (!raw) return emptyQueue();
    const parsed = JSON.parse(raw) as SpacedQueue;
    if (!Array.isArray(parsed.entries)) return emptyQueue();
    return { ...parsed, streak: parsed.streak ?? 0 };
  } catch {
    return emptyQueue();
  }
}

export function saveQueue(candidateId: string | null, queue: SpacedQueue): void {
  try {
    localStorage.setItem(keyFor(candidateId), JSON.stringify(queue));
  } catch {
    /* storage full/blocked - spaced practice is best-effort */
  }
}
