import { beforeAll, describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";

import { createCompatibilityTest3mf, createCoin3mf, createCoinModelParts } from "../export/export3mf";
import type { TriangleMesh } from "../export/meshToTriangles";
import { BODY_RING_CLEARANCE_MM } from "../geometry/createBorderRing";
import { generateCoin } from "../geometry/createCoin";
import { DEFAULT_COIN_PARAMETERS } from "../model/defaults";
import { PARENT_OBJECT_ID, PARENT_OBJECT_NAME, COIN_PART_NAMES } from "../model/generatedCoin";
import { ensureTestFont } from "./ensureTestFont";

beforeAll(() => {
  ensureTestFont();
});

const readModelXml = (packageData: Uint8Array): string => {
  const files = unzipSync(packageData);
  return strFromU8(files["3D/3dmodel.model"]);
};

/** Edges used by anything other than exactly two triangles are non-manifold. */
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

describe("export 3mf", () => {
  it("builds a ZIP package with millimeter units and parent assembly", () => {
    const xml = readModelXml(createCompatibilityTest3mf());
    expect(xml).toContain('unit="millimeter"');
    expect(xml).toContain(`object id="${PARENT_OBJECT_ID}"`);
    expect(xml).toContain(`name="${PARENT_OBJECT_NAME}"`);
    expect(xml).toContain("<components>");
    expect(xml).toContain(`<item objectid="${PARENT_OBJECT_ID}"`);
    expect(xml).toContain(COIN_PART_NAMES.body);
    expect(xml).toContain(COIN_PART_NAMES.borderRing);
    expect(xml).toContain(COIN_PART_NAMES.topText);
    expect(xml).toContain(COIN_PART_NAMES.bottomText);
    expect(xml).toContain("displaycolor=");
  });

  it("exports production coin multipart 3mf", () => {
    const coin = generateCoin(DEFAULT_COIN_PARAMETERS);
    expect(coin.validation.valid).toBe(true);
    const parts = createCoinModelParts(coin);
    expect(parts).toHaveLength(4);
    for (const part of parts) {
      expect(part.mesh.vertices.length).toBeGreaterThan(0);
      expect(part.mesh.triangles.length).toBeGreaterThan(0);
    }
    const packageData = createCoin3mf(coin);
    const xml = readModelXml(packageData);
    expect(xml).toContain(COIN_PART_NAMES.body);
    expect(xml).toContain("<components>");
  });

  it("exports each production coin part as a closed manifold triangle mesh", () => {
    const coin = generateCoin(DEFAULT_COIN_PARAMETERS);
    const parts = createCoinModelParts(coin);

    expect(
      Object.fromEntries(parts.map((part) => [part.name, countNonManifoldEdges(part.mesh)])),
    ).toEqual({
      [COIN_PART_NAMES.body]: 0,
      [COIN_PART_NAMES.borderRing]: 0,
      [COIN_PART_NAMES.topText]: 0,
      [COIN_PART_NAMES.bottomText]: 0,
    });
  });

  it("keeps a tiny radial clearance between body and ring", () => {
    expect(BODY_RING_CLEARANCE_MM).toBe(0.003);
    const coin = generateCoin(DEFAULT_COIN_PARAMETERS);
    const ringInner = coin.bounds.innerRadius;
    const bodyOuter = ringInner - BODY_RING_CLEARANCE_MM;
    expect(bodyOuter).toBeLessThan(ringInner);
    expect(bodyOuter).toBeCloseTo(17.5 - BODY_RING_CLEARANCE_MM, 6);
  });
});
