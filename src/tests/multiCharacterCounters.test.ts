import { beforeAll, describe, expect, it } from "vitest";
import { geometries } from "@jscad/modeling";

import { contourGroupsToTextGeometry } from "../font/textGeometry";
import { createFaceTextSolid } from "../geometry/createFaceText";
import { fitTextToCircle } from "../layout/fitTextToCircle";
import { DEFAULT_BOTTOM_FACE, DEFAULT_TOP_FACE } from "../model/defaults";
import { ensureTestFont } from "./ensureTestFont";

beforeAll(() => {
  ensureTestFont();
});

const SCREENSHOT_ASDF = "asdfasdfasdfasdfasdfasdfasdf";
const SCREENSHOT_ALPHABET = "qw ertyui opas dfghjkl zxcvb nm 123 456 7890";

const COUNTER_CHARS_IN_ALPHABET = ["a", "g", "o", "0", "6", "8", "9", "d", "p", "q", "b", "e"] as const;

describe("multi-character glyph counters", () => {
  it("keeps a and d counters in the asdf screenshot string", () => {
    const layout = fitTextToCircle(
      { ...DEFAULT_BOTTOM_FACE, text: SCREENSHOT_ASDF, requestedTextSize: 3.25, minimumTextSize: 1.5 },
      { layoutRadius: 17.4 },
    );
    expect(layout.fits).toBe(true);
    expect(layout.contourGroups?.length).toBeGreaterThan(0);

    // Every 'a' and 'd' glyph group must retain a hole after per-glyph conversion.
    for (const group of layout.contourGroups ?? []) {
      const geom = contourGroupsToTextGeometry([group]);
      const outlines = geometries.geom2.toOutlines(geom).length;
      // Single glyphs without counters have 1 outline; a/d have 2.
      // Skip ambiguous by checking groups that classify with holes via outline count >= 2
      // when the group has 2+ raw contours.
      if (group.length >= 2) {
        expect(outlines).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("keeps counters for g/6/8/9/0 in the alphabet screenshot string", () => {
    const layout = fitTextToCircle(
      { ...DEFAULT_BOTTOM_FACE, text: SCREENSHOT_ALPHABET, requestedTextSize: 4, minimumTextSize: 1.5 },
      { layoutRadius: 17.4 },
    );
    expect(layout.fits).toBe(true);

    const geom = contourGroupsToTextGeometry(layout.contourGroups ?? []);
    const outlines = geometries.geom2.toOutlines(geom);
    const letterCount = SCREENSHOT_ALPHABET.replace(/\s/g, "").length;
    // Counter glyphs add extra outlines beyond one-per-letter.
    expect(outlines.length).toBeGreaterThan(letterCount);
  });

  it.each(["top", "bottom"] as const)(
    "preserves counters through %s face solid for alphabet string",
    (face) => {
      const faceParams = face === "top" ? DEFAULT_TOP_FACE : DEFAULT_BOTTOM_FACE;
      const layout = fitTextToCircle(
        { ...faceParams, text: SCREENSHOT_ALPHABET, requestedTextSize: 4, minimumTextSize: 1.5 },
        { layoutRadius: 17.4 },
      );
      expect(layout.fits).toBe(true);

      const solid = createFaceTextSolid(
        face,
        { ...faceParams, text: SCREENSHOT_ALPHABET, depth: 0.2 },
        layout.contours,
        3.5,
        layout.contourGroups,
      );
      expect(geometries.geom3.toPolygons(solid).length).toBeGreaterThan(100);
    },
  );

  it.each(COUNTER_CHARS_IN_ALPHABET)("single glyph %s keeps a counter at 4 mm", (glyph) => {
    const layout = fitTextToCircle(
      { ...DEFAULT_TOP_FACE, text: glyph, requestedTextSize: 4, minimumTextSize: 1.5 },
      { layoutRadius: 17.4 },
    );
    expect(layout.fits).toBe(true);
    const geom = contourGroupsToTextGeometry(layout.contourGroups ?? [layout.contours]);
    expect(geometries.geom2.toOutlines(geom).length).toBeGreaterThanOrEqual(2);
  });
});
