import { geometries, modifiers } from '@jscad/modeling'

export type Vertex = readonly [number, number, number]
export type Triangle = readonly [number, number, number]

export interface TriangleMesh {
  vertices: Vertex[]
  triangles: Triangle[]
}

const vertexKey = (point: Vertex): string => point.map((value) => value.toFixed(9)).join(',')

/**
 * Converts a simple JSCAD geom3 into an indexed triangle mesh.
 *
 * JSCAD polygons may be concave or include hole bridges after boolean operations,
 * so the geometry is triangulated with JSCAD's T-junction-aware modifier before
 * creating 3MF triangles. Vertices are de-duplicated by rounded position to
 * keep the 3MF XML compact while preserving millimeter-scale geometry.
 */
export const meshToTriangles = (geometry: geometries.geom3.Geom3): TriangleMesh => {
  const vertices: Vertex[] = []
  const triangles: Triangle[] = []
  const vertexIndexes = new Map<string, number>()

  const getVertexIndex = (point: Vertex): number => {
    const key = vertexKey(point)
    const existingIndex = vertexIndexes.get(key)

    if (existingIndex !== undefined) {
      return existingIndex
    }

    const index = vertices.length
    vertices.push(point)
    vertexIndexes.set(key, index)

    return index
  }

  const triangulatedGeometry = modifiers.generalize({ snap: true, triangulate: true }, geometry)

  for (const polygon of geometries.geom3.toPolygons(triangulatedGeometry)) {
    const points = polygon.vertices as Vertex[]

    if (points.length < 3) {
      continue
    }

    const firstIndex = getVertexIndex(points[0])

    for (let index = 1; index < points.length - 1; index += 1) {
      const secondIndex = getVertexIndex(points[index])
      const thirdIndex = getVertexIndex(points[index + 1])

      if (firstIndex !== secondIndex && secondIndex !== thirdIndex && thirdIndex !== firstIndex) {
        triangles.push([firstIndex, secondIndex, thirdIndex])
      }
    }
  }

  return { vertices, triangles }
}
