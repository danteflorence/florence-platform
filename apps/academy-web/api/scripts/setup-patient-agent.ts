// ───────────────────────────────────────────────────────────────────────────
// setup-patient-agent.ts - create (or update) the ONE pilot conversational
// patient on ElevenLabs Agents.
//
//   node --env-file=.env scripts/setup-patient-agent.ts
//
// Design decisions that matter:
//   - The agent's prompt receives ONLY what the PATIENT knows - name, age,
//     setting, how they feel, their own history. Never the diagnosis, never
//     the rubric, never expected actions. A patient structurally cannot leak
//     answers it was never given.
//   - Dynamic variables ({{patient_name}} etc.) are injected per session by
//     the player, so one agent serves every scenario and persona.
//   - Voice overrides are enabled so each session speaks in the persona's
//     cast voice (default: the Filipino warm female patient voice).
//   - LLM: ElevenLabs-hosted small/fast model for the pilot (our API isn't
//     publicly reachable from their servers until the GCP deploy; the custom-
//     LLM switch to our model gateway is the documented post-deploy step).
//
// Idempotent-ish: if ELEVENLABS_AGENT_ID is already set and exists, updates
// it in place instead of creating a duplicate.
// ───────────────────────────────────────────────────────────────────────────

const KEY = process.env["ELEVENLABS_API_KEY"] ?? "";
if (!KEY) {
  console.error("ELEVENLABS_API_KEY is not set (run with --env-file=.env)");
  process.exit(1);
}
const BASE = "https://api.elevenlabs.io";
const H = { "xi-api-key": KEY, "content-type": "application/json" };

const DEFAULT_PATIENT_VOICE = "6AUOG2nbfr0yFEeI0784"; // Filipino, warm (F) - cast patient voice
const DICT_ID = process.env["ELEVENLABS_DICTIONARY_ID"] ?? "";
const DICT_VERSION = process.env["ELEVENLABS_DICTIONARY_VERSION_ID"] ?? "";

const PROMPT = `You are playing a hospital patient in a nursing training simulation. Stay in character at all times.

WHO YOU ARE THIS SESSION
- Name: {{patient_name}}, age {{patient_age}}.
- Where you are: {{setting}}.
- How you feel right now, in your own words: {{feelings}}
- Your own medical history as you understand it: {{history}}
- Notes on how you speak and behave: {{persona_notes}}

HOW TO BEHAVE
- You are a real person who is unwell: answer the nurse's questions the way a patient would - briefly, sometimes vaguely, from your own bodily experience. One to three short sentences per turn.
- You only know what a patient knows. You do NOT know your diagnosis, lab values, medication doses, or what the nurse should do next. If asked, say things like "I don't know, you'd have to ask the doctor."
- Never give medical advice, never evaluate the nurse's performance, never mention that this is a simulation or that you are an AI, never break character.
- If the nurse is silent or you're unsure what was asked, respond as a patient would: "Sorry, what was that?"
- If you feel worse based on {{feelings}}, let it show in shorter, more effortful answers. If you feel better, sound relieved.
- If the nurse says goodbye, is leaving, or ends the encounter, respond briefly and use the end_call tool.`;

const FIRST_MESSAGE = "{{first_line}}";

const body = {
  name: "Florence Sim Patient (pilot)",
  conversation_config: {
    agent: {
      language: "en",
      first_message: FIRST_MESSAGE,
      prompt: {
        prompt: PROMPT,
        llm: "gemini-2.5-flash",
        temperature: 0.4,
      },
    },
    tts: {
      voice_id: DEFAULT_PATIENT_VOICE,
      model_id: "eleven_flash_v2", // English agents require turbo/flash v2
      // Clinical pronunciation dictionary - the same alias rules the
      // pre-rendered audio uses, so the live patient says "saline" (SAY-leen),
      // "edema", "titrate" etc. correctly. Without this the agent does raw TTS.
      ...(DICT_ID
        ? {
            pronunciation_dictionary_locators: [
              { pronunciation_dictionary_id: DICT_ID, ...(DICT_VERSION ? { version_id: DICT_VERSION } : {}) },
            ],
          }
        : {}),
    },
  },
  platform_settings: {
    auth: { enable_auth: true }, // signed URLs only - no anonymous public calls
    overrides: {
      conversation_config_override: {
        agent: { first_message: true },
        tts: { voice_id: true },
        conversation: { text_only: true }, // headless verify + low-bandwidth text fallback
      },
    },
  },
};

const existing = process.env["ELEVENLABS_AGENT_ID"] ?? "";
let res: Response;
if (existing) {
  res = await fetch(`${BASE}/v1/convai/agents/${existing}`, { method: "PATCH", headers: H, body: JSON.stringify(body) });
  if (res.status === 404) {
    console.log(`[agent] ${existing} not found; creating fresh`);
    res = await fetch(`${BASE}/v1/convai/agents/create`, { method: "POST", headers: H, body: JSON.stringify(body) });
  }
} else {
  res = await fetch(`${BASE}/v1/convai/agents/create`, { method: "POST", headers: H, body: JSON.stringify(body) });
}

const j = (await res.json()) as Record<string, unknown>;
if (!res.ok) {
  console.error(`[agent] ${res.status}:`, JSON.stringify(j, null, 2));
  process.exit(1);
}
const agentId = (j["agent_id"] ?? existing) as string;
console.log(`[agent] ready: ${agentId}`);
console.log(`\nAdd to api/.env (gitignored):\n  ELEVENLABS_AGENT_ID=${agentId}\n`);
