export const packageJobs = [
  {
    name: "core",
    dir: "florence-core",
    install: true,
    typecheck: ["typecheck"],
    test: [
      "verify-security",
      "verify-logging-telemetry-audit",
      "verify-model-gateway",
      "verify-document-vault",
      "verify-application-gate",
      "verify-audit",
      "verify-control-tower",
      "verify-gateway",
      "verify-lender",
      "verify-tenant-binding",
      "verify-tenant-isolation"
    ],
    build: ["build"]
  },
  {
    name: "ats-connect",
    dir: "florence-ats-connect",
    install: true,
    typecheck: ["typecheck"],
    test: [
      "document-vault-smoke",
      "platform-api-smoke",
      "application-gate-smoke",
      "demand-smoke",
      "opportunity-smoke",
      "longtail-smoke",
      "program-smoke",
      "reservations-smoke",
      "onboarding-risk-smoke",
      "component-sdk-smoke",
      "pii-url-smoke"
    ],
    build: ["build"]
  },
  {
    name: "pathway-agent",
    dir: "florence-pathway-agent",
    install: true,
    typecheck: ["typecheck"],
    test: ["pathway-v1-smoke"],
    build: ["build"]
  },
  {
    name: "academy-api",
    dir: "florence-academy/api",
    install: true,
    typecheck: ["typecheck"],
    test: ["test"],
    build: ["build"]
  },
  {
    name: "academy-web",
    dir: "florence-academy",
    install: true,
    typecheck: ["typecheck"],
    test: ["test"],
    build: ["build"]
  }
];

export const packageDirs = packageJobs.map((job) => job.dir);
