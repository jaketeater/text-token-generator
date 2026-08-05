import type { FontPoint } from "../font/flattenBezier";

export interface CircularFitResult {
  fits: boolean;
  offendingPoints: FontPoint[];
  maxRadius: number;
}

export const verifyCircularFit = (
  points: readonly FontPoint[],
  layoutRadius: number,
): CircularFitResult => {
  const offendingPoints: FontPoint[] = [];
  let maxRadius = 0;

  for (const point of points) {
    const distance = Math.hypot(point.x, point.y);
    maxRadius = Math.max(maxRadius, distance);
    if (distance > layoutRadius + 1e-6) {
      offendingPoints.push(point);
    }
  }

  return {
    fits: offendingPoints.length === 0,
    offendingPoints,
    maxRadius,
  };
};

export const collectContourPoints = (contours: readonly FontPoint[][]): FontPoint[] =>
  contours.flatMap((contour) => contour);
