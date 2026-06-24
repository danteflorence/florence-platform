import { readdirSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, join, relative, sep } from "node:path";

const args = new Set(process.argv.slice(2));
const rootArgIndex = process.argv.indexOf("--root");
const root = rootArgIndex >= 0 ? process.argv[rootArgIndex + 1] : process.cwd();
const allFiles = args.has("--all-files") || !isGitRepo(root);
const maxBytes = 1024 * 1024;
const explicitFiles = process.argv
  .slice(2)
  .filter((arg, index, all) => arg !== "--all-files" && arg !== "--root" && all[index - 1] !== "--root" && !arg.startsWith("--"));

const skippedDirs = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".terraform",
  ".toolchain",
  ".vite",
  "extracted",
  "labor-economics-agent"
]);

const privateKeyPattern = new RegExp("-----BEGIN (?:RSA |EC |OPENSSH |DSA |)?PRIVATE " + "KEY-----");
const googlePrivateKeyPattern = new RegExp('"private_key"\\s*:\\s*"-----BEGIN PRIVATE ' + 'KEY-----');

const secretPatterns = [
  { name: "private key", pattern: privateKeyPattern },
  { name: "aws access key", pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { name: "github token", pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}\b/ },
  { name: "github fine-grained token", pattern: /\bgithub_pat_[A-Za-z0-9_]{60,}\b/ },
  { name: "openai api key", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/ },
  { name: "anthropic api key", pattern: /\bsk-ant-[A-Za-z0-9_-]{32,}\b/ },
  { name: "stripe secret key", pattern: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}\b/ },
  { name: "stripe webhook secret", pattern: /\bwhsec_[A-Za-z0-9]{20,}\b/ },
  { name: "slack token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
  { name: "google service account private key", pattern: googlePrivateKeyPattern }
];

const secretAssignmentNames = [
  "api_key",
  "apikey",
  "client_secret",
  "database_url",
  "field_enc_passphrase",
  "jwt_secret",
  "password",
  "private_key",
  "secret",
  "token",
  "vault_key",
  "webhook_secret"
];

const safeValuePatterns = [
  /^$/,
  /^\$\{\{[^}]+\}\}$/,
  /^\$\{[^}]+\}$/,
  /^<[^>]+>$/,
  /^__[^_]+(?:_[^_]+)*__$/,
  /^(?:changeme|change-me|placeholder|example|dummy|fake|local|test|todo|unset|null|none|false|true)$/i,
  /^(?:your|set|replace|fill|copy|leave)[-_A-Za-z0-9]*$/i
];

function isGitRepo(dir) {
  const result = spawnSync("git", ["-C", dir, "rev-parse", "--is-inside-work-tree"], { encoding: "utf8" });
  return result.status === 0 && result.stdout.trim() === "true";
}

function trackedFiles(dir) {
  const result = spawnSync("git", ["-C", dir, "ls-files"], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || "git ls-files failed");
  return result.stdout.split("\n").filter(Boolean);
}

function walk(dir, base = dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (skippedDirs.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full, base));
    } else if (entry.isFile()) {
      files.push(relative(base, full));
    }
  }
  return files;
}

function isAllowedEnvTemplate(path) {
  const name = basename(path);
  return name === ".env.example" || name === ".env.SAFETY_NOTICE.md" || name.endsWith(".example") || name.endsWith(".example.md");
}

function isBlockedEnvFile(path) {
  const name = basename(path);
  return (name === ".env" || name.startsWith(".env.") || name === ".en") && !isAllowedEnvTemplate(path);
}

function readText(path) {
  const full = join(root, path);
  const stat = statSync(full);
  if (stat.size > maxBytes) return null;
  const buffer = readFileSync(full);
  if (buffer.includes(0)) return null;
  return buffer.toString("utf8");
}

function looksSuspiciousAssignment(line) {
  const match = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*(?:API_KEY|APIKEY|CLIENT_SECRET|DATABASE_URL|FIELD_ENC_PASSPHRASE|JWT_SECRET|PASSWORD|PRIVATE_KEY|SECRET|TOKEN|VAULT_KEY|WEBHOOK_SECRET)[A-Z0-9_]*)\s*[:=]\s*["']?([^"'\s#]+)["']?\s*$/);
  if (!match) return false;
  const key = match[1].toLowerCase();
  const value = match[2].trim().replace(/[;,]$/, "");
  if (
    key.includes("secret_id") ||
    key.includes("secret_hash") ||
    key.includes("password_hash") ||
    key.includes("token_endpoint") ||
    key.includes("endpoint")
  ) {
    return false;
  }
  if (!secretAssignmentNames.some((name) => key.includes(name))) return false;
  if (value.includes("${")) return false;
  if (safeValuePatterns.some((pattern) => pattern.test(value))) return false;
  if (/[()]/.test(value)) return false;
  if (/^(?:process|config|input|var|local|each|random_|google_|data\.)/i.test(value)) return false;
  if (/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+!?$/i.test(value)) return false;
  if (value.length < 20 && !/^(?:postgres|mysql|mongodb|redis):\/\//i.test(value)) return false;
  return true;
}

const findings = [];
const files = explicitFiles.length > 0 ? explicitFiles : allFiles ? walk(root) : trackedFiles(root);

for (const file of files) {
  if (file.split(sep).some((part) => skippedDirs.has(part))) continue;
  if (isBlockedEnvFile(file)) {
    findings.push({ file, line: 1, kind: "committed env file", text: "Do not commit local env files." });
    continue;
  }

  let text;
  try {
    text = readText(file);
  } catch {
    continue;
  }
  if (text == null) continue;

  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const { name, pattern } of secretPatterns) {
      if (pattern.test(line)) {
        findings.push({ file, line: index + 1, kind: name, text: "Secret-like value detected." });
      }
    }
    if (looksSuspiciousAssignment(line)) {
      findings.push({ file, line: index + 1, kind: "secret assignment", text: "Secret-like assignment detected." });
    }
  });
}

if (findings.length > 0) {
  console.error("Secret scan failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} [${finding.kind}] ${finding.text}`);
  }
  process.exit(1);
}

console.log(`Secret scan passed (${files.length} files checked).`);
