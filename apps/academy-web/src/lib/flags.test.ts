import { describe, expect, it } from "vitest";
import { countryToIso, isoToFlag } from "./flags";

describe("countryToIso", () => {
  it("maps the core cohort countries by name", () => {
    expect(countryToIso("Philippines")).toBe("PH");
    expect(countryToIso("kenya")).toBe("KE");
    expect(countryToIso("Ghana")).toBe("GH");
    expect(countryToIso("Nigeria")).toBe("NG");
  });
  it("passes 2-letter codes through, uppercased", () => {
    expect(countryToIso("ph")).toBe("PH");
    expect(countryToIso("US")).toBe("US");
  });
  it("returns null for unknown or missing values", () => {
    expect(countryToIso("Atlantis")).toBeNull();
    expect(countryToIso(undefined)).toBeNull();
    expect(countryToIso("")).toBeNull();
  });
});

describe("isoToFlag", () => {
  it("builds regional-indicator flags", () => {
    expect(isoToFlag("PH")).toBe("🇵🇭");
    expect(isoToFlag("KE")).toBe("🇰🇪");
  });
  it("rejects non-ISO input", () => {
    expect(isoToFlag("ph")).toBeNull();
    expect(isoToFlag("USA")).toBeNull();
  });
});
