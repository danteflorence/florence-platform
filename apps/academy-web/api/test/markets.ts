// Market map checks - pure, offline. Run: `node test/markets.ts`.
import { strict as assert } from "node:assert";
import { MARKETS, formatLocal, localAmountCents, marketForCountry } from "../src/markets.ts";

let passed = 0;
const ok = (l: string) => {
  passed++;
  console.log(`  ✓ ${l}`);
};

// Country resolution: names and ISO codes, case-insensitive; unknown → INTL.
assert.equal(marketForCountry("Philippines").code, "PH");
assert.equal(marketForCountry("  the philippines ").code, "PH");
assert.equal(marketForCountry("KE").code, "KE");
assert.equal(marketForCountry("Ghana").code, "GH");
assert.equal(marketForCountry("NIGERIA").code, "NG");
assert.equal(marketForCountry("United States").code, "INTL");
assert.equal(marketForCountry(undefined).code, "INTL");
assert.equal(marketForCountry("").code, "INTL");
ok("marketForCountry: names + ISO codes resolve; unknown/empty fail safe to INTL");

// Provider + currency routing per market.
assert.equal(MARKETS.PH.provider, "paymongo");
assert.equal(MARKETS.KE.provider, "paystack");
assert.equal(MARKETS.GH.provider, "paystack");
assert.equal(MARKETS.NG.provider, "paystack");
assert.equal(MARKETS.INTL.provider, "stripe");
assert.deepEqual(
  Object.values(MARKETS).map((m) => m.currency),
  ["php", "kes", "ghs", "ngn", "usd"],
);
ok("provider + currency map: PH→paymongo/php, KE/GH/NG→paystack, default→stripe/usd");

// Local pricing: $75 and $100 tiers land on clean local figures.
const p75 = localAmountCents(MARKETS.PH, 7500);
assert.equal(p75 % (10 * 100), 0); // clean ₱10 step
assert.ok(p75 / 100 > 4000 && p75 / 100 < 4600, `PH $75 → ₱${p75 / 100}`);
const k100 = localAmountCents(MARKETS.KE, 10000);
assert.ok(k100 / 100 > 12000 && k100 / 100 < 13500, `KE $100 → KSh${k100 / 100}`);
assert.equal(localAmountCents(MARKETS.INTL, 7500), 7500); // USD passthrough
assert.ok(localAmountCents(MARKETS.GH, 1) >= 100); // never below one major unit
ok("localAmountCents: clean steps, sane magnitudes, USD passthrough, floor at 1 major");

// Display formatting.
assert.equal(formatLocal(MARKETS.PH, 428000), "₱4,280");
assert.equal(formatLocal(MARKETS.NG, 11550000), "₦115,500");
assert.equal(formatLocal(MARKETS.INTL, 7500), "$75");
ok("formatLocal: symbol + thousands separators");

console.log(`PASS - ${passed} checks`);
