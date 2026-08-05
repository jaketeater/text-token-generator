import { describe, expect, it } from "vitest";

import { hexToRgba } from "../preview/previewColors";

describe("preview colors", () => {
  it("parses hex colors into rgba floats", () => {
    expect(hexToRgba("#d1d5db")).toEqual([
      Number.parseInt("d1", 16) / 255,
      Number.parseInt("d5", 16) / 255,
      Number.parseInt("db", 16) / 255,
      1,
    ]);
    expect(hexToRgba("#111827")[0]).toBeCloseTo(0.0667, 2);
  });

  it("does not produce the default cyan mesh color for gray body", () => {
    const [r, g, b] = hexToRgba("#d1d5db");
    // Default regl meshColor is [0, 0.6, 1, 1]
    expect(b).toBeLessThan(0.9);
    expect(r).toBeGreaterThan(0.5);
    expect(g).toBeGreaterThan(0.5);
  });
});
