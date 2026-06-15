// ───────────────────────────────────────────────────────────────────────────
// Partner-portal client (employer + university). Each portal authenticates with
// its own read-scoped API client (entered at runtime, held in sessionStorage —
// never bundled) and sees ONLY education readiness. No financial / ARR / visa
// fields ever reach these surfaces.
// ───────────────────────────────────────────────────────────────────────────

export type Portal = "employer" | "university";
export type Band = "none" | "red" | "orange" | "yellow" | "green";

export class PartnerError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "PartnerError";
  }
}

const SCOPE: Record<Portal, string> = {
  employer: "employer:read",
  university: "university:read",
};

const keys = (p: Portal) => ({ tok: `fl_${p}_token`, base: `fl_${p}_base` });

export interface PartnerSession {
  token: string | null;
  base: string | null;
}
export function partnerSession(p: Portal): PartnerSession {
  try {
    const k = keys(p);
    return { token: sessionStorage.getItem(k.tok), base: sessionStorage.getItem(k.base) };
  } catch {
    return { token: null, base: null };
  }
}
export function partnerDisconnect(p: Portal): void {
  try {
    const k = keys(p);
    sessionStorage.removeItem(k.tok);
    sessionStorage.removeItem(k.base);
  } catch {
    /* ignore */
  }
}

export async function partnerConnect(p: Portal, base: string, clientId: string, secret: string): Promise<void> {
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
        scope: SCOPE[p],
      }),
    });
  } catch {
    throw new PartnerError(0, "Could not reach the API. Check the base URL.");
  }
  const j = (await res.json().catch(() => null)) as { access_token?: string } | null;
  if (!res.ok || !j?.access_token) throw new PartnerError(res.status, "Invalid credentials or scope.");
  try {
    const k = keys(p);
    sessionStorage.setItem(k.tok, j.access_token);
    sessionStorage.setItem(k.base, root);
  } catch {
    /* ignore */
  }
}

async function partnerGet<T>(p: Portal, path: string): Promise<T> {
  const { token, base } = partnerSession(p);
  if (!token || !base) throw new PartnerError(401, "not connected");
  const res = await fetch(`${base}${path}`, { headers: { authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new PartnerError(401, "session expired");
  if (!res.ok) throw new PartnerError(res.status, `request failed (${res.status})`);
  return (await res.json()) as T;
}

// ── employer ─────────────────────────────────────────────────────────────────
export interface InterviewPacket {
  candidate_id: string;
  full_name: string;
  country?: string;
  band: Band;
  route: string;
  readiness?: number;
  strengths: string[];
  focus_areas: string[];
  sections_completed: number;
  sections_total: number;
}

export async function fetchEmployerCandidates(): Promise<InterviewPacket[]> {
  const r = await partnerGet<{ data: InterviewPacket[] }>("employer", "/v1/employer/candidates");
  return r.data ?? [];
}

export async function issueOffer(candidateId: string, status = "offered"): Promise<boolean> {
  const { token, base } = partnerSession("employer");
  if (!token || !base) return false;
  try {
    const res = await fetch(`${base}/v1/employer/offers`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ candidate_id: candidateId, status }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── university ───────────────────────────────────────────────────────────────
export interface UniversityOverview {
  candidates: number;
  assessed: number;
  band_counts: Record<Band, number>;
  avg_readiness: number | null;
  top_gaps: { client_need: string; mean_score: number }[];
  avg_sections_completed: number;
  sections_total: number;
  funnel: { registered: number; assessed: number; readiness_cleared: number };
}

export async function fetchUniversityOverview(): Promise<UniversityOverview> {
  return partnerGet<UniversityOverview>("university", "/v1/university/overview");
}

// Shared client-need labels for partner displays.
export const NEED_LABEL: Record<string, string> = {
  "management-of-care": "Management of Care",
  "safety-infection-control": "Safety & Infection Control",
  "health-promotion": "Health Promotion",
  "psychosocial-integrity": "Psychosocial Integrity",
  "basic-care-comfort": "Basic Care & Comfort",
  "pharmacological-therapies": "Pharmacological Therapies",
  "reduction-of-risk": "Reduction of Risk",
  "physiological-adaptation": "Physiological Adaptation",
};
export const needLabel = (k: string): string => NEED_LABEL[k] ?? k;

export const BAND_HEX: Record<Band, string> = {
  green: "#0BC5A0",
  yellow: "#F5B400",
  orange: "#F97316",
  red: "#E5484D",
  none: "#94A3B8",
};
export const BAND_LABEL: Record<Band, string> = {
  green: "Exam-ready",
  yellow: "Almost there",
  orange: "Building",
  red: "Foundational",
  none: "Not assessed",
};
