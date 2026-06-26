import { describe, expect, it } from "vitest";
import {
  filterSoldListingsByComp,
  formatCompStatsLabel,
  resolveGradeTierPrice,
  type GradeTierPrices,
} from "./comp-match";

const mcGwireTiffanyPrices: GradeTierPrices = {
  rawCents: 2600,
  psa7Cents: 3500,
  psa8Cents: 4500,
  psa9Cents: 6000,
  psa10Cents: 12000,
  bgs95Cents: 5500,
  bgs10Cents: 11000,
  cgc10Cents: 10000,
  sgc10Cents: 10500,
};

describe("resolveGradeTierPrice", () => {
  it("returns raw tier for ungraded cards", () => {
    const result = resolveGradeTierPrice(mcGwireTiffanyPrices, "Raw");
    expect(result.priceCents).toBe(2600);
    expect(result.gradeTierUsed).toBe("Raw");
    expect(result.usedRawFallback).toBe(false);
  });

  it("returns PSA 9 tier — never raw — for McGwire Tiffany PSA 9", () => {
    const result = resolveGradeTierPrice(mcGwireTiffanyPrices, "PSA 9");
    expect(result.priceCents).toBe(6000);
    expect(result.gradeTierUsed).toBe("PSA 9");
    expect(result.usedRawFallback).toBe(false);
  });

  it("returns null price when graded tier is missing (no raw fallback)", () => {
    const prices: GradeTierPrices = {
      rawCents: 2600,
      psa7Cents: null,
      psa8Cents: null,
      psa9Cents: null,
      psa10Cents: null,
      bgs95Cents: null,
      bgs10Cents: null,
      cgc10Cents: null,
      sgc10Cents: null,
    };
    const result = resolveGradeTierPrice(prices, "PSA 9");
    expect(result.priceCents).toBeNull();
    expect(result.gradeTierUsed).toBe("PSA 9");
    expect(result.usedRawFallback).toBe(false);
  });

  it("does not treat PSA 9.5 as PSA 9", () => {
    const result = resolveGradeTierPrice(mcGwireTiffanyPrices, "PSA 9.5");
    expect(result.priceCents).toBeNull();
  });
});

describe("filterSoldListingsByComp", () => {
  const listings = [
    {
      title: "1985 Topps Tiffany Mark McGwire #366 PSA 9",
      priceCents: 5800,
      date: "2026-01-01",
      imageUrl: null,
      ebayUrl: "https://ebay.com/1",
    },
    {
      title: "1985 Topps Tiffany Mark McGwire #366 Raw",
      priceCents: 2400,
      date: "2026-01-02",
      imageUrl: null,
      ebayUrl: "https://ebay.com/2",
    },
    {
      title: "1985 Topps Mark McGwire #366 PSA 9",
      priceCents: 4200,
      date: "2026-01-03",
      imageUrl: null,
      ebayUrl: "https://ebay.com/3",
    },
  ];

  it("strictly filters to PSA 9 comps for graded cards", () => {
    const { gradeMatched, approximate } = filterSoldListingsByComp(listings, {
      player_name: "Mark McGwire",
      set_name: "Topps Tiffany",
      grade: "PSA 9",
    });
    expect(gradeMatched).toHaveLength(2);
    expect(gradeMatched.every((l) => /PSA 9/i.test(l.title))).toBe(true);
    expect(approximate.length).toBeGreaterThan(0);
  });

  it("returns empty gradeMatched when no comps match the grade", () => {
    const { gradeMatched } = filterSoldListingsByComp(listings, {
      player_name: "Mark McGwire",
      grade: "PSA 10",
    });
    expect(gradeMatched).toHaveLength(0);
  });
});

describe("formatCompStatsLabel", () => {
  it("labels grade-specific comp count separately from catalog volume", () => {
    const label = formatCompStatsLabel({
      priceSource: "pricecharting",
      compCountGradeSpecific: 4,
      catalogVolume: 359,
      gradeTierUsed: "PSA 9",
      numSales: 4,
    });
    expect(label).toContain("4 PSA 9 comps");
    expect(label).toContain("PC vol 359");
  });
});
