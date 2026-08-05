import { booleans, geometries } from "@jscad/modeling";

import { classifyContours } from "./classifyContours";
import type { FlatContour, FontPoint } from "./flattenBezier";

export type Geom2 = geometries.geom2.Geom2;

const pointToTuple = (point: FontPoint): [number, number] => [point.x, point.y];

const signedArea = (contour: FlatContour): number => {
  let areaTwice = 0;
  for (let index = 0, previousIndex = contour.length - 1; index < contour.length; previousIndex = index, index += 1) {
    const current = contour[index];
    const previous = contour[previousIndex];
    areaTwice += previous.x * current.y - current.x * previous.y;
  }
  return areaTwice / 2;
};

const openContour = (contour: FlatContour): FlatContour => {
  if (contour.length > 1 && contour[0].x === contour.at(-1)?.x && contour[0].y === contour.at(-1)?.y) {
    return contour.slice(0, -1);
  }

  return contour;
};

const normalizeContourWinding = (contour: FlatContour): FlatContour => {
  const open = openContour(contour);
  return signedArea(open) < 0 ? [...open].reverse() : open;
};

const contourToGeom2 = (contour: FlatContour): Geom2 => geometries.geom2.fromPoints(normalizeContourWinding(contour).map(pointToTuple));

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
