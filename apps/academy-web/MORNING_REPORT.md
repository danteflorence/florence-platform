# Florence Academy — Morning Report

**Built overnight, June 1 2026 · standalone interactive NCLEX-RN bootcamp prototype**

---

## TL;DR

A working **vertical slice** of Florence Academy is built, type-checked, QA'd in a
headless browser, and committed to a fresh local git repo. The deliverable is a real,
interactive **Hour 7 — Cardiac** lesson at the route `/academy/hour-7-cardiac`, plus a
landing page showing the full 20-hour track.

- ✅ Runs locally (Vite + React + TypeScript). Zero console errors on desktop **and** mobile.
- ✅ Four interactive teaching tools, all native (no paid services, no API keys, nothing phoning home).
- ✅ Initial home-page JS bundle is **30 kB gzipped 11 kB** — the heavy libraries load only on the lesson route.
- ⚠️ **One thing needs your input** — see "Needs your attention" below (the extra "Something else" approval you added when you went to sleep never reached me, so I did **not** act on it).

Nothing was pushed to any remote. All commits are **local only**.

---

## How to run it

The Node toolchain is local to this machine and **not** on your default `PATH`, so every
command needs the prefix below (shell state doesn't persist between terminals).

```bash
# 1. point your shell at the local Node toolchain
export PATH="$HOME/florence-work/.toolchain/node/bin:$PATH"
cd ~/florence-work/florence-academy

# 2a. dev server with hot reload  → http://localhost:5174
npm run dev
#    (equivalently: node node_modules/vite/bin/vite.js dev)

# 2b. production build (type-checks first, then bundles to dist/)
npm run build
#    (equivalently: node node_modules/typescript/bin/tsc -b && node node_modules/vite/bin/vite.js build)

# 2c. preview the production build  → http://localhost:5174
npm run preview
```

You can also launch it through the Claude Preview tool: the server is registered as
**`academy-preview`** in the global `~/.claude/launch.json`.

> **Deploy note:** `vite.config.ts` uses `base: "./"` (relative asset paths), which is great
> for serving under a sub-path like `academy.florence.../`. The trade-off: a **hard refresh
> on a deep link** such as `/academy/hour-7-cardiac` will look for assets relative to
> `/academy/` and 404. For a real deploy, either (a) serve the SPA with a catch-all rewrite to
> `index.html` **and** switch `base` to an absolute path, or (b) host the lesson at the path
> that matches `base`. Client-side navigation from the home page works perfectly today.

---

## What shipped

### Pages & routing (`src/main.tsx`, `src/App.tsx`)
- **`/`** — `AcademyHome`: hero + the full 20-hour curriculum grid (Hour 7 marked "ready", the rest "coming soon").
- **`/academy/hour-7-cardiac`** — `Hour7Cardiac`: the interactive lesson, **lazy-loaded** behind `React.Suspense` so the home page stays tiny.
- **`*`** — redirects to `/`.
- `ScrollToTop` resets scroll on every route change; a shared brand header/footer wraps all routes.

### The lesson (`src/pages/Hour7Cardiac.tsx` + `src/data/hour7.ts`)
Ten teaching segments authored as structured data (MI, heart failure, ACLS rhythms,
hypertensive emergency, aortic dissection, etc.), rendered as an interactive reader with a
sticky table-of-contents and scroll-spy highlighting.

### Four interactive components
| Component | What it does |
|---|---|
| `HeartViewer.tsx` | Clickable anatomy. Tries a 3D `<model-viewer>` heart; **falls back to a labelled interactive SVG schematic** when no model file is present (see "Heart 3D model"). Six hotspots, each linking to the relevant lesson segment. |
| `VitalsMonitor.tsx` | A bedside-monitor simulation of **stable SVT → adenosine → brief asystole → conversion**. Pre-computed, deterministic vitals (no randomness), play/pause/scrub transport, Recharts trace, and step-by-step clinical narration. |
| `NgnCase.tsx` | A native **Next-Generation NCLEX unfolding case** — 6 item types (highlight, matrix, dropdown cloze, bowtie, drag/extended, trend) with grading and rationale reveal. |
| `PracticeItem.tsx` / `RhythmDrill.tsx` | Single-best-answer practice questions and a shockable-vs-not rhythm sorting drill. |

### Brand system (`tailwind.config.js`, `src/index.css`)
Florence tokens: teal `#0BC5A0`, indigo `#3E2D8F`, Newsreader serif headlines, Inter body,
plus dedicated `vital-*` colours for the monitor.

---

## Key decisions (and why)

1. **Standalone app, separate from the Streamlit pricing tool.** The academy is a public-facing
   learner product with very different tech needs (rich client-side interactivity, 3D, charts).
   Keeping it isolated avoids coupling it to the internal economics app.
2. **Open-source, client-side anatomy (`@google/model-viewer`), not BioDigital.** No per-seat
   licensing, no credentials, no external calls. Apache-2.0.
3. **Graceful degradation everywhere.** The heart viewer works with *or without* a 3D model file;
   the monitor trace is pre-computed so it can't desync; nothing depends on a network call.
4. **Route-level code splitting.** `model-viewer` (three.js, ~1 MB) and `recharts` (~525 kB) are
   isolated into their own chunks that load **only** on the lesson route — the landing page ships 30 kB.
5. **Deterministic simulation data.** The vitals series is generated with fixed math (no RNG), so
   the teaching narrative is identical every run and every screenshot is reproducible.

---

## QA performed (headless Chrome)

- **Home page:** renders correctly desktop + mobile (375 px); **zero** console errors/warnings; 30 kB initial JS.
- **Lesson route:** lazy chunk resolves through the Suspense fallback; URL updates; `ScrollToTop` lands at scrollY 0; all 10 TOC links present; heart viewer mounts.
- **Heart viewer:** correctly detects the missing model and shows the labelled SVG schematic with all 6 hotspots.
- **Vitals monitor:** scrubbed through the timeline; asystole window renders the "— —" alarm state; readouts legible.
- **NGN case:** grading + rationale reveal work. Fixed a **stale-closure bug** where rapidly selecting multiple highlight tokens in one tick collapsed to a single selection — re-verified that all 6 rapid clicks now register (functional state-updater refactor).
- **Mobile (375 px):** fixed monitor readout clipping (the 3-readout grid overflowed the card and clipped SpO₂; the unit labels also clipped). Now the readout grid is width-constrained and units stack cleanly under their values. Header no longer wraps awkwardly. **No horizontal page scroll** anywhere.
- **Build:** `tsc -b` passes under `strict`; `vite build` is clean with no chunk-size warnings.

---

## ⚠️ Needs your attention

### 1. The extra "Something else" approval — I could not see it
When you batched the overnight approvals, you added a custom **"Something else"** item in
addition to the four I can see (install Node + deps · download one open 3D heart model · run
headless Chrome for QA · local git commits). **The text of that custom item never reached my
session.** I deliberately did **not** guess what it was or act on it. If it was meant to
authorize a specific action (a deploy, a download, an account, an email, anything), tell me what
it said and I'll pick it up. Everything I did stayed inside the four visible approvals.

### 2. Heart 3D model — shipping the SVG fallback, here's why
You approved downloading **one** open-licensed 3D heart. I searched trusted sources and did
**not** find one that cleanly met the bar (directly downloadable **GLB**, unambiguous CC0/CC-BY,
renders well, no login):
- **Wikimedia Commons** has a human-heart model, but it's **STL** (no colour/material → renders as a flat grey blob, and needs format conversion). Worse than the labelled SVG we have.
- **Sketchfab** has good GLB hearts, but downloading requires an **account/login** — which I'm not permitted to do autonomously.
- **TurboSquid** results are **commercial** licences, not CC0/CC-BY.

So I shipped the polished, on-brand **SVG schematic** (which fully satisfies the "interactive
anatomy" goal). The 3D viewer is already wired and waiting: **drop any `heart.glb` into
`public/models/` and the "3D model" toggle lights up automatically** — no code change. If you
want, point me at a model you're happy to license (or a Sketchfab one you download) and I'll wire
in the attribution.

---

## Known limitations / deferred (none block the demo)

- **npm audit: 2 moderate**, both **dev-only** — `esbuild ≤0.24.2` via Vite (advisory
  GHSA-67mh-4wv8-2f99: esbuild's *dev server* can be probed by other sites). It does **not** affect
  the production build output. The fix is a breaking upgrade to Vite 8; I left it for a deliberate
  decision rather than force-upgrading under a prototype.
- **Recharts** prints a React 18 deprecation notice in dev; cosmetic, no runtime impact.
- **Content scope:** Hour 7 is the only authored lesson; the other 19 hours are scaffolding marked
  "coming soon." The data shape in `src/data/` is ready to receive them.
- **No persistence/auth/analytics.** Practice answers reset on reload — intentional for a slice.

---

## Compliance check ✅

Per the standing rule that **no FICA / IRS / F-1 / tax / visa / immigration language** may appear
on public-facing surfaces, I grep-audited all source and `index.html`: **clean** — the academy
content is purely clinical NCLEX material. (This app contains none of the pricing-tool language.)

---

## Suggested next steps (your call)

1. Tell me what the **"Something else"** approval was for.
2. Decide on the heart model (license one, or keep the SVG — it looks good).
3. If you want this live, I can set up the deploy config (the `base` / deep-link item above).
4. Author Hour 6 or Hour 3 next to prove the content pipeline scales beyond one lesson.

---

*Repo: `~/florence-work/florence-academy` · local git, not pushed. Run `git log` to see the commit.*
