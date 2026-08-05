import type { TriangleMesh } from './meshToTriangles'

export interface ModelPart {
  id: number
  name: string
  color: string
  mesh: TriangleMesh
}

const escapeXml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

const formatNumber = (value: number): string => Number(value.toFixed(6)).toString()

const meshXml = (mesh: TriangleMesh): string => `
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
  .map(([v1, v2, v3]) => `          <triangle v1="${v1}" v2="${v2}" v3="${v3}" />`)
  .join('\n')}
        </triangles>
      </mesh>`

export const createModelXml = (parts: ModelPart[]): string => {
  const componentObjectId = Math.max(...parts.map((part) => part.id)) + 1

  return `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Application">Text Token Generator</metadata>
  <resources>
${parts
  .map(
    (part) => `    <object id="${part.id}" type="model" name="${escapeXml(part.name)}" partnumber="${escapeXml(part.name)}">
      <metadata name="name">${escapeXml(part.name)}</metadata>
      <metadata name="color">${escapeXml(part.color)}</metadata>${meshXml(part.mesh)}
    </object>`,
  )
  .join('\n')}
    <object id="${componentObjectId}" type="model" name="Coin Compatibility Test">
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
