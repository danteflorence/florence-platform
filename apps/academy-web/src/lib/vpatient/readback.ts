// ───────────────────────────────────────────────────────────────────────────
// readback.ts - telephone-order read-back, the highest-stakes communication
// ritual in US practice (Joint Commission NPSG 02.03.01): when a provider
// gives a verbal order you REPEAT IT BACK verbatim, because "fifty" and
// "fifteen" kill people over the phone. The overlay quizzes exactly that:
// the correct read-back vs two number-distorted traps.
// Pure + deterministic (options are seeded by the order text, no Math.random).
// ───────────────────────────────────────────────────────────────────────────

export interface ReadbackQuiz {
  options: string[];
  correctIndex: number;
}

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
}

/** Distort the first number in the order (the classic mishear). */
function numberDistortions(order: string): string[] {
  const m = order.match(/\d+(\.\d+)?/);
  if (!m) return [];
  const n = parseFloat(m[0]);
  const variants = new Set<number>();
  variants.add(n * 10); // "fifty" heard as "five hundred"
  variants.add(n >= 20 ? Math.round(n / 10) : n + 10); // decimal-place slip
  if (Number.isInteger(n) && n >= 13 && n <= 19) variants.add((n % 10) * 10); // fifteen ↔ fifty
  return [...variants]
    .filter((v) => v !== n && v > 0)
    .slice(0, 2)
    .map((v) => order.replace(m[0], String(Number.isInteger(v) ? v : Math.round(v * 100) / 100)));
}

/** Word-level distortions for orders without numbers (route/urgency swaps). */
function wordDistortions(order: string): string[] {
  const swaps: [RegExp, string][] = [
    [/\bIV\b/i, "PO"],
    [/\bPO\b/i, "IV"],
    [/\bnow\b/i, "within the hour"],
    [/\bstat\b/i, "routine"],
    [/\bright\b/i, "left"],
    [/\bleft\b/i, "right"],
  ];
  const out: string[] = [];
  for (const [re, to] of swaps) {
    if (re.test(order)) out.push(order.replace(re, to));
    if (out.length === 2) break;
  }
  return out;
}

/** Build the quiz. Returns null when no plausible distractors exist. */
export function readbackQuiz(order: string): ReadbackQuiz | null {
  const distractors = [...numberDistortions(order), ...wordDistortions(order)].slice(0, 2);
  if (distractors.length === 0) return null;
  const options = [order, ...distractors];
  // Deterministic rotation so the correct answer isn't always first.
  const rot = hash(order) % options.length;
  const rotated = options.map((_, i) => options[(i + rot) % options.length]);
  return { options: rotated, correctIndex: rotated.indexOf(order) };
}
