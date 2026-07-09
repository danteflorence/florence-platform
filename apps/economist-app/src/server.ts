import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import {
  createEconomistProposal,
  getNashpDatasetMetadata,
  getNashpTrend,
  getFacility,
  getHealthSystem,
  listNashpTrendEntities,
  quoteEconomist,
  type EconomistProposalInput,
  type EconomistQuoteInput,
  type NashpTrendGroupBy,
} from "../../../packages/economist-api/src/index.ts";
import { emitEconomistCoreEvent, type CoreEventResult } from "./coreEvents.ts";

export interface StartEconomistServerOptions {
  port?: number;
  host?: string;
}

interface ServiceEnvelope<T> {
  data: T;
  coreEvent?: CoreEventResult;
}

export function createEconomistServer(): Server {
  return createServer(async (request, response) => {
    try {
      await routeRequest(request, response);
    } catch (error) {
      sendJson(response, 500, { error: error instanceof Error ? error.message : "Economist service failed" });
    }
  });
}

export function startEconomistServer(options: StartEconomistServerOptions = {}): Promise<Server> {
  const server = createEconomistServer();
  const port = options.port ?? Number(process.env.PORT ?? 8094);
  const host = options.host ?? process.env.HOST ?? "0.0.0.0";
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve(server);
    });
  });
}

async function routeRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const method = request.method ?? "GET";
  const url = new URL(request.url ?? "/", "http://economist.local");

  if (method === "OPTIONS") {
    sendNoContent(response);
    return;
  }

  if (method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, { ok: true, service: "workforce-economist-api" });
    return;
  }

  if (method === "GET" && url.pathname === "/v1/economist/hospital-spend/metadata") {
    sendJson(response, 200, { data: getNashpDatasetMetadata() });
    return;
  }

  if (method === "GET" && url.pathname === "/v1/economist/hospital-spend/entities") {
    const entities = listNashpTrendEntities({
      groupBy: trendGroupQuery(url.searchParams.get("groupBy")),
      metric: url.searchParams.get("metric") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      limit: numberQuery(url.searchParams.get("limit")),
    });
    sendJson(response, 200, { data: entities });
    return;
  }

  if (method === "GET" && url.pathname === "/v1/economist/hospital-spend/trends") {
    const trend = getNashpTrend({
      groupBy: trendGroupQuery(url.searchParams.get("groupBy")),
      metric: url.searchParams.get("metric") ?? undefined,
      id: url.searchParams.get("id") ?? undefined,
      fromYear: numberQuery(url.searchParams.get("fromYear")),
      toYear: numberQuery(url.searchParams.get("toYear")),
    });
    sendJson(response, 200, { data: trend });
    return;
  }

  if (method === "POST" && url.pathname === "/v1/economist/quote") {
    const body = await readJson<EconomistQuoteInput>(request);
    const quote = quoteEconomist(body);
    const coreEvent = await emitEconomistCoreEvent({
      eventType: "economist.quote.created",
      subjectId: quote.id,
      quote,
    });
    sendJson<ServiceEnvelope<typeof quote>>(response, 201, { data: quote, coreEvent });
    return;
  }

  const facilityMatch = url.pathname.match(/^\/v1\/economist\/facility\/([^/]+)$/);
  if (method === "GET" && facilityMatch) {
    const facility = getFacility(decodeURIComponent(facilityMatch[1]));
    if (!facility) {
      sendJson(response, 404, { error: "facility-not-found" });
      return;
    }
    sendJson(response, 200, { data: facility });
    return;
  }

  const systemMatch = url.pathname.match(/^\/v1\/economist\/system\/([^/]+)$/);
  if (method === "GET" && systemMatch) {
    const system = getHealthSystem(decodeURIComponent(systemMatch[1]));
    if (!system) {
      sendJson(response, 404, { error: "system-not-found" });
      return;
    }
    sendJson(response, 200, { data: system });
    return;
  }

  if (method === "POST" && url.pathname === "/v1/economist/proposal") {
    const body = await readJson<EconomistProposalInput>(request);
    const proposal = createEconomistProposal(body);
    const coreEvent = await emitEconomistCoreEvent({
      eventType: "economist.proposal.created",
      subjectId: proposal.id,
      quote: proposal.quote,
      proposal,
    });
    sendJson<ServiceEnvelope<typeof proposal>>(response, 201, { data: proposal, coreEvent });
    return;
  }

  if (method === "POST" && url.pathname === "/price-job") {
    const body = await readJson<Record<string, unknown>>(request);
    const quote = quoteEconomist(legacyPriceJobInput(body));
    sendJson(response, 200, legacyPriceJobResponse(quote));
    return;
  }

  sendJson(response, 404, { error: "not-found" });
}

function legacyPriceJobInput(body: Record<string, unknown>): EconomistQuoteInput {
  const calibration = typeof body.calibration === "object" && body.calibration ? (body.calibration as Record<string, unknown>) : {};
  const channelShareRate =
    typeof calibration.amn_partner_markup_pct === "number" ? calibration.amn_partner_markup_pct : undefined;
  return {
    state: typeof body.state === "string" ? body.state : undefined,
    setting: body.setting === "clinic" || body.setting === "post_acute" ? body.setting : "hospital",
    specialty: typeof body.role === "string" ? body.role : undefined,
    rnCount: 1,
    channel: channelShareRate ? "channel" : "direct",
    channelShareRate,
  };
}

function legacyPriceJobResponse(quote: ReturnType<typeof quoteEconomist>) {
  return {
    lookup: {
      taxable_wage_per_hour: quote.staffCost.hourlyBaseWage,
      benefit_load_per_hour: quote.staffCost.hourlyBenefitsLoad,
      all_in_agency_per_hour: quote.agencyBaseline.allInAgencyHourly,
      agency_premium_per_hour: quote.agencyBaseline.agencyPremiumHourly,
      n: quote.agencyBaseline.sampleSize,
      basis: quote.agencyBaseline.basis,
      agency_rate_confidence: quote.agencyBaseline.confidence === "high" ? 0.92 : quote.agencyBaseline.confidence === "medium" ? 0.8 : 0.6,
    },
    pricing: {
      florence_monthly_fee_per_rn: quote.florenceFee.employerMonthlyFeePerRn,
      employer_fica_savings_per_rn_per_month: quote.customerOffset.payrollTaxOffsetMonthlyPerRn,
      fica_adjusted_effective_cost_per_rn_month: quote.customerSavings.customerEffectiveFeeMonthlyPerRn,
      net_monthly_savings_per_rn: quote.customerSavings.netMonthlySavingsVsAgencyPerRn,
      monthly_agency_premium_avoided_per_rn: quote.customerSavings.monthlyAgencyPremiumAvoidedPerRn,
      partner_revenue_monthly: quote.florenceFee.channelPartnerMonthlySharePerRn,
      channel: quote.florenceFee.channel,
      florence_net_monthly: quote.florenceFee.florenceMonthlyRevenuePerRn,
    },
  };
}

function trendGroupQuery(value: string | null): NashpTrendGroupBy | undefined {
  if (value === "hospital" || value === "health_system" || value === "msa" || value === "state") return value;
  return undefined;
}

function numberQuery(value: string | null): number | undefined {
  if (!value) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function readJson<T>(request: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        request.destroy();
        reject(new Error("Request body too large"));
      }
    });
    request.on("end", () => {
      if (!raw.trim()) {
        resolve({} as T);
        return;
      }
      try {
        resolve(JSON.parse(raw) as T);
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    request.on("error", reject);
  });
}

function sendJson<T>(response: ServerResponse, status: number, body: T): void {
  response.writeHead(status, {
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization,content-type,idempotency-key",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-origin": process.env.ECONOMIST_CORS_ORIGIN ?? "https://app.florenceedu.com",
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function sendNoContent(response: ServerResponse): void {
  response.writeHead(204, {
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization,content-type,idempotency-key",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-origin": process.env.ECONOMIST_CORS_ORIGIN ?? "https://app.florenceedu.com",
  });
  response.end();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = await startEconomistServer();
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : process.env.PORT ?? 8094;
  console.log(`Workforce Economist API listening on ${port}`);
}
