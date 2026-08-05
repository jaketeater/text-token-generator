import { describe, expect, it } from "vitest";

import { fitTextToCircle, type TextPoint } from "../geometry/fitTextToCircle";

const expectPointWithinRadius = (point: TextPoint, radius: number): void => {
  expect(Math.hypot(point[0], point[1])).toBeLessThanOrEqual(radius + 1e-10);
};

describe("text fitting diagnostics", () => {
  it("keeps already-fitting centered text at scale 1", () => {
    const result = fitTextToCircle([[-2, 0], [2, 0], [0, 3]], 12, 5, 0, "shrink-only");

    expect(result.diagnostics.fits).toBe(true);
    expect(result.scale).toBe(1);
  });

  it("shrinks oversized text uniformly to the usable radius in shrink-only mode", () => {
    const result = fitTextToCircle([[-10, 0], [10, 0]], 20, 4, 0, "shrink-only");

    expect(result.diagnostics.fits).toBe(true);
    expect(result.scale).toBeCloseTo(0.4);
    expect(result.points).toEqual([[-4, 0], [4, 0]]);
  });

  it("returns a blocking error for oversized text in fixed mode", () => {
    const result = fitTextToCircle([[-7, 0], [7, 0]], 8, 3, 0, "fixed");

    expect(result.diagnostics.fits).toBe(false);
    expect(result.scale).toBe(1);
    expect(result.diagnostics.fitErrors[0].code).toBe("text.fixedSizeOverflow");
  });

  it("centers by flattened outline bounds before rotation", () => {
    const result = fitTextToCircle([[10, 20], [14, 20]], 10, 3, 90, "fixed");

    expect(result.diagnostics.boundsBeforeCentering).toMatchObject({ centerX: 12, centerY: 20 });
    expect(result.points[0][0]).toBeCloseTo(0);
    expect(result.points[0][1]).toBeCloseTo(-2);
    expect(result.points[1][0]).toBeCloseTo(0);
    expect(result.points[1][1]).toBeCloseTo(2);
  });

  it("applies rotation before final radius checks", () => {
    const result = fitTextToCircle([[0, 0], [6, 8]], 10, 4, 90, "shrink-only");

    expect(result.diagnostics.fits).toBe(true);
    expect(result.scale).toBeCloseTo(0.8);
    expect(result.points[0][0]).toBeCloseTo(3.2);
    expect(result.points[0][1]).toBeCloseTo(-2.4);
    expectPointWithinRadius(result.points[0], 4);
  });

  it("keeps every transformed point within the usable radius after shrink-only fitting", () => {
    const result = fitTextToCircle([[-12, 0], [0, 9], [6, 8], [-4, -3]], 18, 6, 30, "shrink-only");

    expect(result.diagnostics.fits).toBe(true);
    for (const point of result.points) {
      expectPointWithinRadius(point, 6);
    }
  });

  it("reports requested size, fitted size, scale, fit errors, and transformed contours", () => {
    const result = fitTextToCircle([[[-10, 0], [10, 0]]], 15, 5, 0, "fixed");

    expect(result.diagnostics.requestedSize).toBe(15);
    expect(result.diagnostics.fittedSize).toBe(15);
    expect(result.diagnostics.scale).toBe(1);
    expect(result.diagnostics.fitErrors).toHaveLength(1);
    expect(result.diagnostics.transformedContours).toEqual(result.contours);
  });
});
