import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

const pkgPath = join(root, "package.json");
const srcPath = join(root, "src", "index.ts");

if (!existsSync(pkgPath)) {
  fail("package.json is missing");
} else {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  if (pkg.type !== "module") fail("package type must be module");
  if (pkg.main !== "./src/index.ts") fail("package main must point at ./src/index.ts while this package is a placeholder");
  if (pkg.exports?.["."] !== "./src/index.ts") fail("package export must point at ./src/index.ts while this package is a placeholder");
}

if (!existsSync(srcPath)) fail("src/index.ts is missing");

for (const artifactDir of ["dist", "build", ".next", ".vite"]) {
  if (existsSync(join(root, artifactDir))) fail(`${artifactDir} must not be committed for placeholder packages`);
}

if (failures.length > 0) {
  console.error("Placeholder package check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Placeholder package check passed.");
