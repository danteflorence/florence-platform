# Audio generation runbook

All audio is **mock-by-default**: with no `ELEVENLABS_API_KEY` the pipeline writes tiny
silent MP3s, so the whole flow (extract → budget → generate → reader/walkthrough)
is verifiable offline. The 600h StoryHouse grant is a **generation** budget, not a
streaming one — content-addressable `textHash` dedup means editing one item re-renders
only that clip, and millions of plays after generation cost nothing.

## Audio categories
| Kind | Source | Layer |
|---|---|---|
| `rationale` | bank `rationale` text | quick 30–60s "what was right" |
| `walkthrough` | approved walkthrough (full NCJMM) | 2–4 min "how to think" |
| `coaching` | approved walkthrough, per distractor | 30–90s, played to the option the learner chose |
| `lesson` | `hour1..20.ts` segments | e-book / lesson chapter narration |

Walkthrough + coaching audio is emitted **only for `status='approved'` walkthroughs**
(`scripts/verify-walkthroughs.ts` enforces this as a build invariant).

## Grant allocation target (~600h)
walkthroughs ~300h · distractor coaching ~100h · e-book/lesson narration ~100h ·
daily remediation playlists ~50h · Live review modules ~50h. Precision audio (short,
specific, tied to retrieval) — not generic lectures.

## Order of operations (small + high-value first; re-runs are free via textHash)
```bash
cd florence-academy/api
# 0) one-time live setup (when you have the grant key)
export ELEVENLABS_API_KEY=<ELEVENLABS_API_KEY>            # (+ optional ELEVENLABS_VOICE_ID / ELEVENLABS_DICTIONARY_ID)
export DATABASE_URL=<DATABASE_URL>       # walkthrough audio reads APPROVED rows from the store
npm run migrate                        # create tables (incl. question_walkthroughs)
npm run audio:dict                     # build the clinical pronunciation dictionary

# 1) draft walkthroughs in tranches (AI drafts → human QA before audio)
ANTHROPIC_API_KEY=<ANTHROPIC_API_KEY> npm run walkthroughs:generate -- --client-need management-of-care --calibrated --limit 200
#    → QA in the app (sme-review → approve) via /v1/walkthroughs

# 2) (re)build the content manifest + see the budget
npm run audio:extract
npm run audio:budget                   # per-kind hours + % of the 600h grant + headroom

# 3) generate audio in tranches (lesson/e-book first, then approved walkthroughs)
npm run audio:generate -- --kind lesson
npm run audio:generate -- --kind walkthrough --limit 200
npm run audio:generate -- --kind coaching --limit 400
npm run audio:generate -- --kind rationale --limit 200   # the bulk, after review

# 4) confirm the safety invariant
npm run walkthroughs:verify            # audio ⊆ approved walkthroughs
```

## Budget guard
`textHash` = `sha256(text + voiceId + modelId + dictionaryId)`. Re-running `audio:generate`
skips unchanged clips; editing+re-approving a walkthrough changes its text → re-renders
only that one clip. Run `npm run audio:budget` between tranches to track grant spend.
