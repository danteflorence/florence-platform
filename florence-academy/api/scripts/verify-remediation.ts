// In-process verification of the closed-loop remediation dispatch (API side):
// an assessment with a weak subscale auto-assigns remediation; the assignment is
// idempotent, listable, and clearable; a strong subscale assigns nothing.
//
//   node scripts/verify-remediation.ts

import { MemoryStore } from "../src/store.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
  cond ? (pass += 1) : (fail += 1);
};

const store = new MemoryStore();
const candidate_id = "cand_test";

// Mastery from a session: weak in physiological-adaptation + analyze-cues, strong elsewhere.
const mastery = [
  { dim: "client_need", key: "physiological-adaptation", theta: -0.9, se: 0.3, passProb: 0.28, items: 6 },
  { dim: "client_need", key: "pharmacological-therapies", theta: 0.8, se: 0.3, passProb: 0.85, items: 6 },
  { dim: "client_need", key: "safety-infection-control", theta: -1.5, se: 0.6, passProb: 0.2, items: 2 }, // too few items
  { dim: "cjmm", key: "analyze-cues", theta: -0.6, se: 0.3, passProb: 0.32, items: 5 },
];

const r = await store.assessmentResults.create({ candidate_id, kind: "adaptive_exam", readiness: 0.5, theta: 0, mastery });
ok("assessment persisted with mastery", Array.isArray(r.mastery) && r.mastery!.length === 4);

// Mirror the route's dispatch criteria (θ < 0 and items >= 4).
const THRESH = 0.0, MIN = 4;
for (const m of mastery) {
  if (m.items >= MIN && m.theta < THRESH) {
    await store.remediations.dispatch({ candidate_id, dim: m.dim as "client_need" | "cjmm", key: m.key, theta: m.theta, pass_prob: m.passProb });
  }
}

let list = await store.remediations.listByCandidate(candidate_id);
ok("two weak subscales auto-assigned", list.length === 2, list.map((x) => x.key).join("+"));
ok("strong subscale NOT assigned", !list.some((x) => x.key === "pharmacological-therapies"));
ok("low-evidence subscale NOT assigned (insufficient items)", !list.some((x) => x.key === "safety-infection-control"));
ok("CJMM gap assigned", list.some((x) => x.dim === "cjmm" && x.key === "analyze-cues"));

// Idempotency: re-dispatch the same gap → no duplicate, metrics refreshed.
await store.remediations.dispatch({ candidate_id, dim: "client_need", key: "physiological-adaptation", theta: -0.4, pass_prob: 0.4 });
list = await store.remediations.listByCandidate(candidate_id);
ok("re-dispatch does not duplicate", list.filter((x) => x.key === "physiological-adaptation").length === 1);
ok("re-dispatch refreshes the gap θ", list.find((x) => x.key === "physiological-adaptation")!.theta === -0.4);

// Clear one.
const cleared = await store.remediations.setStatus(candidate_id, "cjmm", "analyze-cues", "cleared");
ok("clear sets status=cleared", cleared?.status === "cleared");

// After clearing, a new dispatch re-opens it (status assigned again).
await store.remediations.dispatch({ candidate_id, dim: "cjmm", key: "analyze-cues", theta: -0.7, pass_prob: 0.3 });
list = await store.remediations.listByCandidate(candidate_id);
ok("re-dispatch after clear re-opens (assigned)", list.find((x) => x.key === "analyze-cues")!.status === "assigned");

console.log(`\n${fail ? "REMEDIATION FAILED" : "REMEDIATION PASSED"} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
