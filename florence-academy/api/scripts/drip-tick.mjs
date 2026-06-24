// ─────────────────────────────────────────────────────────────────────────
// Drip tick - what the external cron calls (hourly is a good default).
//
// USAGE
//   API_URL=https://api.academy.florenceeducation.com \
//   DRIP_TICK_SECRET=… \
//   node api/scripts/drip-tick.mjs [cap]
//
// SAFETY
//   - The endpoint is guarded by DRIP_TICK_SECRET (the API returns 503 if the
//     secret is unset, 401 on mismatch). The secret never leaves this call.
//   - `cap` (optional) overrides DRIP_SEND_CAP_PER_TICK for this run - useful
//     for a small warm-up batch before widening.
//   - Against the Mock email provider (no EMAIL_RELAY_URL) this is fully safe:
//     nothing actually mails, the API just logs + advances lifecycle state.
// ─────────────────────────────────────────────────────────────────────────

const BASE = (process.env.API_URL || "http://localhost:8088").replace(/\/$/, "");
const SECRET = process.env.DRIP_TICK_SECRET || "";
const cap = process.argv[2] ? Number(process.argv[2]) : undefined;

if (!SECRET) {
  console.error("drip-tick: DRIP_TICK_SECRET is required");
  process.exit(1);
}

const res = await fetch(`${BASE}/v1/drip/tick`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-drip-secret": SECRET },
  body: JSON.stringify(cap != null ? { cap } : {}),
});
const body = await res.json().catch(() => null);
if (!res.ok) {
  console.error(`drip-tick: failed (${res.status})`, body ? JSON.stringify(body) : "");
  process.exit(1);
}
console.log("drip-tick:", JSON.stringify(body));
