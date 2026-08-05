import { beforeAll, describe, expect, it } from "vitest";

import { normalizeText } from "../layout/normalizeText";
import { tokenizeText } from "../layout/tokenizeText";
import { fitTextToCircle } from "../layout/fitTextToCircle";
import type { FaceParameters } from "../model/coinParameters";
import { DEFAULT_TOP_FACE } from "../model/defaults";
import { ensureTestFont } from "./ensureTestFont";

beforeAll(() => {
  ensureTestFont();
});

const face = (overrides: Partial<FaceParameters> = {}): FaceParameters => ({
  ...DEFAULT_TOP_FACE,
  ...overrides,
});

describe("word wrapping", () => {
  it("normalizes whitespace but preserves newlines", () => {
    expect(normalizeText("A   B\r\n  C  D")).toBe("A B\nC D");
  });

  it("tokenizes without splitting words", () => {
    const groups = tokenizeText("ONE TWO\nTHREE");
    expect(groups).toEqual([{ words: ["ONE", "TWO"] }, { words: ["THREE"] }]);
  });

  it("wraps only at whitespace and preserves order", () => {
    const layout = fitTextToCircle(face({ text: "ONE TWO THREE FOUR", requestedTextSize: 5, minimumTextSize: 2 }), {
      layoutRadius: 17.4,
    });
    expect(layout.fits).toBe(true);
    const joined = layout.lines.map((line) => line.text).join(" ");
    expect(joined).toBe("ONE TWO THREE FOUR");
    expect(layout.lines.every((line) => !line.text.includes("-"))).toBe(true);
  });

  it("honors forced newlines", () => {
    const layout = fitTextToCircle(
      face({ text: "TOP LINE\nFORCED SECOND PARAGRAPH", requestedTextSize: 4, minimumTextSize: 2 }),
      { layoutRadius: 17.4 },
    );
    expect(layout.fits).toBe(true);
    expect(layout.lines.length).toBeGreaterThanOrEqual(2);
    expect(layout.lines[0].text).toContain("TOP");
  });

  it("rejects overlong words at minimum size", () => {
    const layout = fitTextToCircle(
      face({
        text: "SUPERCALIFRAGILISTIC",
        requestedTextSize: 8,
        minimumTextSize: 6,
        autoShrink: true,
      }),
      { layoutRadius: 5 },
    );
    expect(layout.fits).toBe(false);
    expect(layout.errors.some((message) => message.includes("SUPERCALIFRAGILISTIC"))).toBe(true);
  });

  it("centers lines horizontally around zero", () => {
    const layout = fitTextToCircle(face({ text: "A BB CCC DDDD EEEEE", requestedTextSize: 4, minimumTextSize: 2 }), {
      layoutRadius: 17.4,
    });
    expect(layout.fits).toBe(true);
    for (const line of layout.lines) {
      expect(Math.abs(line.x + line.measuredWidth / 2)).toBeLessThan(1.5);
    }
  });

  it("binary-searches a smaller size when needed", () => {
    const layout = fitTextToCircle(
      face({
        text: "THIS IS A LONGER PHRASE",
        requestedTextSize: 8,
        minimumTextSize: 2,
        autoShrink: true,
      }),
      { layoutRadius: 17.4 },
    );
    expect(layout.fits).toBe(true);
    expect(layout.effectiveTextSize).toBeLessThanOrEqual(8);
  });

  it("rejects fixed size overflow", () => {
    const layout = fitTextToCircle(
      face({
        text: "THIS IS A LONGER PHRASE THAT WILL NOT FIT",
        requestedTextSize: 10,
        minimumTextSize: 2,
        autoShrink: false,
      }),
      { layoutRadius: 17.4 },
    );
    expect(layout.fits).toBe(false);
  });
});
