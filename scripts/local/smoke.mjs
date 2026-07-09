import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);

function readLocalEnv() {
  const path = resolve(root, ".env.local");
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }
  return env;
}

const env = { ...readLocalEnv(), ...process.env };
const url = (port, path = "") => `http://localhost:${port}${path}`;
const coreUrl = env.LOCAL_CORE_URL || url(env.CORE_API_PORT || 8080);
const academyUrl = env.LOCAL_ACADEMY_API_URL || url(env.ACADEMY_API_PORT || 18088);
const pathwayUrl = env.LOCAL_PATHWAY_API_URL || url(env.PATHWAY_API_PORT || 8787);
const employerUrl = env.LOCAL_EMPLOYER_CONNECT_API_URL || url(env.EMPLOYER_CONNECT_API_PORT || 8788);
const adminEmail = env.CORE_BOOTSTRAP_ADMIN_EMAIL || "local-admin@example.invalid";
const adminPassword = env.CORE_BOOTSTRAP_ADMIN_PASSWORD || "changeme";

let passed = 0;
let failed = 0;

async function check(label, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`ok - ${label}`);
  } catch (error) {
    failed += 1;
    console.error(`not ok - ${label}: ${error.message}`);
  }
}

async function requestJson(target, options = {}) {
  const response = await fetch(target, {
    ...options,
    headers: {
      accept: "application/json",
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { response, body };
}

async function waitJson(target, retries = 30) {
  let lastError;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const result = await requestJson(target);
      if (result.response.ok) return result;
      lastError = new Error(`HTTP ${result.response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
  }
  throw lastError ?? new Error("health check timed out");
}

await check("Core health", async () => {
  const { body } = await waitJson(`${coreUrl}/health`);
  if (body?.ok !== true) throw new Error("Core did not report healthy");
});

let token = "";
await check("User login", async () => {
  const { response, body } = await requestJson(`${coreUrl}/auth/password`, {
    method: "POST",
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  if (!response.ok || !body?.token) throw new Error(`login failed with HTTP ${response.status}`);
  token = body.token;
});

await check("Academy quote", async () => {
  const { response, body } = await requestJson(`${academyUrl}/v1/academy/pricing/quote`, {
    method: "POST",
    body: JSON.stringify({ sponsor: "avila", session_id: "anon_localdev1234" }),
  });
  if (!response.ok) throw new Error(`quote failed with HTTP ${response.status}`);
  if (body?.product_name !== "Florence Academy Global Live NCLEX Access") throw new Error("unexpected Academy quote");
});

await check("Apply CTA state URL", async () => {
  const { response, body } = await requestJson(`${academyUrl}/v1/academy/apply-cta?placement=academy_home&sponsor=avila&session_id=anon_localdev1234`);
  if (!response.ok) throw new Error(`apply CTA failed with HTTP ${response.status}`);
  const destination = new URL(body.destination_url);
  if (destination.origin !== "https://www.florenceedu.com") throw new Error("Apply CTA is not on florenceedu.com");
  for (const key of destination.searchParams.keys()) {
    if (!["source", "sponsor", "campaign", "session_id"].includes(key)) throw new Error(`unsafe Apply CTA parameter: ${key}`);
  }
});

await check("Pathway case creation", async () => {
  const { response, body } = await requestJson(`${pathwayUrl}/api/candidates`, {
    method: "POST",
    body: JSON.stringify({
      legalFirstName: "Smoke",
      legalLastName: "Pathway",
      dateOfBirth: "1991-02-03",
      citizenship: "Exampleland",
      nationality: "Exampleland",
      countryOfResidence: "Exampleland",
      email: `pathway-smoke-${Date.now()}@example.invalid`,
      phone: "+15550101011",
      visaTarget: "F-1",
      nclexState: "Texas",
      employmentState: "Texas",
    }),
  });
  if (!response.ok || !body?.id) throw new Error(`Pathway case create failed with HTTP ${response.status}`);
});

await check("Employer interest registration", async () => {
  const { response, body } = await requestJson(`${employerUrl}/api/public/jobs/local-demo-rn-job/interest`, {
    method: "POST",
    body: JSON.stringify({
      fullName: "Smoke Interest",
      email: `interest-smoke-${Date.now()}@example.invalid`,
      targetState: "TX",
      consentGranted: true,
    }),
  });
  if (!response.ok || body?.ok !== true) throw new Error(`Employer interest failed with HTTP ${response.status}`);
});

await check("Application Gate check", async () => {
  const { response, body } = await requestJson(`${coreUrl}/v1/application-gate/check`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({
      nurseId: "local-smoke-gate",
      action: "express_interest",
      employerId: "local-demo-employer",
      jobRequisitionId: "local-demo-rn-job",
      channel: "direct",
    }),
  });
  if (!response.ok || body?.gate?.status !== "interest_allowed") throw new Error(`Application Gate check failed with HTTP ${response.status}`);
});

await check("Production Ledger event read", async () => {
  const email = `ledger-smoke-${Date.now()}@example.invalid`;
  const write = await requestJson(`${coreUrl}/v1/events`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "Idempotency-Key": `local-smoke-${Date.now()}`,
    },
    body: JSON.stringify({
      event_type: "demand.tile_viewed",
      email,
      name: "Ledger Smoke",
      payload: { jobId: "local-demo-rn-job" },
    }),
  });
  if (!write.response.ok || !write.body?.nurseId) throw new Error(`ledger write failed with HTTP ${write.response.status}`);
  const read = await requestJson(`${coreUrl}/v1/ledger?nurseId=${encodeURIComponent(write.body.nurseId)}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!read.response.ok || !Array.isArray(read.body?.events)) throw new Error(`ledger read failed with HTTP ${read.response.status}`);
});

console.log(`\nLocal smoke: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
