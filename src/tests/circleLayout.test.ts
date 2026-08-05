import { beforeAll, describe, expect, it } from "vitest";

import { calculateChordWidths } from "../layout/calculateChordWidths";
import { calculateLinePositions } from "../layout/calculateLinePositions";
import { verifyCircularFit } from "../layout/verifyCircularFit";
import { fitTextToCircle } from "../layout/fitTextToCircle";
import { DEFAULT_TOP_FACE } from "../model/defaults";
import { ensureTestFont } from "./ensureTestFont";

beforeAll(() => {
  ensureTestFont();
});

describe("circle layout", () => {
  it("makes outer lines narrower than center lines", () => {
    const { positions } = calculateLinePositions(5, 4, 1.15);
    const chords = calculateChordWidths(positions, 17.4);
    expect(chords[0].availableWidth).toBeLessThan(chords[2].availableWidth);
    expect(chords[4].availableWidth).toBeLessThan(chords[2].availableWidth);
  });

  it("keeps every outline point inside the layout radius", () => {
    const layout = fitTextToCircle(
      { ...DEFAULT_TOP_FACE, text: "ONE TWO THREE FOUR", requestedTextSize: 5, minimumTextSize: 2 },
      { layoutRadius: 17.4 },
    );
    expect(layout.fits).toBe(true);
    const verification = verifyCircularFit(layout.points, 17.4);
    expect(verification.fits).toBe(true);
  });

  it("vertically centers the text block near y=0", () => {
    const layout = fitTextToCircle(
      { ...DEFAULT_TOP_FACE, text: "A BB CCC", requestedTextSize: 5, minimumTextSize: 2 },
      { layoutRadius: 17.4 },
    );
    expect(layout.fits).toBe(true);
    const ys = layout.points.map((point) => point.y);
    const mid = (Math.min(...ys) + Math.max(...ys)) / 2;
    expect(Math.abs(mid)).toBeLessThan(0.2);
  });
});
