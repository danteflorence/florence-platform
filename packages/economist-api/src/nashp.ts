import { readFileSync } from "node:fs";

export type NashpTrendGroupBy = "hospital" | "health_system" | "msa" | "state";
export type NashpMetricFormat = "currency" | "count" | "percent";
export type NashpMetricAggregation = "sum" | "average";

export interface NashpMetricDefinition {
  slug: string;
  column: string;
  label: string;
  format: NashpMetricFormat;
  aggregation: NashpMetricAggregation;
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

export interface NashpEntityListOptions {
  groupBy?: NashpTrendGroupBy;
  metric?: string;
  search?: string;
  limit?: number;
}

export interface NashpTrendOptions {
  groupBy?: NashpTrendGroupBy;
  metric?: string;
  id?: string;
  fromYear?: number;
  toYear?: number;
}

type HospitalRecord = [
  ccn: string,
  name: string,
  abbreviatedName: string | null,
  city: string,
  state: string,
  zipCode: string,
  healthSystemIndex: number | null,
  msaIndex: number | null,
];
type HealthSystemRecord = [id: string, name: string];
type MsaRecord = [code: string, title: string, cbsaType: string];
type ObservationRow = (number | null)[];

interface NashpGeneratedData {
  source: NashpDatasetMetadata["source"];
  columns: string[];
  metricDefinitions: NashpMetricDefinition[];
  hospitals: HospitalRecord[];
  healthSystems: HealthSystemRecord[];
  msas: MsaRecord[];
  rows: ObservationRow[];
}

interface AggregateBucket {
  sum: number;
  count: number;
}

interface EntityAccumulator {
  entity: NashpTrendEntity;
  years: Map<number, AggregateBucket>;
  observationCount: number;
}

const DATA_URL = new URL("./generated/nashp-hct.generated.json", import.meta.url);
const TREND_GROUPS: NashpTrendGroupBy[] = ["hospital", "health_system", "msa", "state"];
const DEFAULT_GROUP: NashpTrendGroupBy = "health_system";
const DEFAULT_METRIC = "hospital_operating_costs";
const MAX_ENTITY_LIMIT = 250;

let cachedDataset: NashpGeneratedData | undefined;

export function getNashpDatasetMetadata(): NashpDatasetMetadata {
  const data = loadNashpData();
  return {
    source: { ...data.source },
    metrics: data.metricDefinitions.map((metric) => ({ ...metric })),
    dimensions: {
      hospitals: data.hospitals.length,
      healthSystems: data.healthSystems.length,
      msas: data.msas.length,
      groups: [...TREND_GROUPS],
    },
  };
}

export function listNashpTrendEntities(options: NashpEntityListOptions = {}): NashpTrendEntity[] {
  const data = loadNashpData();
  const groupBy = normalizeGroupBy(options.groupBy);
  const metric = resolveMetric(data, options.metric);
  const metricIndex = metricValueIndex(data, metric.slug);
  const search = normalizeSearch(options.search);
  const limit = normalizeLimit(options.limit);
  const accumulators = new Map<string, EntityAccumulator>();

  for (const row of data.rows) {
    const entity = resolveEntityForRow(data, row, groupBy);
    if (!entity) continue;
    if (search && !entityMatchesSearch(entity, search)) continue;

    const year = rowYear(row);
    const value = readMetricValue(row, metricIndex);
    const accumulator = getEntityAccumulator(accumulators, entity);
    accumulator.observationCount += 1;
    accumulator.entity.observationCount = accumulator.observationCount;
    if (value === null) continue;

    const bucket = getAggregateBucket(accumulator.years, year);
    bucket.sum += value;
    bucket.count += 1;
  }

  return [...accumulators.values()]
    .map((accumulator) => withLatestMetric(accumulator, metric))
    .sort((left, right) => {
      const valueDelta = (right.latestValue ?? Number.NEGATIVE_INFINITY) - (left.latestValue ?? Number.NEGATIVE_INFINITY);
      if (valueDelta !== 0) return valueDelta;
      return left.label.localeCompare(right.label);
    })
    .slice(0, limit);
}

export function getNashpTrend(options: NashpTrendOptions = {}): NashpTrend {
  const data = loadNashpData();
  const source = { ...data.source };
  const groupBy = normalizeGroupBy(options.groupBy);
  const metric = resolveMetric(data, options.metric);
  const metricIndex = metricValueIndex(data, metric.slug);
  const entityId = options.id ?? listNashpTrendEntities({ groupBy, metric: metric.slug, limit: 1 })[0]?.id;
  if (!entityId) {
    throw new Error(`No NASHP ${groupBy} entity is available for ${metric.slug}.`);
  }

  const fromYear = normalizeYear(options.fromYear, source.minYear, source.minYear, source.maxYear);
  const toYear = normalizeYear(options.toYear, source.maxYear, source.minYear, source.maxYear);
  const lowYear = Math.min(fromYear, toYear);
  const highYear = Math.max(fromYear, toYear);
  const years = new Map<number, AggregateBucket>();
  let entity: NashpTrendEntity | undefined;
  let observationCount = 0;

  for (const row of data.rows) {
    const candidate = resolveEntityForRow(data, row, groupBy);
    if (!candidate || candidate.id !== entityId) continue;

    const year = rowYear(row);
    if (year < lowYear || year > highYear) continue;

    entity ??= candidate;
    observationCount += 1;
    const value = readMetricValue(row, metricIndex);
    if (value === null) continue;

    const bucket = getAggregateBucket(years, year);
    bucket.sum += value;
    bucket.count += 1;
  }

  if (!entity) {
    throw new Error(`NASHP ${groupBy} entity not found: ${entityId}`);
  }

  const series: NashpTrendPoint[] = [];
  for (let year = lowYear; year <= highYear; year += 1) {
    const bucket = years.get(year);
    series.push({
      year,
      value: bucket ? aggregate(bucket, metric) : null,
      observationCount: bucket?.count ?? 0,
    });
  }

  const populated = series.filter((point) => point.value !== null);
  return {
    source,
    groupBy,
    metric: { ...metric },
    entity: {
      ...entity,
      observationCount,
      latestYear: populated.at(-1)?.year,
      latestValue: populated.at(-1)?.value ?? undefined,
    },
    series,
    notes: [
      "NASHP HCT data is public aggregate hospital finance data; candidate records and nurse PII are not part of this dataset.",
      "MSA grouping is derived from ZIP-to-CBSA enrichment because the NASHP workbook does not include an MSA column.",
    ],
  };
}

function loadNashpData(): NashpGeneratedData {
  cachedDataset ??= JSON.parse(readFileSync(DATA_URL, "utf8")) as NashpGeneratedData;
  return cachedDataset;
}

function normalizeGroupBy(groupBy: NashpTrendGroupBy | undefined): NashpTrendGroupBy {
  if (!groupBy) return DEFAULT_GROUP;
  if (TREND_GROUPS.includes(groupBy)) return groupBy;
  throw new Error(`Unsupported NASHP trend group: ${groupBy}`);
}

function resolveMetric(data: NashpGeneratedData, metricSlug: string | undefined): NashpMetricDefinition {
  const slug = metricSlug ?? DEFAULT_METRIC;
  const metric = data.metricDefinitions.find((candidate) => candidate.slug === slug);
  if (!metric) throw new Error(`Unsupported NASHP trend metric: ${slug}`);
  return metric;
}

function metricValueIndex(data: NashpGeneratedData, metricSlug: string): number {
  const index = data.columns.indexOf(metricSlug);
  if (index < 0) throw new Error(`NASHP metric column missing from generated data: ${metricSlug}`);
  return index;
}

function normalizeSearch(search: string | undefined): string {
  return search?.trim().toLowerCase() ?? "";
}

function normalizeLimit(limit: number | undefined): number {
  if (!limit || !Number.isFinite(limit)) return 50;
  return Math.max(1, Math.min(MAX_ENTITY_LIMIT, Math.trunc(limit)));
}

function normalizeYear(value: number | undefined, fallback: number, minYear: number, maxYear: number): number {
  if (!value || !Number.isFinite(value)) return fallback;
  return Math.max(minYear, Math.min(maxYear, Math.trunc(value)));
}

function resolveEntityForRow(
  data: NashpGeneratedData,
  row: ObservationRow,
  groupBy: NashpTrendGroupBy,
): NashpTrendEntity | undefined {
  const hospital = data.hospitals[rowHospitalIndex(row)];
  if (!hospital) return undefined;

  if (groupBy === "hospital") {
    return {
      id: hospital[0],
      label: hospital[1],
      groupBy,
      subtitle: `${hospital[3]}, ${hospital[4]} · CCN ${hospital[0]}`,
      observationCount: 0,
    };
  }

  if (groupBy === "health_system") {
    const healthSystemIndex = hospital[6];
    const healthSystem = typeof healthSystemIndex === "number" ? data.healthSystems[healthSystemIndex] : undefined;
    if (!healthSystem) return undefined;
    return {
      id: healthSystem[0],
      label: healthSystem[1],
      groupBy,
      subtitle: "NASHP health system",
      observationCount: 0,
    };
  }

  if (groupBy === "msa") {
    const msaIndex = hospital[7];
    const msa = typeof msaIndex === "number" ? data.msas[msaIndex] : undefined;
    if (!msa) return undefined;
    return {
      id: msaEntityId(msa),
      label: msa[1],
      groupBy,
      subtitle: msa[2],
      observationCount: 0,
    };
  }

  return {
    id: hospital[4],
    label: hospital[4],
    groupBy,
    subtitle: "State",
    observationCount: 0,
  };
}

function rowHospitalIndex(row: ObservationRow): number {
  return Number(row[0]);
}

function rowYear(row: ObservationRow): number {
  return Number(row[1]);
}

function readMetricValue(row: ObservationRow, metricIndex: number): number | null {
  const value = row[metricIndex];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getEntityAccumulator(accumulators: Map<string, EntityAccumulator>, entity: NashpTrendEntity): EntityAccumulator {
  const existing = accumulators.get(entity.id);
  if (existing) return existing;

  const accumulator = {
    entity: { ...entity },
    years: new Map<number, AggregateBucket>(),
    observationCount: 0,
  };
  accumulators.set(entity.id, accumulator);
  return accumulator;
}

function getAggregateBucket(years: Map<number, AggregateBucket>, year: number): AggregateBucket {
  const existing = years.get(year);
  if (existing) return existing;

  const bucket = { sum: 0, count: 0 };
  years.set(year, bucket);
  return bucket;
}

function withLatestMetric(accumulator: EntityAccumulator, metric: NashpMetricDefinition): NashpTrendEntity {
  const latestYear = Math.max(...accumulator.years.keys());
  const bucket = accumulator.years.get(latestYear);
  return {
    ...accumulator.entity,
    observationCount: accumulator.observationCount,
    latestYear: Number.isFinite(latestYear) ? latestYear : undefined,
    latestValue: bucket ? aggregate(bucket, metric) : undefined,
  };
}

function aggregate(bucket: AggregateBucket, metric: NashpMetricDefinition): number {
  if (metric.aggregation === "average") {
    return roundMetric(bucket.sum / Math.max(1, bucket.count), metric);
  }
  return roundMetric(bucket.sum, metric);
}

function roundMetric(value: number, metric: NashpMetricDefinition): number {
  if (metric.format === "percent") return Math.round(value * 10000) / 10000;
  if (metric.format === "currency") return Math.round(value);
  return Math.round(value * 100) / 100;
}

function msaEntityId(msa: MsaRecord): string {
  return msa[0] || "nonmetro";
}

function entityMatchesSearch(entity: NashpTrendEntity, search: string): boolean {
  return `${entity.id} ${entity.label} ${entity.subtitle ?? ""}`.toLowerCase().includes(search);
}
