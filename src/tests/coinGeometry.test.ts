import { beforeAll, describe, expect, it } from "vitest";
import { geometries } from "@jscad/modeling";

import { generateCoin } from "../geometry/createCoin";
import { faceTextZBounds } from "../geometry/createFaceText";
import { DEFAULT_COIN_PARAMETERS } from "../model/defaults";
import { ensureTestFont } from "./ensureTestFont";

beforeAll(() => {
  ensureTestFont();
});

describe("coin geometry", () => {
  it("matches default overall dimensions", () => {
    const coin = generateCoin(DEFAULT_COIN_PARAMETERS);
    expect(coin.bounds.width).toBe(39);
    expect(coin.bounds.depth).toBe(39);
    expect(coin.bounds.height).toBe(3.5);
    expect(coin.bounds.outerRadius).toBe(19.5);
    expect(coin.bounds.innerRadius).toBe(17.5);
  });

  it("places top and bottom text at expected Z ranges", () => {
    expect(faceTextZBounds("top", 0.2, 3.5)).toEqual([3.3, 3.5]);
    expect(faceTextZBounds("bottom", 0.2, 3.5)).toEqual([0, 0.2]);
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
    expect(Math.min(...zs)).toBeGreaterThanOrEqual(3.3 - 0.05);
    expect(Math.max(...zs)).toBeLessThanOrEqual(3.5 + 0.05);
  });

  it("keeps bottom text Z within the bottom pocket range", () => {
    const coin = generateCoin(DEFAULT_COIN_PARAMETERS);
    const polygons = geometries.geom3.toPolygons(coin.parts.bottomText.geometry);
    const zs = polygons.flatMap((polygon) => polygon.vertices.map((vertex) => vertex[2]));
    expect(Math.min(...zs)).toBeGreaterThanOrEqual(-0.05);
    expect(Math.max(...zs)).toBeLessThanOrEqual(0.2 + 0.05);
  });
});
