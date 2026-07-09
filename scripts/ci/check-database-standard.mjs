import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, relative, sep } from "node:path";

const root = process.cwd();
const strictLocalArtifacts = process.argv.includes("--strict-local-artifacts");
const errors = [];
const warnings = [];

const dbArtifactPattern = /(?:^|\/)(?:[^/]+\.(?:db|sqlite)(?:-(?:wal|shm))?|[^/]+-(?:wal|shm)|ats-connect-pg)(?:\/|$)/i;
const skippedDirs = new Set([".git", "node_modules", "dist", "build", "coverage", ".terraform", "labor-economics-agent", "extracted"]);

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function rel(path) {
  return path.split(sep).join("/");
}

function git(args) {
  const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8" });
  if (result.status !== 0) {
    fail(result.stderr.trim() || `git ${args.join(" ")} failed`);
    return [];
  }
  return result.stdout.split("\n").filter(Boolean);
}

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function requireFile(path) {
  if (!existsSync(join(root, path))) fail(`${path} is missing`);
}

function loadPackage(path) {
  return JSON.parse(read(path));
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (skippedDirs.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(`${rel(relative(root, full))}/`);
      walk(full, out);
    } else if (entry.isFile()) {
      out.push(rel(relative(root, full)));
    }
  }
  return out;
}

function collectDbArtifacts(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (skippedDirs.has(entry.name)) continue;
    const full = join(dir, entry.name);
    const path = rel(relative(root, full)) + (entry.isDirectory() ? "/" : "");
    if (dbArtifactPattern.test(path)) {
      out.push(path);
      continue;
    }
    if (entry.isDirectory()) collectDbArtifacts(full, out);
  }
  return out;
}

for (const path of [
  "docs/architecture/DATABASE_STANDARD.md",
  "apps/core-api/db/migrate.mjs",
  "apps/core-api/db/schema.sql",
  "apps/academy-web/api/db/migrate.mjs",
  "apps/academy-web/api/db/schema.sql",
  "apps/employer-connect-api/scripts/migrate.ts",
  "apps/pathway-api/db/migrate.mjs",
  "apps/pathway-api/db/schema.sql",
]) {
  requireFile(path);
}

for (const path of [...git(["ls-files"]), ...git(["ls-files", "--others", "--exclude-standard"])]) {
  if (dbArtifactPattern.test(path)) fail(`database artifact must not be source-controlled or unignored: ${path}`);
}

if (strictLocalArtifacts) {
  for (const path of collectDbArtifacts(join(root, "apps"))) fail(`local database artifact exists in apps/: ${path}`);
} else {
  for (const path of collectDbArtifacts(join(root, "apps"))) warn(`ignored local database artifact exists: ${path}`);
}

const compose = read("docker-compose.yml");
if (!compose.includes("postgres:")) fail("docker-compose.yml missing shared Postgres service postgres");
if (!compose.includes("pg_isready")) fail("docker-compose.yml shared Postgres service must define a healthcheck");
if (!compose.includes("./scripts/local/postgres-init:/docker-entrypoint-initdb.d:ro")) {
  fail("docker-compose.yml shared Postgres service must mount local database initialization scripts");
}
for (const [service, dbName] of [
  ["core-api", "florence_core"],
  ["academy-api", "florence_academy"],
  ["pathway-api", "florence_pathway"],
  ["employer-connect-api", "florence_employer"],
]) {
  const dependencyNeedle = `postgres:\n        condition: service_healthy`;
  if (!compose.includes(dependencyNeedle)) fail(`docker-compose.yml ${service} missing service_healthy dependency for postgres`);
  const urlPattern = new RegExp(`DATABASE_URL:\\s+postgres:\\/\\/\\$\\{POSTGRES_USER:-florence\\}:\\$\\{POSTGRES_PASSWORD:-changeme\\}@postgres:5432\\/${dbName}`);
  if (!urlPattern.test(compose)) fail(`docker-compose.yml ${service} missing Postgres DATABASE_URL for ${dbName}`);
}
if (!/PATHWAY_DB:\s+["']?postgres["']?/.test(compose)) fail("docker-compose.yml Pathway service must set PATHWAY_DB: postgres");
if (!/ATS_DB:\s+["']?postgres["']?/.test(compose)) fail('docker-compose.yml Employer Connect service must set ATS_DB: "postgres"');

for (const [path, marker] of [
  ["apps/core-api/src/store.ts", "DATABASE_URL is required in production; Core must use Postgres."],
  ["apps/academy-web/api/src/index.ts", "DATABASE_URL is required in production; Academy API must use Postgres."],
  ["apps/employer-connect-api/server/db.ts", "DATABASE_URL is required in production; Employer Connect must use networked Postgres."],
  ["apps/pathway-api/server/db.postgres.ts", "DATABASE_URL is required in production; Pathway must use networked Postgres."],
]) {
  if (!read(path).includes(marker)) fail(`${path} missing production Postgres fail-closed guard`);
}

for (const [path, backendMarker, migrationMarker] of [
  ["apps/core-api/src/routes.ts", "backend:", "migration"],
  ["apps/core-api/src/gateway/index.ts", "backend:", "migration"],
  ["apps/academy-web/api/src/routes.ts", "backend:", "migration"],
  ["apps/employer-connect-api/server/routes.ts", "database: { backend: databaseBackend", "migrationStatus"],
  ["apps/pathway-api/server/routes/index.ts", "database: { backend: databaseBackend", "migrationStatus"],
]) {
  const text = read(path);
  if (!text.includes(backendMarker) || !text.includes(migrationMarker)) {
    fail(`${path} health route must expose database backend and migration status`);
  }
}

for (const packagePath of ["apps/pathway-api/package.json", "apps/employer-connect-api/package.json"]) {
  const pkg = loadPackage(packagePath);
  for (const [name, command] of Object.entries(pkg.scripts ?? {})) {
    const selectsSqlite = /(?:PATHWAY_DB|ATS_DB)=sqlite|ALLOW_SQLITE_LOCAL_DEV=1|--experimental-sqlite/.test(command);
    if (selectsSqlite && !name.endsWith(":local")) {
      fail(`${packagePath} script '${name}' selects SQLite but is not an explicit :local script`);
    }
  }
}

const sqliteAllowedFiles = new Set([
  "apps/pathway-api/server/db.sqlite.ts",
  "apps/employer-connect-api/server/store/sqlite.ts",
  "apps/employer-connect-api/server/candidateProvider.ts",
]);
for (const path of walk(join(root, "apps"))) {
  if (!path.endsWith(".ts") && !path.endsWith(".tsx") && !path.endsWith(".js") && !path.endsWith(".mjs")) continue;
  const text = read(path);
  const importsSqlite = /from\s+['"]node:sqlite['"]|import\(['"]node:sqlite['"]\)|new\s+DatabaseSync\b/.test(text);
  if (importsSqlite && !sqliteAllowedFiles.has(path)) {
    fail(`SQLite runtime import is not in an approved explicit-local adapter: ${path}`);
  }
}

if (warnings.length > 0) {
  console.warn("Database standard warnings:");
  for (const message of warnings) console.warn(`- ${message}`);
}

if (errors.length > 0) {
  console.error("Database standard check failed:");
  for (const message of errors) console.error(`- ${message}`);
  process.exit(1);
}

console.log("Database standard check passed.");
