import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { packageJobs } from "./packages.mjs";

const mode = process.argv[2];
const validModes = new Set(["install", "typecheck", "test", "build"]);

if (!validModes.has(mode)) {
  console.error(`Usage: node scripts/ci/run-npm.mjs ${[...validModes].join("|")}`);
  process.exit(2);
}

function readScripts(dir) {
  const pkgPath = join(process.cwd(), dir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  return pkg.scripts ?? {};
}

function run(dir, args) {
  console.log(`\n[${dir}] npm ${args.join(" ")}`);
  const npmExecPath = process.env.npm_execpath;
  const command = npmExecPath ? process.execPath : "npm";
  const commandArgs = npmExecPath ? [npmExecPath, ...args] : args;
  const result = spawnSync(command, commandArgs, {
    cwd: join(process.cwd(), dir),
    stdio: "inherit",
    env: { ...process.env, CI: process.env.CI ?? "1" }
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

for (const job of packageJobs) {
  const lockPath = join(process.cwd(), job.dir, "package-lock.json");
  const scripts = readScripts(job.dir);

  if (mode === "install") {
    if (!job.install) continue;
    if (!existsSync(lockPath)) {
      console.error(`[${job.name}] package-lock.json is required for clean-clone npm ci`);
      process.exit(1);
    }
    run(job.dir, ["ci"]);
    continue;
  }

  for (const script of job[mode]) {
    if (!scripts[script]) {
      console.error(`[${job.name}] missing package script: ${script}`);
      process.exit(1);
    }
    run(job.dir, ["run", script]);
  }
}
