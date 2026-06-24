import { useCallback, useMemo, useState } from "react";
import {
  caseDifficulty,
  estimateAbility,
  indexItems,
  selectNextCase,
  type AbilityEstimate,
  type CatResponse,
} from "./cat";
import {
  emptyAnswer,
  gradeQuestion,
  type Answer,
  type CaseStudy,
  type GradeResult,
  type Question,
} from "../types/question";

/**
 * Drives an NGN unfolding-case session. Unlike the item-level CAT engine, a case
 * plays its six Clinical-Judgment items in FIXED order (Recognize → … →
 * Evaluate), so difficulty adapts BETWEEN cases, not within one. After each case
 * the candidate's ability is re-estimated and the next case is the one whose mean
 * difficulty is most informative at that ability - the session climbs or eases to
 * match. The rationale is revealed after every submit, win or lose, so a wrong
 * answer is still a teaching moment.
 */
export interface CaseSessionConfig {
  /** Where the first case's difficulty is targeted (logits) - set by the level. */
  startTheta: number;
  passTheta: number;
  /** How many cases make up one session. */
  caseLimit: number;
}

export interface CaseItemState {
  question: Question;
  answer: Answer;
  grade?: GradeResult;
  /** When this step was first shown (ms epoch). */
  servedAt: number;
  /** Wall-clock time spent on the step before it was graded (ms). */
  spentMs?: number;
}

export interface CaseResult {
  caseId: string;
  title: string;
  /** Mean continuous score (0..1) across the case's six items. */
  meanScore: number;
  /** Mean Rasch difficulty of the case at the moment it was served. */
  difficulty: number;
}

type Phase = "item" | "case-complete" | "finished";

interface CaseState {
  current: CaseStudy | null;
  items: CaseItemState[];
  itemIndex: number;
  submitted: boolean;
  answeredCaseIds: Set<string>;
  responses: CatResponse[];
  /** Every graded item across every completed case, for the end-of-session review. */
  history: CaseItemState[];
  ability: AbilityEstimate;
  results: CaseResult[];
  phase: Phase;
  startedAt: number;
  finishedAt?: number;
}

function buildItems(c: CaseStudy, byId: Map<string, Question>): CaseItemState[] {
  const out: CaseItemState[] = [];
  const now = Date.now();
  for (const id of c.questionIds) {
    const q = byId.get(id);
    if (q) out.push({ question: q, answer: emptyAnswer(q), servedAt: now });
  }
  return out;
}

function responsesOf(items: CaseItemState[]): CatResponse[] {
  return items
    .filter((it) => it.grade)
    .map((it) => ({
      id: it.question.id,
      difficulty: it.question.difficulty,
      clientNeed: it.question.clientNeed,
      score: it.grade!.score,
    }));
}

export function useCaseSession(
  cases: CaseStudy[],
  caseItems: Question[],
  config: CaseSessionConfig,
) {
  const byId = useMemo(() => indexItems(caseItems), [caseItems]);

  const [state, setState] = useState<CaseState>(() => {
    const first = selectNextCase(cases, byId, new Set(), config.startTheta, {
      topK: 6,
    });
    return {
      current: first,
      items: first ? buildItems(first, byId) : [],
      itemIndex: 0,
      submitted: false,
      answeredCaseIds: new Set(),
      responses: [],
      history: [],
      ability: estimateAbility([], config.passTheta),
      results: [],
      phase: first ? "item" : "finished",
      startedAt: Date.now(),
      finishedAt: first ? undefined : Date.now(),
    };
  });

  const setAnswer = useCallback(
    (updater: Answer | ((prev: Answer) => Answer)) => {
      setState((s) => {
        if (s.submitted || s.phase !== "item") return s;
        const cur = s.items[s.itemIndex];
        if (!cur) return s;
        const a = typeof updater === "function" ? updater(cur.answer) : updater;
        const items = s.items.slice();
        items[s.itemIndex] = { ...cur, answer: a };
        return { ...s, items };
      });
    },
    [],
  );

  const submit = useCallback(() => {
    setState((s) => {
      if (s.phase !== "item") return s;
      const cur = s.items[s.itemIndex];
      if (!cur || cur.grade) return s;
      const grade = gradeQuestion(cur.question, cur.answer);
      const items = s.items.slice();
      items[s.itemIndex] = { ...cur, grade, spentMs: Date.now() - cur.servedAt };
      return { ...s, items, submitted: true };
    });
  }, []);

  // Advance within the case; on the sixth item, close out the case: tally its
  // score, fold its responses into the ability estimate, and stop or pause for
  // the next case.
  const next = useCallback(() => {
    setState((s) => {
      if (s.phase !== "item" || !s.submitted) return s;
      if (s.itemIndex < s.items.length - 1) {
        // Start the next step's clock the moment it's shown.
        const ni = s.itemIndex + 1;
        const items = s.items.slice();
        items[ni] = { ...items[ni], servedAt: Date.now() };
        return { ...s, items, itemIndex: ni, submitted: false };
      }
      const caseResponses = responsesOf(s.items);
      const responses = [...s.responses, ...caseResponses];
      const ability = estimateAbility(responses, config.passTheta);
      const meanScore =
        s.items.reduce((sum, it) => sum + (it.grade?.score ?? 0), 0) /
        Math.max(1, s.items.length);
      const result: CaseResult = {
        caseId: s.current!.id,
        title: s.current!.title,
        meanScore,
        difficulty: caseDifficulty(s.current!, byId),
      };
      const answeredCaseIds = new Set(s.answeredCaseIds);
      answeredCaseIds.add(s.current!.id);
      const done = answeredCaseIds.size >= config.caseLimit;
      return {
        ...s,
        responses,
        ability,
        results: [...s.results, result],
        history: [...s.history, ...s.items.filter((it) => it.grade)],
        answeredCaseIds,
        submitted: false,
        phase: done ? "finished" : "case-complete",
        finishedAt: done ? Date.now() : undefined,
      };
    });
    // config + byId come from the enclosing closure (stable for a session)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, byId]);

  // Move from the case-complete interstitial into the next (adaptively chosen) case.
  const nextCase = useCallback(() => {
    setState((s) => {
      if (s.phase !== "case-complete") return s;
      const nc = selectNextCase(cases, byId, s.answeredCaseIds, s.ability.theta, {
        topK: 6,
      });
      if (!nc) return { ...s, phase: "finished", finishedAt: Date.now() };
      return {
        ...s,
        current: nc,
        items: buildItems(nc, byId),
        itemIndex: 0,
        submitted: false,
        phase: "item",
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cases, byId]);

  // End the session now. Any graded items in the current (unfinished) case are
  // still folded into the review and ability so nothing answered is lost.
  const endNow = useCallback(() => {
    setState((s) => {
      if (s.phase === "finished") return s;
      const partial = s.phase === "item" ? s.items.filter((it) => it.grade) : [];
      const responses = [...s.responses, ...responsesOf(partial)];
      return {
        ...s,
        responses,
        ability: estimateAbility(responses, config.passTheta),
        history: [...s.history, ...partial],
        phase: "finished",
        finishedAt: Date.now(),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const item = state.items[state.itemIndex] as CaseItemState | undefined;
  // The 1-based number of the case on screen.
  const caseNumber =
    state.phase === "item"
      ? state.answeredCaseIds.size + 1
      : state.answeredCaseIds.size;

  return {
    config,
    phase: state.phase,
    current: state.current,
    items: state.items,
    item,
    itemIndex: state.itemIndex,
    itemCount: state.items.length,
    submitted: state.submitted,
    revealed: state.submitted, // always-on rationale: reveal after every submit
    ability: state.ability,
    results: state.results,
    history: state.history,
    answeredCaseCount: state.answeredCaseIds.size,
    caseNumber,
    caseLimit: config.caseLimit,
    isLastCase: state.answeredCaseIds.size >= config.caseLimit - 1,
    startedAt: state.startedAt,
    finishedAt: state.finishedAt,
    setAnswer,
    submit,
    next,
    nextCase,
    endNow,
  };
}
