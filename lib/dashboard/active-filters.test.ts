import { describe, expect, it } from "vitest";
import { getActiveDashboardFilters } from "./active-filters";

describe("getActiveDashboardFilters", () => {
  it("shows no filters for portfolio-only home", () => {
    expect(getActiveDashboardFilters(["portfolio"])).toEqual({
      sport: false,
      era: false,
      priceTier: false,
      any: false,
    });
  });

  it("shows era for discover without sport or price tier", () => {
    expect(getActiveDashboardFilters(["discover"])).toEqual({
      sport: false,
      era: true,
      priceTier: false,
      any: true,
    });
  });

  it("unions filters across enabled widgets", () => {
    expect(getActiveDashboardFilters(["hottest", "portfolio", "market-stats"])).toEqual({
      sport: true,
      era: true,
      priceTier: true,
      any: true,
    });
  });
});
