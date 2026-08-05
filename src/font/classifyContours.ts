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

const openContour = (contour: FlatContour): FlatContour => {
  if (contour.length > 1 && contour[0].x === contour.at(-1)?.x && contour[0].y === contour.at(-1)?.y) {
    return contour.slice(0, -1);
  }

  return contour;
};

const isBoundaryPoint = (contour: FlatContour, point: FontPoint): boolean => {
  for (let index = 0, previousIndex = contour.length - 1; index < contour.length; previousIndex = index, index += 1) {
    if (pointOnSegment(point, contour[previousIndex], contour[index])) {
      return true;
    }
  }

  return false;
};

const averagePoint = (contour: FlatContour): FontPoint => {
  const open = openContour(contour);
  const total = open.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
  return { x: total.x / open.length, y: total.y / open.length };
};

const centroidPoint = (contour: FlatContour): FontPoint => {
  const open = openContour(contour);
  let areaTwice = 0;
  let x = 0;
  let y = 0;

  for (let index = 0, previousIndex = open.length - 1; index < open.length; previousIndex = index, index += 1) {
    const current = open[index];
    const previous = open[previousIndex];
    const cross = previous.x * current.y - current.x * previous.y;
    areaTwice += cross;
    x += (previous.x + current.x) * cross;
    y += (previous.y + current.y) * cross;
  }

  if (Math.abs(areaTwice) < 1e-9) {
    return averagePoint(contour);
  }

  return { x: x / (3 * areaTwice), y: y / (3 * areaTwice) };
};

const representativePoint = (contour: FlatContour): FontPoint => {
  const centroid = centroidPoint(contour);
  if (containsPointEvenOdd(contour, centroid) && !isBoundaryPoint(contour, centroid)) {
    return centroid;
  }

  const xs = contour.map((point) => point.x);
  const ys = contour.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  for (const columns of [4, 8, 16, 32]) {
    for (let yIndex = 1; yIndex < columns; yIndex += 1) {
      for (let xIndex = 1; xIndex < columns; xIndex += 1) {
        const point = {
          x: minX + ((maxX - minX) * xIndex) / columns,
          y: minY + ((maxY - minY) * yIndex) / columns,
        };

        if (containsPointEvenOdd(contour, point) && !isBoundaryPoint(contour, point)) {
          return point;
        }
      }
    }
  }

  return centroid;
};

const signedArea = (contour: FlatContour): number => {
  const open = openContour(contour);
  let areaTwice = 0;

  for (let index = 0, previousIndex = open.length - 1; index < open.length; previousIndex = index, index += 1) {
    const current = open[index];
    const previous = open[previousIndex];
    areaTwice += previous.x * current.y - current.x * previous.y;
  }

  return areaTwice / 2;
};

export const classifyContours = (contours: FlatContour[]): ClassifiedContour[] => {
  const containersByIndex = contours.map((contour, contourIndex) =>
    contours
      .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
      .filter(({ candidateIndex }) => candidateIndex !== contourIndex)
      .filter(({ candidate }) => Math.abs(signedArea(candidate)) > Math.abs(signedArea(contour)))
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
