import { createHash } from "node:crypto";
import type {
  ApplyCTA,
  ApplyCTAPlacement,
  Sponsor,
  SponsoredAccessQuote,
  SponsorshipProgram,
} from "./types.ts";

export const ACADEMY_ACCESS_PRODUCT_NAME = "Florence Academy Global Live NCLEX Access";
export const ACADEMY_ACCESS_CAMPAIGN_ID = "global-live-access";
export const APPLY_BASE_URL = "https://www.florenceedu.com/apply";
export const APPLY_LABEL = "Apply to U.S. Partner Programs";
export const APPLY_SUBTEXT = "Application fees are covered by Florence for eligible applicants.";

const DEFAULT_TIME = "2026-01-01T00:00:00.000Z";
const SAFE_PARAM_KEYS = new Set(["source", "sponsor", "campaign", "session_id"]);
const SENSITIVE_KEY_RE =
  /name|email|phone|passport|sevis|ds160|visa|candidate|country|dob|birth|address|token|secret|password/i;

export const DEFAULT_SPONSORS: Sponsor[] = [
  {
    id: "avila-university",
    slug: "avila",
    name: "Avila University",
    status: "active",
    created_at: DEFAULT_TIME,
    updated_at: DEFAULT_TIME,
  },
  {
    id: "webster-university",
    slug: "webster",
    name: "Webster University",
    status: "active",
    created_at: DEFAULT_TIME,
    updated_at: DEFAULT_TIME,
  },
];

export const DEFAULT_SPONSORSHIP_PROGRAMS: SponsorshipProgram[] = DEFAULT_SPONSORS.map((sponsor) => ({
  id: `${sponsor.slug}-global-live-access`,
  sponsor_id: sponsor.id,
  name: `${sponsor.name} Sponsored Global Live Access`,
  program_type: "global_live_access",
  list_value_usd: 200,
  sponsor_subsidy_usd: 100,
  student_price_usd: 100,
  budget_mode: "unlimited",
  status: "active",
  default_apply_url: APPLY_BASE_URL,
  created_at: DEFAULT_TIME,
  updated_at: DEFAULT_TIME,
}));

export const DEFAULT_APPLY_CTAS: ApplyCTA[] = [
  {
    id: "academy-global-live-apply",
    placement: "academy_home",
    label: APPLY_LABEL,
    subtext: APPLY_SUBTEXT,
    destination_url: APPLY_BASE_URL,
    campaign_id: ACADEMY_ACCESS_CAMPAIGN_ID,
    active: true,
    created_at: DEFAULT_TIME,
    updated_at: DEFAULT_TIME,
  },
];

export function quoteForProgram(
  program: SponsorshipProgram,
  sponsor: Sponsor | undefined,
): SponsoredAccessQuote {
  return {
    product_name: ACADEMY_ACCESS_PRODUCT_NAME,
    list_value_usd: program.list_value_usd,
    sponsor_subsidy_usd: program.sponsor_subsidy_usd,
    student_price_usd: program.student_price_usd,
    sponsor_id: program.sponsor_id,
    sponsor_name: sponsor?.name ?? program.sponsor_id,
    sponsor_slug: sponsor?.slug ?? program.sponsor_id,
    sponsorship_program_id: program.id,
    budget_mode: program.budget_mode,
    campaign_id: ACADEMY_ACCESS_CAMPAIGN_ID,
    apply_url: program.default_apply_url,
    sponsorship_available: true,
  };
}

function shortHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function safeApplySessionId(value: string | undefined): string {
  const raw = (value ?? "").trim();
  if (/^anon_[A-Za-z0-9_-]{8,64}$/.test(raw)) return raw;
  if (!raw) return `anon_${shortHash(String(Date.now()))}`;
  return `anon_${shortHash(raw)}`;
}

export function buildApplyUrl(input: {
  source?: string;
  sponsorSlug?: string;
  campaignId?: string;
  sessionId?: string;
  baseUrl?: string;
}): string {
  const url = new URL(input.baseUrl ?? APPLY_BASE_URL);
  url.search = "";
  url.searchParams.set("source", sanitizeParam(input.source ?? "academy"));
  if (input.sponsorSlug) url.searchParams.set("sponsor", sanitizeParam(input.sponsorSlug));
  url.searchParams.set("campaign", sanitizeParam(input.campaignId ?? ACADEMY_ACCESS_CAMPAIGN_ID));
  url.searchParams.set("session_id", safeApplySessionId(input.sessionId));
  return url.toString();
}

function sanitizeParam(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function applyUrlHasOnlySafeParams(url: string): boolean {
  const parsed = new URL(url);
  for (const key of parsed.searchParams.keys()) {
    if (!SAFE_PARAM_KEYS.has(key)) return false;
    if (SENSITIVE_KEY_RE.test(key)) return false;
  }
  return true;
}

export function redactSensitiveLogValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED]")
      .replace(/\b(?:passport|sevis|ds-?160|visa|candidate|phone|dob|token|secret)\b[=: ]+[A-Za-z0-9._-]+/gi, "[REDACTED]");
  }
  if (Array.isArray(value)) return value.map(redactSensitiveLogValue);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = SENSITIVE_KEY_RE.test(key) ? "[REDACTED]" : redactSensitiveLogValue(val);
    }
    return out;
  }
  return value;
}

export function normalizeApplyPlacement(value: string | undefined): ApplyCTAPlacement {
  const allowed: ApplyCTAPlacement[] = [
    "academy_home",
    "checkout_success",
    "live_class",
    "class_completion",
    "diagnostic_result",
    "sponsor_card",
    "residency_page",
    "grant_center",
    "email",
    "whatsapp",
    "practice",
    "tutor",
    "account",
    "landing",
  ];
  return allowed.includes(value as ApplyCTAPlacement) ? (value as ApplyCTAPlacement) : "academy_home";
}
