// Generate clinical-judgment walkthroughs for the question bank.
//
//   node scripts/generate-walkthroughs.ts --dry                 # report, write nothing
//   node scripts/generate-walkthroughs.ts --templated           # generator items → auto-approved
//   node scripts/generate-walkthroughs.ts --client-need pharmacological-therapies --limit 200
//   node scripts/generate-walkthroughs.ts --section 7 --calibrated
//
// Source = the question banks (src/assets/banks/*.json) - the same corpus the audio
// extractor reads. The bank's `correct` is the ANSWER KEY; correctness is taken from
// it, NEVER from the model. Templated items (lab-/dose-/drug-) are deterministic +
// auto-approved; everything else is AI-drafted to status='draft' for human QA.
// Idempotent: an unchanged walkthrough (content_hash) is skipped.
//
// NOTE: most generator items (lab/dose/drug) are computed in the frontend bank, not
// in the JSON banks, so the templated path mainly applies once those are exported to
// the corpus; it is fully exercised by test/walkthroughs.ts today.

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MemoryStore } from "../src/store.ts";
import type { Store } from "../src/store.ts";
import { getWalkthroughLlm, type WalkthroughDraftInput } from "../src/llm.ts";
import { isTemplatedId, templatedDraft, toUpsertInput, correctIndicesOf } from "../src/walkthroughGen.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const BANKS = join(HERE, "..", "..", "src", "assets", "banks");

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const dry = args.includes("--dry");
const templatedOnly = args.includes("--templated");
const calibratedOnly = args.includes("--calibrated");
const clientNeed = flag("--client-need");
const section = flag("--section");
const limit = Number(flag("--limit") ?? "0") || Infinity;

interface BankItem {
  id: string; type?: string; topic?: string; stem?: string;
  options?: unknown; correct?: unknown; clientNeed?: string; cjmm?: string;
  rationale?: string; section?: number; calibrated?: boolean;
}

function loadBankItems(): BankItem[] {
  if (!existsSync(BANKS)) { console.warn(`  no banks dir at ${BANKS}`); return []; }
  const out: BankItem[] = [];
  for (const f of readdirSync(BANKS).filter((n) => n.endsWith(".json"))) {
    try {
      const arr = JSON.parse(readFileSync(join(BANKS, f), "utf8"));
      if (Array.isArray(arr)) out.push(...arr);
    } catch { console.warn(`  skip ${f}: not valid JSON`); }
  }
  return out;
}

function eligible(q: BankItem): boolean {
  if (!q.id || !Array.isArray(q.options) || q.options.length === 0) return false; // need distractors
  if (q.correct === undefined) return false;
  if (templatedOnly && !isTemplatedId(q.id)) return false;
  if (clientNeed && q.clientNeed !== clientNeed) return false;
  if (section && String(q.section) !== section) return false;
  if (calibratedOnly && !q.calibrated) return false;
  return true;
}

const store: Store = new MemoryStore(); // dry/local; a real run targets Postgres via a wrapper script
const llm = getWalkthroughLlm();
const all = loadBankItems().filter(eligible);
console.log(`[walkthroughs] ${all.length} eligible bank items${templatedOnly ? " (templated only)" : ""}; llm=${llm.mode}`);

let templated = 0, drafted = 0, fresh = 0, chars = 0, n = 0;
for (const q of all) {
  if (n >= limit) break;
  const options = (q.options as unknown[]).map((o) => (typeof o === "string" ? o : String((o as any)?.text ?? o)));
  const input: WalkthroughDraftInput = {
    questionId: q.id,
    topic: q.topic ?? "NCLEX item",
    stem: q.stem ?? "",
    options,
    correctIndices: correctIndicesOf(q.correct, options.length),
    clientNeed: q.clientNeed ?? "management-of-care",
    cjmm: q.cjmm ?? null,
    rationale: q.rationale ?? "",
  };
  if (input.correctIndices.length === 0) continue;
  const isTemplated = isTemplatedId(q.id);
  const draft = isTemplated ? templatedDraft(input) : await llm.draftWalkthrough(input);
  const upsert = toUpsertInput(input, draft, { provenance: isTemplated ? "templated" : "ai_drafted", model: isTemplated ? "templated" : llm.model });
  chars += JSON.stringify(upsert.clinical_judgment).length + JSON.stringify(upsert.answer_choice_analysis).length;
  if (!dry) {
    const before = await store.walkthroughs.get(q.id);
    const saved = await store.walkthroughs.upsert(upsert);
    if (before && before.content_hash === saved.content_hash) fresh += 1;
    else if (isTemplated) templated += 1; else drafted += 1;
  } else {
    if (isTemplated) templated += 1; else drafted += 1;
  }
  n += 1;
}

console.log(`[walkthroughs] ${dry ? "DRY - would process" : "processed"} ${n}: templated(auto-approved)=${templated}, ai-drafted=${drafted}, unchanged=${fresh}`);
console.log(`[walkthroughs] ~${Math.round(chars / 14 / 3600 * 10) / 10}h of walkthrough narration if all approved + voiced (est.)`);
if (!dry && drafted > 0) console.log(`[walkthroughs] ${drafted} AI drafts await two-stage QA (sme-review → approve) before audio.`);
process.exit(0);
