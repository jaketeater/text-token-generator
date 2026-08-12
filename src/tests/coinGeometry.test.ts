import { beforeAll, describe, expect, it } from "vitest";
import { geometries } from "@jscad/modeling";

import { createCoinModelParts } from "../export/export3mf";
import type { TriangleMesh } from "../export/meshToTriangles";
import { generateCoin } from "../geometry/createCoin";
import { faceTextZBounds } from "../geometry/createFaceText";
import { validateCoinParameters } from "../geometry/validateGeometry";
import { DEFAULT_COIN_PARAMETERS } from "../model/defaults";
import { COIN_PART_NAMES } from "../model/generatedCoin";
import { ensureTestFont } from "./ensureTestFont";

beforeAll(() => {
  ensureTestFont();
});

const countNonManifoldEdges = (mesh: TriangleMesh): number => {
  const edgeUseCounts = new Map<string, number>();
  for (const [first, second, third] of mesh.triangles) {
    for (const [start, end] of [
      [first, second],
      [second, third],
      [third, first],
    ] as const) {
      const edgeKey = start < end ? `${start},${end}` : `${end},${start}`;
      edgeUseCounts.set(edgeKey, (edgeUseCounts.get(edgeKey) ?? 0) + 1);
    }
  }
  return Array.from(edgeUseCounts.values()).filter((useCount) => useCount !== 2).length;
};

describe("coin geometry", () => {
  it("matches default overall dimensions", () => {
    const coin = generateCoin(DEFAULT_COIN_PARAMETERS);
    expect(coin.bounds.width).toBe(50);
    expect(coin.bounds.depth).toBe(50);
    expect(coin.bounds.height).toBe(3.5);
    expect(coin.bounds.outerRadius).toBe(25);
    expect(coin.bounds.innerRadius).toBe(23);
  });

  it("places top and bottom text at expected Z ranges", () => {
    expect(faceTextZBounds("top", 0.4, 3.5)).toEqual([3.1, 3.5]);
    expect(faceTextZBounds("bottom", 0.4, 3.5)).toEqual([0, 0.4]);
  });

  it("generates four named parts without validation errors for defaults", () => {
    const coin = generateCoin(DEFAULT_COIN_PARAMETERS);
    expect(coin.validation.valid).toBe(true);
    expect(coin.parts.body.name).toBe("Coin Body");
    expect(coin.parts.borderRing.name).toBe("Border Ring");
    expect(coin.parts.topText.name).toBe("Top Text");
    expect(coin.parts.bottomText.name).toBe("Bottom Text");
    expect(geometries.geom3.toPolygons(coin.parts.body.geometry).length).toBeGreaterThan(0);
    expect(geometries.geom3.toPolygons(coin.parts.topText.geometry).length).toBeGreaterThan(0);
  });

  it("keeps top text Z within the top pocket range", () => {
    const coin = generateCoin(DEFAULT_COIN_PARAMETERS);
    const polygons = geometries.geom3.toPolygons(coin.parts.topText.geometry);
    const zs = polygons.flatMap((polygon) => polygon.vertices.map((vertex) => vertex[2]));
    expect(Math.min(...zs)).toBeGreaterThanOrEqual(3.1 - 0.05);
    expect(Math.max(...zs)).toBeLessThanOrEqual(3.5 + 0.05);
  });

  it("keeps bottom text Z within the bottom pocket range", () => {
    const coin = generateCoin(DEFAULT_COIN_PARAMETERS);
    const polygons = geometries.geom3.toPolygons(coin.parts.bottomText.geometry);
    const zs = polygons.flatMap((polygon) => polygon.vertices.map((vertex) => vertex[2]));
    expect(Math.min(...zs)).toBeGreaterThanOrEqual(-0.05);
    expect(Math.max(...zs)).toBeLessThanOrEqual(0.4 + 0.05);
  });

  it("defaults to a 1 mm outer rim edge radius and keeps the filleted ring manifold", () => {
    expect(DEFAULT_COIN_PARAMETERS.edgeRadius).toBe(1);
    const coin = generateCoin(DEFAULT_COIN_PARAMETERS);
    const ringPart = createCoinModelParts(coin).find((part) => part.name === COIN_PART_NAMES.borderRing);
    expect(ringPart).toBeDefined();
    expect(countNonManifoldEdges(ringPart!.mesh)).toBe(0);
  });

  it("rejects an edge radius larger than half the thickness", () => {
    const result = validateCoinParameters({
      ...DEFAULT_COIN_PARAMETERS,
      edgeRadius: DEFAULT_COIN_PARAMETERS.thickness / 2 + 0.1,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.code === "edgeRadius.tooTall")).toBe(true);
  });

  it("rejects an edge radius larger than the border width", () => {
    const result = validateCoinParameters({
      ...DEFAULT_COIN_PARAMETERS,
      borderWidth: 0.5,
      edgeRadius: 1,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.code === "edgeRadius.tooWide")).toBe(true);
  });
});
