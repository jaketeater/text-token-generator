import { describe, expect, it } from "vitest";
import modeling from "@jscad/modeling";

import { generateCoin } from "../export/export3mf";
import { DEFAULT_COIN_PARAMETERS } from "../model/defaults";

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

describe("default coin geometry", () => {
  it("generates populated, fitted, non-overlapping production coin parts", () => {
    const coin = generateCoin(DEFAULT_COIN_PARAMETERS);
    const parts = Object.values(coin.parts).map((part) => part.geometry);
    const combined = booleans.union(...parts);
    const expectedCylinder = createFullCoinCylinder();
    const usableRadius = DEFAULT_COIN_PARAMETERS.diameter / 2 - DEFAULT_COIN_PARAMETERS.borderWidth;

    expect(Object.keys(coin.parts)).toEqual(["body", "borderRing", "topText", "bottomText"]);
    expect(volume(coin.parts.body.geometry)).toBeGreaterThan(0);
    expect(volume(coin.parts.borderRing.geometry)).toBeGreaterThan(0);
    expect(volume(coin.parts.topText.geometry)).toBeGreaterThan(0);
    expect(volume(coin.parts.bottomText.geometry)).toBeGreaterThan(0);

    const [[minX, minY, minZ], [maxX, maxY, maxZ]] = measurements.measureBoundingBox(combined);
    approximate(maxX - minX, DEFAULT_COIN_PARAMETERS.diameter);
    approximate(maxY - minY, DEFAULT_COIN_PARAMETERS.diameter);
    approximate(maxZ - minZ, DEFAULT_COIN_PARAMETERS.thickness);

    const borderRadii = radialBounds(coin.parts.borderRing.geometry);
    approximate(borderRadii.max, DEFAULT_COIN_PARAMETERS.diameter / 2);
    approximate(borderRadii.min, usableRadius);

    const topTextBounds = measurements.measureBoundingBox(coin.parts.topText.geometry);
    approximate(topTextBounds[0][2], DEFAULT_COIN_PARAMETERS.thickness - DEFAULT_COIN_PARAMETERS.topFace.depth);
    approximate(topTextBounds[1][2], DEFAULT_COIN_PARAMETERS.thickness);
    expect(radialBounds(coin.parts.topText.geometry).max).toBeLessThanOrEqual(usableRadius + TOLERANCE_MM);

    const bottomTextBounds = measurements.measureBoundingBox(coin.parts.bottomText.geometry);
    approximate(bottomTextBounds[0][2], 0);
    approximate(bottomTextBounds[1][2], DEFAULT_COIN_PARAMETERS.bottomFace.depth);
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
