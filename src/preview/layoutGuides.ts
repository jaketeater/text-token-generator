import type { FontPoint } from "../font/flattenBezier";
import type { GeneratedTextLayout } from "../model/layoutTypes";

export interface LayoutGuideGeometry {
  usableCircleRadius: number;
  lineChords: Array<{ y: number; halfWidth: number }>;
  boundingBox: { minX: number; maxX: number; minY: number; maxY: number } | null;
  offendingPoints: FontPoint[];
}

export const buildLayoutGuides = (
  layout: GeneratedTextLayout,
  layoutRadius: number,
  points: FontPoint[] = [],
  offendingPoints: FontPoint[] = [],
): LayoutGuideGeometry => {
  let boundingBox: LayoutGuideGeometry["boundingBox"] = null;
  if (points.length > 0) {
    boundingBox = {
      minX: Math.min(...points.map((p) => p.x)),
      maxX: Math.max(...points.map((p) => p.x)),
      minY: Math.min(...points.map((p) => p.y)),
      maxY: Math.max(...points.map((p) => p.y)),
    };
  }

  return {
    usableCircleRadius: layoutRadius,
    lineChords: layout.lines.map((line) => ({
      y: line.y,
      halfWidth: line.availableWidth / 2,
    })),
    boundingBox,
    offendingPoints,
  };
};
