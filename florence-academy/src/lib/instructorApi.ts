// ───────────────────────────────────────────────────────────────────────────
// Instructor console data layer (/instructor).
//
// INTERNAL ONLY. Authenticates with an M2M client (entered at runtime and
// held in sessionStorage — never baked into the bundle). The instructor's
// scope set is narrower than ops Control Tower — just what's needed to run
// a live class:
//
//   cohorts:read    — roster, copilot
//   cohorts:write   — bump the coverage watermark
//   enrollment:read — names + statuses
//   enrollment:write — attendance / status transitions
//   performance:read — readiness band per student
//
// Distinct sessionStorage namespace ("fl_instr_*") so an operator on the
// same browser doesn't bleed credentials across roles.
// ───────────────────────────────────────────────────────────────────────────

const TOKEN_KEY = "fl_instr_token";
const BASE_KEY = "fl_instr_base";

const INSTRUCTOR_SCOPES =
  "cohorts:read cohorts:write enrollment:read enrollment:write performance:read candidates:read";

export class InstructorError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "InstructorError";
  }
}

export interface InstructorSession {
  token: string | null;
  base: string | null;
}

export function instructorSession(): InstructorSession {
  try {
    return { token: sessionStorage.getItem(TOKEN_KEY), base: sessionStorage.getItem(BASE_KEY) };
  } catch {
    return { token: null, base: null };
  }
}

export function instructorDisconnect(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(BASE_KEY);
  } catch {
    /* ignore */
  }
}

/** Exchange instructor client credentials for an instructor-scoped token. */
export async function instructorConnect(
  base: string,
  clientId: string,
  secret: string,
): Promise<void> {
  const root = base.replace(/\/$/, "");
  let res: Response;
  try {
    res = await fetch(`${root}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: secret,
        scope: INSTRUCTOR_SCOPES,
      }),
    });
  } catch {
    throw new InstructorError(0, "Could not reach the API. Check the base URL.");
  }
  const j = (await res.json().catch(() => null)) as { access_token?: string } | null;
  if (!res.ok || !j?.access_token)
    throw new InstructorError(res.status, "Invalid credentials or scope set.");
  try {
    sessionStorage.setItem(TOKEN_KEY, j.access_token);
    sessionStorage.setItem(BASE_KEY, root);
  } catch {
    /* ignore */
  }
}

async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { token, base } = instructorSession();
  if (!token || !base) throw new InstructorError(401, "not connected");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      authorization: `Bearer ${token}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
    },
  });
  if (res.status === 401) {
    instructorDisconnect();
    throw new InstructorError(401, "session expired");
  }
  return res;
}

async function listAll<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | undefined;
  do {
    const q = new URLSearchParams({ limit: "200" });
    if (cursor) q.set("cursor", cursor);
    const sep = path.includes("?") ? "&" : "?";
    const res = await authedFetch(`${path}${sep}${q.toString()}`);
    if (!res.ok) throw new InstructorError(res.status, `failed to load ${path}`);
    const j = (await res.json()) as { data: T[]; next_cursor: string | null };
    out.push(...j.data);
    cursor = j.next_cursor ?? undefined;
  } while (cursor);
  return out;
}

// ── Shapes (narrow projections of the API objects) ──────────────────────────
export interface InstructorCohort {
  id: string;
  code: string;
  name: string;
  status: "scheduled" | "active" | "completed" | "cancelled";
  starts_at?: string;
  capacity?: number;
  instructor_ref?: string;
  covered_through_section?: number;
}
export interface RosterMember {
  candidate_id: string;
  full_name: string;
  email?: string;
  enrollment_status: "registered" | "deposit_paid" | "attending" | "completed" | "withdrawn";
  readiness_band?: "green" | "yellow" | "orange" | "red" | "none";
  readiness?: number;
}
export interface CohortCopilot {
  cohort: string;
  candidates: number;
  band_counts: Record<string, number>;
  avg_readiness: number | null;
  fallers: { candidate_id: string; full_name?: string; band: string; readiness?: number }[];
  weak_needs: { key: string; label: string; share: number }[];
}

// ── Endpoints ───────────────────────────────────────────────────────────────
export async function fetchCohorts(): Promise<InstructorCohort[]> {
  return listAll<InstructorCohort>("/v1/cohorts");
}

export async function fetchCohortByCode(code: string): Promise<InstructorCohort | null> {
  const all = await fetchCohorts();
  return all.find((c) => c.code === code) ?? null;
}

/** Roster: enrollments joined with candidate names + readiness band. */
export async function fetchRoster(cohortIdOrCode: string): Promise<RosterMember[]> {
  const res = await authedFetch(`/v1/cohorts/${encodeURIComponent(cohortIdOrCode)}/roster`);
  if (!res.ok) throw new InstructorError(res.status, "could not load roster");
  const j = (await res.json()) as { members?: RosterMember[] };
  return j.members ?? [];
}

export async function fetchCopilot(code: string): Promise<CohortCopilot> {
  const res = await authedFetch(`/v1/cohorts/${encodeURIComponent(code)}/copilot`);
  if (!res.ok) throw new InstructorError(res.status, "could not load cohort copilot");
  return (await res.json()) as CohortCopilot;
}

/**
 * Mark attendance for one candidate in a cohort on a given date.
 * - `status` matches the API enum: "present" | "absent" | "late".
 * - `sessionDate` defaults to today (UTC YYYY-MM-DD).
 * - The endpoint is append-only — calling it again creates a new record;
 *   the rollup endpoint picks the latest per candidate/date.
 */
export async function recordAttendance(
  candidateId: string,
  cohortCode: string,
  status: "present" | "absent" | "late",
  sessionDate?: string,
): Promise<void> {
  const date = sessionDate ?? new Date().toISOString().slice(0, 10);
  const res = await authedFetch(`/v1/attendance`, {
    method: "POST",
    body: JSON.stringify({
      candidate_id: candidateId,
      cohort: cohortCode,
      session_date: date,
      status,
    }),
  });
  if (!res.ok) throw new InstructorError(res.status, "attendance write failed");
}

/** Bump the cohort's coverage watermark. Refuses regressions w/o override. */
export async function bumpCoverage(
  cohortId: string,
  coveredThrough: number,
  override = false,
): Promise<InstructorCohort> {
  const res = await authedFetch(`/v1/cohorts/${encodeURIComponent(cohortId)}/coverage`, {
    method: "PATCH",
    body: JSON.stringify({ covered_through_section: coveredThrough, override }),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => null)) as
      | { error?: { code?: string; message?: string } }
      | null;
    throw new InstructorError(
      res.status,
      j?.error?.message ?? `coverage update failed (${res.status})`,
    );
  }
  return (await res.json()) as InstructorCohort;
}
