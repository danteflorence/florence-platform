import { createHash } from "node:crypto";

export {
  getNashpDatasetMetadata,
  getNashpTrend,
  listNashpTrendEntities,
  type NashpDatasetMetadata,
  type NashpEntityListOptions,
  type NashpMetricAggregation,
  type NashpMetricDefinition,
  type NashpMetricFormat,
  type NashpTrend,
  type NashpTrendEntity,
  type NashpTrendGroupBy,
  type NashpTrendOptions,
  type NashpTrendPoint,
} from "./nashp.ts";

export type EconomistChannel = "direct" | "channel";

export interface HealthSystem {
  id: string;
  name: string;
  market: string;
  defaultChannelShareRate: number;
  defaultMonthlyEmployerFeePerRn: number;
}

export interface Facility {
  id: string;
  healthSystemId: string;
  name: string;
  city: string;
  state: string;
  setting: "hospital" | "post_acute" | "clinic";
  defaultSpecialty: string;
  beds: number;
  monthlyEmployerFeePerRn: number;
  channelShareRate: number;
  staffCost: Omit<StaffCost, "monthlyLoadedCostPerRn" | "monthlyLoadedCostTotal">;
  agencyBaseline: Omit<AgencyBaseline, "monthlyAgencyCostPerRn" | "monthlyAgencyCostTotal" | "agencyPremiumHourly">;
}

export interface AgencyBaseline {
  allInAgencyHourly: number;
  agencyPremiumHourly: number;
  monthlyAgencyCostPerRn: number;
  monthlyAgencyCostTotal: number;
  sampleSize: number;
  confidence: "low" | "medium" | "high";
  basis: "facility" | "system" | "state";
}

export interface StaffCost {
  hourlyBaseWage: number;
  hourlyBenefitsLoad: number;
  monthlyLoadedCostPerRn: number;
  monthlyLoadedCostTotal: number;
}

export interface FlorenceFee {
  channel: EconomistChannel;
  employerMonthlyFeePerRn: number;
  employerMonthlyFeeTotal: number;
  channelPartnerMonthlySharePerRn: number;
  channelPartnerMonthlyShareTotal: number;
  florenceMonthlyRevenuePerRn: number;
  florenceMonthlyRevenueTotal: number;
  revenueRecognitionNote: string;
}

export interface CustomerOffset {
  kind: "payroll-tax";
  ficaRate: number;
  payrollTaxOffsetMonthlyPerRn: number;
  payrollTaxOffsetMonthlyTotal: number;
  treatment: "customer-side-only";
  revenueTreatment: "excluded-from-florence-revenue";
}

export interface CustomerSavings {
  agencyBaselineCostMonthlyPerRn: number;
  customerEffectiveFeeMonthlyPerRn: number;
  customerEffectiveLaborCostMonthlyPerRn: number;
  customerEffectiveLaborCostMonthlyTotal: number;
  monthlyAgencyPremiumAvoidedPerRn: number;
  netMonthlySavingsVsAgencyPerRn: number;
  netMonthlySavingsVsAgencyTotal: number;
  customerOffsetExcludedFromFlorenceRevenue: true;
}

export interface EconomistQuoteInput {
  facilityId?: string;
  systemId?: string;
  state?: string;
  setting?: Facility["setting"];
  specialty?: string;
  rnCount?: number;
  channel?: EconomistChannel;
  channelShareRate?: number;
  monthlyEmployerFeePerRn?: number;
  asOfDate?: string;
}

export interface EconomistQuote {
  id: string;
  priceBookVersion: string;
  asOfDate: string;
  input: Required<Pick<EconomistQuoteInput, "rnCount" | "channel" | "specialty">> &
    Pick<EconomistQuoteInput, "facilityId" | "systemId" | "state" | "setting">;
  facility: Facility;
  healthSystem: HealthSystem;
  agencyBaseline: AgencyBaseline;
  staffCost: StaffCost;
  florenceFee: FlorenceFee;
  customerOffset: CustomerOffset;
  customerSavings: CustomerSavings;
  guardrails: string[];
}

export interface EconomistProposalInput {
  quoteInput: EconomistQuoteInput;
  title?: string;
  durationMonths?: number;
}

export interface EconomistProposal {
  id: string;
  status: "draft";
  title: string;
  durationMonths: number;
  quote: EconomistQuote;
  summary: string;
  lineItems: { label: string; amountMonthly: number; audience: "customer" | "florence" | "partner" }[];
  requiredReviews: string[];
  coreReference: {
    quoteEventType: "economist.quote.created";
    proposalEventType: "economist.proposal.created";
  };
}

export const PRICE_BOOK_VERSION = "workforce-economist-2026-06";
export const PRICE_BOOK_EFFECTIVE_DATE = "2026-06-25T00:00:00.000Z";
export const MONTHLY_FULL_TIME_HOURS = 173.33;
export const FICA_RATE = 0.0765;

export const healthSystems: HealthSystem[] = [
  {
    id: "tenet-style",
    name: "Tenet-style multi-facility system",
    market: "Texas Gulf Coast",
    defaultChannelShareRate: 0.18,
    defaultMonthlyEmployerFeePerRn: 1850,
  },
  {
    id: "kaiser-style",
    name: "Kaiser-style integrated health system",
    market: "Northern California",
    defaultChannelShareRate: 0.16,
    defaultMonthlyEmployerFeePerRn: 2100,
  },
];

export const facilities: Facility[] = [
  {
    id: "tenet-gulf-coast-med-surg",
    healthSystemId: "tenet-style",
    name: "Tenet-style Gulf Coast Medical Center",
    city: "Houston",
    state: "TX",
    setting: "hospital",
    defaultSpecialty: "med_surg",
    beds: 420,
    monthlyEmployerFeePerRn: 1850,
    channelShareRate: 0.18,
    staffCost: {
      hourlyBaseWage: 43.2,
      hourlyBenefitsLoad: 12.1,
    },
    agencyBaseline: {
      allInAgencyHourly: 79.5,
      sampleSize: 44,
      confidence: "high",
      basis: "facility",
    },
  },
  {
    id: "kaiser-norcal-telemetry",
    healthSystemId: "kaiser-style",
    name: "Kaiser-style Northern California Medical Center",
    city: "Oakland",
    state: "CA",
    setting: "hospital",
    defaultSpecialty: "telemetry",
    beds: 560,
    monthlyEmployerFeePerRn: 2100,
    channelShareRate: 0.16,
    staffCost: {
      hourlyBaseWage: 58.4,
      hourlyBenefitsLoad: 17.7,
    },
    agencyBaseline: {
      allInAgencyHourly: 104.25,
      sampleSize: 61,
      confidence: "high",
      basis: "facility",
    },
  },
];

const DEFAULT_FACILITY_ID = facilities[0].id;

export function listFacilities(): Facility[] {
  return facilities.map(copyFacility);
}

export function listHealthSystems(): HealthSystem[] {
  return healthSystems.map((system) => ({ ...system }));
}

export function getFacility(id: string): Facility | undefined {
  const facility = facilities.find((candidate) => candidate.id === id);
  return facility ? copyFacility(facility) : undefined;
}

export function getHealthSystem(id: string): HealthSystem | undefined {
  const system = healthSystems.find((candidate) => candidate.id === id);
  return system ? { ...system } : undefined;
}

export function quoteEconomist(input: EconomistQuoteInput = {}): EconomistQuote {
  const facility = resolveFacility(input);
  const healthSystem = getHealthSystem(facility.healthSystemId);
  if (!healthSystem) throw new Error(`Unknown health system: ${facility.healthSystemId}`);

  const rnCount = normalizeRnCount(input.rnCount);
  const channel = input.channel ?? "direct";
  const specialty = input.specialty ?? facility.defaultSpecialty;
  const asOfDate = normalizeAsOfDate(input.asOfDate);
  const staffCost = buildStaffCost(facility, rnCount);
  const agencyBaseline = buildAgencyBaseline(facility, staffCost, rnCount);
  const florenceFee = buildFlorenceFee({ input, facility, healthSystem, rnCount, channel });
  const customerOffset = buildCustomerOffset(staffCost, rnCount);
  const customerSavings = buildCustomerSavings({
    agencyBaseline,
    staffCost,
    florenceFee,
    customerOffset,
    rnCount,
  });
  const stableInput = {
    facilityId: facility.id,
    systemId: healthSystem.id,
    rnCount,
    channel,
    specialty,
    monthlyEmployerFeePerRn: florenceFee.employerMonthlyFeePerRn,
    channelShareRate: channel === "channel" ? safeRate(input.channelShareRate ?? facility.channelShareRate) : 0,
    asOfDate,
  };

  return {
    id: `quote_${stableHash(stableInput)}`,
    priceBookVersion: PRICE_BOOK_VERSION,
    asOfDate,
    input: {
      facilityId: facility.id,
      systemId: healthSystem.id,
      state: facility.state,
      setting: facility.setting,
      rnCount,
      channel,
      specialty,
    },
    facility,
    healthSystem,
    agencyBaseline,
    staffCost,
    florenceFee,
    customerOffset,
    customerSavings,
    guardrails: [
      "Payroll-tax offset is a customer-side effective-cost reduction only.",
      "Florence revenue equals employer monthly fee minus any channel partner share.",
      "Proposal output is a draft and requires human review before customer use.",
      "Quote payloads use synthetic facility benchmarks and contain no candidate PII.",
    ],
  };
}

export function createEconomistProposal(input: EconomistProposalInput): EconomistProposal {
  const quote = quoteEconomist(input.quoteInput);
  const durationMonths = Math.max(1, Math.min(36, Math.trunc(input.durationMonths ?? 12)));
  const title = input.title?.trim() || `${quote.facility.name} RN workforce proposal`;
  const summary = `${quote.input.rnCount} RN seats at ${quote.facility.name} with customer-side payroll-tax offset excluded from Florence revenue.`;
  const lineItems = [
    {
      label: "Employer monthly Florence fee",
      amountMonthly: quote.florenceFee.employerMonthlyFeeTotal,
      audience: "customer" as const,
    },
    {
      label: "Florence monthly recognized revenue",
      amountMonthly: quote.florenceFee.florenceMonthlyRevenueTotal,
      audience: "florence" as const,
    },
    {
      label: "Channel partner monthly share",
      amountMonthly: quote.florenceFee.channelPartnerMonthlyShareTotal,
      audience: "partner" as const,
    },
    {
      label: "Customer payroll-tax offset",
      amountMonthly: quote.customerOffset.payrollTaxOffsetMonthlyTotal,
      audience: "customer" as const,
    },
    {
      label: "Net customer savings vs agency baseline",
      amountMonthly: quote.customerSavings.netMonthlySavingsVsAgencyTotal,
      audience: "customer" as const,
    },
  ];

  return {
    id: `proposal_${stableHash({ quoteId: quote.id, title, durationMonths })}`,
    status: "draft",
    title,
    durationMonths,
    quote,
    summary,
    lineItems,
    requiredReviews: ["Florence operator review", "Customer assumptions review", "Core ledger event verification"],
    coreReference: {
      quoteEventType: "economist.quote.created",
      proposalEventType: "economist.proposal.created",
    },
  };
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function resolveFacility(input: EconomistQuoteInput): Facility {
  if (input.facilityId) {
    const facility = getFacility(input.facilityId);
    if (!facility) throw new Error(`Unknown facility: ${input.facilityId}`);
    return facility;
  }
  if (input.systemId) {
    const systemFacility = facilities.find((facility) => facility.healthSystemId === input.systemId);
    if (!systemFacility) throw new Error(`Unknown health system: ${input.systemId}`);
    return copyFacility(systemFacility);
  }
  const matched = facilities.find((facility) => {
    const stateMatch = input.state ? facility.state.toLowerCase() === input.state.toLowerCase() : true;
    const settingMatch = input.setting ? facility.setting === input.setting : true;
    return stateMatch && settingMatch;
  });
  return copyFacility(matched ?? facilities.find((facility) => facility.id === DEFAULT_FACILITY_ID) ?? facilities[0]);
}

function buildStaffCost(facility: Facility, rnCount: number): StaffCost {
  const hourlyLoaded = facility.staffCost.hourlyBaseWage + facility.staffCost.hourlyBenefitsLoad;
  const monthlyLoadedCostPerRn = roundCurrency(hourlyLoaded * MONTHLY_FULL_TIME_HOURS);
  return {
    ...facility.staffCost,
    monthlyLoadedCostPerRn,
    monthlyLoadedCostTotal: roundCurrency(monthlyLoadedCostPerRn * rnCount),
  };
}

function buildAgencyBaseline(facility: Facility, staffCost: StaffCost, rnCount: number): AgencyBaseline {
  const monthlyAgencyCostPerRn = roundCurrency(facility.agencyBaseline.allInAgencyHourly * MONTHLY_FULL_TIME_HOURS);
  return {
    ...facility.agencyBaseline,
    agencyPremiumHourly: roundCurrency(facility.agencyBaseline.allInAgencyHourly - staffCost.hourlyBaseWage),
    monthlyAgencyCostPerRn,
    monthlyAgencyCostTotal: roundCurrency(monthlyAgencyCostPerRn * rnCount),
  };
}

function buildFlorenceFee({
  input,
  facility,
  healthSystem,
  rnCount,
  channel,
}: {
  input: EconomistQuoteInput;
  facility: Facility;
  healthSystem: HealthSystem;
  rnCount: number;
  channel: EconomistChannel;
}): FlorenceFee {
  const employerMonthlyFeePerRn = roundCurrency(
    input.monthlyEmployerFeePerRn ?? facility.monthlyEmployerFeePerRn ?? healthSystem.defaultMonthlyEmployerFeePerRn,
  );
  const shareRate = channel === "channel" ? safeRate(input.channelShareRate ?? facility.channelShareRate ?? healthSystem.defaultChannelShareRate) : 0;
  const channelPartnerMonthlySharePerRn = roundCurrency(employerMonthlyFeePerRn * shareRate);
  const florenceMonthlyRevenuePerRn = roundCurrency(employerMonthlyFeePerRn - channelPartnerMonthlySharePerRn);
  return {
    channel,
    employerMonthlyFeePerRn,
    employerMonthlyFeeTotal: roundCurrency(employerMonthlyFeePerRn * rnCount),
    channelPartnerMonthlySharePerRn,
    channelPartnerMonthlyShareTotal: roundCurrency(channelPartnerMonthlySharePerRn * rnCount),
    florenceMonthlyRevenuePerRn,
    florenceMonthlyRevenueTotal: roundCurrency(florenceMonthlyRevenuePerRn * rnCount),
    revenueRecognitionNote: "Customer offsets are excluded from Florence revenue.",
  };
}

function buildCustomerOffset(staffCost: StaffCost, rnCount: number): CustomerOffset {
  const monthlyBaseWagesPerRn = staffCost.hourlyBaseWage * MONTHLY_FULL_TIME_HOURS;
  const payrollTaxOffsetMonthlyPerRn = roundCurrency(monthlyBaseWagesPerRn * FICA_RATE);
  return {
    kind: "payroll-tax",
    ficaRate: FICA_RATE,
    payrollTaxOffsetMonthlyPerRn,
    payrollTaxOffsetMonthlyTotal: roundCurrency(payrollTaxOffsetMonthlyPerRn * rnCount),
    treatment: "customer-side-only",
    revenueTreatment: "excluded-from-florence-revenue",
  };
}

function buildCustomerSavings({
  agencyBaseline,
  staffCost,
  florenceFee,
  customerOffset,
  rnCount,
}: {
  agencyBaseline: AgencyBaseline;
  staffCost: StaffCost;
  florenceFee: FlorenceFee;
  customerOffset: CustomerOffset;
  rnCount: number;
}): CustomerSavings {
  const customerEffectiveFeeMonthlyPerRn = roundCurrency(
    florenceFee.employerMonthlyFeePerRn - customerOffset.payrollTaxOffsetMonthlyPerRn,
  );
  const customerEffectiveLaborCostMonthlyPerRn = roundCurrency(
    staffCost.monthlyLoadedCostPerRn + florenceFee.employerMonthlyFeePerRn - customerOffset.payrollTaxOffsetMonthlyPerRn,
  );
  const monthlyAgencyPremiumAvoidedPerRn = roundCurrency(agencyBaseline.monthlyAgencyCostPerRn - staffCost.monthlyLoadedCostPerRn);
  const netMonthlySavingsVsAgencyPerRn = roundCurrency(agencyBaseline.monthlyAgencyCostPerRn - customerEffectiveLaborCostMonthlyPerRn);
  return {
    agencyBaselineCostMonthlyPerRn: agencyBaseline.monthlyAgencyCostPerRn,
    customerEffectiveFeeMonthlyPerRn,
    customerEffectiveLaborCostMonthlyPerRn,
    customerEffectiveLaborCostMonthlyTotal: roundCurrency(customerEffectiveLaborCostMonthlyPerRn * rnCount),
    monthlyAgencyPremiumAvoidedPerRn,
    netMonthlySavingsVsAgencyPerRn,
    netMonthlySavingsVsAgencyTotal: roundCurrency(netMonthlySavingsVsAgencyPerRn * rnCount),
    customerOffsetExcludedFromFlorenceRevenue: true,
  };
}

function normalizeRnCount(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(500, Math.trunc(value)));
}

function normalizeAsOfDate(value: string | undefined): string {
  if (!value) return PRICE_BOOK_EFFECTIVE_DATE;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return PRICE_BOOK_EFFECTIVE_DATE;
  return date.toISOString();
}

function safeRate(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(0.5, value));
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, 16);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function copyFacility(facility: Facility): Facility {
  return {
    ...facility,
    staffCost: { ...facility.staffCost },
    agencyBaseline: { ...facility.agencyBaseline },
  };
}
