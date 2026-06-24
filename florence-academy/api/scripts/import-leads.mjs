// ─────────────────────────────────────────────────────────────────────────
// Weekly lead importer: Florence core CSV export → Academy /v1/leads/import.
//
// USAGE
//   API_URL=http://localhost:8788 \
//   SEED_CLIENT_SECRET=overnight-demo-secret \
//   node api/scripts/import-leads.mjs ./path/to/users_leads_export.csv
//
// SAFETY
//   - Operator-only. Uses the demo M2M client (or whatever SEED_CLIENT_* env
//     points at) with scope `leads:write`.
//   - Reads the CSV with a real RFC-4180-ish parser (the export has quoted
//     commas inside fullnames like "Lovely Grace A.").
//   - Maps columns by header name, not by index - so adding columns upstream
//     won't silently misalign data.
//   - Lower-cases emails. Drops rows with no email.
//   - Sends in batches of 100. Idempotent on rerun.
//   - Source label is `csv:<YYYY-MM-DD>` so the event log knows where each
//     change came from.
//
// SCOPES THIS NEEDS (added to demo-crm by default):
//   leads:read leads:write
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE = (process.env.API_URL || "http://localhost:8088").replace(/\/$/, "");
const CLIENT_ID = process.env.SEED_CLIENT_ID || "demo-crm";
const CLIENT_SECRET = process.env.SEED_CLIENT_SECRET || "overnight-demo-secret";
const BATCH_SIZE = Number(process.env.LEAD_BATCH_SIZE || 100);

function todayLabel() {
  return new Date().toISOString().slice(0, 10);
}

function fail(msg, code = 1) {
  console.error(`import-leads: ${msg}`);
  process.exit(code);
}

// RFC-4180-ish parser. Handles quoted fields with embedded commas + escaped
// quotes ("" inside a quoted field). NOT a general CSV - but it handles the
// Florence export shape, including ragged rows.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQ = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\r") {
        // ignore - handled with \n
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function normalize(v) {
  if (v == null) return undefined;
  const s = String(v).trim();
  if (!s || s === "N/A" || s === "n/a") return s === "N/A" ? "N/A" : undefined;
  return s;
}

const NCLEX_ALLOWED = new Set([
  "Passed",
  "Not Passed",
  "Authorized",
  "Planned",
  "Not_planned",
]);
const APP_ALLOWED = new Set([
  "not_applied",
  "applied_not_accepted",
  "accepted",
  "draft",
]);
const EVAL_ALLOWED = new Set([
  "N/A",
  "has_copy",
  "never_received",
  "no_access",
]);
const TYPE_ALLOWED = new Set(["Imported Lead", "User", "Student Lead"]);

/** Coerce a parsed row into a clean lead payload. Drops out-of-vocab values
 *  (the export occasionally has phone numbers in evaluation_status from
 *  broken-quote upstream rows - those get dropped, not propagated). */
function rowToLead(row, headers) {
  const get = (name) => normalize(row[headers.indexOf(name)]);
  const email = (get("email") ?? "").toLowerCase();
  if (!email || !email.includes("@")) return null;
  const nclex = get("nclexstatus");
  const app = get("application_status");
  const evalStatus = get("evaluation_status");
  const type = get("type");
  const sa = get("signup");
  // The signup column is "YYYY-MM-DD HH:MM:SS" - convert to ISO.
  const signup_at = sa && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(sa)
    ? sa.replace(" ", "T") + "Z"
    : undefined;

  const payload = { email };
  if (get("firstname")) payload.firstname = get("firstname");
  if (get("lastname")) payload.lastname = get("lastname");
  if (get("fullname")) payload.fullname = get("fullname");
  if (get("citizenship")) payload.country = get("citizenship");
  if (get("phone")) payload.phone = get("phone");
  if (get("job_unit")) payload.job_unit = get("job_unit");
  if (get("assigned")) payload.assigned = get("assigned");
  if (type && TYPE_ALLOWED.has(type)) payload.type = type;
  if (nclex && NCLEX_ALLOWED.has(nclex)) payload.nclex_status = nclex;
  if (app && APP_ALLOWED.has(app)) payload.application_status = app;
  if (evalStatus && EVAL_ALLOWED.has(evalStatus)) payload.evaluation_status = evalStatus;
  const vs = get("video_screen");
  if (vs === "Yes") payload.video_screen = true;
  else if (vs === "No") payload.video_screen = false;
  if (signup_at) payload.signup_at = signup_at;
  return payload;
}

async function getToken() {
  const res = await fetch(`${BASE}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: "leads:read leads:write",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    fail(`token request failed (${res.status}): ${body}`);
  }
  const j = await res.json();
  if (!j.access_token) fail("token response missing access_token");
  return j.access_token;
}

async function postBatch(token, source, leads, attempt = 0) {
  const res = await fetch(`${BASE}/v1/leads/import`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ source, leads }),
  });
  if (res.status === 429 && attempt < 6) {
    // Exponential backoff with jitter - handles the token-bucket refill.
    const delay = Math.min(15000, 500 * Math.pow(2, attempt)) + Math.floor(Math.random() * 400);
    await new Promise((r) => setTimeout(r, delay));
    return postBatch(token, source, leads, attempt + 1);
  }
  const j = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      `import batch failed (${res.status}): ${j ? JSON.stringify(j) : "no body"}`,
    );
  }
  return j;
}

async function main() {
  const path = process.argv[2];
  if (!path) fail("usage: node import-leads.mjs <csv-path>");
  const abs = resolve(process.cwd(), path);
  const text = readFileSync(abs, "utf8");
  const rows = parseCsv(text);
  if (rows.length < 2) fail("CSV looks empty");
  const headers = rows[0].map((h) => h.trim());
  const required = ["email"];
  for (const r of required) {
    if (!headers.includes(r)) fail(`missing required column: ${r}`);
  }
  console.log(
    `parsed ${rows.length - 1} rows, ${headers.length} columns from ${abs}`,
  );

  const leads = [];
  let skipped = 0;
  for (let i = 1; i < rows.length; i++) {
    const lead = rowToLead(rows[i], headers);
    if (!lead) {
      skipped++;
      continue;
    }
    leads.push(lead);
  }
  console.log(`prepared ${leads.length} valid leads (${skipped} skipped - no email)`);

  const token = await getToken();
  const source = `csv:${todayLabel()}`;
  const totals = { created: 0, updated: 0, unchanged: 0, errors: 0 };
  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    const batch = leads.slice(i, i + BATCH_SIZE);
    const res = await postBatch(token, source, batch);
    totals.created += res.created ?? 0;
    totals.updated += res.updated ?? 0;
    totals.unchanged += res.unchanged ?? 0;
    totals.errors += (res.errors ?? []).length;
    const pct = Math.round(((i + batch.length) / leads.length) * 100);
    process.stdout.write(
      `\r  imported ${i + batch.length}/${leads.length} (${pct}%)`,
    );
    if (res.errors && res.errors.length > 0) {
      const first = res.errors[0];
      console.error(
        `\n  ! batch had ${res.errors.length} errors. first: row=${first.index} email=${first.email ?? "?"} message=${first.message}`,
      );
    }
  }
  console.log("\n=== summary ===");
  console.log(`source       : ${source}`);
  console.log(`total rows   : ${leads.length}`);
  console.log(`new leads    : ${totals.created}`);
  console.log(`updated      : ${totals.updated}`);
  console.log(`unchanged    : ${totals.unchanged}`);
  console.log(`errors       : ${totals.errors}`);
}

main().catch((e) => fail(e.stack || e.message));
