// HubSpot connector checks: the field-mapping layer + webhook handling
// (dry-run + signature verification), all offline. Run: `node test/hubspot.ts`.

import { strict as assert } from "node:assert";
import { signWebhook } from "../src/crypto.ts";
import { HubspotConnector, hubspotContactFromEvent } from "../connectors/hubspot.ts";
import type { ResolvedCandidate } from "../connectors/hubspot.ts";
import type { WebhookEvent } from "../src/webhooks.ts";

let passed = 0;
const ok = (l: string) => {
  passed++;
  console.log(`  ✓ ${l}`);
};
const nowSec = () => Math.floor(Date.now() / 1000);
const evt = (type: string, data: unknown): WebhookEvent => ({
  id: "evt_1",
  type,
  created_at: new Date(nowSec() * 1000).toISOString(),
  data,
});

const SECRET = "wh-secret";
const maria: ResolvedCandidate = {
  id: "cand_1",
  email: "maria@example.com",
  full_name: "Maria Santos",
  country: "PH",
};

try {
  // 1) Field mapping: assessment_result.created → HubSpot contact properties
  const c = hubspotContactFromEvent(
    evt("assessment_result.created", {
      candidate_id: "cand_1",
      kind: "timed",
      readiness: 0.78,
      theta: 0.42,
      items_completed: 75,
      content_hash: "x",
      created_at: "2026-06-02T00:00:00.000Z",
    }),
    maria,
  );
  if (!c) throw new Error("expected a contact");
  assert.equal(c.email, "maria@example.com");
  assert.equal(c.properties["florence_candidate_id"], "cand_1");
  assert.equal(c.properties["florence_readiness"], "0.78");
  assert.equal(c.properties["florence_assessment_kind"], "timed");
  assert.equal(c.properties["florence_items_completed"], "75");
  assert.equal(c.properties["firstname"], "Maria Santos");
  ok("maps assessment_result.created → HubSpot properties");

  // 2) No email → skipped
  assert.equal(
    hubspotContactFromEvent(evt("assessment_result.created", { candidate_id: "x" }), { id: "x" }),
    null,
  );
  ok("candidate without email → null (skipped)");

  // 3) handleWebhook: valid signature + fake resolver → dry-run mapping
  const conn = new HubspotConnector({
    webhookSecret: SECRET,
    resolveCandidate: async (id) => (id === "cand_1" ? maria : null),
  });
  const body = JSON.stringify(
    evt("enrollment.status_changed", {
      candidate_id: "cand_1",
      cohort: "MNL-2026-07",
      status: "attending",
    }),
  );
  const r = await conn.handleWebhook(signWebhook(SECRET, body, nowSec()), body);
  if (!r.ok) throw new Error(`expected ok, got: ${r.reason}`);
  assert.equal(r.dryRun, true);
  assert.equal(r.contact.properties["florence_enrollment_status"], "attending");
  assert.equal(r.contact.properties["florence_cohort"], "MNL-2026-07");
  ok("handleWebhook maps + dry-runs without a HubSpot token");

  // 4) Bad signature → rejected
  const bad = await conn.handleWebhook("t=1,v1=deadbeef", body);
  assert.equal(bad.ok, false);
  ok("invalid signature → rejected");

  // 5) payment.completed → deposit properties
  const pay = hubspotContactFromEvent(
    evt("payment.completed", { id: "pay_1", candidate_id: "cand_1", amount_cents: 10000, currency: "usd" }),
    maria,
  );
  if (!pay) throw new Error("expected a contact for payment.completed");
  assert.equal(pay.properties["florence_deposit_paid"], "true");
  assert.equal(pay.properties["florence_deposit_amount_cents"], "10000");
  assert.equal(pay.properties["florence_deposit_currency"], "usd");
  ok("maps payment.completed → deposit properties");

  // 6) candidate.email_verified → flag; candidate id read from `id` (no candidate_id)
  const ver = hubspotContactFromEvent(evt("candidate.email_verified", { id: "cand_1" }), maria);
  if (!ver) throw new Error("expected a contact for candidate.email_verified");
  assert.equal(ver.properties["florence_email_verified"], "true");
  const verHandled = await (async () => {
    const b = JSON.stringify(evt("candidate.email_verified", { id: "cand_1" }));
    return conn.handleWebhook(signWebhook(SECRET, b, nowSec()), b);
  })();
  if (!verHandled.ok) throw new Error(`expected ok, got: ${verHandled.reason}`);
  assert.equal(verHandled.contact.properties["florence_email_verified"], "true");
  ok("candidate.email_verified resolves candidate via `id` + maps the flag");

  console.log(`\nPASS — ${passed} checks`);
  process.exit(0);
} catch (e) {
  console.error("\nFAIL:", e);
  process.exit(1);
}
