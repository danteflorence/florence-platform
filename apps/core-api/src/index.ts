// FlorenceRN Core entrypoint: wire the store, signing keys, audit, and routes,
// then listen. Runs TypeScript directly (Node >=22.6), zero runtime deps.

import { createServer } from "node:http";
import { makeAudit } from "./audit.ts";
import { config, googleConfigured, reportConfigWarnings } from "./config.ts";
import { KeyManager } from "./keys.ts";
import { seedDemoClient } from "./m2m.ts";
import { buildRoutes } from "./routes.ts";
import { createApp } from "./server.ts";
import { createGateway } from "./gateway/index.ts";
import { createLogger } from "./logger.ts";
import { createStore } from "./store.ts";

const store = await createStore(config);
const keys = new KeyManager(store);
await keys.init();
const audit = makeAudit(store);
const demo = await seedDemoClient(store);

const gateway = createGateway({ store, keys, audit });
const app = createApp(buildRoutes({ store, keys, audit }), gateway);
const server = createServer(app);
const logger = createLogger({ component: "startup" });

server.listen(config.port, () => {
  logger.info("florence-core listening", {
    component: "startup",
    port: config.port,
    publicUrl: config.publicUrl,
    issuer: config.issuer,
    audience: config.audience,
    cookieName: config.cookieName,
    cookieDomain: config.cookieDomain || "(host-only)",
    cookieSecure: config.cookieSecure,
    googleConfigured: googleConfigured(),
    signingKid: keys.activeKid(),
    jwksPath: "/.well-known/jwks.json",
    store: config.databaseUrl ? "postgres" : config.stateFile ? "file" : "memory",
  });
  if (demo) logger.info("seeded demo M2M client", { component: "startup", clientId: demo.id });
  reportConfigWarnings((m) => logger.warn(m, { component: "startup" }));
});
