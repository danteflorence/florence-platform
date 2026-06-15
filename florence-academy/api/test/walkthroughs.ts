// In-process test of the clinical-judgment walkthrough engine (no network, no keys):
// templated auto-approve → narration → mock-audio-eligible; AI draft → QA approve →
// eligible; the invariant that NON-approved walkthroughs never become audio; idempotency.

import { strict as assert } from "node:assert";
import { MemoryStore } from "../src/store.ts";
import { getWalkthroughLlm, type WalkthroughDraftInput } from "../src/llm.ts";
import { templatedDraft, toUpsertInput, correctIndicesOf, isTemplatedId } from "../src/walkthroughGen.ts";
import { walkthroughAudioItems, walkthroughScript, coachingScript } from "../src/walkthroughNarration.ts";
import { isWalkthroughEligible } from "../src/walkthroughTypes.ts";

let passed = 0;
const ok = (label: string) => { passed++; console.log(`  ✓ ${label}`); };

const store = new MemoryStore();

// --- 1) Templated (lab) item → auto-approved, narration, audio-eligible ----------
const lab: WalkthroughDraftInput = {
  questionId: "lab-potassium-below", topic: "Serum potassium", stem: "K+ is 2.9 mEq/L. Interpretation?",
  options: ["Below normal", "Within normal limits", "Above normal"], correctIndices: [0],
  clientNeed: "reduction-of-risk", cjmm: "analyze-cues", rationale: "Normal K+ is 3.5–5.0; 2.9 is hypokalemia.",
};
assert.equal(isTemplatedId(lab.questionId), true);
const labWt = await store.walkthroughs.upsert(toUpsertInput(lab, templatedDraft(lab), { provenance: "templated", model: "templated" }));
assert.equal(labWt.status, "approved");
assert.equal(labWt.provenance, "templated");
assert.equal(labWt.answer_choice_analysis[0]!.isCorrect, true);
assert.equal(labWt.answer_choice_analysis[1]!.isCorrect, false);
assert.ok(labWt.answer_choice_analysis[1]!.error_type_if_chosen, "distractor has an error type");
ok("templated lab item → auto-approved with per-option isCorrect + error type");

// narration builds + has why-correct and why-not
const narr = walkthroughScript({ topic: lab.topic, options: lab.options }, labWt);
assert.match(narr, /Recognize cues/i);
assert.match(narr, /is correct/i);
assert.match(narr, /Why not the others/i);
ok("walkthrough narration includes the 6 steps + why-correct + why-not");
const coach = coachingScript({ topic: lab.topic, options: lab.options }, labWt, 1);
assert.ok(coach && /option B/i.test(coach), "coaching script targets the chosen distractor");
assert.equal(coachingScript({ topic: lab.topic, options: lab.options }, labWt, 0), null, "no coaching for the correct option");
ok("per-distractor coaching builds; none for the correct option");

// --- 2) AI draft (MC bank item) → draft (not eligible) → approve → eligible -------
const mc: WalkthroughDraftInput = {
  questionId: "fab-00042", topic: "Sepsis priority", stem: "Septic patient, new confusion + BP 84/50. First action?",
  options: ["Give IV fluids", "Document findings", "Reassess in 1 hour", "Call dietitian"], correctIndices: [0],
  clientNeed: "physiological-adaptation", cjmm: "take-actions", rationale: "Hypotension + acute change → restore perfusion first.",
};
const llm = getWalkthroughLlm();
assert.equal(llm.mode, "heuristic"); // no ANTHROPIC_API_KEY in CI
const draft = await llm.draftWalkthrough(mc);
const mcWt = await store.walkthroughs.upsert(toUpsertInput(mc, draft, { provenance: "ai_drafted", model: llm.model }));
assert.equal(mcWt.status, "draft");
assert.equal(isWalkthroughEligible(mcWt), false);
assert.equal(mcWt.answer_choice_analysis[0]!.isCorrect, true); // from the answer key, not the model
ok("AI-drafted MC item → draft (NOT eligible), isCorrect from the answer key");

const reviewed = await store.walkthroughs.setStatus("fab-00042", "sme_reviewed", "educator@florence");
assert.equal(reviewed!.sme_reviewed_by, "educator@florence");
const approved = await store.walkthroughs.setStatus("fab-00042", "approved", "editor@florence");
assert.equal(approved!.status, "approved");
assert.equal(approved!.approved_by, "editor@florence");
assert.equal(isWalkthroughEligible(approved!), true);
ok("two-stage QA: sme-review → approve stamps both reviewers + becomes eligible");

// --- 3) Invariant: only approved walkthroughs produce audio -----------------------
// Add a third, left as draft; the audio builder must be fed ONLY approved rows.
const draftOnly: WalkthroughDraftInput = { ...mc, questionId: "fab-99999" };
await store.walkthroughs.upsert(toUpsertInput(draftOnly, await llm.draftWalkthrough(draftOnly), { provenance: "ai_drafted", model: llm.model }));
const qMeta = new Map<string, { topic: string; options: string[] }>([
  [lab.questionId, { topic: lab.topic, options: lab.options }],
  [mc.questionId, { topic: mc.topic, options: mc.options }],
  [draftOnly.questionId, { topic: draftOnly.topic, options: draftOnly.options }],
]);
const approvedList = await store.walkthroughs.listApproved();
const audio = walkthroughAudioItems(approvedList, (id) => qMeta.get(id));
const audioQids = new Set(audio.map((a) => a.refId.split("#")[0]));
assert.ok(audioQids.has("lab-potassium-below") && audioQids.has("fab-00042"), "approved items get audio");
assert.equal(audioQids.has("fab-99999"), false, "the draft-only item gets NO audio");
assert.ok(audio.some((a) => a.kind === "walkthrough") && audio.some((a) => a.kind === "coaching"), "emits both walkthrough + coaching clips");
ok("audio ⊆ approved — the draft-only walkthrough is never voiced");

// --- 4) Idempotency: re-upserting identical content is a no-op --------------------
const again = await store.walkthroughs.upsert(toUpsertInput(lab, templatedDraft(lab), { provenance: "templated", model: "templated" }));
assert.equal(again.content_hash, labWt.content_hash);
assert.equal(again.updated_at, labWt.updated_at, "unchanged content → not rewritten");
ok("idempotent: identical content_hash is a no-op");

// --- 5) correctIndicesOf normalizes single + multi answer keys --------------------
assert.deepEqual(correctIndicesOf(2, 4), [2]);
assert.deepEqual(correctIndicesOf([0, 3], 4), [0, 3]);
assert.deepEqual(correctIndicesOf(9, 4), []); // out of range dropped
ok("answer-key normalization (single + SATA + out-of-range)");

// --- 6) item analytics: per-response capture → rollup ----------------------------
for (const [opt, correct] of [[0, true], [1, false], [1, false], [2, false], [0, true]] as [number, boolean][]) {
  await store.questionResponses.record({ candidate_id: "c1", question_id: "fab-00042", chosen_option_index: opt, correct, walkthrough_seen: true });
}
const an = await store.questionResponses.analytics("fab-00042");
assert.equal(an.attempts, 5);
assert.equal(an.correct, 2);
assert.equal(Math.round((an.pass_rate ?? 0) * 100), 40);
assert.equal(an.most_common_wrong, 1, "option B is the most common wrong answer");
assert.equal(an.by_option[1], 2);
assert.equal(an.walkthrough_seen_rate, 1);
ok("item analytics: attempts/pass-rate/most-common-wrong/by-option roll up correctly");

console.log(`\nPASS — ${passed} checks`);
process.exit(0);
