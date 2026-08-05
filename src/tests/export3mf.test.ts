import { booleans, primitives, transforms } from "@jscad/modeling";
import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";

import { createCoin3mf, createCoin3mfFilename } from "../export/export3mf";
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

const buildDefaultRealCoinParts = (): ModelPart[] => {
  const { diameter, thickness, borderWidth, circleSegments, topFace, bottomFace } =
    DEFAULT_COIN_PARAMETERS;
  const radius = diameter / 2;
  const topSurfaceZ = thickness / 2;
  const textDepth = Math.max(topFace.depth, bottomFace.depth);

  const body = primitives.cylinder({ radius, height: thickness, segments: circleSegments });
  const borderRing = booleans.subtract(
    primitives.cylinder({ radius, height: thickness + textDepth, segments: circleSegments }),
    primitives.cylinder({
      radius: radius - borderWidth,
      height: thickness + textDepth * 2,
      segments: circleSegments,
    }),
  );
  const topText = transforms.translate(
    [0, radius * 0.23, topSurfaceZ + topFace.depth / 2],
    primitives.cuboid({ size: [topFace.text.length * topFace.textSize * 0.55, topFace.textSize, topFace.depth] }),
  );
  const bottomText = transforms.translate(
    [0, -radius * 0.27, topSurfaceZ + bottomFace.depth / 2],
    primitives.cuboid({
      size: [bottomFace.text.length * bottomFace.textSize * 0.55, bottomFace.textSize, bottomFace.depth],
    }),
  );

  return [
    { id: 1, name: COIN_PART_NAMES.body, color: DEFAULT_COIN_PARAMETERS.bodyColor, mesh: meshToTriangles(body) },
    {
      id: 2,
      name: COIN_PART_NAMES.borderRing,
      color: DEFAULT_COIN_PARAMETERS.borderColor,
      mesh: meshToTriangles(borderRing),
    },
    { id: 3, name: COIN_PART_NAMES.topText, color: topFace.color, mesh: meshToTriangles(topText) },
    { id: 4, name: COIN_PART_NAMES.bottomText, color: bottomFace.color, mesh: meshToTriangles(bottomText) },
  ];
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

  it("creates a sanitized coin 3MF filename from face text", () => {
    expect(
      createCoin3mfFilename({
        ...DEFAULT_COIN_PARAMETERS,
        topFace: { ...DEFAULT_COIN_PARAMETERS.topFace, text: "  Top Token! " },
        bottomFace: { ...DEFAULT_COIN_PARAMETERS.bottomFace, text: "Bottom / Face" },
      }),
    ).toBe("coin-Top-Token-Bottom-Face.3mf");
  });
  it("exports a default real coin as mesh components under a single parent build item", () => {
    const parts = buildDefaultRealCoinParts();
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

    expect(meshObjects).toHaveLength(4);
    expect(parentObjects).toHaveLength(1);

    const parentObject = parentObjects[0];
    const parentObjectId = parentObject.getAttribute("id");
    const parentComponents = parentObject.getElementsByTagName("component");

    expect(parentObjectId).toBe("5");
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

      const metadata = Array.from(meshObject?.getElementsByTagName("metadata") ?? []);
      expect(metadata.find((entry) => entry.getAttribute("name") === "name")?.textContent).toBe(part.name);
      expect(metadata.find((entry) => entry.getAttribute("name") === "color")?.textContent).toBe(part.color);
      expect(meshObject?.getElementsByTagName("vertex").length).toBeGreaterThan(0);
      expect(meshObject?.getElementsByTagName("triangle").length).toBeGreaterThan(0);
    }
  });
});
