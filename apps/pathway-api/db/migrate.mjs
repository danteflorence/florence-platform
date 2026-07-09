import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required to migrate Pathway Postgres.");
  process.exit(1);
}

let pg;
try {
  pg = await import("pg");
} catch {
  console.error("the 'pg' package is not installed - run `npm install` in apps/pathway-api");
  process.exit(1);
}

const Pool = pg.default?.Pool ?? pg.Pool;
const pool = new Pool({ connectionString: databaseUrl });
const here = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(here, "schema.sql"), "utf8");

try {
  await pool.query(sql);
  console.log("[pathway] Postgres migration complete");
} catch (err) {
  console.error("Pathway migration failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
