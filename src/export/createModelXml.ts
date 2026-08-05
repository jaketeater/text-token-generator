import type { TriangleMesh } from './meshToTriangles'

export interface ModelPart {
  id: number
  name: string
  color: string
  mesh: TriangleMesh
}

const MODEL_NAMESPACE = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02'
const MATERIAL_RESOURCE_ID = 1

const escapeXml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

const formatNumber = (value: number): string => Number(value.toFixed(6)).toString()

const meshXml = (mesh: TriangleMesh, materialIndex: number): string => `
      <mesh>
        <vertices>
${mesh.vertices
  .map(
    ([x, y, z]) =>
      `          <vertex x="${formatNumber(x)}" y="${formatNumber(y)}" z="${formatNumber(z)}" />`,
  )
  .join('\n')}
        </vertices>
        <triangles>
${mesh.triangles
  .map(
    ([v1, v2, v3]) =>
      `          <triangle v1="${v1}" v2="${v2}" v3="${v3}" pid="${MATERIAL_RESOURCE_ID}" p1="${materialIndex}" />`,
  )
  .join('\n')}
        </triangles>
      </mesh>`

export const createModelXml = (parts: ModelPart[], parentName = 'Text Token'): string => {
  const componentObjectId = Math.max(...parts.map((part) => part.id)) + 1

  return `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="${MODEL_NAMESPACE}">
  <metadata name="Application">Text Token Generator</metadata>
  <resources>
    <basematerials id="${MATERIAL_RESOURCE_ID}">
${parts
  .map(
    (part) =>
      `      <base name="${escapeXml(part.name)}" displaycolor="${escapeXml(part.color)}" />`,
  )
  .join('\n')}
    </basematerials>
${parts
  .map(
    (part, index) => `    <object id="${part.id}" type="model" name="${escapeXml(part.name)}" partnumber="${escapeXml(part.name)}" pid="${MATERIAL_RESOURCE_ID}" pindex="${index}">
      <metadata name="name">${escapeXml(part.name)}</metadata>
      <metadata name="color">${escapeXml(part.color)}</metadata>${meshXml(part.mesh, index)}
    </object>`,
  )
  .join('\n')}
    <object id="${componentObjectId}" type="model" name="${escapeXml(parentName)}">
      <components>
${parts.map((part) => `        <component objectid="${part.id}" />`).join('\n')}
      </components>
    </object>
  </resources>
  <build>
    <item objectid="${componentObjectId}" />
  </build>
</model>
`
}
