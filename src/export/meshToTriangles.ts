import { geometries, modifiers } from "@jscad/modeling";

export type Vertex = readonly [number, number, number];
export type Triangle = readonly [number, number, number];

export interface TriangleMesh {
  vertices: Vertex[];
  triangles: Triangle[];
}

const vertexKey = (point: Vertex, decimals = 9): string =>
  point.map((value) => value.toFixed(decimals)).join(",");

export const deduplicateVertices = (
  vertices: Vertex[],
  triangles: Triangle[],
  toleranceDecimals = 9,
): TriangleMesh => {
  const nextVertices: Vertex[] = [];
  const indexMap = new Map<string, number>();

  const mapIndex = (index: number): number => {
    const key = vertexKey(vertices[index], toleranceDecimals);
    const existing = indexMap.get(key);
    if (existing !== undefined) {
      return existing;
    }
    const next = nextVertices.length;
    nextVertices.push(vertices[index]);
    indexMap.set(key, next);
    return next;
  };

  const nextTriangles: Triangle[] = triangles.map(([a, b, c]) => [mapIndex(a), mapIndex(b), mapIndex(c)]);
  return { vertices: nextVertices, triangles: nextTriangles };
};

export const meshToTriangles = (geometry: geometries.geom3.Geom3): TriangleMesh => {
  const vertices: Vertex[] = [];
  const triangles: Triangle[] = [];
  const vertexIndexes = new Map<string, number>();

  const getVertexIndex = (point: Vertex): number => {
    const key = vertexKey(point);
    const existingIndex = vertexIndexes.get(key);

    if (existingIndex !== undefined) {
      return existingIndex;
    }

    const index = vertices.length;
    vertices.push(point);
    vertexIndexes.set(key, index);
    return index;
  };

  const triangulatedGeometry = modifiers.generalize({ snap: true, triangulate: true }, geometry);

  for (const polygon of geometries.geom3.toPolygons(triangulatedGeometry)) {
    const points = polygon.vertices as Vertex[];

    if (points.length < 3) {
      continue;
    }

    const firstIndex = getVertexIndex(points[0]);

    for (let index = 1; index < points.length - 1; index += 1) {
      const secondIndex = getVertexIndex(points[index]);
      const thirdIndex = getVertexIndex(points[index + 1]);

      if (firstIndex !== secondIndex && secondIndex !== thirdIndex && thirdIndex !== firstIndex) {
        triangles.push([firstIndex, secondIndex, thirdIndex]);
      }
    }
  }

  return { vertices, triangles };
};

/** Triangulate each closed shell on its own, then concatenate (preserves manifold edges). */
export const meshShellsToTriangles = (shells: geometries.geom3.Geom3[]): TriangleMesh => {
  const vertices: Vertex[] = [];
  const triangles: Triangle[] = [];

  for (const shell of shells) {
    const mesh = meshToTriangles(shell);
    const base = vertices.length;
    vertices.push(...mesh.vertices);
    for (const [a, b, c] of mesh.triangles) {
      triangles.push([a + base, b + base, c + base]);
    }
  }

  return { vertices, triangles };
};
