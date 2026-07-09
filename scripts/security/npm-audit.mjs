import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { packageJobs } from "../ci/packages.mjs";

for (const job of packageJobs) {
  if (!job.install) continue;
  console.log(`\n[${job.dir}] npm audit --audit-level=high`);
  const npmExecPath = process.env.npm_execpath;
  const command = npmExecPath ? process.execPath : "npm";
  const args = npmExecPath
    ? [npmExecPath, "audit", "--audit-level=high"]
    : ["audit", "--audit-level=high"];
  const result = spawnSync(command, args, {
    cwd: join(process.cwd(), job.dir),
    stdio: "inherit"
  });
  if (result.error) {
    console.error(
      `Dependency vulnerability scan could not start in ${job.dir}: ${result.error.message}`
    );
    console.error("Install Node.js 24 with npm available, then rerun npm run security:audit.");
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("Dependency vulnerability scan passed.");
