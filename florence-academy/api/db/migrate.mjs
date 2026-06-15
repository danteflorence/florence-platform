// Apply db/schema.sql to the Postgres database in DATABASE_URL.
// Idempotent — the schema uses CREATE TABLE IF NOT EXISTS throughout, so it's
// safe to re-run. Requires the `pg` driver (npm i pg in api/).
//
//   DATABASE_URL=postgres://user:pass@host:5432/florence node db/migrate.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required (e.g. postgres://user:pass@host:5432/db)");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(here, "schema.sql"), "utf8");

let pg;
try {
  pg = await import("pg");
} catch {
  console.error("the 'pg' package is not installed — run `npm i pg` in api/");
  process.exit(1);
}

const Pool = pg.default?.Pool ?? pg.Pool;
const pool = new Pool({ connectionString: url });
try {
  await pool.query(schema);
  console.log("✓ schema applied to", url.replace(/:\/\/[^@]*@/, "://***@"));
} catch (e) {
  console.error("migration failed:", e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
