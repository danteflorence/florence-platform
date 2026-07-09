import { copyFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const task = process.argv[2];

if (!["migrate", "seed"].includes(task)) {
  console.error("Usage: node scripts/local/compose-task.mjs <migrate|seed>");
  process.exit(1);
}

const envPath = resolve(root, ".env.local");
if (!existsSync(envPath)) {
  copyFileSync(resolve(root, ".env.local.example"), envPath);
  console.log("Created .env.local from .env.local.example.");
}

function docker(args) {
  const result = spawnSync("docker", ["compose", "--env-file", ".env.local", ...args], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function run(service, command, options = {}) {
  const args = ["run", "--rm"];
  if (options.entrypoint) args.push("--entrypoint", options.entrypoint);
  args.push(service, ...command);
  docker(args);
}

function migrate() {
  run("core-api", ["node", "db/migrate.mjs"]);
  run("academy-api", ["node", "db/migrate.mjs"]);
  run("pathway-api", ["db/migrate.mjs"], { entrypoint: "node" });
  run("employer-connect-api", ["--import", "tsx", "scripts/migrate.ts"], { entrypoint: "node" });
}

function seed() {
  migrate();
  run("core-api", ["node", "scripts/seed-admin.ts"]);
  run("pathway-api", ["--import", "tsx", "scripts/seed-local.ts"], { entrypoint: "node" });
  run("employer-connect-api", ["--import", "tsx", "scripts/seed-local.ts"], { entrypoint: "node" });
}

if (task === "migrate") migrate();
if (task === "seed") seed();
