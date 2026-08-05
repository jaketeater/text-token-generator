import { describe, expect, it } from "vitest";
import modeling from "@jscad/modeling";

import { generateCoin } from "../export/export3mf";
import { DEFAULT_COIN_PARAMETERS } from "../model/defaults";
import { COIN_PART_NAMES } from "../model/generatedCoin";
import { createFaceText, type FittedTextContours, type TextContour } from "../geometry/createFaceText";
import { classifyContours } from "../font/classifyContours";
import { fitTextToCircle } from "../geometry/fitTextToCircle";
import { textToContours } from "../geometry/textContours";
import type { BottomTextOrientation, FaceParameters } from "../model/coinParameters";

const { booleans, measurements, primitives } = modeling;

const TOLERANCE_MM = 0.05;
const VOLUME_TOLERANCE_MM3 = 2;
const OVERLAP_TOLERANCE_MM3 = 0.001;

const approximate = (actual: number, expected: number, tolerance = TOLERANCE_MM) => {
  expect(actual).toBeGreaterThanOrEqual(expected - tolerance);
  expect(actual).toBeLessThanOrEqual(expected + tolerance);
};

const createFullCoinCylinder = () =>
  primitives.cylinder({
    radius: DEFAULT_COIN_PARAMETERS.diameter / 2,
    height: DEFAULT_COIN_PARAMETERS.thickness,
    center: [0, 0, DEFAULT_COIN_PARAMETERS.thickness / 2],
    segments: DEFAULT_COIN_PARAMETERS.circleSegments,
  });

const radialBounds = (geometry: unknown) => {
  const polygons = modeling.geometries.geom3.toPolygons(geometry as never);
  const radii = polygons.flatMap((polygon) =>
    polygon.vertices.map(([x, y]) => Math.hypot(x, y)),
  );
  return { min: Math.min(...radii), max: Math.max(...radii) };
};

const volume = (geometry: unknown) => measurements.measureVolume(geometry as never);

const polygonCount = (geometry: unknown) => modeling.geometries.geom3.toPolygons(geometry as never).length;

const ASYMMETRIC_TEXT_CONTOURS: readonly TextContour[] = [
  [[1, 2], [3, 2], [1, 4]],
];

const FITTED_TEXT: FittedTextContours = {
  contours: ASYMMETRIC_TEXT_CONTOURS,
  requestedSize: 1,
  fittedSize: 1,
  scale: 1,
  diagnostics: {
    requestedSize: 1,
    fittedSize: 1,
    scale: 1,
    wasShrunk: false,
    fitErrors: [],
  },
};

const FACE_PARAMETERS: FaceParameters = {
  text: "L",
  textSize: 1,
  depth: 0.2,
  color: "#000000",
  rotationDegrees: 0,
  autoFit: false,
};

const planarBounds = (geometry: unknown) => {
  const [[minX, minY], [maxX, maxY]] = measurements.measureBoundingBox(geometry as never);
  return { minX, minY, maxX, maxY };
};

const contourBounds = (contours: readonly TextContour[]) => {
  const points = contours.flat();
  const xs = points.map((point) => Array.isArray(point) ? point[0] : point.x);
  const ys = points.map((point) => Array.isArray(point) ? point[1] : point.y);

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
};

const fittedTextFromContours = (contours: readonly TextContour[]): FittedTextContours => ({
  contours,
  requestedSize: 1,
  fittedSize: 1,
  scale: 1,
  diagnostics: {
    requestedSize: 1,
    fittedSize: 1,
    scale: 1,
    wasShrunk: false,
    fitErrors: [],
  },
});

const contourCentroid = (contour: readonly { x: number; y: number }[]): [number, number] => {
  const open = contour.length > 1 && contour[0].x === contour.at(-1)?.x && contour[0].y === contour.at(-1)?.y
    ? contour.slice(0, -1)
    : contour;
  let areaTwice = 0;
  let x = 0;
  let y = 0;

  for (let index = 0, previousIndex = open.length - 1; index < open.length; previousIndex = index, index += 1) {
    const current = open[index];
    const previous = open[previousIndex];
    const cross = previous.x * current.y - current.x * previous.y;
    areaTwice += cross;
    x += (previous.x + current.x) * cross;
    y += (previous.y + current.y) * cross;
  }

  return [x / (3 * areaTwice), y / (3 * areaTwice)];
};

const fittedTokenOHoleCenter = (): [number, number] => {
  const sourceContours = textToContours("TOKEN", { textSizeMm: DEFAULT_COIN_PARAMETERS.topFace.textSize }).contours;
  const oHole = classifyContours(sourceContours).find(({ holes }) => holes.length === 1)?.holes[0];
  expect(oHole).toBeDefined();
  const oHoleIndex = sourceContours.findIndex((contour) => contour === oHole);
  expect(oHoleIndex).toBeGreaterThanOrEqual(0);
  const fitted = fitTextToCircle(
    sourceContours.map((contour) => contour.map((point) => [point.x, point.y] as const)),
    DEFAULT_COIN_PARAMETERS.topFace.textSize,
    DEFAULT_COIN_PARAMETERS.diameter / 2 - DEFAULT_COIN_PARAMETERS.borderWidth,
    DEFAULT_COIN_PARAMETERS.topFace.rotationDegrees,
    "shrink-only",
  );
  const fittedHole = fitted.contours[oHoleIndex].map(([x, y]) => ({ x, y }));

  return contourCentroid(fittedHole);
};

const expectPlanarBounds = (
  geometry: unknown,
  expected: { minX: number; minY: number; maxX: number; maxY: number },
) => {
  const actual = planarBounds(geometry);
  approximate(actual.minX, expected.minX);
  approximate(actual.minY, expected.minY);
  approximate(actual.maxX, expected.maxX);
  approximate(actual.maxY, expected.maxY);
};

describe("default coin geometry", () => {
  it("generates populated, fitted production coin parts with non-overlapping body and border", () => {
    const coin = generateCoin(DEFAULT_COIN_PARAMETERS);
    const parts = Object.values(coin.parts).map((part) => part.geometry);
    const combined = booleans.union(...parts);
    const expectedCylinder = createFullCoinCylinder();
    const usableRadius = DEFAULT_COIN_PARAMETERS.diameter / 2 - DEFAULT_COIN_PARAMETERS.borderWidth;

    expect(Object.keys(coin.parts)).toEqual(["body", "borderRing", "topText", "bottomText"]);
    expect(coin.parts.body).toMatchObject({
      name: COIN_PART_NAMES.body,
      color: DEFAULT_COIN_PARAMETERS.bodyColor,
    });
    expect(coin.parts.borderRing).toMatchObject({
      name: COIN_PART_NAMES.borderRing,
      color: DEFAULT_COIN_PARAMETERS.borderColor,
    });
    expect(coin.parts.topText).toMatchObject({
      name: COIN_PART_NAMES.topText,
      color: DEFAULT_COIN_PARAMETERS.topFace.color,
    });
    expect(coin.parts.bottomText).toMatchObject({
      name: COIN_PART_NAMES.bottomText,
      color: DEFAULT_COIN_PARAMETERS.bottomFace.color,
    });

    for (const part of Object.values(coin.parts)) {
      expect(polygonCount(part.geometry)).toBeGreaterThan(0);
      expect(volume(part.geometry)).toBeGreaterThan(0);
    }

    const [[minX, minY, minZ], [maxX, maxY, maxZ]] = measurements.measureBoundingBox(combined);
    approximate(maxX - minX, 39);
    approximate(maxY - minY, 39);
    approximate(maxZ - minZ, 3.5);

    const borderRadii = radialBounds(coin.parts.borderRing.geometry);
    approximate(borderRadii.max, 19.5);
    approximate(borderRadii.min, 17.5);

    const topTextBounds = measurements.measureBoundingBox(coin.parts.topText.geometry);
    approximate(topTextBounds[0][2], 3.3);
    approximate(topTextBounds[1][2], 3.5);
    expect(radialBounds(coin.parts.topText.geometry).max).toBeLessThanOrEqual(usableRadius + TOLERANCE_MM);

    const bottomTextBounds = measurements.measureBoundingBox(coin.parts.bottomText.geometry);
    approximate(bottomTextBounds[0][2], 0);
    approximate(bottomTextBounds[1][2], 0.2);
    expect(radialBounds(coin.parts.bottomText.geometry).max).toBeLessThanOrEqual(usableRadius + TOLERANCE_MM);

    expect(volume(booleans.intersect(coin.parts.body.geometry, coin.parts.borderRing.geometry))).toBeLessThanOrEqual(
      OVERLAP_TOLERANCE_MM3,
    );

    expect(Math.abs(volume(combined) - volume(expectedCylinder))).toBeLessThanOrEqual(
      VOLUME_TOLERANCE_MM3,
    );
  });

  it("wraps face text on whitespace before fitting it inside the usable circle", () => {
    const coin = generateCoin({
      ...DEFAULT_COIN_PARAMETERS,
      fitMode: "fixed",
      topFace: {
        ...DEFAULT_COIN_PARAMETERS.topFace,
        text: "ONE TWO THREE FOUR",
        textSize: 5,
        autoFit: false,
      },
    });

    expect(coin.parts.topText.metadata.scale).toBe(1);
    expect(radialBounds(coin.parts.topText.geometry).max).toBeLessThanOrEqual(
      DEFAULT_COIN_PARAMETERS.diameter / 2 - DEFAULT_COIN_PARAMETERS.borderWidth + TOLERANCE_MM,
    );
  });

  it("keeps the O counter open in full TOKEN coin text while preserving body material behind it", () => {
    const coin = generateCoin({
      ...DEFAULT_COIN_PARAMETERS,
      topFace: { ...DEFAULT_COIN_PARAMETERS.topFace, text: "TOKEN" },
    });
    const [x, y] = fittedTokenOHoleCenter();
    const probe = primitives.cylinder({
      center: [-x, y, DEFAULT_COIN_PARAMETERS.thickness - DEFAULT_COIN_PARAMETERS.topFace.depth / 2],
      height: DEFAULT_COIN_PARAMETERS.topFace.depth,
      radius: 0.05,
      segments: 16,
    });

    expect(volume(booleans.intersect(coin.parts.topText.geometry, probe))).toBeLessThan(1e-8);
    expect(volume(booleans.intersect(coin.parts.body.geometry, probe))).toBeGreaterThan(0);
  });
});

describe("face text orientation", () => {
  it("mirrors top text for export and preview", () => {
    const topText = createFaceText({
      face: "top",
      faceParameters: FACE_PARAMETERS,
      fittedText: FITTED_TEXT,
      thickness: DEFAULT_COIN_PARAMETERS.thickness,
    });

    expectPlanarBounds(topText.geometry, { minX: -3, minY: 2, maxX: -1, maxY: 4 });
  });

  it("mirrors asymmetric top text contours", () => {
    const sourceContours = textToContours("L", { textSizeMm: 6 }).contours
      .map((contour) => contour.map((point) => [point.x, point.y] as const));
    const sourceBounds = contourBounds(sourceContours);
    const topText = createFaceText({
      face: "top",
      faceParameters: { ...FACE_PARAMETERS, text: "L", textSize: 6 },
      fittedText: fittedTextFromContours(sourceContours),
      thickness: DEFAULT_COIN_PARAMETERS.thickness,
    });

    expectPlanarBounds(topText.geometry, {
      minX: -sourceBounds.maxX,
      minY: sourceBounds.minY,
      maxX: -sourceBounds.minX,
      maxY: sourceBounds.maxY,
    });
  });

  it.each([
    ["top-to-bottom", { minX: -3, minY: -4, maxX: -1, maxY: -2 }],
    ["left-to-right", { minX: 1, minY: 2, maxX: 3, maxY: 4 }],
  ] satisfies readonly [BottomTextOrientation, { minX: number; minY: number; maxX: number; maxY: number }][])(
    "mirrors bottom text for underside readability before applying the %s flip",
    (bottomTextOrientation, expectedBounds) => {
      const bottomText = createFaceText({
        face: "bottom",
        faceParameters: { ...FACE_PARAMETERS, bottomTextOrientation },
        fittedText: FITTED_TEXT,
        thickness: DEFAULT_COIN_PARAMETERS.thickness,
      });

      expectPlanarBounds(bottomText.geometry, expectedBounds);
    },
  );
});
