# Pulse Physiology Engine — the BioGears successor for real biology + labs

Answers: *"we need to represent the biology and lab results from patients — the
old BioGears exe was rudimentary; how do we improve it, and can we use Pulse
(pulse.kitware.com)?"*

**Short answer: yes, use Pulse — but offline, as a ground-truth generator, not
as a runtime engine in the app.**

## Why Pulse over BioGears

Pulse is the actively-maintained, significantly improved fork of the same
DoD-funded physiology program BioGears came from — maintained by Kitware,
including the original BioGears core authors. BioGears (the exe you uploaded) is
effectively frozen; Pulse is where the lineage lives now.

- **License:** Apache 2.0 — same permissive terms we already rely on, so we can
  use it commercially, the same way `clinicalModel.ts` already borrows the
  BioGears *vocabulary* under Apache 2.0.
- **Bindings:** C++ core with **Python, Java, C#, and C** interfaces, plus Unity
  (WebGL/iOS/Android) and an Unreal plugin. So we can drive it from a Python
  service.
- **Blood chemistry + labs:** Pulse explicitly models blood chemistry — acid-base
  (Stewart model), blood gases, substances — which is exactly the ABG / lactate /
  BMP / CBC biology BioGears only sketched and our sim now needs. This is the
  upgrade.

## The architecture: Pulse offline, our engine at runtime

Do **not** embed Pulse in the browser or the request path. It's a native C++
solver; our runtime engine is a pure, deterministic, mobile-first reducer
(1 Hz, no native deps) precisely so a $120 Android can run it. Keep that.

Instead, use Pulse as an **authoring-time ground-truth generator**:

```
Pulse (Python service, offline)                Our app (runtime, unchanged)
────────────────────────────────              ─────────────────────────────
apply insult (Hemorrhage, Sepsis, …)   ──►     scenario JSON:
apply intervention (fluids, O2, …)               • vitals keyframes  (phases/ramps)
run to steady state                              • labPanels[]       (LAB-1 model)
export vitals + LAB PANELS over time    ──►      • provenance: pulse
                                                → deterministic playback + labs.ts
```

Pulse produces validated, clinically-grounded numbers; we **bake** them into the
scenario as vitals keyframes and `labPanels` (the model shipped in LAB-1). The
screen engine plays that baked trajectory. Best of both: Pulse's fidelity +
labs, our mobile-friendly deterministic replay. The 3D layer reads the same
baked data, so vitals + labs stay in sync across 2D and Unreal.

This is the same pattern we already use — `physiology.ts` projects trajectories
from a hand-tuned canonical model today; **Pulse simply replaces the hand-tuned
deltas with engine-generated ones**, and adds labs that a canonical model can't
produce. The persona/reserve layer still modulates severity per patient.

## What it upgrades in the teaching environment

1. **Real labs, trended.** Order a VBG at t=0 and again after fluids and see the
   lactate actually clear — Pulse computes the response; `labs.ts` flags it. That
   turns "read one abnormal value" into "trend the biology," which is where NGN
   Analyze-Cues / Evaluate-Outcomes live.
2. **Intervention realism.** The recovery curve after a correct action is
   physiologically shaped, not a linear ramp — a better debrief ("your bolus
   worked, but pressure lagged 3 minutes; that's expected in her").
3. **Authoring speed + trust.** SMEs stop hand-picking every number; they pick
   the insult + severity, Pulse fills the vitals + labs, the SME sanity-checks.
   Fewer "is this value right?" review cycles.
4. **One source of truth** feeding the vitals monitor, the labs view, the debrief
   diff, and the Unreal manifest.

## Build seam (small, deferrable)

- **Scenario provenance:** add `physiologySource?: "authored" | "pulse"` +
  `pulseProfileId?` to the scenario (marks a scenario as Pulse-grounded; the
  `labPanels`/vitals it already holds are the baked output).
- **Offline service (own repo):** a small Python job using PyPulse that takes an
  insult/intervention timeline and emits our vitals-keyframe + labPanel JSON. Runs
  in CI/authoring, never in the learner request path. Apache-2.0 attribution in
  NOTICE.md alongside the existing BioGears note.
- **No app change to consume it** — the LAB-1 lab model + the vitals engine
  already accept exactly this shape. Pulse is an input, not a dependency.

## Recommendation

Adopt Pulse as the offline physiology generator after the October cohort ships
on the current authored/`physiology.ts` numbers. It's the honest "how do we
improve on the rudimentary BioGears exe" answer: same license lineage, a live
maintained engine, real blood-chemistry + labs — plugged in exactly where our
LAB-1 model already expects the data, with zero runtime cost to the mobile
learner.

_Sources: pulse.kitware.com (About; Blood Chemistry Methodology); Pulse vs.
BioGears (discourse.kitware.com); Pulse Physiology Engine, SN Compr. Clin. Med.
(2019)._
