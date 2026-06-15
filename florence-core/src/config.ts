// Runtime configuration. Secrets come from the environment; for local dev we
// generate ephemeral ones and print a clear warning so nothing secret is ever
// hard-coded or committed. (Same pattern as florence-academy/api/src/config.ts.)

import { randomBytes, randomUUID } from "node:crypto";

export interface Config {
  port: number;
  /** Public origin of Core, e.g. https://id.florenceeducation.com */
  publicUrl: string;
  /** Token issuer — every app verifies this. Keep stable across the fleet. */
  issuer: string;
  /** Human-session audience — every app accepts this. */
  audience: string;
  /** Short-lived access token (the fl_session cookie). */
  humanSessionTtlSec: number;
  /** Long-lived refresh token (the fl_refresh cookie) — enables silent re-auth + revocation. */
  refreshTtlSec: number;
  m2mTokenTtlSec: number;
  cookieName: string;
  /** Leading-dot parent domain so every subdomain shares the session. "" = host-only. */
  cookieDomain: string;
  cookieSecure: boolean;
  /** Email domains eligible for staff roles via Google sign-in. */
  allowedEmailDomains: string[];
  /** Host suffixes a post-login redirect may target (open-redirect guard). */
  redirectHostSuffixes: string[];
  google: { clientId: string; clientSecret: string; redirectUri: string };
  /** Encrypts RSA signing private keys at rest. MUST be stable across restarts. */
  fieldEncPassphrase: string;
  /** When set, Core uses Postgres; otherwise an in-memory store. */
  databaseUrl?: string;
  /** Dev only: persist the in-memory store to this JSON file across restarts. */
  stateFile?: string;
  demoClientId: string;
  demoClientSecret: string;
  rateLimit: { capacity: number; refillPerSec: number };
}

const warnings: string[] = [];

function fromEnvOrGenerate(name: string, generate: () => string): string {
  const v = process.env[name];
  if (v && v.length > 0) return v;
  const generated = generate();
  warnings.push(name);
  return generated;
}

function list(name: string, fallback: string): string[] {
  return (process.env[name] ?? fallback)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

const publicUrl = (process.env.PUBLIC_CORE_URL ?? "http://id.lvh.me:8080").replace(/\/$/, "");

export const config: Config = {
  port: Number(process.env.PORT ?? 8080),
  publicUrl,
  issuer: process.env.TOKEN_ISS ?? "florence-auth",
  audience: process.env.TOKEN_AUD ?? "florence",
  humanSessionTtlSec: Number(process.env.HUMAN_SESSION_TTL_SEC ?? 3600),
  refreshTtlSec: Number(process.env.REFRESH_TTL_SEC ?? 2_592_000),
  m2mTokenTtlSec: Number(process.env.M2M_TOKEN_TTL_SEC ?? 900),
  cookieName: process.env.COOKIE_NAME ?? "fl_session",
  cookieDomain: process.env.COOKIE_DOMAIN ?? "",
  cookieSecure: process.env.COOKIE_SECURE !== "0",
  allowedEmailDomains: list("FLORENCE_ALLOWED_DOMAIN", "florenceeducation.com"),
  redirectHostSuffixes: list("FLORENCE_REDIRECT_HOSTS", ".florenceeducation.com,.lvh.me,localhost"),
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    redirectUri: process.env.GOOGLE_REDIRECT_URI ?? `${publicUrl}/auth/google/callback`,
  },
  fieldEncPassphrase: fromEnvOrGenerate("FIELD_ENC_PASSPHRASE", () => randomBytes(24).toString("hex")),
  ...(process.env.DATABASE_URL && { databaseUrl: process.env.DATABASE_URL }),
  ...(process.env.CORE_STATE_FILE && { stateFile: process.env.CORE_STATE_FILE }),
  demoClientId: process.env.DEMO_CLIENT_ID ?? "florence-core-demo",
  demoClientSecret: fromEnvOrGenerate("DEMO_CLIENT_SECRET", () => randomUUID().replace(/-/g, "")),
  rateLimit: {
    capacity: Number(process.env.RATE_LIMIT_CAPACITY ?? 120),
    refillPerSec: Number(process.env.RATE_LIMIT_REFILL_PER_SEC ?? 20),
  },
};

/** True when Google sign-in is wired (client id + secret present). */
export function googleConfigured(): boolean {
  return Boolean(config.google.clientId && config.google.clientSecret);
}

/** Emit dev-secret warnings once, after logging is ready. */
export function reportConfigWarnings(log: (msg: string) => void): void {
  if (warnings.length === 0) return;
  log(
    `[security] generated ephemeral dev values for ${warnings.join(", ")} — ` +
      `set these in the environment for any shared or production use.`,
  );
  if (!config.databaseUrl && !config.stateFile)
    log("[store] no DATABASE_URL and no CORE_STATE_FILE — using a purely in-memory store (resets on restart).");
}
