# Virtual-Patient 3D + Unreal Asset Strategy

Status: decision memo for the operator. Internal. Not a learner-facing surface.

This answers the two questions on the table:

1. Do we need to buy Unreal digital assets (hospital, units, equipment, people)?
2. Can the sim be 3D by default, and how real can it be?

Short answer: **yes, we will need to buy/commission Unreal assets to make it
look real, and yes we can get to 3D-by-default - but not by making 3D a
hard requirement to press play.** The winning design is one scenario that
renders two ways: a fast 2D player that every learner can run on a cheap
Android phone today, and a 3D layer that turns on per-device when the network
and hardware can carry it. We are already authoring every scenario 3D-ready,
so nothing has to be rebuilt when the renderer is live.

---

## 1. Why not literally 3D-only, day one

Our learners are mobile-first in the Philippines, Kenya, and Ghana. Realistic
Unreal rendering reaches the browser one of two ways, and both fight that
reality:

- **Local WebGL/WebGPU** ships the 3D scene to the device and renders on the
  phone's GPU. A MetaHuman-grade patient in a detailed ICU is far too heavy for
  a $120 Android handset - it will thermal-throttle, drain battery, and stutter.
- **Pixel streaming** renders the scene on a cloud GPU and streams video frames
  to the browser. The phone just plays a video, so the model quality is
  unlimited - but it needs a **cloud GPU per concurrent learner** (~$0.50-1.50
  per active hour on current cloud GPU pricing) and a steady ~10-20 Mbps
  downlink with low latency. That is a real per-seat cost and a real bandwidth
  floor that a learner on shared mobile data in Nairobi may not clear.

If 3D is the only way to play, a chunk of the cohort simply can't practice, and
our cheapest, highest-effect-size lever (deliberate practice + debrief) gets
gated behind bandwidth. That is the wrong trade. The clinical-judgment learning
lives in the **rubric and the debrief**, not in the polygon count - the
evidence on headset-vs-screen is clear that modality doesn't move outcomes;
debriefing and NCJMM alignment do.

So: 3D is how we make it *feel* real and how we sell the LA lab and university
partners. The 2D player is how we make sure everyone actually gets the reps.

## 2. The two-renderer design (what we're building toward)

One authored scenario, one deterministic engine, two front-ends:

| Layer | Renderer | Who gets it | When |
|-------|----------|-------------|------|
| **2D player** | React + vitals strip + patient card | Every learner, any phone | Live today |
| **3D layer** | Unreal (pixel-streamed) | Auto-enabled when device + network qualify; always on in the LA lab and partner showcases | After asset build + render service |

Both consume the **same `UnrealManifest`** the engine already emits
(`src/lib/vpatient/unrealManifest.ts`). The manifest is the contract:

- `environment` - which room to load, from the scenario's `careSettingId`
- `cast[]` - the patient plus every interprofessional team member, each with a
  `staff_<role>` model hint
- `vitalsTrack[]` - the full vitals trajectory as keyframes, with derived
  visual cues (chest-rise rate, skin tone, LOC) so the character animates to
  match the numbers
- `actionCues[]` - each learner action mapped to an animation clip
- `narrativeBeats[]` - patient lines + escalation narration to subtitle/voice

That means **every scenario an SME approves is already a complete 3D scene
description.** The 2D build never waits on Unreal, and the day the render
service exists, the whole approved library lights up in 3D with no re-authoring.

## 3. Do we need to buy assets? Yes - here's the bill of materials

To make it look like Cedars-Sinai or UCLA, we buy or commission four asset
classes. The unit taxonomy (`src/data/vpatient/careSettings.ts`, 24 units /
**17 distinct environments**) is the exact shopping list for environments and
equipment.

### a. Environments (17 rooms)
The `unrealEnvironmentKey` on each care setting is the asset slot:

```
env_icu_bay        env_ed_trauma_bay   env_operating_room   env_pacu_bay
env_medsurg_room   env_behavioral_room env_dialysis_bay     env_asc_bay
env_ldr_room       env_nicu_bay        env_picu_bay         env_peds_room
env_clinic_exam_room  env_infusion_bay
env_home_living_room  env_home_bedroom  env_snf_room
```

Covers critical care, acute inpatient, procedural, women's & children's,
**outpatient**, and **community/home health** - the full academic-medical-center
footprint the operator asked for, including the home settings.

### b. Equipment props
Each care setting already lists its `typicalEquipment` (monitor, IV pump,
ventilator, crash cart, home O2 concentrator, etc.). These become prop meshes
placed in the room. Many are cheap marketplace buys; a few (working monitor
that reflects our vitals track) are custom.

### c. Characters (MetaHuman)
- **Patients**: a spread of age/sex/body-type rigs. The manifest's `modelHint`
  (`adult_female`, `older_adult_male`, `pediatric_*`) already picks the rig.
- **Team**: nurse (the learner's presence), **US physician**, **pharmacist**,
  respiratory therapist, charge nurse, rapid-response - the `staff_<role>`
  hints. These are what make the communication/escalation scenarios land: you
  are looking a US doctor in the eye and giving SBAR, or coordinating a med
  change with a pharmacist.

MetaHuman itself is **free** from Epic (MetaHuman Creator / for Unreal), which
takes the character bill way down - we pay for *variety and clothing/scrubs*,
not for the base humans.

### d. Animations
Assessment lean-in, hands-on intervention, IV administration, phone-SBAR,
patient distress/respiratory-effort states. A mocap animation pack plus a few
custom clips.

## 4. Procurement options (rough, for planning)

| Source | Best for | Cost posture |
|--------|----------|--------------|
| **Fab / Unreal Marketplace** | Hospital environments, medical props, animation packs | Per-asset, tens to low-hundreds each; occasional free monthly |
| **MetaHuman (Epic)** | Base patient + staff humans | Free with Unreal |
| **Sketchfab / TurboSquid** | Specific equipment meshes | Per-asset |
| **Commission a 3D artist** | Our branded, consistent-looking units + a working vitals monitor | Higher, but one clean look across all 17 rooms |
| **Procedural / kitbash** | Filling out room variety cheaply | Time, not cash |

Realistic first pass: buy a strong medical-environment pack + medical-prop pack
+ animation pack off Fab, use free MetaHumans for the cast, and commission only
the working monitor and any signature rooms. That gets a convincing look for a
few thousand dollars of assets rather than a full custom build, and we upgrade
rooms over time.

**Note on the Unreal render service itself:** the assets are a one-time buy; the
pixel-streaming GPUs are the recurring cost. Budget the render service as
opex-per-active-3D-hour and gate it (lab + partners + qualifying devices), not
as an always-on cost for every learner.

## 5. The staged path to "3D by default"

We can honor "3D by default" as a *destination* while keeping the cohort
unblocked:

1. **Now** - 2D player is the default everywhere; every approved scenario emits
   a full manifest (done). Content is authored 3D-ready with units, teams, and
   escalation.
2. **Asset build** - buy/commission the 17 environments + props + cast + anims.
   Stand up the Unreal project that consumes the manifest.
3. **Render service** - wire `POST /v1/sim/scenarios/:id/render` to a
   pixel-streaming backend (the endpoint + mock queue already exist as the
   seam). Prove it on the sepsis gold scenario.
4. **Device-aware default** - detect GPU/bandwidth; auto-serve 3D to devices
   that qualify, 2D to those that don't. In the LA lab and at partner
   universities, 3D is always the default. As device and network baselines
   rise, the 3D default expands on its own.

By step 4, "3D by default" is true for everyone who can carry it, and no one is
locked out of practice. That is as real as we can make it without abandoning the
learners the product exists for.

## 6. Bottom line

- **Buy assets: yes.** ~17 environments, medical props, and staff variety - the
  taxonomy is the shopping list. MetaHuman keeps the human cost near zero.
- **3D by default: yes, as a device-aware default, not a hard gate.** The 2D
  player guarantees reps for the mobile-first cohort; the 3D layer delivers the
  realism and sells the lab and partners.
- **No rework tax.** Every scenario is already authored as a complete 3D scene
  via the manifest, so the content investment we're making now pays off in both
  renderers.
