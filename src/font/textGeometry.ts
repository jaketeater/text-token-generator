import { booleans, geometries } from "@jscad/modeling";

import { classifyContours } from "./classifyContours";
import type { FlatContour, FontPoint } from "./flattenBezier";

export type Geom2 = geometries.geom2.Geom2;

const pointToTuple = (point: FontPoint): [number, number] => [point.x, point.y];

const contourToGeom2 = (contour: FlatContour): Geom2 => geometries.geom2.fromPoints(contour.map(pointToTuple));

export const contoursToTextGeometry = (contours: FlatContour[]): Geom2 => {
  const glyphGeometries = classifyContours(contours).map(({ outer, holes }) => {
    const outerGeometry = contourToGeom2(outer);
    if (holes.length === 0) {
      return outerGeometry;
    }

    return booleans.subtract(outerGeometry, ...holes.map(contourToGeom2)) as Geom2;
  });

  if (glyphGeometries.length === 0) {
    return geometries.geom2.create();
  }

  return glyphGeometries.length === 1 ? glyphGeometries[0] : booleans.union(...glyphGeometries) as Geom2;
};
