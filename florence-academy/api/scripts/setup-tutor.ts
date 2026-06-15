// Create the FlorenceRN voice tutor — an ElevenLabs Conversational-AI agent the
// learner can TALK TO ("walk me through why it's C"). Prints the agent_id to set
// as ELEVENLABS_AGENT_ID; the API then mints per-learner signed URLs at
// /v1/tutor/session and the SPA opens a live voice conversation.
//
//   node scripts/setup-tutor.ts          # live (needs ELEVENLABS_API_KEY)
//   node scripts/setup-tutor.ts --dry    # print the agent prompt, create nothing
//
// The agent's system prompt encodes the NCLEX tutor persona + the Clinical
// Judgment Measurement Model. Knowledge (rationales) can be attached later in
// the ElevenLabs dashboard as a knowledge base for retrieval-grounded answers.

import { createTutorAgent, elevenlabsConfigured, voiceConfig } from "../src/elevenlabs.ts";

const dry = process.argv.includes("--dry");

const PROMPT = `You are FlorenceRN — a warm, encouraging nurse educator and guide for internationally educated nurses (Philippines, India, Nigeria, UK, Kenya, Ghana) preparing for the NCLEX-RN. "FlorenceRN" is your name; never refer to yourself as a "tutor" or "assistant" — you are FlorenceRN.

Your job:
- Explain WHY an answer is correct and why the distractors are wrong, in plain, calm language.
- Teach test-taking through the NCSBN Clinical Judgment Measurement Model: recognize cues, analyze cues, prioritize hypotheses, generate solutions, take actions, evaluate outcomes.
- Use clinical reasoning frameworks (ABCs, Maslow, safety, nursing process: assess before intervene) when prioritizing.
- Keep answers short and spoken-friendly: 2–4 sentences, then check understanding.

Guardrails:
- You teach exam reasoning; you do NOT give individualized medical advice or replace clinical judgment in real patient care.
- If asked something outside NCLEX prep, gently redirect.
- Never claim to be human. If unsure, say so and suggest reviewing the rationale or asking a live instructor.
- Be culturally aware and confidence-building; many learners are excellent nurses translating their knowledge into the NCLEX format.`;

const FIRST = "Hi, I'm FlorenceRN. Ask me about any question, topic, or why an answer is right — what are we working on?";

const vc = voiceConfig();
console.log(`[tutor] FlorenceRN NCLEX voice tutor  (voice=${vc.voiceId})`);

if (dry || !elevenlabsConfigured()) {
  console.log(dry ? "  --dry: not creating." : "  ELEVENLABS_API_KEY not set — printing prompt, not creating.");
  console.log("\n--- system prompt ---\n" + PROMPT + "\n");
  console.log("--- first message ---\n" + FIRST + "\n");
  process.exit(0);
}

const id = await createTutorAgent({ name: "FlorenceRN", prompt: PROMPT, firstMessage: FIRST, voiceId: vc.voiceId });
console.log(`\n  created agent_id=${id}\n`);
console.log(`  Set it and restart the API:`);
console.log(`    export ELEVENLABS_AGENT_ID=${id}`);
console.log(`  Then the SPA's "Ask the tutor" button goes live.`);
process.exit(0);
