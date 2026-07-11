# MetaHuman — what we actually need (and what changed in 2025)

Answers: *"what else do we need from MetaHuman, if anything?"* (re
metahuman.com/download).

**Short answer: nothing to buy. Download Unreal Engine + the MetaHuman Creator
Core Data, and you have unlimited free humans you can use anywhere — including
our commercial product.**

## What to download

MetaHuman is now *part of Unreal Engine* (it stopped being a separate cloud app).
From metahuman.com/download / the Epic launcher:

1. **Unreal Engine** (free download).
2. During install, tick **MetaHuman Creator Core Data**, then enable the
   **MetaHuman** plugin in your project.

That gives you the three pieces we need:
- **MetaHuman Creator** — author unlimited distinct humans (our patients + the
  nurse/physician/pharmacist/RT cast). This is the "as many people as possible,
  swap between scenarios" capability, at no per-character cost.
- **Mesh to MetaHuman** — turn a scan/photo/sculpt into a rigged MetaHuman (useful
  later if we want specific likenesses).
- **MetaHuman Animator** — high-quality facial + body animation, incl. **Live Link
  Face** (an iPhone app) for capturing expressions. This covers a lot of the
  "clinical gesture" animation need for free.

Optional free/low add-ons only if wanted: Maya/Houdini bridge plugins, and the
clothing we already listed on Fab (nurse scrubs $22.99, doctor outfit $19.99).

## The 2025 license change — this is the important part

Epic materially liberalized MetaHuman licensing in mid-2025, which removes the
old "Unreal-only" constraint that used to make MetaHuman awkward for a product
like ours:

- **Free for anyone under $1M/yr revenue** (that's us today).
- **Usable in any engine or DCC app** — not just Unreal. MetaHuman characters +
  animations are now classed as *non-engine products*, so they can go into other
  pipelines, and there's **no 5% Unreal revenue cut** on them.
- **Sellable** — MetaHuman characters and clothing can even be sold on
  marketplaces.
- **AI caveat (matters for us):** you may use MetaHumans *in* workflows that
  incorporate AI, but you may **not** use them to *train or enhance the AI models
  themselves*. We use them purely as rendered visuals driven by our
  deterministic engine — fine. We must not feed MetaHuman assets into model
  training.
- **Above $1M/yr:** Unreal Engine seat licenses apply (~$1,850/seat/yr at
  current pricing). A future threshold to budget for, not now.

## Bottom line

We need **nothing else purchased** from MetaHuman. Download UE + MetaHuman Core
Data, build the cast in MetaHuman Creator (the `metaHumanId` slots in
`castRegistry.ts` are the placeholders those characters fill), animate with the
free MetaHuman Animator + Live Link, and dress them with the two cheap Fab
clothing packs. The only real constraint is the AI-training exclusion, which our
architecture already respects. Verify the current terms at metahuman.com/license
before a large build, since Epic updates them.

_Sources: metahuman.com/download; metahuman.com/license; CG Channel, "You can now
sell MetaHumans, or use them in Unity or Godot" (Jun 2025)._
