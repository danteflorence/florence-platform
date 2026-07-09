import { existsSync, lstatSync, readdirSync, rmSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";

const startRoot = process.cwd();
const targets = process.argv.slice(2);
const defaultTargets = ["apps", "packages"].filter((dir) => existsSync(join(startRoot, dir)));
const roots = (targets.length > 0 ? targets : defaultTargets).map((target) => resolve(startRoot, target));

const removableDirs = new Set(["dist", "build", ".next", ".vite", "coverage"]);
const skippedDirs = new Set([".git", "node_modules", ".toolchain", "extracted", "labor-economics-agent"]);
const removed = [];

function removePath(path) {
  rmSync(path, { recursive: true, force: true });
  removed.push(relative(startRoot, path) || ".");
}

function scan(path) {
  if (!existsSync(path)) return;

  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) return;

  if (stat.isFile()) {
    if (path.endsWith(".tsbuildinfo")) removePath(path);
    return;
  }

  if (!stat.isDirectory()) return;

  const name = basename(path);
  if (skippedDirs.has(name)) return;
  if (removableDirs.has(name)) {
    removePath(path);
    return;
  }

  for (const entry of readdirSync(path)) {
    scan(join(path, entry));
  }
}

for (const root of roots) scan(root);

if (removed.length === 0) {
  console.log("No generated artifacts found.");
} else {
  console.log(`Removed ${removed.length} generated artifact path(s):`);
  for (const path of removed) console.log(`- ${path}`);
}
