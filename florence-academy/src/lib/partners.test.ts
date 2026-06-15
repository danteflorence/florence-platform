// Minimal coverage of the partner-portal helpers (label lookups are pure maps;
// the API does the heavy projection — these guard that the client knows the same
// shape the API ships).

import { describe, it, expect } from "vitest";
import { BAND_HEX, BAND_LABEL, NEED_LABEL, needLabel } from "./partnerApi";

describe("partner display maps", () => {
  it("has a hex + label for every band", () => {
    const bands = ["green", "yellow", "orange", "red", "none"] as const;
    for (const b of bands) {
      expect(BAND_HEX[b]).toMatch(/^#/);
      expect(BAND_LABEL[b].length).toBeGreaterThan(0);
    }
  });

  it("needLabel maps known client needs", () => {
    expect(needLabel("management-of-care")).toBe("Management of Care");
    expect(needLabel("pharmacological-therapies")).toBe("Pharmacological Therapies");
  });

  it("needLabel passes through unknown keys", () => {
    expect(needLabel("invented-need")).toBe("invented-need");
  });

  it("covers all 8 NCSBN client needs", () => {
    expect(Object.keys(NEED_LABEL).length).toBe(8);
  });
});
