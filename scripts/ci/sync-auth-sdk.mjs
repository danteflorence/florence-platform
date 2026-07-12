// Sync the vendored Core verification SDK from its canonical source into each
// consuming app — or, with --check, fail if any in-app copy has drifted.
//
// Canonical: packages/auth-sdk/src/coreAuth.ts. The copies must stay vendored
// (byte-identical, in-app) because core-api and academy-api build their Docker
// images from their own app directory and cannot reach packages/ at build time.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOURCE = "packages/auth-sdk/src/coreAuth.ts";
const TARGETS = [
  "apps/core-api/sdk/coreAuth.ts",
  "apps/pathway-api/server/coreAuth.ts",
  "apps/employer-connect-api/server/coreAuth.ts",
  "apps/academy-web/api/src/coreAuth.ts"
];

const check = process.argv.includes("--check");
const sourcePath = join(root, SOURCE);
if (!existsSync(sourcePath)) {
  console.error(`sync-auth-sdk: canonical source is missing: ${SOURCE}`);
  process.exit(1);
}
const canonical = readFileSync(sourcePath, "utf8");

const drifted = [];
for (const target of TARGETS) {
  const targetPath = join(root, target);
  const current = existsSync(targetPath) ? readFileSync(targetPath, "utf8") : null;
  if (current === canonical) continue;
  if (check) {
    drifted.push(target);
  } else {
    writeFileSync(targetPath, canonical);
    console.log(`sync-auth-sdk: wrote ${target}`);
  }
}

if (check) {
  if (drifted.length > 0) {
    console.error(`sync-auth-sdk: drift detected — ${drifted.length} cop${drifted.length === 1 ? "y" : "ies"} differ from ${SOURCE}:`);
    for (const target of drifted) console.error(`- ${target}`);
    console.error("Edit the canonical file only, then run `npm run sync:auth-sdk`.");
    process.exit(1);
  }
  console.log(`sync-auth-sdk: all ${TARGETS.length} copies match ${SOURCE}.`);
} else {
  console.log(`sync-auth-sdk: ${TARGETS.length} copies in sync with ${SOURCE}.`);
}
