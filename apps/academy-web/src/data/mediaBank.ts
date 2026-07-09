import type { Question } from "../types/question";

/**
 * Florence-original scaffold items for the image / media item types.
 *
 * The clinical CONTENT (alt text, options, rationale, hot-spot geometry) is
 * authored here now; the binary ASSETS (`MediaAsset.src`) are dropped in later
 * by the content team. Until then the renderers show a labelled "media pending"
 * placeholder, so every item is reviewable and fully gradable today.
 *
 * These are wired into the Media Preview gallery (/academy/media-preview) for
 * review - NOT into the calibrated adaptive pool, so placeholder art never
 * reaches a live practice session.
 */
export const MEDIA_BANK: Question[] = [
  // ── Graphic hot-spot ──────────────────────────────────────────────────────
  {
    id: "media-hotspot-pmi",
    type: "graphic-hotspot",
    difficulty: 0.2,
    clientNeed: "physiological-adaptation",
    section: 7,
    topic: "Cardiac assessment - auscultation landmarks",
    cjmm: "recognize-cues",
    stem: "A client has a murmur best heard at the apex. Tap the location on the chest where the nurse should place the stethoscope to auscultate the mitral area.",
    instruction: "Tap the mitral (apical) auscultation point.",
    image: {
      src: "",
      alt: "Anterior chest wall diagram marking the four cardiac auscultation landmarks.",
      modality: "diagram",
      aspect: 1.4,
      caption: "Cardiac auscultation landmarks (anterior chest).",
    },
    hotspots: [
      { id: "aortic", label: "Aortic area - 2nd right intercostal space", x: 38, y: 20, width: 15, height: 15, shape: "ellipse" },
      { id: "pulmonic", label: "Pulmonic area - 2nd left intercostal space", x: 55, y: 20, width: 15, height: 15, shape: "ellipse" },
      { id: "tricuspid", label: "Tricuspid area - left lower sternal border", x: 48, y: 48, width: 15, height: 15, shape: "ellipse" },
      { id: "mitral", label: "Mitral area - 5th intercostal space, midclavicular", x: 60, y: 60, width: 16, height: 16, shape: "ellipse" },
    ],
    correct: [3],
    multi: false,
    rationale:
      "The mitral (apical) area sits at the 5th intercostal space, left midclavicular line - the point of maximal impulse, where S1 and mitral murmurs such as regurgitation are loudest.",
    reference: "Section 7 · Cardiac - Auscultation",
  },

  // ── Graphic answer options (each choice is an image) ──────────────────────
  {
    id: "media-graphic-afib",
    type: "graphic-options",
    difficulty: 0.6,
    clientNeed: "physiological-adaptation",
    section: 7,
    topic: "Rhythm recognition - atrial fibrillation",
    cjmm: "analyze-cues",
    stem: "A client reports palpitations and an irregular pulse. Which rhythm strip is consistent with atrial fibrillation?",
    options: [
      { src: "", alt: "Regular narrow-complex rhythm with one upright P wave before every QRS - normal sinus rhythm.", modality: "rhythm", aspect: 2.6 },
      { src: "", alt: "Irregularly irregular rhythm with no discernible P waves and a chaotic fibrillatory baseline - atrial fibrillation.", modality: "rhythm", aspect: 2.6 },
      { src: "", alt: "Wide-complex regular tachycardia with no visible P waves - ventricular tachycardia.", modality: "rhythm", aspect: 2.6 },
      { src: "", alt: "Regular rhythm with repeating sawtooth flutter waves - atrial flutter.", modality: "rhythm", aspect: 2.6 },
    ],
    correct: 1,
    rationale:
      "Atrial fibrillation is irregularly irregular with absent P waves and a fibrillatory baseline. Normal sinus has a P before each QRS; ventricular tachycardia is wide and regular; atrial flutter shows sawtooth waves.",
    reference: "Section 7 · Cardiac - Dysrhythmias",
  },

  // ── Media exhibit (image stimulus + text options) ─────────────────────────
  {
    id: "media-exhibit-stemi",
    type: "media-exhibit",
    difficulty: 0.9,
    clientNeed: "physiological-adaptation",
    section: 7,
    topic: "12-lead interpretation - inferior STEMI",
    cjmm: "recognize-cues",
    stem: "Review the 12-lead ECG exhibit for a client with crushing substernal chest pain. Which finding requires immediate provider notification?",
    exhibit: {
      src: "",
      alt: "12-lead ECG showing ST-segment elevation in leads II, III, and aVF.",
      modality: "ecg",
      aspect: 1.6,
      caption: "12-lead ECG obtained on arrival.",
    },
    options: [
      "ST-segment elevation in the inferior leads (II, III, aVF)",
      "Occasional premature atrial contractions",
      "A resting heart rate of 78/min",
      "A PR interval of 0.16 seconds",
    ],
    correct: 0,
    rationale:
      "ST-elevation in II, III, and aVF marks an inferior STEMI - a time-critical emergency requiring immediate provider notification and activation of the cardiac catheterization pathway. The other findings are benign or within normal limits.",
    reference: "Section 7 · Cardiac - Acute coronary syndrome",
  },
];
