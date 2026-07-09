import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const root = process.cwd();
const failures = [];
const require = createRequire(import.meta.url);

function fail(message) {
  failures.push(message);
}

const configPath = join(root, ".prettierrc.json");
const ignorePath = join(root, ".prettierignore");

if (!existsSync(configPath)) {
  fail(".prettierrc.json is missing");
} else {
  try {
    JSON.parse(readFileSync(configPath, "utf8"));
  } catch (error) {
    fail(`.prettierrc.json is invalid JSON: ${error.message}`);
  }
}

if (!existsSync(ignorePath)) {
  fail(".prettierignore is missing");
} else {
  const ignore = readFileSync(ignorePath, "utf8");
  for (const required of ["**/node_modules/", "**/dist/", "extracted/", "labor-economics-agent/", "**/.env*"]) {
    if (!ignore.includes(required)) fail(`.prettierignore must include ${required}`);
  }
}

let prettierAvailable = false;
try {
  require.resolve("prettier");
  prettierAvailable = true;
} catch {
  prettierAvailable = false;
}

if (failures.length > 0) {
  console.error("Prettier tooling check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

if (prettierAvailable) {
  console.log("Prettier configuration is present. Run the formatter through the package-managed Prettier binary when formatting is required.");
} else {
  console.log("Prettier configuration check passed. Root Prettier dependency is deferred to the package-manager migration.");
}
