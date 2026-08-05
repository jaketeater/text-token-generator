import { describe, expect, it } from "vitest";

import { createCoin3mf } from "../export/export3mf";
import { validateCoinParameters } from "../geometry/validateGeometry";
import { DEFAULT_COIN_PARAMETERS } from "../model/defaults";
import type { CoinParameters } from "../model/coinParameters";

const params = (overrides: Partial<CoinParameters> = {}): CoinParameters => ({
  ...DEFAULT_COIN_PARAMETERS,
  ...overrides,
  topFace: { ...DEFAULT_COIN_PARAMETERS.topFace, ...overrides.topFace },
  bottomFace: { ...DEFAULT_COIN_PARAMETERS.bottomFace, ...overrides.bottomFace },
  validation: { ...DEFAULT_COIN_PARAMETERS.validation, ...overrides.validation },
});

const codes = (parameters: CoinParameters): string[] =>
  validateCoinParameters(parameters).errors.map((message) => message.code);

describe("coin parameter validation", () => {
  it("treats zero border width as an error because the first version requires a separate colored margin", () => {
    expect(codes(params({ borderWidth: 0 }))).toContain("borderWidth.invalid");
  });

  it("uses actual fixed-size circular fit diagnostics instead of estimated text width checks", () => {
    expect(codes(params({
      topFace: {
        text: "I",
        textSize: 300,
        autoFit: false,
      },
    }))).toContain("topFace.text.fixedSizeOverflow");
  });

  it("reports empty text contours for each face as export-blocking errors", () => {
    expect(codes(params({
      topFace: { text: "" },
      bottomFace: { text: "" },
    }))).toEqual(expect.arrayContaining([
      "topFace.text.empty",
      "topFace.textContours.invalid",
      "bottomFace.text.empty",
      "bottomFace.textContours.invalid",
    ]));
  });

  it("reports invalid generated contours for each face as export-blocking errors", () => {
    const result = validateCoinParameters(params({
      validation: {
        topTextContours: [[[0, 0], [1, 1]]],
        bottomTextContours: [[[0, 0], [Number.NaN, 1], [1, 0]]],
      },
    }));

    expect(result.errors.map((message) => message.code)).toEqual(expect.arrayContaining([
      "topFace.textContours.invalid",
      "bottomFace.textContours.invalid",
    ]));
  });

  it("blocks 3MF export when validation has errors", () => {
    expect(() => createCoin3mf(params({ borderWidth: 0 }))).toThrow(/Cannot export invalid coin parameters/);
  });
});
