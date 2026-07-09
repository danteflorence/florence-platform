import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { packageJobs } from "./packages.mjs";
import { checkCiWorkflow } from "../security/check-ci-workflow.mjs";

const root = process.cwd();
const failures = [];
const standardScripts = ["dev", "typecheck", "test", "lint", "build", "clean"];

function fail(message) {
  failures.push(message);
}

const rootPackage = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
for (const script of [...standardScripts, "prettier"]) {
  if (!rootPackage.scripts?.[script]) fail(`root package.json missing npm script '${script}'`);
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

const packageScriptDirs = new Set([
  ...packageJobs.map((job) => job.dir),
  "apps/economist-app",
  "apps/employer-connect-api/sdk/components"
]);

for (const entry of readdirSync(join(root, "packages"), { withFileTypes: true })) {
  if (entry.isDirectory()) packageScriptDirs.add(`packages/${entry.name}`);
}

for (const dir of packageScriptDirs) {
  const pkgPath = join(root, dir, "package.json");
  if (!existsSync(pkgPath)) {
    fail(`${dir}/package.json is missing`);
    continue;
  }
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  for (const script of standardScripts) {
    if (!pkg.scripts?.[script]) fail(`${dir} missing standard npm script '${script}'`);
  }
}

for (const envExample of [
  ".env.example",
  ".env.testserver.example",
  "apps/core-api/.env.example",
  "apps/pathway-api/.env.example",
  "apps/employer-connect-api/.env.example",
  "apps/academy-web/.env.example",
  "apps/academy-web/api/.env.example"
]) {
  if (!existsSync(join(root, envExample))) fail(`${envExample} is missing`);
}

for (const prettierFile of [".prettierrc.json", ".prettierignore"]) {
  if (!existsSync(join(root, prettierFile))) fail(`${prettierFile} is missing`);
}

const ciResult = checkCiWorkflow({ root });
if (!ciResult.ok) failures.push(...ciResult.errors);

if (failures.length > 0) {
  console.error("Workspace lint failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Workspace lint passed.");
