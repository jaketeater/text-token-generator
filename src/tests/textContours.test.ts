import { describe, expect, it, beforeAll } from "vitest";

import { classifyContours } from "../font/classifyContours";
import { loadFontSync } from "../font/loadFont";
import { measureText } from "../font/measureText";
import { opentypeToContours } from "../font/opentypeToContours";
import { ensureTestFont } from "./ensureTestFont";

beforeAll(() => {
  ensureTestFont();
});

describe("text contours", () => {
  it("keeps one hole for O", () => {
    const font = loadFontSync();
    const contours = opentypeToContours(font, "O", { textSizeMm: 10 });
    const classified = classifyContours(contours);
    expect(classified.length).toBeGreaterThanOrEqual(1);
    expect(classified.some((entry) => entry.holes.length === 1)).toBe(true);
  });

  it("keeps two holes for B and 8", () => {
    const font = loadFontSync();
    for (const glyph of ["B", "8"]) {
      const contours = opentypeToContours(font, glyph, { textSizeMm: 10 });
      const classified = classifyContours(contours);
      expect(classified.some((entry) => entry.holes.length === 2)).toBe(true);
    }
  });

  it("produces no geometry for spaces", () => {
    const measured = measureText("   ", { textSizeMm: 6 });
    expect(measured.contours.length).toBe(0);
  });

  it("measures line widths with OpenType advance widths", () => {
    const font = loadFontSync();
    const text = "MOM";
    const measured = measureText(text, { textSizeMm: 10, font });
    const expected = font.getAdvanceWidth(text, 10, { kerning: true });
    expect(measured.width).toBeCloseTo(expected, 5);
  });

  it("uses a wider advance width for bold than regular", () => {
    const text = "TOKEN";
    const size = 10;
    const regularWidth = loadFontSync(false).getAdvanceWidth(text, size, { kerning: true });
    const boldWidth = loadFontSync(true).getAdvanceWidth(text, size, { kerning: true });
    expect(boldWidth).toBeGreaterThan(regularWidth);
  });

  it("handles sample strings", () => {
    const font = loadFontSync();
    for (const text of ["ABC", "O", "B8", "$10", "100", "MOM", "A B C"]) {
      const contours = opentypeToContours(font, text, { textSizeMm: 6 });
      if (text.trim().length === 0) {
        expect(contours.length).toBe(0);
      } else {
        expect(contours.length).toBeGreaterThan(0);
      }
    }
  });
});
