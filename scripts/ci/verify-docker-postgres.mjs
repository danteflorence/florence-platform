import { spawnSync } from "node:child_process";

const services = ["postgres", "core-api", "academy-api", "academy-live", "pathway-api", "economist-api", "employer-connect-api"];
const checks = [
  ["core-api", "http://127.0.0.1:8080/health"],
  ["academy-api", "http://127.0.0.1:8088/health"],
  ["pathway-api", "http://127.0.0.1:8787/api/health"],
  ["employer-connect-api", "http://127.0.0.1:8788/api/health"],
];
const portBase = Number(process.env.FLORENCE_VERIFY_PORT_BASE ?? 30000 + (process.pid % 10000));
const dockerEnv = {
  ...process.env,
  COMPOSE_PROJECT_NAME: process.env.COMPOSE_PROJECT_NAME ?? "florence-db-verify",
  POSTGRES_PORT: process.env.POSTGRES_PORT ?? String(portBase),
  CORE_API_PORT: process.env.CORE_API_PORT ?? String(portBase + 1),
  ACADEMY_API_PORT: process.env.ACADEMY_API_PORT ?? String(portBase + 2),
  ACADEMY_LIVE_PORT: process.env.ACADEMY_LIVE_PORT ?? String(portBase + 3),
  APP_WEB_PORT: process.env.APP_WEB_PORT ?? String(portBase + 4),
  PATHWAY_API_PORT: process.env.PATHWAY_API_PORT ?? String(portBase + 5),
  EMPLOYER_CONNECT_API_PORT: process.env.EMPLOYER_CONNECT_API_PORT ?? String(portBase + 6),
  ECONOMIST_API_PORT: process.env.ECONOMIST_API_PORT ?? String(portBase + 7),
  POSTGRES_USER: process.env.POSTGRES_USER ?? "florence",
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD ?? "local",
  FIELD_ENC_PASSPHRASE: process.env.FIELD_ENC_PASSPHRASE ?? "local",
  DEMO_CLIENT_SECRET: process.env.DEMO_CLIENT_SECRET ?? "local",
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET ?? "local",
  ATS_CONNECT_VAULT_KEY: process.env.ATS_CONNECT_VAULT_KEY ?? "local",
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    encoding: "utf8",
    env: dockerEnv,
    ...options,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function capture(command, args) {
  return spawnSync(command, args, { cwd: process.cwd(), encoding: "utf8", env: dockerEnv });
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function waitForHealth(service, url) {
  const script = `const res = await fetch(${JSON.stringify(url)}); const body = await res.text(); if (!res.ok) { console.error(body); process.exit(1); } const json = JSON.parse(body); if (!json.database?.backend || !json.database?.migration?.ok) { console.error(JSON.stringify(json)); process.exit(1); } console.log(${JSON.stringify(service)} + ' database health OK: ' + json.database.backend);`;
  let last = "";
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    const result = spawnSync("docker", ["compose", "exec", "-T", service, "node", "-e", script], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: dockerEnv,
    });
    if (result.status === 0) {
      process.stdout.write(result.stdout);
      process.stderr.write(result.stderr);
      return;
    }
    last = `${result.stdout}\n${result.stderr}`.trim();
    sleep(2000);
  }
  console.error(last || `${service} health check did not pass`);
  process.exit(1);
}

const docker = capture("docker", ["--version"]);
if (docker.status !== 0) {
  console.error("Docker is required for live Postgres validation but is not available.");
  process.exit(1);
}

run("docker", ["compose", "down", "-v", "--remove-orphans"]);
run("docker", ["compose", "up", "-d", "--build", ...services]);

for (const [service, url] of checks) waitForHealth(service, url);

console.log("Docker Postgres validation passed.");
