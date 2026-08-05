import { primitives } from "@jscad/modeling";
import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";

import { createCoin3mf, createCoin3mfFilename, createCoinModelParts, generateCoin } from "../export/export3mf";
import { create3mfPackage } from "../export/create3mfPackage";
import { createModelXml, type ModelPart } from "../export/createModelXml";
import { meshToTriangles } from "../export/meshToTriangles";
import { DEFAULT_COIN_PARAMETERS } from "../model/defaults";
import { COIN_PART_NAMES } from "../model/generatedCoin";

const PARTS = [
  { objectId: 1, name: COIN_PART_NAMES.body, color: DEFAULT_COIN_PARAMETERS.bodyColor },
  { objectId: 2, name: COIN_PART_NAMES.borderRing, color: DEFAULT_COIN_PARAMETERS.borderColor },
  { objectId: 3, name: COIN_PART_NAMES.topText, color: DEFAULT_COIN_PARAMETERS.topFace.color },
  { objectId: 4, name: COIN_PART_NAMES.bottomText, color: DEFAULT_COIN_PARAMETERS.bottomFace.color },
] as const;

const buildDefaultProductionCoinParts = (): ModelPart[] =>
  createCoinModelParts(generateCoin(DEFAULT_COIN_PARAMETERS));

const buildPhase1CompatibilityFixtureParts = (): ModelPart[] => [
  {
    id: 1,
    name: COIN_PART_NAMES.body,
    color: DEFAULT_COIN_PARAMETERS.bodyColor,
    mesh: meshToTriangles(primitives.cuboid({ size: [1, 1, 1] })),
  },
  {
    id: 2,
    name: COIN_PART_NAMES.borderRing,
    color: DEFAULT_COIN_PARAMETERS.borderColor,
    mesh: meshToTriangles(primitives.cuboid({ size: [1, 1, 1] })),
  },
  {
    id: 3,
    name: COIN_PART_NAMES.topText,
    color: DEFAULT_COIN_PARAMETERS.topFace.color,
    mesh: meshToTriangles(primitives.cuboid({ size: [1, 1, 1] })),
  },
  {
    id: 4,
    name: COIN_PART_NAMES.bottomText,
    color: DEFAULT_COIN_PARAMETERS.bottomFace.color,
    mesh: meshToTriangles(primitives.cuboid({ size: [1, 1, 1] })),
  },
];

const countNonManifoldEdges = (part: ModelPart): number => {
  const edgeUseCounts = new Map<string, number>();

  for (const [first, second, third] of part.mesh.triangles) {
    const triangleEdges = [
      [first, second],
      [second, third],
      [third, first],
    ] as const;

    for (const [start, end] of triangleEdges) {
      const edgeKey = start < end ? `${start},${end}` : `${end},${start}`;
      edgeUseCounts.set(edgeKey, (edgeUseCounts.get(edgeKey) ?? 0) + 1);
    }
  }

  return Array.from(edgeUseCounts.values()).filter((useCount) => useCount !== 2).length;
};

const elementChildren = (element: Element, tagName: string): Element[] =>
  Array.from(element.children).filter((child) => child.localName === tagName);

const parseModelXml = (modelXml: string): XMLDocument => {
  const document = new DOMParser().parseFromString(modelXml, "application/xml");
  const parserError = document.querySelector("parsererror");

  expect(parserError?.textContent ?? "").toBe("");

  return document;
};

describe("3MF export", () => {
  it("exports generated coin parameters through the production 3MF API", () => {
    const archive = createCoin3mf(DEFAULT_COIN_PARAMETERS);
    const files = unzipSync(archive);
    const modelXml = strFromU8(files["3D/3dmodel.model"]);
    const modelDocument = parseModelXml(modelXml);

    const meshObjects = Array.from(modelDocument.getElementsByTagName("object")).filter(
      (object) => elementChildren(object, "mesh").length === 1,
    );

    expect(meshObjects.map((object) => object.getAttribute("name"))).toEqual([
      COIN_PART_NAMES.body,
      COIN_PART_NAMES.borderRing,
      COIN_PART_NAMES.topText,
      COIN_PART_NAMES.bottomText,
    ]);
    expect(
      meshObjects.map((object) =>
        Array.from(object.getElementsByTagName("metadata")).find(
          (entry) => entry.getAttribute("name") === "color",
        )?.textContent,
      ),
    ).toEqual([
      DEFAULT_COIN_PARAMETERS.bodyColor,
      DEFAULT_COIN_PARAMETERS.borderColor,
      DEFAULT_COIN_PARAMETERS.topFace.color,
      DEFAULT_COIN_PARAMETERS.bottomFace.color,
    ]);
  });

  it("keeps the Phase 1 compatibility fixture exportable", () => {
    const archive = create3mfPackage(createModelXml(buildPhase1CompatibilityFixtureParts()));
    const files = unzipSync(archive);
    const modelXml = strFromU8(files["3D/3dmodel.model"]);
    const modelDocument = parseModelXml(modelXml);

    expect(modelDocument.getElementsByTagName("object")).toHaveLength(5);
    expect(modelDocument.getElementsByTagName("triangle").length).toBeGreaterThan(0);
  });

  it("creates a sanitized coin 3MF filename from face text", () => {
    expect(
      createCoin3mfFilename({
        ...DEFAULT_COIN_PARAMETERS,
        topFace: { ...DEFAULT_COIN_PARAMETERS.topFace, text: "  Top Token! " },
        bottomFace: { ...DEFAULT_COIN_PARAMETERS.bottomFace, text: "Bottom / Face" },
      }),
    ).toBe("coin-Top-Token-Bottom-Face.3mf");
  });

  it("exports production generated coin parts as mesh components under a single parent build item", () => {
    const parts = buildDefaultProductionCoinParts();
    const archive = create3mfPackage(createModelXml(parts));
    const files = unzipSync(archive);

    expect(files).toHaveProperty("[Content_Types].xml");
    expect(files).toHaveProperty("_rels/.rels");
    expect(files).toHaveProperty("3D/3dmodel.model");

    const modelXml = strFromU8(files["3D/3dmodel.model"]);
    const modelDocument = parseModelXml(modelXml);
    const model = modelDocument.getElementsByTagName("model")[0];

    expect(model).toBeDefined();
    expect(model.getAttribute("unit")).toBe("millimeter");

    const resources = model.getElementsByTagName("resources")[0];
    const resourceObjects = elementChildren(resources, "object");
    const meshObjects = resourceObjects.filter((object) => elementChildren(object, "mesh").length === 1);
    const parentObjects = resourceObjects.filter(
      (object) => elementChildren(object, "components").length === 1,
    );

    const baseMaterials = elementChildren(resources, "basematerials");

    expect(baseMaterials).toHaveLength(1);
    expect(baseMaterials[0].getAttribute("id")).toBe("1");

    const baseMaterialEntries = elementChildren(baseMaterials[0], "base");

    expect(baseMaterialEntries).toHaveLength(4);
    expect(baseMaterialEntries.map((base) => base.getAttribute("name"))).toEqual(
      PARTS.map((part) => part.name),
    );
    expect(baseMaterialEntries.map((base) => base.getAttribute("displaycolor"))).toEqual(
      PARTS.map((part) => part.color),
    );
    expect(meshObjects).toHaveLength(4);
    expect(parentObjects).toHaveLength(1);

    const parentObject = parentObjects[0];
    const parentObjectId = parentObject.getAttribute("id");
    const parentComponents = parentObject.getElementsByTagName("component");

    expect(parentObjectId).toBe("5");
    expect(parentObject.getAttribute("name")).toBe("Text Token");
    expect(elementChildren(parentObject, "mesh")).toHaveLength(0);
    expect(parentComponents).toHaveLength(4);
    expect(Array.from(parentComponents).map((component) => component.getAttribute("objectid"))).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);

    const build = model.getElementsByTagName("build")[0];
    const buildItems = elementChildren(build, "item");

    expect(buildItems).toHaveLength(1);
    expect(buildItems[0].getAttribute("objectid")).toBe(parentObjectId);
    expect(PARTS.map((part) => part.objectId.toString())).not.toContain(
      buildItems[0].getAttribute("objectid"),
    );

    for (const part of PARTS) {
      const meshObject = meshObjects.find((object) => object.getAttribute("id") === part.objectId.toString());

      expect(meshObject).toBeDefined();
      expect(meshObject?.getAttribute("name")).toBe(part.name);
      expect(meshObject?.getAttribute("partnumber")).toBe(part.name);
      expect(meshObject?.getAttribute("pid")).toBe("1");
      expect(meshObject?.getAttribute("pindex")).toBe((part.objectId - 1).toString());

      const metadata = Array.from(meshObject?.getElementsByTagName("metadata") ?? []);
      expect(metadata.find((entry) => entry.getAttribute("name") === "name")?.textContent).toBe(part.name);
      expect(metadata.find((entry) => entry.getAttribute("name") === "color")?.textContent).toBe(part.color);
      expect(meshObject?.getElementsByTagName("vertex").length).toBeGreaterThan(0);
      const triangles = Array.from(meshObject?.getElementsByTagName("triangle") ?? []);

      expect(triangles.length).toBeGreaterThan(0);
      expect(triangles.every((triangle) => triangle.getAttribute("pid") === "1")).toBe(true);
      expect(
        triangles.every(
          (triangle) =>
            triangle.getAttribute("p1") === (part.objectId - 1).toString() &&
            triangle.getAttribute("p2") === (part.objectId - 1).toString() &&
            triangle.getAttribute("p3") === (part.objectId - 1).toString(),
        ),
      ).toBe(true);
    }
  });

  it("exports each production coin part as a closed manifold triangle mesh", () => {
    const parts = buildDefaultProductionCoinParts();

    expect(Object.fromEntries(parts.map((part) => [part.name, countNonManifoldEdges(part)]))).toEqual({
      [COIN_PART_NAMES.body]: 0,
      [COIN_PART_NAMES.borderRing]: 0,
      [COIN_PART_NAMES.topText]: 0,
      [COIN_PART_NAMES.bottomText]: 0,
    });
  });
});
