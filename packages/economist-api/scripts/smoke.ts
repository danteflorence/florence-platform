import assert from "node:assert/strict";
import {
  createEconomistProposal,
  getFacility,
  getHealthSystem,
  getNashpDatasetMetadata,
  getNashpTrend,
  listNashpTrendEntities,
  quoteEconomist,
  roundCurrency,
} from "../src/index.ts";

const directQuote = quoteEconomist({
  facilityId: "tenet-gulf-coast-med-surg",
  rnCount: 10,
  channel: "direct",
});

assert.equal(directQuote.facility.id, "tenet-gulf-coast-med-surg");
assert.equal(directQuote.florenceFee.channelPartnerMonthlyShareTotal, 0);
assert.equal(directQuote.florenceFee.florenceMonthlyRevenueTotal, directQuote.florenceFee.employerMonthlyFeeTotal);
assert.ok(directQuote.customerOffset.payrollTaxOffsetMonthlyTotal > 0);
assert.equal(directQuote.customerOffset.treatment, "customer-side-only");
assert.equal(directQuote.customerSavings.customerOffsetExcludedFromFlorenceRevenue, true);
assert.equal(
  directQuote.customerSavings.customerEffectiveFeeMonthlyPerRn,
  roundCurrency(directQuote.florenceFee.employerMonthlyFeePerRn - directQuote.customerOffset.payrollTaxOffsetMonthlyPerRn),
);

const channelQuote = quoteEconomist({
  facilityId: "kaiser-norcal-telemetry",
  rnCount: 8,
  channel: "channel",
});

assert.equal(channelQuote.healthSystem.id, "kaiser-style");
assert.ok(channelQuote.florenceFee.channelPartnerMonthlyShareTotal > 0);
assert.equal(
  channelQuote.florenceFee.employerMonthlyFeeTotal,
  channelQuote.florenceFee.florenceMonthlyRevenueTotal + channelQuote.florenceFee.channelPartnerMonthlyShareTotal,
);

const firstDeterministic = quoteEconomist({
  facilityId: "tenet-gulf-coast-med-surg",
  rnCount: 4,
  channel: "channel",
  channelShareRate: 0.2,
});
const secondDeterministic = quoteEconomist({
  channelShareRate: 0.2,
  channel: "channel",
  rnCount: 4,
  facilityId: "tenet-gulf-coast-med-surg",
});
assert.deepEqual(secondDeterministic, firstDeterministic);

const proposal = createEconomistProposal({
  quoteInput: { facilityId: "kaiser-norcal-telemetry", rnCount: 12, channel: "direct" },
  durationMonths: 18,
});

assert.equal(proposal.status, "draft");
assert.equal(proposal.coreReference.quoteEventType, "economist.quote.created");
assert.equal(proposal.coreReference.proposalEventType, "economist.proposal.created");
assert.ok(proposal.lineItems.some((item) => item.label === "Customer payroll-tax offset" && item.audience === "customer"));

assert.ok(getFacility("tenet-gulf-coast-med-surg"));
assert.ok(getHealthSystem("kaiser-style"));

const nashpMetadata = getNashpDatasetMetadata();
assert.equal(nashpMetadata.source.name, "NASHP Hospital Cost Tool");
assert.equal(nashpMetadata.source.maxYear, 2024);
assert.ok(nashpMetadata.source.rowCount > 60000);
assert.ok(nashpMetadata.metrics.some((metric) => metric.slug === "hospital_operating_costs"));

const nashpSystems = listNashpTrendEntities({
  groupBy: "health_system",
  metric: "hospital_operating_costs",
  limit: 5,
});
assert.ok(nashpSystems.length > 0);
assert.ok(nashpSystems[0].latestValue && nashpSystems[0].latestValue > 0);

const nashpTrend = getNashpTrend({
  groupBy: "health_system",
  id: nashpSystems[0].id,
  metric: "hospital_operating_costs",
  fromYear: 2020,
  toYear: 2024,
});
assert.equal(nashpTrend.series.length, 5);
assert.ok(nashpTrend.series.some((point) => point.value !== null));
assert.equal(nashpTrend.source.maxYear, 2024);

console.log("Economist API smoke passed.");
