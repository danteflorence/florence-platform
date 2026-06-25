import { apiBaseUrl } from "./academyAuth";

export const APPLY_LABEL = "Apply to U.S. Partner Programs";
export const APPLY_SUBTEXT = "Application fees are covered by Florence for eligible applicants.";
export const APPLY_CAMPAIGN = "global-live-access";
export const APPLY_BASE_URL = "https://www.florenceedu.com/apply";

export type ApplyPlacement =
  | "academy_home"
  | "checkout_success"
  | "live_class"
  | "class_completion"
  | "diagnostic_result"
  | "sponsor_card"
  | "residency_page"
  | "grant_center"
  | "email"
  | "whatsapp"
  | "practice"
  | "tutor"
  | "account"
  | "landing";

export interface ApplyCtaPayload {
  id: string;
  placement: ApplyPlacement;
  label: string;
  subtext: string;
  destination_url: string;
  campaign_id: string;
  sponsor: { id: string; slug: string; name: string } | null;
}

const SESSION_KEY = "fl_apply_session_id";
const SAFE_KEYS = new Set(["source", "sponsor", "campaign", "session_id"]);

export function applySessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing && /^anon_[A-Za-z0-9_-]{8,64}$/.test(existing)) return existing;
    const raw =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().replace(/-/g, "")
        : `${Date.now()}${Math.random().toString(36).slice(2)}`;
    const next = `anon_${raw.slice(0, 32)}`;
    localStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return "anon_session0";
  }
}

function sanitize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function buildApplyUrl(input: {
  sponsorSlug?: string;
  campaignId?: string;
  sessionId?: string;
} = {}): string {
  const url = new URL(APPLY_BASE_URL);
  url.searchParams.set("source", "academy");
  if (input.sponsorSlug) url.searchParams.set("sponsor", sanitize(input.sponsorSlug));
  url.searchParams.set("campaign", sanitize(input.campaignId ?? APPLY_CAMPAIGN));
  url.searchParams.set("session_id", input.sessionId ?? applySessionId());
  for (const key of [...url.searchParams.keys()]) {
    if (!SAFE_KEYS.has(key)) url.searchParams.delete(key);
  }
  return url.toString();
}

export async function fetchApplyCta(placement: ApplyPlacement): Promise<ApplyCtaPayload> {
  const fallback: ApplyCtaPayload = {
    id: "academy-global-live-apply",
    placement,
    label: APPLY_LABEL,
    subtext: APPLY_SUBTEXT,
    destination_url: buildApplyUrl(),
    campaign_id: APPLY_CAMPAIGN,
    sponsor: null,
  };
  const base = apiBaseUrl();
  if (!base) return fallback;
  const session = applySessionId();
  try {
    const res = await fetch(
      `${base}/v1/academy/apply-cta?placement=${encodeURIComponent(placement)}&session_id=${encodeURIComponent(session)}`,
    );
    if (!res.ok) return fallback;
    return (await res.json()) as ApplyCtaPayload;
  } catch {
    return fallback;
  }
}

export async function trackApplyCta(
  eventType: "view" | "click",
  placement: ApplyPlacement,
  campaignId = APPLY_CAMPAIGN,
): Promise<void> {
  const base = apiBaseUrl();
  if (!base) return;
  try {
    await fetch(`${base}/v1/academy/apply-cta/${eventType}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        placement,
        campaign_id: campaignId,
        session_id: applySessionId(),
      }),
    });
  } catch {
    // Attribution is best effort and must never block the learner.
  }
}
