import { beforeAll, describe, expect, it } from "vitest";
import { extrusions, geometries } from "@jscad/modeling";

import { classifyContours } from "../font/classifyContours";
import { loadFontSync } from "../font/loadFont";
import { opentypeToContours } from "../font/opentypeToContours";
import { contoursToTextGeometry } from "../font/textGeometry";
import { ensureTestFont } from "./ensureTestFont";

beforeAll(() => {
  ensureTestFont();
});

describe("glyph counters after geometry conversion", () => {
  it.each([
    ["a", 1],
    ["d", 1],
    ["O", 1],
    ["B", 2],
    ["8", 2],
  ])("%s classifyContours finds %i hole(s)", (glyph, holeCount) => {
    const font = loadFontSync();
    const contours = opentypeToContours(font, glyph, { textSizeMm: 10 });
    const classified = classifyContours(contours);
    expect(classified.some((entry) => entry.holes.length === holeCount)).toBe(true);
  });

  it.each(["a", "d", "O"])("%s geom2 keeps outer+hole outlines", (glyph) => {
    const font = loadFontSync();
    const contours = opentypeToContours(font, glyph, { textSizeMm: 10 });
    const geom = contoursToTextGeometry(contours);
    expect(geometries.geom2.toOutlines(geom).length).toBeGreaterThanOrEqual(2);
  });

  it.each(["a", "d", "O", "B", "8"])("%s extrudes to a non-trivial solid with counters", (glyph) => {
    const font = loadFontSync();
    const contours = opentypeToContours(font, glyph, { textSizeMm: 10 });
    const geom = contoursToTextGeometry(contours);
    const solid = extrusions.extrudeLinear({ height: 0.2 }, geom);
    // Filled discs for these glyphs are far fewer polygons than counter-preserving meshes.
    expect(geometries.geom3.toPolygons(solid).length).toBeGreaterThan(20);
  });
});
