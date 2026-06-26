import { describe, expect, it } from "vitest";
import {
  extractGrade,
  formatGradeToken,
  parseGradeSelection,
  stripGrade,
} from "./grade";

describe("extractGrade", () => {
  it("parses PSA 9 from eBay titles", () => {
    expect(extractGrade("1985 Topps Tiffany Mark McGwire #366 PSA 9")).toBe("PSA 9");
  });

  it("parses BGS 9.5", () => {
    expect(extractGrade("Jordan 1986 Fleer BGS 9.5 GEM MINT")).toBe("BGS 9.5");
  });

  it("returns null for raw listings", () => {
    expect(extractGrade("1985 Topps Mark McGwire Raw")).toBeNull();
  });
});

describe("stripGrade", () => {
  it("removes grade tokens for downstream parsing", () => {
    expect(stripGrade("Michael Jordan 1986 Fleer #57 PSA 10")).toBe(
      "Michael Jordan 1986 Fleer #57"
    );
  });
});

describe("parseGradeSelection / formatGradeToken", () => {
  it("round-trips PSA 9", () => {
    const sel = parseGradeSelection("PSA 9");
    expect(sel).toEqual({ kind: "graded", company: "PSA", score: "9" });
    expect(formatGradeToken(sel)).toBe("PSA 9");
  });

  it("maps empty to raw", () => {
    expect(parseGradeSelection(null)).toEqual({ kind: "raw" });
    expect(formatGradeToken({ kind: "raw" })).toBe("");
  });
});
