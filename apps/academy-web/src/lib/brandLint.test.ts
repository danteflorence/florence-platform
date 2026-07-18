import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/** Brand copy rules (operator-set, 2026-07):
 *  1. No em dashes anywhere, ever, for any reason.
 *  2. The sim feature is "intelligent patient simulation" (no talking-back framing).
 *  3. The offer promise is "stay in class until you pass", never a fixed-months window.
 *  Vendored files (coreAuth.ts) are exempt: we do not edit vendored code.
 *  Banned patterns are built from escape sequences so this file passes its own scan.
 */

const ROOT = join(__dirname, "..", "..");

const SCAN_DIRS = [join(ROOT, "src"), join(ROOT, "api", "src")];
const SCAN_FILES = [join(ROOT, "index.html")];
const EXT = new Set([".ts", ".tsx", ".json", ".html"]);
const EXEMPT = new Set(["api/src/coreAuth.ts"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (EXT.has(p.slice(p.lastIndexOf(".")))) out.push(p);
  }
  return out;
}

function scanFiles(): { file: string; text: string }[] {
  const files = [...SCAN_DIRS.flatMap((d) => walk(d)), ...SCAN_FILES];
  return files
    .map((p) => ({ file: relative(ROOT, p), text: readFileSync(p, "utf8") }))
    .filter((f) => !EXEMPT.has(f.file));
}

function offenders(re: RegExp): string[] {
  const hits: string[] = [];
  for (const { file, text } of scanFiles()) {
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      if (re.test(line)) hits.push(`${file}:${i + 1}: ${line.trim().slice(0, 120)}`);
    });
  }
  return hits;
}

const EM_DASH = new RegExp("\\u2014|&" + "mdash;");
const TALK_BACK = new RegExp("talks? " + "back", "i");
const FIXED_MONTHS = new RegExp("12 " + "months of (live|scheduled|access|class)", "i");

describe("brand copy lint", () => {
  it("contains no em dashes (U+2014 or the HTML entity)", () => {
    expect(offenders(EM_DASH)).toEqual([]);
  });

  it("never uses the talking-back framing (say: intelligent patient simulation)", () => {
    expect(offenders(TALK_BACK)).toEqual([]);
  });

  it("never frames the offer as a fixed number of months", () => {
    expect(offenders(FIXED_MONTHS)).toEqual([]);
  });
});
