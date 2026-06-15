// Runnable HubSpot connector: receives Florence webhooks and upserts contacts.
//
//   FLORENCE_API_URL=http://localhost:8088 \
//   FLORENCE_API_TOKEN=<token with candidates:read> \
//   WEBHOOK_SECRET=<same as the API> \
//   HUBSPOT_TOKEN=<private-app token, optional → dry-run> \
//   node connectors/hubspot-server.ts
//
// Point the API at it:  WEBHOOK_URL=http://localhost:8099 npm start

import { createServer } from "node:http";
import { config } from "../src/config.ts";
import { HubspotConnector, florenceResolver } from "./hubspot.ts";

const apiUrl = process.env["FLORENCE_API_URL"] ?? "http://localhost:8088";
const apiToken = process.env["FLORENCE_API_TOKEN"] ?? "";
const port = Number(process.env["HUBSPOT_CONNECTOR_PORT"] ?? 8099);
const hubspotToken = process.env["HUBSPOT_TOKEN"];

const connector = new HubspotConnector({
  webhookSecret: config.webhookSecret,
  ...(hubspotToken ? { hubspotToken } : {}),
  resolveCandidate: florenceResolver(apiUrl, apiToken),
});

createServer((req, res) => {
  if (req.method !== "POST") {
    res.writeHead(405).end();
    return;
  }
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    void (async () => {
      const sig = String(req.headers["florence-signature"] ?? "");
      const result = await connector.handleWebhook(sig, raw);
      const detail = result.ok
        ? `${result.dryRun ? "dry-run" : "upserted"} ${result.contact.email}`
        : `rejected: ${result.reason}`;
      console.log(`[hubspot-connector] ${req.headers["florence-event"] ?? "?"} → ${detail}`);
      res.writeHead(result.ok ? 200 : 400, { "content-type": "application/json" });
      res.end(JSON.stringify(result));
    })();
  });
}).listen(port, () => {
  console.log(
    `[hubspot-connector] listening on http://localhost:${port} → HubSpot ${
      hubspotToken ? "(live)" : "(dry-run)"
    }`,
  );
});
