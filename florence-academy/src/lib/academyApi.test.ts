import { describe, it, expect } from "vitest";
import {
  isReportingEnabled,
  kindFromConfig,
  reportAssessmentResult,
  summaryFromSession,
} from "./academyApi";
import type { SessionItem } from "./useCatSession";
import type { AbilityEstimate, CatConfig } from "./cat";
import type { ClientNeed } from "../types/question";

function gradedItem(id: string, clientNeed: ClientNeed, score: number): SessionItem {
  return {
    question: {
      id,
      type: "multiple-choice",
      difficulty: 0,
      clientNeed,
      section: 7,
      topic: "t",
      stem: "s",
      rationale: "r",
      options: ["a", "b"],
      correct: 0,
    },
    answer: { type: "multiple-choice", choice: score > 0 ? 0 : 1 },
    grade: { score, correct: score > 0.999 },
    servedAt: 0,
  };
}

const ability: AbilityEstimate = { theta: 0.42, se: 0.3, passProb: 0.78 };

describe("summaryFromSession", () => {
  it("maps history + ability to the API payload with per-need means", () => {
    const history = [
      gradedItem("a", "management-of-care", 1),
      gradedItem("b", "management-of-care", 0),
      gradedItem("c", "pharmacological-therapies", 1),
    ];
    const s = summaryFromSession({ candidateId: "cand_1", kind: "timed", history, ability });
    expect(s.candidate_id).toBe("cand_1");
    expect(s.kind).toBe("timed");
    expect(s.readiness).toBe(0.78);
    expect(s.theta).toBe(0.42);
    expect(s.items_completed).toBe(3);
    expect(s.by_client_need["management-of-care"]).toBeCloseTo(0.5);
    expect(s.by_client_need["pharmacological-therapies"]).toBe(1);
  });

  it("counts only graded items", () => {
    const ungraded: SessionItem = {
      question: gradedItem("b", "management-of-care", 0).question,
      answer: { type: "multiple-choice", choice: null },
      servedAt: 0,
    };
    const history = [gradedItem("a", "management-of-care", 1), ungraded];
    expect(
      summaryFromSession({ candidateId: "c", kind: "tutor", history, ability }).items_completed,
    ).toBe(1);
  });
});

describe("kindFromConfig", () => {
  it("derives the assessment kind from config flags", () => {
    expect(kindFromConfig({ timeLimitSec: 5400 } as unknown as CatConfig)).toBe("timed");
    expect(kindFromConfig({ useCiRule: true } as unknown as CatConfig)).toBe("adaptive_exam");
    expect(kindFromConfig({ immediateFeedback: true } as unknown as CatConfig)).toBe("tutor");
    expect(kindFromConfig({} as unknown as CatConfig)).toBe("nightly");
  });
});

describe("reporting gate", () => {
  it("is disabled unless url + token + candidateId are all present", () => {
    expect(isReportingEnabled({})).toBe(false);
    expect(isReportingEnabled({ url: "x", token: "y" })).toBe(false);
    expect(isReportingEnabled({ url: "x", token: "y", candidateId: "cand_1" })).toBe(true);
  });

  it("reportAssessmentResult is a no-op (returns false) when disabled", async () => {
    const sent = await reportAssessmentResult(
      { candidate_id: "c", kind: "tutor", readiness: 0.5, theta: 0, items_completed: 1, by_client_need: {} },
      {},
    );
    expect(sent).toBe(false);
  });
});
