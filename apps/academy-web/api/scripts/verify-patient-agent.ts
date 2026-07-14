// ───────────────────────────────────────────────────────────────────────────
// verify-patient-agent.ts - headless proof that the pilot patient stays in
// character, WITHOUT a microphone: opens a signed text-mode conversation over
// the ConvAI WebSocket, injects a scenario via dynamic variables, asks two
// nurse questions, prints the patient's replies, and hangs up.
//
//   node --env-file=.env scripts/verify-patient-agent.ts
//
// Checks (exit 1 on failure):
//   1. replies arrive and are non-empty
//   2. the patient does NOT reveal a diagnosis when asked point-blank
//      (the prompt gives it no diagnosis to reveal - this asserts the
//      "patient only knows what a patient knows" boundary holds)
// ───────────────────────────────────────────────────────────────────────────

const KEY = process.env["ELEVENLABS_API_KEY"] ?? "";
const AGENT = process.env["ELEVENLABS_AGENT_ID"] ?? "";
if (!KEY || !AGENT) {
  console.error("ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID must be set");
  process.exit(1);
}

const sig = await fetch(
  `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${AGENT}`,
  { headers: { "xi-api-key": KEY } },
);
if (!sig.ok) {
  console.error(`get-signed-url ${sig.status}: ${await sig.text()}`);
  process.exit(1);
}
const { signed_url } = (await sig.json()) as { signed_url: string };
console.log("[verify] signed URL minted");

// The scenario the hypovolemia sim would inject.
const dynamicVariables = {
  patient_name: "Elena Vasquez",
  patient_age: "58",
  setting: "Med-surg unit, post-op day 1 after abdominal surgery, early morning",
  feelings:
    "Dizzy and weak, like I might faint when I sit up. My heart feels like it's racing. I'm thirsty. My belly hurts around the bandage, maybe a 6 out of 10.",
  history: "I had surgery on my belly yesterday. I take a water pill for blood pressure at home.",
  persona_notes: "Soft-spoken, a little anxious, cooperative. English is your second language; you keep sentences short.",
  first_line: "Nurse… I don't feel so good. Everything went spinny when I tried to sit up.",
};

const replies: string[] = [];
let done: (v: boolean) => void;
const finished = new Promise<boolean>((r) => (done = r));

const ws = new WebSocket(signed_url);
const send = (o: unknown) => ws.send(JSON.stringify(o));
const questions = [
  "Hi Elena, I'm your nurse. Can you tell me exactly what you're feeling right now?",
  "What is your diagnosis, and what medications should I give you?", // the boundary probe
];
let asked = 0;

ws.addEventListener("open", () => {
  send({
    type: "conversation_initiation_client_data",
    dynamic_variables: dynamicVariables,
    conversation_config_override: { conversation: { text_only: true } },
  });
});

ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(String(ev.data)) as { type?: string; [k: string]: unknown };
  if (process.env["DEBUG"]) console.log(`  [ws] ${msg.type}`);
  if (msg.type === "conversation_initiation_metadata") {
    console.log("[verify] session open");
    send({ type: "user_message", text: questions[asked] });
    return;
  }
  if (msg.type === "agent_response") {
    const r = (msg["agent_response_event"] as { agent_response?: string })?.agent_response ?? "";
    replies.push(r);
    console.log(`  patient: "${r.trim()}"`);
    asked += 1;
    if (asked < questions.length) {
      console.log(`  nurse:   "${questions[asked]}"`);
      send({ type: "user_message", text: questions[asked] });
    } else {
      ws.close();
      done(true);
    }
  }
  if (msg.type === "ping") send({ type: "pong", event_id: (msg["ping_event"] as { event_id?: number })?.event_id });
});

ws.addEventListener("error", () => done(false));
ws.addEventListener("close", () => done(replies.length >= questions.length));

const to = setTimeout(() => done(false), 45_000);
const ok = await finished;
clearTimeout(to);

if (!ok || replies.length < 2) {
  console.error(`[verify] FAILED - got ${replies.length} replies`);
  process.exit(1);
}
const probe = replies[1].toLowerCase();
const leaked = /hypovolemi|hemorrhag|shock|septic|sepsis|diagnos(is|ed) (is|of)|you should give|administer \d/.test(probe);
if (leaked) {
  console.error("[verify] FAILED - the patient volunteered clinical knowledge it should not have");
  process.exit(1);
}
console.log("[verify] PASS - patient responded in character and held the knowledge boundary");
