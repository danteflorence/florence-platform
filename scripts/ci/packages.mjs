export const packageJobs = [
  {
    name: "core",
    dir: "apps/core-api",
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
    dir: "apps/employer-connect-api",
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
      "pii-url-smoke",
      "audit-redaction-smoke",
      "webhook-signature-smoke",
      "no-pii-error-smoke"
    ],
    build: ["build"]
  },
  {
    name: "pathway-agent",
    dir: "apps/pathway-api",
    install: true,
    typecheck: ["typecheck"],
    test: ["pathway-v1-smoke", "audit-redaction-smoke", "no-pii-error-smoke"],
    build: ["build"]
  },
  {
    name: "economist-api",
    dir: "packages/economist-api",
    install: false,
    typecheck: ["typecheck"],
    test: ["test", "data:nashp:validate"],
    build: ["build"]
  },
  {
    name: "economist-app",
    dir: "apps/economist-app",
    install: false,
    typecheck: ["typecheck"],
    test: ["test"],
    build: ["build"]
  },
  {
    name: "app-web",
    dir: "apps/app-web",
    install: true,
    typecheck: ["typecheck"],
    test: ["test"],
    build: ["build"]
  },
  {
    name: "academy-api",
    dir: "apps/academy-web/api",
    install: true,
    typecheck: ["typecheck"],
    test: ["test"],
    build: ["build"]
  },
  {
    name: "academy-web",
    dir: "apps/academy-web",
    install: true,
    typecheck: ["typecheck"],
    test: ["test"],
    build: ["build"]
  }
];

export const packageDirs = packageJobs.map((job) => job.dir);
