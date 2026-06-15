// Nurse identity resolution + event recording for the Passport spine. Apps call
// these (via the M2M API) to turn their local candidate into the canonical nurse
// and to append journey events. Resolution order: explicit id → app ref → email
// → create. Resolving also backfills email/name and links the app ref, so four
// disconnected records converge on one nurse over time.

import type { Nurse, NurseEvent, Store } from "./store.ts";
import { id, nowIso } from "./util.ts";

export interface NurseRefInput {
  app: string;
  externalId: string;
}
export interface ResolveInput {
  nurseId?: string;
  email?: string;
  name?: string;
  ref?: NurseRefInput;
}

async function backfill(store: Store, nurse: Nurse, input: ResolveInput): Promise<Nurse> {
  const patch: Partial<Nurse> = {};
  if (!nurse.email && input.email) patch.email = input.email;
  if (!nurse.name && input.name) patch.name = input.name;
  if (Object.keys(patch).length) {
    await store.updateNurse(nurse.id, patch);
    nurse = { ...nurse, ...patch };
  }
  if (input.ref) {
    const linked = await store.getNurseByRef(input.ref.app, input.ref.externalId);
    if (!linked) {
      await store.linkNurseRef({ app: input.ref.app, external_id: input.ref.externalId, nurse_id: nurse.id, created_at: nowIso() });
    }
  }
  return nurse;
}

/** Find-or-create the canonical nurse, then ensure ref + email/name are linked. */
export async function resolveNurse(store: Store, input: ResolveInput): Promise<Nurse> {
  if (input.nurseId) {
    const n = await store.getNurseById(input.nurseId);
    if (n) return backfill(store, n, input);
  }
  if (input.ref) {
    const n = await store.getNurseByRef(input.ref.app, input.ref.externalId);
    if (n) return backfill(store, n, input);
  }
  if (input.email) {
    const n = await store.getNurseByEmail(input.email);
    if (n) return backfill(store, n, input);
  }
  const now = nowIso();
  const nurse: Nurse = { id: id("nrs"), email: input.email?.toLowerCase(), name: input.name, created_at: now, updated_at: now };
  await store.insertNurse(nurse);
  if (input.ref) {
    await store.linkNurseRef({ app: input.ref.app, external_id: input.ref.externalId, nurse_id: nurse.id, created_at: now });
  }
  return nurse;
}

/** Look up a nurse without creating one (for reads). ref string form: "app:externalId". */
export async function lookupNurse(
  store: Store,
  q: { nurseId?: string; email?: string; ref?: string },
): Promise<Nurse | undefined> {
  if (q.nurseId) return store.getNurseById(q.nurseId);
  if (q.ref) {
    const i = q.ref.indexOf(":");
    if (i > 0) return store.getNurseByRef(q.ref.slice(0, i), q.ref.slice(i + 1));
  }
  if (q.email) return store.getNurseByEmail(q.email);
  return undefined;
}

export async function recordEvent(
  store: Store,
  nurseId: string,
  e: { type: string; source: string; at?: string; data?: Record<string, unknown> },
): Promise<NurseEvent> {
  const ev: NurseEvent = {
    id: id("evt"),
    nurse_id: nurseId,
    type: e.type,
    source: e.source,
    at: e.at ?? nowIso(),
    data: e.data ?? {},
    created_at: nowIso(),
  };
  await store.appendNurseEvent(ev);
  return ev;
}
