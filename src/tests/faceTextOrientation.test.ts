import { beforeAll, describe, expect, it } from "vitest";
import { geometries } from "@jscad/modeling";

import { contoursToTextGeometry } from "../font/textGeometry";
import { createFaceTextSolid } from "../geometry/createFaceText";
import { fitTextToCircle } from "../layout/fitTextToCircle";
import { DEFAULT_BOTTOM_FACE, DEFAULT_TOP_FACE } from "../model/defaults";
import { ensureTestFont } from "./ensureTestFont";

beforeAll(() => {
  ensureTestFont();
});

describe("face text orientation and counters", () => {
  it("keeps letter L stem on the left (not mirrored)", () => {
    const layout = fitTextToCircle(
      { ...DEFAULT_TOP_FACE, text: "L", requestedTextSize: 8, minimumTextSize: 2 },
      { layoutRadius: 17.4 },
    );
    expect(layout.fits).toBe(true);
    const points = layout.points;
    const minX = Math.min(...points.map((p) => p.x));
    const maxX = Math.max(...points.map((p) => p.x));
    const midX = (minX + maxX) / 2;
    const leftHeights = points.filter((p) => p.x < midX).map((p) => p.y);
    const rightHeights = points.filter((p) => p.x >= midX).map((p) => p.y);
    const leftSpan = Math.max(...leftHeights) - Math.min(...leftHeights);
    const rightSpan = Math.max(...rightHeights) - Math.min(...rightHeights);
    // Stem is taller on the left for an upright L.
    expect(leftSpan).toBeGreaterThan(rightSpan);
  });

  it("preserves O counter through top-face solid conversion", () => {
    const layout = fitTextToCircle(
      { ...DEFAULT_TOP_FACE, text: "O", requestedTextSize: 8, minimumTextSize: 2 },
      { layoutRadius: 17.4 },
    );
    expect(layout.fits).toBe(true);
    const geom2 = contoursToTextGeometry(layout.contours);
    expect(geometries.geom2.toOutlines(geom2).length).toBeGreaterThanOrEqual(2);

    const solid = createFaceTextSolid("top", DEFAULT_TOP_FACE, layout.contours, 3.5);
    const polygons = geometries.geom3.toPolygons(solid);
    expect(polygons.length).toBeGreaterThan(4);
  });

  it("preserves a counter through bottom-face solid conversion", () => {
    const layout = fitTextToCircle(
      { ...DEFAULT_BOTTOM_FACE, text: "a", requestedTextSize: 6, minimumTextSize: 2 },
      { layoutRadius: 17.4 },
    );
    expect(layout.fits).toBe(true);
    const geom2 = contoursToTextGeometry(layout.contours);
    expect(geometries.geom2.toOutlines(geom2).length).toBeGreaterThanOrEqual(2);

    const solid = createFaceTextSolid("bottom", DEFAULT_BOTTOM_FACE, layout.contours, 3.5);
    expect(geometries.geom3.toPolygons(solid).length).toBeGreaterThan(4);
  });

  it("TOKEN top solid keeps multiple outlines including O hole", () => {
    const layout = fitTextToCircle({ ...DEFAULT_TOP_FACE, text: "TOKEN" }, { layoutRadius: 17.4 });
    expect(layout.fits).toBe(true);
    const outlines = geometries.geom2.toOutlines(contoursToTextGeometry(layout.contours));
    expect(outlines.length).toBeGreaterThanOrEqual(6);
  });
});
