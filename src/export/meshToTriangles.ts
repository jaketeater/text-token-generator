import { geometries } from '@jscad/modeling'

export type Vertex = readonly [number, number, number]
export type Triangle = readonly [number, number, number]

export interface TriangleMesh {
  vertices: Vertex[]
  triangles: Triangle[]
}

const vertexKey = (point: Vertex): string => point.map((value) => value.toFixed(6)).join(',')

const toVertex = (point: readonly number[]): Vertex => [point[0] ?? 0, point[1] ?? 0, point[2] ?? 0]

/**
 * Converts a JSCAD geom3 into an indexed triangle mesh.
 *
 * JSCAD polygons may have more than three vertices, so each polygon is triangulated
 * with a fan from its first vertex. Vertices are de-duplicated by rounded position to
 * keep the 3MF XML compact while preserving millimeter-scale geometry.
 */
export const meshToTriangles = (geometry: geometries.geom3.Geom3): TriangleMesh => {
  const vertices: Vertex[] = []
  const triangles: Triangle[] = []
  const vertexIndexes = new Map<string, number>()

  const getVertexIndex = (point: readonly number[]): number => {
    const vertex = toVertex(point)
    const key = vertexKey(vertex)
    const existingIndex = vertexIndexes.get(key)

    if (existingIndex !== undefined) {
      return existingIndex
    }

    const index = vertices.length
    vertices.push(vertex)
    vertexIndexes.set(key, index)

    return index
  }

  for (const polygon of geometries.geom3.toPolygons(geometry)) {
    const points = polygon.vertices

    if (points.length < 3) {
      continue
    }

    const firstIndex = getVertexIndex(points[0])

    for (let index = 1; index < points.length - 1; index += 1) {
      triangles.push([firstIndex, getVertexIndex(points[index]), getVertexIndex(points[index + 1])])
    }
  }

  return { vertices, triangles }
}
