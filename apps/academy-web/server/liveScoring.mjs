// ───────────────────────────────────────────────────────────────────────────
// Live-poll scoring - the pure half of poll persistence, kept out of
// liveServer.mjs so it can be unit-tested without sockets (node --test
// server/liveScoring.test.mjs; wired into `npm test`).
//
// Flow: at REVEAL (the moment answers freeze) the live server records one
// outcome per verified student into the room's accumulator; at room GC the
// accumulator is summarized into one assessment-result payload per candidate
// (kind "live_poll") and POSTed to the Data API. Ungraded polls (no `correct`)
// and anonymous students (no verified candidate id) are never recorded.
// ───────────────────────────────────────────────────────────────────────────

/**
 * Grade one student's picks against a poll's correct set.
 * Single-choice: the (first) pick must be a correct index.
 * Multi-select: exact set match - partial credit is a CAT concern, not a
 * classroom-poll concern.
 * @param {number[]} correct  correct option indexes (non-empty)
 * @param {number[]} choices  the student's picked indexes (non-empty)
 * @param {boolean} multi
 * @returns {boolean}
 */
export function isPollCorrect(correct, choices, multi) {
  if (!Array.isArray(correct) || correct.length === 0) return false;
  if (!Array.isArray(choices) || choices.length === 0) return false;
  if (!multi) return correct.includes(choices[0]);
  if (choices.length !== correct.length) return false;
  const want = new Set(correct);
  return choices.every((c) => want.has(c));
}

/**
 * Record one graded poll outcome for one candidate into a room accumulator.
 * @param {Map<string, {taken:number, correct:number, byCjmm:Map<string,{taken:number,correct:number}>}>} stats
 * @param {string} candidateId
 * @param {boolean} correct
 * @param {string|undefined} cjmm  NCJMM step tag, when the poll carried one
 */
export function recordPollOutcome(stats, candidateId, correct, cjmm) {
  let s = stats.get(candidateId);
  if (!s) {
    s = { taken: 0, correct: 0, byCjmm: new Map() };
    stats.set(candidateId, s);
  }
  s.taken += 1;
  if (correct) s.correct += 1;
  if (cjmm) {
    let c = s.byCjmm.get(cjmm);
    if (!c) {
      c = { taken: 0, correct: 0 };
      s.byCjmm.set(cjmm, c);
    }
    c.taken += 1;
    if (correct) c.correct += 1;
  }
}

/**
 * Collect one socket's picked option indexes from a poll's answer map.
 * @param {Map<number, Set<string>>} answers  choiceIndex → Set<socketId>
 * @param {string} socketId
 * @returns {number[]}
 */
export function choicesOf(answers, socketId) {
  const out = [];
  for (const [idx, set] of answers.entries()) if (set.has(socketId)) out.push(idx);
  return out.sort((a, b) => a - b);
}

const round3 = (n) => Math.round(n * 1000) / 1000;

/**
 * Turn a room's accumulator into POST /v1/assessment-results payloads.
 * No `readiness` on purpose: raw poll accuracy is not a calibrated pass
 * probability, and the API's readiness rollup ignores results without one -
 * so a class of easy warm-up polls can never inflate (or wipe) a band.
 * by_cjmm carries the teaching signal the copilot and remediation read.
 * @param {Map<string, {taken:number, correct:number, byCjmm:Map<string,{taken:number,correct:number}>}>} stats
 * @returns {{candidate_id:string, kind:"live_poll", items_completed:number, by_cjmm?:Record<string,number>}[]}
 */
export function summarizePollStats(stats) {
  const out = [];
  for (const [candidate_id, s] of stats.entries()) {
    if (s.taken === 0) continue;
    /** @type {Record<string, number>} */
    const by_cjmm = {};
    for (const [step, c] of s.byCjmm.entries()) {
      if (c.taken > 0) by_cjmm[step] = round3(c.correct / c.taken);
    }
    out.push({
      candidate_id,
      kind: /** @type {const} */ ("live_poll"),
      items_completed: s.taken,
      ...(Object.keys(by_cjmm).length ? { by_cjmm } : {}),
    });
  }
  return out;
}
