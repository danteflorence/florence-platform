import { existsSync, lstatSync } from "node:fs";
import { join } from "node:path";

const requiredDirs = [
  "apps",
  "apps/app-web",
  "apps/core-api",
  "apps/academy-web",
  "apps/academy-api",
  "apps/academy-live",
  "apps/pathway-api",
  "apps/employer-connect-api",
  "apps/economist-app",
  "packages",
  "packages/agent-system",
  "packages/api",
  "packages/core-sdk",
  "packages/event-sdk",
  "packages/auth-sdk",
  "packages/config",
  "packages/logger",
  "packages/db",
  "packages/design-system",
  "packages/test-fixtures",
  "infra",
  "docs",
  "docs/runbooks"
];

const requiredFiles = [
  "README.md",
  "workspace.json",
  "tsconfig.base.json",
  ".gitignore",
  "docs/runbooks/LOCAL_SETUP.md",
  "docs/runbooks/CI_CD.md"
];

const legacyLinks = [
  "florence-core",
  "florence-academy",
  "florence-pathway-agent",
  "florence-ats-connect"
];

const failures = [];
const root = process.cwd();

for (const dir of requiredDirs) {
  if (!existsSync(join(root, dir))) failures.push(`missing ${dir}`);
}

for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) failures.push(`missing ${file}`);
}

for (const link of legacyLinks) {
  const full = join(root, link);
  if (!existsSync(full)) {
    failures.push(`missing compatibility path ${link}`);
    continue;
  }
  if (!lstatSync(full).isSymbolicLink()) failures.push(`${link} should be a compatibility symlink during the skeleton phase`);
}

if (failures.length > 0) {
  console.error("Workspace skeleton check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Workspace skeleton check passed.");
