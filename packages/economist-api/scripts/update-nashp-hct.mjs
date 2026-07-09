import { copyFileSync, existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { fetchNashpSourceSnapshot, NASHP_SOURCE_URL } from "./nashp-source.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, "..");
const workspaceRoot = resolve(packageRoot, "../..");
const defaultOut = resolve(packageRoot, "src/generated/nashp-hct.generated.json");
const args = parseArgs(process.argv.slice(2));
const hctXlsx = resolveRequiredPath(args.hctXlsx ?? process.env.NASHP_HCT_XLSX, "NASHP_HCT_XLSX or --hct-xlsx");
const definitionsDocx = resolveRequiredPath(
  args.definitionsDocx ?? process.env.NASHP_HCT_DEFINITIONS_DOCX,
  "NASHP_HCT_DEFINITIONS_DOCX or --definitions-docx",
);
const zipCbsaCsv = resolveRequiredPath(args.zipCbsaCsv ?? process.env.NASHP_ZIP_CBSA_CSV, "NASHP_ZIP_CBSA_CSV or --zip-cbsa-csv");
const outPath = resolve(process.cwd(), args.out ?? process.env.NASHP_HCT_OUT ?? defaultOut);
const python = args.python ?? process.env.NASHP_PYTHON ?? "python3";
const sourceUrl = args.sourceUrl ?? process.env.NASHP_SOURCE_URL ?? NASHP_SOURCE_URL;
const runId = args.runId ?? process.env.NASHP_RUN_ID ?? `nashp-hct-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const skipSourceCheck = booleanOption(args.skipSourceCheck ?? process.env.NASHP_SKIP_SOURCE_CHECK, false);
const allowOfflineSourceCheck = booleanOption(args.allowOfflineSourceCheck ?? process.env.NASHP_ALLOW_OFFLINE_SOURCE_CHECK, false);
const requireSourceCheck = !skipSourceCheck && !allowOfflineSourceCheck;
const tmpPath = resolve(dirname(outPath), `.${basename(outPath)}.${process.pid}.${Date.now()}.tmp`);
const backupDir = resolve(workspaceRoot, "tmp/nashp-hct-backups");
let backupPath = null;

preflightPython(python);
const sourceSnapshot = await resolveSourceSnapshot();

try {
  mkdirSync(dirname(outPath), { recursive: true });
  if (existsSync(outPath)) {
    mkdirSync(backupDir, { recursive: true });
    backupPath = resolve(backupDir, `${basename(outPath)}.${runId}.bak`);
    copyFileSync(outPath, backupPath);
  }

  run(python, [
    resolve(here, "import-nashp-hct.py"),
    "--hct-xlsx",
    hctXlsx,
    "--definitions-docx",
    definitionsDocx,
    "--zip-cbsa-csv",
    zipCbsaCsv,
    "--out",
    tmpPath,
    "--source-url",
    sourceSnapshot.url,
    "--source-checked-at",
    sourceSnapshot.checkedAt,
    "--run-id",
    runId,
    ...(sourceSnapshot.pageUpdatedOn ? ["--source-page-updated-on", sourceSnapshot.pageUpdatedOn] : []),
    ...(sourceSnapshot.pageSha256 ? ["--source-page-sha256", sourceSnapshot.pageSha256] : []),
  ]);

  run(process.execPath, [
    resolve(here, "validate-nashp-hct.mjs"),
    "--artifact",
    tmpPath,
    ...(requireSourceCheck ? ["--require-source-check"] : []),
  ]);

  renameSync(tmpPath, outPath);

  run(process.execPath, [
    resolve(here, "validate-nashp-hct.mjs"),
    "--artifact",
    outPath,
    ...(requireSourceCheck ? ["--require-source-check"] : []),
  ]);

  console.log(JSON.stringify({
    ok: true,
    runId,
    out: outPath,
    backup: backupPath,
    source: sourceSnapshot,
  }, null, 2));
} catch (error) {
  if (existsSync(tmpPath)) rmSync(tmpPath, { force: true });
  throw error;
}

async function resolveSourceSnapshot() {
  if (skipSourceCheck) {
    return {
      url: sourceUrl,
      pageUpdatedOn: null,
      checkedAt: new Date().toISOString(),
      pageSha256: null,
    };
  }

  try {
    const snapshot = await fetchNashpSourceSnapshot(sourceUrl);
    if (!snapshot.pageUpdatedOn) {
      throw new Error("Could not read Updated On date from NASHP source page.");
    }
    return snapshot;
  } catch (error) {
    if (!allowOfflineSourceCheck) throw error;
    return {
      url: sourceUrl,
      pageUpdatedOn: null,
      checkedAt: new Date().toISOString(),
      pageSha256: null,
    };
  }
}

function preflightPython(command) {
  run(command, ["-c", "import openpyxl, docx"], {
    errorHint: "NASHP import requires Python with openpyxl and python-docx. Set NASHP_PYTHON or --python.",
  });
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: packageRoot,
    stdio: "inherit",
    env: { ...process.env },
  });
  if (result.status !== 0) {
    throw new Error(options.errorHint ?? `${command} ${commandArgs.join(" ")} failed`);
  }
}

function resolveRequiredPath(value, label) {
  if (!value) {
    console.error(`Missing ${label}.`);
    process.exit(2);
  }
  const path = resolve(process.cwd(), value);
  if (!existsSync(path)) {
    console.error(`${label} does not exist: ${path}`);
    process.exit(2);
  }
  return path;
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
  return ["1", "true", "yes"].includes(String(value).toLowerCase());
}
