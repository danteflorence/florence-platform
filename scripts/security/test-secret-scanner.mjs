import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const scanner = join(process.cwd(), "scripts/security/scan-secrets.mjs");

function run(args) {
  return spawnSync(process.execPath, [scanner, ...args], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
}

const clean = run([]);
if (clean.status !== 0) {
  process.stderr.write(clean.stdout);
  process.stderr.write(clean.stderr);
  throw new Error("expected current repository secret scan to pass");
}

const tmp = mkdtempSync(join(tmpdir(), "florencern-secret-scan-"));
mkdirSync(join(tmp, "src"));
writeFileSync(
  join(tmp, "src", "leaked.env"),
  `OPENAI_API_KEY=${"sk-proj-" + "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"}\n`,
  "utf8"
);

const detected = run(["--root", tmp, "--all-files"]);
if (detected.status === 0) {
  process.stdout.write(detected.stdout);
  throw new Error("expected scanner to fail when a high-confidence secret is present");
}
if (!/openai api key|secret assignment/i.test(`${detected.stdout}\n${detected.stderr}`)) {
  process.stderr.write(detected.stdout);
  process.stderr.write(detected.stderr);
  throw new Error("scanner failed without reporting the expected secret finding");
}

console.log("Secret scanner regression test passed.");
