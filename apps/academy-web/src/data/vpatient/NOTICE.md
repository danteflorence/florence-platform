# Third-party attribution — virtual-patient clinical model

The clinical **parameter model** used by the virtual-patient scenarios in this
directory (`clinicalModel.ts` — the set of physiological insults and
interventions, their parameters, ranges, units, anatomical compartments, and
ordinal severity scales) is **derived from** the action set of the

**BioGears® Physiology Engine**
Copyright (c) Applied Research Associates, Inc.
Licensed under the Apache License, Version 2.0
https://github.com/BioGearsEngine — https://www.apache.org/licenses/LICENSE-2.0

## What we use and what we do not

- We **transcribe** BioGears' clinically-grounded action vocabulary (e.g.
  `Hemorrhage` with a bleeding rate and compartment; `Infection` with a
  None/Mild/Moderate/Severe scale, site, and MIC; `PainStimulus` on a 0–10
  scale) into TypeScript as an authoring reference.
- We **do not** embed, link, redistribute, or run the BioGears engine, its
  native (C++) source, or its compiled binaries. Florence Academy's virtual
  patient runs on our own deterministic, screen-based deltas-and-ramps engine
  (`src/lib/vpatient/engine.ts`) — no BioGears code executes at runtime.

This attribution satisfies Apache-2.0 §4(d) for the derived data model. The
BioGears name and logo are trademarks of their owner and are used here only to
credit the source of the clinical parameter model.
