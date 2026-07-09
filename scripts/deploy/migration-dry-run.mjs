import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "../..");
const requireFromCore = createRequire(new URL("../../apps/core-api/package.json", import.meta.url));

let Client;
try {
  ({ Client } = requireFromCore("pg"));
} catch {
  console.error("[migration-dry-run] Missing pg dependency. Run npm run ci:install first.");
  process.exit(1);
}

const services = {
  "core-api": {
    sql: () => readFileSync(join(root, "apps/core-api/db/schema.sql"), "utf8")
  },
  "academy-api": {
    sql: () => readFileSync(join(root, "apps/academy-web/api/db/schema.sql"), "utf8")
  },
  "pathway-api": {
    sql: () => readFileSync(join(root, "apps/pathway-api/db/schema.sql"), "utf8")
  },
  "employer-connect-api": {
    sql: () => {
      const source = readFileSync(join(root, "apps/employer-connect-api/server/store/postgres.ts"), "utf8");
      const match = source.match(/export const ATS_POSTGRES_DDL = `([\s\S]*?)`\s*\n/);
      if (!match) throw new Error("Could not locate ATS_POSTGRES_DDL.");
      return match[1];
    }
  }
};

function schemaFor(service) {
  return `dryrun_${service.replace(/[^a-z0-9_]/gi, "_").toLowerCase()}`;
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function sanitizeError(error) {
  const details = error?.message || error?.errors?.map((entry) => entry.message || String(entry)).join("; ") || String(error);
  return details
    .replace(/postgres:\/\/[^@\s]+@/g, "postgres://<redacted>@")
    .replace(/password\s*=\s*[^,\s)]+/gi, "password=<redacted>");
}

async function dryRun(service, databaseUrl) {
  const definition = services[service];
  if (!definition) throw new Error(`Unknown migration service: ${service}`);

  const client = new Client({ connectionString: databaseUrl });
  const schema = quoteIdentifier(schemaFor(service));

  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET search_path TO ${schema}, public`);
    await client.query(definition.sql());
    await client.query("ROLLBACK");
    console.log(`[migration-dry-run] ${service}: ok`);
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Preserve the original migration error.
    }
    throw error;
  } finally {
    await client.end();
  }
}

const selected = process.argv.slice(2);
const targets = selected.length > 0 ? selected : Object.keys(services);
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("[migration-dry-run] DATABASE_URL is required.");
  process.exit(1);
}

let failed = false;
for (const service of targets) {
  try {
    await dryRun(service, databaseUrl);
  } catch (error) {
    failed = true;
    console.error(`[migration-dry-run] ${service}: failed: ${sanitizeError(error)}`);
  }
}

if (failed) process.exit(1);
console.log("[migration-dry-run] all selected migrations can apply cleanly.");
