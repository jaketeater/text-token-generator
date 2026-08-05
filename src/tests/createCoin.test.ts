import { booleans, measurements, primitives } from "@jscad/modeling";
import { describe, expect, it } from "vitest";

import { generateCoin } from "../geometry/createCoin";
import { DEFAULT_COIN_PARAMETERS } from "../model/defaults";
import { COIN_PART_IDS, COIN_PART_NAMES, type CoinPartKey } from "../model/generatedCoin";

const PART_KEYS: CoinPartKey[] = ["body", "borderRing", "topText", "bottomText"];

const fullCoinCylinder = () =>
  primitives.cylinder({
    center: [0, 0, DEFAULT_COIN_PARAMETERS.thickness / 2],
    height: DEFAULT_COIN_PARAMETERS.thickness,
    radius: DEFAULT_COIN_PARAMETERS.diameter / 2,
    segments: DEFAULT_COIN_PARAMETERS.circleSegments,
  });

describe("generateCoin", () => {
  it("returns the four required named coin parts", () => {
    const coin = generateCoin(DEFAULT_COIN_PARAMETERS);

    for (const key of PART_KEYS) {
      expect(coin.parts[key].id).toBe(COIN_PART_IDS[key]);
      expect(coin.parts[key].name).toBe(COIN_PART_NAMES[key]);
      expect(coin.parts[key].displayName).toBe(COIN_PART_NAMES[key]);
    }
  });

  it("recesses text from only the center body while preserving the full coin volume across all parts", () => {
    const coin = generateCoin(DEFAULT_COIN_PARAMETERS);
    const fullCoinVolume = measurements.measureVolume(fullCoinCylinder());
    const rawCenterVolume = measurements.measureVolume(
      primitives.cylinder({
        center: [0, 0, DEFAULT_COIN_PARAMETERS.thickness / 2],
        height: DEFAULT_COIN_PARAMETERS.thickness,
        radius: DEFAULT_COIN_PARAMETERS.diameter / 2 - DEFAULT_COIN_PARAMETERS.borderWidth,
        segments: DEFAULT_COIN_PARAMETERS.circleSegments,
      }),
    );
    const bodyVolume = measurements.measureVolume(coin.parts.body.geometry);
    const topTextVolume = measurements.measureVolume(coin.parts.topText.geometry);
    const bottomTextVolume = measurements.measureVolume(coin.parts.bottomText.geometry);
    const unionVolume = measurements.measureVolume(
      booleans.union(PART_KEYS.map((key) => coin.parts[key].geometry)),
    );

    expect(bodyVolume).toBeLessThan(rawCenterVolume);
    expect(topTextVolume).toBeGreaterThan(0);
    expect(bottomTextVolume).toBeGreaterThan(0);
    expect(unionVolume).toBeCloseTo(fullCoinVolume, 1);
  });
});
