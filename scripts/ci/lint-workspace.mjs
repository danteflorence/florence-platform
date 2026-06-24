import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { packageJobs } from "./packages.mjs";
import { checkCiWorkflow } from "../security/check-ci-workflow.mjs";

const root = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

for (const job of packageJobs) {
  const dir = join(root, job.dir);
  const pkgPath = join(dir, "package.json");
  const lockPath = join(dir, "package-lock.json");
  if (!existsSync(pkgPath)) fail(`${job.dir}/package.json is missing`);
  if (job.install && !existsSync(lockPath)) fail(`${job.dir}/package-lock.json is missing`);

  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    for (const group of ["typecheck", "test", "build"]) {
      for (const script of job[group]) {
        if (!pkg.scripts?.[script]) fail(`${job.dir} missing npm script '${script}'`);
      }
    }
  }
}

for (const envExample of [
  ".env.example",
  ".env.testserver.example",
  "florence-core/.env.example",
  "florence-pathway-agent/.env.example",
  "florence-ats-connect/.env.example",
  "florence-academy/.env.example",
  "florence-academy/api/.env.example"
]) {
  if (!existsSync(join(root, envExample))) fail(`${envExample} is missing`);
}

const ciResult = checkCiWorkflow({ root });
if (!ciResult.ok) failures.push(...ciResult.errors);

if (failures.length > 0) {
  console.error("Workspace lint failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Workspace lint passed.");
