import { describe, expect, it } from "vitest";

import { classifyContours } from "../font/classifyContours";
import { textToContours, type TextContour } from "../geometry/textContours";

const PLANNING_DOCUMENT_STRINGS = ["ABC", "O", "B8", "$10", "100", "MOM"] as const;

const holeCount = (contours: TextContour[]): number => classifyContours(contours).reduce((sum, contour) => sum + contour.holes.length, 0);

const expectClosedFiniteContour = (contour: TextContour): void => {
  expect(contour.length).toBeGreaterThanOrEqual(4);

  const first = contour[0];
  const last = contour.at(-1);
  expect(last).toEqual(first);

  for (const point of contour) {
    expect(Number.isFinite(point.x)).toBe(true);
    expect(Number.isFinite(point.y)).toBe(true);
  }
};

describe("text contour generation", () => {
  it.each(PLANNING_DOCUMENT_STRINGS)("creates one or more closed contours for visible text %s", (text) => {
    const { contours } = textToContours(text);

    expect(contours.length).toBeGreaterThan(0);
    for (const contour of contours) {
      expectClosedFiniteContour(contour);
    }
  });

  it.each([
    ["ABC", 6, [1, 2, 0]],
    ["O", 2, [1]],
    ["B8", 6, [2, 2]],
    ["$10", 6, [2, 0, 1]],
    ["100", 5, [0, 1, 1]],
    ["MOM", 4, [0, 1, 0]],
  ] as const)("classifies DejaVu-derived counters for %s", (text, expectedContourCount, expectedHoleCounts) => {
    const { contours } = textToContours(text);
    const classified = classifyContours(contours);

    expect(contours.length).toBe(expectedContourCount);
    expect(classified.map((contour) => contour.holes.length)).toEqual(expectedHoleCounts);
  });

  it("models O with one internal hole", () => {
    const { contours } = textToContours("O");

    expect(holeCount(contours)).toBe(1);
  });

  it("models 8 with two internal holes", () => {
    const { contours } = textToContours("8");

    expect(holeCount(contours)).toBe(2);
  });

  it("does not emit invalid empty contours for spaces", () => {
    const { contours } = textToContours("M O M");

    expect(contours.length).toBeGreaterThan(0);
    expect(contours.every((contour) => contour.length > 0)).toBe(true);
    for (const contour of contours) {
      expectClosedFiniteContour(contour);
    }
  });

  it.each(PLANNING_DOCUMENT_STRINGS)("flattens %s to finite points", (text) => {
    const flattenedPoints = textToContours(text).contours.flat();

    expect(flattenedPoints.length).toBeGreaterThan(0);
    expect(flattenedPoints.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
  });

  it.each(PLANNING_DOCUMENT_STRINGS)("returns stable non-zero bounds for visible text %s", (text) => {
    const first = textToContours(text).bounds;
    const second = textToContours(text).bounds;

    expect(second).toEqual(first);
    expect(first.width).toBeGreaterThan(0);
    expect(first.height).toBeGreaterThan(0);
  });
});
