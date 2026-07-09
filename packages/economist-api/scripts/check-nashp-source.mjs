import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchNashpSourceSnapshot, NASHP_SOURCE_URL } from "./nashp-source.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const defaultArtifact = resolve(here, "../src/generated/nashp-hct.generated.json");
const args = parseArgs(process.argv.slice(2));
const artifactPath = resolve(process.cwd(), args.artifact ?? process.env.NASHP_HCT_ARTIFACT ?? defaultArtifact);
const strict = booleanOption(args.strict ?? process.env.NASHP_FRESHNESS_STRICT, false);
const sourceUrl = args.sourceUrl ?? process.env.NASHP_SOURCE_URL ?? NASHP_SOURCE_URL;
const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
const snapshot = await fetchNashpSourceSnapshot(sourceUrl);
const staleByPageDate = Boolean(artifact.source.pageUpdatedOn && snapshot.pageUpdatedOn && artifact.source.pageUpdatedOn !== snapshot.pageUpdatedOn);
const uncheckedArtifact = !artifact.source.pageUpdatedOn || !artifact.source.checkedAt;
const result = {
  ok: !staleByPageDate && !uncheckedArtifact,
  strict,
  sourceUrl,
  livePageUpdatedOn: snapshot.pageUpdatedOn,
  artifactPageUpdatedOn: artifact.source.pageUpdatedOn ?? null,
  artifactCheckedAt: artifact.source.checkedAt ?? null,
  artifactReleaseLabel: artifact.source.releaseLabel,
  artifactMaxYear: artifact.source.maxYear,
  staleByPageDate,
  uncheckedArtifact,
};

console.log(JSON.stringify(result, null, 2));

if (strict && !result.ok) {
  process.exit(1);
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

function booleanOption(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "strict"].includes(String(value).toLowerCase());
}
