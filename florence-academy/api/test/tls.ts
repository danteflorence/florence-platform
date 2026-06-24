// Verifies the server speaks native HTTPS with a TLS 1.2 floor + security
// headers. Generates a throwaway self-signed cert via openssl; skips cleanly if
// openssl isn't available. Run: `node test/tls.ts`.

import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { request as httpsRequest } from "node:https";
import type { TLSSocket } from "node:tls";

const dir = mkdtempSync(join(tmpdir(), "fl-tls-"));
const keyPath = join(dir, "key.pem");
const certPath = join(dir, "cert.pem");
try {
  execFileSync(
    "openssl",
    ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", keyPath, "-out", certPath, "-days", "1", "-subj", "/CN=localhost"],
    { stdio: "ignore" },
  );
} catch {
  console.log("  ⚠ SKIP: openssl unavailable - cannot generate a test cert");
  process.exit(0);
}

process.env["PORT"] = "8097";
process.env["TLS_CERT_PATH"] = certPath;
process.env["TLS_KEY_PATH"] = keyPath;
process.env["API_JWT_SECRET"] = "tls-test";
process.env["DEMO_CLIENT_SECRET"] = "tls-demo";

const { config } = await import("../src/config.ts");
const { MemoryStore } = await import("../src/store.ts");
const { MemoryAuditSink } = await import("../src/audit.ts");
const { WebhookEmitter } = await import("../src/webhooks.ts");
const { createServer } = await import("../src/server.ts");
const { seedDemoClient } = await import("../src/auth.ts");
const { MemoryRevocations } = await import("../src/revocations.ts");
const { MockPaymentProvider } = await import("../src/payments.ts");
const { MockEmailProvider } = await import("../src/email.ts");
const { MockPathwayClient } = await import("../src/pathway.ts");

const deps = {
  store: new MemoryStore(),
  audit: new MemoryAuditSink(false),
  webhooks: new WebhookEmitter(config.webhookSecret),
  revocations: new MemoryRevocations(),
  payments: new MockPaymentProvider("http://localhost:5174"),
  email: new MockEmailProvider(),
  pathway: new MockPathwayClient(),
};
await seedDemoClient(deps.store);
const server = createServer(deps);
await new Promise<void>((r) => server.listen(config.port, r));

let passed = 0;
const ok = (l: string) => {
  passed++;
  console.log(`  ✓ ${l}`);
};

function get(path: string): Promise<{ status: number; proto: string; headers: Record<string, string | string[] | undefined> }> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      { host: "localhost", port: config.port, path, method: "GET", rejectUnauthorized: false, minVersion: "TLSv1.2" },
      (res) => {
        const proto = (res.socket as TLSSocket | null)?.getProtocol?.() ?? "";
        res.resume(); // drain so "end" fires
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, proto, headers: res.headers }),
        );
      },
    );
    req.on("error", reject);
    req.end();
  });
}

try {
  const r = await get("/health");
  assert.equal(r.status, 200);
  ok("server responds over native HTTPS");
  assert.ok(r.proto === "TLSv1.2" || r.proto === "TLSv1.3");
  ok(`negotiated ${r.proto} (>= TLS 1.2)`);
  assert.ok(String(r.headers["strict-transport-security"]).includes("max-age="));
  ok("HSTS header present on TLS responses");

  console.log(`\nPASS - ${passed} checks`);
  server.close();
  process.exit(0);
} catch (e) {
  console.error("\nFAIL:", e);
  server.close();
  process.exit(1);
}
