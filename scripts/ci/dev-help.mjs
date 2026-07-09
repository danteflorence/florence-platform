const commands = [
  ["Setup local env", "pnpm setup:local"],
  ["Full local stack", "pnpm dev"],
  ["Core only", "pnpm dev:core"],
  ["Academy slice", "pnpm dev:academy"],
  ["Pathway slice", "pnpm dev:pathway"],
  ["Employer Connect slice", "pnpm dev:employer"],
  ["Workforce Economist slice", "pnpm dev:economist"],
  ["Run migrations", "pnpm db:migrate"],
  ["Seed fake local data", "pnpm db:seed"],
  ["Run local smoke checks", "pnpm smoke:local"],
];

console.log("Florence Education local development commands:");
for (const [label, command] of commands) {
  console.log(`- ${label}: ${command}`);
}
