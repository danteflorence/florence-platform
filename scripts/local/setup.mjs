import { copyFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const envPath = resolve(root, ".env.local");
const templatePath = resolve(root, ".env.local.example");

if (!existsSync(envPath)) {
  copyFileSync(templatePath, envPath);
  console.log("Created .env.local from .env.local.example.");
} else {
  console.log(".env.local already exists; leaving it unchanged.");
}

const docker = spawnSync("docker", ["compose", "version"], {
  cwd: root,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

if (docker.status === 0) {
  console.log("Docker Compose is available.");
} else {
  console.log("Docker Compose was not detected from this shell. Open Docker Desktop, then run the next commands.");
}

console.log("");
console.log("Next:");
console.log("  pnpm dev");
console.log("  pnpm db:seed");
console.log("  pnpm smoke:local");
