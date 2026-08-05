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

const ensureOrientation = (contour: FlatContour, wantCcw: boolean): FlatContour => {
  const open = openContour(contour);
  if (open.length < 3) {
    return open;
  }
  const isCcw = signedArea(open) > 0;
  return isCcw === wantCcw ? open : [...open].reverse();
};

const contourToGeom2 = (contour: FlatContour, wantCcw = true): Geom2 => {
  const points = ensureOrientation(contour, wantCcw).map(pointToTuple);
  if (points.length < 3) {
    return geometries.geom2.create();
  }
  return geometries.geom2.fromPoints(points);
};

/**
 * Curve flattening must get finer as text gets smaller; a fixed 0.04 mm tolerance
 * fills counters for glyphs like a/8 at ~4 mm text height.
 */
export const effectiveCurveTolerance = (textSizeMm: number, requested = 0.04): number =>
  Math.min(requested, Math.max(0.004, textSizeMm * 0.0025));

const outlineCount = (geometry: Geom2): number => {
  try {
    return geometries.geom2.toOutlines(geometry).length;
  } catch {
    return 0;
  }
};

const singleGlyphToGeometry = (contours: FlatContour[]): Geom2 => {
  if (contours.length === 0) {
    return geometries.geom2.create();
  }

  const classified = classifyContours(contours);
  const glyphGeometries = classified.map(({ outer, holes }) => {
    const outerGeometry = contourToGeom2(outer, true);
    if (holes.length === 0) {
      return outerGeometry;
    }

    // Both-CCW subtract works for many glyphs; after Y-flip it can fill counters (e.g. g).
    const subtracted = booleans.subtract(
      outerGeometry,
      ...holes.map((hole) => contourToGeom2(hole, true)),
    ) as Geom2;

    if (outlineCount(subtracted) >= 1 + holes.length) {
      return subtracted;
    }

    // Fallback: nest CW hole sides into the CCW outer (preserves counters after Y-flip).
    const sides = [...geometries.geom2.toSides(outerGeometry)];
    for (const hole of holes) {
      sides.push(...geometries.geom2.toSides(contourToGeom2(hole, false)));
    }
    return geometries.geom2.create(sides);
  });

  if (glyphGeometries.length === 0) {
    return geometries.geom2.create();
  }

  return glyphGeometries.length === 1
    ? glyphGeometries[0]
    : (booleans.union(...glyphGeometries) as Geom2);
};

/**
 * Convert one or more per-glyph contour groups into a JSCAD geom2.
 * Each group is classified and hole-subtracted in isolation, then unioned.
 */
export const contourGroupsToTextGeometry = (glyphGroups: FlatContour[][]): Geom2 => {
  const geometriesForGlyphs = glyphGroups
    .map((group) => singleGlyphToGeometry(group))
    .filter((geometry) => geometries.geom2.toSides(geometry).length > 0);

  if (geometriesForGlyphs.length === 0) {
    return geometries.geom2.create();
  }

  if (geometriesForGlyphs.length === 1) {
    return geometriesForGlyphs[0];
  }

  return booleans.union(...geometriesForGlyphs) as Geom2;
};

/** Treat a flat contour list as a single glyph's contours. */
export const contoursToTextGeometry = (contours: FlatContour[]): Geom2 =>
  singleGlyphToGeometry(contours);
