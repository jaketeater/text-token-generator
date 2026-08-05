import { describe, expect, it } from "vitest";

import { fitTextToUsableRadius, type TextPoint } from "../geometry/fitting";

const expectPointWithinRadius = (point: TextPoint, radius: number): void => {
  expect(Math.hypot(point.x, point.y)).toBeLessThanOrEqual(radius + 1e-10);
};

describe("text fitting", () => {
  it("keeps already-fitting text at scale 1", () => {
    const result = fitTextToUsableRadius({
      points: [
        { x: -2, y: 0 },
        { x: 2, y: 0 },
        { x: 0, y: 3 },
      ],
      requestedSize: 12,
      usableRadius: 5,
      fitMode: "shrink-text",
    });

    expect(result.ok).toBe(true);
    expect(result.scale).toBe(1);
  });

  it("shrinks oversized text uniformly to the usable radius in shrink-only mode", () => {
    const result = fitTextToUsableRadius({
      points: [
        { x: 10, y: 0 },
        { x: 0, y: 5 },
      ],
      requestedSize: 20,
      usableRadius: 4,
      fitMode: "shrink-text",
    });

    expect(result.ok).toBe(true);
    expect(result.scale).toBeCloseTo(0.4);
    expect(result.points).toEqual([
      { x: 4, y: 0 },
      { x: 0, y: 2 },
    ]);
  });

  it("returns a blocking error for oversized text in fixed mode", () => {
    const result = fitTextToUsableRadius({
      points: [{ x: 7, y: 0 }],
      requestedSize: 8,
      usableRadius: 3,
      fitMode: "none",
    });

    expect(result.ok).toBe(false);
    expect(result.scale).toBe(1);
    if (!result.ok) {
      expect(result.error.code).toBe("text.outsideUsableRadius");
    }
  });

  it("applies rotation before final radius checks", () => {
    const result = fitTextToUsableRadius({
      points: [{ x: 3, y: 4 }],
      requestedSize: 10,
      usableRadius: 4,
      rotationDegrees: 90,
      fitMode: "shrink-text",
    });

    expect(result.ok).toBe(true);
    expect(result.scale).toBeCloseTo(0.8);
    expect(result.points[0].x).toBeCloseTo(-3.2);
    expect(result.points[0].y).toBeCloseTo(2.4);
    expectPointWithinRadius(result.points[0], 4);
  });

  it("keeps every transformed point within the usable radius after shrink-only fitting", () => {
    const result = fitTextToUsableRadius({
      points: [
        { x: -12, y: 0 },
        { x: 0, y: 9 },
        { x: 6, y: 8 },
        { x: -4, y: -3 },
      ],
      requestedSize: 18,
      usableRadius: 6,
      rotationDegrees: 30,
      fitMode: "shrink-text",
    });

    expect(result.ok).toBe(true);
    for (const point of result.points) {
      expectPointWithinRadius(point, 6);
    }
  });

  it("reports effective size as requestedSize multiplied by scale", () => {
    const requestedSize = 15;
    const result = fitTextToUsableRadius({
      points: [{ x: 0, y: 12 }],
      requestedSize,
      usableRadius: 9,
      fitMode: "shrink-text",
    });

    expect(result.ok).toBe(true);
    expect(result.scale).toBeCloseTo(0.75);
    expect(result.effectiveSize).toBeCloseTo(requestedSize * result.scale);
  });
});
