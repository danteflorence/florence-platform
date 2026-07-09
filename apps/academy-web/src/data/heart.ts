// ───────────────────────────────────────────────────────────────────────────
// Shared anatomy hotspot data for the interactive heart.
// Used by BOTH the <model-viewer> 3D heart (data-position hotspots) and the
// always-available SVG fallback diagram (percentage coordinates), so the
// clickable lesson works even if the 3D model fails to load.
//
// NOTE on 3D coordinates: positions are in model space (metres) and are
// illustrative - they place labels around the heart, not pinned to named
// meshes, so any reasonably-scaled heart GLB works. They are calibrated to a
// model roughly 0.2-0.3 m tall centred near the origin; the viewer also
// rescales them at runtime from the model's measured bounding box.
// ───────────────────────────────────────────────────────────────────────────

export interface HeartHotspot {
  id: string;
  /** anatomical structure */
  label: string;
  /** model-viewer data-position "x y z" in metres */
  position: string;
  /** model-viewer data-normal "x y z" */
  normal: string;
  /** SVG fallback coordinates as percentages of the viewBox */
  svg: { x: number; y: number };
  /** clinical tie-in to the Hour 7 lesson */
  teaching: string;
  accent: "teal" | "indigo";
  /** anchor id of the related lesson segment */
  segment: string;
}

export const HEART_HOTSPOTS: HeartHotspot[] = [
  {
    id: "rca",
    label: "Right coronary artery · inferior wall",
    position: "0.05 -0.02 0.09",
    normal: "0.4 -0.2 0.9",
    svg: { x: 38, y: 70 },
    teaching:
      "Supplies the inferior wall - ST elevation in II, III, aVF. Inferior MI often involves the right ventricle, which is preload-dependent, so nitroglycerin is contraindicated. This is the single highest-yield cardiac fact.",
    accent: "indigo",
    segment: "mi",
  },
  {
    id: "lad",
    label: "Left anterior descending (LAD)",
    position: "-0.04 0.02 0.10",
    normal: "-0.3 0.1 0.95",
    svg: { x: 62, y: 50 },
    teaching:
      "The anterior wall - ST elevation in V3-V4. A proximal LAD occlusion ('the widow-maker') threatens a large myocardial territory and warrants the fastest possible door-to-balloon time.",
    accent: "teal",
    segment: "mi",
  },
  {
    id: "aortic-valve",
    label: "Aortic valve",
    position: "0.0 0.08 0.06",
    normal: "0 0.6 0.8",
    svg: { x: 50, y: 30 },
    teaching:
      "Aortic stenosis: harsh systolic crescendo-decrescendo murmur radiating to the carotids; triad SAD (Syncope, Angina, Dyspnea). Patients are preload-dependent - AVOID nitroglycerin and other preload reducers. Treatment for severe disease is valve replacement or TAVR.",
    accent: "indigo",
    segment: "valvular",
  },
  {
    id: "mitral-valve",
    label: "Mitral valve · apex",
    position: "0.03 0.0 0.08",
    normal: "0.5 -0.1 0.85",
    svg: { x: 44, y: 56 },
    teaching:
      "Mitral stenosis (usually rheumatic) → atrial dilation, AF, and pulmonary hypertension. Mitral regurgitation → a holosystolic murmur at the apex radiating to the axilla.",
    accent: "teal",
    segment: "valvular",
  },
  {
    id: "lv",
    label: "Left ventricle",
    position: "0.02 -0.05 0.07",
    normal: "0.5 -0.4 0.75",
    svg: { x: 56, y: 72 },
    teaching:
      "When the left ventricle fails with reduced ejection fraction (HFrEF, EF <40%), it is treated with the four pillars: ARNI (or ACE/ARB), a beta blocker, an aldosterone antagonist, and an SGLT2 inhibitor - with a loop diuretic for symptom control.",
    accent: "indigo",
    segment: "hf",
  },
  {
    id: "sa-node",
    label: "SA node · right atrium",
    position: "0.06 0.05 0.05",
    normal: "0.7 0.3 0.65",
    svg: { x: 34, y: 38 },
    teaching:
      "The sinoatrial node sets the rhythm. Supraventricular tachycardia is a narrow-complex regular tachycardia (150-250 bpm); adenosine works by transiently blocking the downstream AV node - expect a brief asystolic pause. See the live monitor in the arrhythmias section.",
    accent: "teal",
    segment: "svt-sim",
  },
];

// The 3D model. Placed into public/models at build time; if it is absent or
// fails to load, the viewer falls back to the labelled SVG diagram.
export const HEART_MODEL = {
  src: "models/heart.glb",
  // Filled in once a model is downloaded; surfaced in the UI for compliance.
  attribution: {
    title: "Anatomical heart",
    author: "",
    source: "",
    license: "",
  },
};
