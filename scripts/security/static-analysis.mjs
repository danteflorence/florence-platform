import { checkCiWorkflow } from "./check-ci-workflow.mjs";

const result = checkCiWorkflow();
if (!result.ok) {
  console.error("Static CI analysis failed:");
  for (const error of result.errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Static analysis gate passed. CodeQL is configured in GitHub Actions for JavaScript/TypeScript.");
