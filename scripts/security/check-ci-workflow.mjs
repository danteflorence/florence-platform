import { readFileSync } from "node:fs";
import { join } from "node:path";

function indexOfRequired(text, needle) {
  const index = text.indexOf(needle);
  return index === -1 ? Number.POSITIVE_INFINITY : index;
}

export function checkCiWorkflow({ root = process.cwd() } = {}) {
  const workflowPath = join(root, ".github/workflows/ci.yml");
  const packagePath = join(root, "package.json");
  const workflow = readFileSync(workflowPath, "utf8");
  const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
  const errors = [];

  const requiredRootScripts = [
    "ci:install",
    "typecheck",
    "test",
    "lint",
    "build",
    "security:secrets",
    "security:secrets:test",
    "security:audit",
    "security:static",
    "security:ci:test",
    "ci"
  ];

  for (const script of requiredRootScripts) {
    if (!pkg.scripts?.[script]) errors.push(`root package.json missing script '${script}'`);
  }

  for (const command of [
    "npm run ci:install",
    "npm run typecheck",
    "npm test",
    "npm run lint",
    "npm run build",
    "npm run security:secrets",
    "npm run security:secrets:test",
    "npm run security:audit",
    "npm run security:static",
    "npm run security:ci:test"
  ]) {
    if (!workflow.includes(command)) errors.push(`CI workflow does not run '${command}'`);
  }

  const installIndex = indexOfRequired(workflow, "npm run ci:install");
  const testIndex = indexOfRequired(workflow, "npm test");
  if (installIndex > testIndex) errors.push("CI must install package dependencies before running tests");

  if (/npm\s+audit[^\n|]*(\|\|\s*true)/.test(workflow)) {
    errors.push("CI must not ignore npm audit failures with '|| true'");
  }

  if (!workflow.includes("github/codeql-action/init") || !workflow.includes("github/codeql-action/analyze")) {
    errors.push("CI workflow must include CodeQL static analysis");
  }

  return { ok: errors.length === 0, errors };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = checkCiWorkflow();
  if (!result.ok) {
    console.error("CI workflow check failed:");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log("CI workflow check passed.");
}
