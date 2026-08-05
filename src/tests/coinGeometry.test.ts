import { describe, expect, it } from "vitest";
import modeling from "@jscad/modeling";

const { booleans, measurements, primitives } = modeling;

const TOLERANCE_MM = 0.05;
const VOLUME_TOLERANCE_MM3 = 2;
const OVERLAP_TOLERANCE_MM3 = 0.001;

const DEFAULT_COIN = {
  diameter: 39,
  thickness: 3.5,
  borderWidth: 2,
  textDepth: 0.2,
  segments: 128,
} as const;

type Point3 = [number, number, number];
type Mat4 = readonly [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
];

const approximate = (actual: number, expected: number, tolerance = TOLERANCE_MM) => {
  expect(actual).toBeGreaterThanOrEqual(expected - tolerance);
  expect(actual).toBeLessThanOrEqual(expected + tolerance);
};

const makeCylinder = (radius: number, zMin: number, zMax: number) =>
  primitives.cylinder({
    radius,
    height: zMax - zMin,
    center: [0, 0, (zMin + zMax) / 2],
    segments: DEFAULT_COIN.segments,
  });

const makeTextBlock = ([x, y, z]: Point3) =>
  primitives.cuboid({
    center: [x, y, z + DEFAULT_COIN.textDepth / 2],
    size: [0.8, 0.8, DEFAULT_COIN.textDepth],
  });

const applyMatrix = (matrix: Mat4, [x, y, z]: Point3): Point3 => [
  matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
  matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
  matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
];

const topTextTransform: Mat4 = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, DEFAULT_COIN.thickness - DEFAULT_COIN.textDepth, 1,
];

const bottomTextTransform: Mat4 = [
  -1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, -1, 0,
  0, 0, 0, 1,
];

const topFittedTextPoints: Point3[] = [
  [-12, 0, 0],
  [-6, 3, 0],
  [0, -3, 0],
  [6, 3, 0],
  [12, 0, 0],
];

const bottomFittedTextPoints: Point3[] = [
  [-14, -2, 0],
  [-7, 2, 0],
  [0, -2, 0],
  [7, 2, 0],
  [14, -2, 0],
];

const generateDefaultCoin = () => {
  const outerRadius = DEFAULT_COIN.diameter / 2;
  const usableRadius = outerRadius - DEFAULT_COIN.borderWidth;
  const originalCylinder = makeCylinder(outerRadius, 0, DEFAULT_COIN.thickness);
  const borderRing = booleans.subtract(
    originalCylinder,
    makeCylinder(usableRadius, 0, DEFAULT_COIN.thickness),
  );
  const topText = booleans.union(
    ...topFittedTextPoints.map((point) => makeTextBlock(applyMatrix(topTextTransform, point))),
  );
  const bottomText = booleans.union(
    ...bottomFittedTextPoints.map((point) => makeTextBlock(applyMatrix(bottomTextTransform, point))),
  );
  const body = booleans.subtract(
    makeCylinder(usableRadius, 0, DEFAULT_COIN.thickness),
    topText,
    bottomText,
  );

  return {
    originalCylinder,
    usableRadius,
    fittedTextPoints: [...topFittedTextPoints, ...bottomFittedTextPoints],
    parts: { body, borderRing, topText, bottomText },
    transforms: { topTextTransform, bottomTextTransform },
  };
};

const radialBounds = (geometry: unknown) => {
  const polygons = modeling.geometries.geom3.toPolygons(geometry as never);
  const radii = polygons.flatMap((polygon) =>
    polygon.vertices.map(([x, y]) => Math.hypot(x, y)),
  );
  return { min: Math.min(...radii), max: Math.max(...radii) };
};

const volume = (geometry: unknown) => measurements.measureVolume(geometry as never);

describe("default coin geometry", () => {
  it("generates expected dimensions, placement, fit, separations, volume, and face orientations", () => {
    const coin = generateDefaultCoin();
    const parts = Object.values(coin.parts);
    const combined = booleans.union(...parts);

    const [[minX, minY, minZ], [maxX, maxY, maxZ]] = measurements.measureBoundingBox(combined);
    approximate(maxX - minX, 39);
    approximate(maxY - minY, 39);
    approximate(maxZ - minZ, 3.5);

    const borderRadii = radialBounds(coin.parts.borderRing);
    approximate(borderRadii.max, 19.5);
    approximate(borderRadii.min, 17.5);

    const topTextBounds = measurements.measureBoundingBox(coin.parts.topText);
    approximate(topTextBounds[0][2], 3.3);
    approximate(topTextBounds[1][2], 3.5);

    const bottomTextBounds = measurements.measureBoundingBox(coin.parts.bottomText);
    approximate(bottomTextBounds[0][2], 0.0);
    approximate(bottomTextBounds[1][2], 0.2);

    for (const [x, y] of coin.fittedTextPoints) {
      expect(Math.hypot(x, y)).toBeLessThanOrEqual(coin.usableRadius);
    }

    for (let first = 0; first < parts.length; first += 1) {
      for (let second = first + 1; second < parts.length; second += 1) {
        expect(volume(booleans.intersect(parts[first], parts[second]))).toBeLessThanOrEqual(
          OVERLAP_TOLERANCE_MM3,
        );
      }
    }

    expect(volume(combined)).toBeCloseTo(volume(coin.originalCylinder), 0);
    expect(Math.abs(volume(combined) - volume(coin.originalCylinder))).toBeLessThanOrEqual(
      VOLUME_TOLERANCE_MM3,
    );

    expect(applyMatrix(coin.transforms.topTextTransform, [1, 0, 0])).toEqual([1, 0, 3.3]);
    expect(applyMatrix(coin.transforms.topTextTransform, [0, 0, 1])).toEqual([0, 0, 4.3]);
    expect(applyMatrix(coin.transforms.bottomTextTransform, [1, 0, 0])).toEqual([-1, 0, 0]);
    expect(applyMatrix(coin.transforms.bottomTextTransform, [0, 0, 1])).toEqual([0, 0, -1]);
  });
});
