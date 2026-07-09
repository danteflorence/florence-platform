import type { EconomistProposal, EconomistQuote } from "../../../packages/economist-api/src/index.ts";

export interface CoreEventResult {
  emitted: boolean;
  eventId?: string;
  reason?: string;
}

interface CoreEventInput {
  eventType: "economist.quote.created" | "economist.proposal.created";
  subjectId: string;
  quote: EconomistQuote;
  proposal?: EconomistProposal;
}

interface CoreTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
}

interface CoreEventResponse {
  eventId?: string;
  id?: string;
  error?: string;
}

export async function emitEconomistCoreEvent(input: CoreEventInput): Promise<CoreEventResult> {
  const coreBaseUrl = readCoreBaseUrl();
  const clientId = process.env.FLORENCE_CORE_CLIENT_ID ?? process.env.CORE_CLIENT_ID;
  const clientSecret = process.env.FLORENCE_CORE_CLIENT_SECRET ?? process.env.CORE_CLIENT_SECRET;
  const required = process.env.ECONOMIST_CORE_EVENTS_REQUIRED === "1" || process.env.NODE_ENV === "production";

  if (!coreBaseUrl || !clientId || !clientSecret) {
    if (required) throw new Error("Core event emission is required but Core credentials are not configured");
    return { emitted: false, reason: "core-not-configured" };
  }

  const token = await mintCoreToken({ coreBaseUrl, clientId, clientSecret });
  const payload = buildCoreEventPayload(input);
  const response = await fetch(`${coreBaseUrl}/v1/events`, {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "idempotency-key": `economist:${input.eventType}:${input.subjectId}`,
    },
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => ({}))) as CoreEventResponse;
  if (!response.ok) throw new Error(body.error ?? `Core event write failed ${response.status}`);
  return { emitted: true, eventId: body.eventId ?? body.id };
}

async function mintCoreToken({
  coreBaseUrl,
  clientId,
  clientSecret,
}: {
  coreBaseUrl: string;
  clientId: string;
  clientSecret: string;
}): Promise<string> {
  const response = await fetch(`${coreBaseUrl}/oauth/token`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "ledger:write",
    }),
  });
  const body = (await response.json().catch(() => ({}))) as CoreTokenResponse;
  if (!response.ok || !body.access_token) throw new Error(body.error ?? `Core token request failed ${response.status}`);
  return body.access_token;
}

function buildCoreEventPayload(input: CoreEventInput) {
  const proposalFields = input.proposal
    ? {
        proposalId: input.proposal.id,
        proposalStatus: input.proposal.status,
        proposalDurationMonths: input.proposal.durationMonths,
      }
    : {};

  return {
    event_type: input.eventType,
    ref: {
      app: "workforce-economist",
      externalId: input.subjectId,
    },
    source_system: "workforce_economist",
    payload: {
      quoteId: input.quote.id,
      facilityId: input.quote.facility.id,
      healthSystemId: input.quote.healthSystem.id,
      channel: input.quote.florenceFee.channel,
      rnCount: input.quote.input.rnCount,
      employerMonthlyFeeTotal: input.quote.florenceFee.employerMonthlyFeeTotal,
      florenceRevenueMonthlyTotal: input.quote.florenceFee.florenceMonthlyRevenueTotal,
      channelPartnerMonthlyShareTotal: input.quote.florenceFee.channelPartnerMonthlyShareTotal,
      customerOffset: {
        kind: input.quote.customerOffset.kind,
        treatment: input.quote.customerOffset.treatment,
        revenueTreatment: input.quote.customerOffset.revenueTreatment,
        payrollTaxOffsetMonthlyTotal: input.quote.customerOffset.payrollTaxOffsetMonthlyTotal,
      },
      customerSavings: {
        netMonthlySavingsVsAgencyTotal: input.quote.customerSavings.netMonthlySavingsVsAgencyTotal,
        customerOffsetExcludedFromFlorenceRevenue: input.quote.customerSavings.customerOffsetExcludedFromFlorenceRevenue,
      },
      priceBookVersion: input.quote.priceBookVersion,
      asOfDate: input.quote.asOfDate,
      ...proposalFields,
    },
  };
}

function readCoreBaseUrl(): string {
  return (process.env.FLORENCE_CORE_URL ?? process.env.CORE_API_URL ?? "").replace(/\/$/, "");
}
