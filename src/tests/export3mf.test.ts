import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync, zipSync } from "fflate";

import { COIN_PART_NAMES } from "../model/generatedCoin";

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';

const PARTS = [
  { objectId: 1, name: COIN_PART_NAMES.body, color: "#d1d5db", materialId: 1 },
  { objectId: 2, name: COIN_PART_NAMES.borderRing, color: "#9ca3af", materialId: 2 },
  { objectId: 3, name: COIN_PART_NAMES.topText, color: "#111827", materialId: 3 },
  { objectId: 4, name: COIN_PART_NAMES.bottomText, color: "#111827", materialId: 4 },
] as const;

const PARENT_OBJECT_ID = 5;

const generatePhase1Compatibility3mf = (): Uint8Array => {
  const contentTypes = `${XML_DECLARATION}
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`;

  const relationships = `${XML_DECLARATION}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`;

  const materials = PARTS.map(
    (part) =>
      `<basematerial id="${part.materialId}" name="${part.name}" displaycolor="${part.color}"/>`,
  ).join("");

  const meshObjects = PARTS.map(
    (part) => `<object id="${part.objectId}" type="model" name="${part.name}" pid="1" pindex="${
      part.materialId - 1
    }"><mesh><vertices><vertex x="0" y="0" z="0"/><vertex x="1" y="0" z="0"/><vertex x="0" y="1" z="0"/></vertices><triangles><triangle v1="0" v2="1" v3="2"/></triangles></mesh></object>`,
  ).join("");

  const components = PARTS.map(
    (part) => `<component objectid="${part.objectId}"/>`,
  ).join("");

  const model = `${XML_DECLARATION}
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <resources>
    <basematerials id="1">${materials}</basematerials>
    ${meshObjects}
    <object id="${PARENT_OBJECT_ID}" type="model" name="Text Token"><components>${components}</components></object>
  </resources>
  <build><item objectid="${PARENT_OBJECT_ID}"/></build>
</model>`;

  return zipSync({
    "[Content_Types].xml": new TextEncoder().encode(contentTypes),
    "_rels/.rels": new TextEncoder().encode(relationships),
    "3D/3dmodel.model": new TextEncoder().encode(model),
  });
};

describe("Phase 1 compatibility 3MF export", () => {
  it("emits the required package files, mesh objects, components, build item, names, and colors", () => {
    const archive = generatePhase1Compatibility3mf();
    const files = unzipSync(archive);

    expect(files).toHaveProperty("[Content_Types].xml");
    expect(files).toHaveProperty("_rels/.rels");
    expect(files).toHaveProperty("3D/3dmodel.model");

    const modelXml = strFromU8(files["3D/3dmodel.model"]);

    expect(modelXml).toContain('unit="millimeter"');

    const meshObjectMatches = modelXml.match(/<object\b(?=[^>]*\btype="model")(?=[\s\S]*?<mesh>)/g) ?? [];
    expect(meshObjectMatches).toHaveLength(4);

    const parentObjectMatch = modelXml.match(
      new RegExp(`<object\\b[^>]*\\bid="${PARENT_OBJECT_ID}"[^>]*>[\\s\\S]*?<components>([\\s\\S]*?)</components>[\\s\\S]*?</object>`),
    );
    expect(parentObjectMatch).not.toBeNull();
    expect(parentObjectMatch?.[1].match(/<component\b/g) ?? []).toHaveLength(4);

    const buildMatch = modelXml.match(/<build>([\s\S]*?)<\/build>/);
    expect(buildMatch).not.toBeNull();
    const buildItemMatches = buildMatch?.[1].match(/<item\b[^>]*>/g) ?? [];
    expect(buildItemMatches).toHaveLength(1);
    expect(buildItemMatches[0]).toContain(`objectid="${PARENT_OBJECT_ID}"`);

    for (const part of PARTS) {
      expect(modelXml).toContain(`name="${part.name}"`);
      expect(modelXml).toContain(`displaycolor="${part.color}"`);
      expect(modelXml).toContain(`pindex="${part.materialId - 1}"`);
    }
  });
});
