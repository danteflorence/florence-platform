# Always-on audio + voice tutor (ElevenLabs)

Two features, one grant:

1. **Narrated rationales + lesson audio** — a generated MP3 for every question
   rationale and lesson segment. Always-on, ultra-low-bandwidth, offline-downloadable
   — the async layer beneath the live (Agora) classroom.
2. **Voice tutor** — a Conversational-AI nurse educator the learner can talk to
   ("walk me through why it's C"). A floating "Ask the tutor" button.

Both are **mock-by-default**: with no `ELEVENLABS_API_KEY`, the pipeline runs end to
end with silent placeholder clips and the tutor button stays hidden, so nothing breaks
before the grant is claimed.

---

## 1. Claim the grant (one-time, you)

StoryHouse portfolio → ElevenLabs Startup Grant: <https://elevenlabs.io/startup-grants> →
select **StoryHouse**, code **`11storyhouse838`**. ~600 hours / 12 months.

> **Confirm commercial rights** when you claim it — the grant is a comped *paid* tier, so
> commercial use should be included and audio generated during the window should stay
> licensed afterward. Get that in writing before generating the sellable corpus.
> (Eligibility note: "products for users under 18" are excluded — Florence's adult-RN
> audience is clear.)

Then set `ELEVENLABS_API_KEY` (and the vars below) in the API environment.

## 2. The budget is generation, not streaming

Clips are static: generate once, serve forever from disk/CDN. The full corpus today is
**~71 hours** (≈11,540 rationales + ≈230 lesson segments) — about **12% of the grant**.
So generate the whole corpus during the free window; afterward only new/edited content
costs anything. Check anytime, no API calls:

```bash
cd api
npm run audio:extract     # build data/audio-content.json from banks + lessons
npm run audio:budget      # prints items / characters / hours / MB to generate
```

## 3. Generate (the "fill the reservoir" step)

```bash
# Pronunciation first (drug names / clinical terms), so clips sound right:
npm run audio:dict        # creates the dictionary; prints IDs to export
export ELEVENLABS_DICTIONARY_ID=...  ELEVENLABS_DICTIONARY_VERSION_ID=...

npm run audio:generate              # everything new/changed (textHash cache)
npm run audio:generate -- --kind rationale --limit 100   # a first batch
```

The `textHash` cache means editing one rationale re-renders only that clip — edits stay
cheap and audio never drifts from the (clinically reviewed) text. **Rule: the rationale
text is the source of truth and must be reviewed before it's voiced — audio is strictly
downstream.**

Files land in `api/data/audio/` (`manifest.json` + MP3s). In production, mount a volume
there (compose already does: `academy-audio`) or front it with a CDN via
`AUDIO_PUBLIC_BASE`.

## 4. Voice tutor (one-time)

```bash
npm run audio:tutor       # creates the NCLEX tutor agent; prints agent_id
export ELEVENLABS_AGENT_ID=agent_...
```

Restart the API → the "Ask the tutor" button appears for signed-in learners. The API
mints a short-lived **signed URL** per session (`POST /v1/tutor/session`, gated to
signed-in users because it consumes grant minutes); the browser opens the realtime
conversation via `@elevenlabs/react`.

## Environment variables

| Var | Purpose |
|---|---|
| `ELEVENLABS_API_KEY` | Enables live TTS + tutor. Blank = mock / hidden. |
| `ELEVENLABS_VOICE_ID` | Brand voice (default: Rachel `21m00Tcm4TlvDq8ikWAM`). |
| `ELEVENLABS_MODEL_ID` | Default `eleven_multilingual_v2` (global languages). |
| `ELEVENLABS_DICTIONARY_ID` / `…_VERSION_ID` | Clinical pronunciation locator. |
| `ELEVENLABS_AGENT_ID` | Conversational tutor agent → shows the tutor button. |
| `AUDIO_DIR` | Where MP3s + manifest live (default `api/data/audio`). |
| `AUDIO_PUBLIC_BASE` | CDN base for clips; blank → API serves them. |

## API surface

- `GET /v1/audio/manifest` — content key → `{ url, durationSec, kind }` (public, cached)
- `GET /v1/audio/file/:name` — serves a clip (when no CDN); immutable cache, traversal-guarded
- `GET /v1/tutor/config` — `{ configured }` (public; SPA shows/hides the button)
- `POST /v1/tutor/session` — `{ signedUrl }` (auth-gated; consumes minutes)

## Roadmap

- Attach the rationale corpus as a **knowledge base** on the tutor agent so it answers
  grounded in Florence's own explanations.
- `--with-stems` to also narrate question stems (full audio questions).
- Generate lesson `practiceItem` rationales (currently banks + lesson segments only).
