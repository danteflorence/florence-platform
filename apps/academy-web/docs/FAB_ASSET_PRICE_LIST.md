# Fab Asset Price List — Virtual-Patient 3D Build

Researched on Fab (fab.com, Epic's marketplace) on 2026-07-10 for the
academic-medical-center 3D build. Prices are the "From" (lowest license tier)
listed on Fab and can change; several listings have higher Studio/Pro license
tiers. Confirm the license tier you need (personal vs studio) at checkout.

**Nothing here is purchased.** This is the shopping list mapped to the 17
environments in the care-setting taxonomy + props + the MetaHuman cast +
animations. Buy from your Fab account.

**The MetaHuman answer up front:** base MetaHuman characters are **free and
unlimited** from Epic (MetaHuman Creator / the plugin). That is exactly the
"as many humans as possible, swap people between scenarios" capability you
asked for — you create as many distinct people as you want at no per-character
cost, and each maps to a `metaHumanId` slot in the cast registry. You only pay
for **clothing/scrubs** and **animations** to dress and move them. Their
"biological response to insult" is already handled in our code by the
physiology projector (persona reserve × BioGears insult), not by an asset.

---

## 1. Environments (the 17 units)

One good modular hospital pack covers most inpatient/procedural/outpatient
rooms (med-surg, telemetry, oncology, ortho, neuro, exam rooms, wards, PACU,
ASC). Buy specialized packs only for the rooms that read differently (OR, ICU,
home).

| Need (env keys) | Fab listing | Publisher | From |
|---|---|---|---|
| **Base hospital** (med_surg, telemetry, oncology, ortho, neuro, clinic_exam, infusion, pacu, asc, snf, behavioral) | Modern Hospital Environment | Leartes Studios | **$49.99** |
| ↳ cheaper alt | Hospital | Blue Dot Studios | $39.99 |
| ↳ free starter | Modular 3D hospital environment | Madd Game Art | **Free** |
| **ICU / critical-care bay** (icu_bay) | ICU ward | BIG-G | **$19.99** |
| **Operating room** (operating_room) | Operating Room Pack | Arodora Studio | **$89.99** |
| ↳ cheaper alt | Medical Operating Room | romy.fek | $39.99 |
| **ED trauma bay** (ed_trauma_bay) | covered by base hospital + trauma props; optional Ambulance Prop Pack | Neurotic | $14.99 |
| **Home** (home_living_room + home_bedroom) | Sunny Apartment: Living Room and Bedroom Scene | MGFS | **$24.99** |
| ↳ richer alt | Apartment Interior (4.9★) | Gabro Media | $39.99 |
| L&D / NICU / PICU / peds / dialysis | base hospital shell + unit-specific props (below) | — | — |

## 2. Medical equipment / props

The working, vitals-driven monitor is the one prop worth **commissioning** (it
has to reflect our vitals track). Everything else is off-the-shelf.

| Need | Fab listing | Publisher | From |
|---|---|---|---|
| **Critical-care + diagnostic kit** (monitors, pumps, vent, crash cart) | Comprehensive Assortment of Critical Care & Diagnostic Medical Equipment | Hello Blender | **$49.99** |
| Large general medical prop pack | Medical Pack - Low Poly 3D Models Pack | ithappy | $129.99 |
| Broad equipment set | Medical Equipment | VP.Studio 3d | $119.99 |
| Budget equipment fill | HAWKNEST - Hospital Equipments | Garage B14 | $14.99 |
| Beds | Hospital Bed ($9.99, Studio-Lab) / 3D Intensive Care Bed ($2.99, nvere) | — | $2.99–9.99 |

## 3. The cast (MetaHuman + clothing)

| Need | Fab listing | Publisher | From |
|---|---|---|---|
| **Base humans (patients + staff), unlimited** | MetaHuman Creator / plugin | Epic Games | **Free** |
| Base clothing library | MetaHuman Fashion Starter Kit | Epic Games | **Free** |
| **Nurse scrubs** (the learner + RN staff) | Medical Scrubs – MetaHuman Compatible | Loto Forge | **$22.99** |
| **Physician** (white coat / scrubs) | Doctor Outfit - Metahuman (4.7★) | Quantum Assets | **$19.99** |
| ↳ richer physician/pharmacist outfit | Metahuman - Doctor - Medical Outfit | Meta Clothes Designer | $49.99 |

Pharmacist, respiratory therapist, and charge nurse are dressed from the same
scrubs + coat packs with color/badge variation — no extra buys required.

## 4. Animations

MetaHuman ships with Epic's free animation/retarget tooling (MetaHuman Animator,
Live Link Face for facial capture). Buy a medical mocap pack for gestures; the
exact clinical actions (assess lean-in, IV push, phone-SBAR, respiratory
distress) are the other thing worth **commissioning** for fidelity.

| Need | Fab listing | Publisher | From |
|---|---|---|---|
| Facial + body retarget tooling | MetaHuman Animator / Live Link | Epic Games | **Free** |
| Medical gesture mocap | Survival Medical & Healing Animations – Mocap Pack | nikoff | **$19.99** |
| Treatment gestures | Treatment Animations | Jane Gintsar | $4.99 |
| Idle / walk basics | Mobility Starter - MoCap Animation Pack | MoCap Online | $3.99 |

---

## Bundles + totals

### Tier 0 — Free proof-of-concept (~$0–8)
Prove the pipeline before spending: Madd modular hospital (free) + MetaHuman +
Fashion Starter Kit (free) + Epic animation tooling (free) + a free medical
equipment pack + Mobility mocap ($3.99). **≈ $4–8.** Enough to stand up one
room with one dressed MetaHuman driven by our manifest.

### Tier 1 — Lean production, one convincing look (**≈ $192**)
| Item | From |
|---|---|
| Modern Hospital Environment (Leartes) | $49.99 |
| Critical Care & Diagnostic Equipment (Hello Blender) | $49.99 |
| Sunny Apartment — home living room + bedroom (MGFS) | $24.99 |
| Nurse Scrubs — MetaHuman (Loto Forge) | $22.99 |
| Doctor Outfit — MetaHuman (Quantum Assets) | $19.99 |
| Medical Healing Animations (nikoff) | $19.99 |
| Mobility mocap (MoCap Online) | $3.99 |
| **Total** | **≈ $191.93** |

Covers: every inpatient/outpatient room off the modular hospital, the home
setting, nurse + physician cast, and a working animation set. This is the
recommended first purchase for the October Manila cohort's 3D layer.

### Tier 2 — Full academic-medical-center (**≈ $660**)
Tier 1 **plus**: Operating Room Pack ($89.99) + ICU ward ($19.99) + ithappy
Medical Pack ($129.99) + VP.Studio Medical Equipment ($119.99) + Meta Clothes
Designer doctor outfit ($49.99) + Treatment Animations ($4.99) + Ambulance Prop
Pack ($14.99) + richer Apartment Interior ($39.99). **≈ $662** all-in for a
distinct look across all 17 units.

### Not on Fab — budget separately
- **Commission** a working, vitals-driven patient monitor + the exact clinical
  animations (assess/IV/SBAR/distress): a freelance 3D/tech artist, roughly
  **$1,500–5,000** depending on polish. This is where the sim starts to feel
  real rather than generic.
- **Pixel-streaming GPU hosting** is recurring **opex**, not an asset buy — see
  [SIM_3D_STRATEGY.md](SIM_3D_STRATEGY.md). Gate it to qualifying devices + the
  LA lab; don't pay per-learner for the whole cohort.

---

## Recommendation

Start at **Tier 1 (~$192)** the moment you want the 3D layer, plus a small
commission for the vitals monitor. That gets a convincing, unit-complete look
for the Manila cohort's premium/showcase surface while the 2D player carries
everyone else. Scale to Tier 2 as specific units (OR, ICU, L&D) come up in the
scenario roadmap. MetaHuman keeps the human cast free and unlimited, so
"switching people between scenarios" costs nothing but the clothing packs above.

_Search URLs used: fab.com/search?q=hospital · medical+equipment · ICU ·
operating+room · metahuman+clothing · scrubs+nurse · medical+animation+mocap ·
living+room+interior. Prices as displayed 2026-07-10; verify at checkout._
