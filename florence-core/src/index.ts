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
import { createStore } from "./store.ts";

const store = await createStore(config);
const keys = new KeyManager(store);
await keys.init();
const audit = makeAudit(store);
const demo = await seedDemoClient(store);

const gateway = createGateway({ store, keys, audit });
const app = createApp(buildRoutes({ store, keys, audit }), gateway);
const server = createServer(app);

server.listen(config.port, () => {
  console.log(`florence-core listening on :${config.port}  (${config.publicUrl})`);
  console.log(
    `  issuer=${config.issuer} aud=${config.audience} cookie=${config.cookieName} ` +
      `domain=${config.cookieDomain || "(host-only)"} secure=${config.cookieSecure}`,
  );
  console.log(`  google sign-in: ${googleConfigured() ? "configured" : "NOT configured (password login only)"}`);
  console.log(`  signing kid=${keys.activeKid()}  jwks=${config.publicUrl}/.well-known/jwks.json`);
  console.log(`  store=${config.databaseUrl ? "postgres" : config.stateFile ? `file:${config.stateFile}` : "memory"}`);
  if (demo) console.log(`  seeded demo M2M client: ${demo.id} / ${demo.secret}`);
  reportConfigWarnings((m) => console.log(m));
});
