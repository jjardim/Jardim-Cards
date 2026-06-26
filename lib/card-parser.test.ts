import { describe, expect, it } from "vitest";
import { parseCardText } from "./card-parser";

describe("parseCardText", () => {
  it("extracts year, set, player, number, and grade from OCR blocks", () => {
    const result = parseCardText([
      "1985 Topps Tiffany",
      "Mark McGwire",
      "#366",
      "PSA 9",
    ]);
    expect(result.year).toBe(1985);
    expect(result.setName?.toLowerCase()).toContain("topps");
    expect(result.playerName).toBe("Mark McGwire");
    expect(result.cardNumber).toBe("366");
    expect(result.grade).toBe("PSA 9");
  });

  it("handles missing grade", () => {
    const result = parseCardText(["1986 Fleer", "Michael Jordan", "#57"]);
    expect(result.grade).toBeNull();
    expect(result.year).toBe(1986);
  });
});
