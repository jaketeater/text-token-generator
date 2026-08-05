import type { FlatContour, FontPoint } from "./flattenBezier";

export interface ClassifiedContour {
  outer: FlatContour;
  holes: FlatContour[];
}

const pointOnSegment = (point: FontPoint, a: FontPoint, b: FontPoint): boolean => {
  const cross = (point.y - a.y) * (b.x - a.x) - (point.x - a.x) * (b.y - a.y);
  if (Math.abs(cross) > 1e-9) {
    return false;
  }

  return point.x >= Math.min(a.x, b.x) - 1e-9
    && point.x <= Math.max(a.x, b.x) + 1e-9
    && point.y >= Math.min(a.y, b.y) - 1e-9
    && point.y <= Math.max(a.y, b.y) + 1e-9;
};

export const containsPointEvenOdd = (contour: FlatContour, point: FontPoint): boolean => {
  let inside = false;

  for (let index = 0, previousIndex = contour.length - 1; index < contour.length; previousIndex = index, index += 1) {
    const current = contour[index];
    const previous = contour[previousIndex];

    if (pointOnSegment(point, previous, current)) {
      return true;
    }

    const intersects = current.y > point.y !== previous.y > point.y
      && point.x < ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) + current.x;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
};

const representativePoint = (contour: FlatContour): FontPoint => contour[0];

export const classifyContours = (contours: FlatContour[]): ClassifiedContour[] => {
  const containersByIndex = contours.map((contour, contourIndex) =>
    contours
      .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
      .filter(({ candidateIndex }) => candidateIndex !== contourIndex)
      .filter(({ candidate }) => containsPointEvenOdd(candidate, representativePoint(contour)))
      .map(({ candidateIndex }) => candidateIndex),
  );

  const classified = contours
    .map((contour, index) => ({ contour, index, depth: containersByIndex[index].length }))
    .filter(({ depth }) => depth % 2 === 0)
    .map(({ contour, index, depth }) => ({
      outer: contour,
      holes: contours.filter((_, holeIndex) =>
        containersByIndex[holeIndex].includes(index) && containersByIndex[holeIndex].length === depth + 1,
      ),
    }));

  return classified;
};
