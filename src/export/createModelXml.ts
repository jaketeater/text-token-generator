import { PARENT_OBJECT_ID, PARENT_OBJECT_NAME } from "../model/generatedCoin";
import type { TriangleMesh } from "./meshToTriangles";

export interface ModelPart {
  id: number;
  name: string;
  color: string;
  mesh: TriangleMesh;
}

const escapeXml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const formatNumber = (value: number): string => Number(value.toFixed(9)).toString();

const hexToDisplayColor = (color: string): string => {
  const normalized = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    return `${normalized.toUpperCase()}FF`;
  }
  if (/^#[0-9a-fA-F]{8}$/.test(normalized)) {
    return normalized.toUpperCase();
  }
  return "#808080FF";
};

const meshXml = (mesh: TriangleMesh, materialIndex: number): string => `
      <mesh>
        <vertices>
${mesh.vertices
  .map(([x, y, z]) => `          <vertex x="${formatNumber(x)}" y="${formatNumber(y)}" z="${formatNumber(z)}" />`)
  .join("\n")}
        </vertices>
        <triangles>
${mesh.triangles
  .map(
    ([v1, v2, v3]) =>
      `          <triangle v1="${v1}" v2="${v2}" v3="${v3}" pid="1" p1="${materialIndex}" p2="${materialIndex}" p3="${materialIndex}" />`,
  )
  .join("\n")}
        </triangles>
      </mesh>`;

export const createModelXml = (
  parts: ModelPart[],
  parentName: string = PARENT_OBJECT_NAME,
  parentId: number = PARENT_OBJECT_ID,
): string => {
  const baseMaterialsXml = parts
    .map(
      (part) =>
        `      <base name="${escapeXml(part.name)}" displaycolor="${escapeXml(hexToDisplayColor(part.color))}" />`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Application">Poker Chip Generator</metadata>
  <resources>
    <basematerials id="1">
${baseMaterialsXml}
    </basematerials>
${parts
  .map(
    (part, materialIndex) => `    <object id="${part.id}" type="model" name="${escapeXml(part.name)}" partnumber="${escapeXml(part.name)}" pid="1" pindex="${materialIndex}">
      <metadata name="name">${escapeXml(part.name)}</metadata>
      <metadata name="color">${escapeXml(part.color)}</metadata>${meshXml(part.mesh, materialIndex)}
    </object>`,
  )
  .join("\n")}
    <object id="${parentId}" type="model" name="${escapeXml(parentName)}">
      <components>
${parts.map((part) => `        <component objectid="${part.id}" />`).join("\n")}
      </components>
    </object>
  </resources>
  <build>
    <item objectid="${parentId}" />
  </build>
</model>
`;
};
