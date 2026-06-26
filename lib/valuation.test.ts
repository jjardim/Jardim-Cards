import { describe, expect, it } from "vitest";
import {
  hasRequestedGrade,
  looksLikeDirtyPlayerName,
  needsMetadataBackfill,
  valuationHonorsGrade,
} from "./valuation";

describe("valuationHonorsGrade", () => {
  it("rejects raw fallback for graded cards", () => {
    expect(
      valuationHonorsGrade(
        { gradeTierUsed: "Raw", usedRawFallback: true },
        "PSA 9"
      )
    ).toBe(false);
  });

  it("accepts matching grade tier", () => {
    expect(
      valuationHonorsGrade(
        { gradeTierUsed: "PSA 9", usedRawFallback: false },
        "PSA 9"
      )
    ).toBe(true);
  });

  it("accepts any valuation for raw cards", () => {
    expect(
      valuationHonorsGrade(
        { gradeTierUsed: "Raw", usedRawFallback: false },
        "Raw"
      )
    ).toBe(true);
  });
});

describe("hasRequestedGrade", () => {
  it("treats PSA 9 as graded", () => {
    expect(hasRequestedGrade("PSA 9")).toBe(true);
  });

  it("treats raw as ungraded", () => {
    expect(hasRequestedGrade("Raw")).toBe(false);
  });
});

describe("needsMetadataBackfill", () => {
  it("flags dirty Tiffany parser output", () => {
    expect(
      needsMetadataBackfill({
        player_name: "TIFFANY - Mark McGwire 366",
        pricecharting_id: "12345",
      })
    ).toBe(true);
  });

  it("flags missing pricecharting id", () => {
    expect(
      needsMetadataBackfill({
        player_name: "Mark McGwire",
        pricecharting_id: null,
      })
    ).toBe(true);
  });

  it("skips clean canonical rows", () => {
    expect(
      needsMetadataBackfill({
        player_name: "Mark McGwire",
        pricecharting_id: "12345",
      })
    ).toBe(false);
  });
});

describe("looksLikeDirtyPlayerName", () => {
  it("detects prefix junk pattern", () => {
    expect(looksLikeDirtyPlayerName("TIFFANY - Mark McGwire 366")).toBe(true);
  });
});
