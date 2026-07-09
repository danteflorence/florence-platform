import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { quoteEconomist } from "../../../packages/economist-api/src/index.ts";
import { startEconomistServer } from "../src/server.ts";

const capturedEvents: unknown[] = [];
const core = createServer(async (request, response) => {
  if (request.method === "POST" && request.url === "/oauth/token") {
    sendJson(response, 200, { access_token: "synthetic-core-token", token_type: "Bearer", expires_in: 300 });
    return;
  }
  if (request.method === "POST" && request.url === "/v1/events") {
    assert.equal(request.headers.authorization, "Bearer synthetic-core-token");
    const body = await readJson(request);
    capturedEvents.push(body);
    sendJson(response, 201, { eventId: `evt_${capturedEvents.length}` });
    return;
  }
  sendJson(response, 404, { error: "not-found" });
});

await listen(core);
const coreAddress = core.address() as AddressInfo;
process.env.FLORENCE_CORE_URL = `http://127.0.0.1:${coreAddress.port}`;
process.env.FLORENCE_CORE_CLIENT_ID = "economist-smoke";
process.env.FLORENCE_CORE_CLIENT_SECRET = "synthetic-secret";

const economist = await startEconomistServer({ port: 0, host: "127.0.0.1" });
const economistAddress = economist.address() as AddressInfo;
const baseUrl = `http://127.0.0.1:${economistAddress.port}`;

try {
  const facility = await getJson(`${baseUrl}/v1/economist/facility/tenet-gulf-coast-med-surg`);
  assert.equal(facility.data.id, "tenet-gulf-coast-med-surg");

  const system = await getJson(`${baseUrl}/v1/economist/system/kaiser-style`);
  assert.equal(system.data.id, "kaiser-style");

  const nashpMetadata = await getJson(`${baseUrl}/v1/economist/hospital-spend/metadata`);
  assert.equal(nashpMetadata.data.source.name, "NASHP Hospital Cost Tool");
  assert.equal(nashpMetadata.data.source.maxYear, 2024);
  assert.ok(nashpMetadata.data.metrics.some((metric: { slug?: string }) => metric.slug === "hospital_operating_costs"));

  const nashpEntities = await getJson(
    `${baseUrl}/v1/economist/hospital-spend/entities?groupBy=health_system&metric=hospital_operating_costs&limit=5`,
  );
  assert.ok(nashpEntities.data.length > 0);
  const trendEntityId = encodeURIComponent(nashpEntities.data[0].id);
  const nashpTrend = await getJson(
    `${baseUrl}/v1/economist/hospital-spend/trends?groupBy=health_system&id=${trendEntityId}&metric=hospital_operating_costs&fromYear=2020&toYear=2024`,
  );
  assert.equal(nashpTrend.data.series.length, 5);
  assert.ok(nashpTrend.data.series.some((point: { value?: number | null }) => point.value !== null));
  assert.equal(nashpTrend.data.source.maxYear, 2024);

  const quoteResponse = await postJson(`${baseUrl}/v1/economist/quote`, {
    facilityId: "tenet-gulf-coast-med-surg",
    rnCount: 6,
    channel: "channel",
    channelShareRate: 0.2,
  });
  assert.equal(quoteResponse.coreEvent.emitted, true);
  assert.equal(quoteResponse.data.customerOffset.treatment, "customer-side-only");
  assert.ok(quoteResponse.data.florenceFee.channelPartnerMonthlyShareTotal > 0);
  assert.equal(
    quoteResponse.data.florenceFee.employerMonthlyFeeTotal,
    quoteResponse.data.florenceFee.florenceMonthlyRevenueTotal + quoteResponse.data.florenceFee.channelPartnerMonthlyShareTotal,
  );

  const proposalResponse = await postJson(`${baseUrl}/v1/economist/proposal`, {
    quoteInput: { facilityId: "kaiser-norcal-telemetry", rnCount: 5, channel: "direct" },
    durationMonths: 12,
  });
  assert.equal(proposalResponse.data.status, "draft");
  assert.equal(proposalResponse.coreEvent.emitted, true);

  const legacyResponse = await postJson(`${baseUrl}/price-job`, { state: "TX", setting: "hospital", role: "RN" });
  assert.equal(legacyResponse.pricing.florence_net_monthly, legacyResponse.pricing.florence_monthly_fee_per_rn);

  assert.equal(capturedEvents.length, 2);
  const quoteEvent = capturedEvents[0] as { event_type?: string; payload?: Record<string, unknown> };
  assert.equal(quoteEvent.event_type, "economist.quote.created");
  assert.equal((quoteEvent.payload?.customerOffset as { treatment?: string }).treatment, "customer-side-only");
  assert.equal(
    (quoteEvent.payload?.customerSavings as { customerOffsetExcludedFromFlorenceRevenue?: boolean })
      .customerOffsetExcludedFromFlorenceRevenue,
    true,
  );
  assert.equal(quoteEvent.payload?.florenceRevenueMonthlyTotal, quoteResponse.data.florenceFee.florenceMonthlyRevenueTotal);

  const deterministicA = quoteEconomist({ facilityId: "tenet-gulf-coast-med-surg", rnCount: 2 });
  const deterministicB = quoteEconomist({ rnCount: 2, facilityId: "tenet-gulf-coast-med-surg" });
  assert.deepEqual(deterministicA, deterministicB);

  console.log("Economist app smoke passed.");
} finally {
  await close(economist);
  await close(core);
}

function listen(server: ReturnType<typeof createServer>): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
}

function close(server: ReturnType<typeof createServer>): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function getJson(url: string): Promise<any> {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  const body = await response.json();
  assert.ok(response.ok, JSON.stringify(body));
  return body;
}

async function postJson(url: string, body: unknown): Promise<any> {
  const response = await fetch(url, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  assert.ok(response.ok, JSON.stringify(payload));
  return payload;
}

function readJson(request: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      raw += chunk;
    });
    request.on("end", () => resolve(raw ? JSON.parse(raw) : {}));
    request.on("error", reject);
  });
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}
