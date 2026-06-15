import { useCallback, useState } from "react";
import {
  estimateAbility,
  selectNextItem,
  shouldStop,
  type AbilityEstimate,
  type CatConfig,
  type CatResponse,
  type StopReason,
} from "./cat";
import { CLIENT_NEEDS } from "../data/blueprint";
import {
  emptyAnswer,
  gradeQuestion,
  isAnswered,
  type Answer,
  type ClientNeed,
  type GradeResult,
  type Question,
} from "../types/question";

export interface SessionItem {
  question: Question;
  answer: Answer;
  grade?: GradeResult;
  /** When this item was first shown (ms epoch). */
  servedAt: number;
  /** Wall-clock time spent on the item before it was graded (ms). */
  spentMs?: number;
}

type EndReason = StopReason | "ended" | "time";

interface SessionState {
  history: SessionItem[];
  index: number;
  ability: AbilityEstimate;
  phase: "active" | "finished";
  submitted: boolean;
  outcome?: "pass" | "fail";
  stopReason?: EndReason;
  startedAt: number;
  finishedAt?: number;
  /** When the session was paused (ms epoch), or null while running. */
  pausedAt: number | null;
  /** Total time already spent paused (ms) — pushes the deadline out by the same. */
  pausedMs: number;
}

function zeroCounts(): Record<ClientNeed, number> {
  return Object.fromEntries(CLIENT_NEEDS.map((c) => [c.key, 0])) as Record<
    ClientNeed,
    number
  >;
}

function tally(history: SessionItem[]): Record<ClientNeed, number> {
  const counts = zeroCounts();
  for (const h of history) counts[h.question.clientNeed] += 1;
  return counts;
}

function responsesOf(history: SessionItem[]): CatResponse[] {
  return history
    .filter((h) => h.grade)
    .map((h) => ({
      id: h.question.id,
      difficulty: h.question.difficulty,
      clientNeed: h.question.clientNeed,
      score: h.grade!.score,
      ...(h.question.cjmm ? { cjmm: h.question.cjmm } : {}),
    }));
}

/**
 * Drives one adaptive session. The engine in `cat.ts` does the math; this hook
 * owns the React state machine: serve → answer → submit → (reveal) → advance,
 * stopping per the configured rules.
 */
export function useCatSession(pool: Question[], config: CatConfig) {
  const [state, setState] = useState<SessionState>(() => {
    const now = Date.now();
    const first = selectNextItem(
      pool,
      new Set(),
      config.startTheta,
      zeroCounts(),
      0,
    );
    return {
      history: first
        ? [{ question: first, answer: emptyAnswer(first), servedAt: now }]
        : [],
      index: 0,
      ability: estimateAbility([], config.passTheta),
      phase: first ? "active" : "finished",
      submitted: false,
      stopReason: first ? undefined : "pool-exhausted",
      startedAt: now,
      finishedAt: first ? undefined : now,
      pausedAt: null,
      pausedMs: 0,
    };
  });

  const finish = (s: SessionState, reason: EndReason): SessionState => ({
    ...s,
    phase: "finished",
    stopReason: reason,
    outcome: s.ability.theta >= config.passTheta ? "pass" : "fail",
    finishedAt: Date.now(),
  });

  const advance = (s: SessionState): SessionState => {
    const answeredCount = s.history.filter((h) => h.grade).length;
    const stop = shouldStop(s.ability, answeredCount, config, config.passTheta);
    if (stop.stop) return finish(s, stop.reason);

    const answeredIds = new Set(s.history.map((h) => h.question.id));
    const nextQ = selectNextItem(
      pool,
      answeredIds,
      s.ability.theta,
      tally(s.history),
      answeredCount,
    );
    if (!nextQ) return finish(s, "pool-exhausted");

    return {
      ...s,
      history: [
        ...s.history,
        { question: nextQ, answer: emptyAnswer(nextQ), servedAt: Date.now() },
      ],
      index: s.index + 1,
      submitted: false,
    };
  };

  // Accepts a value OR a functional updater. The updater form reads the latest
  // committed answer, so several selections fired in one synchronous tick (rapid
  // multi-select, automated input) all register instead of collapsing to one.
  const setAnswer = useCallback(
    (updater: Answer | ((prev: Answer) => Answer)) => {
      setState((s) => {
        if (s.submitted || s.phase !== "active") return s;
        const prev = s.history[s.index]?.answer;
        if (!prev) return s;
        const a = typeof updater === "function" ? updater(prev) : updater;
        const history = s.history.slice();
        history[s.index] = { ...history[s.index], answer: a };
        return { ...s, history };
      });
    },
    [],
  );

  const submit = useCallback(() => {
    setState((s) => {
      if (s.phase !== "active") return s;
      const item = s.history[s.index];
      if (!item || item.grade) return s;
      const grade = gradeQuestion(item.question, item.answer);
      const history = s.history.slice();
      history[s.index] = { ...item, grade, spentMs: Date.now() - item.servedAt };
      const ability = estimateAbility(responsesOf(history), config.passTheta);
      const next = { ...s, history, ability, submitted: true };
      // Tutor mode pauses to reveal the rationale; exam/nightly advance at once.
      return config.immediateFeedback ? next : advance(next);
    });
    // advance/finish use config + pool from the enclosing closure (stable props)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, pool]);

  const next = useCallback(() => {
    setState((s) => (s.phase === "active" && s.submitted ? advance(s) : s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, pool]);

  const endNow = useCallback(() => {
    setState((s) => (s.phase === "active" ? finish(s, "ended") : s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // The countdown hit zero. Grade an answered-but-unsubmitted item so the
  // learner's last selection still counts, then close the session as "time".
  const timeUp = useCallback(() => {
    setState((s) => {
      if (s.phase !== "active") return s;
      const item = s.history[s.index];
      if (item && !item.grade && isAnswered(item.question, item.answer)) {
        const grade = gradeQuestion(item.question, item.answer);
        const history = s.history.slice();
        history[s.index] = {
          ...item,
          grade,
          spentMs: Date.now() - item.servedAt,
        };
        const ability = estimateAbility(responsesOf(history), config.passTheta);
        return finish({ ...s, history, ability, submitted: true }, "time");
      }
      return finish(s, "time");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, pool]);

  // Freeze the clock on a break: record when we paused. The countdown stays put
  // because the runner reads `pausedAt` as "now"; resuming banks the elapsed gap
  // into `pausedMs`, which pushes the deadline out by exactly that much.
  const pause = useCallback(() => {
    setState((s) =>
      s.phase === "active" && s.pausedAt == null
        ? { ...s, pausedAt: Date.now() }
        : s,
    );
  }, []);

  const resume = useCallback(() => {
    setState((s) =>
      s.pausedAt != null
        ? { ...s, pausedMs: s.pausedMs + (Date.now() - s.pausedAt), pausedAt: null }
        : s,
    );
  }, []);

  const answeredCount = state.history.filter((h) => h.grade).length;
  const deadlineAt =
    config.timeLimitSec != null
      ? state.startedAt + config.timeLimitSec * 1000 + state.pausedMs
      : null;

  return {
    config,
    phase: state.phase,
    current: state.history[state.index] as SessionItem | undefined,
    index: state.index,
    served: state.history.length,
    answeredCount,
    ability: state.ability,
    submitted: state.submitted,
    revealed: state.submitted && config.immediateFeedback,
    outcome: state.outcome,
    stopReason: state.stopReason,
    history: state.history,
    startedAt: state.startedAt,
    finishedAt: state.finishedAt,
    deadlineAt,
    paused: state.pausedAt != null,
    pausedAt: state.pausedAt,
    pausedMs: state.pausedMs,
    setAnswer,
    submit,
    next,
    endNow,
    timeUp,
    pause,
    resume,
  };
}
