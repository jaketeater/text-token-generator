import { describe, expect, it } from "vitest";

import { fitTextToCircle, type TextPoint } from "../geometry/fitTextToCircle";

const expectPointClose = (actual: TextPoint, expected: TextPoint): void => {
  expect(actual[0]).toBeCloseTo(expected[0], 8);
  expect(actual[1]).toBeCloseTo(expected[1], 8);
};

describe("fitTextToCircle", () => {
  it("centers the bounding box before rotating around the origin", () => {
    const result = fitTextToCircle(
      [
        [10, 20],
        [14, 20],
      ],
      12,
      10,
      90,
      "none",
    );

    expectPointClose(result.points[0], [0, -2]);
    expectPointClose(result.points[1], [0, 2]);
    expect(result.diagnostics.boundsBeforeCentering).toMatchObject({ centerX: 12, centerY: 20 });
  });

  it("shrinks text only when shrink mode exceeds the usable radius", () => {
    const result = fitTextToCircle(
      [
        [-10, 0],
        [10, 0],
      ],
      20,
      5,
      0,
      "shrink-text",
    );

    expect(result.appliedScale).toBeCloseTo(0.5);
    expect(result.effectiveSize).toBeCloseTo(10);
    expect(result.diagnostics.requiredRadius).toBeCloseTo(5);
    expect(result.diagnostics.fits).toBe(true);
    expect(result.diagnostics.wasShrunk).toBe(true);
  });

  it("reports fixed-mode overflow metadata without scaling", () => {
    const result = fitTextToCircle(
      [
        [-10, 0],
        [10, 0],
      ],
      20,
      5,
      0,
      "none",
    );

    expect(result.appliedScale).toBe(1);
    expect(result.effectiveSize).toBe(20);
    expect(result.diagnostics.fits).toBe(false);
    expect(result.diagnostics.error).toMatchObject({
      code: "text.fixedSizeOverflow",
      requestedSize: 20,
      usableRadius: 5,
      requiredRadius: 10,
    });
  });
});
