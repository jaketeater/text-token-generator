import { describe, expect, it } from "vitest";
import modeling from "@jscad/modeling";

import { generateCoin } from "../export/export3mf";
import { DEFAULT_COIN_PARAMETERS } from "../model/defaults";
import { COIN_PART_NAMES } from "../model/generatedCoin";
import { createFaceText, type FittedTextContours, type TextContour } from "../geometry/createFaceText";
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
  it("generates populated, fitted, non-overlapping production coin parts", () => {
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

    for (let first = 0; first < parts.length; first += 1) {
      for (let second = first + 1; second < parts.length; second += 1) {
        expect(volume(booleans.intersect(parts[first], parts[second]))).toBeLessThanOrEqual(
          OVERLAP_TOLERANCE_MM3,
        );
      }
    }

    expect(Math.abs(volume(combined) - volume(expectedCylinder))).toBeLessThanOrEqual(
      VOLUME_TOLERANCE_MM3,
    );
  });
});

describe("face text orientation", () => {
  it("keeps top text readable from above", () => {
    const topText = createFaceText({
      face: "top",
      faceParameters: FACE_PARAMETERS,
      fittedText: FITTED_TEXT,
      thickness: DEFAULT_COIN_PARAMETERS.thickness,
    });

    expectPlanarBounds(topText.geometry, { minX: 1, minY: 2, maxX: 3, maxY: 4 });
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
