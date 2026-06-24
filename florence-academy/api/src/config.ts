// Runtime configuration. Secrets come from the environment; for local dev we
// generate ephemeral ones and print a clear warning so nothing secret is ever
// hard-coded or committed.

import { randomBytes, randomUUID } from "node:crypto";

export interface Config {
  port: number;
  /** HS256 signing secret (reference). Production: RS256/ES256 via KMS. */
  jwtSecret: string;
  jwtIssuer: string;
  jwtAudience: string;
  tokenTtlSec: number;
  /** HMAC secret for signing outbound webhooks. */
  webhookSecret: string;
  /** Passphrase for column field encryption (dev). Production: a KMS data key. */
  fieldEncPassphrase: string;
  /** Seed demo partner client so the service is usable out of the box. */
  demoClientId: string;
  demoClientSecret: string;
  rateLimit: { capacity: number; refillPerSec: number };
  /** Native TLS: serve HTTPS directly when cert+key are provided. */
  tls: {
    certPath?: string;
    keyPath?: string;
    /** CA to verify client certs against (mutual TLS for high-trust partners). */
    clientCaPath?: string;
    requireClientCert: boolean;
  };
  /** Exact Origins allowed to call the API from a browser (CORS allowlist). */
  corsOrigins: string[];
  /** Public URL of the learner app (for payment/verification links). */
  publicAppUrl: string;
  /** When true, sensitive actions (e.g. checkout) require a verified email. */
  requireEmailVerification: boolean;
  payments: {
    depositAmountCents: number;
    currency: string;
    /** When set, the real Stripe provider is used; otherwise a local mock. */
    stripeSecretKey?: string;
    stripeWebhookSecret?: string;
  };
  /**
   * Lob webhook signing secret. Per-webhook, from the Lob dashboard.
   * When unset, /v1/outreach/webhooks/lob responds 503 - never accept
   * unsigned webhooks in any environment.
   */
  lobWebhookSecret?: string;
  /** Drip campaign (Phase 3). */
  drip: {
    /** Guards POST /v1/drip/tick (external cron). When unset, the tick
     *  endpoint responds 503 - never advance the drip unguarded. */
    tickSecret?: string;
    /** Max emails dispatched per tick (deliverability warm-up; ramp via env). */
    sendCapPerTick: number;
    /** Per-stage minimum interval in days, index = stage being sent.
     *  Stage 0 is 0 (send immediately on enroll). */
    stageIntervalDays: number[];
  };
}

const warnings: string[] = [];

function fromEnvOrGenerate(name: string, generate: () => string): string {
  const v = process.env[name];
  if (v && v.length > 0) return v;
  const generated = generate();
  warnings.push(name);
  return generated;
}

export const config: Config = {
  port: Number(process.env.PORT ?? 8088),
  jwtSecret: fromEnvOrGenerate("API_JWT_SECRET", () =>
    randomBytes(32).toString("hex"),
  ),
  jwtIssuer: process.env.API_JWT_ISSUER ?? "florence-academy-api",
  jwtAudience: process.env.API_JWT_AUDIENCE ?? "florence-academy-api",
  tokenTtlSec: Number(process.env.API_TOKEN_TTL_SEC ?? 900),
  webhookSecret: fromEnvOrGenerate("WEBHOOK_SECRET", () =>
    randomBytes(32).toString("hex"),
  ),
  fieldEncPassphrase: fromEnvOrGenerate("FIELD_ENC_PASSPHRASE", () =>
    randomBytes(24).toString("hex"),
  ),
  demoClientId: process.env.DEMO_CLIENT_ID ?? "demo-crm",
  demoClientSecret: fromEnvOrGenerate("DEMO_CLIENT_SECRET", () =>
    randomUUID().replace(/-/g, ""),
  ),
  rateLimit: {
    capacity: Number(process.env.RATE_LIMIT_CAPACITY ?? 60),
    refillPerSec: Number(process.env.RATE_LIMIT_REFILL_PER_SEC ?? 10),
  },
  tls: {
    ...(process.env.TLS_CERT_PATH && { certPath: process.env.TLS_CERT_PATH }),
    ...(process.env.TLS_KEY_PATH && { keyPath: process.env.TLS_KEY_PATH }),
    ...(process.env.TLS_CLIENT_CA_PATH && { clientCaPath: process.env.TLS_CLIENT_CA_PATH }),
    requireClientCert: process.env.TLS_REQUIRE_CLIENT_CERT === "1",
  },
  corsOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  publicAppUrl: (process.env.PUBLIC_APP_URL ?? "http://localhost:5174").replace(/\/$/, ""),
  requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === "1",
  payments: {
    depositAmountCents: Number(process.env.DEPOSIT_AMOUNT_CENTS ?? 10000),
    currency: (process.env.DEPOSIT_CURRENCY ?? "usd").toLowerCase(),
    ...(process.env.STRIPE_SECRET_KEY && { stripeSecretKey: process.env.STRIPE_SECRET_KEY }),
    ...(process.env.STRIPE_WEBHOOK_SECRET && { stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET }),
  },
  ...(process.env.LOB_WEBHOOK_SECRET && { lobWebhookSecret: process.env.LOB_WEBHOOK_SECRET }),
  drip: {
    ...(process.env.DRIP_TICK_SECRET && { tickSecret: process.env.DRIP_TICK_SECRET }),
    sendCapPerTick: Number(process.env.DRIP_SEND_CAP_PER_TICK ?? 50),
    stageIntervalDays: (process.env.DRIP_STAGE_INTERVAL_DAYS ?? "0,3,5,7,10,14")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n)),
  },
};

/** Emit dev-secret warnings once, after logging is ready. */
export function reportConfigWarnings(log: (msg: string) => void): void {
  if (warnings.length === 0) return;
  log(
    `[security] generated ephemeral dev values for ${warnings.join(", ")} - ` +
      `set these in the environment for any shared or production use.`,
  );
}
