// Cross-device sync for the spaced re-practice queue. localStorage stays the
// source the UI reads (instant, offline-safe); the server holds one blob per
// candidate so a learner who practices on a phone and reviews on a laptop
// sees ONE queue. Sync = pull, merge (commutative, lib-owned semantics),
// save locally, push. Every call is best-effort - a dead network must never
// break practice.

import { call } from "./academyAuth";
import { loadQueue, mergeQueues, saveQueue, type SpacedQueue } from "./spacedQueue";

interface ServerQueueRow {
  candidate_id: string;
  queue: SpacedQueue;
  updated_at: string;
}

/** Pull the server copy, merge with local, persist both ways. Call on login /
 *  session bootstrap. Returns the merged queue (or local on any failure). */
export async function syncSpacedQueue(candidateId: string): Promise<SpacedQueue> {
  const local = loadQueue(candidateId);
  try {
    let server: SpacedQueue | null = null;
    try {
      const row = await call<ServerQueueRow>(`/v1/candidates/${candidateId}/spaced-queue`);
      if (row?.queue && Array.isArray(row.queue.entries)) server = row.queue;
    } catch {
      server = null; // 404 (no queue yet) or offline - merge with nothing
    }
    const merged = server ? mergeQueues(local, server) : local;
    saveQueue(candidateId, merged);
    await call(`/v1/candidates/${candidateId}/spaced-queue`, {
      method: "POST",
      body: { queue: merged },
    });
    return merged;
  } catch {
    return local;
  }
}

/** Push the current local queue (call after a session updates it). */
export async function pushSpacedQueue(candidateId: string): Promise<void> {
  try {
    await call(`/v1/candidates/${candidateId}/spaced-queue`, {
      method: "POST",
      body: { queue: loadQueue(candidateId) },
    });
  } catch {
    /* best-effort - the next sync carries it */
  }
}
