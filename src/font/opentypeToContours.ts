import type opentype from "opentype.js";

import { flattenPathCommand, type FlatContour, type FontPoint, type PathCommand } from "./flattenBezier";

export interface OpenTypeToContoursOptions {
  textSizeMm: number;
  curveTolerance?: number;
}

const DEFAULT_CURVE_TOLERANCE_MM = 0.04;

const samePoint = (a: FontPoint, b: FontPoint): boolean => Math.hypot(a.x - b.x, a.y - b.y) < 1e-7;

const closeContour = (contour: FlatContour): FlatContour => {
  if (contour.length === 0) {
    return contour;
  }

  const first = contour[0];
  const last = contour.at(-1);
  return last && samePoint(first, last) ? contour : [...contour, { ...first }];
};

export const opentypeToContours = (
  font: opentype.Font,
  text: string,
  { textSizeMm, curveTolerance = DEFAULT_CURVE_TOLERANCE_MM }: OpenTypeToContoursOptions,
): FlatContour[] => {
  const path = font.getPath(text, 0, 0, textSizeMm);
  const contours: FlatContour[] = [];
  let current: FlatContour = [];
  let cursor: FontPoint | undefined;

  for (const command of path.commands as PathCommand[]) {
    if (command.type === "M") {
      if (current.length >= 3) {
        contours.push(closeContour(current));
      }
      cursor = { x: command.x, y: command.y };
      current = [cursor];
      continue;
    }

    if (command.type === "Z") {
      if (current.length >= 3) {
        contours.push(closeContour(current));
      }
      current = [];
      cursor = undefined;
      continue;
    }

    if (!cursor) {
      continue;
    }

    const points = flattenPathCommand(cursor, command, curveTolerance);
    current.push(...points);
    cursor = points.at(-1) ?? cursor;
  }

  if (current.length >= 3) {
    contours.push(closeContour(current));
  }

  return contours;
};
