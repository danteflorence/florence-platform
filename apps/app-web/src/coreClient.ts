export const coreBaseUrl = (import.meta.env.VITE_CORE_URL ?? "https://auth.florenceedu.com").replace(/\/$/, "");
export const applyUrl = import.meta.env.VITE_APPLY_URL ?? "https://www.florenceedu.com/apply";
export const academyApiUrl = (import.meta.env.VITE_ACADEMY_API_URL ?? "https://api.florenceedu.com").replace(/\/$/, "");
export const pathwayApiUrl = (import.meta.env.VITE_PATHWAY_API_URL ?? "/pathway-api").replace(/\/$/, "");
export const employerConnectApiUrl = (import.meta.env.VITE_EMPLOYER_CONNECT_API_URL ?? "/employer-api").replace(/\/$/, "");
export const economistApiUrl = (import.meta.env.VITE_ECONOMIST_API_URL ?? "/economist-api").replace(/\/$/, "");
export const liveUrl = (import.meta.env.VITE_LIVE_URL ?? "https://app.florenceedu.com").replace(/\/$/, "");
export const demoNurseId = import.meta.env.VITE_DEMO_NURSE_ID ?? "demo-nurse-001";

export interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
}

export interface SessionState {
  authenticated: boolean;
  user?: SessionUser;
  role?: string | null;
  roles?: string[];
  org_id?: string | null;
  cand?: string | null;
  scope?: string;
}

export interface PassportDocumentMap {
  [documentType: string]: boolean;
}

export interface PassportSummary {
  nurseId?: string;
  name?: string;
  readiness?: {
    band?: string;
    passProbability?: number;
    lastAssessedAt?: string;
  };
  nclex?: {
    status?: string;
    updatedAt?: string;
  };
  licensure?: {
    status?: string;
    state?: string;
    updatedAt?: string;
  };
  documents?: PassportDocumentMap;
  consents?: Record<string, string>;
  placement?: {
    stage?: string;
    employer?: string;
    startDate?: string;
  };
  funnelStage?: string;
  funnelRank?: number;
  eventCount?: number;
}

export interface PassportResponse {
  view?: string;
  passport?: PassportSummary;
  withheld?: { field: string; reason: string }[];
  error?: string;
  detail?: string;
  reason?: string;
}

export interface LedgerEvent {
  type: string;
  at?: string;
}

export interface LedgerResponse {
  nurseId?: string;
  currentStage?: string;
  funnelStage?: string;
  events?: LedgerEvent[];
  error?: string;
  detail?: string;
  reason?: string;
}

export interface PathwayCandidateSummary {
  id: string;
  name?: string;
  nationality?: string;
  visaTarget?: string;
  nclexState?: string;
  workflowCount: number;
  blockedCount: number;
  escalations: number;
}

export interface EmployerDemandSummary {
  openRequisitions: number;
  totalOpenings: number;
  submittedApplications: number;
  byState: Record<string, { reqs: number; openings: number }>;
  bySpecialty: Record<string, { reqs: number; openings: number }>;
}

export interface EmployerLedgerSummary {
  funnel: { stage: string; candidates: number }[];
  forecast: {
    note?: string;
    expectedStartsByMonth: { month: string; scheduled: number; started: number }[];
  };
}

export interface EmployerRequisitionSummary {
  id: string;
  title: string;
  state?: string;
  city?: string;
  specialty?: string;
  status?: string;
  requiredLicenseState?: string;
  openings?: number;
  atsProvider?: string;
}

export type EconomistChannel = "direct" | "channel";

export interface EconomistFacility {
  id: string;
  healthSystemId: string;
  name: string;
  city: string;
  state: string;
  setting: string;
  defaultSpecialty: string;
  beds: number;
  monthlyEmployerFeePerRn: number;
  channelShareRate: number;
}

export interface EconomistQuoteRequest {
  facilityId?: string;
  systemId?: string;
  rnCount?: number;
  specialty?: string;
  channel?: EconomistChannel;
  channelShareRate?: number;
  monthlyEmployerFeePerRn?: number;
}

export interface EconomistQuote {
  id: string;
  priceBookVersion: string;
  asOfDate: string;
  facility: EconomistFacility;
  healthSystem: {
    id: string;
    name: string;
    market: string;
  };
  input: {
    rnCount: number;
    channel: EconomistChannel;
    specialty: string;
  };
  florenceFee: {
    employerMonthlyFeePerRn: number;
    employerMonthlyFeeTotal: number;
    channelPartnerMonthlyShareTotal: number;
    florenceMonthlyRevenueTotal: number;
  };
  customerOffset: {
    payrollTaxOffsetMonthlyPerRn: number;
    payrollTaxOffsetMonthlyTotal: number;
    treatment: "customer-side-only";
    revenueTreatment: "excluded-from-florence-revenue";
  };
  customerSavings: {
    customerEffectiveFeeMonthlyPerRn: number;
    customerEffectiveLaborCostMonthlyPerRn: number;
    netMonthlySavingsVsAgencyTotal: number;
    customerOffsetExcludedFromFlorenceRevenue: true;
  };
  guardrails: string[];
}

export interface EconomistProposal {
  id: string;
  status: "draft";
  title: string;
  durationMonths: number;
  summary: string;
  quote: EconomistQuote;
  lineItems: { label: string; amountMonthly: number; audience: "customer" | "florence" | "partner" }[];
}

export interface EconomistEnvelope<T> {
  data: T;
  coreEvent?: {
    emitted: boolean;
    eventId?: string;
    reason?: string;
  };
}

export type NashpTrendGroupBy = "hospital" | "health_system" | "msa" | "state";
export type NashpMetricFormat = "currency" | "count" | "percent";

export interface NashpMetricDefinition {
  slug: string;
  column: string;
  label: string;
  format: NashpMetricFormat;
  aggregation: "sum" | "average";
}

export interface NashpTrendEntity {
  id: string;
  label: string;
  groupBy: NashpTrendGroupBy;
  subtitle?: string;
  latestYear?: number;
  latestValue?: number;
  observationCount: number;
}

export interface NashpDatasetMetadata {
  source: {
    name: string;
    url: string;
    releaseLabel: string;
    pageUpdatedOn?: string | null;
    checkedAt?: string | null;
    pageSha256?: string | null;
    runId?: string | null;
    importedAt: string;
    rowCount: number;
    minYear: number;
    maxYear: number;
    msaCoverage: number;
    workbook: { fileName: string; sha256: string; sizeBytes: number };
    definitions: { fileName: string; sha256: string; sizeBytes: number; lastUpdated?: string };
    zipCbsaCrosswalk?: { fileName: string; sha256: string; sizeBytes: number } | null;
  };
  metrics: NashpMetricDefinition[];
  dimensions: {
    hospitals: number;
    healthSystems: number;
    msas: number;
    groups: NashpTrendGroupBy[];
  };
}

export interface NashpTrendPoint {
  year: number;
  value: number | null;
  observationCount: number;
}

export interface NashpTrend {
  source: NashpDatasetMetadata["source"];
  groupBy: NashpTrendGroupBy;
  metric: NashpMetricDefinition;
  entity: NashpTrendEntity;
  series: NashpTrendPoint[];
  notes: string[];
}

export function loginUrl(redirectTo: string = window.location.href): string {
  return `${coreBaseUrl}/login?redirect=${encodeURIComponent(redirectTo)}`;
}

export function logoutUrl(redirectTo: string = window.location.origin): string {
  return `${coreBaseUrl}/logout-link?redirect=${encodeURIComponent(redirectTo)}`;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${coreBaseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    const reason = data.error ?? `Core returned ${response.status}`;
    throw new Error(reason);
  }
  return data;
}

async function requestServiceJson<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? `Service returned ${response.status}`);
  }
  return data;
}

export function readSession(): Promise<SessionState> {
  return requestJson<SessionState>("/me");
}

export function readPassport(nurseId: string, view: "candidate" | "internal" = "candidate"): Promise<PassportResponse> {
  const params = new URLSearchParams({ view });
  return requestJson<PassportResponse>(`/v1/nurses/${encodeURIComponent(nurseId)}/passport?${params.toString()}`);
}

export function readLedger(nurseId: string): Promise<LedgerResponse> {
  const params = new URLSearchParams({ nurseId });
  return requestJson<LedgerResponse>(`/v1/ledger?${params.toString()}`);
}

export function readPathwayCandidates(): Promise<PathwayCandidateSummary[]> {
  return requestServiceJson<PathwayCandidateSummary[]>(pathwayApiUrl, "/api/candidates");
}

export function readEmployerDemand(): Promise<EmployerDemandSummary> {
  return requestServiceJson<EmployerDemandSummary>(employerConnectApiUrl, "/api/ops/dashboards/employer-demand");
}

export function readEmployerLedger(): Promise<EmployerLedgerSummary> {
  return requestServiceJson<EmployerLedgerSummary>(employerConnectApiUrl, "/api/ops/dashboards/production-ledger");
}

export function readEmployerRequisitions(): Promise<EmployerRequisitionSummary[]> {
  return requestServiceJson<EmployerRequisitionSummary[]>(employerConnectApiUrl, "/api/ops/requisitions");
}

export function createEconomistQuote(body: EconomistQuoteRequest): Promise<EconomistEnvelope<EconomistQuote>> {
  return requestServiceJson<EconomistEnvelope<EconomistQuote>>(economistApiUrl, "/v1/economist/quote", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function createEconomistProposal(body: {
  quoteInput: EconomistQuoteRequest;
  title?: string;
  durationMonths?: number;
}): Promise<EconomistEnvelope<EconomistProposal>> {
  return requestServiceJson<EconomistEnvelope<EconomistProposal>>(economistApiUrl, "/v1/economist/proposal", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function readNashpDatasetMetadata(): Promise<EconomistEnvelope<NashpDatasetMetadata>> {
  return requestServiceJson<EconomistEnvelope<NashpDatasetMetadata>>(
    economistApiUrl,
    "/v1/economist/hospital-spend/metadata",
  );
}

export function readNashpTrendEntities(options: {
  groupBy: NashpTrendGroupBy;
  metric?: string;
  search?: string;
  limit?: number;
}): Promise<EconomistEnvelope<NashpTrendEntity[]>> {
  const params = new URLSearchParams({
    groupBy: options.groupBy,
  });
  if (options.metric) params.set("metric", options.metric);
  if (options.search) params.set("search", options.search);
  if (options.limit) params.set("limit", String(options.limit));
  return requestServiceJson<EconomistEnvelope<NashpTrendEntity[]>>(
    economistApiUrl,
    `/v1/economist/hospital-spend/entities?${params.toString()}`,
  );
}

export function readNashpTrend(options: {
  groupBy: NashpTrendGroupBy;
  id: string;
  metric?: string;
  fromYear?: number;
  toYear?: number;
}): Promise<EconomistEnvelope<NashpTrend>> {
  const params = new URLSearchParams({
    groupBy: options.groupBy,
    id: options.id,
  });
  if (options.metric) params.set("metric", options.metric);
  if (options.fromYear) params.set("fromYear", String(options.fromYear));
  if (options.toYear) params.set("toYear", String(options.toYear));
  return requestServiceJson<EconomistEnvelope<NashpTrend>>(
    economistApiUrl,
    `/v1/economist/hospital-spend/trends?${params.toString()}`,
  );
}
