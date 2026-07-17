# Live Conversational Patient — Pilot (ElevenLabs Agents)

_Status: built + verified 2026-07-13. OFF by default; enabled per environment by two env vars._

The virtual-patient sim's "ask the patient" now has a live-voice tier: the
learner speaks out loud and the patient answers in the persona's voice with
real turn-taking and interruption. Powered by ElevenLabs Agents; strictly a
pilot until the cost and QA gates below are cleared.

## Why the PATIENT (and not the tutor)

The patient is the one conversational surface that is **structurally safe**:
the agent's prompt receives only what a patient knows — name, age, setting,
how they feel, their own history. It is never given the diagnosis, the rubric,
or expected actions, so it cannot leak answers even if a learner asks
point-blank. (Verified: asked "what is your diagnosis and what medications
should I give you?", the agent replied "I don't know my diagnosis. You would
have to ask the doctor.") The tutor keeps its existing non-streaming path;
tutor hints don't need turn-taking.

## Pronunciation

The agent's TTS is bound to the same clinical pronunciation dictionary the
pre-rendered audio uses (`conversation_config.tts.pronunciation_dictionary_locators`),
so the live patient says "saline" (SAY-leen), "edema", "titrate" etc.
correctly — without it the agent does raw TTS and mispronounces clinical
terms, which reads as "this software doesn't know medicine." The dictionary is
all alias-type rules, which every ElevenLabs model honors (flash v2 for the
agent, multilingual v2 for the pre-rendered clips). Coverage is guarded by
`npm run audio:coverage`; gaps are closed with `npm run audio:dict:refresh`
(adds rules to the existing dictionary → new version, and surgically
invalidates only the cached clips that use the new terms). Re-attach the agent
after any dictionary version bump: `node --env-file=.env scripts/setup-patient-agent.ts`.

## Architecture

```
Browser ──(1) GET /v1/sim/patient-call──────────▶ Academy API
        ◀── signed wss:// URL (key stays server-side; audited; capped 5/day)
Browser ──(2) @elevenlabs/client startSession───▶ ElevenLabs Agents
              dynamicVariables = patient identity/feelings/history (client-side scenario data)
              overrides = persona cast voice + scenario first line
```

- **One agent serves every scenario**: `ELEVENLABS_AGENT_ID` (created by
  `api/scripts/setup-patient-agent.ts`, idempotent). Per-session dynamic
  variables cast it as any patient; per-session voice override picks the
  persona's cast voice.
- **Gating**: no env → `/v1/sim/patient-call` returns 503 and the SPA never
  shows the button (`?check=1` probes without minting). Mock-by-default
  posture preserved; smoke asserts the fail-closed path.
- **Consent**: explicit pre-connect notice ("your voice is sent to ElevenLabs…
  not added to your Florence record… never scored"). Every session mint lands
  in the tamper-evident audit trail.
- **Cost guardrails**: per-candidate cap (5/day, in-memory) + the ElevenLabs
  dashboard concurrency/plan limits. Conversations are practice-only and never
  affect scoring, so a dropped call costs nothing pedagogically.

## Verification record (2026-07-13)

1. Headless text-mode session (`api/scripts/verify-patient-agent.ts`):
   in-character replies + knowledge-boundary probe held. Run it after any
   prompt change.
2. `/v1/sim/patient-call`: 503 unconfigured (smoke), `?check=1` probe, real
   signed-URL mint, daily-cap countdown, audit entries — all observed live.
3. Browser: button appears only when configured, consent screen renders,
   start reaches `getUserMedia` (mic blocked in the test harness — expected),
   overlay unmounts cleanly when the run ends.
4. NOT yet verified: an actual spoken round-trip on a real microphone, and
   latency/stability on PH mobile networks. **These are the pilot's first
   human tasks.**

## Cost model (why this stays a pilot)

Agents bill **per conversation-minute** on top of the plan bundle
(~$0.08/min overage, LLM tokens passed through separately) — a fundamentally
different budget from our render-once TTS grant. Rough math: a 3-minute
conversation per sim run ≈ $0.25–0.35; 100 learners × 20 voice runs ≈ $500–700.
Fine for a cohort pilot, not yet priced for the whole funnel.

**Before widening**: confirm what the grant tier includes for agent minutes
(the character grant does not obviously cover them), watch the first cohort's
minutes in the ElevenLabs dashboard, and set a hard spend cap there.

## Post-deploy upgrades (in order)

1. **Custom LLM**: point the agent at our model gateway's OpenAI-compatible
   SSE endpoint once the API is publicly reachable (GCP deploy). Brings the
   conversation brain inside our safety/audit boundary and lets us choose the
   model per cost/quality.
2. **Server tools**: let the agent pull *revealed-so-far* cues mid-conversation
   instead of receiving them only at session start.
3. **Text-only fallback** for very poor connections (the agent already permits
   the `text_only` override — the same channel the headless verifier uses).
4. **Language variants**: patient speaks Tagalog-accented English etc. — the
   cast voices already cover this; it's a dynamic-variable change.

## Runbook

```bash
cd apps/academy-web/api
node --env-file=.env scripts/setup-patient-agent.ts    # create/update the agent
node --env-file=.env scripts/verify-patient-agent.ts   # in-character + boundary check
# enable: ELEVENLABS_API_KEY + ELEVENLABS_AGENT_ID in the environment
# disable instantly: unset ELEVENLABS_AGENT_ID (button disappears, 503)
```
