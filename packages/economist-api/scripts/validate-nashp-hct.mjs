import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const defaultArtifact = resolve(here, "../src/generated/nashp-hct.generated.json");
const args = parseArgs(process.argv.slice(2));
const artifactPath = resolve(process.cwd(), args.artifact ?? process.env.NASHP_HCT_ARTIFACT ?? defaultArtifact);
const expectedMaxYear = numberOption(args.expectedMaxYear ?? process.env.NASHP_EXPECTED_MAX_YEAR, 2024);
const minRows = numberOption(args.minRows ?? process.env.NASHP_MIN_ROWS, 60000);
const minMsaCoverage = numberOption(args.minMsaCoverage ?? process.env.NASHP_MIN_MSA_COVERAGE, 0.6);
const requireSourceCheck = booleanOption(args.requireSourceCheck ?? process.env.NASHP_REQUIRE_SOURCE_CHECK, false);
const maxSourceAgeDays = optionalNumber(args.maxSourceAgeDays ?? process.env.NASHP_SOURCE_MAX_AGE_DAYS);
const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
const findings = [];

validateShape(artifact);
validateSource(artifact.source);
validateRows(artifact);
validateCanaries(artifact);
validateSensitiveTerms(artifact);

if (findings.length > 0) {
  console.error("NASHP HCT validation failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  artifact: artifactPath,
  releaseLabel: artifact.source.releaseLabel,
  pageUpdatedOn: artifact.source.pageUpdatedOn ?? null,
  checkedAt: artifact.source.checkedAt ?? null,
  rows: artifact.rows.length,
  hospitals: artifact.hospitals.length,
  healthSystems: artifact.healthSystems.length,
  msas: artifact.msas.length,
  minYear: artifact.source.minYear,
  maxYear: artifact.source.maxYear,
  msaCoverage: artifact.source.msaCoverage,
}, null, 2));

function validateShape(data) {
  if (data.schemaVersion !== 1) fail("schemaVersion must be 1.");
  if (!Array.isArray(data.columns) || data.columns.length < 3) fail("columns must be a non-empty array.");
  if (!Array.isArray(data.metricDefinitions) || data.metricDefinitions.length < 10) fail("metricDefinitions is unexpectedly small.");
  if (!Array.isArray(data.hospitals) || data.hospitals.length < 4500) fail("hospital dictionary is unexpectedly small.");
  if (!Array.isArray(data.healthSystems) || data.healthSystems.length < 500) fail("health-system dictionary is unexpectedly small.");
  if (!Array.isArray(data.msas) || data.msas.length < 300) fail("MSA dictionary is unexpectedly small.");
  if (!Array.isArray(data.rows) || data.rows.length < minRows) fail(`row count ${data.rows?.length ?? 0} is below ${minRows}.`);

  for (const required of [
    "hospitalIndex",
    "year",
    "hospital_operating_costs",
    "net_patient_revenue",
    "direct_patient_care_labor_cost",
    "operating_profit_margin",
  ]) {
    if (!data.columns.includes(required)) fail(`missing required column: ${required}`);
  }

  for (const metric of data.metricDefinitions) {
    if (!data.columns.includes(metric.slug)) fail(`metric ${metric.slug} has no generated column.`);
    if (!["currency", "count", "percent"].includes(metric.format)) fail(`metric ${metric.slug} has invalid format.`);
    if (!["sum", "average"].includes(metric.aggregation)) fail(`metric ${metric.slug} has invalid aggregation.`);
  }
}

function validateSource(source) {
  if (!source || typeof source !== "object") {
    fail("source metadata is missing.");
    return;
  }
  if (source.name !== "NASHP Hospital Cost Tool") fail("source.name must be NASHP Hospital Cost Tool.");
  if (!String(source.url ?? "").startsWith("https://nashp.org/hospital-cost-tool")) fail("source.url must be the official NASHP HCT page.");
  if (!source.releaseLabel || !String(source.releaseLabel).includes("HCT data")) fail("releaseLabel should include HCT data coverage/release information.");
  if (source.maxYear < expectedMaxYear) fail(`source.maxYear ${source.maxYear} is below expected ${expectedMaxYear}.`);
  if (source.minYear > 2011) fail(`source.minYear ${source.minYear} is later than expected 2011 baseline.`);
  if (source.rowCount !== artifact.rows.length) fail("source.rowCount does not match generated rows length.");
  if (source.msaCoverage < minMsaCoverage) fail(`MSA coverage ${source.msaCoverage} is below ${minMsaCoverage}.`);
  validateHash(source.workbook?.sha256, "workbook.sha256");
  validateHash(source.definitions?.sha256, "definitions.sha256");
  if (source.zipCbsaCrosswalk) validateHash(source.zipCbsaCrosswalk.sha256, "zipCbsaCrosswalk.sha256");

  if (requireSourceCheck) {
    if (!source.pageUpdatedOn) fail("source.pageUpdatedOn is required.");
    if (!source.checkedAt) fail("source.checkedAt is required.");
    validateHash(source.pageSha256, "pageSha256");
  }

  if (maxSourceAgeDays !== undefined && source.checkedAt) {
    const checkedAt = Date.parse(source.checkedAt);
    if (!Number.isFinite(checkedAt)) {
      fail("source.checkedAt is not parseable.");
    } else {
      const ageMs = Date.now() - checkedAt;
      const maxAgeMs = maxSourceAgeDays * 24 * 60 * 60 * 1000;
      if (ageMs > maxAgeMs) fail(`source check is older than ${maxSourceAgeDays} days.`);
    }
  }
}

function validateRows(data) {
  const hospitalCount = data.hospitals.length;
  const expectedColumns = data.columns.length;
  let minYear = Number.POSITIVE_INFINITY;
  let maxYear = 0;
  let numericValues = 0;

  for (let index = 0; index < data.rows.length; index += 1) {
    const row = data.rows[index];
    if (!Array.isArray(row) || row.length !== expectedColumns) {
      fail(`row ${index} has invalid column length.`);
      continue;
    }
    const hospitalIndex = row[0];
    const year = row[1];
    if (!Number.isInteger(hospitalIndex) || hospitalIndex < 0 || hospitalIndex >= hospitalCount) fail(`row ${index} has invalid hospital index.`);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) fail(`row ${index} has invalid year.`);
    minYear = Math.min(minYear, year);
    maxYear = Math.max(maxYear, year);
    for (let col = 2; col < row.length; col += 1) {
      const value = row[col];
      if (value !== null && typeof value !== "number") fail(`row ${index} column ${col} has non-numeric metric value.`);
      if (typeof value === "number") numericValues += 1;
    }
  }

  if (minYear !== data.source.minYear) fail("computed minYear does not match source.minYear.");
  if (maxYear !== data.source.maxYear) fail("computed maxYear does not match source.maxYear.");
  if (numericValues < data.rows.length * 5) fail("generated rows have unexpectedly sparse metric values.");
}

function validateCanaries(data) {
  for (const groupBy of ["hospital", "health_system", "msa", "state"]) {
    const aggregate = topLatestAggregate(data, groupBy, "hospital_operating_costs");
    if (!aggregate || aggregate.value <= 0) fail(`no positive latest hospital_operating_costs aggregate for ${groupBy}.`);
  }
}

function validateSensitiveTerms(data) {
  const serialized = JSON.stringify({
    columns: data.columns,
    metrics: data.metricDefinitions,
    sampleHospitals: data.hospitals.slice(0, 50),
    source: data.source,
  }).toLowerCase();
  for (const term of ["passport", "sevis", "ds-160", "ssn", "dateofbirth", "candidateid", "nurseid"]) {
    if (serialized.includes(term)) fail(`generated artifact metadata contains restricted term: ${term}`);
  }
}

function topLatestAggregate(data, groupBy, metricSlug) {
  const metricIndex = data.columns.indexOf(metricSlug);
  const metric = data.metricDefinitions.find((candidate) => candidate.slug === metricSlug);
  if (metricIndex < 0 || !metric) return null;
  const latestYear = data.source.maxYear;
  const aggregates = new Map();

  for (const row of data.rows) {
    if (row[1] !== latestYear) continue;
    const hospital = data.hospitals[row[0]];
    const entity = entityForHospital(data, hospital, groupBy);
    const value = row[metricIndex];
    if (!entity || typeof value !== "number") continue;
    const existing = aggregates.get(entity.id) ?? { ...entity, sum: 0, count: 0 };
    existing.sum += value;
    existing.count += 1;
    aggregates.set(entity.id, existing);
  }

  return [...aggregates.values()]
    .map((entity) => ({ ...entity, value: metric.aggregation === "average" ? entity.sum / entity.count : entity.sum }))
    .sort((left, right) => right.value - left.value)[0] ?? null;
}

function entityForHospital(data, hospital, groupBy) {
  if (!hospital) return null;
  if (groupBy === "hospital") return { id: hospital[0], label: hospital[1] };
  if (groupBy === "state") return { id: hospital[4], label: hospital[4] };
  if (groupBy === "health_system") {
    const system = typeof hospital[6] === "number" ? data.healthSystems[hospital[6]] : undefined;
    return system ? { id: system[0], label: system[1] } : null;
  }
  const msa = typeof hospital[7] === "number" ? data.msas[hospital[7]] : undefined;
  return msa ? { id: msa[0] || "nonmetro", label: msa[1] } : null;
}

function validateHash(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value)) fail(`${label} must be a SHA-256 hex digest.`);
}

function fail(message) {
  findings.push(message);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = camelize(arg.slice(2));
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = "1";
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function camelize(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function numberOption(value, fallback) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return number;
}

function optionalNumber(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function booleanOption(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "strict"].includes(String(value).toLowerCase());
}
