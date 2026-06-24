// Integration checks for the production-leaning pieces that the HTTP smoke test
// doesn't cover: column encryption, real webhook delivery + dead-lettering, and
// the Postgres adapter (against a fake SQL client, so no live DB is needed).
// Run: `node test/integration.ts`.

import { strict as assert } from "node:assert";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import {
  keyFromPassphrase,
  LocalKeyProvider,
  localKeyProvider,
  makeFieldCrypto,
  verifyWebhook,
} from "../src/crypto.ts";
import { MemoryAuditSink } from "../src/audit.ts";
import { validate } from "../src/validate.ts";
import { WebhookEmitter } from "../src/webhooks.ts";
import { PostgresStore } from "../src/store.postgres.ts";
import type { SqlClient } from "../src/store.postgres.ts";

let passed = 0;
const ok = (l: string) => {
  passed++;
  console.log(`  ✓ ${l}`);
};
const now = () => Math.floor(Date.now() / 1000);

try {
  // 1) Field encryption round-trips and is tamper-evident (AES-256-GCM).
  const fc = makeFieldCrypto(localKeyProvider(keyFromPassphrase("test-passphrase")));
  const phone = "+63 917 555 0101";
  const ct = await fc.encrypt(phone);
  assert.notEqual(ct, phone);
  assert.equal(await fc.decrypt(ct), phone);
  await assert.rejects(fc.decrypt(ct.slice(0, -3) + "AAA"));
  ok("field encryption round-trips + rejects tampering");

  // 1b) KEK rotation: old ciphertext still decrypts after rotating the active key.
  const kOld = keyFromPassphrase("kek-old");
  const kNew = keyFromPassphrase("kek-new");
  const before = makeFieldCrypto(new LocalKeyProvider({ activeId: "old", keys: { old: kOld } }));
  const tokenOld = await before.encrypt("sensitive-1");
  const after = makeFieldCrypto(new LocalKeyProvider({ activeId: "new", keys: { old: kOld, new: kNew } }));
  assert.equal(await after.decrypt(tokenOld), "sensitive-1"); // pre-rotation value still readable
  const tokenNew = await after.encrypt("sensitive-2");
  assert.ok(tokenNew.includes(".new.")); // new writes use the rotated KEK
  assert.equal(await after.decrypt(tokenNew), "sensitive-2");
  ok("KEK rotation: old ciphertext decrypts, new writes use the new key");

  // 1c) Audit log is hash-chained and detects tampering.
  const audit = new MemoryAuditSink(false);
  for (let i = 0; i < 3; i++)
    audit.append({ ts: `t${i}`, request_id: `r${i}`, action: "GET /x", outcome: 200 });
  assert.ok(audit.verifyChain());
  const recorded = audit.recent();
  if (recorded[1]) recorded[1].outcome = 500; // tamper a recorded entry in place
  assert.ok(!audit.verifyChain());
  ok("audit log is hash-chained + detects tampering");

  // 1d) Schema validator reports precise per-field errors.
  assert.ok(validate({ full_name: "Maria" }, { full_name: { type: "string", required: true, min: 1 } }).ok);
  const bad = validate(
    { amount_cents: "100", currency: "" },
    {
      candidate_id: { type: "string", required: true },
      amount_cents: { type: "integer", required: true, min: 0 },
      currency: { type: "string", required: true, min: 1 },
      kind: { type: "string", required: true, enum: ["a", "b"] as const },
    },
  );
  assert.ok(!bad.ok);
  if (!bad.ok) {
    const fields = bad.errors.map((e) => e.field);
    assert.ok(fields.includes("candidate_id")); // missing
    assert.ok(fields.includes("amount_cents")); // string, not integer
    assert.ok(fields.includes("currency")); // too short
    assert.ok(fields.includes("kind")); // missing
  }
  ok("schema validator reports precise per-field errors");

  // 2) Webhook delivered to a live receiver; signature verifies; no dead-letters.
  const SECRET = "wh-secret";
  // Assigned inside a callback; `any` avoids TS narrowing it to `never`.
  let received: any = null;
  const receiver = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      received = { sig: String(req.headers["florence-signature"] ?? ""), body: raw };
      res.writeHead(200).end("ok");
    });
  });
  await new Promise<void>((r) => receiver.listen(0, r));
  const port = (receiver.address() as AddressInfo).port;
  const em = new WebhookEmitter(SECRET, { maxAttempts: 3, baseDelayMs: 5 });
  em.subscribe(`http://localhost:${port}/hook`, ["assessment_result.created"]);
  em.emit("assessment_result.created", { id: "asr_1" });
  await em.flush();
  if (!received) throw new Error("receiver did not get the webhook");
  assert.ok(verifyWebhook(SECRET, received.sig, received.body, now()));
  assert.equal(em.deadLetters().length, 0);
  ok("webhook delivered, signature verifies, no dead-letters");
  receiver.close();

  // 3) Persistent failure → dead-letter after bounded retries.
  const failing = createServer((_req, res) => res.writeHead(500).end("boom"));
  await new Promise<void>((r) => failing.listen(0, r));
  const fport = (failing.address() as AddressInfo).port;
  const em2 = new WebhookEmitter(SECRET, { maxAttempts: 2, baseDelayMs: 5 });
  em2.subscribe(`http://localhost:${fport}/hook`, ["*"]);
  em2.emit("enrollment.status_changed", { id: "enr_1" });
  await em2.flush();
  const dl = em2.deadLetters();
  assert.equal(dl.length, 1);
  assert.equal(dl[0]?.status, 500);
  ok("failed delivery → dead-letter after retries");
  failing.close();

  // 4) PostgresStore encrypts PII on write, decrypts on read (fake SqlClient).
  const calls: { sql: string; params: unknown[] }[] = [];
  let candRow: Record<string, unknown> | null = null;
  const fake: SqlClient = {
    query: async (sql: string, params: unknown[] = []): Promise<any[]> => {
      calls.push({ sql, params });
      if (/^INSERT INTO candidates/i.test(sql)) {
        candRow = {
          id: params[0],
          external_ref: params[1],
          full_name: params[2],
          email_enc: params[3],
          phone_enc: params[4],
          country: params[5],
          consent: JSON.parse(String(params[6])),
          created_at: params[7],
          updated_at: params[8],
        };
        return [];
      }
      if (/^SELECT \* FROM candidates WHERE id/i.test(sql)) return candRow ? [candRow] : [];
      return [];
    },
  };
  const pg = new PostgresStore(fake, fc);
  const created = await pg.candidates.create({
    full_name: "Maria",
    email: "maria@example.com",
    phone,
    country: "PH",
  });
  const insert = calls.find((c) => /INSERT INTO candidates/i.test(c.sql));
  if (!insert) throw new Error("no candidates INSERT issued");
  assert.notEqual(insert.params[3], "maria@example.com"); // email ciphertext
  assert.notEqual(insert.params[4], phone); // phone ciphertext
  assert.equal(typeof insert.params[4], "string");
  const fetched = await pg.candidates.get(created.id);
  assert.equal(fetched?.email, "maria@example.com"); // decrypts back
  assert.equal(fetched?.phone, phone);
  assert.equal(fetched?.country, "PH");
  ok("PostgresStore encrypts email + phone on write, decrypts on read");

  // 5) PostgresStore: candidate_credentials + candidate_progress round-trip
  // (stateful fake SqlClient covering the new tables' SQL + upsert merge).
  const credStore: Record<string, unknown>[] = [];
  const progStore: Record<string, unknown>[] = [];
  const ocStore: Record<string, unknown>[] = [];
  const fake2: SqlClient = {
    query: async (sql: string, params: unknown[] = []): Promise<any[]> => {
      if (/^INSERT INTO outcome_events/i.test(sql)) {
        ocStore.push({ candidate_id: params[1], kind: params[2], status: params[3] });
        return [];
      }
      if (/SELECT candidate_id, kind, status FROM outcome_events/i.test(sql)) return ocStore;
      if (/^INSERT INTO candidate_credentials/i.test(sql)) {
        credStore.push({ candidate_id: params[0], email: params[1], password_hash: params[2], created_at: params[3] });
        return [];
      }
      if (/^SELECT \* FROM candidate_credentials WHERE email/i.test(sql)) {
        return credStore.filter((r) => r["email"] === params[0]);
      }
      if (/WHERE candidate_id = \$1 AND section_slug/i.test(sql)) {
        return progStore.filter((r) => r["candidate_id"] === params[0] && r["section_slug"] === params[1]);
      }
      if (/^INSERT INTO candidate_progress/i.test(sql)) {
        const row = {
          candidate_id: params[0], section_slug: params[1], status: params[2],
          percent: params[3], last_segment: params[4], updated_at: params[5],
        };
        const i = progStore.findIndex((r) => r["candidate_id"] === params[0] && r["section_slug"] === params[1]);
        if (i >= 0) progStore[i] = row;
        else progStore.push(row);
        return [];
      }
      if (/WHERE candidate_id = \$1 ORDER BY section_slug/i.test(sql)) {
        return progStore.filter((r) => r["candidate_id"] === params[0]);
      }
      return [];
    },
  };
  const pg2 = new PostgresStore(fake2, fc);
  const cred = await pg2.credentials.create({ candidate_id: "cand_x", email: "Foo@Bar.com", password_hash: "h" });
  assert.equal(cred.email, "foo@bar.com"); // lowercased natural key
  assert.equal((await pg2.credentials.getByEmail("foo@bar.com"))?.candidate_id, "cand_x");
  await pg2.progress.upsert({ candidate_id: "cand_x", section_slug: "section-8", status: "in_progress", percent: 40 });
  const merged = await pg2.progress.upsert({ candidate_id: "cand_x", section_slug: "section-8", status: "completed", percent: 100 });
  assert.equal(merged.status, "completed");
  const progList = await pg2.progress.listByCandidate("cand_x");
  assert.equal(progList.length, 1); // upsert merged, not duplicated
  assert.equal(progList[0]?.percent, 100);
  ok("PostgresStore credentials + progress round-trip (upsert merges)");

  await pg2.outcomes.create({ candidate_id: "cand_x", kind: "nclex_result", status: "pass" });
  await pg2.outcomes.create({ candidate_id: "cand_x", kind: "start" });
  const fnl = await pg2.outcomes.funnel();
  assert.equal(fnl.nclex_pass, 1);
  assert.equal(fnl.start, 1);
  ok("PostgresStore outcomes create + funnel (fake SqlClient)");

  console.log(`\nPASS - ${passed} checks`);
  process.exit(0);
} catch (e) {
  console.error("\nFAIL:", e);
  process.exit(1);
}
