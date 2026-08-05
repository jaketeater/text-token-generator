import { geometries } from "@jscad/modeling";

import type { CoinParameters } from "../model/coinParameters";
import {
  COIN_PART_IDS,
  COIN_PART_NAMES,
  type CoinPartKey,
  type GeneratedCoin,
  type GeneratedCoinPart,
  type GeneratedCoinParts,
} from "../model/generatedCoin";
import { createBorderRing, createCenteredCoinCylinder } from "./createBorderRing";

const createPart = (
  key: CoinPartKey,
  geometry: geometries.geom3.Geom3,
  color: string,
): GeneratedCoinPart => ({
  id: COIN_PART_IDS[key],
  name: COIN_PART_NAMES[key],
  displayName: COIN_PART_NAMES[key],
  geometry,
  color,
  metadata: {
    id: COIN_PART_IDS[key],
    key,
    displayName: COIN_PART_NAMES[key],
  },
});

export const createCoin = (parameters: CoinParameters): GeneratedCoin => {
  const outerRadius = parameters.diameter / 2;
  const innerRadius = outerRadius - parameters.borderWidth;
  const body = createCenteredCoinCylinder(innerRadius, parameters.thickness, parameters.circleSegments);
  const emptyTextGeometry = geometries.geom3.create();

  const parts = {
    body: createPart("body", body, parameters.bodyColor),
    borderRing: createPart("borderRing", createBorderRing(parameters), parameters.borderColor),
    topText: createPart("topText", emptyTextGeometry, parameters.topFace.color),
    bottomText: createPart("bottomText", geometries.geom3.create(), parameters.bottomFace.color),
  } satisfies GeneratedCoinParts;

  return { parts };
};
