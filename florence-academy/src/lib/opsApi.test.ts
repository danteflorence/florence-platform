import { describe, it, expect } from "vitest";
import {
  bandFromReadiness,
  buildRoster,
  computeMetrics,
  monthFromCode,
  MONTHLY_SHARE_USD,
  nextBestAction,
  type OpsData,
} from "./opsApi";

const data: OpsData = {
  candidates: [
    { id: "c1", full_name: "A", created_at: "2026-01-01" },
    { id: "c2", full_name: "B", created_at: "2026-01-02" },
    { id: "c3", full_name: "C", created_at: "2026-01-03" },
  ],
  enrollments: [
    { id: "e1", candidate_id: "c1", cohort: "MNL-2026-07", status: "completed", created_at: "2026-02-01" },
    { id: "e2", candidate_id: "c2", cohort: "MNL-2026-07", status: "deposit_paid", created_at: "2026-02-01" },
    { id: "e3", candidate_id: "c3", cohort: "ACC-2026-08", status: "registered", created_at: "2026-02-01" },
  ],
  payments: [
    { id: "p1", candidate_id: "c1", kind: "commitment_deposit", amount_cents: 10000, currency: "USD", status: "paid" },
    { id: "p2", candidate_id: "c2", kind: "commitment_deposit", amount_cents: 10000, currency: "USD", status: "paid" },
    // not counted: wrong kind / not paid
    { id: "p3", candidate_id: "c3", kind: "tuition", amount_cents: 50000, currency: "USD", status: "paid" },
  ],
  assessments: [
    { id: "a1", candidate_id: "c1", readiness: 0.85, created_at: "2026-03-01" },
    { id: "a2", candidate_id: "c1", readiness: 0.9, created_at: "2026-03-05" }, // latest → green
    {
      id: "a3",
      candidate_id: "c2",
      readiness: 0.6, // orange
      created_at: "2026-03-02",
      by_client_need: { "pharmacological-therapies": 0.3, "management-of-care": 0.8 },
    },
    // c3 unassessed → "none"
  ],
  cohorts: [
    { id: "co1", code: "MNL-2026-07", name: "Manila", status: "active" },
    { id: "co2", code: "ACC-2026-08", name: "Accra", status: "active" },
  ],
};

describe("computeMetrics", () => {
  const m = computeMetrics(data);

  it("counts candidates by enrollment stage", () => {
    expect(m.totalCandidates).toBe(3);
    expect(m.byStage.completed).toBe(1);
    expect(m.byStage.deposit_paid).toBe(1);
    expect(m.byStage.registered).toBe(1);
    expect(m.byStage.attending).toBe(0);
  });

  it("counts + sums only paid Academy access payments", () => {
    expect(m.accessPaid).toBe(2);
    expect(m.accessCollectedUsd).toBe(200); // tuition payment excluded
  });

  it("bands by the LATEST assessment per candidate", () => {
    expect(m.bandCounts.green).toBe(1); // c1's latest (0.9), not its earlier 0.85
    expect(m.bandCounts.orange).toBe(1); // c2 (0.6)
    expect(m.bandCounts.none).toBe(1); // c3 unassessed
    expect(m.assessed).toBe(2);
    expect(m.readinessCleared).toBe(1); // green + yellow
  });

  it("weights expected starts by stage and prices ARR off them", () => {
    // completed 0.9 + deposit_paid 0.3 + registered 0.1 = 1.3
    expect(m.expectedStarts).toBeCloseTo(1.3, 5);
    expect(m.expectedArrUsd).toBeCloseTo(m.expectedStarts * MONTHLY_SHARE_USD * 12, 0);
  });

  it("forecasts starts grouped by cohort month", () => {
    const jul = m.startsByMonth.find((s) => s.month === "Jul 2026");
    expect(jul?.starts).toBeCloseTo(1.2, 5); // completed 0.9 + deposit_paid 0.3
    const aug = m.startsByMonth.find((s) => s.month === "Aug 2026");
    expect(aug?.starts).toBeCloseTo(0.1, 5); // registered 0.1
  });

  it("aggregates per cohort", () => {
    const mnl = m.cohorts.find((c) => c.code === "MNL-2026-07");
    expect(mnl?.candidates).toBe(2);
    expect(mnl?.accessActivations).toBe(2); // completed + deposit_paid
    expect(mnl?.readinessCleared).toBe(1); // c1 green
  });
});

describe("bandFromReadiness", () => {
  it("maps thresholds and the unassessed case", () => {
    expect(bandFromReadiness(undefined)).toBe("none");
    expect(bandFromReadiness(0.85)).toBe("green");
    expect(bandFromReadiness(0.7)).toBe("yellow");
    expect(bandFromReadiness(0.55)).toBe("orange");
    expect(bandFromReadiness(0.4)).toBe("red");
  });
});

describe("monthFromCode", () => {
  it("parses a trailing YYYY-MM", () => {
    expect(monthFromCode("MNL-2026-07")).toBe("Jul 2026");
    expect(monthFromCode("ACC-2026-08")).toBe("Aug 2026");
    expect(monthFromCode("no-date-here")).toBeNull();
  });
});

describe("buildRoster", () => {
  const roster = buildRoster(data);
  const byName = (n: string) => roster.find((r) => r.name === n)!;

  it("builds one row per candidate, sorted by name", () => {
    expect(roster.map((r) => r.name)).toEqual(["A", "B", "C"]);
  });

  it("derives stage, band, deposit, and latest readiness per candidate", () => {
    const a = byName("A");
    expect(a.stage).toBe("completed");
    expect(a.band).toBe("green"); // latest 0.9, not earlier 0.85
    expect(a.route).toBe("interview_ready"); // green → interview-ready
    expect(byName("B").route).toBe("bridge"); // orange → bridge
    expect(byName("C").route).toBe("in_progress"); // unassessed
    expect(a.depositPaid).toBe(true);
    expect(a.deposit.status).toBe("paid");
    expect(a.deposit.amountCents).toBe(10000);
    expect(a.assessmentsCount).toBe(2);

    const c = byName("C");
    expect(c.band).toBe("none"); // unassessed
    expect(c.depositPaid).toBe(false);
    expect(c.deposit.status).toBe("none"); // c3's only payment is tuition, not a deposit
  });

  it("ranks weakest client needs first and sets a next best action", () => {
    const b = byName("B");
    expect(b.focusAreas[0]).toBe("pharmacological-therapies"); // 0.3 < 0.8
    expect(b.nextAction).toBe("Remediation - Pharmacological Therapies");
    expect(byName("A").nextAction).toBe("Route to employer interview");
    expect(byName("C").nextAction).toBe("Assign a baseline diagnostic");
  });
});

describe("nextBestAction", () => {
  it("routes by stage + band + active access", () => {
    expect(nextBestAction("withdrawn", "green", true, undefined)).toMatch(/Withdrawn/);
    expect(nextBestAction("registered", "none", false, undefined)).toMatch(/baseline diagnostic/);
    expect(nextBestAction("registered", "yellow", false, undefined)).toMatch(/Global Live access/);
    expect(nextBestAction("attending", "green", true, undefined)).toMatch(/employer interview/);
    expect(nextBestAction("attending", "orange", true, "Pharmacology")).toBe("Remediation - Pharmacology");
  });
});
