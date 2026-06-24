// Entrypoint: wire the in-memory adapters and start the reference service.
// For production, swap MemoryStore → PostgresStore(createPgClient(url),
// makeFieldCrypto(kmsKey)) and the audit sink, and sign webhooks with a KMS
// secret. None of that changes the public contract.

import { config, reportConfigWarnings } from "./config.ts";
import { MemoryAuditSink } from "./audit.ts";
import { MemoryStore, type Store } from "./store.ts";
import { PostgresStore, createPgClient } from "./store.postgres.ts";
import { keyFromPassphrase, localKeyProvider, makeFieldCrypto } from "./crypto.ts";
import { WebhookEmitter } from "./webhooks.ts";
import { MemoryRevocations } from "./revocations.ts";
import { createServer } from "./server.ts";
import { tlsEnabled } from "./tls.ts";
import { seedDemoClient } from "./auth.ts";
import { selectPaymentProvider } from "./payments.ts";
import { selectEmailProvider } from "./email.ts";
import { selectPathwayClient } from "./pathway.ts";
import { configureCoreAuthFromEnv } from "./coreAuth.ts";

// Trust FlorenceRN Core's RS256 SSO token (verified via JWKS). Configured from
// CORE_ISSUER_URL / TOKEN_ISS / TOKEN_AUD (defaults to the local lvh.me Core).
configureCoreAuthFromEnv();

// Persistence selection: a real Postgres when DATABASE_URL is set (production /
// durable dev), else the zero-dependency in-memory adapter (resets on restart).
// Same Store contract either way - nothing downstream changes.
const databaseUrl = process.env["DATABASE_URL"];
let store: Store;
if (databaseUrl) {
  const sql = await createPgClient(databaseUrl);
  // PII/financial columns are encrypted app-side. Dev derives the key from a
  // passphrase; production should supply a KMS-backed data key (see crypto.ts).
  const fieldCrypto = makeFieldCrypto(localKeyProvider(keyFromPassphrase(config.fieldEncPassphrase)));
  store = new PostgresStore(sql, fieldCrypto);
} else {
  store = new MemoryStore();
}

const payments = selectPaymentProvider();
const email = selectEmailProvider();
const pathway = selectPathwayClient();

const deps = {
  store,
  audit: new MemoryAuditSink(true),
  webhooks: new WebhookEmitter(config.webhookSecret),
  revocations: new MemoryRevocations(),
  payments,
  email,
  pathway,
};

// Optional outbound webhook target (e.g. a CRM connector) from the environment.
if (process.env["WEBHOOK_URL"]) {
  const events = (process.env["WEBHOOK_EVENTS"] ?? "*").split(",").map((s) => s.trim());
  const sub = deps.webhooks.subscribe(process.env["WEBHOOK_URL"], events);
  console.log(`[florence-academy-api] webhook subscription ${sub.id} → ${sub.url} (${events.join(",")})`);
}

await seedDemoClient(deps.store);

const server = createServer(deps);
server.listen(config.port, () => {
  const log = (m: string) => console.log(m);
  const scheme = tlsEnabled() ? "https" : "http";
  log(`[florence-academy-api] listening on ${scheme}://localhost:${config.port}`);
  log(
    databaseUrl
      ? `[store] Postgres (DATABASE_URL) - run db/migrate.mjs once to create tables`
      : `[store] in-memory (data resets on restart) - set DATABASE_URL for Postgres`,
  );
  log(
    payments.isMock
      ? `[payments] MOCK provider (no money moves) - set STRIPE_SECRET_KEY for live Stripe Checkout`
      : `[payments] Stripe Checkout (live)`,
  );
  log(
    email.isMock
      ? `[email] MOCK provider (logs only) - set EMAIL_RELAY_URL to deliver verification emails`
      : `[email] relay delivery (live)`,
  );
  log(
    pathway.isMock
      ? `[pathway] MOCK handoff (dry-run) - set PATHWAY_AGENT_URL to connect the Florence Pathway Agent`
      : `[pathway] Florence Pathway Agent (live)`,
  );
  if (scheme === "http")
    log(`[security] no TLS configured - set TLS_CERT_PATH + TLS_KEY_PATH to serve HTTPS`);
  log(`[florence-academy-api] demo client_id = ${config.demoClientId}`);
  if (!process.env["DEMO_CLIENT_SECRET"]) {
    log(
      `[florence-academy-api] demo client_secret = ${config.demoClientSecret}  ` +
        `(dev-only ephemeral credential - set DEMO_CLIENT_SECRET to override)`,
    );
  }
  reportConfigWarnings(log);
});
